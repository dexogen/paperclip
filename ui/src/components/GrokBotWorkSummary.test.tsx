// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { GrokConnection } from "@paperclipai/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { GrokBotWorkSummary } from "./GrokBotWorkSummary";

const api = vi.hoisted(() => ({ connection: vi.fn() }));
vi.mock("@/api/grokBot", () => ({ grokBotApi: api }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const key = ["grok-binding", "company-1", "agent-1"];
const timestamp = "2026-10-26T10:24:36.000Z";
const snapshot = {
  enabled: true, recoveryNeeded: true, queuedTaskCount: 21,
  currentTask: { id: "task-1", identifier: "RAW-21", title: "Recovery needed <strong>literal</strong>" },
  binding: { assignment: { status: "offered" }, routine: { verified: true, lastContactAt: timestamp } },
} as GrokConnection;
async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(20); }); }
async function language(lang: string) { await act(async () => { await i18n.changeLanguage(lang); }); }
beforeEach(async () => {
  vi.resetAllMocks(); await i18n.changeLanguage("en"); vi.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); client.clear(); host.remove(); vi.useRealTimers(); await i18n.changeLanguage("en");
});
async function render() {
  await act(async () => root.render(<QueryClientProvider client={client}><GrokBotWorkSummary companyId="company-1" agentId="agent-1" /></QueryClientProvider>));
}

it("switches the live activity summary without changing task identity, status priority or polling", async () => {
  let resolveConnection!: (data: GrokConnection) => void;
  api.connection.mockImplementationOnce(() => new Promise(resolve => { resolveConnection = resolve; }));
  await render();
  expect(host.textContent).toContain("Queued tasks: Checking…");
  await language("ru");
  expect(host.textContent).toContain("Задачи в очереди: проверка…");
  expect(api.connection).toHaveBeenCalledExactlyOnceWith("company-1", "agent-1", expect.any(AbortSignal));
  await act(async () => resolveConnection(snapshot)); await flush();
  const status = host.querySelector("p")!;
  const link = host.querySelector<HTMLAnchorElement>('a[href="/issues/task-1"]')!;
  expect(status.textContent).toBe("Требуется восстановление");
  expect(link.textContent).toBe("RAW-21: " + snapshot.currentTask!.title);
  expect(host.querySelector("strong")).toBeNull();
  expect(host.textContent).toContain("В очереди: 21 задача");
  expect(host.textContent).toContain(new Date(timestamp).toLocaleString("ru"));
  await language("en");
  expect(host.querySelector("p")).toBe(status);
  expect(status.textContent).toBe("Recovery needed");
  expect(host.querySelector('a[href="/issues/task-1"]')).toBe(link);
  expect(host.textContent).toContain(new Date(timestamp).toLocaleString("en"));
  expect(api.connection).toHaveBeenCalledTimes(1);
  api.connection.mockResolvedValue(snapshot);
  await act(async () => { await vi.advanceTimersByTimeAsync(9900); });
  expect(api.connection).toHaveBeenCalledTimes(1);
  await language("ru");
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  expect(api.connection).toHaveBeenCalledTimes(2);
  const cases = [
    { assignment: { status: "offered" }, verified: true, count: 1, label: "Ожидается подтверждение получения", countLabel: "В очереди: 1 задача" },
    { assignment: { status: "working" }, verified: false, count: 2, label: "Работа выполняется в Grok Bot", countLabel: "В очереди: 2 задачи" },
    { assignment: null, verified: true, count: 5, label: "Нет активного рабочего сеанса Paperclip", countLabel: "В очереди: 5 задач" },
    { assignment: null, verified: false, count: 21, label: "Настройка подключения не завершена", countLabel: "В очереди: 21 задача" },
  ];
  await language("ru");
  for (const value of cases) {
    await act(async () => client.setQueryData(key, { ...snapshot, recoveryNeeded: false, queuedTaskCount: value.count, binding: { assignment: value.assignment, routine: { verified: value.verified } } }));
    await flush();
    expect(status.textContent).toBe(value.label);
    expect(host.textContent).toContain(value.countLabel);
    expect(host.textContent).toContain("Контактов пока не зафиксировано");
    expect(host.querySelector('a[href="/issues/task-1"]')).toBe(link);
  }
  expect(api.connection).toHaveBeenCalledTimes(2);
});

it("retains cached activity and literal provider diagnostics when a refresh fails", async () => {
  api.connection.mockResolvedValueOnce(snapshot);
  await render(); await flush();
  const link = host.querySelector('a[href="/issues/task-1"]');
  const raw = "Recovery needed <strong>provider</strong>";
  api.connection.mockRejectedValueOnce(new Error(raw));
  await act(async () => { await client.refetchQueries({ queryKey: key }); }); await flush();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Connection status could not be refreshed. " + raw);
  await language("ru");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Не удалось обновить состояние подключения. " + raw);
  expect(host.querySelector('a[href="/issues/task-1"]')).toBe(link);
  expect(host.querySelector("strong")).toBeNull();
  await language("en");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Connection status could not be refreshed. " + raw);
  expect(api.connection).toHaveBeenCalledTimes(2);
});
