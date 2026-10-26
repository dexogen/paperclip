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
    expect(document.body.textContent).toContain("21 задача");
    expect(document.body.textContent).toContain("Запустить затронутых агентов (5)");
    expect(onApply).not.toHaveBeenCalled();
    expect(onWake).not.toHaveBeenCalled();
    await act(async () => root!.render(<TaskTreeControlDialog {...props} affectedCount={22} valid={false} />));
    expect(document.body.textContent).toContain("22 задачи");
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
