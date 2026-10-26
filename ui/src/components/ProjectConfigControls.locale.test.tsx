// @vitest-environment jsdom
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BudgetPolicySummary } from "@paperclipai/shared";
import { PROJECT_COLORS } from "@paperclipai/shared";
import { setLocale } from "@/i18n";
import { BudgetPolicyCard } from "./BudgetPolicyCard";
import { BudgetSidebarMarker } from "./BudgetSidebarMarker";
import { ProjectTilePicker } from "./ProjectTilePicker";
import { RepositoryEditor } from "./RepositoryEditor";
import { TooltipProvider } from "./ui/tooltip";
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  await setLocale("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  await setLocale("en");
});
async function render(node: ReactNode) {
  await act(async () => root.render(<TooltipProvider>{node}</TooltipProvider>));
}
async function inputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", {
      bubbles: true
    }));
  });
}
function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.trim() === label)!;
}
it.each(["card", "plain"] as const)("retains %s budget and reservation drafts with exact cents and policy choices", async variant => {
  const save = vi.fn();
  const reserve = vi.fn();
  const policy = vi.fn();
  const summary = {
    policyId: "policy",
    companyId: "company",
    scopeType: "project",
    scopeId: "project",
    scopeName: "Budget <b>raw</b>",
    metric: "billed_cents",
    windowKind: "lifetime",
    amount: 2000,
    reservationCents: "100.0000000",
    observedAmount: 500,
    unpricedEventCount: 1,
    pendingRunCount: 1,
    remainingAmount: 1500,
    utilizationPercent: 25,
    warnPercent: 80,
    hardStopEnabled: true,
    unpricedUsagePolicy: "block",
    notifyEnabled: true,
    isActive: true,
    status: "warning",
    paused: true,
    pauseReason: "budget",
    windowStart: new Date(),
    windowEnd: new Date()
  } as BudgetPolicySummary;
  await render(<BudgetPolicyCard variant={variant} summary={summary} onSave={save} onReservationChange={reserve} onUnpricedUsagePolicyChange={policy} />);
  const budget = container.querySelector<HTMLInputElement>('[placeholder="0.00"]')!;
  const reservation = container.querySelector<HTMLInputElement>('[aria-label="Reserve per run (USD)"]')!;
  await inputValue(budget, "12.34");
  await inputValue(reservation, "0.5678912");
  budget.focus();
  budget.setSelectionRange(1, 4);
  for (const locale of ["ru", "en", "ru"] as const) {
    await act(async () => setLocale(locale));
    expect(container.querySelector('[placeholder="0.00"]')).toBe(budget);
    expect(document.activeElement).toBe(budget);
    expect([budget.selectionStart, budget.selectionEnd]).toEqual([1, 4]);
    expect(reservation.value).toBe("0.5678912");
    expect(container.textContent).toContain(summary.scopeName);
    expect(container.querySelector("b")).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(policy).not.toHaveBeenCalled();
  }
  for (const [count, phrase] of [[1, "1 завершённый запуск"], [2, "2 завершённых запуска"], [5, "5 завершённых запусков"], [21, "21 завершённый запуск"]] as const) {
    await render(<BudgetPolicyCard variant={variant} summary={{
      ...summary,
      pendingRunCount: count,
      unpricedEventCount: count
    }} onSave={save} onReservationChange={reserve} onUnpricedUsagePolicyChange={policy} />);
    expect(container.textContent).toContain(phrase);
    expect(budget.value).toBe("12.34");
  }
  await act(async () => button("Обновить бюджет").click());
  await act(async () => button("Обновить резерв").click());
  await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(save).toHaveBeenCalledExactlyOnceWith(1234);
  expect(reserve).toHaveBeenCalledExactlyOnceWith("56.7891200");
  expect(policy).toHaveBeenCalledExactlyOnceWith("allow");
  expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-label")).toBe("Использование бюджета: 25%");
  await inputValue(reservation, "invalid");
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Введите корректную сумму не меньше нуля.");
  await act(async () => setLocale("en"));
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Enter a valid amount of zero or more.");
  expect(reserve).toHaveBeenCalledTimes(1);
});
it("translates only default budget markers", async () => {
  await render(<><BudgetSidebarMarker level="warning" /><BudgetSidebarMarker title="Budget warning" level="warning" /></>);
  await act(async () => setLocale("ru"));
  expect([...container.querySelectorAll('[aria-label]')].map(node => node.getAttribute("aria-label"))).toEqual(["Предупреждение о бюджете", "Budget warning"]);
});
it("keeps icon searches stable across languages and submits canonical icon and color values", async () => {
  const icon = vi.fn();
  const color = vi.fn();
  await render(<ProjectTilePicker color={null} icon={null} onSelectIcon={icon} onSelectColor={color} />);
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  const search = document.querySelector<HTMLInputElement>('[placeholder="Search icons..."]')!;
  await inputValue(search, "ракета");
  search.focus();
  search.setSelectionRange(1, 3);
  expect(document.querySelector('[title="rocket"]')).not.toBeNull();
  await act(async () => setLocale("ru"));
  expect(document.querySelector('[placeholder="Поиск значков…"]')).toBe(search);
  expect(document.activeElement).toBe(search);
  expect([search.selectionStart, search.selectionEnd]).toEqual([1, 3]);
  await act(async () => document.querySelector<HTMLButtonElement>('[title="Ракета"]')!.click());
  expect(icon).toHaveBeenCalledExactlyOnceWith("rocket");
  const swatch = PROJECT_COLORS[0];
  await act(async () => document.querySelector<HTMLButtonElement>(`[aria-label="Выбрать цвет ${swatch}"]`)!.click());
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Сбросить цвет на нейтральный серый"]')!.click());
  expect(color.mock.calls).toEqual([[swatch], [null]]);
  await inputValue(search, "rocket");
  await act(async () => setLocale("en"));
  expect(document.querySelector('[title="rocket"]')).not.toBeNull();
  expect(search.value).toBe("rocket");
  expect(icon).toHaveBeenCalledTimes(1);
});
it("keeps an open repository picker and search while selecting the literal repository ID once", async () => {
  const changed = vi.fn();
  const retry = vi.fn();
  const connect = vi.fn();
  const raw = {
    id: "repo:raw",
    fullName: "Owner/Repo <b>literal</b>",
    url: "https://github.com/Owner/Repo",
    private: true,
    connections: ["GitHub <raw>"]
  };
  function Fixture() {
    const [selected, setSelected] = useState<typeof raw[]>([]);
    return <RepositoryEditor selected={selected} available={[raw]} onChange={next => {
      changed(next);
      setSelected(next as typeof raw[]);
    }} onRetry={retry} onConnect={connect} />;
  }
  await render(<Fixture />);
  await act(async () => button("Add GitHub repo").click());
  const trigger = container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  if (trigger.getAttribute("aria-expanded") !== "true") await act(async () => trigger.click());
  const search = document.querySelector<HTMLInputElement>('[placeholder="Search GitHub repos…"]')!;
  await inputValue(search, "Owner");
  search.focus();
  search.setSelectionRange(1, 3);
  await act(async () => setLocale("ru"));
  expect(document.querySelector('[placeholder="Поиск репозиториев GitHub…"]')).toBe(search);
  expect(document.activeElement).toBe(search);
  expect(search.value).toBe("Owner");
  expect(document.body.textContent).toContain(raw.fullName);
  expect(document.querySelector("b")).toBeNull();
  expect(retry).not.toHaveBeenCalled();
  expect(connect).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
  await act(async () => [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes(raw.fullName))!.click());
  expect(changed).toHaveBeenCalledExactlyOnceWith([raw]);
  await act(async () => setLocale("en"));
  expect(container.textContent).toContain(raw.fullName);
  await act(async () => container.querySelector<HTMLButtonElement>(`[aria-label="Remove ${raw.fullName}"]`)!.click());
  expect(changed.mock.calls).toEqual([[[raw]], [[]]]);
});
