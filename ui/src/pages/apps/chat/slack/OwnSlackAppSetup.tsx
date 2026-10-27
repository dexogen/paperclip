import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { slackSetupErrorDisplay } from "../chat-setup-error";
import { chatEndpointsApi, type ChatEndpoint } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { sanitizedSetupErrorMessage, sanitizedSetupErrorDisplay } from "../chat-setup-error";
import { SlackSetupAdvanced } from "../SlackAppDetails";

/** Uses ordinary request-local state: configuration tokens never enter a query/mutation cache. */
export function OwnSlackAppSetup({ endpoint, stage, disabled, saveDetails, onSaved, onBusy,
  onManual, onManaged, onContinue, onSaveExit }: {
  endpoint: ChatEndpoint;
  stage: "app" | "credentials";
  disabled: boolean;
  saveDetails: () => Promise<void>;
  onSaved: (endpoint: ChatEndpoint) => void;
  onBusy: (busy: boolean) => void;
  onManual: (existing: boolean) => Promise<void>;
  onManaged?: () => Promise<void>;
  onContinue: () => void;
  onSaveExit: () => void;
}) {
  useFullAppsTranslation();
  const [configurationToken, setConfigurationToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const [checkedNoApp, setCheckedNoApp] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const pendingWindow = useRef<Window | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingWindow.current?.close();
      pendingWindow.current = null;
    };
  }, []);
  const registration = endpoint.setup?.slackRegistration;
  const uncertain = registration?.status === "uncertain";
  const creating = registration?.status === "creating";
  const created = Boolean(registration?.appId);
  const configurationPending = registration?.errorCode === "slack_manifest_update_pending";

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) { setError(sanitizedSetupErrorDisplay(failure, { configurationToken })); }
    finally {
      setConfigurationToken("");
      setBusy(false);
      onBusy(false);
      inFlight.current = false;
    }
  }

  async function create() {
    // Reserve the window during the click so async app creation cannot trigger a popup blocker.
    const installWindow = window.open("about:blank", "_blank");
    if (installWindow) {
      installWindow.opener = null;
      installWindow.document.title = fullAppsT("fullApps.preparing_slack_installation_0f61ce");
      installWindow.document.body.textContent = fullAppsT("fullApps.preparing_your_slack_installation_b9b8c5");
      pendingWindow.current = installWindow;
    }
    let token = configurationToken.trim();
    setConfigurationToken("");
    try {
      let next: ChatEndpoint;
      try {
        if (!created) await saveDetails();
        if (registration?.status === "failed" || checkedNoApp) requestId.current = crypto.randomUUID();
        setCheckedNoApp(false);
        next = await chatEndpointsApi.createSlackApp(endpoint.id, {
          requestId: requestId.current,
          credentials: { configurationToken: token },
          ...(checkedNoApp ? { confirmedNoAppCreated: true } : {}),
        });
      } catch (failure) {
        // A response can be lost after Slack creates the app. Only saved state can advance.
        const current = await chatEndpointsApi.get(endpoint.id).catch(() => null);
        if (current && mounted.current) onSaved(current);
        if (!current?.setup?.slackRegistration?.appId) {
          throw new Error(sanitizedSetupErrorMessage(failure, { configurationToken: token }));
        }
        next = current;
      }
      token = "";
      if (!mounted.current) return;
      onSaved(next);
      const saved = next.setup?.slackRegistration;
      if (!saved?.appId) return;
      onContinue();
      // Pending/uncertain configuration and existing installations must not start OAuth.
      if (saved.status !== "install" || saved.errorCode) return;
      if (!installWindow || installWindow.closed) {
        setError(ownAppDisplayText("fullApps.select_install_in_slack_to_open_the_installation_pag_bf4e4f"));
        return;
      }
      const result = await chatEndpointsApi.installSlackApp(endpoint.id);
      if (!mounted.current) return;
      if (installWindow.closed) {
        setError(ownAppDisplayText("fullApps.select_install_in_slack_to_reopen_the_installation_p_9a9f82"));
        return;
      }
      installWindow.location.replace(result.authorizationUrl);
      pendingWindow.current = null;
    } finally {
      token = "";
      pendingWindow.current?.close();
      pendingWindow.current = null;
    }
  }

  async function authorize() {
    const result = await chatEndpointsApi.installSlackApp(endpoint.id);
    // Current-tab navigation avoids popup blockers. The callback resumes this saved draft.
    window.location.assign(result.authorizationUrl);
  }

  return <div className="space-y-5">
    {error || registration?.errorCode ? <p role="alert" className="text-sm text-destructive">
      {renderAppDisplayText(error) ?? slackSetupErrorDisplay(registration!.errorCode!)}
    </p> : null}
    {(stage === "app" && !created && !creating || configurationPending) && <>
      {uncertain && <div className="space-y-3 text-sm">
        <a href={registration?.managementUrl ?? "https://api.slack.com/apps"} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{fullAppsT("fullApps.open_slack_app_settings_9d209c")}<ExternalLink className="inline size-3" /></a>
        <label className="flex items-center gap-2">
          <Checkbox checked={checkedNoApp} disabled={busy} onCheckedChange={value => setCheckedNoApp(value === true)} />{fullAppsT("fullApps.i_checked_slack_and_no_app_was_created_create_a_new__9e3ee6")}</label>
      </div>}
      {(!uncertain || checkedNoApp) && <div className="space-y-2">
        <Button asChild size="lg" className="mb-4 h-auto w-full whitespace-normal py-4">
          <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.get_your_app_configuration_access_token_242f66")}<ExternalLink className="size-4" /></a>
        </Button>
        <div id="slack-configuration-token-help" className="space-y-3 pb-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li><FullAppsTrans i18nKey="fullApps.in_slack_app_settings_find_and_choose_1e3575" components={{ part1: <strong>Your App Configuration Tokens</strong>, part2: <strong>Generate Token</strong> }} /></li>
            <li>{fullAppsT("fullApps.select_the_workspace_where_you_want_to_install_your__1f70c9")}</li>
            <li><FullAppsTrans i18nKey="fullApps.copy_the_and_paste_it_below_f38d2f" components={{ part1: <strong>Access Token</strong> }} /></li>
          </ol>
          <p className="text-muted-foreground">{fullAppsT("fullApps.paperclip_uses_this_token_to_create_your_app_dae1bc")}</p>
        </div>
        <label htmlFor="slack-configuration-token" className="text-sm font-medium">{fullAppsT("fullApps.app_configuration_access_token_c6fb13")}</label>
        <Input id="slack-configuration-token" type="password" autoComplete="off" spellCheck={false}
          value={configurationToken} disabled={busy} onChange={event => setConfigurationToken(event.target.value)}
          aria-describedby="slack-configuration-token-help" />
      </div>}
    </>}
    {creating && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{fullAppsT("fullApps.creating_your_slack_app_you_can_return_to_this_saved_554e6b")}</p>}
    {created && <p className="text-sm"><FullAppsTrans i18nKey="fullApps.is_created_2e630a" components={{ part1: <strong>{endpoint.setup?.slackApp?.appName ?? fullAppsT("fullApps.your_slack_app_a810c7")}</strong>, part2: <>{stage === "credentials" && fullAppsT("fullApps.approveSlackInstallation")}</> }} /></p>}
    {stage === "credentials" && registration?.status === "credentials_saved" && <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.your_installation_credentials_are_saved_retry_connec_3a6d0a")}</p>
      <Button variant="link" className="h-auto p-0" disabled={busy || disabled} onClick={() => void run(authorize)}>{fullAppsT("fullApps.authorize_in_slack_again_20529e")}</Button>
    </div>}
    {stage === "app" && <SlackSetupAdvanced><div className="flex flex-wrap gap-4 text-sm">
      {onManaged && !registration && <Button variant="link" className="h-auto p-0" disabled={busy} onClick={() => void run(onManaged)}>{fullAppsT("fullApps.use_managed_setup_665099")}</Button>}
      <Button variant="link" className="h-auto p-0" disabled={busy || creating} onClick={() => void run(() => onManual(false))}>{fullAppsT("fullApps.create_manually_3ee3bd")}</Button>
      <Button variant="link" className="h-auto p-0" disabled={busy || creating} onClick={() => void run(() => onManual(true))}>{fullAppsT("fullApps.use_an_existing_app_bd2fe4")}</Button>
    </div></SlackSetupAdvanced>}
    <SetupWizardFooter onSaveExit={onSaveExit} disabled={busy}>
      {configurationPending ? <Button disabled={busy || disabled || !configurationToken.trim()} onClick={() => void run(create)}><FullAppsTrans i18nKey="fullApps.retry_app_configuration_a117fb" components={{ part1: <>{busy && <Loader2 className="size-4 animate-spin" />}</> }} /></Button> : stage === "app" ? <Button disabled={busy || disabled || creating || (!created && (!configurationToken.trim() || uncertain && !checkedNoApp))}
        onClick={() => created ? onContinue() : void run(create)}>
        {busy && <Loader2 className="size-4 animate-spin" />}{created ? fullAppsT("fullApps.continue_to_installation_f57268") : fullAppsT("fullApps.create_slack_app_7e043d")}
      </Button> : registration?.status === "credentials_saved" ? <Button disabled={busy} onClick={() => void run(async () => onSaved(await chatEndpointsApi.resumeSlackInstallation(endpoint.id)))}><FullAppsTrans i18nKey="fullApps.retry_connecting_d0f144" components={{ part1: <>{busy && <Loader2 className="size-4 animate-spin" />}</> }} /></Button> : <Button disabled={busy || !created || disabled} onClick={() => void run(authorize)}><FullAppsTrans i18nKey="fullApps.install_in_slack_4ba243" components={{ part1: <>{busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}</> }} /></Button>}
    </SetupWizardFooter>
  </div>;
}
