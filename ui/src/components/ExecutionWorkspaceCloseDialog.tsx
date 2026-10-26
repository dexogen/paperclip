import { statusLabel } from "../i18n/ui-labels";
import { workspaceCloseActionLabel, workspaceCloseMessages } from "../lib/workspace-close-display";
import { workspaceRuntimeLabel } from "./WorkspaceRuntimeControls";
import { useTranslation, Trans } from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExecutionWorkspace } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { Loader2 } from "lucide-react";
import { executionWorkspacesApi } from "../api/execution-workspaces";
import { useToastActions } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { formatDateTime, issueUrl } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type ExecutionWorkspaceCloseDialogProps = {
  workspaceId: string;
  workspaceName: string;
  currentStatus: ExecutionWorkspace["status"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: (workspace: ExecutionWorkspace) => void;
};

function readinessTone(state: "ready" | "ready_with_warnings" | "blocked") {
  if (state === "blocked") {
    return "border-destructive/30 bg-destructive/5 text-destructive";
  }
  if (state === "ready_with_warnings") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export function ExecutionWorkspaceCloseDialog({
  workspaceId,
  workspaceName,
  currentStatus,
  open,
  onOpenChange,
  onClosed,
}: ExecutionWorkspaceCloseDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const actionLabel = currentStatus === "cleanup_failed" ? t("projectWorkspacesUi.actions.retryClose") : t("projectWorkspacesUi.actions.close");

  const readinessQuery = useQuery({
    queryKey: queryKeys.executionWorkspaces.closeReadiness(workspaceId),
    queryFn: () => executionWorkspacesApi.getCloseReadiness(workspaceId),
    enabled: open,
  });

  const closeWorkspace = useMutation({
    mutationFn: () => executionWorkspacesApi.update(workspaceId, { status: "archived" }),
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.executionWorkspaces.detail(workspace.id), workspace);
      queryClient.invalidateQueries({ queryKey: queryKeys.executionWorkspaces.overview(workspace.companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.executionWorkspaces.closeReadiness(workspace.id) });
      pushToast({
        title: currentStatus === "cleanup_failed" ? t("projectWorkspacesUi.close.retried") : t("projectWorkspacesUi.close.closed"),
        tone: "success",
      });
      onOpenChange(false);
      onClosed?.(workspace);
    },
    onError: (error) => {
      pushToast({
        title: t("projectWorkspacesUi.close.failed"),
        body: error instanceof Error ? error.message : t("projectWorkspacesUi.close.unknownError"),
        tone: "error",
      });
    },
  });

  const readiness = readinessQuery.data ?? null;
  const blockingIssues = readiness?.linkedIssues.filter((issue) => !issue.isTerminal) ?? [];
  const otherLinkedIssues = readiness?.linkedIssues.filter((issue) => issue.isTerminal) ?? [];
  const confirmDisabled =
    currentStatus === "archived" ||
    closeWorkspace.isPending ||
    readinessQuery.isLoading ||
    readiness == null ||
    readiness.state === "blocked";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!closeWorkspace.isPending) onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-h-(--sz-85vh) overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription className="break-words">
            <Trans t={t} i18nKey="projectWorkspacesUi.close.intro" components={{ workspace: <span className="font-medium text-foreground">{workspaceName}</span> }} />
          </DialogDescription>
        </DialogHeader>

        {readinessQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />{t("projectWorkspacesUi.close.checking")}</div>
        ) : readinessQuery.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {readinessQuery.error instanceof Error ? readinessQuery.error.message : t("projectWorkspacesUi.close.inspectFailed")}
          </div>
        ) : readiness ? (
          <div className="space-y-4">
            <div className={`rounded-xl border px-4 py-3 text-sm ${readinessTone(readiness.state)}`}>
              <div className="font-medium">
                {readiness.state === "blocked"
                  ? t("projectWorkspacesUi.close.blocked")
                  : readiness.state === "ready_with_warnings"
                    ? t("projectWorkspacesUi.close.readyWarnings")
                    : t("projectWorkspacesUi.close.ready")}
              </div>
              <div className="mt-1 text-xs opacity-80">
                {readiness.isSharedWorkspace
                  ? t("projectWorkspacesUi.close.shared")
                  : readiness.git?.workspacePath && readiness.git.repoRoot && readiness.git.workspacePath !== readiness.git.repoRoot
                    ? t("projectWorkspacesUi.close.ownCheckout")
                    : readiness.isProjectPrimaryWorkspace
                      ? t("projectWorkspacesUi.close.primary")
                      : t("projectWorkspacesUi.close.disposable")}
              </div>
            </div>

            {blockingIssues.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.blockingTasks")}</h3>
                <div className="space-y-2">
                  {blockingIssues.map((issue) => (
                    <div key={issue.id} className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <Link to={issueUrl(issue)} className="min-w-0 break-words font-medium hover:underline">
                          {issue.identifier ?? issue.id} · {issue.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">{["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"].includes(issue.status) ? statusLabel(issue.status) : issue.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {readiness.blockingReasons.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.blockingReasons")}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {workspaceCloseMessages(readiness.blockingReasons, readiness.messageDescriptors?.blockingReasons, t).map((reason, index) => (
                    <li key={`${index}-${readiness.blockingReasons[index]}`} className="break-words rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {readiness.warnings.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.warnings")}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {workspaceCloseMessages(readiness.warnings, readiness.messageDescriptors?.warnings, t).map((warning, index) => (
                    <li key={`${index}-${readiness.warnings[index]}`} className="break-words rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      {warning}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {readiness.git ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.gitStatus")}</h3>
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.summary.branch")}</div>
                      <div className="font-mono text-xs">{readiness.git.branchName ?? t("projectWorkspacesUi.close.unknown")}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.close.baseRef")}</div>
                      <div className="font-mono text-xs">{readiness.git.baseRef ?? t("projectWorkspacesUi.close.notSet")}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.close.merged")}</div>
                      <div>{readiness.git.isMergedIntoBase == null ? t("projectWorkspacesUi.close.unknown") : readiness.git.isMergedIntoBase ? t("projectWorkspacesUi.close.yes") : t("projectWorkspacesUi.close.no")}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.close.aheadBehind")}</div>
                      <div>
                        {(readiness.git.aheadCount ?? 0).toString()} / {(readiness.git.behindCount ?? 0).toString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.close.dirty")}</div>
                      <div>{readiness.git.dirtyEntryCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.close.untracked")}</div>
                      <div>{readiness.git.untrackedEntryCount}</div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {otherLinkedIssues.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.otherTasks")}</h3>
                <div className="space-y-2">
                  {otherLinkedIssues.map((issue) => (
                    <div key={issue.id} className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <Link to={issueUrl(issue)} className="min-w-0 break-words font-medium hover:underline">
                          {issue.identifier ?? issue.id} · {issue.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">{["backlog", "todo", "in_progress", "in_review", "blocked", "done", "cancelled"].includes(issue.status) ? statusLabel(issue.status) : issue.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {readiness.runtimeServices.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.services")}</h3>
                <div className="space-y-2">
                  {readiness.runtimeServices.map((service) => (
                    <div key={service.id} className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{service.serviceName}</span>
                        <span className="text-xs text-muted-foreground">{workspaceRuntimeLabel(service.status, t)} · {workspaceRuntimeLabel(service.lifecycle, t)}</span>
                      </div>
                      {/*
                        The last fallback used to print the service working
                        directory, a path on the execution host. The dialog has
                        no instance-policy context of its own, so it drops the
                        path outright and falls back to a neutral line.
                      */}
                      <div className="mt-1 break-words text-xs text-muted-foreground">
                        {service.url ?? service.command ?? t("projectWorkspacesUi.close.noDetails")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("projectWorkspacesUi.close.actions")}</h3>
              <div className="space-y-2">
                {readiness.plannedActions.map((action, index) => (
                  <div key={`${action.kind}-${index}`} className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
                    <div className="font-medium">{workspaceCloseActionLabel(action, t).label}</div>
                    <div className="mt-1 break-words text-muted-foreground">{workspaceCloseActionLabel(action, t).description}</div>
                    {action.command ? (
                      <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground">
                        {action.command}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {currentStatus === "cleanup_failed" ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">{t("projectWorkspacesUi.close.retryHint")}</div>
            ) : null}

            {currentStatus === "archived" ? (
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">{t("projectWorkspacesUi.close.archived")}</div>
            ) : null}

            {readiness.git?.repoRoot ? (
              <div className="break-words text-xs text-muted-foreground">
                <Trans t={t} i18nKey="projectWorkspacesUi.close.repoRoot" components={{ path: <span className="font-mono break-all">{readiness.git.repoRoot}</span> }} />
                {readiness.git.workspacePath ? (
                  <>
                    {" · "}<Trans t={t} i18nKey="projectWorkspacesUi.close.workspacePath" components={{ path: <span className="font-mono break-all">{readiness.git.workspacePath}</span> }} />
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground">
              {t("projectWorkspacesUi.close.checked", { time: formatDateTime(new Date(readinessQuery.dataUpdatedAt)) })}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closeWorkspace.isPending}
          >{t("projectWorkspacesUi.actions.cancel")}</Button>
          <Button
            variant={currentStatus === "cleanup_failed" ? "default" : "destructive"}
            onClick={() => closeWorkspace.mutate()}
            disabled={confirmDisabled}
          >
            {closeWorkspace.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
