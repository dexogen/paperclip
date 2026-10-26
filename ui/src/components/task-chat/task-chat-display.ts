import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { toolActivityPresentation } from "./tool-taxonomy";
import type { TaskChatMarkerItem } from "./task-chat-model";

export type RunMarkerLabelMessage = { code: "marker.newSession" | "marker.waitingToResume" | "marker.runtimeMissing" | "marker.modelUnavailable" | "marker.approvalRequired" | "marker.usageLimitReached" | "marker.runCancelled" | "marker.runInterrupted" | "marker.runTimedOut" | "marker.runFailed" | "marker.startingBranchUnavailable" | "marker.workspaceRestoreFailed" | "marker.aiConnectionNeeded" | "marker.stopped" | "marker.couldNotStart" | "marker.runCompleted" | "marker.turnStarted" | "marker.turnCompleted" };

export type RunRetryPresentation = "scheduled" | "available" | "preserved";
export type RunMarkerDetailMessage =
  | { code: "detail.sessionHistory" | "detail.executionWait" | "detail.runtimeMissing" | "detail.approvalRequired" | "detail.usageLimit" | "detail.providerOutputLimit" | "detail.repairStartingBranch" | "detail.connectionPending" | "detail.connectionUnavailable" | "detail.executionReconciliation" | "detail.executionStopped" | "detail.cancelledBeforeResponse" | "detail.noResponse" }
  | { code: "detail.nativeCancelled" | "detail.nativeInterrupted"; afterFinalResponse: boolean }
  | { code: "detail.nativeTimedOut" | "detail.nativeStopped"; afterFinalResponse: boolean; errorCode: string }
  | { code: "detail.modelRejected"; providerError?: string }
  | { code: "detail.legacyFailure"; failure: "providerOutputLimit" | "workspaceSetup" | "runFailed"; retry: RunRetryPresentation; errorCode: string }
  | { code: "detail.workspaceRestore"; savedPlan: boolean; noFinalResponse: boolean; affectedPath?: string };

export type RunMarkerDisplay = { label?: RunMarkerLabelMessage; detail?: RunMarkerDetailMessage };
export type ProviderDetailKey = "action" | "available" | "blocking" | "buffering" | "byteCount" | "category" | "complete" | "decision" | "documentRevision" | "durationMs" | "effectiveModel" | "elapsedDurationMs" | "event" | "exitCode" | "failure" | "fromModel" | "inputClass" | "label" | "mediaType" | "name" | "namespace" | "operation" | "origin" | "outputBytes" | "pattern" | "plannedDurationMs" | "postTokens" | "preTokens" | "progress" | "provider" | "query" | "readOnly" | "reason" | "recoverable" | "reference" | "registered" | "requestedModel" | "revision" | "sameSession" | "scope" | "severity" | "state" | "status" | "summary" | "syncStatus" | "target" | "targetExecutionId" | "title" | "transparentBackground" | "transport" | "url" | "userActionable";
export type RunDisplaySlots = {
  protocolDetailLabel: { code: "providerDetail"; field: ProviderDetailKey };
  protocolDetailValue: { code: "boolean"; value: boolean };
  protocolStepLabel: { code: "planStep" };
  protocolChildStatus: { code: "childUnknown" };
  protocolChildTitle: { code: "subagent" };
  thinkingSummary: { code: "thoughtDuration"; seconds: number };
  usageLabel: { code: "providerSessionTotal" };
  usageDetail: { code: "sessionCumulative" };
  toolName: { code: "tool.unnamed" | "tool.edit" };
  markerLabel: RunMarkerLabelMessage;
  markerDetail: RunMarkerDetailMessage;
  authorName: { code: "author.agent" | "author.board" | "author.you" | "author.user" };
  statusLabel: { code: "status.running" | "status.working" | "status.thinking" | "status.responding" }
    | { code: "status.tool"; toolName?: string };
};

