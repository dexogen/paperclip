import { i18n, useTranslation } from "@/i18n";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => { now = Date.now(); listeners.forEach(notify => notify()); }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
  };
}
export function useCoordinatorRelativeClock() {
  return useSyncExternalStore(subscribe, () => now, () => now);
}
export function coordinatorRelativeLabel(value: string | Date, clock: number, locale = "en") {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const t = i18n.getFixedT(locale);
  const elapsed = Math.max(0, clock - timestamp);
  if (elapsed < 60_000) return t("agentEdition.justNow");
  if (elapsed < 3_600_000) return t("taskDisplay.time.minutes", { count: Math.floor(elapsed / 60_000) });
  if (elapsed < 86_400_000) return t("taskDisplay.time.hours", { count: Math.floor(elapsed / 3_600_000) });
  if (elapsed < 604_800_000) return t("taskDisplay.time.days", { count: Math.floor(elapsed / 86_400_000) });
  return new Date(value).toLocaleDateString(locale, { month: "short", day: "numeric", ...(new Date(value).getFullYear() !== new Date(clock).getFullYear() ? { year: "numeric" as const } : {}) });
}
export function CoordinatorRelativeTime({ value, className }: { value: string | Date; className?: string }) {
  const clock = useCoordinatorRelativeClock();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const label = coordinatorRelativeLabel(value, clock, locale);
  if (!label) return null;
  const date = new Date(value);
  const exact = date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "long" });
  return <time dateTime={date.toISOString()} title={exact} aria-label={exact} tabIndex={0} className={className}>{label}</time>;
}
