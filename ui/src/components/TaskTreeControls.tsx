import { useTranslation } from "@/i18n";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import type { IssueTreePreviewWarning } from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { PauseCircle, PlayCircle, Repeat, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/** Shared by the task header and its Storybook composition. */
export function TaskTreeControlMenuItems({
  scope,
  canPause,
  canResume,
  canCancel,
  canRestore,
  pending,
  onPause,
  onResume,
  onCancel,
  onRestore,
}: {
  scope: "leaf" | "subtree";
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canRestore: boolean;
  pending?: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const itemClass =
    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 disabled:opacity-50 disabled:pointer-events-none";
  return (
    <>
      {canPause ? (
        <button disabled={pending} className={itemClass} onClick={onPause}>
          <PauseCircle className="h-3 w-3" />
          {scope === "leaf" ? t("taskProperties.tree.pauseWork") : t("taskProperties.tree.pauseSubtree")}
        </button>
      ) : null}
      {canResume ? (
        <button disabled={pending} className={itemClass} onClick={onResume}>
          <PlayCircle className="h-3 w-3" />
          {scope === "leaf" ? t("taskProperties.tree.resumeWork") : t("taskProperties.tree.resumeSubtree")}
        </button>
      ) : null}
      {canCancel ? (
        <button
          disabled={pending}
          className={`${itemClass} text-destructive`}
          onClick={onCancel}
        >
          <XCircle className="h-3 w-3" />
          {t("taskProperties.tree.cancelSubtree")}
        </button>
      ) : null}
      {canRestore ? (
        <button disabled={pending} className={itemClass} onClick={onRestore}>
          <Repeat className="h-3 w-3" />
          {t("taskProperties.tree.restoreSubtree")}
        </button>
      ) : null}
    </>
  );
}

function taskTreeWarningLabel(warning: IssueTreePreviewWarning, t: TFunction): string {
  switch (warning.code) {
    case "no_affected_issues": return t("taskProperties.tree.warnings.noAffectedIssues");
    case "running_runs_present": return t("taskProperties.tree.warnings.runningRuns");
    case "queued_runs_present": return t("taskProperties.tree.warnings.queuedRuns");
    case "no_active_pause_holds": return t("taskProperties.tree.warnings.noPauseHolds");
    case "resume_tasks_remain_idle": return t("taskProperties.tree.warnings.remainIdle");
    case "restore_conflicts_present": return t("taskProperties.tree.warnings.restoreConflicts");
    default: return warning.message;
  }
}

export function TaskTreeControlDialog({
  open,
  onOpenChange,
  mode,
  scope,
  affectedCount,
  affectedAgentCount,
  warnings = [],
  loading,
  error,
  pending,
  valid,
  wakeAgents,
  onWakeAgentsChange,
  onRetry,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "resume" | "cancel" | "restore";
  scope: "leaf" | "subtree";
  affectedCount: number;
  affectedAgentCount: number;
  warnings?: IssueTreePreviewWarning[];
  loading: boolean;
  error?: string | null;
  pending: boolean;
  valid: boolean;
  wakeAgents: boolean;
  onWakeAgentsChange: (wake: boolean) => void;
  onRetry: () => void;
  onApply: () => void;
}) {
  const { t } = useTranslation();
  const cancel = mode === "cancel";
  const title = cancel
    ? t("taskProperties.tree.cancelTitle")
    : mode === "restore"
      ? t("taskProperties.tree.restoreTitle")
      : scope === "leaf"
        ? t("taskProperties.tree.resumeWork")
        : t("taskProperties.tree.resumeSubtree");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-(--sz-calc-18) overflow-y-auto sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {loading
              ? t("taskProperties.tree.loading")
              : cancel
                ? t("taskProperties.tree.willCancel", { count: affectedCount })
                : mode === "restore" ? t("taskProperties.tree.willRestore", { count: affectedCount }) : t("taskProperties.tree.willResume", { count: affectedCount })}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={onRetry}
            >
              {t("taskProperties.tree.retryPreview")}
            </Button>
          </div>
        ) : null}
        {!cancel ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wakeAgents && affectedAgentCount > 0}
              disabled={pending || loading || affectedAgentCount === 0}
              onChange={(event) => onWakeAgentsChange(event.target.checked)}
            />
            {t("taskProperties.tree.wakeAgents", { count: affectedAgentCount })}
          </label>
        ) : null}
        {!loading ? warnings.map((warning) => (
          <p key={warning.code} className="text-sm text-muted-foreground">{taskTreeWarningLabel(warning, t)}</p>
        )) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancel ? t("taskProperties.tree.keepTasks") : t("taskProperties.tree.close")}
          </Button>
          <Button
            variant={cancel ? "destructive" : "default"}
            disabled={pending || loading || !!error || !valid}
            onClick={onApply}
          >
            {pending
              ? t("taskProperties.tree.applying")
              : cancel
                ? t("taskProperties.tree.cancelTasks", { count: affectedCount })
                : mode === "restore"
                  ? t("taskProperties.tree.restoreTasks", { count: affectedCount })
                  : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Quiet, persistent pause feedback shared by the task page and previews. */
export function TaskPauseNotice({
  scope,
  onResume,
  pending,
  className,
  resumeLink,
}: {
  scope: "leaf" | "subtree";
  onResume?: () => void;
  pending?: boolean;
  className?: string;
  resumeLink?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <span>
        {scope === "subtree" ? t("taskProperties.tree.subtreePaused") : t("taskProperties.tree.taskPaused")}
      </span>
      {resumeLink ??
        (onResume ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onResume}
          >
            {scope === "subtree" ? t("taskProperties.tree.resumeSubtree") : t("taskProperties.tree.resumeWork")}
          </Button>
        ) : null)}
    </div>
  );
}