export function formatRunDisplayText<S extends keyof RunDisplaySlots>(
  slot: S, fallback: string, message: RunDisplaySlots[S] | null | undefined, t?: TFunction,
): string;
export function formatRunDisplayText<S extends keyof RunDisplaySlots>(
  slot: S, fallback: string | null | undefined, message: RunDisplaySlots[S] | null | undefined, t?: TFunction,
): string | null | undefined;
export function formatRunDisplayText<S extends keyof RunDisplaySlots>(
  slot: S, fallback: string | null | undefined, message: RunDisplaySlots[S] | null | undefined,
  t: TFunction = i18n.getFixedT("en"),
): string | null | undefined {
  if (fallback == null || !message || typeof message !== "object" || Array.isArray(message)) return fallback;
  const value = message as unknown as Record<string, unknown>;
  switch (value.code) {
    case "providerDetail":
      if (slot !== "protocolDetailLabel") return fallback;
      switch (value.field) {
        case "action": return t("runUi.provider.detail.action", { defaultValue: fallback });
        case "available": return t("runUi.provider.detail.available", { defaultValue: fallback });
        case "blocking": return t("runUi.provider.detail.blocking", { defaultValue: fallback });
        case "buffering": return t("runUi.provider.detail.buffering", { defaultValue: fallback });
        case "byteCount": return t("runUi.provider.detail.byteCount", { defaultValue: fallback });
        case "category": return t("runUi.provider.detail.category", { defaultValue: fallback });
        case "complete": return t("runUi.provider.detail.complete", { defaultValue: fallback });
        case "decision": return t("runUi.provider.detail.decision", { defaultValue: fallback });
        case "documentRevision": return t("runUi.provider.detail.documentRevision", { defaultValue: fallback });
        case "durationMs": return t("runUi.provider.detail.durationMs", { defaultValue: fallback });
        case "effectiveModel": return t("runUi.provider.detail.effectiveModel", { defaultValue: fallback });
        case "elapsedDurationMs": return t("runUi.provider.detail.elapsedDurationMs", { defaultValue: fallback });
        case "event": return t("runUi.provider.detail.event", { defaultValue: fallback });
        case "exitCode": return t("runUi.provider.detail.exitCode", { defaultValue: fallback });
        case "failure": return t("runUi.provider.detail.failure", { defaultValue: fallback });
        case "fromModel": return t("runUi.provider.detail.fromModel", { defaultValue: fallback });
        case "inputClass": return t("runUi.provider.detail.inputClass", { defaultValue: fallback });
        case "label": return t("runUi.provider.detail.label", { defaultValue: fallback });
        case "mediaType": return t("runUi.provider.detail.mediaType", { defaultValue: fallback });
        case "name": return t("runUi.provider.detail.name", { defaultValue: fallback });
        case "namespace": return t("runUi.provider.detail.namespace", { defaultValue: fallback });
        case "operation": return t("runUi.provider.detail.operation", { defaultValue: fallback });
        case "origin": return t("runUi.provider.detail.origin", { defaultValue: fallback });
        case "outputBytes": return t("runUi.provider.detail.outputBytes", { defaultValue: fallback });
        case "pattern": return t("runUi.provider.detail.pattern", { defaultValue: fallback });
        case "plannedDurationMs": return t("runUi.provider.detail.plannedDurationMs", { defaultValue: fallback });
        case "postTokens": return t("runUi.provider.detail.postTokens", { defaultValue: fallback });
        case "preTokens": return t("runUi.provider.detail.preTokens", { defaultValue: fallback });
        case "progress": return t("runUi.provider.detail.progress", { defaultValue: fallback });
        case "provider": return t("runUi.provider.detail.provider", { defaultValue: fallback });
        case "query": return t("runUi.provider.detail.query", { defaultValue: fallback });
        case "readOnly": return t("runUi.provider.detail.readOnly", { defaultValue: fallback });
        case "reason": return t("runUi.provider.detail.reason", { defaultValue: fallback });
        case "recoverable": return t("runUi.provider.detail.recoverable", { defaultValue: fallback });
        case "reference": return t("runUi.provider.detail.reference", { defaultValue: fallback });
        case "registered": return t("runUi.provider.detail.registered", { defaultValue: fallback });
        case "requestedModel": return t("runUi.provider.detail.requestedModel", { defaultValue: fallback });
        case "revision": return t("runUi.provider.detail.revision", { defaultValue: fallback });
        case "sameSession": return t("runUi.provider.detail.sameSession", { defaultValue: fallback });
        case "scope": return t("runUi.provider.detail.scope", { defaultValue: fallback });
        case "severity": return t("runUi.provider.detail.severity", { defaultValue: fallback });
        case "state": return t("runUi.provider.detail.state", { defaultValue: fallback });
        case "status": return t("runUi.provider.detail.status", { defaultValue: fallback });
        case "summary": return t("runUi.provider.detail.summary", { defaultValue: fallback });
        case "syncStatus": return t("runUi.provider.detail.syncStatus", { defaultValue: fallback });
        case "target": return t("runUi.provider.detail.target", { defaultValue: fallback });
        case "targetExecutionId": return t("runUi.provider.detail.targetExecutionId", { defaultValue: fallback });
        case "title": return t("runUi.provider.detail.title", { defaultValue: fallback });
        case "transparentBackground": return t("runUi.provider.detail.transparentBackground", { defaultValue: fallback });
        case "transport": return t("runUi.provider.detail.transport", { defaultValue: fallback });
        case "url": return t("runUi.provider.detail.url", { defaultValue: fallback });
        case "userActionable": return t("runUi.provider.detail.userActionable", { defaultValue: fallback });
        default: return fallback;
      }
    case "boolean":
      if (slot !== "protocolDetailValue" || typeof value.value !== "boolean") return fallback;
      return value.value ? t("runUi.provider.yes", { defaultValue: fallback }) : t("runUi.provider.no", { defaultValue: fallback });
    case "thoughtDuration":
      if (slot !== "thinkingSummary" || typeof value.seconds !== "number" || !Number.isSafeInteger(value.seconds) || value.seconds < 0) return fallback;
      return value.seconds < 60 ? t("runUi.thinking.durationSeconds", { count: value.seconds, defaultValue: fallback })
        : t("runUi.thinking.durationMinutes", { minutes: Math.floor(value.seconds / 60), seconds: value.seconds % 60, defaultValue: fallback });
    case "planStep":
      return slot === "protocolStepLabel" && Object.keys(value).length === 1 ? t("runUi.provider.planStep", { defaultValue: fallback }) : fallback;
    case "childUnknown":
      return slot === "protocolChildStatus" && Object.keys(value).length === 1 ? t("runUi.provider.unknown", { defaultValue: fallback }) : fallback;
    case "subagent":
      return slot === "protocolChildTitle" && Object.keys(value).length === 1 ? t("runUi.provider.subagent", { defaultValue: fallback }) : fallback;
    case "providerSessionTotal":
      return slot === "usageLabel" && Object.keys(value).length === 1 ? t("runUi.usage.sessionTotal", { defaultValue: fallback }) : fallback;
    case "sessionCumulative":
      return slot === "usageDetail" && Object.keys(value).length === 1 ? t("runUi.usage.sessionCumulative", { defaultValue: fallback }) : fallback;
    case "tool.unnamed":
      return slot === "toolName" && Object.keys(value).length === 1 ? t("runUi.tool.unnamedName", { defaultValue: fallback }) : fallback;
    case "tool.edit":
      return slot === "toolName" && Object.keys(value).length === 1 ? t("runUi.tool.editName", { defaultValue: fallback }) : fallback;
    case "marker.newSession":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.newSession", { defaultValue: fallback }) : fallback;
    case "marker.waitingToResume":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.waitingToResume", { defaultValue: fallback }) : fallback;
    case "marker.runtimeMissing":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runtimeMissing", { defaultValue: fallback }) : fallback;
    case "marker.modelUnavailable":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.modelUnavailable", { defaultValue: fallback }) : fallback;
    case "marker.approvalRequired":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.approvalRequired", { defaultValue: fallback }) : fallback;
    case "marker.usageLimitReached":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.usageLimitReached", { defaultValue: fallback }) : fallback;
    case "marker.runCancelled":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runCancelled", { defaultValue: fallback }) : fallback;
    case "marker.runInterrupted":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runInterrupted", { defaultValue: fallback }) : fallback;
    case "marker.runTimedOut":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runTimedOut", { defaultValue: fallback }) : fallback;
    case "marker.runFailed":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runFailed", { defaultValue: fallback }) : fallback;
    case "marker.startingBranchUnavailable":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.startingBranchUnavailable", { defaultValue: fallback }) : fallback;
    case "marker.workspaceRestoreFailed":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.workspaceRestoreFailed", { defaultValue: fallback }) : fallback;
    case "marker.aiConnectionNeeded":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.aiConnectionNeeded", { defaultValue: fallback }) : fallback;
    case "marker.stopped":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.stopped", { defaultValue: fallback }) : fallback;
    case "marker.couldNotStart":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.couldNotStart", { defaultValue: fallback }) : fallback;
    case "marker.runCompleted":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.runCompleted", { defaultValue: fallback }) : fallback;
    case "marker.turnStarted":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.turnStarted", { defaultValue: fallback }) : fallback;
    case "marker.turnCompleted":
      return slot === "markerLabel" && Object.keys(value).length === 1 ? t("runUi.marker.turnCompleted", { defaultValue: fallback }) : fallback;
    case "detail.sessionHistory":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.sessionHistory", { defaultValue: fallback }) : fallback;
    case "detail.executionWait":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.executionWait", { defaultValue: fallback }) : fallback;
    case "detail.runtimeMissing":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.runtimeMissing", { defaultValue: fallback }) : fallback;
    case "detail.approvalRequired":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.approvalRequired", { defaultValue: fallback }) : fallback;
    case "detail.usageLimit":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.usageLimit", { defaultValue: fallback }) : fallback;
    case "detail.providerOutputLimit":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.providerOutputLimit", { defaultValue: fallback }) : fallback;
    case "detail.repairStartingBranch":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.repairStartingBranch", { defaultValue: fallback }) : fallback;
    case "detail.connectionPending":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.connectionPending", { defaultValue: fallback }) : fallback;
    case "detail.connectionUnavailable":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.connectionUnavailable", { defaultValue: fallback }) : fallback;
    case "detail.executionReconciliation":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.executionReconciliation", { defaultValue: fallback }) : fallback;
    case "detail.executionStopped":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.executionStopped", { defaultValue: fallback }) : fallback;
    case "detail.cancelledBeforeResponse":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.cancelledBeforeResponse", { defaultValue: fallback }) : fallback;
    case "detail.noResponse":
      return slot === "markerDetail" && Object.keys(value).length === 1 ? t("runUi.detail.noResponse", { defaultValue: fallback }) : fallback;
    case "author.board":
      return slot === "authorName" && Object.keys(value).length === 1 ? t("runUi.author.board", { defaultValue: fallback }) : fallback;
    case "author.you":
      return slot === "authorName" && Object.keys(value).length === 1 ? t("runUi.author.you", { defaultValue: fallback }) : fallback;
    case "author.user":
      return slot === "authorName" && Object.keys(value).length === 1 ? t("runUi.author.user", { defaultValue: fallback }) : fallback;
    case "author.agent":
      return slot === "authorName" && Object.keys(value).length === 1 ? t("runUi.author.agent", { defaultValue: fallback }) : fallback;
    case "status.running":
      return slot === "statusLabel" && Object.keys(value).length === 1 ? t("runUi.status.running", { defaultValue: fallback }) : fallback;
    case "status.working":
      return slot === "statusLabel" && Object.keys(value).length === 1 ? t("runUi.status.working", { defaultValue: fallback }) : fallback;
    case "status.thinking":
      return slot === "statusLabel" && Object.keys(value).length === 1 ? t("runUi.status.thinking", { defaultValue: fallback }) : fallback;
    case "status.responding":
      return slot === "statusLabel" && Object.keys(value).length === 1 ? t("runUi.status.responding", { defaultValue: fallback }) : fallback;
    case "detail.nativeCancelled":
      if (slot !== "markerDetail" || typeof value.afterFinalResponse !== "boolean") return fallback;
      return value.afterFinalResponse
        ? t("runUi.detail.nativeCancelledAfterResponse", { defaultValue: fallback })
        : t("runUi.detail.nativeCancelled", { defaultValue: fallback });
    case "detail.nativeInterrupted":
      if (slot !== "markerDetail" || typeof value.afterFinalResponse !== "boolean") return fallback;
      return value.afterFinalResponse
        ? t("runUi.detail.nativeInterruptedAfterResponse", { defaultValue: fallback })
        : t("runUi.detail.nativeInterrupted", { defaultValue: fallback });
    case "detail.nativeTimedOut":
      if (slot !== "markerDetail" || typeof value.afterFinalResponse !== "boolean" || typeof value.errorCode !== "string") return fallback;
      return value.afterFinalResponse
        ? t("runUi.detail.nativeTimedOutAfterResponse", { errorCode: value.errorCode, defaultValue: fallback })
        : t("runUi.detail.nativeTimedOut", { errorCode: value.errorCode, defaultValue: fallback });
    case "detail.nativeStopped":
      if (slot !== "markerDetail" || typeof value.afterFinalResponse !== "boolean" || typeof value.errorCode !== "string") return fallback;
      return value.afterFinalResponse
        ? t("runUi.detail.nativeStoppedAfterResponse", { errorCode: value.errorCode, defaultValue: fallback })
        : t("runUi.detail.nativeStopped", { errorCode: value.errorCode, defaultValue: fallback });
    case "detail.modelRejected":
      if (slot !== "markerDetail" || (value.providerError !== undefined && typeof value.providerError !== "string")) return fallback;
      return value.providerError
        ? t("runUi.detail.modelRejectedWithError", { providerError: value.providerError, defaultValue: fallback })
        : t("runUi.detail.modelRejected", { defaultValue: fallback });
    case "detail.workspaceRestore": {
      if (slot !== "markerDetail" || typeof value.savedPlan !== "boolean" || typeof value.noFinalResponse !== "boolean"
        || (value.affectedPath !== undefined && typeof value.affectedPath !== "string")) return fallback;
      const parts = [value.savedPlan ? t("runUi.detail.workspaceRestorePlanSaved") : t("runUi.detail.workspaceRestoreFailed"), t("runUi.detail.workspaceFilesNeedRecovery")];
      if (value.noFinalResponse) parts.push(t("runUi.detail.noFinalResponseRecorded"));
      if (value.affectedPath) parts.push(t("runUi.detail.affectedPath", { path: value.affectedPath }));
      return parts.join(" ");
    }
    case "detail.legacyFailure":
      if (slot !== "markerDetail" || typeof value.errorCode !== "string") return fallback;
      switch (value.failure) {
        case "providerOutputLimit":
          switch (value.retry) {
            case "scheduled": return t("runUi.detail.legacy.providerOutputLimit.scheduled", { errorCode: value.errorCode, defaultValue: fallback });
            case "available": return t("runUi.detail.legacy.providerOutputLimit.available", { errorCode: value.errorCode, defaultValue: fallback });
            case "preserved": return t("runUi.detail.legacy.providerOutputLimit.preserved", { errorCode: value.errorCode, defaultValue: fallback });
            default: return fallback;
          }
        case "workspaceSetup":
          switch (value.retry) {
            case "scheduled": return t("runUi.detail.legacy.workspaceSetup.scheduled", { errorCode: value.errorCode, defaultValue: fallback });
            case "available": return t("runUi.detail.legacy.workspaceSetup.available", { errorCode: value.errorCode, defaultValue: fallback });
            case "preserved": return t("runUi.detail.legacy.workspaceSetup.preserved", { errorCode: value.errorCode, defaultValue: fallback });
            default: return fallback;
          }
        case "runFailed":
          switch (value.retry) {
            case "scheduled": return t("runUi.detail.legacy.runFailed.scheduled", { errorCode: value.errorCode, defaultValue: fallback });
            case "available": return t("runUi.detail.legacy.runFailed.available", { errorCode: value.errorCode, defaultValue: fallback });
            case "preserved": return t("runUi.detail.legacy.runFailed.preserved", { errorCode: value.errorCode, defaultValue: fallback });
            default: return fallback;
          }
        default: return fallback;
      }
    case "status.tool":
      if (slot !== "statusLabel" || (value.toolName !== undefined && typeof value.toolName !== "string")) return fallback;
      return toolActivityPresentation({ name: value.toolName as string | undefined }, t).runningLabel;
    default: return fallback;
  }
}

export function isRetryableFailureMarker(item: TaskChatMarkerItem): boolean {
  if (item.variant !== "interrupted") return false;
  if (item.retryKind !== undefined) return item.retryKind === "run_failure" || item.retryKind === "usage_limit";
  return item.label === "Run failed" || item.label === "Usage limit reached";
}
