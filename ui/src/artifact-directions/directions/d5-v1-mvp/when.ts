import { t, i18n } from "@/i18n";
/**
 * "Updated 4:05 PM" · "Updated Yesterday" · "Updated Monday" · "Updated Jan 23"
 * — the mock's four forms. The fixtures live in late September 2026, so the
 * lab's clock is pinned there; the product would use the real clock.
 */
export const LAB_NOW = new Date("2026-09-28T18:00:00");

const DAY = 86_400_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function updatedLabel(iso: string, now: Date = LAB_NOW): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return date.toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return t("fullDiagnostics.yesterday");
  if (days < 7) return date.toLocaleDateString(i18n.language, { weekday: "long" });
  return date.toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
}

export const countLabel = (count: number) => t("fullDiagnostics.artifacts_711c16", { count: count });

/** The side panel's form: "Today" · "Yesterday" · "2D ago" · "July 23". */
export function panelDateLabel(iso: string, now: Date = LAB_NOW): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days <= 0) return t("fullDiagnostics.today");
  if (days === 1) return t("fullDiagnostics.yesterday");
  if (days < 7) return t("fullDiagnostics.daysAgo", { count: days });
  return date.toLocaleDateString(i18n.language, { month: "long", day: "numeric" });
}
