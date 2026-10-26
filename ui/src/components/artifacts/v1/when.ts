import type { TFunction } from "i18next";
import { i18n } from "@/i18n";

const DAY = 86_400_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** The Artifacts page's form: "4:05 PM" · "Yesterday" · "Monday" · "Sep 12". */
export function updatedLabel(iso: string, now: Date = new Date(), t: TFunction = i18n.getFixedT("en"), locale = "en-US"): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return t("taskPanels.date.yesterday");
  if (days < 7) return date.toLocaleDateString(locale, { weekday: "long" });
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** The panel row's form: "Today" · "Yesterday" · "2D ago" · "July 23". */
export function panelDateLabel(iso: string, now: Date = new Date(), t: TFunction = i18n.getFixedT("en"), locale = "en-US"): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return t("taskPanels.date.today");
  if (days === 1) return t("taskPanels.date.yesterday");
  if (days < 7) return t("taskPanels.date.daysAgo", { count: days });
  return date.toLocaleDateString(locale, { month: "long", day: "numeric" });
}

export const countLabel = (count: number, t: TFunction = i18n.getFixedT("en")) => t("taskPanels.artifacts.count", { count });

export function sizeLabel(bytes: number | null | undefined, locale = "en-US"): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })} MB`;
}
