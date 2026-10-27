import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { voiceCallbacksApi } from "@/api/voiceCallbacks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { VoiceCallbackPreference } from "@paperclipai/shared";
export interface SpekoPhoneCallbackFormProps {
  preference?: VoiceCallbackPreference | null;
  loading?: boolean; saving?: boolean; error?: string; saved?: boolean;
  onSave(preference: VoiceCallbackPreference): void;
}
export function SpekoPhoneCallbackForm({ preference, loading, saving, error, saved, onSave }: SpekoPhoneCallbackFormProps) {
  useFullSharedTranslation();
  const [phoneNumber, setPhoneNumber] = useState(preference?.phoneNumber ?? "");
  const [enabled, setEnabled] = useState(preference?.enabled ?? false);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setPhoneNumber(preference?.phoneNumber ?? ""); setEnabled(preference?.enabled ?? false); }, [preference]);
  return <section className="max-w-xl space-y-3">
    <h2 className="text-lg font-semibold">{fullSharedT("fullShared.call_my_phone_b4bf17")}</h2>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) { setInvalid(true); return; } setInvalid(false); onSave({ phoneNumber, enabled }); }}>
      <label className="grid gap-2 text-sm font-medium">{fullSharedT("fullShared.your_callback_number_ecf486")}<Input type="tel" autoComplete="tel" placeholder="+12015551234" value={phoneNumber} disabled={loading || saving} aria-invalid={invalid} aria-describedby={invalid ? "speko-phone-error" : undefined} onChange={event => { setPhoneNumber(event.target.value); setInvalid(false); }} /></label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabled} disabled={loading || saving} onCheckedChange={value => setEnabled(value === true)} />{fullSharedT("fullShared.allow_this_agent_to_call_me_about_my_tasks_076d88")}</label>
      {invalid && <p id="speko-phone-error" role="alert" className="text-sm text-destructive">{fullSharedT("fullShared.use_an_international_number_beginning_with_and_the_c_41ee78")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{loading ? fullSharedT("fullShared.loading_your_callback_setting_1e4e10") : saved ? fullSharedT("fullShared.callback_setting_saved_99e7a0") : ""}</p><Button type="submit" disabled={loading || saving}>{saving ? fullSharedT("fullShared.saving_23e392") : fullSharedT("fullShared.save_phone_setting_5c59db")}</Button></div>
    </form>
  </section>;
}
export function SpekoPhoneCallback({ companyId, endpointId }: { companyId: string; endpointId: string }) {
  useFullSharedTranslation();
  const key = ["speko-callback", companyId, endpointId];
  const query = useQuery({ queryKey: key, queryFn: () => voiceCallbacksApi.get(companyId, endpointId), retry: false });
  const mutation = useMutation({ mutationFn: (preference: VoiceCallbackPreference) => voiceCallbacksApi.save(companyId, endpointId, preference), onSuccess: () => query.refetch() });
  return <SpekoPhoneCallbackForm preference={query.data} loading={query.isLoading} saving={mutation.isPending} saved={mutation.isSuccess} error={(query.error ?? mutation.error)?.message} onSave={preference => mutation.mutate(preference)} />;
}
