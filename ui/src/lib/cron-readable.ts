import { routineWeekdayLabel } from "@/lib/routine-display-labels";
import { i18n, useTranslation } from "@/i18n";
/**
 * Tiny best-effort cron → plain-English helper for the routine Triggers section.
 * Not a full cron parser: it covers the common shapes Paperclip schedule triggers
 * produce (every N minutes/hours, daily at HH:MM, weekday/weekend, day-of-week).
 * Falls back to the raw expression when it can't confidently describe it.
 */

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function describeTime(minute: string, hour: string): string | null {
  const m = Number(minute);
  const h = Number(hour);
  if (!Number.isInteger(m) || !Number.isInteger(h)) return null;
  if (m < 0 || m > 59 || h < 0 || h > 23) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

function describeDayOfWeek(dow: string): string | null {
  if (dow === "*" || dow === "?") return i18n.t("fullRoutinesSecrets.everyDay1005");
  if (dow === "1-5") return i18n.t("fullRoutinesSecrets.everyWeekday");
  if (dow === "0,6" || dow === "6,0" || dow === "0,7") return i18n.t("fullRoutinesSecrets.everyWeekend");
  const parts = dow.split(",").map((part) => part.trim());
  const names = parts.map((part) => {
    const n = Number(part);
    if (!Number.isInteger(n)) return null;
    return routineWeekdayLabel(DOW_NAMES[n % 7]);
  });
  if (names.some((name) => name === null)) return null;
  if (names.length === 1) return i18n.t("fullRoutinesSecrets.recurringWeekdays", { days: names[0] });
  const days = i18n.t("fullRoutinesSecrets.andLast", { items: names.slice(0, -1).join(", "), last: names[names.length - 1] });
  return i18n.t("fullRoutinesSecrets.recurringWeekdays", { days });
}

export function describeCron(expression: string | null | undefined): string | null {
  if (!expression) return null;
  const trimmed = expression.trim();
  const fields = trimmed.split(/\s+/);
  // Standard 5-field cron: minute hour day-of-month month day-of-week
  if (fields.length !== 5) return null;
  const [minute, hour, dom, month, dow] = fields;

  // Every N minutes
  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return i18n.t("fullRoutinesSecrets.everyMinutes", { count: Number(everyMinutes[1]) });
  }

  // Every N hours, on the minute
  const everyHours = hour.match(/^\*\/(\d+)$/);
  if (everyHours && /^\d+$/.test(minute) && dom === "*" && month === "*" && dow === "*") {
    return i18n.t("fullRoutinesSecrets.everyHoursAt", { count: Number(everyHours[1]), minute: pad2(Number(minute)) });
  }

  // Hourly
  if (/^\d+$/.test(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return i18n.t("fullRoutinesSecrets.everyHourAt1012", { "value1": pad2(Number(minute)) });
  }

  // Daily / weekly at a fixed time
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && month === "*") {
    const time = describeTime(minute, hour);
    if (!time) return null;
    if (dom === "*" && (dow === "*" || dow === "?")) {
      return i18n.t("fullRoutinesSecrets.everyDayAt1013", { "time": time });
    }
    if (dom === "*") {
      const dowText = describeDayOfWeek(dow);
      if (dowText) return i18n.t("fullRoutinesSecrets.at1014", { "value1": dowText[0].toUpperCase(), "value2": dowText.slice(1), "time": time });
    }
    if (/^\d+$/.test(dom) && (dow === "*" || dow === "?")) {
      return i18n.t("fullRoutinesSecrets.dayOfEveryMonthAt", { "dom": dom, "time": time });
    }
  }

  return null;
}
