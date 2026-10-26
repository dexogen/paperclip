import { i18n, useTranslation } from "@/i18n";
import type { ProviderTraceMetadata } from "@paperclipai/shared";
import { Bug, CircleOff } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function runRequestedProviderTrace(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (!contextSnapshot) return false;
  const debug = contextSnapshot.debug;
  return (
    typeof debug === "object" &&
    debug !== null &&
    !Array.isArray(debug) &&
    (debug as Record<string, unknown>).providerTrace === "raw"
  );
}

export function ProviderTraceStatusBadge({
  trace,
  requested = false,
  showOff = false,
  className,
}: {
  trace?: ProviderTraceMetadata | null;
  requested?: boolean;
  showOff?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const status = trace?.status;
  const expired = trace
    ? new Date(trace.expiresAt).getTime() <= Date.now()
    : false;
  const state = expired
    ? "expired"
    : status === "capturing"
      ? "capturing"
      : status === "complete"
        ? "complete"
        : status === "incomplete"
          ? "incomplete"
          : status === "truncated"
            ? "truncated"
            : status === "expired"
              ? "expired"
              : status === "deleted"
                ? "deleted"
                : requested
                  ? "requested"
                  : showOff
                    ? "off"
                    : null;
  if (!state) return null;
  const label = state === "expired" ? t("runUi.trace.expired")
    : state === "capturing" ? t("runUi.trace.capturing")
    : state === "complete" ? t("runUi.trace.complete")
    : state === "incomplete" ? t("runUi.trace.incomplete")
    : state === "truncated" ? t("runUi.trace.truncated")
    : state === "deleted" ? t("runUi.trace.deleted")
    : state === "requested" ? t("runUi.trace.requested") : t("runUi.trace.off");
  const warning =
    status === "incomplete" ||
    status === "truncated" ||
    status === "expired" ||
    status === "deleted" ||
    expired;
  const Icon = state === "off" ? CircleOff : Bug;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
        state === "off" || state === "deleted" || state === "expired"
          ? "border-border bg-background text-muted-foreground"
          : warning
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        className,
      )}
      title={
        trace
          ? t("runUi.trace.details", { frames: formatNumber(trace.frameCount), bytes: formatNumber(trace.byteCount), expires: new Date(trace.expiresAt).toLocaleString(i18n.resolvedLanguage === "ru" ? "ru-RU" : "en-US") })
          : requested
            ? t("runUi.trace.requestedHint")
            : t("runUi.trace.offHint")
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
