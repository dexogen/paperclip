import { createHash, randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  agentApiKeys,
  agents,
  authUsers,
  companies,
  companyMemberships,
  createDb,
  issues,
  principalPermissionGrants,
  projectAccessMembers,
  projects,
} from "@paperclipai/db";
import type { TaskBridgeAgentKeyScope } from "@paperclipai/shared";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { actorMiddleware } from "../middleware/auth.js";
import { errorHandler } from "../middleware/index.js";
import { issueRoutes } from "../routes/issues.js";
import { projectRoutes } from "../routes/projects.js";

const support = await getEmbeddedPostgresTestSupport();
const describeDatabase = support.supported ? describe : describe.skip;

if (!support.supported) {
  console.warn(`Skipping task bridge project route tests: ${support.reason ?? "unsupported environment"}`);
}

describeDatabase("task bridge project creation", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-task-bridge-project-create-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedFixture() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Project boundary tests",
      issuePrefix: `B${companyId.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    const responsibleUserId = randomUUID();
    await db.insert(authUsers).values({
      id: responsibleUserId, name: "Project owner", email: `${responsibleUserId}@example.com`, emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.insert(companyMemberships).values({
      companyId, principalType: "user", principalId: responsibleUserId,
      status: "active", membershipRole: "owner",
    });
    const [owner, allowed, denied] = await db.insert(agents).values(
      ["Bridge owner", "Allowed assignee", "Other assignee"].map((name) => ({
        companyId,
        name,
        role: "engineer",
        status: "idle",
        adapterType: "process",
        adapterConfig: {},
        runtimeConfig: { heartbeat: { enabled: false, wakeOnDemand: false } },
        permissions: {},
      })),
    ).returning();
    const [project, otherProject, privateProject] = await db.insert(projects).values([
      { companyId, name: "Approved project", visibility: "open" },
      { companyId, name: "Other project", visibility: "open" },
      { companyId, name: "Private project", visibility: "private" },
    ]).returning();
    const [parent] = await db.insert(issues).values({
      companyId,
      title: "Approved parent",
      projectId: project.id,
      assigneeAgentId: owner.id,
      status: "todo",
      priority: "medium",
    }).returning();
    return { companyId, responsibleUserId, owner, allowed, denied, project, otherProject, privateProject, parent };
  }

  async function createClient(
    fixture: Awaited<ReturnType<typeof seedFixture>>,
    scope: TaskBridgeAgentKeyScope | null,
  ) {
    const token = randomUUID();
    const [key] = await db.insert(agentApiKeys).values({
      companyId: fixture.companyId,
      agentId: fixture.owner.id,
      name: "Route test key",
      keyHash: createHash("sha256").update(token).digest("hex"),
      scopeConfig: scope,
      responsibleUserId: fixture.responsibleUserId,
    }).returning();
    const app = express();
    app.use(express.json());
    app.use(actorMiddleware(db, { deploymentMode: "authenticated" }));
    app.use("/api", issueRoutes(db, {} as any));
    app.use("/api", projectRoutes(db));
    app.use(errorHandler);
    return {
      key,
      create: (body: Record<string, unknown>) => request(app)
        .post(`/api/companies/${fixture.companyId}/issues`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Scoped task", status: "todo", ...body }),
      readProject: (id: string) => request(app)
        .get(`/api/projects/${id}`)
        .set("Authorization", `Bearer ${token}`),
    };
  }

  it.each(["projectId", "projectIds"] as const)(
    "creates an assigned issue in an explicit %s boundary without project API access",
    async (boundary) => {
      const f = await seedFixture();
      const client = await createClient(f, {
        kind: "task_bridge",
        ...(boundary === "projectId" ? { projectId: f.project.id } : { projectIds: [f.project.id] }),
        allowedAssigneeAgentIds: [f.allowed.id],
      });
      const response = await client.create({ projectId: f.project.id, assigneeAgentId: f.allowed.id }).expect(201);
      expect(response.body).toMatchObject({
        projectId: f.project.id,
        assigneeAgentId: f.allowed.id,
        originKind: "task_bridge",
        originId: client.key.id,
      });
      const [saved] = await db.select().from(issues).where(eq(issues.id, response.body.id));
      expect(saved.companyId).toBe(f.companyId);
      await client.readProject(f.project.id).expect(404);
    },
  );

  it("rejects a project outside the explicit boundary", async () => {
    const f = await seedFixture();
    const client = await createClient(f, { kind: "task_bridge", projectId: f.project.id });
    await client.create({ projectId: f.otherProject.id, assigneeAgentId: f.owner.id }).expect(404);
    expect(await db.select().from(issues).where(eq(issues.companyId, f.companyId))).toHaveLength(1);
  });

  it("rejects an assignee outside the approved list", async () => {
    const f = await seedFixture();
    const client = await createClient(f, {
      kind: "task_bridge", projectId: f.project.id, allowedAssigneeAgentIds: [f.allowed.id],
    });
    await client.create({ projectId: f.project.id, assigneeAgentId: f.denied.id }).expect(403);
    expect(await db.select().from(issues).where(eq(issues.companyId, f.companyId))).toHaveLength(1);
  });

  it.each(["missing", "other company"])("returns 404 for a scoped project that is %s", async (kind) => {
    const f = await seedFixture();
    const projectId = kind === "missing" ? randomUUID() : (await seedFixture()).project.id;
    const client = await createClient(f, { kind: "task_bridge", projectId });
    await client.create({ projectId, assigneeAgentId: f.owner.id }).expect(404);
    expect(await db.select().from(issues).where(eq(issues.companyId, f.companyId))).toHaveLength(1);
  });

  it.each([false, true])("does not use an approved parent to admit another explicit project (project boundary: %s)", async (withProject) => {
    const f = await seedFixture();
    const client = await createClient(f, {
      kind: "task_bridge",
      parentIssueId: f.parent.id,
      ...(withProject ? { projectId: f.project.id } : {}),
    });
    await client.create({
      projectId: f.otherProject.id, parentId: f.parent.id, assigneeAgentId: f.owner.id,
    }).expect(404);
    expect(await db.select().from(issues).where(eq(issues.companyId, f.companyId))).toHaveLength(1);
  });

  it("preserves parent-only creation when no explicit project is selected", async () => {
    const f = await seedFixture();
    const client = await createClient(f, { kind: "task_bridge", parentIssueId: f.parent.id });
    await client.create({ parentId: f.parent.id, assigneeAgentId: f.owner.id }).expect(201);
  });

  it("keeps private project membership checks for explicitly scoped bridge keys", async () => {
    const f = await seedFixture();
    const client = await createClient(f, { kind: "task_bridge", projectId: f.privateProject.id });
    await client.create({ projectId: f.privateProject.id, assigneeAgentId: f.owner.id }).expect(404);
    await db.insert(projectAccessMembers).values([
      { companyId: f.companyId, projectId: f.privateProject.id, subjectType: "agent", subjectId: f.owner.id },
      { companyId: f.companyId, projectId: f.privateProject.id, subjectType: "user", subjectId: f.responsibleUserId },
    ]);
    await client.create({ projectId: f.privateProject.id, assigneeAgentId: f.owner.id }).expect(201);
    await client.readProject(f.privateProject.id).expect(404);
    await db.delete(projectAccessMembers).where(and(
      eq(projectAccessMembers.projectId, f.privateProject.id),
      eq(projectAccessMembers.subjectId, f.responsibleUserId),
    ));
    await client.create({ projectId: f.privateProject.id, assigneeAgentId: f.owner.id }).expect(404);
  });

  it("preserves ordinary key access to open projects and denial for private projects", async () => {
    const f = await seedFixture();
    await db.insert(companyMemberships).values({
      companyId: f.companyId, principalType: "agent", principalId: f.owner.id,
      status: "active", membershipRole: "member",
    });
    await db.insert(principalPermissionGrants).values({
      companyId: f.companyId, principalType: "agent", principalId: f.owner.id,
      permissionKey: "tasks:assign", scope: null,
    });
    const client = await createClient(f, null);
    await client.create({ projectId: f.project.id, assigneeAgentId: f.owner.id }).expect(201);
    await client.create({ projectId: f.privateProject.id, assigneeAgentId: f.owner.id }).expect(404);
  });
});
