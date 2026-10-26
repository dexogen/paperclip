// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DashboardLive } from "./DashboardLive";

const mocks = vi.hoisted(() => ({ runs: vi.fn(), crumbs: vi.fn(), company: { selectedCompanyId: "company-id" as string | null, companies: [{ id: "company-id" }] } }));
vi.mock("../api/heartbeats", () => ({ heartbeatsApi: { liveRunsForCompany: mocks.runs } }));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => mocks.company }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: mocks.crumbs }) }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
vi.mock("../components/transcript/useLiveRunTranscripts", () => ({ useLiveRunTranscripts: () => ({ transcriptByRun: new Map(), hasOutputForRun: () => false }) }));
vi.mock("../components/RunChatSurface", () => ({ RunChatSurface: () => null }));

let root: Root | undefined;
let host: HTMLDivElement;
let client: QueryClient;
afterEach(async () => {
  await act(async () => root?.unmount()); root = undefined;
  client?.clear(); host?.remove();
  await i18n.changeLanguage("en"); vi.clearAllMocks();
  mocks.company.selectedCompanyId = "company-id";
});

it("keeps the live route limit, query scope and run links through language changes", async () => {
  await i18n.changeLanguage("en");
  mocks.runs.mockResolvedValue([{
    id: "run-id", agentId: "agent-id", agentName: "Live runs <strong>literal</strong>", status: "queued",
    issueId: null, invocationSource: "timer", createdAt: "2026-04-24T12:00:00.000Z", startedAt: null, finishedAt: null,
  }]);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const page = <QueryClientProvider client={client}><DashboardLive /></QueryClientProvider>;
  await act(async () => root!.render(page));
  await vi.waitFor(() => expect(host.querySelector('a[href="/agents/agent-id/runs/run-id"]')).not.toBeNull());
  const link = host.querySelector<HTMLAnchorElement>('a[href="/agents/agent-id/runs/run-id"]')!;
  const keys = client.getQueryCache().getAll().map(query => query.queryKey);
  expect(keys.some(key => key.includes("dashboard-live"))).toBe(true);
  expect(mocks.runs).toHaveBeenCalledExactlyOnceWith("company-id", { minCount: 50, limit: 50, distinctTasks: false });
  link.focus();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.querySelector("h1")?.textContent).toBe("Текущие запуски агентов");
  expect(host.textContent).toContain("Показано не более 50");
  expect(host.textContent).toContain("Рабочий цикл по расписанию");
  expect(host.textContent).toContain("Live runs <strong>literal</strong>");
  expect(host.querySelector("strong")).toBeNull();
  expect(host.querySelector('a[href="/agents/agent-id/runs/run-id"]')).toBe(link);
  expect(document.activeElement).toBe(link);
  expect(mocks.crumbs).toHaveBeenLastCalledWith([{ label: "Обзор", href: "/dashboard" }, { label: "Текущие запуски" }]);
  expect([...host.querySelectorAll('a[href="/dashboard/live"]')]).toHaveLength(0);
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(host.querySelector("h1")?.textContent).toBe("Live agent runs");
  expect(mocks.runs).toHaveBeenCalledTimes(1);
  expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual(keys);
  mocks.company.selectedCompanyId = null;
  await act(async () => root!.render(<QueryClientProvider client={client}><DashboardLive /></QueryClientProvider>));
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.textContent).toContain("Выберите организацию, чтобы просматривать текущие запуски.");
  expect(mocks.runs).toHaveBeenCalledTimes(1);
});
