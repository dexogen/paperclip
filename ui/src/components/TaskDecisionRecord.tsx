import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQueryView } from "@/components/QueryView";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { decisionsApi } from "@/api/decisions";
import { useLocation } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { taskChatHashAnchor } from "./task-chat/scroll-navigation";
import { DecisionResolver } from "./DecisionResolver";
import { Button } from "./ui/button";

/** A selected Decisions-v1 record belongs to its task, not a second history tab. */
export function TaskDecisionRecord({ companyId, issueId, viewerId, agentMap }: {
  companyId: string; issueId: string; viewerId: string | null; agentMap?: Map<string, Agent>;
}) {
  useUiTranslation();
  const { hash } = useLocation();
  const anchor = taskChatHashAnchor(hash);
  const decisionId = anchor?.startsWith("decision-") ? anchor.slice("decision-".length) : null;
  const record = useQuery({
    queryKey: queryKeys.decisions.taskRecord(companyId, issueId, viewerId, decisionId),
    queryFn: () => decisionsApi.get(decisionId!), enabled: !!decisionId, });
  const recordView = useQueryView(record);
  if (!decisionId) return null;
  const decision = record.data;
  const matchesTask = decision?.companyId === companyId && decision.originIssueId === issueId;
  const choice = decision?.options.find((option) => option.id === decision.chosenOptionId);
  return <section id={anchor!} aria-label={translateUi("interfaceUpdates.decision_record_c33f22e6")} className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="text-sm font-medium">{translateUi("interfaceUpdates.decision_record_c33f22e6")}</h2>
    {["loading", "reconnecting"].includes(recordView.kind) ? <p role="status" className="text-sm text-muted-foreground">{translateUi("decisionForms.common.loadingDecision")}</p> : (recordView.kind === "error") ? (
      <div role="alert" className="text-sm"><p>{translateUi("interfaceUpdates.could_not_load_this_decision_004853ea")}</p><Button size="sm" variant="ghost" onClick={() => void record.refetch()}>{translateUi("newIssue.retry")}</Button></div>
    ) : !matchesTask ? <p role="alert" className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.this_decision_is_not_available_in_this_task_23e9834f")}</p> : <>
      {decision.status !== "open" ? <dl className="space-y-2 text-sm">
        <div><dt className="text-muted-foreground">{translateUi("interfaceUpdates.recorded_choice_41bdde87")}</dt><dd>{choice?.label ?? (decision.chosenOptionId === "dismissed" ? translateUi("interfaceUpdates.dismissed_9d747277") : decision.status)}</dd></div>
        {(decision.inputs ?? []).filter((input) => decision.inputValues?.[input.id] !== undefined).map((input) => <div key={input.id}>
          <dt className="text-muted-foreground">{input.label}</dt><dd className="whitespace-pre-wrap">{decision.inputValues![input.id]}</dd>
        </div>)}
      </dl> : null}
      <DecisionResolver companyId={companyId} decisionId={decisionId} agentMap={agentMap} initialDecision={decision}
        recordedDecision={decision.status === "open" ? undefined : decision} onResolved={() => { void record.refetch(); }} />
    </>}
  </section>;
}
