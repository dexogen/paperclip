import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActivityEvent, Issue, Agent, ProviderTraceMetadata } from "@paperclipai/shared";
import {
  isResponsibleUserDenialCode,
} from "@paperclipai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { accessApi, type CurrentBoardAccess } from "../api/access";
import {
  activityApi,
  type RunForIssue,
  type RunLivenessState,
} from "../api/activity";
import { ApiError } from "../api/client";
import {
  heartbeatsApi,
  type ActiveRunForIssue,
  type LiveRunForIssue,
  type WatchdogDecisionInput,
} from "../api/heartbeats";
import { useToastActions } from "../context/ToastContext";
import { cn, relativeTime } from "../lib/utils";
import type { TFunction } from "i18next";
import { Trans, useTranslation } from "@/i18n";
import { statusLabel } from "@/i18n/ui-labels";
import { queryKeys } from "../lib/queryKeys";
import { keepPreviousDataForSameQueryTail } from "../lib/query-placeholder-data";
import { describeRunRetryState } from "../lib/runRetryState";
import { readSourceResolvedWatchdogFold } from "../lib/source-resolved-watchdog-fold";
import { SourceResolvedFoldBadge } from "./SourceResolvedFoldBadge";
import { ResponsibleUserDenialNotice } from "./ResponsibleUserDenialNotice";
import { RunnerInspector } from "./RunnerInspector";
import { agentsApi } from "../api/agents";
import {
  ProviderTraceStatusBadge,
  runRequestedProviderTrace,
} from "./ProviderTraceStatusBadge";

type IssueRunLedgerProps = {
  issueId: string;
  companyId: string;
  issueStatus: Issue["status"];
  childIssues: Issue[];
  agentMap: ReadonlyMap<string, Agent>;
  hasLiveRuns: boolean;
  activityEvents?: ActivityEvent[];
  renderActivityEvent?: (event: ActivityEvent) => ReactNode;
  resolveUserLabel?: (userId: string) => string | null | undefined;
};

type IssueRunLedgerContentProps = {
  runs: RunForIssue[];
  liveRuns?: LiveRunForIssue[];
  activeRun?: ActiveRunForIssue | null;
  issueStatus: Issue["status"];
  childIssues: Issue[];
  agentMap: ReadonlyMap<string, Pick<Agent, "name">>;
  activityEvents?: ActivityEvent[];
  renderActivityEvent?: (event: ActivityEvent) => ReactNode;
  resolveUserLabel?: (userId: string) => string | null | undefined;
  pendingWatchdogDecision?: WatchdogDecisionInput["decision"] | null;
  canRecordWatchdogDecisions?: boolean;
  watchdogDecisionError?: string | null;
  onWatchdogDecision?: (input: WatchdogDecisionInput) => void;
  onRerunWithTrace?: (run: RunForIssue) => void;
  providerTraceMetadata?: ReadonlyMap<string, ProviderTraceMetadata>;
};

type LedgerRun = RunForIssue & {
  isLive?: boolean;
  agentName?: string;
  outputSilence?: ActiveRunForIssue["outputSilence"];
};

type LedgerFeedItem =
  | {
      kind: "run";
      id: string;
      timestamp: string;
      run: LedgerRun;
    }
  | {
      kind: "activity";
      id: string;
      timestamp: string;
      event: ActivityEvent;
    };

type LivenessCopy = {
  label: string;
  tone: string;
  description: string;
};

function livenessCopy(t: TFunction): Record<RunLivenessState, LivenessCopy> { return {
  completed: {
    label: t("runUi.ledger.completed"),
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description: t("runUi.ledger.completedHint"),
  },
  advanced: {
    label: t("runUi.ledger.advanced"),
    tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    description: t("runUi.ledger.advancedHint"),
  },
  plan_only: {
    label: t("runUi.ledger.planOnly"),
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    description: t("runUi.ledger.planOnlyHint"),
  },
  empty_response: {
    label: t("runUi.ledger.empty"),
    tone: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    description: t("runUi.ledger.emptyHint"),
  },
  blocked: {
    label: t("runUi.ledger.blocked"),
    tone: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    description: t("runUi.ledger.blockedHint"),
  },
  failed: {
    label: t("runUi.ledger.failed"),
    tone: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    description: t("runUi.ledger.failedHint"),
  },
  needs_followup: {
    label: t("runUi.ledger.followup"),
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    description:
      t("runUi.ledger.followupHint"),
  },
}; }

