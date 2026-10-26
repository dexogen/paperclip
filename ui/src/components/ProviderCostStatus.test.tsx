// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderQuotaCard } from "./ProviderQuotaCard";
import { i18n } from "../i18n";
import { BillerSpendCard } from "./BillerSpendCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const base = { provider: "openai", biller: "openai", billingType: "metered_api" as const, model: "gpt-6-astra",
  inputTokens: 10, cachedInputTokens: 0, outputTokens: 2, apiRunCount: 1, subscriptionRunCount: 0,
  subscriptionInputTokens: 0, subscriptionCachedInputTokens: 0, subscriptionOutputTokens: 0,
  providerCount: 1, modelCount: 1 };
const cases = [
  { name: "unpriced", costCents: 0, eventCount: 2, estimatedEventCount: 0, unpricedEventCount: 2, amount: "—", estimate: null, unavailable: "2 costs unavailable" },
  { name: "mixed", costCents: 125, eventCount: 3, estimatedEventCount: 1, unpricedEventCount: 1, amount: "$1.25", estimate: "Partially estimated", unavailable: "1 cost unavailable" },
  { name: "estimated", costCents: 125, eventCount: 2, estimatedEventCount: 2, unpricedEventCount: 0, amount: "$1.25", estimate: "Estimated", unavailable: null },
  { name: "included subscription", costCents: 0, eventCount: 2, estimatedEventCount: 0, unpricedEventCount: 0, amount: "$0.00", estimate: null, unavailable: null },
  { name: "older response", costCents: 125, amount: "$1.25", estimate: null, unavailable: null },
];
describe.each(["provider", "biller"] as const)("%s price status", kind => {
  let container: HTMLDivElement, root: ReturnType<typeof createRoot>;
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  it.each(cases)("labels $name totals without implying missing costs are free", async example => {
    const row = { ...base, ...example };
    const props = { budgetMonthlyCents: 0, totalCompanySpendCents: row.costCents, weekSpendCents: 0 };
    await act(async () => root.render(kind === "provider"
      ? <ProviderQuotaCard {...props} provider="openai" rows={[row]} windowRows={[]} showDeficitNotch={false} />
      : <BillerSpendCard {...props} row={row} providerRows={[row]} />));
    const header = container.querySelector('[data-slot="card-header"]')!;
    expect(header.textContent).toContain(example.amount);
    if (example.amount === "—") expect(header.textContent).not.toContain("$0.00");
    const badges = [...header.querySelectorAll('[data-slot="badge"]')].map(badge => badge.textContent);
    expect(badges).toEqual([example.estimate, example.unavailable].filter(Boolean));
  });
});

it("translates owned quota chrome while preserving raw windows, models, ordering and percentages", async () => {
  await i18n.changeLanguage("en");
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  const row = { ...base, model: "Estimated <raw-model>", costCents: 125, eventCount: 2, estimatedEventCount: 1, unpricedEventCount: 1 };
  const windows = [
    { provider: "openai", biller: "openai", window: "24h", windowHours: 24, costCents: 250, inputTokens: 100, cachedInputTokens: 10, outputTokens: 50 },
    { provider: "openai", biller: "openai", window: "5h", windowHours: 5, costCents: 125, inputTokens: 50, cachedInputTokens: 5, outputTokens: 25 },
  ];
  const quota = [{ label: "5h <provider>", usedPercent: 63, resetsAt: null, valueLabel: "50% used", detail: "resets <raw>" }];
  const before = JSON.stringify({ row, windows, quota });
  try {
    await act(async () => root.render(<ProviderQuotaCard provider="openai" rows={[row]} windowRows={windows}
      budgetMonthlyCents={1000} totalCompanySpendCents={125} weekSpendCents={125} showDeficitNotch={false}
      quotaWindows={quota} quotaError="raw diagnostic must stay hidden" quotaSource="Provider.source" />));
    const bars = [...container.querySelectorAll<HTMLElement>('[style*="width"]')];
    const widths = bars.map(bar => bar.style.width);
    expect(widths).toContain("50%");
    expect(widths).toContain("100%");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Скользящие периоды");
    expect(container.textContent!.indexOf("5 ч")).toBeLessThan(container.textContent!.indexOf("24 ч"));
    expect(container.textContent).toContain("Estimated <raw-model>");
    expect(container.textContent).toContain("Provider.source");
    expect(container.textContent).toContain("5h <provider>");
    expect(container.textContent).toContain("50% used");
    expect(container.textContent).toContain("resets <raw>");
    expect(container.textContent).toContain("Показана последняя доступная квота.");
    expect(container.textContent).not.toContain("raw diagnostic");
    expect(container.textContent).toContain("Частичная оценка");
    expect(container.textContent).toContain("Не определена стоимость 1 записи");
    expect([...container.querySelectorAll('[style*="width"]')]).toEqual(bars);
    expect(bars.map(bar => bar.style.width)).toEqual(widths);
    expect(container.querySelector("raw-model, provider, raw")).toBeNull();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Rolling windows");
    expect(JSON.stringify({ row, windows, quota })).toBe(before);
  } finally { await act(async () => root.unmount()); container.remove(); await i18n.changeLanguage("en"); }
});
