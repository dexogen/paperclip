import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
export type TaskDateGroup = "today" | "yesterday" | "earlier";

function translatedTaskDateGroupLabels(t: TFunction): Record<TaskDateGroup, string> {
  return {
    today: t("inboxUi.date.today"),
    yesterday: t("inboxUi.date.yesterday"),
    earlier: t("inboxUi.date.earlier"),
  };
}

export const taskDateGroupLabels = translatedTaskDateGroupLabels(i18n.getFixedT("en"));

function localCalendarOrdinal(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Groups timestamps by the operator's local calendar, including across DST. */
export function taskDateGroup(value: Date | string | number, now: Date = new Date()): TaskDateGroup {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "earlier";

  const dayDifference = Math.round(
    (localCalendarOrdinal(now) - localCalendarOrdinal(date)) / (24 * 60 * 60 * 1000),
  );
  if (dayDifference <= 0) return "today";
  if (dayDifference === 1) return "yesterday";
  return "earlier";
}

/**
 * Returns the label to insert before the current row. A list made entirely of
 * older work does not begin with a redundant "Earlier" heading.
 */
export function taskDateGroupSeparator(
  previous: TaskDateGroup | null,
  current: TaskDateGroup,
  t: TFunction = i18n.getFixedT("en"),
): string | null {
  if (previous === current) return null;
  if (previous === null && current === "earlier") return null;
  return translatedTaskDateGroupLabels(t)[current];
}
