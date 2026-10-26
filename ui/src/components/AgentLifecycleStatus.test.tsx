// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { AgentLifecycleState } from "@paperclipai/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { AgentLifecycleStatus, agentLifecycleRefetchInterval } from "./AgentLifecycleStatus";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

beforeEach(async () => { await i18n.changeLanguage("en"); });
afterEach(async () => { await i18n.changeLanguage("en"); });

it.each([
  ["preparing", "Preparing agent"], ["verifying", "Verifying agent"],
  ["pausing", "Pausing agent"], ["resuming", "Resuming agent"],
  ["terminating", "Terminating agent"], ["cleaning_up", "Cleaning up agent"],
] as const)("shows and refreshes %s, including incomplete termination", (lifecycleState, label) => {
  const html = renderToStaticMarkup(<AgentLifecycleStatus agent={{ lifecycleState, lifecycleError: null }} onRetry={() => {}} retryPending={false} />);
  expect(html).toContain(label);
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).not.toContain("Retry");
  expect(agentLifecycleRefetchInterval(lifecycleState)).toBe(2_000);
});

it.each([undefined, "ready", "paused", "pending_approval", "terminated", "rejected"] as const)("removes progress for %s while still checking for external changes", lifecycleState => {
  expect(renderToStaticMarkup(<AgentLifecycleStatus agent={{ lifecycleState, lifecycleError: null }} onRetry={() => {}} retryPending={false} />)).toBe("");
  expect(agentLifecycleRefetchInterval(lifecycleState)).toBe(30_000);
});

it.each(["toString", "constructor", "unknown_lifecycle"])("does not treat an unknown phase %s as active work", state => {
  const lifecycleState = state as AgentLifecycleState;
  expect(renderToStaticMarkup(<AgentLifecycleStatus agent={{ lifecycleState, lifecycleError: null }} onRetry={() => {}} retryPending={false} />)).toBe("");
  expect(agentLifecycleRefetchInterval(lifecycleState)).toBe(30_000);
});

it("retries a failed step once while pending and removes the failure after recovery", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const retry = vi.fn();
  const agent = { lifecycleState: "cleaning_up" as AgentLifecycleState, lifecycleError: "The lifecycle step failed. Retry the operation." };
  try {
    await act(async () => root.render(<AgentLifecycleStatus agent={agent} onRetry={retry} retryPending={false} />));
    expect(container.textContent).toContain(agent.lifecycleError);
    expect(container.textContent).toContain("Agent cleanup failed");
    expect(container.textContent).toContain("Paperclip retries automatically");
    expect(container.textContent).not.toContain("Required resources are being removed");
    await act(async () => container.querySelector("button")!.click());
    expect(retry).toHaveBeenCalledOnce();
    await act(async () => root.render(<AgentLifecycleStatus agent={agent} onRetry={retry} retryPending />));
    expect(container.querySelector("button")!.disabled).toBe(true);
    await act(async () => container.querySelector("button")!.click());
    expect(retry).toHaveBeenCalledOnce();
    await act(async () => root.render(<AgentLifecycleStatus agent={{ lifecycleState: "terminated", lifecycleError: null }} onRetry={retry} retryPending={false} />));
    expect(container.textContent).toBe("");
  } finally { await act(async () => root.unmount()); }
});


it("keeps a pending retry and raw lifecycle error across EN/RU/EN without retrying again", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const retry = vi.fn();
  const agent = { lifecycleState: "cleaning_up" as const, lifecycleError: "Agent preparation failed" };
  try {
    await act(async () => root.render(<AgentLifecycleStatus agent={agent} onRetry={retry} retryPending={false} refreshError />));
    const button = container.querySelector("button")!;
    await act(async () => button.click());
    await act(async () => root.render(<AgentLifecycleStatus agent={agent} onRetry={retry} retryPending refreshError />));
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.querySelector("button")).toBe(button);
    expect(container.textContent).toContain("Не удалось очистить ресурсы агента");
    expect(container.textContent).toContain("Не удалось обновить состояние агента.");
    expect(container.textContent).toContain(agent.lifecycleError);
    expect(button.textContent).toBe("Повторная попытка…");
    expect(button.disabled).toBe(true);
    expect(agentLifecycleRefetchInterval(agent.lifecycleState)).toBe(2_000);
    await act(async () => button.click());
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.querySelector("button")).toBe(button);
    expect(button.textContent).toBe("Retrying…");
    expect(button.disabled).toBe(true);
    expect(retry).toHaveBeenCalledOnce();
  } finally { await act(async () => root.unmount()); }
});
