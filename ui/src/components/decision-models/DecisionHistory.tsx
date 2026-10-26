import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { DecisionHistoryEntry } from "@paperclipai/shared";
import { decisionModelsApi } from "@/api/decision-models";
import { Link } from "@/lib/router";
import { formatDateTime, formatTokens, formatDetailedCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DecisionHistoryTable({ entries, fastResponse = false, fastResponsesEnabled = true }: { entries: (DecisionHistoryEntry & { publicationStatus?: string; connectionName?: string | null })[]; fastResponse?: boolean; fastResponsesEnabled?: boolean }) {
  useFullSharedTranslation();
  if (!entries.length) return <p className="text-sm text-muted-foreground">{fastResponse ? fullSharedT("fullShared.no_fast_responses_in_this_period_ec54a7") : fullSharedT("fullShared.no_decision_requests_in_this_period_4fba71")} <Link to={fastResponse && !fastResponsesEnabled ? "/company/settings/instance/experimental" : "/company/settings/connections"} className="underline underline-offset-4">{fastResponse ? fastResponsesEnabled ? fullSharedT("fullShared.configure_fast_response_0213c4") : fullSharedT("fullShared.enable_experimental_fast_responses_9be2d1") : fullSharedT("fullShared.configure_a_decision_model_b30518")}</Link>{fullSharedT("fullShared.to_run_a_test_22a458")}</p>;
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.recent_requests_inputs_are_not_retained_34cf72")}</p>
    <div className="overflow-x-auto"><table className="w-full text-sm" aria-label={fastResponse ? fullSharedT("costsUi.fastResponses") : fullSharedT("fullShared.decision_requests_f78eb6")}>
      <thead><tr className="border-b border-border text-muted-foreground">{[fullSharedTailT("fullSharedTail.display_d5a50c2ca979"), fullSharedTailT("fullSharedTail.display_96c8f546393d"), fullSharedTailT("fullSharedTail.display_a7827b697563"), ...(fastResponse ? [fullSharedTailT("fullSharedTail.display_116f674ca650")] : []), fullSharedTailT("fullSharedTail.display_c1c699a1c1b8"), fullSharedTailT("fullSharedTail.display_8a699d7c083d"), fullSharedTailT("fullSharedTail.display_21e0e5ed70ac"), fullSharedTailT("fullSharedTail.display_ce12ed70ed26"), fullSharedTailT("fullSharedTail.display_a194ce03ee7b")].map(label => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}</tr></thead>
      <tbody>{entries.map(row => <tr key={row.id} className="border-b border-border last:border-0">
        <td className="px-3 py-3"><div className="whitespace-nowrap">{formatDateTime(row.startedAt)}</div><div className="text-xs text-muted-foreground">{row.feature === "settings.test" ? fullSharedT("fullShared.setup_test_d3ed47") : row.feature}</div></td>
        <td className="px-3 py-3">{row.actorType === "system" ? fullSharedT("fullShared.paperclip_services_648538") : row.userName ?? (row.responsibleUserId === "local-board" ? fullSharedT("profile.board") : fullSharedT("fullShared.former_user_6f48f0"))}</td>
        <td className="px-3 py-3">{row.issueId ? <Link className="underline underline-offset-4" to={`/issues/${row.issueIdentifier ?? row.issueId}`}>{row.issueIdentifier ?? fullSharedT("taskProperties.fields.viewTask")}</Link> : "—"}</td>
        {fastResponse && <td className="px-3 py-3">{row.connectionName ?? (row.connectionId ? fullSharedT("fullShared.removed_connection_121009") : "—")}</td>}
        <td className="px-3 py-3 font-mono text-xs">{row.model}</td>
        <td className="px-3 py-3"><div>{row.status === "succeeded" ? fullSharedT("taskDisplay.external.category.succeeded") : row.status === "running" ? fullSharedT("fullShared.running_f4ccae") : row.status === "unknown" ? fullSharedT("fullShared.unresolved_36afca") : row.status === "skipped" ? fullSharedT("fullShared.skipped_12698c") : row.status === "pending" ? fullSharedT("fullShared.pending_331551") : fullSharedT("fullShared.failed_031a8f")}</div>{row.publicationStatus && <div className="text-xs text-muted-foreground">{row.publicationStatus}</div>}{row.errorCode && <div className="text-xs text-muted-foreground">{row.errorCode.replaceAll("_", " ")}</div>}</td>
        <td className="px-3 py-3 font-mono">{row.durationMs === null ? "—" : fullSharedT("fullShared.s_e46818", { value1: (row.durationMs / 1000).toFixed(1) })}</td>
        <td className="whitespace-nowrap px-3 py-3 font-mono">{row.inputTokens === null ? "—" : formatTokens(row.inputTokens)} / {row.outputTokens === null ? "—" : formatTokens(row.outputTokens)}</td>
        <td className="px-3 py-3 font-mono"><div>{row.costCents === null ? fullSharedT("fullShared.unknown_b764cd") : formatDetailedCents(row.costCents)}</div>{row.costStatus !== "unpriced" && row.costStatus && <span className="text-xs text-muted-foreground">{row.costStatus === "estimated" ? fullSharedT("costsUi.estimated") : fullSharedT("fullShared.reported_34540b")}</span>}</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
export function DecisionHistory({ companyId, from, to }: { companyId: string; from?: string | null; to?: string | null }) {
  useFullSharedTranslation();
  const query = useQuery({ queryKey: ["decision-history", companyId, from, to], queryFn: () => decisionModelsApi.history(companyId, from, to), refetchInterval: q => q.state.data?.some(row => row.status === "running") ? 5000 : false });
  if (query.isPending) return <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_decision_requests_ec462b")}</p>;
  if (query.error) return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{fullSharedT("fullShared.could_not_load_decision_requests_4daac4")}</p><Button variant="outline" onClick={() => void query.refetch()}>{fullSharedT("fullShared.try_again_d8b839")}</Button></div>;
  return <DecisionHistoryTable entries={query.data ?? []} />;
}
