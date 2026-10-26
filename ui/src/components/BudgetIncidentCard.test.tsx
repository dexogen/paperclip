// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { BudgetIncident } from "@paperclipai/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BudgetIncidentCard } from "./BudgetIncidentCard";
import { i18n } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function incident(overrides: Partial<BudgetIncident> = {}): BudgetIncident {
  return {
    id: "incident-1",
    companyId: "company-1",
    policyId: "policy-1",
    scopeType: "agent",
    scopeId: "agent-1",
    scopeName: "Budget Demo",
    metric: "billed_cents",
    windowKind: "calendar_month_utc",
    windowStart: new Date("2026-10-01T00:00:00Z"),
    windowEnd: new Date("2026-11-01T00:00:00Z"),
    thresholdType: "hard",
    amountLimit: 100_000,
    amountObserved: 100_000,
    status: "open",
    approvalId: null,
    approvalStatus: null,
    resolvedAt: null,
    createdAt: new Date("2026-10-12T00:00:00Z"),
    updatedAt: new Date("2026-10-12T00:00:00Z"),
    ...overrides,
  };
}

async function renderCard(value: BudgetIncident) {
  const div = document.createElement("div");
  document.body.append(div);
  const root = createRoot(div);
  const onKeepPaused = vi.fn();
  const onRaiseAndResume = vi.fn();
  await act(async () => root.render(
    <BudgetIncidentCard incident={value} onKeepPaused={onKeepPaused} onRaiseAndResume={onRaiseAndResume} />,
  ));
  const buttons = () => Array.from(div.querySelectorAll("button"), (button) => button.textContent?.trim());
  return {
    div,
    buttons,
    onKeepPaused,
    onRaiseAndResume,
    renderPending: async () => act(async () => root.render(<BudgetIncidentCard incident={value} onKeepPaused={onKeepPaused} onRaiseAndResume={onRaiseAndResume} isMutating />)),
    cleanup: async () => {
      await act(async () => root.unmount());
      div.remove();
    },
  };
}

describe("BudgetIncidentCard", () => {
  afterEach(async () => { vi.restoreAllMocks(); await i18n.changeLanguage("en"); });

  it("labels a hard-stop incident as paused", async () => {
    const { div, buttons, cleanup } = await renderCard(incident());
    expect(div.textContent).toContain("agent hard stop");
    expect(div.textContent).toContain("This scope is paused.");
    expect(buttons()).toEqual(["Raise budget & resume", "Keep paused"]);
    expect(div.querySelector("input")?.value).toBe("1010.00");
    await cleanup();
  });

  it("labels a soft-threshold incident as a warning that does not pause the scope", async () => {
    const { div, buttons, onKeepPaused, cleanup } = await renderCard(
      incident({ thresholdType: "soft", amountObserved: 80_000 }),
    );
    expect(div.textContent).toContain("agent budget warning");
    expect(div.textContent).not.toContain("hard stop");
    expect(div.textContent).not.toContain("paused");
    expect(div.textContent).toContain("This warning does not pause work.");
    expect(div.textContent).toContain("Spending reached $800.00 against a limit of $1,000.00.");
    expect(buttons()).toEqual(["Raise budget", "Dismiss warning"]);
    expect(div.querySelector("input")?.value).toBe("1010.00");
    const dismiss = Array.from(div.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Dismiss warning")!;
    await act(async () => dismiss.click());
    expect(onKeepPaused).toHaveBeenCalledTimes(1);
    await cleanup();
  });

  it("describes a paused project for a project hard stop", async () => {
    const { div, cleanup } = await renderCard(incident({ scopeType: "project", scopeName: "Website" }));
    expect(div.textContent).toContain("project hard stop");
    expect(div.textContent).toContain("Project execution is paused.");
    await cleanup();
  });
  it("retains a dirty budget and pending action without another callback when language changes", async () => {
    const { div, onRaiseAndResume, onKeepPaused, renderPending, cleanup } = await renderCard(incident({ scopeName: "Open <raw>" }));
    try {
      const input = div.querySelector("input")!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "1200.25");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      });
      await act(async () => { await i18n.changeLanguage("ru"); });
      expect(div.textContent).toContain("Остановка по бюджету агента");
      expect(div.textContent).toContain("Open <raw>");
      expect(div.querySelector("input")).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe("1200.25");
      await act(async () => div.querySelector("button")!.click());
      expect(onRaiseAndResume).toHaveBeenCalledExactlyOnceWith(120025);
      await renderPending();
      expect(div.textContent).toContain("Применение…");
      expect([...div.querySelectorAll("button")].every(button => button.disabled)).toBe(true);
      await act(async () => { await i18n.changeLanguage("en"); });
      expect(div.textContent).toContain("Applying...");
      expect(input.value).toBe("1200.25");
      expect(onRaiseAndResume).toHaveBeenCalledTimes(1);
      expect(onKeepPaused).not.toHaveBeenCalled();
    } finally { await cleanup(); }
  });

});
