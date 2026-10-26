// @vitest-environment jsdom
import { act } from "react";
import { setLocale } from "@/i18n";
import { createRoot } from "react-dom/client";
import type { HeartbeatRun, WorkspaceOperation } from "@paperclipai/shared";
import { afterEach, expect, it, vi } from "vitest";
import { LogViewer } from "./AgentDetail";
import { LogViewer as ProductionLogViewer } from "./AgentDetail.production";

const { log, events, empty, workspace } = vi.hoisted(() => ({ log: vi.fn(), events: vi.fn(async () => []), empty: [], workspace: { operations: [] as WorkspaceOperation[] } }));
vi.mock("../api/heartbeats", () => ({ heartbeatsApi: { log, events } }));
vi.mock("@tanstack/react-query", async (original) => ({
  ...await original<typeof import("@tanstack/react-query")>(),
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => ({ data: queryKey[2] === "workspace-operations" ? workspace.operations : empty }),
}));
vi.mock("../adapters", () => ({
  getUIAdapter: () => null,
  onAdapterChange: () => () => {},
  buildTranscript: (lines: unknown[]) => lines,
}));
vi.mock("../components/transcript/RunTranscriptView", () => ({
  RunTranscriptView: ({ entries }: { entries: Array<{ chunk: string }> }) => <div>{entries.map(line => line.chunk).join(" ")}</div>,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); log.mockReset(); events.mockClear(); workspace.operations = []; });

it.each([LogViewer, ProductionLogViewer])("retains legacy history and reads only the next offset on visibility recovery (%#)", async (Viewer) => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const row = (seq: number, chunk: string) => JSON.stringify({ seq, ts: `2026-09-10T12:00:0${seq}Z`, stream: "stdout", chunk }) + "\n";
  const first = row(1, "retained history");
  const second = row(2, "new output");
  log.mockResolvedValueOnce({ content: first, nextOffset: first.length });
  const run = { id: "run-1", companyId: "company-1", agentId: "agent-1", status: "succeeded", logRef: "log" } as HeartbeatRun;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    expect(container.textContent).toContain("retained history");
    await act(async () => {
      visibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("retained history");
    let complete!: (value: { content: string; nextOffset: number }) => void;
    log.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await act(async () => {
      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(container.textContent).toContain("retained history");
    expect(log).toHaveBeenLastCalledWith("run-1", first.length, expect.any(Number));
    await act(async () => complete({ content: second, nextOffset: first.length + second.length }));
    expect(container.textContent).toContain("retained history new output");
    log.mockResolvedValueOnce({ content: first, nextOffset: first.length });
    await act(async () => root.render(<Viewer run={{ ...run, id: "run-2" }} adapterType="codex_local" />));
    expect(log).toHaveBeenLastCalledWith("run-2", 0, expect.any(Number));
    expect(container.textContent).not.toContain("new output");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it.each([LogViewer, ProductionLogViewer])("polls logs when WebSocket construction fails and recovers on retry (%#)", async (Viewer) => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.stubGlobal("WebSocket", undefined);
  log.mockResolvedValue({ content: "", nextOffset: 0 });
  const run = { id: "run-1", companyId: "company-1", agentId: "agent-1", status: "running", logRef: "log" } as HeartbeatRun;
  const root = createRoot(document.createElement("div"));
  const sockets: Array<{ onopen: (() => void) | null; close: () => void }> = [];
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    const initialReads = log.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(log.mock.calls.length).toBeGreaterThan(initialReads);
    expect(events).toHaveBeenCalled();
    vi.stubGlobal("WebSocket", class {
      onopen = null;
      close = vi.fn();
      constructor() { sockets.push(this); }
    });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(sockets).toHaveLength(1);
    await act(async () => sockets[0].onopen?.());
    const readsWhenConnected = log.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(log).toHaveBeenCalledTimes(readsWhenConnected);
  } finally {
    await act(async () => root.unmount());
  }
  expect(sockets[0].close).toHaveBeenCalled();
});

it("keeps a failed log receipt and raw provider errors without new reads when the locale changes", async () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  log.mockRejectedValueOnce(null);
  const run = { id: "run:raw", companyId: "company:raw", agentId: "agent:raw", status: "succeeded", logRef: "log" } as HeartbeatRun;
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => { await setLocale("en"); root.render(<LogViewer run={run} adapterType="codex_local" />); });
    expect(container.textContent).toContain("Failed to load run log");
    const reads = log.mock.calls.length;
    const eventsRead = events.mock.calls.length;
    await act(async () => { await setLocale("ru"); });
    expect(container.textContent).toContain("Не удалось загрузить журнал запуска");
    expect(log).toHaveBeenCalledTimes(reads); expect(events).toHaveBeenCalledTimes(eventsRead);
    await act(async () => { await setLocale("en"); });
    expect(container.textContent).toContain("Failed to load run log");
    expect(log).toHaveBeenCalledTimes(reads);
    log.mockRejectedValueOnce(new Error("Failed to load run log"));
    await act(async () => { root.render(<LogViewer run={{ ...run, id: "run:next" }} adapterType="codex_local" />); });
    expect(log).toHaveBeenLastCalledWith("run:next", 0, expect.any(Number));
    await act(async () => { await setLocale("ru"); });
    expect(container.textContent).toContain("Failed to load run log");
    expect(container.textContent).not.toContain("Не удалось загрузить журнал запуска");
    expect(log).toHaveBeenCalledTimes(reads + 1);
  } finally { await act(async () => { root.unmount(); await setLocale("en"); }); container.remove(); }
});

it.each(["toString", "__proto__"])("renders unknown workspace operation status %s without using inherited object properties", async (status) => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  workspace.operations = [{ id: "operation:raw", phase: "worktree_cleanup", status, startedAt: "2026-10-26T12:00:00Z", command: "echo <raw>", metadata: { branchName: "branch:raw" } } as unknown as WorkspaceOperation];
  log.mockResolvedValue({ content: JSON.stringify({ ts: "2026-10-26T12:00:00Z", stream: "stdout", chunk: "Raw output" }) + "\n", nextOffset: 1 });
  const run = { id: "run:raw", companyId: "company:raw", agentId: "agent:raw", status: "succeeded", logRef: "log" } as HeartbeatRun;
  const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
  try {
    await act(async () => { await setLocale("en"); root.render(<LogViewer run={run} adapterType="codex_local" />); });
    await vi.waitFor(() => expect(container.textContent).toContain("Raw output"));
    expect(container.textContent).toContain(status.replace("_", " "));
    expect(container.textContent).toContain("Worktree cleanup");
    const reads = log.mock.calls.length;
    await act(async () => { await setLocale("ru"); });
    expect(container.textContent).toContain(status.replace("_", " "));
    expect(container.textContent).toContain("echo <raw>");
    expect(container.textContent).toContain("branch:raw");
    expect(log).toHaveBeenCalledTimes(reads);
  } finally { await act(async () => { root.unmount(); await setLocale("en"); }); container.remove(); }
});
