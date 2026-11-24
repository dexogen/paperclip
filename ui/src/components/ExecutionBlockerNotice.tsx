import { statusLabel } from "@/i18n/ui-labels";
import { t as translateUi } from "@/i18n";
import { useTranslation } from "@/i18n";
import { describeError } from "../api/errors";
import type { IssueRelationIssueSummary, TaskInterruptionPresentation } from "@paperclipai/shared";
import { AlertCircle } from "lucide-react";
import { Link } from "@/lib/router";
import { createIssueDetailPath } from "../lib/issueDetailBreadcrumb";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useSecondTick } from "../hooks/useSecondTick";
import { TaskProjectAccessNotice } from "./TaskProjectAccessNotice";
import { ProviderFailureNotice } from "./ProviderFailureNotice";
import { LockedIssueChip, isLockedIssueStub } from "./LockedIssueChip";

const recoveryStepText: Record<NonNullable<TaskInterruptionPresentation["recoveryStep"]>, string> = {
  get checking_previous_run() { return translateUi("runUi.blocker.checking_previous_run"); },
  get saving_previous_files() { return translateUi("runUi.blocker.saving_previous_files"); },
  get finishing_recovery() { return translateUi("runUi.blocker.finishing_recovery"); },
};

const blockerAction: Record<string, string> = {
  get blocked() { return translateUi("runUi.blocker.blocked"); },
  get cancelled() { return translateUi("runUi.blocker.cancelled"); },
  get done() { return translateUi("runUi.blocker.done"); },
};

function retryWaitText(presentation: TaskInterruptionPresentation): string {
  const wait = presentation.retryWait;
  if (!wait) return "";
  if (wait.reason === "dependency_blocked") {
    switch (wait.dependencyState) {
      case "cancelled": return translateUi("runUi.blocker.dependencyCancelled");
      case "blocked": return translateUi("runUi.blocker.dependencyBlocked");
      case "saving": return translateUi("runUi.blocker.dependencySaving");
      case "unfinished": return translateUi("runUi.blocker.dependencyUnfinished");
      default: return wait.message;
    }
  }
  if (wait.reason === "budget.blocked" && presentation.state === "working") return translateUi("runUi.blocker.budgetAdmission");
  switch (wait.reason) {
    case "workspace_repair_required": return translateUi("runUi.blocker.workspaceRepairRequired");
    case "remote_cleanup": return translateUi("runUi.blocker.remoteCleanup");
    case "cleanup_pending":
    case "local_cleanup": return translateUi("runUi.blocker.localCleanup");
    case "process_running":
    case "execution_settling": return translateUi("runUi.blocker.executionSettling");
    case "controller_settling": return translateUi("runUi.blocker.controllerSettling");
    case "process_identity_missing": return translateUi("runUi.blocker.processIdentityMissing");
    case "execution_active": return translateUi("runUi.blocker.executionActive");
    case "decision_pending": return translateUi("runUi.blocker.decisionPending");
    case "budget.blocked": return translateUi("runUi.blocker.budgetBlocked");
    case "finalizing_saved_result": return translateUi("runUi.blocker.finalizingSavedResult");
    case "saved_work_recovery_failed": return translateUi("runUi.blocker.savedWorkRecoveryFailed");
    case "workspace_owner_stop_required": return translateUi("runUi.blocker.workspaceOwnerStopRequired");
    case "cleanup_quarantined": return translateUi("runUi.blocker.cleanupQuarantined");
    case "cancelled_by_operator": return translateUi("runUi.blocker.cancelledByOperator");
    case "retry_authority_denied": return translateUi("runUi.blocker.retryAuthorityDenied");
    case "retry_source_changed": return translateUi("runUi.blocker.retrySourceChanged");
    case "execution_recovery": return translateUi("runUi.blocker.executionRecovery");
    default: return wait.message;
  }
}

