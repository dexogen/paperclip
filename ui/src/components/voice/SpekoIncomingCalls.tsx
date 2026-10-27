import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { VoiceInboundCall } from "@paperclipai/shared";
import { voicePhoneApi } from "@/api/voicePhone";
import { issuesApi } from "@/api/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export interface SpekoIncomingCallCardProps { call: VoiceInboundCall; tasks?: {id: string; label: string}[]; busy?: boolean; error?: string; onDecide(input: {approve: boolean; approvalCode: string; issueId?: string}): void }
export function SpekoIncomingCallCard({call, tasks = [], busy, error, onDecide}: SpekoIncomingCallCardProps) {
  useFullSharedTranslation();
  const [code, setCode] = useState(""), [issueId, setIssueId] = useState(""), [invalid, setInvalid] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = ["guest_intake", "awaiting_approval", "approving"].includes(call.state);
  useEffect(() => { if (!pending) heading.current?.focus(); }, [pending]);
  if (call.state === "guest_intake") return <section className="max-w-xl space-y-3 rounded-md border border-border p-3" aria-label={fullSharedT("fullShared.incoming_conversation_27aa01")}>
    <h3 className="text-sm font-semibold">{fullSharedT("fullShared.incoming_conversation_27aa01")}</h3>
    {call.intakeIssueId && <Link className="text-sm text-primary underline" to={`/issues/${call.intakeIssueId}`}>{fullSharedT("fullShared.open_conversation_task_6a851d")}</Link>}
    <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.this_caller_is_talking_to_the_agent_in_a_new_low_tru_da9ff6")}</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="outline" disabled={busy} onClick={() => onDecide({approve: false, approvalCode: call.approvalCode})}>{fullSharedT("fullShared.end_call_2fe13d")}</Button>
  </section>;
  return <section className="max-w-xl space-y-3 rounded-md border border-border p-3" aria-label={fullSharedT("fullShared.incoming_call_approval_9695da")}>
    <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold">{call.state === "approved" ? fullSharedT("fullShared.call_approved_c38507") : call.state === "denied" ? fullSharedT("fullShared.call_denied_8a6282") : call.state === "expired" ? fullSharedT("fullShared.call_expired_e36d90") : call.state === "ended" ? fullSharedT("fullShared.caller_hung_up_03406d") : fullSharedT("fullShared.incoming_call_awaiting_approval_cfd62d")}</h3>
    {call.intakeIssueId && <Link className="text-sm text-primary underline" to={`/issues/${encodeURIComponent(call.intakeIssueId)}`}>{fullSharedT("fullShared.review_phone_intake_b701b7")}</Link>}
    {pending ? <form className="space-y-3" onSubmit={event => {event.preventDefault(); if (code !== call.approvalCode) {setInvalid(true); return;} setInvalid(false); onDecide({approve: true, approvalCode: code, ...(issueId ? {issueId} : {})});}}>
      <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.approve_only_the_call_you_are_currently_on_enter_the_641ca5")}</p>
      <label className="grid gap-2 text-sm font-medium">{fullSharedT("fullShared.code_spoken_on_your_call_9b8250")}<Input inputMode="numeric" autoComplete="off" maxLength={6} value={code} disabled={busy} aria-invalid={invalid} onChange={event => {setCode(event.target.value); setInvalid(false);}} /></label>
      <label className="grid min-w-0 gap-2 text-sm font-medium">{fullSharedT("fullShared.conversation_task_810df1")}<select aria-label={fullSharedT("fullShared.conversation_task_810df1")} className="w-full min-w-0 rounded-md border border-input bg-background p-2 text-sm" disabled={busy} value={issueId} onChange={event => setIssueId(event.target.value)}><option value="">{fullSharedT("fullShared.continue_your_conversation_or_create_one_7ade6a")}</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label>
      {invalid && <p role="alert" className="text-sm text-destructive">{fullSharedT("fullShared.that_code_does_not_match_this_live_call_ask_the_phon_a5b82f")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" disabled={busy} onClick={() => onDecide({approve: false, approvalCode: call.approvalCode})}>{fullSharedT("fullShared.deny_call_091006")}</Button><Button type="submit" disabled={busy}>{busy ? fullSharedT("fullShared.confirming_b9378c") : fullSharedT("fullShared.approve_live_call_65be57")}</Button></div>
    </form> : <p className="text-sm text-muted-foreground">{call.state === "approved" ? fullSharedT("fullShared.approval_was_sent_for_this_call_earlier_instructions_039c04") : fullSharedT("fullShared.this_call_cannot_access_your_private_tasks_970613")}</p>}
  </section>;
}
export function SpekoIncomingCalls({companyId, endpointId, agentId}: {companyId: string; endpointId: string; agentId: string}) {
  useFullSharedTranslation();
  const [decision, setDecision] = useState<VoiceInboundCall>();
  const host = useRef<HTMLDivElement>(null), restoreTaskFocus = useRef(false);
  useEffect(() => {
    if (!decision) return;
    // The pending-call API omits approved calls; this is a brief confirmation,
    // not a live status indicator after the caller hangs up.
    const timeout = setTimeout(() => setDecision(undefined), 5000);
    return () => clearTimeout(timeout);
  }, [decision]);
  useEffect(() => { setDecision(undefined); restoreTaskFocus.current = false; }, [companyId, endpointId]);
  const query = useQuery({queryKey: ["speko-incoming", companyId, endpointId], queryFn: () => voicePhoneApi.incoming(companyId, endpointId), refetchInterval: 2000, retry: false});
  const needsTaskSelection = Boolean(query.data?.some(call => ["awaiting_approval", "approving"].includes(call.state)));
  const tasks = useQuery({queryKey: ["speko-approval-tasks", companyId, agentId], queryFn: () => issuesApi.list(companyId, {assigneeAgentId: agentId}), enabled: needsTaskSelection, retry: false});
  useEffect(() => {
    if (restoreTaskFocus.current && !tasks.isFetching && !tasks.isError) {
      restoreTaskFocus.current = false;
      host.current?.querySelector<HTMLSelectElement>('select[aria-label="Conversation task"]')?.focus();
    }
  }, [tasks.data, tasks.isFetching, tasks.isError]);
  const mutation = useMutation({mutationFn: ({id, ...input}: {id: string; approve: boolean; approvalCode: string; issueId?: string}) => voicePhoneApi.decide(companyId, endpointId, id, input), onSuccess: result => { setDecision(result); return query.refetch(); }});
  return <div ref={host} className="space-y-3">{needsTaskSelection && tasks.isError && <div role="alert" className="space-y-2 text-sm"><p>{fullSharedT("fullShared.task_list_could_not_be_loaded_retry_to_choose_an_exi_0be72f")}</p><Button variant="outline" disabled={tasks.isFetching} onClick={() => { restoreTaskFocus.current = true; void tasks.refetch().then(result => { if (result.isError) restoreTaskFocus.current = false; }); }}>{fullSharedT("fullShared.retry_tasks_3d79ea")}</Button></div>}{query.error && <p role="alert" className="text-sm text-destructive"><FullSharedTrans i18nKey="fullShared.incoming_call_approval_is_unavailable_42341f" components={{ part1: <>{query.error.message}</> }} /></p>}{!query.error && [...(query.data ?? []).filter(call => call.id !== decision?.id), ...(decision ? [decision] : [])].map(call => <SpekoIncomingCallCard key={call.id} call={call} tasks={tasks.data?.filter(task => !["done", "cancelled"].includes(task.status)).map(task => ({id: task.id, label: `${task.identifier ?? fullSharedTailT("fullSharedTail.task")} · ${task.title}`}))} busy={mutation.isPending && mutation.variables?.id === call.id} error={mutation.variables?.id === call.id ? mutation.error?.message : undefined} onDecide={input => mutation.mutate({id: call.id, ...input})} />)}</div>;
}
