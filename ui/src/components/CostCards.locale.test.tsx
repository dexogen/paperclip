// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import type { CostByUserReport, FinanceEvent } from "@paperclipai/shared";
import { i18n } from "../i18n";
import { FinanceBillerCard } from "./FinanceBillerCard";
import { FinanceKindCard } from "./FinanceKindCard";
import { FinanceTimelineCard } from "./FinanceTimelineCard";
import { CostByUserTable } from "./CostByUserTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("keeps finance currencies, raw identities and explicit empty overrides through locale changes", async () => {
  await i18n.changeLanguage("en");
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const biller = { biller: "Credit <raw>", currency: "EUR", eventCount: 2, kindCount: 1, netCents: 1234, debitCents: 1500, creditCents: 266, estimatedDebitCents: 700 };
  const kinds = [{ currency: "JPY", eventKind: "credit_refund" as const, eventCount: 5, billerCount: 2, netCents: -500, debitCents: 0, creditCents: 500, estimatedDebitCents: 0 }];
  const event: FinanceEvent = { id: "finance-1", companyId: "company", agentId: null, issueId: null, projectId: null, goalId: null, heartbeatRunId: null, costEventId: null, billingCode: null,
    description: "Provider cost report <literal>", eventKind: "credit_refund", direction: "credit", biller: "Credit <raw>", provider: "Provider & {{literal}}", executionAdapterType: null,
    pricingTier: "tier <raw>", region: "region <raw>", model: "model.<raw>", quantity: null, unit: null, amountCents: 266, currency: "EUR", estimated: false,
    externalInvoiceId: "invoice <raw>", idempotencyKey: null, metadataJson: null, occurredAt: new Date("2026-10-26T10:00:00Z"), createdAt: new Date("2026-10-26T10:00:00Z") };
  const user = { userId: "raw-user", userName: "Unknown user", userImage: null, eventCount: 2, estimatedEventCount: 1, unpricedEventCount: 1, costCents: 1234, costCentsExact: "1234", inputTokens: 100, cachedInputTokens: 50, outputTokens: 10, runCount: 2 };
  const report: CostByUserReport = { activeUserCount: 3, rows: [user, { ...user, userId: "unnamed", userName: null }, { ...user, userId: "empty-name", userName: "" }, { ...user, userId: null, userName: null, costCents: 0, estimatedEventCount: 0, unpricedEventCount: 2 }] };
  const explicit = "No financial events recorded in this period. Events appear when reported through the API, CLI, or a supported integration.";
  const before = JSON.stringify({ biller, kinds, event, report });
  try {
    await act(async () => root.render(<>
      <FinanceBillerCard row={biller} /><FinanceKindCard rows={kinds} />
      <section data-testid="events"><FinanceTimelineCard rows={[event]} /></section>
      <section data-testid="default"><FinanceTimelineCard rows={[]} /></section>
      <section data-testid="explicit"><FinanceTimelineCard rows={[]} emptyMessage={explicit} /></section>
      <section data-testid="empty"><FinanceTimelineCard rows={[]} emptyMessage="" /></section>
      <CostByUserTable report={report} />
    </>));
    const table = host.querySelector("table")!;
    const rows = [...table.querySelectorAll("tbody tr")];
    const eventCard = host.querySelector('[data-testid="events"] [data-slot="card"]');
    expect(host.textContent).toContain("€12.34");
    expect(table.textContent).toContain("150");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(host.textContent).toContain("12,34");
    expect(host.textContent).toContain("2,66");
    expect(host.textContent).toContain("EUR");
    expect(host.textContent).toContain("Списания");
    expect(host.textContent).toContain("Возврат кредитов сервиса");
    expect(host.textContent).toContain("Зачисление");
    expect(host.textContent).toContain("Credit <raw>");
    expect(host.textContent).toContain("Provider & {{literal}}");
    expect(host.textContent).toContain("Provider cost report <literal>");
    expect(host.textContent).toContain("Счёт invoice <raw>");
    expect(host.querySelector("literal, raw")).toBeNull();
    expect(table.getAttribute("aria-label")).toBe("Расходы по пользователям");
    expect(rows.map(row => row.querySelector("th [title]")?.getAttribute("title") ?? row.querySelector("th")!.textContent)).toEqual(["Unknown user", "Неизвестный пользователь", "", "Без указания пользователя"]);
    expect(rows[3].textContent).toContain("—");
    expect(rows[3].textContent).not.toContain("0,00");
    expect([...table.querySelectorAll("tbody tr")]).toEqual(rows);
    expect(host.querySelector('[data-testid="events"] [data-slot="card"]')).toBe(eventCard);
    expect(host.querySelector('[data-testid="default"]')?.textContent).toContain("За этот период финансовые операции не записаны.");
    expect(host.querySelector('[data-testid="explicit"]')?.textContent).toContain(explicit);
    expect(host.querySelector('[data-testid="empty"] [data-slot="card-content"]')?.textContent).toBe("");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("€12.34");
    expect(JSON.stringify({ biller, kinds, event, report })).toBe(before);
  } finally { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage("en"); }
});