/** One ordinary interruption surface. Technical records remain in diagnostics. */
export function ExecutionBlockerNotice({ presentation, canRetry, onRetry, optimistic, takingLonger, error, className, issueId, agentName, projectName, blockers }: {
  presentation: TaskInterruptionPresentation | null | undefined;
  blockers?: IssueRelationIssueSummary[];
  canRetry: boolean;
  onRetry: () => void;
  optimistic?: boolean;
  takingLonger?: boolean;
  error?: Error | null;
  className?: string;
  issueId?: string;
  agentName?: string;
  projectName?: string;
}) {
  const { t } = useTranslation();
  useSecondTick(presentation?.state === "retry_scheduled");
  if (presentation?.projectAccess && !optimistic && !takingLonger) return <TaskProjectAccessNotice
    access={presentation.projectAccess} issueId={issueId} agentName={agentName} projectName={projectName}
    canRetry={canRetry && presentation.canRetry} onRetry={onRetry} error={error} className={className} />;
  if (error && !optimistic && !takingLonger) return <div role="alert" className={cn("flex items-center justify-between gap-2 text-sm text-destructive", className)}><span>{describeError(error).body}</span>{canRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t("runUi.blocker.retry")}</Button>}</div>;
  if (takingLonger) return <div role="status" className={cn("flex items-center justify-between gap-2 text-sm text-muted-foreground", className)}><span>{t("runUi.blocker.longer")}</span>{canRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t("runUi.blocker.retry")}</Button>}</div>;
  const step = !optimistic && presentation?.responsibility === "system" && presentation.recoveryStep
    && ["working", "retry_scheduled"].includes(presentation.state) ? recoveryStepText[presentation.recoveryStep] : null;
  const seconds = Math.max(0, Math.ceil((Date.parse(presentation?.nextRetryAt ?? "") - Date.now()) / 1000));
  const retryIn = seconds > 60 ? t("runUi.blocker.retryMinutes", { count: Math.ceil(seconds / 60) }) : t("runUi.blocker.retrySeconds", { count: seconds });
  if (!optimistic && !presentation?.retryWait && presentation?.providerFailure && ["failed", "retry_scheduled", "waiting_for_user"].includes(presentation.state)) {
    // Saved-work recovery is what the task waits for, so name it over the
    // generic automatic-retry line while keeping the provider explanation.
    return <ProviderFailureNotice failure={presentation.providerFailure} className={className}
      actions={canRetry && presentation.canRetry ? <Button variant="outline" size="sm" onClick={onRetry}>{translateUi("runUi.blocker.retry")}</Button> : undefined}>
      {presentation.state === "retry_scheduled" && <p>{step ? translateUi("interfaceUpdates.value_value_d2fb1d14", { value1: (step), value2: (retryIn) }) : translateUi("interfaceUpdates.paperclip_will_retry_automatically_ec298deb")}</p>}
    </ProviderFailureNotice>;
  }
  if (step && presentation?.state === "working") return <div role="status" aria-label={translateUi("runUi.blocker.taskStatus")}
    className={cn("text-sm text-muted-foreground", className)}>{translateUi("interfaceUpdates.value_0ddb74a9", { value1: (step) })}</div>;
  // A task that has not started yet names the admission hold it waits for.
  if (!optimistic && presentation?.state === "working" && presentation.retryWait) {
    const dependencies = presentation.retryWait.reason === "dependency_blocked" ? blockers ?? [] : [];
    const unfinished = dependencies.filter(blocker => isLockedIssueStub(blocker) || blocker.status !== "done");
    const waitingOn = unfinished.length ? unfinished : dependencies;
    return <div role="status" aria-label={t("runUi.blocker.taskStatus")} className={cn("text-sm text-muted-foreground", className)}>
      <p>{retryWaitText(presentation)}</p>
      {waitingOn.length ? <ul className="mt-1 space-y-0.5" data-testid="retry-waiting-on">
        {waitingOn.map(blocker => isLockedIssueStub(blocker)
          ? <li key={blocker.id} className="flex min-w-0 items-center gap-2"><LockedIssueChip identifier={blocker.identifier} /></li>
          : <li key={blocker.id} className="flex min-w-0 items-center gap-2">
          <Link to={createIssueDetailPath(blocker.identifier ?? blocker.id)}
            className="font-mono text-xs text-foreground underline-offset-2 hover:underline">
            {blocker.identifier ?? t("taskDetailCommon.editor.task")}
          </Link>
          <span className="min-w-0 truncate">{blocker.title}</span>
          <span className="shrink-0 text-xs">{blockerAction[blocker.status] ?? statusLabel(blocker.status)}</span>
        </li>)}
      </ul> : null}
    </div>;
  }
  if (optimistic || !presentation || presentation.responsibility !== "system" ||
      !["failed", "retry_scheduled"].includes(presentation.state)) return null;
  return (
    <div className={cn(presentation.state === "failed" && "pt-4", className)}>
      <div role="status" aria-label={translateUi("runUi.blocker.taskStatus")} className={cn(
        "flex items-center justify-between gap-3 text-sm",
        presentation.state === "failed" ? "rounded-lg bg-destructive/10 p-4 text-foreground" : "text-muted-foreground",
      )}>
        {presentation.state === "failed" && <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />}
        <span className="min-w-0 flex-1">{presentation.state === "retry_scheduled"
          ? step ? translateUi("interfaceUpdates.value_value_d2fb1d14", { value1: (step), value2: (retryIn) }) : retryIn
          : presentation.retryWait ? retryWaitText(presentation)
          : presentation.workspaceFailure
            ? <>{translateUi("interfaceUpdates.couldn_t_prepare_the_task_folders_43594792")} {presentation.workspaceFailure.message}</>
            : translateUi("runUi.blocker.failed")}</span>
        {canRetry && presentation.canRetry && <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry}>{translateUi("runUi.blocker.retry")}</Button>}
      </div>
    </div>
  );
}
