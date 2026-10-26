// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  ToolCatalogEntry,
  ToolPolicy,
  ToolProfileEffectiveSummary,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act as reactAct, createElement } from "react";
import { i18n } from "@/i18n";
import { AgentToolsTab, mergeInstallDraft } from "./AgentToolsTab";
import { queryKeys } from "../lib/queryKeys";

const mockToolsApi = vi.hoisted(() => ({
  getEffectiveProfilesForAgent: vi.fn(),
  listConnections: vi.fn(),
  listPolicies: vi.fn(),
  listCatalog: vi.fn(),
  listConnectionGrants: vi.fn(),
  listAudit: vi.fn(),
  putConnectionInstalls: vi.fn(),
}));

vi.mock("../api/tools", () => ({ toolsApi: mockToolsApi }));

// Render the company-aware Link as a plain anchor so we don't need a Router.
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: unknown }) =>
    createElement("a", { href: to, ...rest }, children as never),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushReact(cycles = 4) {
  // Multiple cycles let dependent query waves settle (connections → per-connection catalog).
  for (let i = 0; i < cycles; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
}

function makeCatalogEntry(overrides: Partial<ToolCatalogEntry>): ToolCatalogEntry {
  return {
    id: "cat-1",
    companyId: "company-1",
    applicationId: "app-1",
    connectionId: "conn-1",
    entryKind: "tool",
    toolName: "github.read_repo",
    title: "Read repo",
    description: null,
    inputSchema: null,
    outputSchema: null,
    annotations: null,
    riskLevel: "read",
    isReadOnly: true,
    isWrite: false,
    isDestructive: false,
    status: "active",
    addedAt: new Date("2026-06-01T00:00:00Z"),
    version: null,
    schemaHash: null,
    firstSeenAt: new Date("2026-06-01T00:00:00Z"),
    lastSeenAt: new Date("2026-06-01T00:00:00Z"),
    reviewedAt: null,
    reviewedByAgentId: null,
    reviewedByUserId: null,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}

function makePolicy(overrides: Partial<ToolPolicy>): ToolPolicy {
  return {
    id: "pol-1",
    companyId: "company-1",
    name: "Require approval for writes",
    description: "All write tools need board approval",
    policyType: "require_approval",
    priority: 100,
    enabled: true,
    selectors: {},
    conditions: null,
    config: null,
    createdByAgentId: null,
    createdByUserId: null,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}

describe("AgentToolsTab", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockToolsApi.getEffectiveProfilesForAgent.mockReset();
    mockToolsApi.listConnections.mockReset();
    mockToolsApi.listPolicies.mockReset();
    mockToolsApi.listCatalog.mockReset();
    mockToolsApi.listConnectionGrants.mockReset();
    mockToolsApi.putConnectionInstalls.mockReset();
    mockToolsApi.listConnectionGrants.mockResolvedValue({
      connection: { id: "conn-1", uid: "conn-1" },
      grants: [],
      currentUserId: "user-1",
      members: [],
      capabilities: {},
    });
    mockToolsApi.putConnectionInstalls.mockResolvedValue({ connectionId: "conn-1", installs: [] });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
  });

  async function renderTab(agentName = "Coder") {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const agent = { id: "agent-1", name: agentName } as never;
    await act(async () => {
      root = createRoot(container);
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(AgentToolsTab, { agent, companyId: "company-1" }),
        ),
      );
    });
    await flushReact();
    return client;
  }

  it("preserves checkbox changes made after the last saved install state", async () => {
    expect(
      mergeInstallDraft(
        { "conn-1": true, "conn-2": false },
        { "conn-1": true, "conn-2": true },
        { "conn-1": false, "conn-2": false },
      ),
    ).toEqual({
      draft: { "conn-1": true, "conn-2": true },
      hasPendingChanges: true,
    });
  });

  it("renders effective access, access profiles, governing policy, and unavailable tools", async () => {
    const allowed = makeCatalogEntry({ id: "cat-allow", toolName: "github.read_repo" });
    const denied = makeCatalogEntry({
      id: "cat-deny",
      toolName: "github.delete_repo",
      riskLevel: "critical",
      isReadOnly: false,
      isWrite: true,
      isDestructive: true,
    });

    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1",
      profiles: [
        {
          id: "prof-1",
          companyId: "company-1",
          profileKey: "github-safe",
          name: "GitHub safe",
          description: null,
          status: "active",
          defaultAction: "deny",
          newToolsReviewedAt: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          entries: [],
          bindings: [],
          summary: {
            accessMode: "selected",
            allowedToolCount: 1,
            allowedApplicationCount: 1,
            excludedToolCount: 0,
            totalToolCount: 1,
            assignmentCount: 1,
            appliesToAgentCount: 1,
            isCompanyDefault: true,
          },
        },
      ],
      entries: [],
      bindings: [
        {
          id: "bind-1",
          companyId: "company-1",
          profileId: "prof-1",
          targetType: "agent",
          targetId: "agent-1",
          priority: 100,
          metadata: null,
          createdByAgentId: null,
          createdByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      allowedTools: [allowed],
      allowedToolNames: ["github.read_repo"],
      installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);

    mockToolsApi.listConnections.mockResolvedValue({
      connections: [{ id: "conn-1", name: "Production GitHub" }],
    });
    mockToolsApi.listPolicies.mockResolvedValue({
      policies: [
        makePolicy({ id: "pol-1", name: "Require approval for writes" }),
        makePolicy({
          id: "pol-2",
          name: "Block other agent",
          enabled: true,
          selectors: { agentId: "someone-else" },
        }),
        makePolicy({ id: "pol-custom", name: "allow", description: "Saved", policyType: "constructor" as ToolPolicy["policyType"] }),
      ],
    });
    mockToolsApi.listCatalog.mockResolvedValue({ catalog: [allowed, denied] });

    await renderTab();

    const text = container.textContent ?? "";
    expect(text).toContain("Effective access");
    expect(text).toContain("github.read_repo");
    expect(text).toContain("Production GitHub");
    expect(text).toContain("GitHub safe");
    expect(text).toContain("Access profiles");
    expect(text).toContain("Organization default");
    expect(container.querySelector('a[href="/apps/advanced/profiles/prof-1"]')?.textContent).toBe("GitHub safe");
    expect(container.querySelector('a[href="/apps/advanced/profiles?check=1"]')?.textContent).toBe("Check access");
    // Governing policy #1 is the company-wide require_approval rule.
    expect(text).toContain("#1 Require approval for writes");
    // The policy that targets a different agent must NOT appear.
    expect(text).not.toContain("Block other agent");
    // Unavailable tool surfaced from the full tool list minus allowed.
    expect(text).toContain("github.delete_repo");
    const profile = container.querySelector('a[href="/apps/advanced/profiles/prof-1"]');
    await reactAct(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Требовать согласования");
    expect(container.textContent).toContain("constructor");
    expect(container.textContent).toContain("#3 allow");
    expect(container.textContent).toContain("Saved");
    expect(container.textContent).toContain("All write tools need board approval");
    expect(container.querySelector('a[href="/apps/advanced/profiles/prof-1"]')).toBe(profile);
    expect(profile?.textContent).toBe("GitHub safe");
    expect(mockToolsApi.putConnectionInstalls).not.toHaveBeenCalled();
  });

  it("shows the empty allow-list message when no profile applies", async () => {
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1",
      profiles: [],
      entries: [],
      bindings: [],
      allowedTools: [],
      allowedToolNames: [],
      installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);
    mockToolsApi.listConnections.mockResolvedValue({ connections: [] });
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });

    await renderTab();

    const text = container.textContent ?? "";
    expect(text).toContain("No tools are allowed for this agent");
    expect(text).toContain("No active profile applies");
    expect(text).toContain("Use responsible person's GitHub");
    expect(container.querySelector('a[href="/apps/connect?source=github"]')?.textContent).toBe("Connect my GitHub");
  });

  it("shows an active dedicated GitHub identity as the agent override", async () => {
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1",
      profiles: [],
      entries: [],
      bindings: [],
      allowedTools: [],
      allowedToolNames: [],
      installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);
    mockToolsApi.listConnections.mockResolvedValue({
      connections: [{
        id: "conn-github",
        companyId: "company-1",
        name: "Agent GitHub",
        enabled: true,
        status: "active",
        config: { sourceTemplateKey: "github" },
        transportConfig: {},
        installs: [{ targetType: "company", targetId: "company-1" }],
      }],
    });
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });
    mockToolsApi.listCatalog.mockResolvedValue({ catalog: [] });
    mockToolsApi.listConnectionGrants.mockResolvedValue({
      connection: { id: "conn-github", uid: "conn-github" },
      grants: [{
        id: "grant-agent",
        kind: "agent",
        subjectAgentId: "agent-1",
        subjectUserId: null,
        status: "active",
        providerTenant: {
          github: {
            userId: "123",
            login: "dottabot",
            installationCount: 1,
            repositoryCount: 1,
            repositorySelection: "selected",
            installationIds: ["456"],
            installationOwnerLogins: ["paperclipai"],
          },
        },
      }],
      currentUserId: "user-1",
      members: [],
      capabilities: {},
    });

    await renderTab();

    const text = container.textContent ?? "";
    expect(text).toContain("@dottabot");
    expect(text).toContain("takes precedence over the responsible person's GitHub");
    expect(container.querySelector('a[href="/apps/conn-github/permissions"]')?.textContent).toBe("Manage GitHub identity");
    expect(text).not.toContain("Connect my GitHub");
    const reads = mockToolsApi.listConnectionGrants.mock.calls.length;
    const link = container.querySelector('a[href="/apps/conn-github/permissions"]');
    await reactAct(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("@dottabot");
    expect(container.textContent).toContain("имеет приоритет перед GitHub ответственного за задачу");
    expect(container.querySelector('a[href="/apps/conn-github/permissions"]')).toBe(link);
    expect(link?.textContent).toBe("Настроить учётную запись GitHub");
    expect(mockToolsApi.listConnectionGrants).toHaveBeenCalledTimes(reads);
  });

  it("does not display a grant from a disabled or uninstalled GitHub connection", async () => {
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1",
      profiles: [],
      entries: [],
      bindings: [],
      allowedTools: [],
      allowedToolNames: [],
      installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);
    mockToolsApi.listConnections.mockResolvedValue({
      connections: [{
        id: "conn-github",
        companyId: "company-1",
        name: "Disabled GitHub",
        enabled: false,
        status: "active",
        config: { sourceTemplateKey: "github" },
        transportConfig: {},
        installs: [{ targetType: "company", targetId: "company-1" }],
      }],
    });
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });
    mockToolsApi.listCatalog.mockResolvedValue({ catalog: [] });

    await renderTab();

    const text = container.textContent ?? "";
    expect(mockToolsApi.listConnectionGrants).not.toHaveBeenCalled();
    expect(text).toContain("Use responsible person's GitHub");
    expect(text).not.toContain("@dottabot");
  });

  it("shows a retryable error instead of connection setup when grants cannot be loaded", async () => {
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1",
      profiles: [],
      entries: [],
      bindings: [],
      allowedTools: [],
      allowedToolNames: [],
      installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);
    mockToolsApi.listConnections.mockResolvedValue({
      connections: [{
        id: "conn-github",
        companyId: "company-1",
        name: "Agent GitHub",
        enabled: true,
        status: "active",
        config: { sourceTemplateKey: "github" },
        transportConfig: {},
        installs: [{ targetType: "company", targetId: "company-1" }],
      }],
    });
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });
    mockToolsApi.listCatalog.mockResolvedValue({ catalog: [] });
    mockToolsApi.listConnectionGrants.mockRejectedValue(new Error("temporary failure"));

    await renderTab();

    const text = container.textContent ?? "";
    expect(text).toContain("Could not load GitHub identity");
    expect(text).toContain("Your existing setup was not changed");
    expect(text).not.toContain("Connect my GitHub");
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "Retry")).toBe(true);
    const readCount = mockToolsApi.listConnectionGrants.mock.calls.length;
    await reactAct(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Не удалось загрузить учётную запись GitHub");
    expect(mockToolsApi.listConnectionGrants).toHaveBeenCalledTimes(readCount);
    mockToolsApi.listConnectionGrants.mockResolvedValue({ grants: [], currentUserId: "user-1", members: [], capabilities: {} });
    await reactAct(async () => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Повторить")!.click(); });
    await vi.waitFor(() => expect(container.textContent).toContain("Подключить мой GitHub"));
    expect(mockToolsApi.listConnectionGrants).toHaveBeenCalledTimes(readCount + 1);
    expect(mockToolsApi.listConnectionGrants).toHaveBeenLastCalledWith("conn-github");
    expect(mockToolsApi.putConnectionInstalls).not.toHaveBeenCalled();
  });

  it("renders Russian counts for the actual allowed tool rows without changing their identities", async () => {
    const effective = { agentId: "agent-1", profiles: [], entries: [], bindings: [], allowedTools: [] as ToolCatalogEntry[], allowedToolNames: [] as string[], installedConnections: [] } satisfies ToolProfileEffectiveSummary;
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue(effective);
    mockToolsApi.listConnections.mockResolvedValue({ connections: [] });
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });
    const client = await renderTab();
    await reactAct(async () => { await i18n.changeLanguage("ru"); });
    for (const [count, phrase] of [[1, "1 инструмент"], [2, "2 инструмента"], [5, "5 инструментов"], [21, "21 инструмент"]] as const) {
      const tools = Array.from({ length: count }, (_, index) => makeCatalogEntry({ id: `tool-${index}`, toolName: `tool.${index}`, title: "Read <strong>raw</strong>" }));
      await reactAct(async () => { client.setQueryData(queryKeys.tools.effectiveProfilesForAgent("company-1", "agent-1"), { ...effective, allowedTools: tools, allowedToolNames: tools.map((tool) => tool.toolName) }); });
      await vi.waitFor(() => expect(container.querySelectorAll("tbody tr")).toHaveLength(count));
      const heading = Array.from(container.querySelectorAll("h3")).find((item) => item.textContent === "Разрешённые инструменты")!;
      expect(heading.parentElement?.textContent).toBe(`Разрешённые инструменты${phrase}`);
      expect(container.textContent).toContain("Read <strong>raw</strong>");
      expect(container.querySelectorAll("strong")).toHaveLength(0);
    }
    const firstRow = container.querySelector("tbody tr");
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("21 tools");
    expect(container.querySelector("tbody tr")).toBe(firstRow);
    expect(mockToolsApi.getEffectiveProfilesForAgent).toHaveBeenCalledOnce();
    expect(mockToolsApi.putConnectionInstalls).not.toHaveBeenCalled();
  });

  it("preserves pending and queued install drafts across locales without retrying a failed draft", async () => {
    const agentName = "Coder <strong>A&B</strong>";
    const appName = "Production <strong>GitHub</strong>";
    const allowed = [
      makeCatalogEntry({ id: "cat-1", connectionId: "conn-1" }),
      makeCatalogEntry({ id: "cat-2", connectionId: "conn-2", toolName: "service.write", title: "Installed" }),
      makeCatalogEntry({ id: "cat-all", connectionId: "conn-all", toolName: "service.shared" }),
    ];
    let connections = [
      { id: "conn-1", companyId: "company-1", name: appName, installs: [] as Array<{ targetType: string; targetId: string }> },
      { id: "conn-2", companyId: "company-1", name: "Saved", installs: [] as Array<{ targetType: string; targetId: string }> },
      { id: "conn-all", companyId: "company-1", name: "All Agents", installs: [{ targetType: "company", targetId: "company-1" }] },
    ];
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      agentId: "agent-1", profiles: [], entries: [], bindings: [], allowedTools: allowed,
      allowedToolNames: allowed.map((tool) => tool.toolName), installedConnections: [],
    } satisfies ToolProfileEffectiveSummary);
    mockToolsApi.listConnections.mockImplementation(async () => ({ connections }));
    mockToolsApi.listPolicies.mockResolvedValue({ policies: [] });
    mockToolsApi.listCatalog.mockImplementation(async (connectionId: string) => ({ catalog: allowed.filter((tool) => tool.connectionId === connectionId) }));
    let completeFirst!: () => void;
    let failSecond!: (cause: unknown) => void;
    mockToolsApi.putConnectionInstalls
      .mockImplementationOnce(() => new Promise<void>((resolve) => { completeFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { failSecond = reject; }));
    await renderTab(agentName);
    const first = container.querySelector<HTMLElement>(`[aria-label="Install ${appName} on ${agentName}"]`)!;
    const second = container.querySelector<HTMLElement>(`[aria-label="Install Saved on ${agentName}"]`)!;
    const all = container.querySelector<HTMLElement>(`[aria-label="Install All Agents on ${agentName}"]`)!;
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(all.hasAttribute("disabled")).toBe(true);
    expect(container.textContent).toContain("Permitted but not installed — tools will not appear in runs.");
    expect(container.querySelector('a[href="/apps/conn-1/permissions"]')?.textContent).toBe("Open permissions");
    expect(mockToolsApi.putConnectionInstalls).not.toHaveBeenCalled();
    await reactAct(async () => { first.click(); });
    await vi.waitFor(() => expect(mockToolsApi.putConnectionInstalls).toHaveBeenCalledTimes(1));
    expect(mockToolsApi.putConnectionInstalls).toHaveBeenNthCalledWith(1, "conn-1", [{ targetType: "agent", targetId: "agent-1" }]);
    await reactAct(async () => { second.click(); });
    const reads = [mockToolsApi.listConnections.mock.calls.length, mockToolsApi.getEffectiveProfilesForAgent.mock.calls.length, mockToolsApi.listPolicies.mock.calls.length, mockToolsApi.listCatalog.mock.calls.length];
    await reactAct(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Установленные приложения");
    expect(first.getAttribute("aria-label")).toBe(`Установить «${appName}» для агента «${agentName}»`);
    expect(first.isConnected).toBe(true);
    expect(second.isConnected).toBe(true);
    expect(second.getAttribute("data-state")).toBe("checked");
    expect(container.querySelectorAll("strong")).toHaveLength(0);
    expect(container.textContent).toContain(agentName);
    expect(container.textContent).toContain(appName);
    expect(container.textContent).toContain("Installed");
    expect(all.hasAttribute("disabled")).toBe(true);
    await reactAct(async () => { await i18n.changeLanguage("en"); await new Promise((resolve) => window.setTimeout(resolve, 300)); });
    expect(mockToolsApi.putConnectionInstalls).toHaveBeenCalledTimes(1);
    expect([mockToolsApi.listConnections.mock.calls.length, mockToolsApi.getEffectiveProfilesForAgent.mock.calls.length, mockToolsApi.listPolicies.mock.calls.length, mockToolsApi.listCatalog.mock.calls.length]).toEqual(reads);
    connections = connections.map((connection) => connection.id === "conn-1" ? { ...connection, installs: [{ targetType: "agent", targetId: "agent-1" }] } : connection);
    await reactAct(async () => { completeFirst(); });
    await vi.waitFor(() => expect(mockToolsApi.putConnectionInstalls).toHaveBeenCalledTimes(2));
    expect(mockToolsApi.putConnectionInstalls).toHaveBeenNthCalledWith(2, "conn-2", [{ targetType: "agent", targetId: "agent-1" }]);
    await reactAct(async () => { await i18n.changeLanguage("ru"); failSecond(null); });
    await vi.waitFor(() => expect(container.textContent).toContain("Не удалось сохранить"));
    expect(second.getAttribute("data-state")).toBe("checked");
    const readsAfterFailure = mockToolsApi.listConnections.mock.calls.length;
    await reactAct(async () => { await i18n.changeLanguage("en"); await new Promise((resolve) => window.setTimeout(resolve, 300)); });
    expect(container.textContent).toContain("Could not save");
    expect(mockToolsApi.putConnectionInstalls).toHaveBeenCalledTimes(2);
    expect(mockToolsApi.listConnections).toHaveBeenCalledTimes(readsAfterFailure);
    expect(second.isConnected).toBe(true);
    expect(all.hasAttribute("disabled")).toBe(true);
  });
});
