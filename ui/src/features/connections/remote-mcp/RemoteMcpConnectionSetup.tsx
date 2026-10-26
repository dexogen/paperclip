import { renderAppDisplayText } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, HelpCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { InlineBanner } from "@/components/InlineBanner";
import { ActionsSection } from "@/pages/apps/app-detail/PermissionsPanel";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RemoteMcpManagement } from "./RemoteMcpManagement";
import {
  AccessStepContent,
  ConnectionAccessDefaults,
  connectionDefaultSummarySentence,
  StepHeader,
} from "../ConnectionSetupFlow";
import type { RemoteMcpProvider } from "./providers";
import type { RemoteMcpSetupActions, RemoteMcpSetupState } from "./types";

/**
 * PAP-659 C0: the connect path is one screen. `access` is still a real screen,
 * but only as management after the connection exists — the way in states the
 * resolved default and puts its controls in the Advanced disclosure, the same
 * as every catalog connector.
 */
const steps = ["connect"] as const;
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild><button type="button" aria-label={fullAppsT("fullApps.help_with_cbe4af", { value1: label })} onClick={() => setOpen(!open)} className="rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><HelpCircle className="size-4" /></button></TooltipTrigger>
    <TooltipContent className="max-w-xs">{children}</TooltipContent>
  </Tooltip>;
}

/** Controlled presentation shared by provider setup, configuration imports and review stories.
 * Authentication, persistence and calls belong to the controller, never these views. */
