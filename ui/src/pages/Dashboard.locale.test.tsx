// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { Dashboard } from "./Dashboard";

const api = vi.hoisted(() => ({ summary: vi.fn(), agents: vi.fn(), resume: vi.fn(), activity: vi.fn(), issues: vi.fn(), projects: vi.fn(), members: vi.fn(), onboarding: vi.fn(), breadcrumbs: vi.fn() }));
vi.mock("../api/dashboard", () => ({ dashboardApi: { summary: api.summary } }));
vi.mock("../api/agents", () => ({ agentsApi: { list: api.agents, resume: api.resume } }));
vi.mock("../api/activity", () => ({ activityApi: { list: api.activity } }));
vi.mock("../api/issues", () => ({ issuesApi: { list: api.issues } }));
vi.mock("../api/projects", () => ({ projectsApi: { list: api.projects } }));
vi.mock("../api/access", () => ({ accessApi: { listUserDirectory: api.members } }));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-id", companies: [{ id: "company-id", name: "Raw organization" }] }) }));
vi.mock("../context/DesignSandboxContext", () => ({ useDesignSandbox: () => false }));
vi.mock("../context/DialogContext", () => ({ useDialogActions: () => ({ openOnboarding: api.onboarding }) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: api.breadcrumbs }) }));
vi.mock("@/lib/router", async () => {
  const router = await import("react-router-dom");
  return { Link: router.Link, useLocation: router.useLocation };
});
vi.mock("../hooks/useSharedPolling", () => ({ useSharedPollingQuery: () => ({}), usePublishSharedQueryData: () => {} }));
vi.mock("../components/ActiveAgentsPanel", () => ({ ActiveAgentsPanel: () => null }));
vi.mock("../components/SmokeLabDashboardCard", () => ({ SmokeLabDashboardCard: () => null }));
vi.mock("@/plugins/slots", () => ({ PluginSlotOutlet: () => null }));
vi.mock("../components/ActivityCharts", () => ({
  ChartCard: ({ title, subtitle }: { title: string; subtitle: string }) => <div>{title} {subtitle}</div>,
  RunActivityChart: () => null, PriorityChart: () => null, IssueStatusChart: () => null, SuccessRateChart: () => null,
}));

let root: Root | undefined;
let host: HTMLDivElement;
let cache: QueryClient;
afterEach(async () => {
  await act(async () => root?.unmount());
  cache?.clear(); host?.remove(); root = undefined;
  await i18n.changeLanguage("en"); vi.resetAllMocks();
});

it("preserves the sequential import-resume operation, raw task data and query identities through EN/RU/EN", async () => {
  await i18n.changeLanguage("en");
  const summary = {
    agents: { active: 0, running: 0, paused: 3, error: 0 }, tasks: { inProgress: 0, open: 1, blocked: 0 },
    costs: { monthSpendCents: 12345, monthBudgetCents: 100000, monthUtilizationPercent: 12.345 }, pendingApprovals: 0,
    budgets: { activeIncidents: 2, pausedAgents: 1, pausedProjects: 2, pendingApprovals: 5 }, runActivity: [],
  };
  const agents = [
    { id: "import-a", name: "A", status: "paused", pauseReason: "import" },
    { id: "import-b", name: "B", status: "paused", pauseReason: "import" },
    { id: "manual-c", name: "C", status: "paused", pauseReason: "manual" },
  ];
  api.summary.mockResolvedValue(summary); api.agents.mockResolvedValue(agents);
  api.activity.mockResolvedValue([]); api.projects.mockResolvedValue([]); api.members.mockResolvedValue({ users: [] });
  api.issues.mockResolvedValue([{ id: "raw-task", identifier: "RAW-7", title: "No tasks yet. <strong>literal</strong>", status: "todo", updatedAt: new Date(Date.now() - 120000).toISOString() }]);
  let finishFirst!: () => void;
  api.resume.mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve; }));
  api.resume.mockRejectedValueOnce(new Error("Provider diagnostic"));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 }, mutations: { retry: false } } });
  await act(async () => { root!.render(<MemoryRouter initialEntries={["/dashboard"]}><QueryClientProvider client={cache}><Dashboard /></QueryClientProvider></MemoryRouter>); });
  await vi.waitFor(() => expect(host.querySelector('[data-testid="dashboard-resume-imported-agents"]')).toBeTruthy());
  const resume = host.querySelector<HTMLButtonElement>('[data-testid="dashboard-resume-imported-agents"]')!;
  const task = host.querySelector<HTMLAnchorElement>('a[href="/issues/RAW-7"]')!;
  const reads = () => [api.summary, api.agents, api.activity, api.issues, api.projects, api.members].map(mock => mock.mock.calls.length);
  const originalReads = reads();
  expect(resume.textContent).toBe("Resume all");
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(resume.textContent).toBe("Возобновить всех");
  expect(host.textContent).toContain("2 импортированных агента приостановлены и не будут выполнять задачи.");
  expect(host.textContent).toContain("2 активных инцидента с бюджетом");
  expect(host.textContent).toContain("5 запросов на превышение бюджета ожидают рассмотрения оператором");
  expect(host.querySelector('a[href="/issues/RAW-7"]')).toBe(task);
  expect(task.textContent).toContain("No tasks yet. <strong>literal</strong>");
  expect(task.querySelector("strong")).toBeNull();
  expect(reads()).toEqual(originalReads); expect(api.resume).not.toHaveBeenCalled();
  expect(api.onboarding).not.toHaveBeenCalled();
  await act(async () => resume.click());
  expect(api.resume).toHaveBeenCalledExactlyOnceWith("import-a", "company-id");
  await vi.waitFor(() => expect(resume.disabled).toBe(true));
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(resume.textContent).toBe("Resuming…");
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(resume.textContent).toBe("Возобновление…");
  expect(api.resume).toHaveBeenCalledTimes(1); expect(reads()).toEqual(originalReads);
  api.agents.mockResolvedValue([{ ...agents[0], status: "idle", pauseReason: null }, agents[1], agents[2]]);
  await act(async () => finishFirst());
  await vi.waitFor(() => expect(resume.disabled).toBe(false));
  expect(api.resume).toHaveBeenCalledTimes(2);
  expect(api.resume).toHaveBeenNthCalledWith(2, "import-b", "company-id");
  await vi.waitFor(() => expect(host.textContent).toContain("1 импортированный агент приостановлен и не будет выполнять задачи."));
  expect(api.summary).toHaveBeenCalledTimes(originalReads[0] + 1);
  expect(api.agents).toHaveBeenCalledTimes(originalReads[1] + 1);
});
