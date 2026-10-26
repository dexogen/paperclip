// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExecutionWorkspace, ExecutionWorkspaceCloseAction, ExecutionWorkspaceCloseReadiness } from "@paperclipai/shared";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setLocale } from "../i18n";
import { workspaceCloseActionLabel, workspaceCloseMessages } from "../lib/workspace-close-display";
import { ExecutionWorkspaceCloseDialog } from "./ExecutionWorkspaceCloseDialog";

const api = vi.hoisted(() => ({ getCloseReadiness: vi.fn(), update: vi.fn() }));
const pushToast = vi.hoisted(() => vi.fn());
vi.mock("../api/execution-workspaces", () => ({ executionWorkspacesApi: api }));
vi.mock("../context/ToastContext", () => ({ useToastActions: () => ({ pushToast }) }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ownedAction: ExecutionWorkspaceCloseAction = {
  kind: "git_worktree_remove", label: "Remove git worktree",
  description: "Paperclip will run git worktree cleanup for /tmp/<b>raw</b>.",
  command: "git worktree remove --force /tmp/<b>raw</b>",
  display: { code: "git_worktree_remove", params: { path: "/tmp/<b>raw</b>" } },
};
function readiness(): ExecutionWorkspaceCloseReadiness {
  return {
    workspaceId: "workspace-1", deliveryState: "unknown", state: "ready_with_warnings",
    blockingReasons: [], warnings: ["The workspace has 21 untracked files.", "The workspace has 21 untracked files.", "Provider <b>raw</b>"],
    messageDescriptors: { blockingReasons: [], warnings: [{ index: 0, message: { code: "untracked_files", params: { count: 21 } } }] },
    linkedIssues: [{ id: "issue-1", identifier: "PAP-1", title: "Task <b>literal</b>", status: "done", isTerminal: true }], plannedActions: [ownedAction], isDestructiveCloseAllowed: true,
    isSharedWorkspace: false, isProjectPrimaryWorkspace: false, git: null, runtimeServices: [],
  };
}

describe("ExecutionWorkspaceCloseDialog locale and provenance", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  beforeEach(async () => {
    vi.clearAllMocks();
    await setLocale("en");
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(async () => {
    await act(async () => root.unmount()); client.clear(); container.remove(); await setLocale("en");
  });

  it("rerenders owned readiness while preserving raw provider copy, focus and one pending close", async () => {
    const value = readiness();
    const original = JSON.stringify(value);
    api.getCloseReadiness.mockResolvedValue(value);
    let finish!: (workspace: ExecutionWorkspace) => void;
    api.update.mockImplementation(() => new Promise<ExecutionWorkspace>((resolve) => { finish = resolve; }));
    const onClosed = vi.fn(), onOpenChange = vi.fn();
    await act(async () => root.render(<QueryClientProvider client={client}>
      <ExecutionWorkspaceCloseDialog workspaceId="workspace-1" workspaceName="Checkout <b>literal</b>" currentStatus="active" open onOpenChange={onOpenChange} onClosed={onClosed} />
    </QueryClientProvider>));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain(ownedAction.description);
    const cancel = Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Cancel")!;
    cancel.focus();
    await act(async () => { await setLocale("ru"); });
    expect(dialog.textContent).toContain("В рабочем пространстве 21 неотслеживаемый файл.");
    expect(dialog.textContent).toContain("The workspace has 21 untracked files.");
    expect(dialog.textContent).toContain("Provider <b>raw</b>");
    expect(dialog.textContent).toContain("Готово");
    expect(dialog.textContent).toContain("Task <b>literal</b>");
    expect(dialog.textContent).toContain("Checkout <b>literal</b>");
    expect(dialog.querySelector("b")).toBeNull();
    expect(dialog.querySelector("pre")?.textContent).toBe(ownedAction.command);
    expect(document.activeElement).toBe(cancel);
    expect(api.getCloseReadiness).toHaveBeenCalledExactlyOnceWith("workspace-1");
    expect(api.update).not.toHaveBeenCalled();
    const close = Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Закрыть рабочее пространство")!;
    await act(async () => close.click());
    expect(api.update).toHaveBeenCalledExactlyOnceWith("workspace-1", { status: "archived" });
    await act(async () => { await setLocale("en"); });
    expect(close.disabled).toBe(true);
    expect(dialog.textContent).toContain(ownedAction.description);
    await act(async () => { await setLocale("ru"); });
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.getCloseReadiness).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(value)).toBe(original);
    const closed = { id: "workspace-1", companyId: "company-1", status: "archived" } as ExecutionWorkspace;
    await act(async () => { finish(closed); });
    expect(onClosed).toHaveBeenCalledExactlyOnceWith(closed);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Рабочее пространство закрыто" }));
  });

  it("falls back to untouched raw copy for unknown, invalid, duplicate or mismatched descriptors", () => {
    const t = i18n.getFixedT("ru");
    const raw = ["Raw <script>literal</script>"];
    const invalid = [
      null, {}, [{ index: "0", message: { code: "no_local_path" } }],
      [{ index: 1, message: { code: "no_local_path" } }],
      [{ index: 0, message: { code: "provider_custom" } }],
      [{ index: 0, message: { code: "untracked_files", params: { count: "21" } } }],
      [{ index: 0, message: { code: "ahead", params: { count: 1, baseRef: 42 } } }],
      [{ index: 0, message: { code: "git_status_failed", params: { path: "/tmp", error: null } } }],
      [{ index: 0, message: { code: "no_local_path" } }, { index: 0, message: { code: "shared_session" } }],
    ];
    for (const descriptors of invalid) expect(workspaceCloseMessages(raw, descriptors, t)).toEqual(raw);
    for (const display of [{ code: "future_action" }, { code: "git_worktree_remove", params: { path: null } }, { code: "archive_record" }]) {
      const action = { ...ownedAction, display } as ExecutionWorkspaceCloseAction;
      expect(workspaceCloseActionLabel(action, t)).toEqual({ label: action.label, description: action.description });
    }
  });

  it("uses Russian count families and literal error parameters without changing canonical readiness", () => {
    const t = i18n.getFixedT("ru");
    for (const [count, expected] of [[1, "1 неотслеживаемый файл"], [2, "2 неотслеживаемых файла"], [5, "5 неотслеживаемых файлов"], [21, "21 неотслеживаемый файл"]] as const) {
      expect(workspaceCloseMessages(["raw"], [{ index: 0, message: { code: "untracked_files", params: { count } } }], t)[0]).toContain(expected);
    }
    expect(workspaceCloseMessages(["raw"], [{ index: 0, message: { code: "git_status_failed", params: { path: "/<path>", error: "Permission denied <b>raw</b>" } } }], t)).toEqual([
      "Не удалось прочитать состояние рабочего дерева Git для «/<path>»: Permission denied <b>raw</b>",
    ]);
  });
});
