import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { AlertTriangle, CircleHelp, ExternalLink, Loader2 } from "lucide-react";
import type { ChatEndpoint } from "@/api/chatEndpoints";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/lib/router";
import { gitHubAppSettingsUrl } from "./GitHubAppIdentity";

export function GitHubConnectionRecoveryNotice({ endpoint }: { endpoint: ChatEndpoint }) {
  useFullAppsTranslation();
  if (!["attention", "revoked"].includes(endpoint.status)) return null;
  return (
    <section aria-label={fullAppsT("fullApps.github_connection_needs_repair_bf67cc")} className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{endpoint.status === "revoked" ? fullAppsT("fullApps.github_bot_is_disconnected_373356") : fullAppsT("fullApps.github_connection_needs_repair_bf67cc")}</h2>
          <p className="text-sm">{fullAppsT("fullApps.reconnect_this_bot_to_restore_github_reviews_and_men_434b43")}</p>
        </div>
        <Button asChild><Link to={`/apps/chat/connect?provider=github&resume=${endpoint.id}&reconnect=1`}>{fullAppsT("fullApps.reconnect_github_aa7b6c")}</Link></Button>
        {(endpoint.lastError || endpoint.healthMessage) && <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{fullAppsT("fullApps.connection_details_51bfff")}</summary>
          <p className="mt-2 break-words">{endpoint.lastError ?? endpoint.healthMessage}</p>
        </details>}
      </div>
    </section>
  );
}

export type GitHubAppCredentials = { appId: string; privateKey: string; webhookSecret: string };

function CredentialLabel({ id, label, help }: { id: string; label: string; help: string }) {
  useFullAppsTranslation();
  return <div className="flex items-center gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Tooltip><TooltipTrigger asChild><button type="button" aria-label={fullAppsT("fullApps.help_with_cbe4af", { value1: label })} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      <CircleHelp className="size-3.5" aria-hidden="true" />
    </button></TooltipTrigger><TooltipContent className="max-w-xs">{help}</TooltipContent></Tooltip>
  </div>;
}

