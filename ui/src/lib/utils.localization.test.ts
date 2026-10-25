import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { formatCents, formatDateTime, formatDurationMs, formatNumber, formatProjectBudget, formatTokens, relativeTime } from "./utils";

afterEach(async () => {
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
});

describe("localized display formatting", () => {
  it("uses Russian formatting while retaining the specified currency and local time", async () => {
    await i18n.changeLanguage("ru");
    expect(formatNumber(1234.5)).toBe("1\u00a0234,5");
    expect(formatCents(123450, "EUR")).toBe("1\u00a0234,50\u00a0€");
    expect(formatCents(123450)).toContain("$");
    expect(formatCents(100, "bad currency")).toBe("bad currency 1,00");
    const date = new Date(2026, 8, 7, 13, 2, 54);
    expect(formatDateTime(date, { includeSeconds: true })).toContain("13:02:54");
    expect(formatDateTime(date)).toContain("2026");
    expect(formatProjectBudget({ amountCents: 1234, windowKind: "calendar_month_utc" })).toContain("/мес.");
  });

  it("formats elapsed time and token units in the selected language", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-10-26T09:00:00Z").getTime());
    await i18n.changeLanguage("ru");
    expect(relativeTime("2026-10-26T08:59:55Z")).toBe("только что");
    expect(relativeTime("2026-10-26T08:58:00Z")).toBe("2 мин. назад");
    expect(formatDurationMs(3_720_000)).toBe("1 ч 2 мин.");
    expect(formatDurationMs(0)).toBe("0 с");
    expect(formatTokens(1200)).toContain("1,2");
    expect(formatTokens(1200)).toContain("тыс.");
    await i18n.changeLanguage("en");
    expect(relativeTime("2026-10-26T08:58:00Z")).toBe("2m ago");
    expect(formatDurationMs(3_720_000)).toBe("1h 2m");
    expect(formatTokens(1200)).toBe("1.2k");
  });
});
