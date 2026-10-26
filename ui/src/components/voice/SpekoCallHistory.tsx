import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { VoiceCallHistoryEntry, VoiceCallReport, VoiceUnapprovedCallHistoryEntry } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { voiceSessionsApi } from "@/api/voiceSessions";
import { voicePhoneApi } from "@/api/voicePhone";
import { voiceHistoryApi } from "@/api/voiceHistory";

function charge(amount: string | null) {
  if (amount === null) return fullSharedTailT("fullSharedTail.notReportedYet");
  const value = BigInt(amount);
  const whole = value / 1_000_000n, fraction = (value % 1_000_000n).toString().padStart(6, "0");
  return `$${whole}.${fraction} USD`;
}
export function SpekoCallReport({ report }: { report: VoiceCallReport }) {
  useFullSharedTranslation();
  return <div className="space-y-3">
    <dl className="flex flex-wrap gap-4 text-sm"><div><dt className="text-muted-foreground">{fullSharedT("fullShared.speko_charge_815b4d")}</dt><dd>{charge(report.costMicroUsd)}</dd></div>{report.durationSeconds !== null && <div><dt className="text-muted-foreground">{fullSharedT("fullShared.duration_4fc52a")}</dt><dd><FullSharedTrans i18nKey="fullShared.seconds_6ee4b4" components={{ part1: <>{report.durationSeconds}</> }} /></dd></div>}</dl>
    <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.agent_costs_are_separate_recordings_remain_in_speko_471b78")}</p>
    {report.transcript.length ? <ol aria-label={fullSharedT("fullShared.call_transcript_12c822")} className="space-y-3">{report.transcript.map(turn => <li key={turn.id} className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{turn.speaker === "caller" ? fullSharedT("taskDisplay.assignees.you") : fullSharedT("taskProperties.fields.agent")}{turn.interrupted ? fullSharedTailT("fullSharedTail.interrupted") : ""}</p><p className="whitespace-pre-wrap break-words text-sm">{turn.text}</p></li>)}</ol>
      : <p className="text-sm text-muted-foreground">{report.status === "unavailable" ? fullSharedT("fullShared.the_transcript_is_unavailable_paperclip_will_retry_w_2f95e0") : report.status === "pending" ? fullSharedT("fullShared.the_transcript_will_appear_after_speko_finishes_the__ab7e3e") : fullSharedT("fullShared.speko_did_not_provide_a_transcript_for_this_call_2c08af")}</p>}
  </div>;
}
const modeNames = { get browser() { return fullSharedTailT("fullSharedTail.modeNames_browser"); }, get inbound_phone() { return fullSharedTailT("fullSharedTail.modeNames_inbound_phone"); }, get outbound_phone() { return fullSharedTailT("fullSharedTail.modeNames_outbound_phone"); } } as const;
const stateNames = { get reserved() { return fullSharedTailT("fullSharedTail.stateNames_reserved"); }, get creating() { return fullSharedTailT("fullSharedTail.stateNames_creating"); }, get creation_unknown() { return fullSharedTailT("fullSharedTail.stateNames_creation_unknown"); }, get connecting() { return fullSharedTailT("fullSharedTail.stateNames_connecting"); }, get active() { return fullSharedTailT("fullSharedTail.stateNames_active"); }, get awaiting_approval() { return fullSharedTailT("fullSharedTail.stateNames_awaiting_approval"); }, get ending() { return fullSharedTailT("fullSharedTail.stateNames_ending"); }, get ended() { return fullSharedTailT("fullSharedTail.stateNames_ended"); }, get failed() { return fullSharedTailT("fullSharedTail.stateNames_failed"); }, get expired() { return fullSharedTailT("fullSharedTail.stateNames_expired"); } } as const;
export function SpekoCallActivityItem({ entry: { session, report }, onEnd, ending, presentation = "history" }: { entry: VoiceCallHistoryEntry; onEnd?(sessionId: string): void; ending?: boolean; presentation?: "history" | "activity" }) {
  useFullSharedTranslation();
  const summary = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current && ["ended", "failed", "expired"].includes(session.state)) { summary.current?.focus(); restoreFocus.current = false; }
  }, [session.state]);
  return <details data-activity-kind="call" className={presentation === "activity" ? "px-2 py-3 transition-colors hover:bg-accent/50" : "rounded-md border border-border p-3"}>
    <summary ref={summary} className="cursor-pointer break-words text-sm font-medium">{modeNames[session.mode]} · {stateNames[session.state]}<span className="ml-2 text-xs font-normal text-muted-foreground">{new Date(session.createdAt).toLocaleString()}</span></summary>
    <div className="mt-3 space-y-3"><Link className="text-sm text-primary underline" to={`/issues/${encodeURIComponent(session.issueId)}`}>{fullSharedT("fullShared.conversation_task_810df1")}</Link>
      {session.errorCode && <p className="text-sm text-muted-foreground">{session.errorCode === "cleanup_pending" ? fullSharedT("fullShared.confirming_call_cleanup_with_speko_0365c8") : fullSharedT("fullShared.this_call_encountered_a_connection_problem_check_you_e8d652")}</p>}
      {!session.endedAt && !["ended", "failed", "expired"].includes(session.state) && session.callerAuthority !== "guest_intake" && onEnd && <Button size="sm" variant="outline" disabled={ending} onClick={() => { restoreFocus.current = true; onEnd(session.id); }}>{ending ? fullSharedT("fullShared.ending_3677a3") : fullSharedT("fullShared.end_call_2fe13d")}</Button>}
      <SpekoCallReport report={report} />
    </div>
  </details>;
}
export function SpekoUnapprovedCallActivityItem({ call, presentation = "history" }: { call: VoiceUnapprovedCallHistoryEntry; presentation?: "history" | "activity" }) {
  useFullSharedTranslation();
  return <div data-activity-kind="unapproved_call" className={presentation === "activity" ? "px-2 py-3 text-sm" : "rounded-md border border-border p-3 text-sm"}><p>{call.state === "denied" ? fullSharedT("fullShared.call_denied_8a6282") : call.state === "expired" ? fullSharedT("fullShared.approval_expired_70d86a") : fullSharedT("fullShared.missed_call_f203af")} · {new Date(call.createdAt).toLocaleString()}</p><p className="text-xs text-muted-foreground">{fullSharedT("fullShared.no_private_task_was_connected_a9e349")}</p></div>;
}
export interface SpekoCallHistoryViewProps { entries?: VoiceCallHistoryEntry[]; unapprovedCalls?: VoiceUnapprovedCallHistoryEntry[]; loading?: boolean; error?: string; incomingError?: string; endError?: string; onRetry(): void; onEnd?(sessionId: string): void; endingSessionId?: string }
export function SpekoCallHistoryView({ entries = [], unapprovedCalls = [], loading, error, incomingError, endError, onRetry, onEnd, endingSessionId }: SpekoCallHistoryViewProps) {
  useFullSharedTranslation();
  return <section className="max-w-xl space-y-3" aria-label={fullSharedT("fullShared.your_calls_016498")}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{fullSharedT("fullShared.your_calls_016498")}</h2><Button size="sm" variant="ghost" onClick={onRetry} disabled={loading}>{fullSharedT("externalAgentUi.common.refresh")}</Button></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_calls_e9461c")}</p>}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={onRetry}>{fullSharedT("fullShared.try_again_d8b839")}</Button></div>}
    {incomingError && <p role="alert" className="text-sm text-destructive"><FullSharedTrans i18nKey="fullShared.unapproved_calls_could_not_be_loaded_ac4613" components={{ part1: <>{incomingError}</> }} /></p>}
    {endError && <p role="alert" className="text-sm text-destructive"><FullSharedTrans i18nKey="fullShared.the_call_could_not_be_ended_fedc71" components={{ part1: <>{endError}</> }} /></p>}
    {!loading && !error && !incomingError && !entries.length && !unapprovedCalls.length && <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.your_browser_conversations_and_phone_calls_will_appe_fe78d4")}</p>}
    {!error && entries.map(entry => <SpekoCallActivityItem key={entry.session.id} entry={entry} onEnd={onEnd} ending={endingSessionId === entry.session.id} />)}
    {!incomingError && unapprovedCalls.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">{fullSharedT("fullShared.unapproved_incoming_calls_fa4c7b")}</h3><ul className="space-y-2">{unapprovedCalls.map(call => <li key={call.id}><SpekoUnapprovedCallActivityItem call={call} /></li>)}</ul></div>}
  </section>;
}
export function useSpekoCallHistory(companyId: string, endpointId: string, enabled = true) {
  const query = useQuery({ queryKey: ["speko-history", companyId, endpointId], queryFn: () => voiceHistoryApi.list(companyId, endpointId), enabled, retry: false, refetchInterval: enabled ? 30_000 : false });
  const incoming = useQuery({queryKey: ["speko-unapproved-history", companyId, endpointId], queryFn: () => voicePhoneApi.history(companyId, endpointId), retry: false, enabled: enabled && query.isSuccess, refetchInterval: enabled ? 30_000 : false});
  const ending = useMutation({mutationFn: (sessionId: string) => voiceSessionsApi.end(companyId, sessionId), onSuccess: () => query.refetch()});
  return { entries: query.data ?? [], unapprovedCalls: incoming.data ?? [], loading: query.isLoading || incoming.isLoading, error: query.error?.message, incomingError: incoming.error?.message, endError: ending.error?.message, endingSessionId: ending.isPending ? ending.variables : undefined,
    onEnd: (sessionId: string) => ending.mutate(sessionId), onRetry: () => { ending.reset(); void query.refetch(); void incoming.refetch(); } };
}
export function SpekoCallHistory({ companyId, endpointId }: { companyId: string; endpointId: string }) {
  useFullSharedTranslation();
  return <SpekoCallHistoryView {...useSpekoCallHistory(companyId, endpointId)} />;
}
