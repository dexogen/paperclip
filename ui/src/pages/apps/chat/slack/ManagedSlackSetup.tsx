import { renderAppDisplayText, type AppDisplayText } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { slackSetupErrorDisplay } from "../chat-setup-error";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SetupWizardFooter } from "@/components/SetupWizard";
import type { OwnSlackAppSetup } from "./OwnSlackAppSetup";
import { prepareOAuthNavigation, savePendingCloudHandoff } from "@/lib/oauthHandoff";
import { sanitizedSetupErrorDisplay } from "../chat-setup-error";

export function ManagedSlackSetup({ endpoint, disabled, saveDetails, onSaved, onBusy, onSaveExit, autoStart = false, reconnect = false }: ComponentProps<typeof OwnSlackAppSetup> & { autoStart?: boolean; reconnect?: boolean }) {
  useFullAppsTranslation();
  const choices = useQuery({ queryKey: ["slack-managed-workspaces", endpoint.companyId], queryFn: () => chatEndpointsApi.slackSetupOptions(endpoint.companyId), retry: false });
  const [selectedGrant, setSelectedGrant] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const registration = endpoint.setup?.slackRegistration;
  const started = Boolean(registration);
  const workspaces = choices.data?.workspaces ?? [];
  const grantId = registration?.managerGrantId ?? selectedGrant ?? (workspaces.length === 1 ? workspaces[0]!.grantId : null);
  const needsAuthorization = !grantId || registration?.errorCode === "slack_manager_reauthorize" || Boolean(grantId && !workspaces.some(workspace => workspace.grantId === grantId));
  const uncertain = registration?.status === "uncertain";
  const creating = registration?.status === "creating";
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); onBusy(true); setError(null);
    try { await action(); }
    catch (failure) { setError(sanitizedSetupErrorDisplay(failure, {})); await Promise.allSettled([choices.refetch(), chatEndpointsApi.get(endpoint.id).then(onSaved)]); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }
  async function authorize() {
    const authorization = await chatEndpointsApi.authorizeSlackManager(endpoint.id);
    const target = await prepareOAuthNavigation(authorization);
    if (target.kind === "reauthentication" && authorization.handoff) savePendingCloudHandoff(authorization.handoff.session);
    window.location.assign(target.url);
  }
  async function connect() {
    if (needsAuthorization || !grantId) {
      await authorize(); return;
    }
    if (!started) await saveDetails();
    if (confirmed || registration?.status === "failed") requestId.current = crypto.randomUUID();
    const input = { requestId: requestId.current, grantId, ...(reconnect ? { reconnect: true } : {}), ...(confirmed ? { confirmedNoAppCreated: true } : {}) };
    setConfirmed(false);
    const result = await chatEndpointsApi.provisionManagedSlack(endpoint.id, input);
    await choices.refetch();
    onSaved(await chatEndpointsApi.get(endpoint.id));
    if (result.authorization) window.location.assign(result.authorization.authorizationUrl);
  }
  const autoStarted = useRef(false);
  useEffect(() => {
    // Only fresh setup can start itself. Declines, uncertain creation, and saved
    // registration recovery require an explicit action and never recreate an app.
    if (!autoStart || autoStarted.current || disabled || !choices.data?.managedAvailable
      || choices.isFetching || choices.isError || started || endpoint.setup?.slackManagerError
      || workspaces.length > 1) return;
    autoStarted.current = true;
    void run(connect);
  });
  const setupError = (code: string) => code === "slack_manifest_update_pending"
    ? fullAppsT("fullApps.your_app_was_created_retry_to_finish_its_configurati_125802")
    : code === "slack_creation_uncertain" ? fullAppsT("fullApps.slack_may_have_created_your_app_check_slack_app_sett_206ef9")
    : slackSetupErrorDisplay(code);
  const message = renderAppDisplayText(error) ?? (endpoint.setup?.slackManagerError ? setupError(endpoint.setup.slackManagerError) : null) ?? (choices.isError ? fullAppsT("fullApps.couldn_t_load_your_slack_workspaces_try_again_26ce6b") : registration?.errorCode ? setupError(registration.errorCode) : null);
  return <div className="space-y-5">
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    {busy || choices.isPending || creating ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busy ? needsAuthorization ? fullAppsT("fullApps.opening_slack_ec985d") : fullAppsT("fullApps.connecting_your_agent_51d072") : creating ? fullAppsT("fullApps.setting_up_your_slack_app_6a6fce") : fullAppsT("fullApps.loading_slack_361da6")}</p>
      : !choices.data?.managedAvailable ? <p className="text-sm">{fullAppsT("fullApps.managed_slack_setup_is_unavailable_try_again_later_b1c335")}</p>
      : <>
        {workspaces.length === 1 && <p className="text-sm"><FullAppsTrans i18nKey="fullApps.add_to_090921" components={{ part1: <strong>{endpoint.assignedAgentName}</strong>, part2: <strong>{workspaces[0]!.workspaceName}</strong> }} /></p>}
        {workspaces.length > 1 && <Select value={grantId ?? ""} onValueChange={setSelectedGrant} disabled={busy || started}>
          <SelectTrigger aria-label={fullAppsT("fullApps.slack_workspace_66b905")}><SelectValue placeholder={fullAppsT("fullApps.choose_a_slack_workspace_9c9144")} /></SelectTrigger>
          <SelectContent>{workspaces.map(workspace => <SelectItem key={workspace.grantId} value={workspace.grantId}>{workspace.workspaceName}</SelectItem>)}</SelectContent>
        </Select>}
        {(!started || registration?.errorCode === "slack_manager_reauthorize") && workspaces.length > 0 && <div><Button variant="link" className="h-auto p-0" disabled={busy} onClick={() => void run(authorize)}>{started ? fullAppsT("fullApps.reconnect_slack_workspace_7badbf") : fullAppsT("fullApps.connect_another_slack_workspace_8ec2c2")}</Button></div>}
      </>}
    {uncertain && <div className="space-y-3 text-sm">
      <a className="underline underline-offset-4" href={registration?.managementUrl ?? "https://api.slack.com/apps"} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_slack_app_settings_9d209c")}</a>
      <label className="flex items-center gap-2"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={busy} />{fullAppsT("fullApps.i_checked_slack_and_no_app_was_created_create_a_new__9e3ee6")}</label>
    </div>}
    <SetupWizardFooter onSaveExit={onSaveExit} disabled={busy}>
      {choices.isError || !choices.isPending && !choices.data?.managedAvailable ? <Button disabled={busy || choices.isFetching} onClick={() => void choices.refetch()}>{fullAppsT("newIssue.retry")}</Button> : <Button disabled={busy || disabled || creating || choices.isPending || !choices.data?.managedAvailable || (workspaces.length > 1 && !grantId) || (uncertain && !confirmed)} onClick={() => void run(connect)}>
        {busy && <Loader2 className="size-4 animate-spin" />}{needsAuthorization && started ? fullAppsT("fullApps.reconnect_slack_49de1e") : registration?.appId ? fullAppsT("fullApps.continue_in_slack_7758c2") : fullAppsT("onboarding.actions.continue")}
      </Button>}
    </SetupWizardFooter>
  </div>;
}
