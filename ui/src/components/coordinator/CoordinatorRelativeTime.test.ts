import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoordinatorRelativeTime, coordinatorRelativeLabel } from "./CoordinatorRelativeTime";
const now = Date.parse("2026-10-26T12:00:00Z");
describe("Coordinator message time", () => {
  it("uses the durable timestamp and handles clock skew without future ages", () => {
    expect(coordinatorRelativeLabel("2026-10-26T11:58:00Z", now)).toBe("2m ago");
    expect(coordinatorRelativeLabel("2026-10-26T10:00:00Z", now)).toBe("2h ago");
    expect(coordinatorRelativeLabel("2026-10-25T12:00:00Z", now)).toBe("1d ago");
    expect(coordinatorRelativeLabel("2026-10-26T12:01:00Z", now)).toBe("Just now");
  });
  it("uses Russian for relative ages and the selected locale for the calendar date and accessible timestamp", async () => {
    expect(coordinatorRelativeLabel(new Date(now - 120_000), now, "ru")).toBe("2 мин назад");
    expect(coordinatorRelativeLabel(new Date(now - 3_600_000), now, "ru")).toBe("1 ч назад");
    expect(coordinatorRelativeLabel(new Date(now - 86_400_000), now, "ru")).toBe("1 дн. назад");
    expect(coordinatorRelativeLabel(new Date(now + 60_000), now, "ru")).toBe("Только что");
    const date = new Date("2020-09-23T18:34:56Z");
    const previous = i18n.language;
    try {
      for (const locale of ["en", "ru"]) {
        await i18n.changeLanguage(locale);
        const rendered = renderToStaticMarkup(createElement(CoordinatorRelativeTime, { value: date }));
        const exact = date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "long" });
        expect(rendered).toContain(`title="${exact}"`);
        expect(rendered).toContain(`aria-label="${exact}"`);
        expect(rendered).toContain(`>${date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}<`);
      }
    } finally {
      await i18n.changeLanguage(previous);
    }
  });
  it("does not invent a time for an invalid timestamp", () => expect(coordinatorRelativeLabel("invalid", now)).toBeNull());
});