const PENDING_LIVENESS_COPY = (t: TFunction): LivenessCopy => ({
  label: t("runUi.ledger.afterFinish"),
  tone: "border-border bg-background text-muted-foreground",
  description: t("runUi.ledger.afterFinishHint"),
});

const RETRY_PENDING_LIVENESS_COPY = (t: TFunction): LivenessCopy => ({
  label: t("runUi.ledger.retryPending"),
  tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  description: t("runUi.ledger.retryPendingHint"),
});

const MISSING_LIVENESS_COPY = (t: TFunction): LivenessCopy => ({
  label: t("runUi.ledger.noLiveness"),
  tone: "border-border bg-background text-muted-foreground",
  description: t("runUi.ledger.noLivenessHint"),
});

const TERMINAL_CHILD_STATUSES = new Set<Issue["status"]>(["done", "cancelled"]);
const ACTIVE_RUN_STATUSES = new Set(["queued", "running"]);

type RunOutputSilenceLevel = NonNullable<
  ActiveRunForIssue["outputSilence"]
>["level"];

type RunOutputSilenceCopy = {
  label: string;
  tone: string;
};

function outputSilenceCopy(t: TFunction): Partial<Record<RunOutputSilenceLevel, RunOutputSilenceCopy>> { return {
  suspicious: {
    label: t("runUi.ledger.silence"),
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  critical: {
    label: t("runUi.ledger.criticalSilence"),
    tone: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  snoozed: {
    label: t("runUi.ledger.silenceSnoozed"),
    tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
}; }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDuration(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  t: TFunction,
) {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const totalSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (totalSeconds < 60) return t("runUi.ledger.seconds", { seconds: totalSeconds });
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60)
    return seconds > 0 ? t("runUi.ledger.minutesSeconds", { minutes, seconds }) : t("runUi.ledger.minutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? t("runUi.ledger.hoursMinutes", { hours, minutes: remainingMinutes }) : t("runUi.ledger.hours", { hours });
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function liveRunToLedgerRun(
  run: LiveRunForIssue | ActiveRunForIssue,
): LedgerRun {
  return {
    runId: run.id,
    status: run.status,
    agentId: run.agentId,
    agentName: run.agentName,
    adapterType: run.adapterType,
    startedAt: toIsoString(run.startedAt),
    finishedAt: toIsoString(run.finishedAt),
    createdAt: toIsoString(run.createdAt) ?? new Date().toISOString(),
    invocationSource: run.invocationSource,
    usageJson: null,
    resultJson: null,
    isLive: run.status === "queued" || run.status === "running",
    outputSilence: run.outputSilence,
  };
}

function mergeRuns(
  runs: RunForIssue[],
  liveRuns: LiveRunForIssue[] | undefined,
  activeRun: ActiveRunForIssue | null | undefined,
) {
  const byId = new Map<string, LedgerRun>();
  for (const run of runs) byId.set(run.runId, run);
  for (const run of liveRuns ?? []) {
    const existing = byId.get(run.id);
    byId.set(
      run.id,
      existing
        ? {
            ...existing,
            isLive: true,
            agentName: run.agentName,
            outputSilence: run.outputSilence,
          }
        : liveRunToLedgerRun(run),
    );
  }
  if (activeRun) {
    const existing = byId.get(activeRun.id);
    if (existing) {
      byId.set(activeRun.id, {
        ...existing,
        isLive: isActiveRun(existing) || isActiveRun(activeRun),
        agentName: activeRun.agentName,
        outputSilence: activeRun.outputSilence,
      });
    } else {
      byId.set(activeRun.id, liveRunToLedgerRun(activeRun));
    }
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.startedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.startedAt ?? b.createdAt).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return b.runId.localeCompare(a.runId);
  });
}

function isActiveRun(run: Pick<LedgerRun, "status" | "isLive">) {
  return run.isLive || ACTIVE_RUN_STATUSES.has(run.status);
}

function runSummary(
  run: LedgerRun,
  agentMap: ReadonlyMap<string, Pick<Agent, "name">>,
  t: TFunction,
) {
  const agentName = compactAgentName(run, agentMap);
  if (run.status === "running") return t("runUi.ledger.runningBy", { agent: agentName });
  if (run.status === "queued") return t("runUi.ledger.queuedFor", { agent: agentName });
  if (run.status === "scheduled_retry")
    return t("runUi.ledger.retryFor", { agent: agentName });
  return t("runUi.ledger.statusBy", { status: statusLabel(run.status), agent: agentName });
}

function livenessCopyForRun(run: LedgerRun, t: TFunction) {
  if (run.status === "scheduled_retry") return RETRY_PENDING_LIVENESS_COPY(t);
  if (run.livenessState) return livenessCopy(t)[run.livenessState];
  return isActiveRun(run) ? PENDING_LIVENESS_COPY(t) : MISSING_LIVENESS_COPY(t);
}

function stopReasonLabel(run: RunForIssue, t: TFunction) {
  const result = asRecord(run.resultJson);
  const stopReason = readString(result?.stopReason);
  const timeoutFired = result?.timeoutFired === true;
  const effectiveTimeoutSec = readNumber(result?.effectiveTimeoutSec);
  const timeoutText =
    effectiveTimeoutSec && effectiveTimeoutSec > 0
      ? t("runUi.ledger.timeoutDuration", { seconds: effectiveTimeoutSec })
      : null;

  if (timeoutFired || stopReason === "timeout") {
    return timeoutText ? t("runUi.ledger.timeoutDetail", { detail: timeoutText }) : t("runUi.ledger.timeout");
  }
  if (
    stopReason === "max_turns_exhausted" ||
    stopReason === "turn_limit_exhausted"
  )
    return t("runUi.ledger.maxTurns");
  if (stopReason === "budget_paused") return t("runUi.ledger.budgetPaused");
  if (stopReason === "cancelled") return t("runUi.ledger.cancelled");
  if (stopReason === "paused") return t("runUi.ledger.boardPaused");
  if (stopReason === "process_lost") return t("runUi.ledger.processLost");
  if (stopReason === "unmanaged_background_task_stopped")
    return t("runUi.ledger.backgroundStopped");
  if (stopReason === "adapter_failed") return t("runUi.ledger.adapterFailed");
  if (stopReason === "completed")
    return timeoutText ? t("runUi.ledger.completedDetail", { detail: timeoutText }) : t("runUi.ledger.stopCompleted");
  return timeoutText;
}

function stopStatusLabel(run: LedgerRun, stopReason: string | null, t: TFunction) {
  if (stopReason) return stopReason;
  if (run.status === "scheduled_retry") return t("runUi.ledger.retryPending");
  if (run.status === "queued") return t("runUi.ledger.waitingStart");
  if (run.status === "running") return t("runUi.ledger.stillRunning");
  if (!run.livenessState) return t("runUi.ledger.unavailable");
  return t("runUi.ledger.noStopReason");
}

function lastUsefulActionLabel(run: LedgerRun, t: TFunction) {
  if (run.status === "scheduled_retry") return t("runUi.ledger.waitingAttempt");
  if (run.lastUsefulActionAt) return relativeTime(run.lastUsefulActionAt);
  if (isActiveRun(run)) return t("runUi.ledger.noActionYet");
  if (
    run.livenessState === "plan_only" ||
    run.livenessState === "needs_followup"
  ) {
    return t("runUi.ledger.noConcreteAction");
  }
  if (run.livenessState === "empty_response") return t("runUi.ledger.noUsefulOutput");
  if (!run.livenessState) return t("runUi.ledger.unavailable");
  return t("runUi.ledger.noneRecorded");
}

function continuationLabel(run: LedgerRun, t: TFunction) {
  if (!run.continuationAttempt || run.continuationAttempt <= 0) return null;
  return t("runUi.ledger.continuationAttempt", { attempt: run.continuationAttempt });
}

function hasExhaustedContinuation(run: RunForIssue) {
  return /continuation attempts exhausted/i.test(run.livenessReason ?? "");
}

function childIssueSummary(childIssues: Issue[]) {
  const active = childIssues.filter(
    (issue) => !TERMINAL_CHILD_STATUSES.has(issue.status),
  );
  const done = childIssues.filter((issue) => issue.status === "done").length;
  const cancelled = childIssues.filter(
    (issue) => issue.status === "cancelled",
  ).length;
  return { active, done, cancelled, total: childIssues.length };
}

function compactAgentName(
  run: LedgerRun,
  agentMap: ReadonlyMap<string, Pick<Agent, "name">>,
) {
  return (
    run.agentName ?? agentMap.get(run.agentId)?.name ?? run.agentId.slice(0, 8)
  );
}

function formatSilenceAge(ms: number | null | undefined, t: TFunction) {
  if (!ms || ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return t("runUi.ledger.underMinute");
  if (totalMinutes < 60)
    return t("runUi.ledger.silenceMinutes", { count: totalMinutes });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return t("runUi.ledger.silenceHours", { count: hours });
  return t("runUi.ledger.hoursMinutes", { hours, minutes });
}

function canBoardRecordWatchdogDecision(
  companyId: string,
  boardAccess: CurrentBoardAccess | undefined,
) {
  if (!boardAccess) return false;
  if (boardAccess.source === "local_implicit" || boardAccess.isInstanceAdmin)
    return true;

  const membership = boardAccess.memberships?.find(
    (item) => item.companyId === companyId && item.status === "active",
  );
  if (!membership)
    return (
      boardAccess.companyIds.includes(companyId) && !boardAccess.memberships
    );
  return (
    membership.membershipRole !== "viewer" && membership.membershipRole !== null
  );
}

function watchdogDecisionErrorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiError && error.status === 403) {
    return t("runUi.ledger.decisionForbidden");
  }
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : t("runUi.ledger.decisionFailed");
}

class TraceRerunSkippedError extends Error {
  constructor() { super("Trace re-run was skipped."); }
}

export function IssueRunLedger({
  issueId,
  companyId,
  issueStatus,
  childIssues,
  agentMap,
  hasLiveRuns,
  activityEvents,
  renderActivityEvent,
  resolveUserLabel,
}: IssueRunLedgerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const [watchdogDecisionError, setWatchdogDecisionError] = useState<
    { cause: unknown } | null
  >(null);
  const { data: boardAccess } = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: () => accessApi.getCurrentBoardAccess(),
    retry: false,
  });
  const { data: runs } = useQuery({
    queryKey: queryKeys.issues.runs(issueId),
    queryFn: () => activityApi.runsForIssue(issueId),
    refetchInterval:
      hasLiveRuns || issueStatus === "in_progress" ? 5000 : false,
    placeholderData: keepPreviousDataForSameQueryTail<RunForIssue[]>(issueId),
  });
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.issues.liveRuns(issueId),
    queryFn: () => heartbeatsApi.liveRunsForIssue(issueId),
    enabled: hasLiveRuns,
    refetchInterval: 3000,
    placeholderData:
      keepPreviousDataForSameQueryTail<LiveRunForIssue[]>(issueId),
  });
  const { data: activeRun = null } = useQuery({
    queryKey: queryKeys.issues.activeRun(issueId),
    queryFn: () => heartbeatsApi.activeRunForIssue(issueId),
    enabled: hasLiveRuns || issueStatus === "in_progress",
    refetchInterval: hasLiveRuns ? false : 3000,
    placeholderData: keepPreviousDataForSameQueryTail<ActiveRunForIssue | null>(
      issueId,
    ),
  });
  const traceRunIds = useMemo(
    () => (runs ?? []).slice(0, 100).map((run) => run.runId),
    [runs],
  );
  const canInspectProviderTrace =
    boardAccess?.source === "local_implicit" || boardAccess?.isInstanceAdmin === true;
  const { data: providerTraceRows } = useQuery({
    queryKey: queryKeys.providerTraceMetadata(companyId, traceRunIds),
    queryFn: () => heartbeatsApi.providerTraceMetadata(companyId, traceRunIds),
    enabled: canInspectProviderTrace && traceRunIds.length > 0,
    retry: false,
  });
  const providerTraceMetadata = useMemo(
    () => new Map((providerTraceRows ?? []).map((trace) => [trace.runId, trace])),
    [providerTraceRows],
  );
  const watchdogDecision = useMutation({
    mutationFn: (input: WatchdogDecisionInput) =>
      heartbeatsApi.recordWatchdogDecision(input),
    onMutate: () => {
      setWatchdogDecisionError(null);
    },
    onSuccess: () => {
      setWatchdogDecisionError(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.issues.activeRun(issueId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.issues.liveRuns(issueId),
      });
    },
    onError: (error) => {
      const message = watchdogDecisionErrorMessage(error, t);
      const dedupeSuffix =
        error instanceof ApiError ? String(error.status) : "error";
      setWatchdogDecisionError({ cause: error });
      pushToast({
        title: t("runUi.ledger.decisionNotRecorded"),
        body: message,
        tone: "error",
        dedupeKey: `watchdog-decision:${issueId}:${dedupeSuffix}`,
      });
    },
  });
  const rerunWithTrace = useMutation({
    mutationFn: async (run: RunForIssue) => {
      const context = asRecord(run.contextSnapshot);
      const payload: Record<string, unknown> = {};
      for (const key of ["issueId", "taskId", "taskKey"] as const) {
        const value = readString(context?.[key]);
        if (value) payload[key] = value;
      }
      const result = await agentsApi.wakeup(
        run.agentId,
        {
          source: "on_demand",
          triggerDetail: "manual",
          reason: "rerun_with_provider_trace",
          payload,
          debug: { providerTrace: "raw" },
        },
        companyId,
      );
      if (!("id" in result))
        throw result.message == null ? new TraceRerunSkippedError() : new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.issues.runs(issueId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.issues.liveRuns(issueId),
      });
    },
    onError: (error) =>
      pushToast({
        title: t("runUi.ledger.traceNotStarted"),
        body:
          error instanceof TraceRerunSkippedError
            ? t("runUi.ledger.traceSkipped")
            : error instanceof Error
            ? error.message
            : t("runUi.ledger.traceFailed"),
        tone: "error",
        dedupeKey: `provider-trace-rerun:${issueId}`,
      }),
  });

  return (
    <IssueRunLedgerContent
      runs={runs ?? []}
      liveRuns={liveRuns}
      activeRun={activeRun}
      issueStatus={issueStatus}
      childIssues={childIssues}
      agentMap={agentMap}
      activityEvents={activityEvents}
      renderActivityEvent={renderActivityEvent}
      resolveUserLabel={resolveUserLabel}
      pendingWatchdogDecision={watchdogDecision.variables?.decision ?? null}
      canRecordWatchdogDecisions={canBoardRecordWatchdogDecision(
        companyId,
        boardAccess,
      )}
      watchdogDecisionError={watchdogDecisionError ? watchdogDecisionErrorMessage(watchdogDecisionError.cause, t) : null}
      onWatchdogDecision={(input) => watchdogDecision.mutate(input)}
      onRerunWithTrace={
        canInspectProviderTrace
          ? (run) => rerunWithTrace.mutate(run)
          : undefined
      }
      providerTraceMetadata={providerTraceMetadata}
    />
  );
}

