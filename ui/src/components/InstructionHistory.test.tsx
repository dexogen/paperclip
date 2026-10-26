// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { InstructionHistory } from "./InstructionHistory";

const api = vi.hoisted(() => ({ instructionHistory: vi.fn(), instructionDiff: vi.fn(), restoreInstructions: vi.fn() }));
vi.mock("../api/agents", () => ({ agentsApi: api }));

it("keeps the selected revision, literal diff and pinned restore payload through locale changes", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const onRestored = vi.fn();
  const current = "current:raw";
  api.instructionHistory.mockResolvedValue({ revisions: [{ id: "older:raw", source: "agent:custom", createdAt: "2026-10-25T12:00:00Z" }], nextCursor: null });
  api.instructionDiff.mockResolvedValue({ from: { content: "# User <b>literal</b> & body" }, added: "Added:\n<custom>", removed: "Removed:\n<raw>" });
  let finish!: (file: unknown) => void;
  api.restoreInstructions.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = (disabled: boolean) => <QueryClientProvider client={client}><InstructionHistory agentId="agent:raw" companyId="company:raw"
    path="folder/<user>.md" currentRevisionId={current} disabled={disabled} onRestored={onRestored} /></QueryClientProvider>;
  const button = (name: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(item => item.textContent === name)!;
  try {
    await act(async () => { await setLocale("en"); root.render(view(true)); });
    await act(async () => button("History").click());
    await vi.waitFor(() => expect(button("older:ra")).toBeDefined());
    await act(async () => button("older:ra").click());
    await vi.waitFor(() => expect(container.textContent).toContain("User <b>literal</b>"));
    const selected = button("older:ra"); selected.focus();
    expect(button("Restore as new revision").disabled).toBe(true);
    const reads = [api.instructionHistory.mock.calls.length, api.instructionDiff.mock.calls.length];
    await act(async () => { await setLocale("ru"); });
    expect(button("older:ra")).toBe(selected);
    expect(document.activeElement).toBe(selected);
    expect(container.textContent).toContain("Удалено:\nRemoved:\n<raw>");
    expect(container.textContent).toContain("Добавлено:\nAdded:\n<custom>");
    expect(container.querySelector("b")).toBeNull();
    expect(button("Восстановить как новую версию").disabled).toBe(true);
    expect(api.restoreInstructions).not.toHaveBeenCalled();
    expect([api.instructionHistory.mock.calls.length, api.instructionDiff.mock.calls.length]).toEqual(reads);
    await act(async () => { root.render(view(false)); });
    await act(async () => button("Восстановить как новую версию").click());
    expect(api.restoreInstructions).toHaveBeenCalledExactlyOnceWith("agent:raw", { path: "folder/<user>.md", revisionId: "older:raw", baseRevisionId: current }, "company:raw");
    await act(async () => { await setLocale("en"); });
    expect(button("Restore as new revision").disabled).toBe(true);
    const receipt = { path: "folder/<user>.md", content: "# Restored", revision: { id: "new:raw" } };
    await act(async () => { finish(receipt); });
    expect(onRestored).toHaveBeenCalledExactlyOnceWith(receipt);
    expect(api.restoreInstructions).toHaveBeenCalledTimes(1);
  } finally { await act(async () => { root.unmount(); await setLocale("en"); }); client.clear(); container.remove(); }
});
