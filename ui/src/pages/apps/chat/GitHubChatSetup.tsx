import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, AppDisplayError, appErrorDisplay, renderAppError } from "@/pages/apps/app-display-text";
import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import type { GitHubAppWizardState } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { githubChatApi } from "@/api/githubChat";
import { projectsApi } from "@/api/projects";
import { toolsApi } from "@/api/tools";
import { AgentSelect } from "@/components/AgentMultiSelect";
import { GitHubAgentTrustWarning } from "@/components/GitHubAgentTrustWarning";
import {
  SetupWizardNavigation,
  SetupWizardFooter,
} from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useNavigate, useSearchParams, Link } from "@/lib/router";
import { buildPermissionsForTrustPreset } from "@/lib/trust-policy-ui";
import { queryKeys } from "@/lib/queryKeys";
import { GitHubAppRecovery } from "./GitHubConnectionRecovery";
import type { GitHubConnectionCompleteLocationState } from "./GitHubConnectionComplete";

/** Restrict native manifest submission to GitHub registration endpoints. */
export function gitHubAppManifestAction(
  registration: NonNullable<GitHubAppWizardState["registration"]>,
) {
  const url = new URL(registration.registrationUrl);
  if (
    url.origin !== "https://github.com" ||
    url.username || url.password || url.hash ||
    !/^\/(settings|organizations\/[A-Za-z0-9-]+\/settings)\/apps\/new$/.test(
      url.pathname,
    )
  )
    throw new AppDisplayError("fullApps.github_returned_an_invalid_registration_address_ccfe60");
  return url.toString();
}
function GitHubAppManifestForm({
  registration, onSaveExit, disabled, autoSubmit, onSubmit,
}: {
  registration: NonNullable<GitHubAppWizardState["registration"]>;
  onSaveExit: () => void;
  disabled: boolean;
  autoSubmit: boolean;
  onSubmit: () => void;
}) {
  useFullAppsTranslation();
  const form = useRef<HTMLFormElement>(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!autoSubmit) requested.current = false;
    if (autoSubmit && !disabled && !requested.current && form.current) {
      requested.current = true;
      form.current.requestSubmit();
    }
  }, [autoSubmit, disabled]);
  return (
    <form
      ref={form}
      method="post"
      action={gitHubAppManifestAction(registration)}
      onSubmit={onSubmit}
    >
      <input type="hidden" name="manifest" value={JSON.stringify(registration.manifest)} />
      <SetupWizardFooter onSaveExit={onSaveExit} disabled={disabled}>
        <Button type="submit" disabled={disabled}>{fullAppsT("githubSetupUi.key.continueGithub")}</Button>
      </SetupWizardFooter>
    </form>
  );
}
export function GitHubChatSetup() {
  useFullAppsTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const resume = params.get("resume");
  const identityOnly = params.get("stage") === "identity";
  const reconnect = params.get("reconnect") === "1";
  const [agentId, setAgentId] = useState(params.get("agentId") ?? "");
  const [ownerType, setOwnerType] = useState<"personal" | "organization">(
    "personal",
  );
  const [ownerLogin, setOwnerLogin] = useState("");
  const [customOrganization, setCustomOrganization] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitManifest, setSubmitManifest] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>("");
  const [existing, setExisting] = useState(params.get("reconnect") === "1");
  const [appNotCreated, setAppNotCreated] = useState(false);
  const [legacyAccount, setLegacyAccount] = useState("");
  const [identityLinked, setIdentityLinked] = useState(false);
  const [legacyIdentity, setLegacyIdentity] = useState<Awaited<
    ReturnType<typeof githubChatApi.identity>
  > | null>(null);
  const agents = useQuery({
    queryKey: ["github-setup-agents", selectedCompanyId],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && !identityOnly,
  });
  const current = useQuery({
    queryKey: ["github-setup", resume],
    queryFn: () => chatEndpointsApi.get(resume!),
    enabled: !!resume,
    refetchInterval: 3000,
  });
  const bot = current.data;
  const progress = useQuery({
    queryKey: ["github-wizard", resume],
    queryFn: () => githubChatApi.advance(resume!),
    enabled: !!bot && !existing && !identityOnly,
    refetchInterval: (query) =>
      ["connected", "create", "identity", "enrollment", "recovery"].includes(
        query.state.data?.state ?? "",
      )
        ? false
        : 5000,
    retry: false,
  });
  const accounts = useQuery({
    queryKey: ["github-personal-connections", resume],
    queryFn: () => githubChatApi.personalConnections(resume!),
    enabled: !!bot && (identityOnly || progress.data?.state === "identity"),
  });
  const selectedAgent = agents.data?.find(
    (agent) => agent.id === (bot?.assignedAgentId ?? agentId),
  );
  const state = identityOnly ? undefined : progress.data;
  const choosingAccount = !!bot && !identityOnly && !existing && state?.state === "create";
  const repositories = useQuery({
    queryKey: ["project-repositories", selectedCompanyId],
    queryFn: () => projectsApi.repositoryOptions(selectedCompanyId!),
    enabled: !!selectedCompanyId && choosingAccount,
    staleTime: 30_000,
  });
  const connectedBots = useQuery({
    queryKey: queryKeys.chatEndpoints.list(selectedCompanyId!),
    queryFn: () => chatEndpointsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && choosingAccount,
    staleTime: 30_000,
  });
  const organizations = new Map<string, string>();
  for (const repository of repositories.data?.repositories ?? []) {
    if (repository.ownerType !== "organization") continue;
    const login = repository.fullName.split("/")[0];
    organizations.set(login.toLowerCase(), login);
  }
  for (const endpoint of connectedBots.data ?? []) {
    const github = endpoint.setup?.github;
    if (endpoint.provider === "github" && ["active", "paused"].includes(endpoint.status) &&
        github?.ownerType === "organization" && github.ownerLogin) {
      organizations.set(github.ownerLogin.toLowerCase(), github.ownerLogin);
    }
  }
  const knownOrganizations = [...organizations.values()].sort((a, b) => a.localeCompare(b));
  const knownOwner = organizations.get(ownerLogin.toLowerCase());
  const accountChoice = ownerType === "personal" ? "personal"
    : !customOrganization && knownOwner ? `organization:${knownOwner}` : "organization";
  const deliveryVerifiedWhileChecking =
    state?.state === "verify" &&
    !!bot?.setup?.webhookVerifiedAt &&
    state.verification?.checks.some(
      (check) => !check.ok && ["webhook", "delivery"].includes(check.key),
    );
  const existingIdentityMethod =
    identityOnly || state?.identityMethod === "existing_connection";
  const connected = state?.state === "connected" && !existing;
  useEffect(() => {
    if (!connected || !bot) return;
    queryClient.setQueryData(queryKeys.chatEndpoints.detail(bot.id), bot);
    if (selectedAgent) queryClient.setQueryData(queryKeys.agents.detail(selectedAgent.id), selectedAgent);
    navigate(`/apps/chat/${bot.id}/settings`, {
      replace: true,
      state: {
        githubConnectionComplete: { endpointId: bot.id, runtimeChecks: state.runtimeChecks },
      } satisfies GitHubConnectionCompleteLocationState,
    });
  }, [connected, bot, selectedAgent, state, queryClient, navigate]);
  useEffect(() => {
    setBreadcrumbs([
      { label: fullAppsT("sidebar.connectors"), href: "/apps" },
      { label: fullAppsT("fullApps.github_code_review_bot_12a656") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, fullAppsI18n.resolvedLanguage]);
  useEffect(() => {
    if (bot) {
      setAgentId(bot.assignedAgentId);
      if (bot.setup?.github?.ownerType)
        setOwnerType(bot.setup.github.ownerType);
      setOwnerLogin(bot.setup?.github?.ownerLogin ?? "");
      setCustomOrganization(false);
      if (bot.setup?.github?.appName) setName(bot.setup.github.appName);
    }
  }, [
    bot?.id,
    bot?.setup?.github?.ownerType,
    bot?.setup?.github?.ownerLogin,
    bot?.setup?.github?.appName,
  ]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? appErrorDisplay(error)
          : ownAppDisplayText("fullApps.could_not_connect_github_try_again_86544d"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const verification = !identityOnly ? await progress.refetch() : undefined;
    const updated = await current.refetch();
    if (verification?.error) throw verification.error;
    if (updated.error) throw updated.error;
  }
  const appInput = () => ({
    name: (
      name ||
      selectedAgent?.name ||
      bot?.assignedAgentName ||
      "GitHub Reviewer"
    ).slice(0, 34),
    ownerType,
    ...(ownerType === "organization" ? { ownerLogin: ownerLogin.trim() } : {}),
  });
  const exit = () =>
    void run(async () => {
      if (
        !identityOnly &&
        !reconnect &&
        bot &&
        !bot.botExternalId &&
        !state?.registration &&
        state?.state !== "recovery"
      ) {
        await githubChatApi.saveDraft(bot.id, appInput());
        await current.refetch();
      }
      navigate("/apps");
    });
  const footer = (
    label?: string,
    action?: () => Promise<void>,
    disabled = false,
  ) => (
    <SetupWizardFooter onSaveExit={exit} disabled={busy}>
      {label && action && (
        <Button disabled={busy || disabled} onClick={() => void run(action)}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {label}
        </Button>
      )}
    </SetupWizardFooter>
  );
  if (resume && !bot)
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold">{fullAppsT("fullApps.resume_github_setup_25b22b")}</h1>
        {current.error ? (
          <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_this_connection_try_again_to_resume_y_adedd2")}</p>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_your_draft_4f0755")}</p>
        )}
        {footer(current.error ? fullAppsT("fullApps.copy_d8b8392e2c54") : undefined, async () => {
          await current.refetch();
        })}
      </div>
    );
  if (connected) return null;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      {!identityOnly && (
        <SetupWizardNavigation
          labels={reconnect ? [fullAppsT("fullApps.copy_aa7b6cd19325")] : [fullAppsT("fullApps.choose_agent_f7c0bf"), fullAppsT("fullApps.copy_4027e5b24418")]}
          step={reconnect ? 0 : bot ? 1 : 0}
          availableStep={reconnect ? 0 : bot ? 1 : 0}
          onSelect={() => {}}
          disabled
          takeover
        />
      )}
      <h1 className="text-2xl font-semibold">
        {!bot
          ? fullAppsT("fullApps.choose_agent_f7c0bf")
          : identityOnly || state?.state === "identity"
              ? fullAppsT("fullApps.connect_your_account_24fa20")
              : reconnect && existing ? fullAppsT("fullApps.reconnect_github_aa7b6c") : fullAppsT("projectConfigUi.repos.connect")}
      </h1>
      {(error || (!identityOnly && !existing && progress.error) || accounts.error) && (
        <p role="alert" className="text-sm text-destructive">
          {renderAppDisplayText(error) ||
            (accounts.error instanceof Error
              ? renderAppError(accounts.error)
              : undefined) ||
            (progress.error instanceof Error
              ? renderAppError(progress.error)
              : fullAppsT("fullApps.could_not_check_github_setup_try_again_dfb5c6"))}
        </p>
      )}
      {!bot ? (
        <>
          <AgentSelect
            agents={agents.data ?? []}
            value={agentId}
            onChange={setAgentId}
          />
          {selectedAgent && (
            <GitHubAgentTrustWarning
              agent={selectedAgent}
              disabled={busy}
              onChangeToLowTrust={() =>
                void run(async () => {
                  const permissions = buildPermissionsForTrustPreset(
                    selectedAgent.permissions,
                    "low_trust_review",
                  );
                  await agentsApi.updatePermissions(
                    selectedAgent.id,
                    {
                      ...permissions,
                      canCreateAgents: false,
                      canCreateSkills: false,
                      canAssignTasks:
                        typeof selectedAgent.permissions.canAssignTasks ===
                        "boolean"
                          ? selectedAgent.permissions.canAssignTasks
                          : true,
                    },
                    selectedCompanyId!,
                  );
                  await queryClient.invalidateQueries({
                    queryKey: ["github-setup-agents", selectedCompanyId],
                  });
                })
              }
            />
          )}
          {footer(
            fullAppsT("fullApps.caption_31fbef1625"),
            async () => {
              const created = await chatEndpointsApi.create(
                selectedCompanyId!,
                { provider: "github", assignedAgentId: agentId },
              );
              setName((selectedAgent?.name ?? "GitHub Reviewer").slice(0, 34));
              const next = new URLSearchParams(params);
              next.set("resume", created.id);
              setParams(next, { replace: true });
              queryClient.setQueryData(["github-setup", created.id], created);
            },
            !agentId || !selectedCompanyId,
          )}
        </>
      ) : !identityOnly && !existing && progress.isPending ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.checking_your_github_connection_71a8f2")}</p>
          {footer()}
        </>
      ) : existing ? (
        <GitHubAppRecovery
          key={bot.id}
          endpoint={bot}
          reconnect={reconnect}
          onExit={exit}
          onConnect={async (credentials) => {
            if (reconnect || ["active", "paused", "revoked"].includes(bot.status)) {
              await chatEndpointsApi.setup(bot.id, {
                action: "reconnect",
                ...(credentials ? { credentials: { appId: credentials.appId.trim(), privateKey: credentials.privateKey } } : {}),
              });
            } else if (credentials) {
              await githubChatApi.connectApp(bot.id, credentials);
            }
            queryClient.removeQueries({ queryKey: ["github-wizard", bot.id] });
            await queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.detail(bot.id) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.list(bot.companyId) });
            await refresh();
            setExisting(false);
          }}
        />
      ) : state?.state === "identity" || identityOnly ? (
        <>
          {identityOnly && identityLinked ? (
            <>
              <p role="status" className="text-sm"><FullAppsTrans i18nKey="fullApps.github_account_connected_you_can_now_mention_this_bo_d680c8" components={{ part1: <strong>{legacyIdentity?.login}</strong>, part2: <>{" "}</> }} /></p>
              {footer()}
            </>
          ) : state?.identity ? (
            <>
              <p className="text-sm"><FullAppsTrans i18nKey="fullApps.connect_github_account_to_your_paperclip_account_ce47fe" components={{ part1: <strong>{state.identity.login}</strong>, part2: <>{" "}</> }} /></p>
              {footer(fullAppsT("fullApps.confirm_my_account_10c7f6"), async () => {
                await githubChatApi.confirmIdentity(
                  bot.id,
                  state.identity!.githubUserId,
                );
                await refresh();
              })}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.link_your_github_account_so_your_mentions_use_your_p_c07473")}</p>
              {(accounts.data?.length ?? 0) > 0 && (
                <>
                  <Label htmlFor="github-personal-account">{fullAppsT("fullApps.existing_github_connection_d2e0e5")}</Label>
                  <select
                    id="github-personal-account"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={legacyAccount}
                    onChange={(event) => {
                      setLegacyAccount(event.target.value);
                      setLegacyIdentity(null);
                      setIdentityLinked(false);
                    }}
                  >
                    <option value="">{fullAppsT("costCardsUi.subscription.chooseAccount")}</option>
                    {accounts.data
                      ?.filter(
                        (account) =>
                          account.status === "active" && account.enabled,
                      )
                      .map((account) => (
                        <option
                          key={account.connectionId}
                          value={account.connectionId}
                        >
                          {account.login ?? account.name}
                        </option>
                      ))}
                  </select>
                  {legacyIdentity && (
                    <p className="text-sm"><FullAppsTrans i18nKey="fullApps.github_account_50ec17" components={{ part1: <strong>{legacyIdentity.login}</strong> }} /></p>
                  )}
                </>
              )}
              {existingIdentityMethod && !legacyAccount && (
                <Link
                  className="text-sm underline"
                  to="/apps/connect?source=github"
                >{fullAppsT("fullApps.add_a_personal_github_connection_then_return_to_this_6e7851")}</Link>
              )}
              {footer(
                legacyAccount
                  ? legacyIdentity
                    ? fullAppsT("fullApps.confirm_my_account_10c7f6")
                    : fullAppsT("fullApps.check_my_account_cf2734")
                  : fullAppsT("fullApps.connect_my_github_account_0ed85a"),
                async () => {
                  if (legacyAccount) {
                    const observed = await githubChatApi.identity(
                      bot.id,
                      legacyAccount,
                      legacyIdentity?.githubUserId,
                    );
                    setLegacyIdentity(observed);
                    if (legacyIdentity) {
                      setIdentityLinked(true);
                      await refresh();
                    }
                  } else {
                    const result = await githubChatApi.startIdentity(bot.id);
                    window.location.assign(result.authorizationUrl);
                  }
                },
                existingIdentityMethod && !legacyAccount,
              )}
            </>
          )}
        </>
      ) : state?.state === "install" ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.waiting_for_github_installation_or_administrator_app_50fe30")}</p>
          {state.installationUrl && (
            <a
              className="inline-flex items-center gap-1 text-sm underline"
              href={state.installationUrl}
            >{fullAppsT("fullApps.continue_installation_on_github_629e11")}<ExternalLink className="size-3" />
            </a>
          )}
          {footer()}
        </>
      ) : state?.state === "enrollment" ? (
        <>
          <p className="text-sm">{fullAppsT("fullApps.paperclip_cloud_receives_github_events_and_securely__5ab500")}</p>
          {footer(fullAppsT("fullApps.connect_paperclip_cloud_7dd29f"), async () => {
            const result = await toolsApi.startCloudConnectorEnrollment(
              selectedCompanyId!,
              undefined,
              `/apps/chat/connect${window.location.search}`,
            );
            if (!result.verificationUrl)
              throw new AppDisplayError("fullApps.cloud_enrollment_could_not_be_started_854e5b");
            window.location.assign(result.verificationUrl);
          })}
        </>
      ) : state?.state === "recovery" ? (
        <>
          <p role="status" className="text-sm">
            {state.message}
          </p>
          <Button variant="ghost" onClick={() => setExisting(true)}>{fullAppsT("fullApps.use_existing_app_credentials_ff7b0b")}</Button>
          {state.restartableRegistrationId && (
            <div className="flex items-center gap-2">
              <Checkbox id="github-app-not-created" checked={appNotCreated} disabled={busy}
                onCheckedChange={(checked) => setAppNotCreated(checked === true)} />
              <Label htmlFor="github-app-not-created">{fullAppsT("fullApps.i_haven_t_created_this_app_on_github_3df1cd")}</Label>
            </div>
          )}
          {state.restartableRegistrationId
            ? footer(fullAppsT("fullApps.continue_to_github_401c9d"), async () => {
                const result = await githubChatApi.restartRegistration(bot.id, state.restartableRegistrationId!);
                setAppNotCreated(false);
                queryClient.setQueryData(["github-wizard", bot.id], result);
                if (result.registration) setSubmitManifest(true);
              }, !appNotCreated)
            : footer(fullAppsT("fullApps.copy_d8b8392e2c54"), refresh)}
        </>
      ) : state?.state === "verify" ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {deliveryVerifiedWhileChecking
              ? fullAppsT("fullApps.github_delivery_verified_checking_app_and_repository_264cf3")
              : state.message ?? fullAppsT("fullApps.checking_github_access_ce4a91")}
          </p>
          {state.verification?.checks
            .filter(
              (check) =>
                !check.ok &&
                !(deliveryVerifiedWhileChecking && ["webhook", "delivery"].includes(check.key)),
            )
            .map((check) => (
              <p key={check.key} className="text-sm">
                {check.detail}
              </p>
            ))}
          <Link
            className="text-sm underline"
            to={`/apps/chat/${bot.id}/settings`}
          >{fullAppsT("fullApps.connection_settings_b4ddb3")}</Link>
          {footer(fullAppsT("fullApps.copy_d8b8392e2c54"), refresh)}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="github-owner-type">{fullAppsT("fullApps.github_account_d686f8")}</Label>
            <select
              id="github-owner-type"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={accountChoice}
              disabled={busy || !!state?.registration}
              onChange={(event) => {
                const choice = event.target.value;
                setOwnerType(choice === "personal" ? "personal" : "organization");
                setCustomOrganization(choice === "organization");
                if (choice.startsWith("organization:")) setOwnerLogin(choice.slice("organization:".length));
                else if (choice === "organization") setOwnerLogin("");
              }}
            >
              <option value="personal">{fullAppsT("fullApps.my_account_b53181")}</option>
              {knownOrganizations.map((login) => (
                <option key={login.toLowerCase()} value={`organization:${login}`}>{login}</option>
              ))}
              <option value="organization">{fullAppsT("fullApps.another_organization_70f80d")}</option>
            </select>
            {(repositories.isError || connectedBots.isError) && (
              <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_some_connected_github_accounts_choose_c33f4a")}</p>
            )}
          </div>
          {accountChoice === "organization" && (
            <div className="space-y-2">
              <Label htmlFor="github-owner-login">{fullAppsT("sidebar.organization")}</Label>
              <Input
                id="github-owner-login"
                disabled={busy || !!state?.registration}
                value={ownerLogin}
                onChange={(event) => setOwnerLogin(event.target.value)}
                placeholder={fullAppsT("fullApps.github_organization_name_60a453")}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="github-app-name">{fullAppsT("fullApps.app_name_e6ad39")}</Label>
            <Input
              id="github-app-name"
              disabled={busy || !!state?.registration}
              maxLength={34}
              value={
                name ||
                selectedAgent?.name?.slice(0, 34) ||
                bot.assignedAgentName?.slice(0, 34) ||
                "GitHub Reviewer"
              }
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <button
            className="text-sm text-muted-foreground underline"
            onClick={() => setExisting(true)}
          >{fullAppsT("fullApps.i_already_have_an_app_0f0c97")}</button>
          {state?.registration ? (
            <GitHubAppManifestForm registration={state.registration} onSaveExit={exit}
              disabled={busy} autoSubmit={submitManifest} onSubmit={() => setSubmitManifest(false)} />
          ) : footer(
            fullAppsT("fullApps.continue_to_github_401c9d"),
            async () => {
              const result = await githubChatApi.registration(bot.id, appInput());
              queryClient.setQueryData(["github-wizard", bot.id], result);
              if (result.registration) setSubmitManifest(true);
            },
            progress.isPending || (ownerType === "organization" && !ownerLogin.trim()),
          )}
        </>
      )}
    </div>
  );
}
