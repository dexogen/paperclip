import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentConfigRevision, AgentDetail as AgentDetailRecord } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { accessApi } from "@/api/access";
import { AgentChip, agentTableHeadClass, agentTableRowClass } from "@/components/agent-detail/AgentPanels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate } from "@/lib/utils";
import { syncAgentRouteAfterRename } from "./agent-route";

const KEY_LABELS: Record<string, string> = {
  get name() { return translateUi("interfaceUpdates.name_82a3537f"); },
  get title() { return translateUi("interfaceUpdates.title_aaf23206"); },
  get role() { return translateUi("interfaceUpdates.role_4b168d88"); },
  get reportsTo() { return translateUi("interfaceUpdates.reporting_line_58d6cbb3"); },
  get capabilities() { return translateUi("interfaceUpdates.capabilities_3fc0e5c4"); },
  get adapterType() { return translateUi("interfaceUpdates.harness_49f75646"); },
  get adapterConfig() { return translateUi("interfaceUpdates.harness_settings_db5b818b"); },
  get runtimeConfig() { return translateUi("interfaceUpdates.runtime_settings_553569ec"); },
  get budgetMonthlyCents() { return translateUi("interfaceUpdates.budget_0af96a8e"); },
  get permissions() { return translateUi("interfaceUpdates.permissions_4fe3cdd4"); },
  get metadata() { return translateUi("interfaceUpdates.metadata_45447b7a"); },
};

export function revisionSummary(revision: Pick<AgentConfigRevision, "changedKeys" | "rolledBackFromRevisionId">): string {
  if (revision.rolledBackFromRevisionId) return "Restored an earlier version";
  if (revision.changedKeys.length === 0) return "Saved with no tracked changes";
  const labels = revision.changedKeys.map((key) => KEY_LABELS[key] ?? key);
  const sentence = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Changed ${sentence}`;
}

function useRevisionAuthor(agent: AgentDetailRecord, companyId: string | undefined) {
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(companyId ?? agent.companyId),
    queryFn: () => agentsApi.list(companyId ?? agent.companyId),
  });
  const { data: directory } = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(agent.companyId),
    queryFn: () => accessApi.listUserDirectory(agent.companyId),
  });
  return (revision: AgentConfigRevision) => {
    if (revision.createdByAgentId) {
      return agents?.find((candidate) => candidate.id === revision.createdByAgentId)?.name ?? "An agent";
    }
    if (revision.createdByUserId && revision.createdByUserId !== "local-board") {
      const entry = directory?.users.find((candidate) => candidate.principalId === revision.createdByUserId);
      return entry?.user?.name?.trim() || entry?.user?.email || "Former member";
    }
    return "Board";
  };
}

export function AgentHistoryDialog({
  agent,
  companyId,
  open,
  onOpenChange,
}: {
  agent: AgentDetailRecord;
  companyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useUiTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState<AgentConfigRevision | null>(null);
  const authorOf = useRevisionAuthor(agent, companyId);
  const { data: revisions, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.configRevisions(agent.id),
    queryFn: () => agentsApi.listConfigRevisions(agent.id, companyId),
    enabled: open,
  });
  const rollback = useMutation({
    mutationFn: (revisionId: string) => agentsApi.rollbackConfigRevision(agent.id, revisionId, companyId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.configRevisions(agent.id) });
      setPending(null);
      if (!syncAgentRouteAfterRename(queryClient, navigate, agent, updated, "overview")) {
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.urlKey) });
      }
    },
  });
  const restoreError = rollback.error
    ? rollback.error instanceof Error && rollback.error.message
      ? rollback.error.message
      : "Could not restore that version."
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-(--agent-detail-dialog-max-h) flex-col gap-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">{translateUi("agentDetailUi.nav.history")}</DialogTitle>
          <DialogDescription>{translateUi("interfaceUpdates.every_saved_change_to_4088f34e")} {agent.name}{translateUi("interfaceUpdates.s_identity_and_configuration_restore_any_version_372a9e7a")}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : translateUi("interfaceUpdates.could_not_load_agent_history_1aa4228d")}</p>
        ) : isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.loading_agent_history_3c2aeff3")}</p>
        ) : (revisions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.no_saved_changes_yet_7749bed6")}</p>
        ) : (
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border">
            <div className={`${agentTableHeadClass} grid-cols-(--agent-detail-history-cols)`}>
              <span>{translateUi("interfaceUpdates.configuration_b332c349")}</span>
              <span>{translateUi("interfaceUpdates.team_member_8062dbb5")}</span>
              <span>{translateUi("interfaceUpdates.date_configured_dbbca0b9")}</span>
              <span aria-hidden />
            </div>
            {(revisions ?? []).map((revision) => (
              <div key={revision.id} className={`${agentTableRowClass} grid-cols-(--agent-detail-history-cols)`}>
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">{revisionSummary(revision)}</span>
                  {revision.changedKeys.length > 0 ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {revision.changedKeys.map((key) => (
                        <AgentChip key={key} mono>
                          {key}
                        </AgentChip>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-sm text-foreground">{authorOf(revision)}</span>
                <span className="truncate text-sm tabular-nums text-muted-foreground">{formatDate(revision.createdAt)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-2.5 justify-self-end"
                  onClick={() => {
                    rollback.reset();
                    setPending(revision);
                  }}
                  disabled={rollback.isPending}
                >
                  <RotateCcw />
                  {translateUi("interfaceUpdates.restore_a76e13b9")}
                </Button>
              </div>
            ))}
          </div>
        )}
        {restoreError && pending === null ? (
          <p role="alert" className="text-sm text-destructive">{restoreError}</p>
        ) : null}
      </DialogContent>
      <AlertDialog open={pending !== null} onOpenChange={(next) => (next ? undefined : setPending(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translateUi("interfaceUpdates.restore_this_version_2bfce226")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? translateUi("interfaceUpdates.continuing_will_restore_value_s_identity_and_confi_d84ec5e0", { value1: (agent.name), value2: (formatDate(pending.createdAt)) })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending ? (
            <div className="flex flex-col gap-2 rounded-lg bg-(--agent-detail-tile) p-4">
              <span className="text-xs text-muted-foreground">
                {formatDate(pending.createdAt)} {translateUi("interfaceUpdates.by_73e9b787")} {authorOf(pending)}
              </span>
              <span className="text-sm text-foreground">{revisionSummary(pending)}</span>
              {pending.changedKeys.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {pending.changedKeys.map((key) => (
                    <AgentChip key={key} mono>
                      {key}
                    </AgentChip>
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}
          {restoreError ? (
            <p role="alert" className="text-sm text-destructive">{restoreError}</p>
          ) : null}
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel>{translateUi("interfaceUpdates.cancel_19766ed6")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={rollback.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pending) rollback.mutate(pending.id);
              }}
            >
              <RotateCcw />
              {rollback.isPending ? translateUi("fullRoutinesSecrets.restoring") : translateUi("interfaceUpdates.restore_version_523c5d0e")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
