import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(date: Date | string, t: TFunction = i18n.getFixedT("en")): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < MINUTE) return t("taskDisplay.time.justNow");
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return t("taskDisplay.time.minutes", { count: m });
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return t("taskDisplay.time.hours", { count: h });
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return t("taskDisplay.time.days", { count: d });
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return t("taskDisplay.time.weeks", { count: w });
  }
  const mo = Math.floor(seconds / MONTH);
  return t("taskDisplay.time.months", { count: mo });
}