export function IssueRunLedgerContent({
  runs,
  liveRuns,
  activeRun,
  issueStatus,
  childIssues,
  agentMap,
  activityEvents,
  renderActivityEvent,
  resolveUserLabel,
  pendingWatchdogDecision,
  canRecordWatchdogDecisions = true,
  watchdogDecisionError,
  onWatchdogDecision,
  onRerunWithTrace,
  providerTraceMetadata = new Map(),
}: IssueRunLedgerContentProps) {
  const { t } = useTranslation();
  const silenceCopy = outputSilenceCopy(t);
  const [inspectedRun, setInspectedRun] = useState<LedgerRun | null>(null);
  const ledgerRuns = useMemo(
    () => mergeRuns(runs, liveRuns, activeRun),
    [activeRun, liveRuns, runs],
  );
  useEffect(() => {
    if (inspectedRun || typeof window === "undefined") return;
    const requestedRunId = new URLSearchParams(window.location.search).get("inspectRun");
    if (!requestedRunId) return;
    const requestedRun = ledgerRuns.find((run) => run.runId === requestedRunId);
    if (requestedRun) setInspectedRun(requestedRun);
  }, [inspectedRun, ledgerRuns]);
  const latestRun = ledgerRuns[0] ?? null;
  const latestSilentRun = useMemo(
    () =>
      ledgerRuns.find(
        (run) =>
          isActiveRun(run) &&
          (run.outputSilence?.level === "critical" ||
            run.outputSilence?.level === "suspicious"),
      ) ?? null,
    [ledgerRuns],
  );
  const children = childIssueSummary(childIssues);
  const canRenderActivityEvents = Boolean(renderActivityEvent);
  const feedItems = useMemo<LedgerFeedItem[]>(() => {
    const items: LedgerFeedItem[] = [];
    for (const run of ledgerRuns) {
      items.push({
        kind: "run",
        id: run.runId,
        timestamp: run.startedAt ?? run.createdAt,
        run,
      });
    }
    if (canRenderActivityEvents) {
      for (const event of activityEvents ?? []) {
        items.push({
          kind: "activity",
          id: event.id,
          timestamp:
            event.createdAt instanceof Date
              ? event.createdAt.toISOString()
              : String(event.createdAt),
          event,
        });
      }
    }
    return items.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      if (aTime !== bTime) return bTime - aTime;
      if (a.kind !== b.kind) return a.kind === "run" ? -1 : 1;
      return b.id.localeCompare(a.id);
    });
  }, [activityEvents, canRenderActivityEvents, ledgerRuns]);

  return (
    <section className="space-y-3" aria-label={t("runUi.ledger.label")}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("runUi.ledger.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {latestRun
              ? runSummary(latestRun, agentMap, t)
              : issueStatus === "in_progress"
                ? t("runUi.ledger.waitingFirst")
                : t("runUi.ledger.noRuns")}
          </p>
        </div>
        {latestRun ? (
          <Link
            to={`/agents/${latestRun.agentId}/runs/${latestRun.runId}`}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {t("runUi.ledger.latest")}
          </Link>
        ) : null}
      </div>

      {children.total > 0 ? (
        <div className="rounded-md border border-border/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{t("runUi.ledger.children")}</span>
            <span className="text-muted-foreground">
              {children.active.length > 0
                ? t("runUi.ledger.childrenActive", { active: children.active.length, done: children.done, cancelled: children.cancelled })
                : t("runUi.ledger.childrenTerminal", { total: children.total, done: children.done, cancelled: children.cancelled })}
            </span>
          </div>
          {children.active.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {children.active.slice(0, 4).map((child) => (
                <Link
                  key={child.id}
                  to={`/issues/${child.identifier ?? child.id}`}
                  className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-(length:--text-micro) hover:bg-accent/40"
                >
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {child.identifier ?? child.id.slice(0, 8)}
                  </span>
                  <span className="truncate">{child.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {statusLabel(child.status)}
                  </span>
                </Link>
              ))}
              {children.active.length > 4 ? (
                <span className="rounded-md border border-border px-2 py-1 text-(length:--text-micro) text-muted-foreground">
                  {t("runUi.ledger.more", { count: children.active.length - 4 })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {latestSilentRun?.outputSilence ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            latestSilentRun.outputSilence.level === "critical"
              ? "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
          )}
        >
          <p className="font-medium">
            {latestSilentRun.outputSilence.level === "critical"
              ? t("runUi.ledger.criticalWarning")
              : t("runUi.ledger.silenceWarning")}
          </p>
          <p className="mt-1">
            {t("runUi.ledger.silentFor", { duration: formatSilenceAge(latestSilentRun.outputSilence.silenceAgeMs, t) ?? t("runUi.ledger.extendedPeriod") })}
            {latestSilentRun.outputSilence.evaluationIssueIdentifier ? (
              <> {<Trans i18nKey="runUi.ledger.reviewRecovery" values={{ identifier: latestSilentRun.outputSilence.evaluationIssueIdentifier }}
                tOptions={{ interpolation: { escapeValue: true } }} shouldUnescape components={{ task: <Link
                  to={`/issues/${latestSilentRun.outputSilence.evaluationIssueIdentifier}`}
                  className="font-medium underline underline-offset-2" /> }} />}</>
            ) : null}
          </p>
          <p className="mt-1">
            {latestSilentRun.outputSilence.evaluationIssueIdentifier
              ? t("runUi.ledger.informationalDelegation")
              : t("runUi.ledger.informationalTask")}
          </p>
          {onWatchdogDecision && canRecordWatchdogDecisions ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-md border border-border bg-background/80 px-2 py-1 text-(length:--text-micro) text-foreground hover:bg-background"
                onClick={() =>
                  onWatchdogDecision({
                    runId: latestSilentRun.runId,
                    decision: "continue",
                    evaluationIssueId:
                      latestSilentRun.outputSilence?.evaluationIssueId ?? null,
                  })
                }
                disabled={pendingWatchdogDecision != null}
              >
                {t("runUi.ledger.monitor")}
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-background/80 px-2 py-1 text-(length:--text-micro) text-foreground hover:bg-background"
                onClick={() =>
                  onWatchdogDecision({
                    runId: latestSilentRun.runId,
                    decision: "snooze",
                    evaluationIssueId:
                      latestSilentRun.outputSilence?.evaluationIssueId ?? null,
                    snoozedUntil: new Date(
                      Date.now() + 60 * 60 * 1000,
                    ).toISOString(),
                    reason: "Snoozed from issue run ledger",
                  })
                }
                disabled={pendingWatchdogDecision != null}
              >
                {t("runUi.ledger.snooze")}
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-background/80 px-2 py-1 text-(length:--text-micro) text-foreground hover:bg-background"
                onClick={() =>
                  onWatchdogDecision({
                    runId: latestSilentRun.runId,
                    decision: "dismissed_false_positive",
                    evaluationIssueId:
                      latestSilentRun.outputSilence?.evaluationIssueId ?? null,
                    reason: "Dismissed from issue run ledger",
                  })
                }
                disabled={pendingWatchdogDecision != null}
              >
                {t("runUi.ledger.falsePositive")}
              </button>
            </div>
          ) : null}
          {watchdogDecisionError ? (
            <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-(length:--text-micro) text-red-900 dark:text-red-200">
              {watchdogDecisionError}
            </p>
          ) : null}
        </div>
      ) : null}

      {feedItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          {renderActivityEvent
            ? t("runUi.ledger.emptyActivity")
            : t("runUi.ledger.emptyHistory")}
        </div>
      ) : (
        <div className="space-y-1.5">
          {feedItems.slice(0, 20).map((item) => {
            if (item.kind === "activity") {
              return (
                <div key={`activity:${item.id}`}>
                  {renderActivityEvent?.(item.event)}
                </div>
              );
            }
            const run = item.run;
            const liveness = livenessCopyForRun(run, t);
            const stopReason = stopReasonLabel(run, t);
            const duration = formatDuration(run.startedAt, run.finishedAt, t);
            const exhausted = hasExhaustedContinuation(run);
            const continuation = continuationLabel(run, t);
            const retryState = describeRunRetryState(run, t);
            const agentName = compactAgentName(run, agentMap);
            const responsibleName = run.responsibleUserId
              ? resolveUserLabel?.(run.responsibleUserId)?.trim()
              : null;
            const onBehalfOfLabel = run.responsibleUserId
              ? responsibleName || t("runUi.ledger.responsibleUser")
              : null;
            const denialCode = isResponsibleUserDenialCode(run.errorCode)
              ? run.errorCode
              : null;
            const sourceResolvedFold = readSourceResolvedWatchdogFold(
              run.resultJson,
            );
            return (
              <article
                key={`run:${run.runId}`}
                className="space-y-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">{t("runUi.ledger.run")}</span>
                  <Link
                    to={`/agents/${run.agentId}/runs/${run.runId}`}
                    className="min-w-0 max-w-full truncate font-mono text-foreground hover:underline"
                  >
                    {run.runId.slice(0, 8)}
                  </Link>
                  <span>{t("runUi.ledger.byAgent", { agent: agentName })}</span>
                  {onBehalfOfLabel ? (
                    <span
                      data-testid="run-on-behalf-of"
                      className="min-w-0 max-w-full truncate text-muted-foreground"
                      title={responsibleName
                        ? t("runUi.ledger.actingForNamed", { user: responsibleName })
                        : t("runUi.ledger.actingFor", { user: onBehalfOfLabel })}
                    >
                      <Trans i18nKey={responsibleName ? "runUi.ledger.onBehalfOfNamed" : "runUi.ledger.onBehalfOf"} values={{ user: onBehalfOfLabel }} tOptions={{ interpolation: { escapeValue: true } }} shouldUnescape components={{ user: <span className="text-foreground" /> }} />
                    </span>
                  ) : null}
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-(length:--text-micro) capitalize text-muted-foreground">
                    {statusLabel(run.status)}
                  </span>
                  {run.isLive ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-(length:--text-micro) text-blue-700 dark:text-blue-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {t("runUi.ledger.live")}
                    </span>
                  ) : null}
                  <ProviderTraceStatusBadge
                    trace={providerTraceMetadata.get(run.runId)}
                    requested={runRequestedProviderTrace(run.contextSnapshot)}
                    showOff
                  />
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
                      liveness.tone,
                    )}
                    title={liveness.description}
                  >
                    {liveness.label}
                  </span>
                  {exhausted ? (
                    <span className="rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-(length:--text-micro) font-medium text-red-700 dark:text-red-300">
                      {t("runUi.ledger.exhausted")}
                    </span>
                  ) : null}
                  {continuation ? (
                    <span className="text-(length:--text-micro) text-muted-foreground">
                      {continuation}
                    </span>
                  ) : null}
                  {retryState ? (
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
                        retryState.tone,
                      )}
                    >
                      {retryState.badgeLabel}
                    </span>
                  ) : null}
                  {run.outputSilence &&
                  silenceCopy[run.outputSilence.level] ? (
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
                        silenceCopy[run.outputSilence.level]?.tone,
                      )}
                    >
                      {silenceCopy[run.outputSilence.level]?.label}
                    </span>
                  ) : null}
                  {sourceResolvedFold ? <SourceResolvedFoldBadge /> : null}
                  <span className="ml-auto shrink-0">
                    {relativeTime(item.timestamp)}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-border px-1.5 py-0.5 text-(length:--text-micro) text-foreground hover:bg-accent/40"
                    onClick={() => setInspectedRun(run)}
                  >
                    {t("runUi.ledger.inspect")}
                  </button>
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="min-w-0">
                    <span className="text-foreground">{t("runUi.ledger.elapsed")}</span>{" "}
                    {duration ?? t("runUi.ledger.unknown")}
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground">{t("runUi.ledger.lastAction")}</span>{" "}
                    {lastUsefulActionLabel(run, t)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground">{t("runUi.ledger.stop")}</span>{" "}
                    {stopStatusLabel(run, stopReason, t)}
                  </div>
                </div>

                {retryState ? (
                  <div className="rounded-md border border-border/70 bg-accent/20 px-2 py-2 text-xs leading-5 text-muted-foreground">
                    {retryState.detail ? <p>{retryState.detail}</p> : null}
                    {retryState.secondary ? (
                      <p>{retryState.secondary}</p>
                    ) : null}
                    {retryState.retryOfRunId ? (
                      <p>
                        <Trans i18nKey="runUi.ledger.retryOf" values={{ id: retryState.retryOfRunId.slice(0, 8) }} tOptions={{ interpolation: { escapeValue: true } }} shouldUnescape components={{ run: <Link
                          to={`/agents/${run.agentId}/runs/${retryState.retryOfRunId}`}
                          className="font-mono text-foreground hover:underline" /> }} />
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {run.livenessReason ? (
                  <p className="min-w-0 break-words text-xs leading-5 text-muted-foreground">
                    {run.livenessReason}
                  </p>
                ) : null}

                {denialCode ? (
                  <ResponsibleUserDenialNotice
                    code={denialCode}
                    userName={
                      run.responsibleUserId
                        ? resolveUserLabel?.(run.responsibleUserId)
                        : null
                    }
                  />
                ) : null}

                {run.nextAction ? (
                  <div className="min-w-0 rounded-md bg-accent/40 px-2 py-1.5 text-xs leading-5">
                    <span className="font-medium text-foreground">
                      {t("runUi.ledger.nextAction")}
                    </span>
                    <span className="break-words text-muted-foreground">
                      {run.nextAction}
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })}
          {feedItems.length > 20 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t("runUi.ledger.older", { count: feedItems.length - 20 })}
            </div>
          ) : null}
        </div>
      )}
      {inspectedRun ? (
        <RunnerInspector
          runId={inspectedRun.runId}
          run={inspectedRun}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setInspectedRun(null);
          }}
          onRerunWithTrace={
            !["queued", "running"].includes(inspectedRun.status) &&
            onRerunWithTrace
              ? () => onRerunWithTrace(inspectedRun)
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
