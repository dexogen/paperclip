// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { ToolRiskLevel } from "@paperclipai/shared";
import { i18n, useTranslation } from "@/i18n";
import { ApiError } from "@/api/client";
import { CapabilityBadges, DecisionBadge, ErrorState, HealthBadge, LoadingState, PendingBackendNotice, RelativeTime, RiskBadge } from "./shared";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;

afterEach(async () => {
  await act(async () => { root?.unmount(); await i18n.changeLanguage("en"); });
  container?.remove();
});

it("updates supplied badge and error translations while fixed-English callers and raw errors remain literal", async () => {
  const retry = vi.fn();
  function Surface() {
    const { t } = useTranslation();
    const [error, setError] = useState<unknown>(null);
    return <>
      <div data-testid="localized">
        <RiskBadge risk="medium" t={t} />
        <RiskBadge risk={"constructor" as ToolRiskLevel} t={t} />
        <CapabilityBadges isReadOnly isWrite isDestructive t={t} />
        <ErrorState error={error} onRetry={retry} t={t} />
      </div>
      <div data-testid="legacy"><RiskBadge risk="medium" /><CapabilityBadges isReadOnly /><ErrorState error={null} /></div>
      <ErrorState error={new Error("Something went wrong.")} t={t} />
      <button onClick={() => setError(new ApiError("raw provider", 403, null))}>Forbidden</button>
      <button onClick={() => setError(new ApiError("raw missing route", 404, null))}>Missing</button>
    </>;
  }
  container = document.createElement("div"); document.body.appendChild(container);
  await act(async () => { await i18n.changeLanguage("en"); root = createRoot(container); root.render(<Surface />); });
  const localized = container.querySelector('[data-testid="localized"]')!;
  const legacy = container.querySelector('[data-testid="legacy"]')!;
  const retryButton = Array.from(localized.querySelectorAll("button")).find((button) => button.textContent === "Retry")!;
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(localized.textContent).toContain("Средний");
  expect(localized.textContent).toContain("constructor");
  expect(localized.textContent).toContain("Только чтение");
  expect(localized.textContent).toContain("Что-то пошло не так.");
  expect(legacy.textContent).toContain("mediumread-only");
  expect(legacy.textContent).toContain("Something went wrong.");
  expect(container.textContent).toContain("Something went wrong.");
  expect(retry).not.toHaveBeenCalled();
  expect(retryButton.isConnected).toBe(true);
  await act(async () => { retryButton.click(); });
  expect(retry).toHaveBeenCalledOnce();
  await act(async () => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Forbidden")!.click(); });
  expect(localized.textContent).toContain("права оператора или администратора");
  expect(localized.textContent).not.toContain("raw provider");
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(localized.textContent).toContain("Tools & Access requires board/admin access.");
  expect(legacy.textContent).toContain("mediumread-only");
  expect(retry).toHaveBeenCalledOnce();
  await act(async () => { Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Missing")!.click(); });
  expect(localized.textContent).toContain("isn't available on this server yet");
});

it("retains the existing API route classification without translating ordinary provider errors", async () => {
  container = document.createElement("div"); document.body.appendChild(container);
  await act(async () => { await i18n.changeLanguage("ru"); root = createRoot(container); });
  const t = i18n.getFixedT("ru");
  for (const [error, expected] of [
    [new ApiError("Route not found: /legacy", 500, null), "пока недоступен на этом сервере"],
    [new ApiError("Something went wrong.", 500, null), "Something went wrong."],
    [new Error("Route not found: /legacy"), "Route not found: /legacy"],
  ] as const) {
    await act(async () => { root.render(<ErrorState error={error} t={t} />); });
    expect(container.textContent).toContain(expected);
  }
  await act(async () => { root.render(<><RiskBadge risk={null} t={t} /><RiskBadge risk={"__proto__" as ToolRiskLevel} t={t} /><RiskBadge risk={"toString" as ToolRiskLevel} t={t} /></>); });
  expect(container.textContent).toBe("Неизвестен__proto__toString");
});

it("localizes relative timestamps with the same rounding and fixed-English defaults", async () => {
  const now = Date.parse("2026-10-26T12:00:00Z");
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  function Surface() {
    const { t, i18n } = useTranslation();
    return <>
      <div data-testid="localized"><RelativeTime value={new Date(now - 5 * 60_000)} t={t} locale={i18n.resolvedLanguage} /><RelativeTime value={new Date(now + 2 * 60 * 60_000)} t={t} /><RelativeTime value={null} t={t} /></div>
      <div data-testid="legacy"><RelativeTime value={new Date(now - 5 * 60_000)} /><RelativeTime value={new Date(now + 2 * 60 * 60_000)} /><RelativeTime value={null} /></div>
    </>;
  }
  try {
    container = document.createElement("div"); document.body.appendChild(container);
    await act(async () => { await i18n.changeLanguage("en"); root = createRoot(container); root.render(<Surface />); });
    expect(container.querySelector('[data-testid="localized"]')?.textContent).toBe("5m agoin 2hnever");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.querySelector('[data-testid="localized"]')?.textContent).toBe("5 мин. назадчерез 2 чникогда");
    expect(container.querySelector('[data-testid="legacy"]')?.textContent).toBe("5m agoin 2hnever");
  } finally { clock.mockRestore(); }
});


it("updates owned health, decision and utility labels while preserving explicit and unknown values", async () => {
  container = document.createElement("div"); document.body.appendChild(container);
  await act(async () => {
    await i18n.changeLanguage("en"); root = createRoot(container);
    root.render(<>
      <section data-testid="owned"><HealthBadge status="healthy" /><HealthBadge status="degraded" /><HealthBadge status="unknown" />
        <DecisionBadge decision="allow" /><DecisionBadge decision="requires_approval" /><DecisionBadge decision="rate_limited" />
        <LoadingState /><PendingBackendNotice title="Status" body="Caller content" issue={{ identifier: "GH-42", href: "/issues/GH-42" }} /></section>
      <section data-testid="literal"><HealthBadge status="healthy" label="User healthy" /><HealthBadge status="constructor" />
        <DecisionBadge decision="__proto__" /><LoadingState label="Provider loading" /></section>
    </>);
  });
  const owned = container.querySelector('[data-testid="owned"]')!;
  const literal = container.querySelector('[data-testid="literal"]')!;
  expect(owned.textContent).toContain("healthydegradedunknownallowedrequire approvalrate limitedLoading…");
  const link = owned.querySelector("a")!;
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(owned.textContent).toContain("В нормеРаботает с ограничениямиНеизвестноРазрешеноТребуется согласованиеОграничено по частотеЗагрузка…");
  expect(link.textContent).toBe("Задача GH-42 →");
  expect(link.getAttribute("href")).toBe("/issues/GH-42");
  expect(literal.textContent).toBe("User healthyconstructor__proto__Provider loading");
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(link.isConnected).toBe(true);
  expect(link.textContent).toBe("Tracked in GH-42 →");
});
