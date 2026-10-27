import { t as fullSharedTailT, Trans as FullSharedTailTrans, useTranslation as useFullSharedTailTranslation } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Clock3 } from "lucide-react";
import type { CaseDetail, CaseHandoffView } from "@/api/cases";
import { AgentIdentity } from "@/components/AgentIdentity";
import type { AvatarAgent } from "@/components/AgentAvatar";
import { IssueReferencePill } from "@/components/IssueReferencePill";
import { IssueStatusBadge } from "@/components/StatusBadge";
import { PropertyRow } from "@/components/issue-properties/primitives";

export type CaseAgentMap = ReadonlyMap<string, AvatarAgent & { status?: string }>;

export function CaseWorkSummary({ caseData, pendingHandoff, agents }: {
  caseData: CaseDetail;
  pendingHandoff?: CaseHandoffView | null;
  agents?: CaseAgentMap;
}) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const task = caseData.workIssue;
  const pending = pendingHandoff === undefined ? caseData.pendingHandoff : pendingHandoff;
  const assignee = task?.assigneeAgentId ? agents?.get(task.assigneeAgentId) ?? {
    id: task.assigneeAgentId,
    name: task.assigneeAgentName ?? "Agent",
  } : null;
  const from = pending?.fromAgentId ? agents?.get(pending.fromAgentId)?.name ?? pending.fromAgentName ?? "the previous agent" : "the previous agent";
  const to = pending ? (pending.toAgentId ? agents?.get(pending.toAgentId)?.name : null) ?? pending.toAgentName ?? "the receiving agent" : null;
  const destination = pending?.toAgentId ? agents?.get(pending.toAgentId) : null;
  const waiting = pending?.destinationKind === "done" ? "Case will close when the task is complete." : pending?.lastError
    ?? (pending?.state === "awaiting_release" ? `Waiting for ${from} to finish.`
      : destination?.status === "paused" ? `${to} is paused.` : `Waiting for ${to} to start.`);

  return <section className="space-y-3" aria-label={fullSharedT("fullShared.case_work_a81fc1")}>
    <h2 className="text-sm font-semibold">{fullSharedT("sidebar.work")}</h2>
    {caseData.workIssueId ? <div className="space-y-3">
      {task ? <div>
        <PropertyRow label={fullSharedT("taskDetailCommon.editor.task")}><IssueReferencePill issue={task} className="min-h-11 md:min-h-0" /></PropertyRow>
        <PropertyRow label={fullSharedT("fullShared.workflow_2e2d5c")}><span className="text-sm">{caseData.workflow?.name ?? fullSharedT("surfacesGap.audit.instructions")}</span></PropertyRow>
        {caseData.phase && <PropertyRow label={fullSharedT("fullShared.phase_46342e")}><span className="text-sm">{caseData.phase}</span></PropertyRow>}
        <PropertyRow label={fullSharedT("taskProperties.fields.agent")}>{assignee ? <AgentIdentity agent={assignee} size="xs" /> : <span className="text-sm text-muted-foreground">{fullSharedT("fullShared.unassigned_14d33b")}</span>}</PropertyRow>
        <PropertyRow label={fullSharedT("runUi.blocker.taskStatus")}><IssueStatusBadge status={task.status} /></PropertyRow>
      </div> : <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.the_primary_task_is_unavailable_f9b441")}</p>}
      {pending && pending.state !== "delivered" && pending.state !== "completed" && pending.state !== "cancelled" && <div className="flex items-start gap-2 text-sm">
        <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          {pending.state === "awaiting_release" && <p><FullSharedTrans i18nKey="fullShared.next_a50ee5" components={{ part1: <>{pending.workflowTransition?.to.name ?? fullSharedTailT("fullSharedTail.case_instructions_b4833c")}</>, part2: <>{pending.phase}</> }} /></p>}
          <p className="text-xs leading-relaxed text-muted-foreground">{waiting}</p>
        </div>
      </div>}
    </div> : <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.no_task_linked_9ab7ec")}</p>}
  </section>;
}
