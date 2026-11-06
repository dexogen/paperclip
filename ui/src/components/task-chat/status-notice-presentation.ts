import { i18n } from "@/i18n";
import type { TFunction } from "i18next";
import { AlertCircle, AlertTriangle, ArrowRightLeft, Check, Info, Layers, Loader2, RotateCw, TerminalSquare } from "lucide-react";
import type { TaskChatProviderActivityItem } from "./task-chat-model";
import type { ToolIcon } from "./tool-taxonomy";

/**
 * Provider status notices are harness lifecycle reports (context compaction,
 * retries, model fallback, informational banners). They render as inline
 * chips between the turn's activity and never as part of the answer.
 *
 * The runner sets the category; the UI never classifies by message text.
 */
export const STATUS_NOTICE_CATEGORIES = [
  "context_compaction",
  "provider_retry",
  "model_fallback",
  "provider_informational",
  "local_command_output",
] as const;
export type StatusNoticeCategory = (typeof STATUS_NOTICE_CATEGORIES)[number];

export type StatusNoticeTone = "neutral" | "progress" | "warning" | "danger";

export interface StatusNoticePresentation {
  category: StatusNoticeCategory | "provider_error";
  icon: ToolIcon;
  tone: StatusNoticeTone;
  /** The short chip label, such as "Compacting context". */
  label: string;
  /** Provider text shown after the label, such as the retry reason. */
  detail?: string;
  /** True while the notice describes something still happening. */
  active: boolean;
  /** A fatal provider error renders as a full row, not a chip. */
  fatal: boolean;
}

function detail(item: TaskChatProviderActivityItem, label: string): string | undefined {
  return item.details.find((entry) => entry.label === label)?.value;
}

export function statusNoticeCategory(item: TaskChatProviderActivityItem): StatusNoticeCategory | null {
  if (item.family !== "provider_notice") return null;
  const category = detail(item, "Category");
  return (STATUS_NOTICE_CATEGORIES as readonly string[]).includes(category ?? "")
    ? category as StatusNoticeCategory
    : null;
}

/** A turn-scoped provider error that will not be retried. */
export function isFatalProviderError(item: TaskChatProviderActivityItem): boolean {
  return item.family === "provider_notice"
    && detail(item, "Category") === "error"
    && detail(item, "Severity") === "error"
    && !["true", "Yes"].includes(detail(item, "Recoverable") ?? "");
}

/**
 * The canonical notice payload a status chip renders: a runner-classified
 * status category, or a turn-scoped provider error that will not be retried.
 * Generic Codex warnings keep their run-log-only treatment.
 */
export function isStatusNoticePayload(payload: Record<string, unknown>): boolean {
  if ((STATUS_NOTICE_CATEGORIES as readonly string[]).includes(String(payload.category))) return true;
  return payload.category === "error" && payload.severity === "error" && payload.recoverable !== true && payload.scope === "turn";
}

export function isStatusNotice(item: TaskChatProviderActivityItem): boolean {
  return statusNoticeCategory(item) !== null || isFatalProviderError(item);
}

function summary(item: TaskChatProviderActivityItem): string | undefined {
  return item.summary?.trim() || detail(item, "Summary")?.trim() || undefined;
}

function retryLabel(item: TaskChatProviderActivityItem, t: TFunction): string {
  switch (detail(item, "Reason")) {
    case "serverOverloaded": return t("runtimeUpdates.retryOverload");
    case "responseStreamDisconnected":
    case "responseStreamConnectionFailed":
    case "transport_lost": return t("runtimeUpdates.reconnecting");
    case "httpConnectionFailed": return t("runtimeUpdates.retryConnection");
    case "rate_limit": return t("runtimeUpdates.retryRateLimit");
    default: return t("runtimeUpdates.retrying");
  }
}

function attemptSuffix(item: TaskChatProviderActivityItem, t: TFunction): string {
  const attempt = detail(item, "Attempt");
  const max = detail(item, "Max attempts");
  if (!attempt) return "";
  return max ? t("runtimeUpdates.attemptOf", { attempt, max }) : t("runtimeUpdates.attempt", { attempt });
}

export function statusNoticePresentation(
  item: TaskChatProviderActivityItem,
  options: { resolved?: boolean } = {},
  t: TFunction = i18n.getFixedT("en"),
): StatusNoticePresentation | null {
  if (isFatalProviderError(item)) {
    return {
      category: "provider_error",
      icon: AlertCircle,
      tone: "danger",
      label: t("runUi.activity.notice.failed"),
      detail: summary(item) ?? t("runtimeUpdates.providerErrorWithoutMessage"),
      active: false,
      fatal: true,
    };
  }
  const category = statusNoticeCategory(item);
  if (!category) return null;
  const phase = detail(item, "Phase");
  switch (category) {
    case "context_compaction":
      if (phase === "failed") {
        return { category, icon: AlertTriangle, tone: "warning", label: t("runUi.activity.context.failed"), detail: summary(item), active: false, fatal: false };
      }
      if (phase === "running" && item.status === "interrupted") {
        return { category, icon: Layers, tone: "neutral", label: t("interfaceUpdates.compaction_stopped_98342f72"), active: false, fatal: false };
      }
      return phase === "running"
        ? { category, icon: Loader2, tone: "progress", label: t("runUi.activity.context.running"), active: true, fatal: false }
        : { category, icon: Layers, tone: "neutral", label: t("interfaceUpdates.context_compacted_99ca2ce2"), active: false, fatal: false };
    case "provider_retry":
      if (!options.resolved && item.status === "interrupted") {
        return { category, icon: AlertTriangle, tone: "neutral", label: t("interfaceUpdates.retry_stopped_3716dca3"), detail: summary(item), active: false, fatal: false };
      }
      return options.resolved
        ? { category, icon: Check, tone: "neutral", label: t("interfaceUpdates.recovered_after_retry_b6983aef"), detail: summary(item), active: false, fatal: false }
        : { category, icon: RotateCw, tone: "warning", label: t("interfaceUpdates.valuevalue_ae6ed6c2", { value1: (retryLabel(item, t)), value2: (attemptSuffix(item, t)) }), detail: summary(item), active: true, fatal: false };
    case "model_fallback": {
      const model = detail(item, "Fallback model");
      const reason = detail(item, "Reason");
      return {
        category,
        icon: ArrowRightLeft,
        tone: "warning",
        label: model ? t("interfaceUpdates.fell_back_to_value_00e83273", { value1: (model) }) : t("interfaceUpdates.fell_back_to_another_model_a9b8bf36"),
        detail: reason ?? summary(item),
        active: false,
        fatal: false,
      };
    }
    case "provider_informational": {
      const severity = detail(item, "Severity");
      return {
        category,
        icon: severity === "info" ? Info : AlertTriangle,
        tone: severity === "error" ? "danger" : severity === "warning" ? "warning" : "neutral",
        label: severity === "error" ? t("runUi.activity.notice.failed") : severity === "warning" ? t("interfaceUpdates.provider_warning_a6d109fa") : t("runUi.protocol.update"),
        detail: summary(item),
        active: false,
        fatal: false,
      };
    }
    case "local_command_output":
      return { category, icon: TerminalSquare, tone: "neutral", label: t("interfaceUpdates.command_output_ff7a52bf"), detail: summary(item), active: false, fatal: false };
  }
}
