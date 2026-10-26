// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { TaskTreeControlDialog } from "./TaskTreeControls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  await i18n.changeLanguage("en");
});

describe("localized task tree confirmation", () => {
  it("keeps ineligible wake targets unchecked and translates coded warnings without changing unknown text", async () => {
    const onApply = vi.fn();
    const onWake = vi.fn();
    const warnings = [
      { code: "resume_tasks_remain_idle", message: "Blocked, backlog, and unassigned tasks will be unpaused but will not start." },
      { code: "future_warning", message: "Unknown warning <b> & пользовательский контекст" },
    ];
    const originalWarnings = JSON.stringify(warnings);
    const props = {
      open: true, onOpenChange: vi.fn(), mode: "resume" as const, scope: "subtree" as const,
      affectedCount: 2, affectedAgentCount: 0, loading: false, pending: false, valid: true,
      wakeAgents: true, onWakeAgentsChange: onWake, onRetry: vi.fn(), onApply, warnings,
    };
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<TaskTreeControlDialog {...props} />));
    const checkbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect(document.body.textContent).toContain(warnings[0].message);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(document.body.textContent).toContain("Пауза будет снята с 2 задач.");
    expect(document.body.textContent).toContain("но их выполнение не начнётся.");
    expect(document.body.textContent).toContain(warnings[1].message);
    expect(document.body.querySelector("b")).toBeNull();
    expect(document.body.querySelector('input[type="checkbox"]')).toBe(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect(onWake).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
    expect(JSON.stringify(warnings)).toBe(originalWarnings);
    await act(async () => root!.render(<TaskTreeControlDialog {...props} loading />));
    expect(document.body.textContent).not.toContain(warnings[1].message);
    expect(document.body.textContent).not.toContain("но их выполнение не начнётся.");
  });

  it("preserves the wake choice and action gate while translating the affected count", async () => {
    const onApply = vi.fn();
    const onWake = vi.fn();
    const props = {
      open: true, onOpenChange: vi.fn(), mode: "resume" as const, scope: "subtree" as const,
      affectedCount: 21, affectedAgentCount: 5, loading: false, pending: false, valid: true,
      wakeAgents: true, onWakeAgentsChange: onWake, onRetry: vi.fn(), onApply,
    };
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<TaskTreeControlDialog {...props} />));
    const checkbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(document.body.textContent).toContain("21 tasks");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(document.body.querySelector('input[type="checkbox"]')).toBe(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(document.body.textContent).toContain("Пауза будет снята с 21 задачи.");
    expect(document.body.textContent).toContain("Запустить затронутых агентов (5)");
    expect(onApply).not.toHaveBeenCalled();
    expect(onWake).not.toHaveBeenCalled();
    await act(async () => root!.render(<TaskTreeControlDialog {...props} affectedCount={22} valid={false} />));
    expect(document.body.textContent).toContain("Пауза будет снята с 22 задач.");
    const buttons = [...document.body.querySelectorAll("button")];
    const submit = buttons.find(button => button.textContent?.trim() === "Продолжить ветку задач");
    expect(submit).toBeDefined();
    expect(submit!.disabled).toBe(true);
    await act(async () => submit!.click());
    expect(onApply).not.toHaveBeenCalled();
    await act(async () => root!.render(<TaskTreeControlDialog {...props} affectedCount={5} />));
    expect(document.body.textContent).toContain("5 задач");
    await act(async () => submit!.click());
    expect(onApply).toHaveBeenCalledOnce();
  });
});
