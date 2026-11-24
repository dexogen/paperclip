import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { t as fullSharedT, i18n as fullSharedI18n, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import type { Issue, IssueWorkProduct } from "@paperclipai/shared";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { InlineBanner } from "@/components/InlineBanner";
import { IssuePullRequestLinks } from "@/components/IssuePullRequestLinks";
import { getIssuePullRequests, pullRequestNeedsReview } from "@/lib/issue-pull-requests";
import { cn } from "@/lib/utils";
import {
  areAutomaticMonitorChecksPaused,
  canCheckIssueMonitorNow,
  deriveMonitorState,
  formatMonitorAbsolute,
  formatMonitorEta,
  useMonitorCountdown,
  type DerivedMonitorState,
  type MonitorDisplayState,
} from "@/lib/issue-monitor";

/** Matches the `Date | string` inputs accepted by the issue-monitor helpers. */
type MonitorDate = Date | string;

/**
 * States in which the waiting-monitor surfaces (top banner + composer strip)
 * are shown. `cleared` and `none` hide both surfaces entirely — see
 * wireframe 04 (PAP-14557).
 */
const WAITING_STATES: readonly MonitorDisplayState[] = [
  "scheduled",
  "retrying",
  "due-now",
  "overdue",
];

export function isWaitingMonitorState(state: MonitorDisplayState): boolean {
  return WAITING_STATES.includes(state);
}

export function hasVisibleMonitorSurface(issue: Issue): boolean {
  const derived = deriveMonitorState(issue);
  return isWaitingMonitorState(derived.state) && derived.nextCheckAt !== null;
}

export interface MonitorSurfaceCopy {
  /** Prominent lead for the top banner, e.g. "Waiting on monitor — resumes in 2h 12m". */
  bannerTitle: string;
  /** Prominent lead for the composer strip, e.g. "Resumes in 2h 12m". */
  stripTitle: string;
  /** Muted detail line for the banner (absolute time carries a "(your time)" hint). */
  bannerMeta: string[];
  /** Muted detail line for the composer strip. */
  stripMeta: string[];
  /** `warning` (amber) once overdue, `info` (blue) while still on schedule. */
  tone: "info" | "warning";
  workspaceWait?: boolean;
  pullRequestReview?: boolean;
  automaticChecksPaused?: boolean;
  checkUnavailable?: boolean;
  executionWait?: boolean;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

/**
 * Pure copy builder shared by the banner and the composer strip so both
 * surfaces render one consistent copy system (see wireframe 04). Kept free of
 * hooks/`Date.now()` so it is deterministic under test.
 */
export function buildMonitorSurfaceCopy(
  derived: DerivedMonitorState,
  now: MonitorDate,
  scheduledRetryReason?: string | null,
  pendingPullRequestReviews = 0,
  issueStatus?: string,
  hasActiveRun = false,
): MonitorSurfaceCopy | null {
  if (!isWaitingMonitorState(derived.state) || !derived.nextCheckAt) return null;

  if (derived.source === "monitor" && areAutomaticMonitorChecksPaused({ status: issueStatus })) {
    const canCheckNow = canCheckIssueMonitorNow({ status: issueStatus }, derived.serviceName);
    const hint = canCheckNow
      ? fullSharedT("taskChatUi.monitor.taskBlocked")
      : fullSharedT("taskChatUi.monitor.resumeToCheck");
    return {
      bannerTitle: fullSharedT("interfaceUpdates.automatic_checks_paused_03d978cd"),
      stripTitle: fullSharedT("interfaceUpdates.automatic_checks_paused_03d978cd"),
      bannerMeta: [hint],
      stripMeta: [hint],
      tone: "info",
      automaticChecksPaused: true,
      checkUnavailable: !canCheckNow,
    };
  }

  if (derived.source === "scheduled-retry" && scheduledRetryReason === "workspace_busy") {
    return {
      bannerTitle: fullSharedT("taskProperties.fields.waitingForWorkspace"),
      stripTitle: fullSharedT("taskProperties.fields.waitingForWorkspace"),
      bannerMeta: [fullSharedT("runUi.scheduledRetry.workspaceHint")],
      stripMeta: [fullSharedT("taskChatUi.monitor.workspaceAvailable")],
      tone: "info",
      workspaceWait: true,
    };
  }

  const eta = formatMonitorEta(derived.nextCheckAt, now, fullSharedT); // "in 2h 12m" | "due now" | "overdue by 18m"
  const absolute = formatMonitorAbsolute(derived.nextCheckAt, { locale: fullSharedI18n.resolvedLanguage === "ru" ? "ru-RU" : undefined }, now, fullSharedT); // local time, e.g. "Today, 4:08 PM"
  const awaitingPullRequestReview = derived.source === "monitor" && derived.serviceName?.toLowerCase() === "github" && pendingPullRequestReviews > 0;
  if (derived.source === "monitor" && hasActiveRun) {
    const hint = fullSharedT("taskChatUi.monitor.saveFirst");
    return {
      bannerTitle: fullSharedT("taskChatUi.monitor.waitingForRun"),
      stripTitle: fullSharedT("taskChatUi.monitor.waitingForRun"),
      bannerMeta: [hint, fullSharedT("taskChatUi.monitor.scheduledLocal", { time: absolute })],
      stripMeta: [hint, fullSharedT("taskChatUi.monitor.scheduled", { time: absolute })],
      tone: "info",
      executionWait: true,
      checkUnavailable: true,
      pullRequestReview: awaitingPullRequestReview,
    };
  }
  if (awaitingPullRequestReview) {
    return {
      bannerTitle: fullSharedT("taskChatUi.monitor.prReview"),
      stripTitle: fullSharedT("taskChatUi.monitor.prReview"),
      bannerMeta: [fullSharedT("taskChatUi.monitor.prNextLocal", { eta, absolute })],
      stripMeta: [fullSharedT("taskChatUi.monitor.prNext", { eta, absolute })],
      tone: derived.state === "overdue" ? "warning" : "info",
      pullRequestReview: true,
    };
  }
  if (derived.source === "scheduled-retry" && scheduledRetryReason === "ai_connection_pool_wait") {
    return {
      bannerTitle: fullSharedT("runUi.ledger.retry.poolExhausted"),
      stripTitle: fullSharedT("runUi.ledger.retry.poolExhausted"),
      bannerMeta: [fullSharedT("taskChatUi.monitor.usageNextLocal", { eta, absolute }), fullSharedT("taskChatUi.monitor.keepAccountResume")],
      stripMeta: [fullSharedT("taskChatUi.monitor.usageNext", { eta, absolute }), fullSharedT("taskChatUi.monitor.keepAccount")],
      tone: "info",
    };
  }

  const isScheduledRetryOnly = derived.source === "scheduled-retry";

  let bannerTitle: string;
  let stripTitle: string;
  let statusHint: string | null = null;
  switch (derived.state) {
    case "scheduled":
    case "retrying":
      bannerTitle = isScheduledRetryOnly ? fullSharedT("taskChatUi.monitor.agentResumes", { eta }) : fullSharedT("taskChatUi.monitor.monitorResumes", { eta });
      stripTitle = fullSharedT("taskChatUi.monitor.resumes", { eta });
      break;
    case "due-now":
      bannerTitle = isScheduledRetryOnly ? fullSharedT("taskChatUi.monitor.retryDue") : fullSharedT("taskChatUi.monitor.monitorDue");
      stripTitle = fullSharedT("taskChatUi.monitor.due");
      statusHint = fullSharedT("taskChatUi.monitor.soon");
      break;
    case "overdue":
    default:
      bannerTitle = isScheduledRetryOnly ? fullSharedT("taskChatUi.monitor.retryOverdue", { eta }) : fullSharedT("taskChatUi.monitor.monitorOverdue", { eta });
      stripTitle = capitalize(eta);
      statusHint = fullSharedT("taskChatUi.monitor.nextTick");
      break;
  }

  const attemptLabel = derived.attemptCount >= 1 ? fullSharedT("fullShared.attempt_7a5e67", { value1: derived.attemptCount }) : null;
  const serviceLabel = derived.serviceName ? fullSharedT("fullShared.watching_27a2bb", { value1: derived.serviceName }) : null;

  const bannerMeta = [statusHint, fullSharedT("taskChatUi.monitor.yourTime", { absolute }), attemptLabel, serviceLabel].filter(
    (piece): piece is string => Boolean(piece),
  );
  const stripMeta = [statusHint, absolute, attemptLabel, serviceLabel].filter(
    (piece): piece is string => Boolean(piece),
  );

  return {
    bannerTitle,
    stripTitle,
    bannerMeta,
    stripMeta,
    tone: derived.state === "overdue" ? "warning" : "info",
  };
}

function useMonitorSurfaceCopy(issue: Issue, pendingPullRequestReviews: number, hasActiveRun: boolean): MonitorSurfaceCopy | null {
  // `nextCheckAt` is stable for a given issue; derive once to seed the ticking
  // countdown cadence, then re-derive against the live clock so the surfaces
  // roll scheduled → due → overdue on their own.
  const nextCheckAt = useMemo(() => {
    const derived = deriveMonitorState(issue);
    return derived.source === "monitor" && areAutomaticMonitorChecksPaused(issue) ? null : derived.nextCheckAt;
  }, [issue]);
  const now = useMonitorCountdown(nextCheckAt);
  return useMemo(() => buildMonitorSurfaceCopy(deriveMonitorState(issue, now), now, issue.scheduledRetry?.scheduledRetryReason, pendingPullRequestReviews, issue.status, hasActiveRun), [fullSharedI18n.language, issue, now, pendingPullRequestReviews, hasActiveRun]);
}

function CheckNowButton({
  onCheckNow,
  checkingNow,
  reviewRequested = false,
}: {
  onCheckNow: () => void;
  checkingNow: boolean;
  reviewRequested?: boolean;
}) {
  useFullSharedTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 shadow-none"
      onClick={onCheckNow}
      disabled={checkingNow}
    >
      {checkingNow ? fullSharedT("taskProperties.fields.checking") : reviewRequested ? fullSharedT("fullShared.check_status_69cd35") : fullSharedT("taskProperties.fields.checkNow")}
    </Button>
  );
}

function CancelMonitorButton({ onCancel }: { onCancel: () => Promise<unknown> }) {
  useFullSharedTranslation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancel = async () => {
    setPending(true);
    setError(null);
    try {
      await onCancel();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : fullSharedT("fullShared.unable_to_cancel_the_monitor_try_again_1ef410"));
    } finally {
      setPending(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); setError(null); } }}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" aria-label={fullSharedT("fullShared.cancel_monitor_725cf6")} title={fullSharedT("fullShared.cancel_monitor_725cf6")}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fullSharedT("fullShared.cancel_monitor_ed370f")}</AlertDialogTitle>
          <AlertDialogDescription>{fullSharedT("fullShared.this_removes_the_scheduled_monitor_check_the_agent_w_4317d6")}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{fullSharedT("fullShared.keep_monitor_a49861")}</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void cancel()}>{pending ? fullSharedT("agentDetailUi.run.cancelling") : fullSharedT("fullShared.cancel_monitor_725cf6")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface IssueMonitorSurfaceProps {
  issue: Issue;
  hasActiveRun?: boolean;
  onCheckNow?: (() => void) | null;
  checkingNow?: boolean;
  workProducts?: IssueWorkProduct[] | null;
  checkError?: string | null;
  onCancelMonitor?: (() => Promise<unknown>) | null;
}

/**
 * Pinned banner rendered between the issue title and description while a
 * monitor is waiting. Replaces the description-area "Monitor scheduled" card
 * for the waiting state (PAP-14557 decision 1) — the two never render at once.
 */
export function IssueMonitorBanner({
  issue,
  hasActiveRun = false,
  onCheckNow = null,
  checkingNow = false,
  workProducts,
  checkError,
  onCancelMonitor,
}: IssueMonitorSurfaceProps) {
  useFullSharedTranslation();
  const reviews = getIssuePullRequests(workProducts).filter(pullRequestNeedsReview);
  const copy = useMonitorSurfaceCopy(issue, reviews.length, hasActiveRun);
  if (!copy) return null;

  // A busy workspace is a transient system wait the user cannot act on. It stays
  // a quiet status (composer strip, properties row), never a pinned notice.
  if (copy.workspaceWait) return null;

  const canCancel = onCancelMonitor && deriveMonitorState(issue).source === "monitor";

  return (
    <InlineBanner
      tone={copy.tone}
      icon={Clock}
      title={copy.bannerTitle}
      className={cn("relative my-3", canCancel && "pr-12")}
      actions={onCheckNow && !copy.workspaceWait && !copy.checkUnavailable ? <CheckNowButton onCheckNow={onCheckNow} checkingNow={checkingNow} reviewRequested={copy.pullRequestReview} /> : null}
    >
      {canCancel ? <CancelMonitorButton key={issue.id} onCancel={onCancelMonitor} /> : null}
      <div className="flex flex-col gap-2">
        {copy.pullRequestReview ? <IssuePullRequestLinks products={reviews} /> : null}
        <span>{copy.bannerMeta.join("  ·  ")}</span>
        {checkError ? <p role="alert">{checkError}</p> : null}
      </div>
    </InlineBanner>
  );
}

/**
 * Slim, inline (not sticky) strip anchored directly above the reply composer.
 * Mirrors the banner's monitor state and reminds the reader that replying wakes
 * the agent early (PAP-14557 decisions 2 + wireframe 02).
 */
export function IssueMonitorComposerStrip({
  issue,
  hasActiveRun = false,
  onCheckNow = null,
  checkingNow = false,
  workProducts,
  checkError,
  className,
}: IssueMonitorSurfaceProps & { className?: string }) {
  useUiTranslation();
  useFullSharedTranslation();
  const reviews = getIssuePullRequests(workProducts).filter(pullRequestNeedsReview);
  const copy = useMonitorSurfaceCopy(issue, reviews.length, hasActiveRun);
  if (!copy) return null;

  return (
    <div
      role="note"
      data-testid="issue-monitor-composer-strip"
      className={cn("rounded-lg border border-border bg-muted/30 px-3 py-2", className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Clock className={cn("mt-0.5 h-4 w-4 shrink-0", issue.displayStatus === "monitoring" ? "text-(--status-task-icon-monitoring)" : "text-muted-foreground")} aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="text-sm font-medium text-foreground">{copy.stripTitle}</div>
            {copy.pullRequestReview ? <IssuePullRequestLinks products={reviews} /> : null}
            <div className="text-xs text-muted-foreground">{copy.stripMeta.join(" · ")}</div>
          </div>
        </div>
        {onCheckNow && !copy.workspaceWait && !copy.checkUnavailable ? <CheckNowButton onCheckNow={onCheckNow} checkingNow={checkingNow} reviewRequested={copy.pullRequestReview} /> : null}
      </div>
      {!copy.automaticChecksPaused ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {copy.pullRequestReview && copy.executionWait
            ? translateUi("taskChatUi.monitor.reviewDuringSave")
            : copy.pullRequestReview
            ? translateUi("fullShared.review_on_github_then_check_status_to_have_the_agent_138c83")
            : copy.workspaceWait || copy.executionWait
            ? translateUi("fullShared.you_can_keep_sending_instructions_while_the_agent_wa_863825")
            : translateUi("fullShared.sending_a_reply_wakes_the_agent_now_before_the_sched_c39c87")}
        </p>
      ) : null}
      {checkError ? <p role="alert" className="text-sm text-destructive">{checkError}</p> : null}
    </div>
  );
}
