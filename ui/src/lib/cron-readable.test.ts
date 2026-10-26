import { afterEach, describe, expect, it } from "vitest";
import { describeCron } from "./cron-readable";
import { i18n } from "@/i18n";

afterEach(async () => { await i18n.changeLanguage("en"); });

describe("describeCron", () => {
  it("describes a daily time", () => {
    expect(describeCron("0 14 * * *")).toBe("Every day at 14:00");
  });

  it("describes every-weekday", () => {
    expect(describeCron("0 14 * * 1-5")).toBe("Every weekday at 14:00");
  });

  it("describes a single day-of-week", () => {
    expect(describeCron("30 9 * * 1")).toBe("Every Monday at 09:30");
  });

  it("describes every N minutes", () => {
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
  });

  it("describes hourly on a minute", () => {
    expect(describeCron("5 * * * *")).toBe("Every hour at :05");
  });

  it("returns null for empty or unparseable input", () => {
    expect(describeCron("")).toBeNull();
    expect(describeCron(undefined)).toBeNull();
    expect(describeCron("not a cron")).toBeNull();
    expect(describeCron("1 2 3")).toBeNull();
  });

  it("uses Russian minute forms without changing cron input or falling back to English", async () => {
    await i18n.changeLanguage("ru");
    for (const [count, expected] of [
      [0, "Каждые 0 минут"], [1, "Каждую 1 минуту"], [2, "Каждые 2 минуты"],
      [5, "Каждые 5 минут"], [11, "Каждые 11 минут"], [21, "Каждую 21 минуту"],
      [22, "Каждые 22 минуты"], [25, "Каждые 25 минут"], [1.5, "Каждые 1.5 минуты"],
    ] as const) {
      expect(i18n.t("fullRoutinesSecrets.everyMinutes", { count })).toBe(expected);
    }
    expect(describeCron("*/22 * * * *")).toBe("Каждые 22 минуты");
    await i18n.changeLanguage("en");
    expect(describeCron("*/22 * * * *")).toBe("Every 22 minutes");
  });
});
