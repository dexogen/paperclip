import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { Input } from "@/components/ui/input";

export interface SpekoProviderSetupProps {
  agentName: string;
  onSaveExit?(): void;
  credentials: Record<string, string>;
  onChange(values: Record<string, string>): void;
  onConnect(values: Record<string, string>): void;
  callbackUrl?: string | null;
  pending?: boolean;
  repairing?: boolean;
  /** Presence only; existing callback secrets never reach the browser. */
  signingSecretConfigured?: boolean;
}
export function SpekoProviderSetup({ agentName, onSaveExit, credentials, onChange, onConnect, callbackUrl, pending = false, repairing = false, signingSecretConfigured }: SpekoProviderSetupProps) {
  useFullSharedTranslation();
  const hasSavedSecret = signingSecretConfigured ?? repairing;
  const ready = repairing && hasSavedSecret || Boolean(credentials.apiKey?.trim() && credentials.agentId?.trim());
  const reachable = callbackUrl?.startsWith("https://") === true;
  function connect() {
    if (!ready || !reachable || pending) return;
    const values = Object.fromEntries(Object.entries(credentials).filter(([, value]) => value.trim()));
    if (!hasSavedSecret && !values.signingSecret) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      values.signingSecret = `whsec_${btoa(String.fromCharCode(...bytes))}`;
      onChange(values);
    }
    onConnect(values);
  }
  return <div className="space-y-5">
    <div>
      <h1 className="text-xl font-bold"><FullSharedTrans i18nKey="fullShared.connect_to_speko_39f565" components={{ part1: <>{agentName}</> }} /></h1>
      <p className="mt-1 text-sm text-muted-foreground"><FullSharedTrans i18nKey="fullShared.choose_a_dedicated_speko_voice_persona_paperclip_use_d9b61d" components={{ part1: <>{agentName}</> }} /></p>
    </div>
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      <li>{fullSharedT("fullShared.create_a_dedicated_agent_in_speko_and_choose_its_voi_e58b6d")}</li>
      <li>{fullSharedT("fullShared.copy_its_agent_id_and_a_speko_api_key_below_ec7838")}</li>
      <li>{fullSharedT("fullShared.review_recording_and_retention_settings_in_your_spek_456616")}</li>
    </ol>
    <Button asChild variant="outline"><a href="https://platform.speko.ai/agents" target="_blank" rel="noreferrer">{fullSharedT("fullShared.open_speko_agents_b3e715")}</a></Button>
    <label className="grid gap-2 text-sm font-medium">{fullSharedT("fullShared.speko_agent_id_0ffb7f")}<Input autoComplete="off" value={credentials.agentId ?? ""} placeholder={repairing ? fullSharedT("fullShared.leave_blank_to_keep_the_current_persona_e519af") : "agent_…"} onChange={(event) => onChange({ ...credentials, agentId: event.target.value })} /></label>
    <label className="grid gap-2 text-sm font-medium">{fullSharedT("fullShared.speko_api_key_8bc494")}<Input type="password" autoComplete="new-password" value={credentials.apiKey ?? ""} placeholder={repairing ? fullSharedT("fullShared.leave_blank_to_keep_the_saved_key_f93af3") : fullSharedT("fullShared.paste_your_speko_api_key_fa8108")} onChange={(event) => onChange({ ...credentials, apiKey: event.target.value })} /></label>
    {!reachable && <p role="alert" className="text-sm text-destructive">{fullSharedT("fullShared.configure_a_public_https_callback_origin_for_papercl_94cb95")}</p>}
    {reachable && <p className="break-all text-xs text-muted-foreground"><FullSharedTrans i18nKey="fullShared.callback_6e6c7e" components={{ part1: <>{callbackUrl}</> }} /></p>}
    <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.credentials_and_a_generated_callback_signing_secret__b62078")}</p>
    {onSaveExit ? <SetupWizardFooter onSaveExit={onSaveExit} disabled={pending}><Button disabled={!ready || !reachable || pending} onClick={connect}>{pending ? fullSharedT("fullShared.verifying_speko_f72214") : repairing ? fullSharedT("fullShared.reconnect_speko_74ade6") : fullSharedT("fullShared.connect_speko_c6a47f")}</Button></SetupWizardFooter> : <div className="flex justify-end"><Button disabled={!ready || !reachable || pending} onClick={connect}>{pending ? fullSharedT("fullShared.verifying_speko_f72214") : repairing ? fullSharedT("fullShared.reconnect_speko_74ade6") : fullSharedT("fullShared.connect_speko_c6a47f")}</Button></div>}
  </div>;
}
