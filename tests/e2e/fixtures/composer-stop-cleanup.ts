import assert from "node:assert/strict";
import type { APIRequestContext, APIResponse } from "@playwright/test";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CleanupInput = {
  request: Pick<APIRequestContext, "get" | "post" | "patch">;
  companyId: string;
  agentIds: string[];
  json: (response: APIResponse) => Promise<unknown>;
  poll: (probe: () => Promise<boolean>) => Promise<void>;
  restore: () => Promise<void>;
  attach: (evidence: Record<string, unknown>) => Promise<void>;
  removeMarker: () => Promise<void>;
  failure?: { error: unknown };
};

function object(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

export async function cleanupComposerStopCompany(input: CleanupInput) {
  const errors = input.failure ? [input.failure.error] : [];
  const evidence: Record<string, unknown> = { companyId: input.companyId, status: "pending" };
  const cancelledRunIds: string[] = [];
  const ownedAgents = new Set(input.agentIds);
  const ownedRuns = (value: unknown) => {
    assert.ok(Array.isArray(value), "Expected an owned company live-runs snapshot");
    const runs = value.map(object);
    const ids = new Set<string>();
    for (const run of runs) {
      assert.equal(run.companyId, input.companyId, "Run company ownership mismatch");
      assert.ok(typeof run.agentId === "string" && ownedAgents.has(run.agentId), "Run agent ownership mismatch");
      assert.ok(typeof run.id === "string" && uuid.test(run.id), "Invalid owned run ID");
      assert.ok(!ids.has(run.id), "Duplicate owned run ID");
      ids.add(run.id);
    }
    return runs;
  };
  try {
    assert.match(input.companyId, uuid);
    for (const id of input.agentIds) assert.match(id, uuid);
    assert.equal(ownedAgents.size, input.agentIds.length);
    const archived = object(await input.json(await input.request.patch(`/api/companies/${input.companyId}`, {
      data: { status: "archived" },
    })));
    assert.equal(archived.id, input.companyId);
    assert.equal(archived.status, "archived");
    const runs = ownedRuns(await input.json(await input.request.get(`/api/companies/${input.companyId}/live-runs`)));
    for (const run of runs) {
      const cancelled = object(await input.json(await input.request.post(`/api/heartbeat-runs/${run.id}/cancel`)));
      assert.equal(cancelled.id, run.id);
      assert.equal(cancelled.companyId, input.companyId);
      assert.equal(cancelled.agentId, run.agentId);
      cancelledRunIds.push(run.id as string);
    }
    await input.poll(async () => {
      const liveRuns = ownedRuns(await input.json(await input.request.get(`/api/companies/${input.companyId}/live-runs`)));
      const agents = await Promise.all(input.agentIds.map(async (id) => {
        const agent = object(await input.json(await input.request.get(`/api/agents/${id}`)));
        assert.equal(agent.id, id);
        assert.equal(agent.companyId, input.companyId);
        return { id, lifecycleState: agent.lifecycleState, lifecycleHolds: agent.lifecycleHolds, lifecycleError: agent.lifecycleError };
      }));
      evidence.liveRunIds = liveRuns.map(run => run.id);
      evidence.agents = agents;
      return liveRuns.length === 0 && agents.every(agent => agent.lifecycleState === "paused"
        && Array.isArray(agent.lifecycleHolds) && agent.lifecycleHolds.includes("company_archived")
        && agent.lifecycleError === null);
    });
    evidence.status = "passed";
  } catch (error) {
    evidence.status = "failed";
    errors.push(error);
  } finally {
    evidence.cancelledRunIds = cancelledRunIds;
    try {
      await input.restore();
    } catch (error) {
      errors.push(error);
    } finally {
      try {
        await input.attach(evidence);
      } catch (error) {
        errors.push(error);
      } finally {
        try {
          await input.removeMarker();
        } catch (error) {
          errors.push(error);
        }
      }
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors,
    `Composer Stop test and fixture cleanup failures:\n${errors.map(error =>
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)).join("\n")}`,
    { cause: errors[0] });
}
