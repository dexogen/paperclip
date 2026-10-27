import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "@/i18n";

afterEach(async () => { await setLocale("en"); });
import { countLabel, LAB_NOW, panelDateLabel, updatedLabel } from "./when";

// LAB_NOW is Monday 2026-09-28, 6:00 PM local time.
describe("updatedLabel", () => {
  it("gives the time today, Yesterday, the weekday within a week, then the date", () => {
    expect(updatedLabel("2026-09-28T16:05:00", LAB_NOW)).toBe("4:05 PM");
    expect(updatedLabel("2026-09-27T23:30:00", LAB_NOW)).toBe("Yesterday");
    expect(updatedLabel("2026-09-23T09:00:00", LAB_NOW)).toBe("Wednesday");
    expect(updatedLabel("2026-09-12T09:00:00", LAB_NOW)).toBe("Sep 12");
  });
});

describe("panelDateLabel", () => {
  it("gives Today, Yesterday, a day count within a week, then the long date", () => {
    expect(panelDateLabel("2026-09-28T08:00:00", LAB_NOW)).toBe("Today");
    expect(panelDateLabel("2026-09-27T08:00:00", LAB_NOW)).toBe("Yesterday");
    expect(panelDateLabel("2026-09-25T08:00:00", LAB_NOW)).toBe("3D ago");
    expect(panelDateLabel("2026-07-23T08:00:00", LAB_NOW)).toBe("July 23");
  });
});

describe("countLabel", () => {
  it("pluralises", () => {
    expect(countLabel(1)).toBe("1 Artifact");
    expect(countLabel(21)).toBe("21 Artifacts");
  });
});


describe("localized artifact labels", () => {
  it("uses Russian plural categories and localized dates, then restores English", async () => {
    await setLocale("ru");
    for (const [count, expected] of [[0, "0 артефактов"], [1, "1 артефакт"], [2, "2 артефакта"], [5, "5 артефактов"], [11, "11 артефактов"], [21, "21 артефакт"], [22, "22 артефакта"], [25, "25 артефактов"], [1.5, "1.5 артефакта"]] as const) {
      expect(countLabel(count)).toBe(expected);
    }
    expect(updatedLabel("2026-09-27T23:30:00", LAB_NOW)).toBe("Вчера");
    expect(updatedLabel("2026-09-23T09:00:00", LAB_NOW)).toBe("среда");
    await setLocale("en");
    expect(countLabel(21)).toBe("21 Artifacts");
    expect(updatedLabel("2026-09-27T23:30:00", LAB_NOW)).toBe("Yesterday");
  });
});
