import { t as fullSharedTailT, Trans as FullSharedTailTrans, useTranslation as useFullSharedTailTranslation } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VoicePhoneConfiguration } from "@paperclipai/shared";
import { voicePhoneApi } from "@/api/voicePhone";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
export interface SpekoPhoneLineFormProps { configuration?: VoicePhoneConfiguration; loading?: boolean; saving?: boolean; saved?: boolean; error?: string; onRefresh(): void; onSave(input: {numberId: string; enabled: boolean; guestIntake?: boolean; lowTrustEnvironmentId?: string | null}): void }
export function SpekoPhoneLineForm({configuration, loading, saving, saved, error, onRefresh, onSave}: SpekoPhoneLineFormProps) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const [numberId, setNumberId] = useState(configuration?.number?.id ?? ""), [enabled, setEnabled] = useState(configuration?.number?.enabled ?? false), [guestIntake, setGuestIntake] = useState(configuration?.number?.guestIntake ?? false), [invalid, setInvalid] = useState(false), [environmentId, setEnvironmentId] = useState(configuration?.number?.lowTrustEnvironmentId ?? "");
  useEffect(() => {setNumberId(configuration?.number?.id ?? ""); setEnabled(configuration?.number?.enabled ?? false); setGuestIntake(configuration?.number?.guestIntake ?? false); setEnvironmentId(configuration?.number?.lowTrustEnvironmentId ?? "");}, [configuration]);
  const selected = configuration?.inventory.find(n => n.id === numberId);
  return <section className="max-w-xl space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{fullSharedT("fullShared.incoming_calls_820afd")}</h2><Button size="sm" variant="ghost" disabled={loading || saving} onClick={onRefresh}>{fullSharedT("fullShared.refresh_numbers_37c72c")}</Button></div>
    <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.let_callers_start_a_conversation_in_a_new_task_or_re_cf245f")}</p>
    {loading && <p role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_speko_numbers_01b34b")}</p>}
    {!loading && !configuration?.inventory.length && <p className="text-sm text-muted-foreground"><FullSharedTrans i18nKey="fullShared.no_numbers_are_available_complete_verification_and_a_a8b92c" components={{ part1: <a className="text-primary underline" href="https://platform.speko.ai" target="_blank" rel="noreferrer">{fullSharedTailT("fullSharedTail.buy_or_import_a_number_in_speko_02d57f")}</a> }} /></p>}
    <form className="space-y-3" onSubmit={event => {event.preventDefault(); if (!numberId || !selected?.available) {setInvalid(true); return;} setInvalid(false); onSave({numberId, enabled, guestIntake, lowTrustEnvironmentId: environmentId || null});}}>
      <label className="grid min-w-0 gap-2 text-sm font-medium">{fullSharedT("fullShared.company_phone_number_3e4ef5")}<select aria-label={fullSharedT("fullShared.company_phone_number_3e4ef5")} disabled={loading || saving} className="min-w-0 w-full rounded-md border border-input bg-background p-2 text-sm" value={numberId} onChange={event => {setNumberId(event.target.value); setInvalid(false);}}><option value="">{fullSharedT("fullShared.select_a_number_115578")}</option>{configuration?.inventory.map(n => <option key={n.id} value={n.id} disabled={!n.available}>{n.phoneNumber}{n.label ? ` · ${n.label}` : ""}{!n.available ? fullSharedTailT("fullSharedTail.unavailable") : ""}</option>)}</select></label>
      {selected && !selected.inboundReady && <p className="text-sm text-muted-foreground"><FullSharedTrans i18nKey="fullShared.complete_number_setup_in_speko_before_enabling_incom_ce9b55" components={{ part1: <>{selected.issues.length ? ` ${selected.issues.join(". ")}` : ""}</> }} /></p>}
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabled} disabled={loading || saving} onCheckedChange={value => setEnabled(value === true)} />{fullSharedT("fullShared.enable_incoming_calls_on_this_number_4c6e87")}</label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={guestIntake} disabled={loading || saving} onCheckedChange={value => setGuestIntake(value === true)} />{fullSharedT("fullShared.let_callers_start_new_low_trust_tasks_without_sign_i_1d3095")}</label>
      {guestIntake && <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.each_call_gets_its_own_task_the_assigned_agent_can_d_bfdea4")}</p>}
      {guestIntake && <label className="grid min-w-0 gap-2 text-sm font-medium">{fullSharedT("fullShared.execution_sandbox_56eefa")}<select aria-label={fullSharedT("fullShared.execution_sandbox_56eefa")} disabled={loading || saving} className="min-w-0 w-full rounded-md border border-input bg-background p-2 text-sm" value={environmentId} onChange={event => setEnvironmentId(event.target.value)}><option value="">{fullSharedT("fullShared.use_this_agent_s_sandbox_d2be99")}</option>{configuration?.sandboxEnvironments?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><span className="text-sm font-normal text-muted-foreground">{fullSharedT("fullShared.only_new_incoming_tasks_use_this_setting_low_trust_w_98374f")}</span></label>}
      {invalid && <p role="alert" className="text-sm text-destructive">{fullSharedT("fullShared.choose_an_available_company_phone_number_84f383")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{saved ? fullSharedT("fullShared.incoming_call_setting_saved_c1e033") : ""}</p><Button type="submit" disabled={loading || saving}>{saving ? fullSharedT("fullShared.saving_23e392") : fullSharedT("fullShared.save_incoming_call_setting_5a6473")}</Button></div>
    </form>
  </section>;
}
export function SpekoPhoneLine({companyId, endpointId}: {companyId: string; endpointId: string}) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const queryClient = useQueryClient(), key = ["speko-phone-line", companyId, endpointId];
  const query = useQuery({queryKey: key, queryFn: () => voicePhoneApi.configuration(companyId, endpointId), retry: false});
  const mutation = useMutation({mutationFn: (input: {numberId: string; enabled: boolean; guestIntake?: boolean; lowTrustEnvironmentId?: string | null}) => voicePhoneApi.save(companyId, endpointId, input), onSuccess: data => queryClient.setQueryData(key, data)});
  return <SpekoPhoneLineForm configuration={query.data} loading={query.isLoading} saving={mutation.isPending} saved={mutation.isSuccess} error={(mutation.error ?? query.error)?.message} onRefresh={() => void query.refetch()} onSave={input => mutation.mutate(input)} />;
}
