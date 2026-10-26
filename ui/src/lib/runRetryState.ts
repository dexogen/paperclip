import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { formatDateTime } from "./utils";

type RetryAwareRun = {
  status: string;
  retryOfRunId?: string | null;
  scheduledRetryAt?: string | Date | null;
  scheduledRetryAttempt?: number | null;
  scheduledRetryReason?: string | null;
  retryExhaustedReason?: string | null;
};

export type RunRetryStateSummary = {
  kind: "scheduled" | "exhausted" | "attempted";
  badgeLabel: string;
  tone: string;
  detail: string | null;
  secondary: string | null;
  retryOfRunId: string | null;
};

function retryReasonLabels(t: TFunction): Record<string, string> {
  return {
    native_provider_overloaded: t("taskProperties.retryReasons.modelCapacity"),
    ai_connection_pool_wait: t("taskProperties.retryReasons.poolWait"),
    transient_failure: t("taskProperties.retryReasons.transient"),
    missing_issue_comment: t("taskProperties.retryReasons.missingComment"),
    process_lost: t("taskProperties.retryReasons.processLost"),
    assignment_recovery: t("taskProperties.retryReasons.assignmentRecovery"),
    issue_continuation_needed: t("taskProperties.retryReasons.continuationNeeded"),
    max_turns_continuation: t("taskProperties.retryReasons.maxTurn"),
  };
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function joinFragments(parts: Array<string | null>) {
  const filtered = parts.filter((part): part is string => Boolean(part));
  return filtered.length > 0 ? filtered.join(" · ") : null;
}

export function formatRetryReason(reason: string | null | undefined, t: TFunction = i18n.getFixedT("en")) {
  const normalized = readNonEmptyString(reason);
  if (!normalized) return null;
  return retryReasonLabels(t)[normalized] ?? normalized.replace(/_/g, " ");
}

export function describeRunRetryState(run: RetryAwareRun, t: TFunction = i18n.getFixedT("en")): RunRetryStateSummary | null {
  const attempt =
    typeof run.scheduledRetryAttempt === "number" && Number.isFinite(run.scheduledRetryAttempt) && run.scheduledRetryAttempt > 0
      ? run.scheduledRetryAttempt
      : null;
  const attemptLabel = attempt ? t("runUi.ledger.retry.attempt", { attempt }) : null;
  const reasonLabel = formatRetryReason(run.scheduledRetryReason, t);
  const retryOfRunId = readNonEmptyString(run.retryOfRunId);
  const exhaustedReason = readNonEmptyString(run.retryExhaustedReason);
  const dueAt = run.scheduledRetryAt ? formatDateTime(run.scheduledRetryAt) : null;
  const isMaxTurnContinuation = run.scheduledRetryReason === "max_turns_continuation";
  const hasRetryMetadata =
    Boolean(retryOfRunId)
    || Boolean(reasonLabel)
    || Boolean(dueAt)
    || Boolean(attemptLabel)
    || Boolean(exhaustedReason);

  if (!hasRetryMetadata) return null;

  if (run.status === "scheduled_retry") {
    return {
      kind: "scheduled",
      badgeLabel: run.scheduledRetryReason === "ai_connection_pool_wait" ? t("runUi.ledger.retry.poolExhausted") : isMaxTurnContinuation ? t("runUi.ledger.retry.continuationScheduled") : t("runUi.ledger.retry.scheduled"),
      tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      detail: joinFragments([attemptLabel, reasonLabel]),
      secondary: dueAt
        ? isMaxTurnContinuation ? t("runUi.ledger.retry.nextContinuation", { date: dueAt }) : t("runUi.ledger.retry.nextRetry", { date: dueAt })
        : isMaxTurnContinuation ? t("runUi.ledger.retry.continuationPending") : t("runUi.ledger.retry.pending"),
      retryOfRunId,
    };
  }

  if (exhaustedReason) {
    return {
      kind: "exhausted",
      badgeLabel: isMaxTurnContinuation ? t("runUi.ledger.retry.continuationExhausted") : t("runUi.ledger.retry.exhausted"),
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      detail: joinFragments([attemptLabel, reasonLabel, t("runUi.ledger.retry.automaticExhausted")]),
      secondary: exhaustedReason.includes("Manual intervention required")
        ? exhaustedReason
        : t("runUi.ledger.retry.manualIntervention", { reason: exhaustedReason }),
      retryOfRunId,
    };
  }

  return {
    kind: "attempted",
    badgeLabel: isMaxTurnContinuation ? t("runUi.ledger.retry.continuedRun") : t("runUi.ledger.retry.retriedRun"),
    tone: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    detail: joinFragments([attemptLabel, reasonLabel]),
    secondary: null,
    retryOfRunId,
  };
}