export function GitHubAppRecovery({ endpoint, reconnect, onConnect, onExit }: {
  endpoint: ChatEndpoint;
  reconnect: boolean;
  onConnect: (credentials?: GitHubAppCredentials) => Promise<void>;
  onExit: () => void;
}) {
  useFullAppsTranslation();
  const [replace, setReplace] = useState(!reconnect);
  const [credentials, setCredentials] = useState<GitHubAppCredentials>({ appId: endpoint.botExternalId ?? "", privateKey: "", webhookSecret: "" });
  const [privateKeyDraft, setPrivateKeyDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>("");
  const [fileError, setFileError] = useState<AppDisplayText>("");
  const needsWebhookSecret = !reconnect && !["active", "paused", "revoked"].includes(endpoint.status);
  const appName = endpoint.botLabel ?? endpoint.setup?.github?.appName ?? fullAppsT("fullApps.copy_320d0e4d20f9");
  const appIdInvalid = !!credentials.appId.trim() && !/^\d+$/.test(credentials.appId.trim());
  const keyInvalid = !!credentials.privateKey.trim() && !/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(credentials.privateKey);
  const keyLoaded = !!credentials.privateKey.trim() && !keyInvalid && !privateKeyDraft;
  const incomplete = replace && (!credentials.appId.trim() || !credentials.privateKey.trim() || appIdInvalid || keyInvalid || (needsWebhookSecret && !credentials.webhookSecret.trim()));
  const actionLabel = pending ? fullAppsT("fullApps.checking_github_b9094c") : replace ? (reconnect ? fullAppsT("fullApps.verify_and_reconnect_bf4288") : fullAppsT("fullApps.connect_existing_app_960166")) : fullAppsT("fullApps.reconnect_saved_app_cd20f6");
  async function connect() {
    setPending(true);
    setError("");
    try { await onConnect(replace ? credentials : undefined); }
    catch (cause) { setError(cause instanceof Error ? appErrorDisplay(cause) : ownAppDisplayText("fullApps.could_not_reconnect_github_try_again_5007ed")); }
    finally { setPending(false); }
  }
  return <div className="space-y-6">
    {reconnect && <div className="space-y-3">
      <p className="text-sm"><FullAppsTrans i18nKey="fullApps.restore_using_its_saved_credentials_paperclip_will_c_21a7c6" components={{ part1: <strong>{appName}</strong> }} /></p>
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.your_agent_repository_choices_review_settings_and_ta_70596a")}</p>
    </div>}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">{replace ? fullAppsT("fullApps.could_not_reconnect_this_app_d83574") : fullAppsT("fullApps.could_not_reconnect_the_saved_app_14ca9f")}</p>
      <p className="break-words">{renderAppDisplayText(error)}</p>
      <p>{fullAppsT("fullApps.try_again_if_the_service_is_temporarily_unavailable__a88096")}</p>
    </div>}
    {reconnect && <Button variant="link" className="h-auto p-0" disabled={pending} onClick={() => { setReplace(!replace); setError(""); }}>
      {replace ? fullAppsT("fullApps.use_saved_credentials_instead_226b30") : fullAppsT("fullApps.replace_app_credentials_6527b5")}
    </Button>}
    {replace && <div className="space-y-6">
      <div className="space-y-2 text-sm">
        <h2 className="text-base font-semibold">{reconnect ? fullAppsT("fullApps.replace_credentials_for_the_same_app_0cf5ed") : fullAppsT("fullApps.connect_your_existing_github_app_9b919b")}</h2>
        <p><a href={gitHubAppSettingsUrl(endpoint)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{fullAppsT("fullApps.open_github_app_settings_139552")}<ExternalLink className="size-3.5" /></a> {fullAppsT("fullApps.and_choose_566c1f")} <strong>{appName}</strong>.</p>
        <p className="text-muted-foreground">{fullAppsT("fullApps.if_it_s_owned_by_an_organization_open_that_organizat_0effc2")}</p>
      </div>
      <div className="space-y-2">
        <CredentialLabel id="github-app-id" label={fullAppsT("fullApps.app_id_3c2f1e")} help={fullAppsT("fullApps.the_numeric_app_id_on_the_github_app_s_settings_page_ee675a")} />
        <p id="github-app-id-help" className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.copy_from_the_app_s_settings_page_bfa253" components={{ part1: <strong>{fullAppsT("fullApps.appId")}</strong>, part2: <>{reconnect && fullAppsT("fullApps.the_saved_id_is_filled_in_when_available_a55e4f")}</> }} /></p>
        <Input id="github-app-id" aria-describedby="github-app-id-help" inputMode="numeric" value={credentials.appId} disabled={pending} aria-invalid={appIdInvalid} onChange={event => setCredentials({ ...credentials, appId: event.target.value })} />
        {appIdInvalid && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.use_the_numeric_app_id_not_the_client_id_0e8fc5")}</p>}
      </div>
      <div className="space-y-2">
        <CredentialLabel id="github-private-key" label={fullAppsT("environmentsUi.form.privateKey")} help={fullAppsT("fullApps.upload_the_pem_file_downloaded_from_this_github_app__7ee9c7")} />
        <ol id="github-private-key-help" className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li><FullAppsTrans i18nKey="fullApps.in_the_same_app_s_settings_open_on_the_older_setting_e0200b" components={{ part1: <strong>Credentials → Key pairs → New key</strong>, part2: <strong>Private keys → Generate a private key</strong> }} /></li>
          <li><FullAppsTrans i18nKey="fullApps.upload_the_downloaded_file_below_or_paste_its_entire_5e3977" components={{ part1: <strong>.pem</strong> }} /></li>
        </ol>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.you_can_reuse_a_pem_file_you_already_saved_github_ca_e4ab59")}</p>
        <Input type="file" accept=".pem" aria-label={fullAppsT("fullApps.upload_private_key_pem_file_917d8f")} disabled={pending} onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileError("");
          try {
            const privateKey = await file.text();
            setCredentials(current => ({ ...current, privateKey }));
            setPrivateKeyDraft("");
          } catch { setFileError(ownAppDisplayText("fullApps.could_not_read_this_file_try_again_or_paste_the_key__06b7e3")); }
        }} />
        <Input id="github-private-key" type="password" autoComplete="off" placeholder={keyLoaded ? fullAppsT("fullApps.paste_a_replacement_pem_key_8dd1ed") : fullAppsT("fullApps.or_paste_the_complete_pem_key_7e25af")} aria-describedby="github-private-key-help" disabled={pending} value={privateKeyDraft} aria-invalid={keyInvalid}
          onPaste={event => { event.preventDefault(); setCredentials({ ...credentials, privateKey: event.clipboardData.getData("text") }); setPrivateKeyDraft(""); setFileError(""); }}
          onChange={event => { setPrivateKeyDraft(event.target.value); setCredentials({ ...credentials, privateKey: event.target.value }); }} />
        {keyLoaded && <p role="status" className="text-sm">{fullAppsT("fullApps.private_key_loaded_paste_or_upload_another_key_to_re_0b0018")}</p>}
        {keyInvalid && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.use_a_pem_private_key_including_its_begin_and_end_li_443c26")}</p>}
        {fileError && <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(fileError)}</p>}
        <a className="inline-flex items-center gap-1 text-sm underline" href="https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps" target="_blank" rel="noreferrer">{fullAppsT("fullApps.github_s_private_key_instructions_979307")}<ExternalLink className="size-3.5" /></a>
      </div>
      {needsWebhookSecret && <div className="space-y-2">
        <CredentialLabel id="github-webhook-secret" label={fullAppsT("fullApps.webhook_secret_342da9")} help={fullAppsT("fullApps.the_secret_configured_for_this_app_s_webhook_it_must_f1ee1c")} />
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.use_the_secret_saved_when_you_configured_this_app_s__2ce549")}</p>
        <Input id="github-webhook-secret" type="password" autoComplete="off" disabled={pending} value={credentials.webhookSecret} onChange={event => setCredentials({ ...credentials, webhookSecret: event.target.value })} />
      </div>}
    </div>}
    <SetupWizardFooter onSaveExit={onExit} disabled={pending}>
      <Button aria-label={actionLabel} disabled={pending || incomplete} onClick={() => void connect()}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        <span className="sm:hidden" aria-hidden="true">{pending ? fullAppsT("taskProperties.fields.checking") : reconnect ? fullAppsT("fullApps.reconnect_bf8a9e") : fullAppsT("fullApps.connect_1a2303")}</span>
        <span className="hidden sm:inline" aria-hidden="true">{actionLabel}</span>
      </Button>
    </SetupWizardFooter>
  </div>;
}