export function RemoteMcpConnectionSetup({ provider, state: s, actions: a, agents, companyId, connectionId, fixedGrantKind, lockedAgentId, host = "page", authorizationUrl, upstreamServiceName, onCancel, additionalSettings, settingsValid = true }: {
  additionalSettings?: ReactNode;
  settingsValid?: boolean;
  companyId: string;
  onCancel?: () => void;
  upstreamServiceName?: string;
  host?: "page" | "dialog";
  lockedAgentId?: string;
  authorizationUrl?: string;
  provider: RemoteMcpProvider;
  connectionId: string;
  fixedGrantKind?: RemoteMcpSetupState["grantKind"];
  state: RemoteMcpSetupState;
  actions: RemoteMcpSetupActions;
  agents: { id: string; name: string }[];
}) {
  useFullAppsTranslation();
  const uid = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(s.step);
  const [sessionOpen, setSessionOpen] = useState(() => Boolean(provider.defaultUrl && s.url !== provider.defaultUrl));
  useEffect(() => {
    if (previousStep.current !== s.step) heading.current?.focus();
    previousStep.current = s.step;
  }, [s.step]);
  const currentStep = steps.indexOf(s.step as typeof steps[number]);
  const busy = s.connectStatus === "connecting";
  const change = (patch: Partial<RemoteMcpSetupState>) => a.edit(patch);
  const external = (purpose: Parameters<typeof a.openProvider>[0], text: string) => <Button type="button" variant="link" className="h-auto p-0 text-sm text-current underline" onClick={() => a.openProvider(purpose)}>{text}<ExternalLink className="size-3.5" aria-hidden="true" /></Button>;
  const boundary = <InlineBanner compact><FullAppsTrans i18nKey="fullApps.paperclip_controls_access_to_the_tools_listed_here_a_0d6c10" components={{ part1: <>{external("manage", provider.name)}</> }} /></InlineBanner>;
  const footer = (children: ReactNode) => <SetupWizardFooter onSaveExit={a.saveExit} disabled={busy}>{children}</SetupWizardFooter>;

  /**
   * The stated default and the one Advanced disclosure (PAP-659 C0).
   *
   * Step 1 of this work learned the lesson the hard way on Gmail: adding an
   * access disclosure beside a connector's existing "Advanced authentication"
   * panel leaves two of them on one screen, which is worse than the step it
   * replaced. So the provider's authentication settings are passed in here as
   * `extra` and share a single panel with the access controls.
   */
  // Deliberately not derived from `s.auth`. A gateway URL can carry a personal
  // token even when the method declares `auth: "none"`, so the shared-vs-mine
  // credential choice has to stay offered; deriving "none" here would silently
  // remove it and pin every Zapier connection to the organization.
  const authKind = "oauth";
  const defaults = (extra: ReactNode) => <ConnectionAccessDefaults
    companyId={companyId}
    {...(companyId ? {} : { agents })}
    sentence={connectionDefaultSummarySentence({
      grantKind: s.grantKind,
      authKind,
      installChoice: s.allAgents ? "all" : "specific",
      installCount: s.agentIds.length,
      lockedAgentId,
      preserveAgentAccess: s.setupComplete,
    })}
    extra={extra}
    // Something inside is load-bearing: the operator has already chosen a
    // non-default sign-in method, or the provider just rejected a credential.
    forceOpen={s.auth !== (provider.supportsBrowserAuth ? "auto" : "none") || s.connectStatus === "rejected"}
    disabled={busy}
    authKind={authKind}
    grantKinds={fixedGrantKind ? [fixedGrantKind] : undefined}
    grantKind={s.grantKind}
    setGrantKind={(grantKind) => { if (grantKind !== "agent") change({ grantKind }); }}
    installChoice={s.allAgents ? "all" : "specific"}
    setInstallChoice={(choice) => change({ allAgents: choice === "all" })}
    installAgentIds={new Set(s.agentIds)}
    setInstallAgentIds={(ids) => change({ agentIds: [...ids] })}
    lockedAgentId={lockedAgentId}
    preserveAgentAccess={s.setupComplete}
  />;

  const error = s.connectStatus === "invalid_url" ? { title: fullAppsT("fullApps.enter_a_valid_mcp_url_90cbbc"), body: fullAppsT("fullApps.paste_the_complete_server_url_including_https_or_htt_7be2a6") }
    : s.connectStatus === "oauth_failed" ? { title: fullAppsT("fullApps.couldn_t_connect_198417", { value1: provider.name }), body: fullAppsT("fullApps.authorization_did_not_complete_your_saved_connection_675b3b") }
    : s.connectStatus === "rejected" ? { title: fullAppsT("fullApps.credentials_were_rejected_73a495"), body: fullAppsT("fullApps.message_9bb4aa98b7d2", { value1: provider.name }) }
    : s.connectStatus === "unreachable" ? { title: fullAppsT("fullApps.paperclip_could_not_reach_this_server_dd97cf"), body: fullAppsT("fullApps.check_that_the_endpoint_is_running_and_reachable_fro_2536e8") }
    : null;
  const urlField = <div className="space-y-2">
    <div className="flex items-center gap-2"><Label htmlFor={`${uid}-url`}>{fullAppsT("fullApps.mcp_server_url_4f5aff")}</Label><FieldHelp label={fullAppsT("fullApps.mcp_server_url_4f5aff")}>{provider.urlHelp}</FieldHelp></div>
    <Input id={`${uid}-url`} type="password" autoComplete="off" spellCheck={false} placeholder={provider.placeholder} value={s.url} aria-invalid={s.connectStatus === "invalid_url"} aria-describedby={`${uid}-url-help`} onChange={(event) => change({ url: event.target.value })} />
    <p id={`${uid}-url-help`} className="text-xs text-muted-foreground">{provider.urlHelp}</p>
    {provider.id === "executor" ? <div className="space-y-2"><div className="flex items-center gap-2"><Label htmlFor={`${uid}-management`}>{fullAppsT("fullApps.console_url_optional_1ead79")}</Label>
      <FieldHelp label={fullAppsT("fullApps.executor_console_url_cc6718")}>{fullAppsT("fullApps.the_url_of_your_executor_organization_s_integrations_6cd8f7")}</FieldHelp></div>
      <Input id={`${uid}-management`} type="url" value={s.managementUrl ?? ""} placeholder="https://executor.sh/your-organization/integrations" onChange={event => change({ managementUrl: event.target.value })} />
    </div> : null}
  </div>;

  return <div className={host === "dialog" ? "min-w-0 text-foreground" : "mx-auto max-w-6xl p-4 text-foreground sm:p-8"} data-remote-mcp-provider={provider.id}>
    <StepHeader headingRef={heading} appIdentity={{ name: provider.name, logoUrl: null }}
      title={upstreamServiceName ? fullAppsT("fullApps.connect_through_034a87", { value1: upstreamServiceName, value2: provider.name }) : s.step === "draft" ? fullAppsT("fullApps.continue_your_setup_e4e54f") : s.setupComplete ? s.step === "access" ? fullAppsT("fullApps.who_can_use_this_connection_ba7dda") : s.step === "connect" ? fullAppsT("fullApps.reconnect_5ee6ed", { value1: provider.name }) : provider.name : undefined}
      subtitle={currentStep >= 0 && !s.setupComplete ? fullAppsT("fullApps.message_e3bd8344672e", { value1: provider.name }) : s.step === "draft" ? fullAppsT("fullApps.message_440d4358c4aa", { value1: provider.name }) : s.step === "permissions" ? (s.identity ? fullAppsT("fullApps.connectedIdentityActions", { identity: s.identity, count: s.tools.length }) : fullAppsT("fullApps.connectedActions", { count: s.tools.length })) : fullAppsT("fullApps.message_d077d9eff5ed", { value1: provider.name })}
      step={currentStep >= 0 && !s.setupComplete ? "key" : "gallery"} activeIndex={currentStep} labels={steps.map(() => fullAppsT("fullApps.caption_1a2303ede0"))} onCancel={busy || s.step === "management" || s.step === "permissions" || s.step === "draft" ? undefined : onCancel ?? a.saveExit} />
    <main className="space-y-6">
        {upstreamServiceName && <InlineBanner compact><FullAppsTrans i18nKey="fullApps.handles_the_connection_and_requests_to_883c87" components={{ part1: <>{provider.name}</>, part2: <>{upstreamServiceName}</>, part3: <>{provider.id === "composio" ? fullAppsT("fullApps.after_connecting_this_account_sign_in_to_the_app_in__dad337") : fullAppsT("fullApps.manage_app_sign_in_in_the_provider_then_refresh_your_888197")}</> }} /></InlineBanner>}
        {s.notice && <p role="status" className="text-sm text-muted-foreground">{renderAppDisplayText(s.notice)}</p>}

        {s.step === "access" && <AccessStepContent agents={agents} lockedAgentId={lockedAgentId} authKind="oauth" grantKinds={fixedGrantKind ? [fixedGrantKind] : undefined} grantKind={s.grantKind} setGrantKind={(grantKind) => { if (grantKind !== "agent") change({ grantKind }); }}
          installChoice={s.allAgents ? "all" : "specific"} setInstallChoice={(choice) => change({ allAgents: choice === "all" })}
          installAgentIds={new Set(s.agentIds)} setInstallAgentIds={(ids) => change({ agentIds: [...ids] })}
          submitLabel={s.setupComplete ? fullAppsT("fullApps.done_11a676") : fullAppsT("onboarding.actions.continue")} onBack={s.setupComplete ? a.finish : a.saveExit} onContinue={s.setupComplete ? a.finish : () => a.navigate("connect")} />}
        {s.step === "permissions" && <>
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{fullAppsT("agentDetailUi.config.permissions")}</h2><Button variant="outline" onClick={a.finish}>{fullAppsT("fullApps.connection_settings_b4ddb3")}</Button></div>
          {s.tools.some((entry) => entry.broad) && boundary}
          <ActionsSection connectionId={connectionId} appName={provider.name}
            readOnly={s.tools.filter((entry) => entry.isReadOnly)} canChange={s.tools.filter((entry) => !entry.isReadOnly)} quarantined={[]}
            enabledIds={new Set(s.tools.filter((entry) => s.permissions[entry.id] !== "off").map((entry) => entry.id))}
            askFirstIds={new Set(s.tools.filter((entry) => s.permissions[entry.id] === "ask_first").map((entry) => entry.id))}
            disabled={!s.connected} refreshPending={s.refreshing} canConfigure
            onSetPermission={(ids, next) => change({ permissions: { ...s.permissions, ...Object.fromEntries(ids.map((id) => [id, next === "ask" ? "ask_first" : next])) } })}
            onReviewQuarantined={() => {}} onRefreshActions={a.refresh} />
        </>}
        <div className="mx-auto max-w-2xl space-y-6">
        {s.step === "connect" && <>
          <div className="space-y-3">
            <ol className="list-decimal space-y-2 pl-5 text-sm">{provider.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
            {external("setup", fullAppsT("fullApps.message_ec00b438cfe6", { value1: provider.name }))}
          </div>
          {s.connectStatus === "sign_in" && provider.supportsBrowserAuth ? <>
            <div role="status"><InlineBanner title={fullAppsT("fullApps.finish_signing_in_to_c0325b", { value1: provider.name })}>{fullAppsT("fullApps.complete_sign_in_in_the_provider_window_then_return__5b1f71")}</InlineBanner></div>
            <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.if_a_window_did_not_open_f0780a" components={{ part1: <>{authorizationUrl ? <a className="text-current underline" href={authorizationUrl} onClick={() => a.openProvider("sign_in")} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_sign_in_again_24857f")}</a> : external("sign_in", fullAppsT("fullApps.open_sign_in_again_24857f"))}</> }} /></p>
            {footer(<><Button variant="outline" onClick={a.cancelConnect}>{fullAppsT("fullApps.cancel_sign_in_9effa0")}</Button><Button disabled>{fullAppsT("fullApps.waiting_for_sign_in_749a34")}</Button></>)}
          </> : <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); a.connect(); }}>
            {error && <div role="alert"><InlineBanner tone="danger" title={error.title}>{error.body}</InlineBanner></div>}
            {s.connectStatus === "cancelled" && <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.connection_cancelled_your_setup_details_are_preserve_7d123d")}</p>}
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {provider.defaultUrl ? <Collapsible open={sessionOpen || s.connectStatus === "invalid_url"} onOpenChange={setSessionOpen}>
                <CollapsibleTrigger asChild><Button type="button" variant="link" className="h-auto p-0 text-sm text-muted-foreground underline underline-offset-2">{fullAppsT("fullApps.reuse_an_existing_session_1e6244")}</Button></CollapsibleTrigger>
                <CollapsibleContent className="mt-3">{urlField}</CollapsibleContent>
              </Collapsible> : urlField}
              {defaults(<div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">{fullAppsT("providerSetup.setup.authentication")}</p>
                  <p className="text-sm text-muted-foreground">{provider.authHelp}</p>
                  <div className="space-y-2"><Label htmlFor={`${uid}-auth`}>{fullAppsT("fullApps.sign_in_method_2bb30a")}</Label><select id={`${uid}-auth`} className={selectClass} value={s.auth} onChange={(event) => change({ auth: event.target.value as RemoteMcpSetupState["auth"] })}>
                    {provider.supportsBrowserAuth && <option value="auto">{fullAppsT("fullApps.automatic_sign_in_if_required_2332ea")}</option>}<option value="bearer">{fullAppsT("providerSetup.setup.bearerToken")}</option><option value="headers">{fullAppsT("fullApps.custom_headers_34cb67")}</option><option value="none">{fullAppsT("fullApps.no_additional_authentication_403f3d")}</option>
                  </select></div>
                  {s.auth === "bearer" && <div className="space-y-2"><div className="flex items-center gap-2"><Label htmlFor={`${uid}-token`}>{fullAppsT("providerSetup.setup.bearerToken")}</Label><FieldHelp label={fullAppsT("fullApps.bearer_token_0063f0")}>{fullAppsT("fullApps.paste_the_token_only_without_the_word_bearer_it_is_k_face6d")}</FieldHelp></div><Input id={`${uid}-token`} type="password" autoComplete="off" value={s.token} onChange={(event) => change({ token: event.target.value })} /></div>}
                  {(s.auth === "bearer" || s.auth === "headers") && <div className="space-y-3">
                    <p className="text-sm font-medium">{s.auth === "bearer" ? fullAppsT("fullApps.additional_headers_1ff7bc") : fullAppsT("companySettings.observability.headers")}</p>
                    {s.headers.map((header, index) => <div key={header.id} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-2"><Label htmlFor={`${uid}-${header.id}-name`}><FullAppsTrans i18nKey="fullApps.header_name_dad305" components={{ part1: <>{index + 1}</> }} /></Label><Input id={`${uid}-${header.id}-name`} value={header.name} placeholder={provider.id === "arcade" ? "Arcade-User-ID" : fullAppsT("companySettings.observability.headerName")} onChange={(event) => change({ headers: s.headers.map((h) => h.id === header.id ? { ...h, name: event.target.value } : h) })} /></div>
                      <div className="min-w-0 flex-1 space-y-2"><Label htmlFor={`${uid}-${header.id}-value`}><FullAppsTrans i18nKey="fullApps.header_value_0b64d4" components={{ part1: <>{index + 1}</> }} /></Label><Input id={`${uid}-${header.id}-value`} type="password" autoComplete="off" value={header.value} onChange={(event) => change({ headers: s.headers.map((h) => h.id === header.id ? { ...h, value: event.target.value } : h) })} /></div>
                      <Button type="button" variant="ghost" size="icon" aria-label={fullAppsT("fullApps.remove_header_9cda75", { value1: index + 1 })} onClick={() => change({ headers: s.headers.filter((h) => h.id !== header.id) })}><Trash2 className="size-4" /></Button>
                    </div>)}
                    <Button type="button" variant="outline" size="sm" onClick={() => change({ headers: [...s.headers, { id: crypto.randomUUID(), name: "", value: "" }] })}><Plus className="size-4" />{fullAppsT("companySettings.observability.addHeader")}</Button>
                  </div>}
                </div>)}
            </fieldset>
            {additionalSettings}
            {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />{fullAppsT("fullApps.connecting_and_discovering_tools_99f0c6")}</p>}
            {footer(<>{s.setupComplete ? <Button type="button" variant="outline" disabled={busy} onClick={a.finish}>{fullAppsT("onboarding.actions.back")}</Button> : <span />}<Button type="submit" disabled={busy || !s.url.trim() || !settingsValid}>{busy ? fullAppsT("onboarding.progress.connecting") : error || s.connectStatus === "cancelled" ? fullAppsT("fullApps.try_again_d8b839") : fullAppsT("fullApps.connect_60c786", { value1: provider.name })}</Button></>)}
          </form>}
        </>}

        {s.step === "management" && <>
          {!s.connected ? <InlineBanner tone="warning" title={fullAppsT("skillsGap.disconnected")}>{fullAppsT("fullApps.agents_cannot_use_this_connection_reconnect_to_resto_ef1eb2")}</InlineBanner> : <div className="space-y-2"><p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" />{fullAppsT("environmentsUi.terminal.connected")}{s.identity ? fullAppsT("fullApps.as_31a714", { value1: s.identity }) : ""}</p><p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.tools_c37f75" components={{ part1: <>{s.grantKind === "user" ? fullAppsT("fullApps.just_me_3a4b4d") : fullAppsT("fullApps.any_human_in_the_organization_e6b1c6")}</>, part2: <>{s.tools.length}</>, part3: <>{s.allAgents ? fullAppsT("fullApps.any_agent_ee3e76") : fullAppsT("fullApps.agents_with_access_822d04", { value1: s.agentIds.length })}</> }} /></p></div>}
          <div className="flex flex-wrap gap-2"><Button onClick={() => a.navigate("access")}>{fullAppsT("fullApps.who_can_use_this_connection_ba7dda")}</Button><Button variant="outline" disabled={!s.connected} onClick={() => a.navigate("permissions")}>{fullAppsT("agentDetailUi.config.permissions")}</Button></div>
          <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.refresh_the_catalog_after_changing_tools_in_existing_0a8e88" components={{ part1: <>{provider.name}</> }} /></p>
          <Button variant="outline" disabled={!s.connected || s.refreshing} onClick={a.refresh}>{s.refreshing ? fullAppsT("providerSetup.model.refreshing") : fullAppsT("fullApps.refresh_tools_31393d")}</Button>
          <RemoteMcpManagement providerName={provider.name} connected={s.connected} onReconnect={a.reconnect} onManage={() => a.openProvider("manage")} onDisconnect={a.disconnect} />
        </>}
        {s.step === "draft" && <><p className="text-sm">{fullAppsT("fullApps.your_access_choices_and_setup_progress_are_kept_with_67357c")}</p><div className="flex justify-end"><Button onClick={a.resumeDraft}>{fullAppsT("fullApps.resume_setup_014c5f")}</Button></div></>}
        </div>
    </main>
  </div>;
}
