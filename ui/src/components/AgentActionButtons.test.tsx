// @vitest-environment jsdom

import { useState, type ComponentProps, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentActionButtons, formatAgentActionFailure, type AgentActionFailure } from "./AgentActionButtons";
import { i18n, useTranslation } from "../i18n";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockOpenNewIssue = vi.hoisted(() => vi.fn());
const mockPushToast = vi.hoisted(() => vi.fn());
const mockCopy = vi.hoisted(() => vi.fn());
const mockAgentsApi = vi.hoisted(() => ({
  invoke: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  clearError: vi.fn(),
  approve: vi.fn(),
  terminate: vi.fn(),
  resetSession: vi.fn(),
  instructionsBundle: vi.fn(),
  instructionsFile: vi.fn(),
  create: vi.fn(),
  hire: vi.fn(),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}));

vi.mock("../context/DialogContext", () => ({
  useDialogActions: () => ({ openNewIssue: mockOpenNewIssue }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastActions: () => ({ pushToast: mockPushToast }),
}));

vi.mock("../api/agents", () => ({
  agentsApi: mockAgentsApi,
}));

vi.mock("../lib/clipboard", () => ({ copyTextToClipboard: mockCopy }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Alpha Agent",
    urlKey: "alpha",
    role: "engineer",
    title: null,
    icon: null,
    status: "active",
    reportsTo: null,
    capabilities: null,
    adapterType: "codex_local",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("AgentActionButtons", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let queryClient: QueryClient;
  let invalidateQueries: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    invalidateQueries = vi.spyOn(queryClient, "invalidateQueries") as unknown as ReturnType<typeof vi.fn>;
    mockAgentsApi.clearError.mockResolvedValue(makeAgent({ status: "idle" }));
    mockAgentsApi.pause.mockResolvedValue(makeAgent({ status: "paused" }));
    mockAgentsApi.resume.mockResolvedValue(makeAgent({ status: "idle" }));
    mockAgentsApi.terminate.mockResolvedValue(makeAgent({ status: "terminated" }));
    mockAgentsApi.invoke.mockResolvedValue({ id: "run-1" });
    mockAgentsApi.resetSession.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const currentRoot = root;
    if (currentRoot) {
      await act(async () => {
        currentRoot.unmount();
      });
    }
    queryClient.clear();
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.restoreAllMocks();
    await i18n.changeLanguage("en");
  });

  function render(agent: Agent, props: Partial<ComponentProps<typeof AgentActionButtons>> = {}) {
    root ??= createRoot(container);
    root.render(
      <QueryClientProvider client={queryClient}>
        <AgentActionButtons agent={agent} companyId="company-1" runLabel="Run Heartbeat" {...props} />
      </QueryClientProvider>,
    );
  }

  async function clickText(text: string) {
    const button = [...document.body.querySelectorAll("button")].find(element => element.textContent === text);
    expect(button, text).toBeTruthy();
    await act(() => button!.click());
    await flushReact();
  }

  async function openMenu() {
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click());
    await flushReact();
  }

  it("keeps the same pending invocation across EN/RU/EN without dispatching twice", async () => {
    let resolveInvoke!: (run: { id: string }) => void;
    mockAgentsApi.invoke.mockReturnValue(new Promise(resolve => { resolveInvoke = resolve; }));
    render(makeAgent(), { runLabel: undefined });
    await flushReact();
    const run = [...container.querySelectorAll("button")].find(button => button.textContent === "Run now")!;
    await act(() => run.click());
    await flushReact();
    await act(async () => { await i18n.changeLanguage("ru"); });
    await flushReact();
    expect(run.textContent).toBe("Запустить сейчас");
    expect(run.disabled).toBe(true);
    expect([...container.querySelectorAll("button")]).toContain(run);
    await act(() => run.click());
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    expect(run.textContent).toBe("Run now");
    expect(run.disabled).toBe(true);
    expect(mockAgentsApi.invoke).toHaveBeenCalledExactlyOnceWith("agent-1", "company-1");
    expect(mockNavigate).not.toHaveBeenCalled();
    resolveInvoke({ id: "run-localized" });
    await flushReact();
    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith("/agents/alpha/runs/run-localized");
  });

  it("preserves explicit English labels and an open raw pause confirmation across locales", async () => {
    render(makeAgent(), {
      assignLabel: "Assign Task", runLabel: "Run now",
      pauseConfirm: { title: "Pause", description: "Agent preparation failed" },
    });
    await flushReact();
    await clickText("Pause");
    const dialog = document.querySelector('[role="alertdialog"]')!;
    expect(dialog).toBeTruthy();
    for (const locale of ["ru", "en", "ru"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      await flushReact();
      expect(document.querySelector('[role="alertdialog"]')).toBe(dialog);
      expect(dialog.textContent).toContain("Pause");
      expect(dialog.textContent).toContain("Agent preparation failed");
      expect(container.textContent).toContain("Assign Task");
      expect(container.textContent).toContain("Run now");
      expect(mockAgentsApi.pause).not.toHaveBeenCalled();
    }
    await clickText("Всё равно приостановить");
    expect(mockAgentsApi.pause).toHaveBeenCalledExactlyOnceWith("agent-1", "company-1");
    expect(mockAgentsApi.invoke).not.toHaveBeenCalled();
    expect(mockOpenNewIssue).not.toHaveBeenCalled();
  });

  it("reports raw failures ahead of the legacy callback and formats persisted failures at render time", async () => {
    const onActionError = vi.fn();
    const failures: Array<AgentActionFailure | null> = [];
    const opaqueCause = { message: "Action failed" };
    mockAgentsApi.clearError.mockRejectedValueOnce(opaqueCause);
    function FailureExample() {
      const [failure, setFailure] = useState<AgentActionFailure | null>(null);
      const { t } = useTranslation();
      return <>
        <AgentActionButtons agent={makeAgent({ status: "error" })} onActionError={onActionError}
          onActionFailure={next => { failures.push(next); setFailure(next); }} />
        <p role="alert">{failure ? formatAgentActionFailure(failure, t) : null}</p>
      </>;
    }
    root = createRoot(container);
    root.render(<QueryClientProvider client={queryClient}><FailureExample /></QueryClientProvider>);
    await flushReact();
    await clickText("Clear error");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("Action failed");
    expect(failures).toEqual([{ kind: "action", cause: opaqueCause }]);
    expect(failures[0]!.cause).toBe(opaqueCause);
    await act(async () => { await i18n.changeLanguage("ru"); });
    await flushReact();
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("Не удалось выполнить действие");
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("Action failed");
    expect(mockAgentsApi.clearError).toHaveBeenCalledOnce();
    await act(async () => { await i18n.changeLanguage("ru"); });
    const externalError = new Error("Action failed");
    mockAgentsApi.clearError.mockRejectedValueOnce(externalError);
    await flushReact();
    await clickText("Сбросить ошибку");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("Action failed");
    expect(failures[1]!.cause).toBe(externalError);
    await clickText("Сбросить ошибку");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe("");
    expect(failures.at(-1)).toBeNull();
    expect(mockAgentsApi.clearError).toHaveBeenCalledTimes(3);
    expect(onActionError).not.toHaveBeenCalled();
    expect(mockPushToast).not.toHaveBeenCalled();
  });

  it.each([
    ["action", "Action failed"], ["reset_session", "Failed to reset session"], ["duplicate", "Failed to duplicate agent"],
  ] as const)("preserves the fixed-English %s legacy fallback and its existing toast policy", async (kind, fallback) => {
    await i18n.changeLanguage("ru");
    const onActionError = vi.fn();
    render(makeAgent(), { onActionError, runLabel: undefined });
    await flushReact();
    if (kind === "action") {
      mockAgentsApi.invoke.mockRejectedValueOnce(null);
      await clickText("Запустить сейчас");
    } else {
      await openMenu();
      if (kind === "reset_session") {
        mockAgentsApi.resetSession.mockRejectedValueOnce(null);
        await clickText("Сбросить сеансы");
      } else {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        mockAgentsApi.instructionsBundle.mockResolvedValueOnce({ entryFile: "AGENTS.md", files: [] });
        mockAgentsApi.create.mockRejectedValueOnce(null);
        await clickText("Создать копию агента");
      }
    }
    expect(onActionError).toHaveBeenCalledExactlyOnceWith(fallback);
    expect(formatAgentActionFailure({ kind, cause: null })).toBe(fallback);
    if (kind === "duplicate") {
      expect(mockPushToast).toHaveBeenCalledExactlyOnceWith({
        title: "Не удалось создать копию агента", body: "Не удалось создать копию агента", tone: "error",
      });
    } else {
      expect(mockPushToast).not.toHaveBeenCalled();
      if (kind === "reset_session") { await openMenu(); await clickText("Сбросить сеансы"); }
      else await clickText("Запустить сейчас");
      expect(onActionError).toHaveBeenLastCalledWith(null);
    }
  });

  it("translates only the owned duplicate-not-ready error, preserving identical external Error text", async () => {
    await i18n.changeLanguage("ru");
    const onActionFailure = vi.fn();
    const onActionError = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(makeAgent({ companyId: "" }), { companyId: "", onActionFailure, onActionError });
    await flushReact();
    await openMenu();
    await clickText("Создать копию агента");
    expect(onActionFailure).toHaveBeenCalledOnce();
    const failure = onActionFailure.mock.calls[0][0] as AgentActionFailure;
    expect(failure.kind).toBe("duplicate");
    expect(formatAgentActionFailure(failure)).toBe("Agent is not ready to duplicate");
    expect(formatAgentActionFailure(failure, i18n.getFixedT("ru"))).toBe("Агент не готов к созданию копии");
    expect(formatAgentActionFailure({ kind: "duplicate", cause: new Error("Agent is not ready to duplicate") }, i18n.getFixedT("ru")))
      .toBe("Agent is not ready to duplicate");
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith({ title: "Не удалось создать копию агента", body: "Агент не готов к созданию копии", tone: "error" });
    expect(onActionError).not.toHaveBeenCalled();
    expect(mockAgentsApi.create).not.toHaveBeenCalled();
    expect(mockAgentsApi.instructionsBundle).not.toHaveBeenCalled();
  });

  it.each(["action", "reset_session"] as const)("uses the completion locale for %s failure toasts and preserves the shown snapshot", async kind => {
    let reject!: (cause: unknown) => void;
    const pending = new Promise((_resolve, fail) => { reject = fail; });
    if (kind === "action") mockAgentsApi.invoke.mockReturnValueOnce(pending);
    else mockAgentsApi.resetSession.mockReturnValueOnce(pending);
    render(makeAgent(), { runLabel: undefined });
    await flushReact();
    if (kind === "action") await clickText("Run now");
    else { await openMenu(); await clickText("Reset Sessions"); }
    await act(async () => { await i18n.changeLanguage("ru"); });
    reject(null);
    await flushReact();
    const toast = { title: "Не удалось выполнить действие", body: kind === "action" ? "Не удалось выполнить действие" : "Не удалось сбросить сеанс", tone: "error" };
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith(toast);
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith(toast);
    expect(kind === "action" ? mockAgentsApi.invoke : mockAgentsApi.resetSession).toHaveBeenCalledOnce();
  });

  it("keeps duplicate payloads literal and shows completion-locale success after a pending locale switch", async () => {
    let resolveCreated!: (agent: Agent) => void;
    mockAgentsApi.instructionsBundle.mockResolvedValueOnce({ entryFile: "AGENTS.md", files: [{ path: "AGENTS.md" }] });
    mockAgentsApi.instructionsFile.mockResolvedValueOnce({ content: "Pause {{name}}\nRun now" });
    mockAgentsApi.create.mockReturnValueOnce(new Promise(resolve => { resolveCreated = resolve; }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onActionFailure = vi.fn();
    const onActionError = vi.fn();
    await i18n.changeLanguage("ru");
    render(makeAgent(), { onActionFailure, onActionError });
    await flushReact();
    await openMenu();
    await clickText("Создать копию агента");
    expect(confirm).toHaveBeenCalledExactlyOnceWith("Создать копию агента «Alpha Agent» с именем «Alpha Agent Copy»?");
    expect(mockAgentsApi.create).toHaveBeenCalledExactlyOnceWith("company-1", expect.objectContaining({
      name: "Alpha Agent Copy", adapterType: "codex_local", role: "engineer",
      instructionsBundle: { entryFile: "AGENTS.md", files: { "AGENTS.md": "Pause {{name}}\nRun now" } },
    }));
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    await openMenu();
    expect([...document.body.querySelectorAll("button")].find(button => button.textContent === "Duplicate Agent")!.disabled).toBe(true);
    expect(mockAgentsApi.create).toHaveBeenCalledOnce();
    resolveCreated(makeAgent({ id: "agent-copy", urlKey: "alpha-copy", name: "Agent duplicated" }));
    await flushReact();
    expect(onActionFailure).toHaveBeenCalledExactlyOnceWith(null);
    expect(onActionError).not.toHaveBeenCalled();
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith({ title: "Agent duplicated", body: "Agent duplicated", tone: "success" });
    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith("/agents/alpha-copy/dashboard");
    await act(async () => { await i18n.changeLanguage("ru"); });
    await flushReact();
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith({ title: "Agent duplicated", body: "Agent duplicated", tone: "success" });
  });

  it("copies the canonical agent ID once and localizes only a later clipboard failure", async () => {
    let rejectCopy!: (cause: unknown) => void;
    mockCopy.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectCopy = reject; }));
    render(makeAgent());
    await flushReact();
    await openMenu();
    await clickText("Copy Agent ID");
    expect(mockCopy).toHaveBeenCalledExactlyOnceWith("agent-1");
    await act(async () => { await i18n.changeLanguage("ru"); });
    rejectCopy(new Error("Action failed"));
    await flushReact();
    const toast = { title: "Не удалось скопировать", body: "Буфер обмена недоступен.", tone: "error" };
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith(toast);
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    expect(mockCopy).toHaveBeenCalledOnce();
    expect(mockPushToast).toHaveBeenCalledExactlyOnceWith(toast);
  });

  it.each(["codex_local", "claude_local", "paperclip_runner"])("returns unfinished %s agents to their saved runner", async adapterType => {
    render(makeAgent({ adapterType, status: "paused", lifecycleState: "paused", pauseReason: "setup" }));
    await flushReact();
    const finish = [...container.querySelectorAll("button")].find(button => button.textContent === "Finish setup");
    expect(finish).toBeTruthy();
    expect([...container.querySelectorAll("button")].some(button => button.textContent === "Resume")).toBe(false);
    await act(() => finish!.click());
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("setupAgentId=agent-1"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining(`runner=${adapterType === "paperclip_runner" ? "paperclip" : "legacy"}`));
    expect(mockAgentsApi.resume).not.toHaveBeenCalled();
  });

  it.each(["preparing", "verifying", "resuming"] as const)("offers pause rather than resume during %s", async lifecycleState => {
    render(makeAgent({ status: "paused", lifecycleState }));
    await flushReact();
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.some(button => button.textContent === "Resume")).toBe(false);
    const pause = buttons.find(button => button.textContent === "Pause")!;
    expect(pause.disabled).toBe(false);
    await act(async () => pause.click());
    await flushReact();
    expect(mockAgentsApi.pause).toHaveBeenCalledWith("agent-1", "company-1");
  });

  it.each(["pausing", "terminating", "cleaning_up", "terminated", "rejected"] as const)("disables pause and resume during %s", async lifecycleState => {
    render(makeAgent({ status: lifecycleState === "pausing" ? "paused" : "terminated", lifecycleState }));
    await flushReact();
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.find(button => button.textContent === "Pause")!.disabled).toBe(true);
    if (lifecycleState !== "pausing") {
      expect(buttons.find(button => button.textContent === "Run Heartbeat")!.disabled).toBe(true);
      expect(buttons.find(button => button.textContent === "Assign Task")!.disabled).toBe(true);
    }
  });

  it("replaces the pause slot with Clear error for error agents", async () => {
    render(makeAgent({ status: "error" }));
    await flushReact();

    expect(container.textContent).toContain("Clear error");
    expect(container.textContent).not.toContain("Pause");
    expect(container.textContent).toContain("Run Heartbeat");

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Open actions for Alpha Agent"]')?.click();
    });
    await flushReact();

    expect(document.body.textContent).toContain("Reset Sessions");
  });

  it("calls clearError and refreshes agent-related queries", async () => {
    render(makeAgent({ status: "error" }));
    await flushReact();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Clear error and return agent to idle"]')?.click();
    });
    await flushReact();

    expect(mockAgentsApi.clearError).toHaveBeenCalledWith("agent-1", "company-1");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "detail", "agent-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "detail", "alpha"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "runtime-state", "agent-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "task-sessions", "agent-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "company-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["live-runs", "company-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["heartbeats", "company-1", "agent-1"] });
  });

  it("keeps the normal pause action for non-error agents", async () => {
    render(makeAgent({ status: "active" }));
    await flushReact();

    expect(container.textContent).toContain("Pause");
    expect(container.textContent).not.toContain("Clear error");
  });

  it.each([false, true])("keeps the normal run action when persistent tracing is %s", async tracingEnabled => {
    render(makeAgent({ runtimeConfig: tracingEnabled ? { debug: { providerTrace: "raw" } } : {} }));
    await flushReact();

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.some(button => button.textContent?.includes("Run with provider trace"))).toBe(false);
    expect(container.textContent?.includes("Raw tracing on")).toBe(tracingEnabled);

    await act(async () => {
      buttons.find(button => button.textContent === "Run Heartbeat")!.click();
    });
    await flushReact();

    expect(mockAgentsApi.invoke).toHaveBeenCalledExactlyOnceWith("agent-1", "company-1");
    expect(mockNavigate).toHaveBeenCalledWith("/agents/alpha/runs/run-1");
  });

  it.each(["terminating", "cleaning_up"] as const)("keeps the detail page open during %s", async lifecycleState => {
    mockAgentsApi.terminate.mockResolvedValue(makeAgent({ status: "terminated", lifecycleState }));
    const onTerminateSuccess = vi.fn();
    render(makeAgent(), { onTerminateSuccess });
    await flushReact();
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Open actions for Alpha Agent"]')!.click(); });
    await flushReact();
    await act(async () => { Array.from(document.body.querySelectorAll("button")).find(button => button.textContent?.includes("Terminate"))!.click(); });
    await flushReact();
    expect(mockAgentsApi.terminate).toHaveBeenCalledWith("agent-1", "company-1");
    expect(onTerminateSuccess).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "detail", "agent-1"] });
  });

  it("calls the terminate success handler after terminating an agent", async () => {
    const onTerminateSuccess = vi.fn();
    render(makeAgent(), { onTerminateSuccess });
    await flushReact();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Open actions for Alpha Agent"]')?.click();
    });
    await flushReact();

    const terminateButton = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Terminate"));
    expect(terminateButton).toBeTruthy();

    await act(async () => {
      terminateButton?.click();
    });
    await flushReact();

    expect(mockAgentsApi.terminate).toHaveBeenCalledWith("agent-1", "company-1");
    expect(onTerminateSuccess).toHaveBeenCalledWith(expect.objectContaining({
      id: "agent-1",
      status: "terminated",
    }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "detail", "agent-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "detail", "alpha"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["agents", "company-1"] });
  });

  it("does not terminate when navigation away from a dirty detail page is rejected", async () => {
    const onBeforeNavigate = vi.fn().mockReturnValue(false);
    render(makeAgent(), { onBeforeNavigate, onTerminateSuccess: vi.fn() });
    await flushReact();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Open actions for Alpha Agent"]')?.click();
    });
    await flushReact();

    const terminateButton = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Terminate"));
    await act(async () => {
      terminateButton?.click();
    });
    await flushReact();

    expect(onBeforeNavigate).toHaveBeenCalledOnce();
    expect(mockAgentsApi.terminate).not.toHaveBeenCalled();
  });

  it("rechecks navigation when the form becomes dirty while termination is pending", async () => {
    let resolveTermination!: (agent: Agent) => void;
    mockAgentsApi.terminate.mockReturnValue(new Promise((resolve) => {
      resolveTermination = resolve;
    }));
    const onBeforeNavigate = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const onTerminateSuccess = vi.fn();
    const agent = makeAgent();
    render(agent, {
      hasPendingNavigationChanges: false,
      onBeforeNavigate,
      onTerminateSuccess,
    });
    await flushReact();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Open actions for Alpha Agent"]')?.click();
    });
    await flushReact();
    const terminateButton = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Terminate"));
    await act(async () => {
      terminateButton?.click();
    });
    await flushReact();

    await act(async () => { await i18n.changeLanguage("ru"); });
    render(agent, {
      hasPendingNavigationChanges: true,
      onBeforeNavigate,
      onTerminateSuccess,
    });
    await flushReact();
    await act(async () => { await i18n.changeLanguage("en"); });
    await flushReact();
    expect(mockAgentsApi.terminate).toHaveBeenCalledExactlyOnceWith("agent-1", "company-1");
    expect(onBeforeNavigate).toHaveBeenCalledOnce();
    resolveTermination(makeAgent({ status: "terminated" }));
    await flushReact();

    expect(onBeforeNavigate).toHaveBeenCalledTimes(2);
    expect(onTerminateSuccess).not.toHaveBeenCalled();
  });
});
