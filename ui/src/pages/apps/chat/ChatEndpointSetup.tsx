import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, AppDisplayError, renderAppError, appErrorDisplay } from "@/pages/apps/app-display-text";
import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { SpekoProviderSetup } from "@/components/voice/SpekoProviderSetup";
import { NativeVoiceConversation } from "@/components/voice/NativeVoiceConversation";
import { buildSlackAppManifest, defaultSlackAppConfiguration } from "@paperclipai/shared";
import { SlackAppDetails, SlackSetupAdvanced } from "./SlackAppDetails";
import { SlackSetup } from "./slack/SlackSetup";
import { isProvisionedSlackSetup, slackSetupState } from "./slack/setup-state";
import { defaultSlackAppName } from "./slack-app-name";
import { GitHubChatSetup } from "./GitHubChatSetup";
import { GitHubAgentTrustWarning } from "@/components/GitHubAgentTrustWarning";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { ChatSetupNavigation } from "@/components/chat/ChatSetupNavigation";
import { SlackIdentityStep } from "./SlackIdentityStep";
import { PhotonConnectStep } from "./PhotonConnectStep";
import { EmailEndpointSetup } from "./EmailEndpointSetup";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, CircleHelp, ExternalLink, Eye, EyeOff, Hammer, Loader2 } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AgentCharacter } from "@/components/AgentCharacter";
import { AgentSelect } from "@/components/AgentMultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { agentsApi } from "@/api/agents";
import { instanceSettingsApi } from "@/api/instanceSettings";
import {
  chatEndpointsApi,
  type ChatEndpoint,
  type ChatProvider,
  type ChatEndpointSetupAction,
} from "@/api/chatEndpoints";
import { useNavigate, useSearchParams } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useCopyAction } from "@/lib/use-copy-action";
import { isAgentStatusInvokable, slackAppConfigurationSchema, type SlackAppConfiguration } from "@paperclipai/shared";
import { sanitizedSetupErrorMessage, sanitizedSetupErrorDisplay } from "./chat-setup-error";
import {
  createGitHubPrivateKeyReadGuard,
  readGitHubPrivateKeyFile,
} from "./github-private-key-file";

const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  agentmail: "AgentMail",
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  "imessage-photon": "iMessage Photon",
};

const knownProviders = new Set(Object.keys(providerNames));

function isProvider(value: string | null): value is ChatProvider {
  return value !== null && knownProviders.has(value);
}

function publicOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isChatEndpointRepairing(
  endpoint: Pick<
    ChatEndpoint,
    "provider" | "status" | "providerAccountId" | "botExternalId"
  > | null,
  resumeEndpointId: string | null,
  reconnectRequested: boolean,
): boolean {
  if (!resumeEndpointId || !endpoint) return false;
  const recoveringStatus =
    endpoint.status === "attention" || endpoint.status === "revoked";
  // A secret-only GitHub draft affected by setup trouble has no App identity
  // or reusable App credentials. It must remain first-time setup, where App ID
  // and private key are required, rather than offering a misleading reconnect.
  if (
    endpoint.provider === "github" &&
    recoveringStatus &&
    !endpoint.providerAccountId &&
    !endpoint.botExternalId
  ) {
    return false;
  }
  return (
    recoveringStatus ||
    (reconnectRequested &&
      (endpoint.status === "active" || endpoint.status === "paused"))
  );
}

export function ChatConnectionPurpose({ provider, onChat, onTools, slackLabels }: {
  provider: ChatProvider;
  onChat: () => void;
  onTools: () => void;
  slackLabels?: string[];
}) {
  useFullAppsTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([{ label: fullAppsT("sidebar.connectors"), href: "/apps" }, { label: fullAppsT("fullApps.choose_connection_e9bd8a") }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, fullAppsI18n.resolvedLanguage]);
  return (
      <div className="max-w-2xl space-y-6">
        <ChatSetupNavigation labels={provider === "slack" ? slackLabels ?? [fullAppsT("fullApps.choose_agent_f7c0bf"), fullAppsT("fullApps.caption_1a2303ede0")] : undefined} step={0} availableStep={0} onSelect={onChat} />
        <div>
          <h1 className="text-xl font-bold">{fullAppsT("fullApps.choose_how_to_connect_aeb54e")}</h1>
          <p className="mt-1 text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.what_should_this_connection_do_891849" components={{ part1: <>{providerNames[provider]}</> }} /></p>
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            className="flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-accent/40"
            onClick={onChat}
          >
            <AgentAvatar size={48} />
            <span>
              <span className="block text-sm font-semibold">{fullAppsT("fullApps.chat_with_an_agent_73adff")}</span>
              <span className="mt-1 block text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.people_in_can_start_and_continue_paperclip_tasks_f3e2c7" components={{ part1: <>{providerNames[provider]}</> }} /></span>
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-accent/40"
            onClick={onTools}
          >
            <span className="flex size-12 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
              <Hammer className="size-8" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{fullAppsT("fullApps.use_this_connection_as_an_agent_tool_3035ad")}</span>
              <span className="mt-1 block text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.let_agents_use_actions_and_data_while_they_work_4ee223" components={{ part1: <>{providerNames[provider]}</> }} /></span>
            </span>
          </button>
        </div>
      </div>
  );
}

export function ChatEndpointSetup() {
  useFullAppsTranslation();
  const [params] = useSearchParams();
  if (params.get("provider") === "github") return <GitHubChatSetup />;
  return params.get("provider") === "agentmail" ? <EmailEndpointSetup /> : <ChatSdkEndpointSetup />;
}

function ChatSdkEndpointSetup() {
  useFullAppsTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const provider = isProvider(params.get("provider"))
    ? (params.get("provider") as ChatProvider)
    : null;
  const toolHref = params.get("toolHref") || "/apps";
  const preselectedAgent = params.get("agentId") ?? "";
  const resumeEndpointId = params.get("resume") ?? "";
  const reconnectRequested = params.get("reconnect") === "1";
  const [purpose, setPurpose] = useState<"choice" | "chat">(
    params.get("purpose") === "chat" ? "chat" : "choice",
  );
  const [agentId, setAgentId] = useState(preselectedAgent);
  const [slackCredentialsReady, setSlackCredentialsReady] = useState(params.get("stage") === "credentials");
  const [viewedStep, setViewedStep] = useState<number | null>(null);
  const [slackIdentityReady, setSlackIdentityReady] = useState(false);
  const [automaticBusy, setAutomaticBusy] = useState(false);
  const [managedAutoStart, setManagedAutoStart] = useState(Boolean(resumeEndpointId));
  const [slackDraft, setSlackDraft] = useState<{ agentId: string; app: SlackAppConfiguration } | null>(null);
  const [endpoint, setEndpoint] = useState<ChatEndpoint | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState("");
  const [setupError, setSetupError] = useState<AppDisplayText | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: fullAppsT("sidebar.connectors"), href: "/apps" },
      { label: fullAppsT("fullApps.connect_chat_611395") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, fullAppsI18n.resolvedLanguage]);

  const agentsQuery = useQuery({
    queryKey: ["chat-endpoint-setup-agents", selectedCompanyId],
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const resumeQuery = useQuery({
    queryKey: ["chat-endpoint-setup-resume", resumeEndpointId],
    queryFn: () => chatEndpointsApi.get(resumeEndpointId),
    enabled: Boolean(resumeEndpointId),
    refetchInterval: query => ["creating", "install", "credentials_saved"].includes(query.state.data?.setup?.slackRegistration?.status ?? "") ? 1_500 : false,
  });
  useEffect(() => {
    if (!resumeQuery.data) return;
    setEndpoint(current => {
      if (isProvisionedSlackSetup(current?.setup?.slackSetupMethod) && !current?.providerAccountId && resumeQuery.data.providerAccountId) setViewedStep(null);
      return resumeQuery.data;
    });
    setAgentId(resumeQuery.data.assignedAgentId);
    setPurpose("chat");
  }, [resumeQuery.data]);
  const githubVerificationQuery = useQuery({
    queryKey: ["chat-endpoint-github-webhook-verification", endpoint?.id],
    queryFn: () => chatEndpointsApi.get(endpoint!.id),
    enabled: Boolean(
      provider === "github" &&
      endpoint?.id &&
      endpoint.setup?.step === "provider_setup" &&
      endpoint.setup?.webhookSecretConfigured &&
      !endpoint.setup.webhookVerifiedAt,
    ),
    refetchInterval: 1_500,
  });
  useEffect(() => {
    if (
      !githubVerificationQuery.data ||
      provider !== "github" ||
      !endpoint ||
      endpoint.id !== githubVerificationQuery.data.id ||
      endpoint.setup?.step !== "provider_setup" ||
      !endpoint.setup?.webhookSecretConfigured ||
      endpoint.setup.webhookVerifiedAt
    )
      return;
    setEndpoint(githubVerificationQuery.data);
  }, [endpoint, githubVerificationQuery.data, provider]);
  const experimentalSettingsQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
    enabled: endpoint?.setup?.step === "test",
  });
  const activeAgents = useMemo(
    () =>
      (agentsQuery.data ?? []).filter((agent) =>
        isAgentStatusInvokable(agent.status),
      ),
    [agentsQuery.data],
  );
  const selectedAgent = agentsQuery.data?.find(agent => agent.id === agentId);
  const slackDetails = slackDraft?.agentId === agentId ? slackDraft.app
    : endpoint?.setup?.slackApp ?? defaultSlackAppConfiguration(selectedAgent?.name ?? endpoint?.assignedAgentName ?? "");
  const slackDetailsValidation = slackAppConfigurationSchema.safeParse(slackDetails);
  const slackDetailsEditable = !automaticBusy && (!endpoint || endpoint.status === "draft" && !endpoint.botExternalId
    && (!endpoint.setup?.slackRegistration || endpoint.setup.slackRegistration.status === "failed"));
  const syncEndpointSnapshot = (
    next: ChatEndpoint,
    onlyIfStillVisible = false,
  ) => {
    if (next.setup?.slackSetupMethod === "managed" && endpoint && endpoint.setup?.slackSetupMethod !== "managed") setManagedAutoStart(true);
    if (isProvisionedSlackSetup(next.setup?.slackSetupMethod) && next.setup?.slackRegistration?.status === "configured"
      && endpoint?.setup?.slackRegistration?.status !== "configured") setViewedStep(null);
    setEndpoint((visible) =>
      onlyIfStillVisible && visible?.id !== next.id ? visible : next,
    );
    queryClient.setQueryData(["chat-endpoint-setup-resume", next.id], next);
    queryClient.setQueryData(queryKeys.chatEndpoints.detail(next.id), next);
    if (next.provider === "github") {
      queryClient.setQueryData(
        ["chat-endpoint-github-webhook-verification", next.id],
        next,
      );
    }
  };
  const slackChoices = useQuery({
    queryKey: ["slack-setup-options", selectedCompanyId],
    queryFn: () => chatEndpointsApi.slackSetupOptions(selectedCompanyId!),
    enabled: provider === "slack" && Boolean(selectedCompanyId),
    retry: false,
  });
  const createEndpoint = useMutation({
    mutationFn: ({ ownApp = false }: { ownApp?: boolean; exit?: boolean }) => {
      if (provider === "slack" && !slackChoices.data) throw new AppDisplayError("fullApps.slack_setup_is_still_loading_try_again_7c9ed0");
      return chatEndpointsApi.create(selectedCompanyId!, {
        provider: provider!,
        assignedAgentId: agentId,
        ...(provider === "slack" ? { slackSetupMethod: ownApp ? "automatic" : slackChoices.data!.defaultMethod, slackApp: slackDetailsValidation.success ? slackDetailsValidation.data : slackDetails } : {}),
      });
    },
    onSuccess: (next, { exit }) => {
      setManagedAutoStart(!exit);
      setViewedStep(exit ? 0 : null);
      syncEndpointSnapshot(next);
      if (next.provider === "imessage-photon" || next.provider === "slack" || next.provider === "speko") {
        const resumed = new URLSearchParams(params);
        resumed.set("resume", next.id);
        setParams(resumed, { replace: true });
      }
      if (exit) navigate("/apps");
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_start_setup_afa41a"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const saveSlackDetails = useMutation({
    scope: { id: `slack-app-details:${endpoint?.id}` },
    mutationFn: (details: SlackAppConfiguration) => chatEndpointsApi.update(endpoint!.id, { slackApp: details }),
    onSuccess: next => syncEndpointSnapshot(next),
  });
  const persistSlackDetails = async () => {
    if (endpoint && slackDetailsEditable && slackDetailsValidation.success
      && JSON.stringify(slackDetailsValidation.data) !== JSON.stringify(endpoint.setup?.slackApp))
      await saveSlackDetails.mutateAsync(slackDetailsValidation.data);
  };
  const continueFromAgent = async (exit: boolean) => {
    if (exit && provider !== "slack") { navigate("/apps"); return; }
    if (!endpoint) {
      if (!agentId) { if (exit) navigate("/apps"); return; }
      createEndpoint.mutate({ exit });
      return;
    }
    try { if (provider === "slack") await persistSlackDetails(); }
    catch { return; }
    if (exit) navigate("/apps"); else { setManagedAutoStart(true); setViewedStep(null); }
  };
  const useOwnSlackApp = useMutation({
    mutationFn: async () => {
      if (!endpoint) return createEndpoint.mutateAsync({ ownApp: true });
      await persistSlackDetails();
      return chatEndpointsApi.update(endpoint.id, { slackSetupMethod: "automatic" });
    },
    onSuccess: next => { setManagedAutoStart(false); syncEndpointSnapshot(next); setViewedStep(1); },
    onError: () => pushToast({ title: fullAppsT("fullApps.couldn_t_switch_slack_setup_c551aa"), body: fullAppsT("fullApps.try_again_a0c2cc"), tone: "error" }),
  });
  const setupAction = useMutation({
    mutationFn: async ({
      action,
      values,
    }: {
      action: ChatEndpointSetupAction;
      values?: Record<string, string>;
    }) => {
      const endpointId = endpoint!.id;
      try {
        return await chatEndpointsApi.setup(endpointId, provider === "imessage-photon" ? {
      action,
      ...(values?.projectSecret ? { credentials: { projectSecret: values.projectSecret } } : {}),
      ...(values?.projectId && values.allocation === "shared" ? { photon: { allocation: "shared" as const, projectId: values.projectId } } : values?.projectId && values?.lineId ? { photon: { allocation: "dedicated" as const, projectId: values.projectId, lineId: values.lineId } } : {}),
        } : { action, credentials: values });
      } catch (error) {
        // Another open tab may have completed verification, or the successful
        // response may have been lost. Read the canonical state before retrying.
        if (action === "verify") {
          const current = await chatEndpointsApi.get(endpointId).catch(() => null);
          if (current?.setup?.step === "test" || current?.setup?.step === "complete") return current;
        }
        throw error;
      }
    },
    onMutate: () => setSetupError(null),
    onSuccess: (next) => {
      setSetupError(null);
      setViewedStep(null);
      syncEndpointSnapshot(next);
      setCredentials({});
      if (next.setup?.step !== "test" && next.setup?.step !== "complete") setSlackIdentityReady(false);
    },
    onError: (error, variables) =>
      setSetupError(sanitizedSetupErrorDisplay(error, variables.values)),
  });
  const generateSetupSecret = useMutation({
    mutationFn: () => chatEndpointsApi.generateSetupSecret(endpoint!.id),
    onMutate: async () => {
      const endpointId = endpoint!.id;
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ["chat-endpoint-github-webhook-verification", endpointId],
          exact: true,
        }),
        queryClient.cancelQueries({
          queryKey: ["chat-endpoint-setup-resume", endpointId],
          exact: true,
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.chatEndpoints.detail(endpointId),
          exact: true,
        }),
      ]);
      return { endpointId };
    },
    onSuccess: async ({ webhookSecret }, _variables, context) => {
      const endpointId = context.endpointId;
      const markRotated = (current: ChatEndpoint) => ({
        ...current,
        setup: {
          ...current.setup,
          step: "provider_setup" as const,
          webhookSecretConfigured: true,
          webhookVerifiedAt: null,
        },
      });

      queryClient.removeQueries({
        queryKey: ["chat-endpoint-github-webhook-verification", endpointId],
        exact: true,
      });
      setGeneratedWebhookSecret(webhookSecret);
      setEndpoint((current) =>
        current && current.id === endpointId ? markRotated(current) : current,
      );
      queryClient.setQueryData<ChatEndpoint>(
        ["chat-endpoint-setup-resume", endpointId],
        (current) => (current ? markRotated(current) : current),
      );
      queryClient.setQueryData<ChatEndpoint>(
        queryKeys.chatEndpoints.detail(endpointId),
        (current) => (current ? markRotated(current) : current),
      );

      try {
        const current = await chatEndpointsApi.get(endpointId);
        syncEndpointSnapshot(current, true);
      } catch {
        // Keep the one-time secret copyable. Verification polling will retry the
        // canonical endpoint read without restoring a pre-rotation snapshot.
      }
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_generate_webhook_secret_4529e9"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const testConnection = useMutation({
    mutationFn: () => provider === "slack" ? chatEndpointsApi.finishSlackSetup(endpoint!.id) : chatEndpointsApi.test(endpoint!.id),
    onSuccess: (next) => {
      syncEndpointSnapshot(next);
      if (next.status === "active") navigate(`/apps/chat/${next.id}/settings`);
    },
    onError: (error) =>
      pushToast({
        title: provider === "slack" ? fullAppsT("fullApps.couldn_t_finish_setup_061cc7") : fullAppsT("fullApps.test_not_complete_34be17"),
        body:
          error instanceof Error
            ? renderAppError(error)
            : provider === "slack" ? fullAppsT("fullApps.try_finishing_setup_again_2737cd") : fullAppsT("fullApps.send_the_provider_message_then_try_again_9a8973"),
        tone: "error",
      }),
  });

  const repairing = isChatEndpointRepairing(
    endpoint,
    resumeEndpointId,
    reconnectRequested,
  );
  const isSlack = provider === "slack";
  const slackNavigation = slackSetupState({ endpoint, repairing, credentialsReady: slackCredentialsReady, identityReady: slackIdentityReady, defaultMethod: slackChoices.data?.defaultMethod });
  const automaticSlack = isSlack && slackNavigation.provisioned;
  const automaticSlackComplete = automaticSlack && slackNavigation.complete;
  const tryStep = isSlack ? slackNavigation.finalStage : 2;
  const availableStep = isSlack ? slackNavigation.availableStage : !endpoint ? 0
    : !repairing && (endpoint.setup?.step === "test" || endpoint.setup?.step === "complete") ? tryStep : 1;
  const step = Math.min(viewedStep ?? availableStep, availableStep);
  const agentStepBusy = automaticBusy || createEndpoint.isPending || saveSlackDetails.isPending || useOwnSlackApp.isPending;
  const slackVerificationQuery = useQuery({
    queryKey: ["chat-endpoint-slack-webhook-verification", endpoint?.id],
    queryFn: () => chatEndpointsApi.get(endpoint!.id),
    enabled: Boolean(isSlack && step === 3 && endpoint?.setup?.step === "provider_setup" &&
      !endpoint.setup.webhookVerifiedAt && !setupAction.isPending),
    refetchInterval: 1_500,
  });
  useEffect(() => {
    const next = slackVerificationQuery.data;
    if (!next || !endpoint || next.id !== endpoint.id || setupAction.isPending ||
      endpoint.setup?.step !== "provider_setup" || endpoint.setup.webhookVerifiedAt ||
      !next.setup?.webhookVerifiedAt) return;
    setEndpoint(next);
  }, [slackVerificationQuery.data, endpoint, setupAction.isPending]);
  const autoVerificationAttempt = useRef<string | null>(null);
  useEffect(() => {
    if (!isSlack || step !== 3 || endpoint?.setup?.step !== "provider_setup" ||
      !endpoint.setup.webhookVerifiedAt || setupAction.isPending) return;
    const attempt = `${endpoint.id}:${endpoint.setup.webhookVerifiedAt}`;
    if (autoVerificationAttempt.current === attempt) return;
    autoVerificationAttempt.current = attempt;
    setupAction.mutate({ action: "verify" });
  }, [isSlack, step, endpoint, setupAction]);

  if (!provider)
    return (
      <p className="text-sm text-destructive">{fullAppsT("fullApps.this_chat_provider_is_not_supported_4998d8")}</p>
    );
  if (!selectedCompanyId)
    return (
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.select_an_organization_to_connect_chat_7bd1f2")}</p>
    );

  if (purpose === "choice" && provider !== "speko") {
    return <ChatConnectionPurpose provider={provider} slackLabels={slackNavigation.labels} onChat={() => setPurpose("chat")} onTools={() => navigate(toolHref)} />;
  }

  return (
    <div className={automaticSlackComplete && step === tryStep ? "mx-auto w-full max-w-2xl space-y-6" : "max-w-2xl space-y-6"}>
      <ChatSetupNavigation
        labels={isSlack ? slackNavigation.labels : undefined}
        step={isSlack ? slackNavigation.toVisible(step) : step}
        availableStep={isSlack ? slackNavigation.toVisible(availableStep) : availableStep}
        disabled={agentStepBusy || setupAction.isPending || generateSetupSecret.isPending || testConnection.isPending}
        onSelect={value => setViewedStep(isSlack ? slackNavigation.toStage(value) : value)}
      />
      <div className="min-w-0 space-y-6">
        {step === 0 ? (
          <>
            <div>
              <h1 className="text-xl font-bold">{fullAppsT("fullApps.which_agent_do_you_want_to_chat_with_14eb4b")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.this_agent_is_permanent_for_the_connection_connect_a_7f8764")}</p>
            </div>
            {endpoint ? (
              <Input aria-label={fullAppsT("fullApps.assigned_agent_f96135")} value={endpoint.assignedAgentName ?? selectedAgent?.name ?? agentId} readOnly />
            ) : <AgentSelect
              agents={activeAgents}
              value={agentId}
              onChange={setAgentId}
              placeholder={fullAppsT("fullApps.choose_an_active_agent_e6be8c")}
              emptyMessage={fullAppsT("fullApps.no_active_agents_are_available_972bd5")}
            />}
            {isSlack && (selectedAgent || endpoint) && <SlackSetupAdvanced>
              <SlackAppDetails value={slackDetails} readOnly={!slackDetailsEditable || agentStepBusy}
                onChange={app => setSlackDraft({ agentId, app })}
                onBlur={() => void persistSlackDetails().catch(() => {})} />
              {saveSlackDetails.isError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_save_the_slack_app_details_try_again_before_25eb58")}</p>}
              {slackChoices.data?.defaultMethod === "managed" && (!endpoint || endpoint.setup?.slackSetupMethod === "managed") && !endpoint?.setup?.slackRegistration && <Button
                variant="link" className="h-auto p-0 text-muted-foreground"
                disabled={agentStepBusy || !slackDetailsValidation.success}
                onClick={() => useOwnSlackApp.mutate()}
              >{fullAppsT("fullApps.use_your_own_app_bc5364")}</Button>}
            </SlackSetupAdvanced>}
            {isSlack && !endpoint && !slackChoices.data && (slackChoices.isError
              ? <div role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_load_slack_setup_e87f83")}<Button variant="link" disabled={slackChoices.isFetching} onClick={() => void slackChoices.refetch()}>{fullAppsT("newIssue.retry")}</Button></div>
              : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{fullAppsT("fullApps.loading_slack_361da6")}</p>)}
            {provider === "github" && <GitHubAgentTrustWarning agent={selectedAgent} />}
            <SetupWizardFooter disabled={agentStepBusy || isSlack && !endpoint && Boolean(agentId) && !slackChoices.data} onSaveExit={() => void continueFromAgent(true)}>
              <Button
                disabled={!agentId || agentStepBusy || isSlack && (!slackDetailsValidation.success || !endpoint && !slackChoices.data)}
                onClick={() => void continueFromAgent(false)}
              ><FullAppsTrans i18nKey="fullApps.continue_bae411" components={{ part1: <>{createEndpoint.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}</> }} /></Button>
            </SetupWizardFooter>
          </>
        ) : null}
        {endpoint && !(automaticSlackComplete && step === tryStep) && (
          <div hidden={step !== 1 && !(isSlack && (step === 2 || step === 3))} className="space-y-6">
            {setupError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <p className="font-medium">{fullAppsT("externalAgentUi.dot.failed")}</p>
                <p className="mt-1">{renderAppDisplayText(setupError)}</p>
              </div>
            ) : null}
            <ProviderConnectStep
              key={`${provider}:${endpoint.id}`}
              provider={provider}
              managedAutoStart={managedAutoStart && step !== 0}
              slackStage={step === 1 ? "app" : step === 3 ? "finish" : "credentials"}
              onSlackCredentialsContinue={() => setViewedStep(3)}
              onSlackVerificationContinue={() => setViewedStep(4)}
              slackVerificationError={slackVerificationQuery.isError}
              onSlackAppCreated={() => {
                setSlackCredentialsReady(true);
                setViewedStep(2);
                const resumed = new URLSearchParams(params);
                resumed.set("resume", endpoint.id);
                resumed.set("stage", "credentials");
                setParams(resumed, { replace: true });
              }}
              agentName={selectedAgent?.name ?? endpoint.assignedAgentName}
              endpoint={endpoint}
              onEndpointSaved={syncEndpointSnapshot}
              credentials={credentials}
              setCredentials={setCredentials}
              repairing={repairing}
              pending={setupAction.isPending}
              onAutomaticBusy={setAutomaticBusy}
              generatedWebhookSecret={generatedWebhookSecret}
              generatingSetupSecret={generateSetupSecret.isPending}
              onGenerateSetupSecret={() => generateSetupSecret.mutate()}
              onAction={(action, values) =>
                setupAction.mutate({ action, values })
              }
            />
          </div>
        )}
        {endpoint && isSlack && !automaticSlack && step === 4 && (
          <SlackIdentityStep
            endpointId={endpoint.id}
            command={endpoint.setup?.slackApp?.command ?? endpoint.setup?.command ?? "/paperclip"}
            testStartedAt={endpoint.setup?.testStartedAt}
            onSaveExit={() => navigate("/apps")}
            onConnected={() => {
              setSlackIdentityReady(true);
              setViewedStep(5);
            }}
          />
        )}
        {endpoint && step === tryStep && provider === "speko" && (
          <div className="space-y-5">
            <h1 className="text-xl font-bold">{fullAppsT("fullApps.test_your_speko_voice_connection_5994ca")}</h1>
            <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.ask_the_agent_to_do_some_work_add_a_spoken_follow_up_60d4d7")}</p>
            <NativeVoiceConversation companyId={endpoint.companyId} endpointId={endpoint.id} agentName={selectedAgent?.name ?? endpoint.assignedAgentName} />
            <SetupWizardFooter onSaveExit={() => navigate("/apps")}><Button disabled={testConnection.isPending} onClick={() => testConnection.mutate()}>{fullAppsT("fullApps.verify_test_conversation_1d2f0f")}</Button></SetupWizardFooter>
          </div>
        )}
        {endpoint && step === tryStep && provider !== "speko" && (!automaticSlack || automaticSlackComplete) && (
          automaticSlack ? <div className="flex flex-col items-center gap-6 py-8 text-center">
            <AgentCharacter
              agent={selectedAgent ?? { id: endpoint.assignedAgentId, name: endpoint.assignedAgentName }}
              size={256} state="success" trackingScope="page"
              label={fullAppsT("fullApps.avatar_9524ba", { value1: selectedAgent?.name ?? endpoint.assignedAgentName })}
            />
            <div className="flex flex-col items-center gap-3">
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <CheckCircle2 aria-hidden="true" className="size-6 text-(--status-task-done)" />{fullAppsT("fullApps.success_c88a0b")}</h1>
              <p className="flex flex-wrap items-center justify-center gap-2 text-base text-muted-foreground">
                <span><FullAppsTrans i18nKey="fullApps.you_can_now_talk_to_in_slack_e0f48b" components={{ part1: <>{selectedAgent?.name ?? endpoint.assignedAgentName}</> }} /></span>
                <img src="/brands/apps/slack.svg" alt="" aria-hidden="true" className="size-6" />
              </p>
            </div>
            <Button disabled={testConnection.isPending} onClick={() => testConnection.mutate()}><FullAppsTrans i18nKey="fullApps.done_892543" components={{ part1: <>{testConnection.isPending && <Loader2 className="size-4 animate-spin" />}</> }} /></Button>
          </div> : <TryStep
            endpointId={endpoint.id}
            provider={provider}
            agentName={selectedAgent?.name ?? endpoint.assignedAgentName}
            botLabel={endpoint.botLabel}
            botUsername={endpoint.botUsername}
            slackAccount={endpoint.setup?.slackAccount}
            photonAllocation={endpoint.photonAllocation}
            providerUrl={endpoint.setup?.slackAccount?.dmChannelId && endpoint.providerAccountId ? `https://app.slack.com/client/${encodeURIComponent(endpoint.providerAccountId)}/${encodeURIComponent(endpoint.setup.slackAccount.dmChannelId)}` : endpoint.setup?.providerUrl}
            guestIsolationState={
              experimentalSettingsQuery.isPending
                ? "loading"
                : experimentalSettingsQuery.isError
                  ? "unknown"
                  : experimentalSettingsQuery.data?.enableIsolatedWorkspaces ===
                      true
                    ? "enabled"
                    : "disabled"
            }
            pending={testConnection.isPending}
            onOpenAccess={() => navigate(`/apps/chat/${endpoint.id}/access`)}
            onTest={() => testConnection.mutate()}
            onSaveExit={() => navigate("/apps")}
          />
        )}
        {step !== 0 && !isSlack && provider !== "speko" && <div className="flex justify-start">
          <Button className="text-muted-foreground" variant="ghost" onClick={() => navigate("/apps")}>{fullAppsT("agentSetupUi.setup.saveExit")}</Button>
        </div>}
      </div>
    </div>
  );
}

function ProviderConnectStep({
  provider,
  slackStage,
  onSlackCredentialsContinue,
  onSlackVerificationContinue,
  slackVerificationError,
  onSlackAppCreated,
  agentName,
  endpoint,
  credentials,
  setCredentials,
  repairing,
  pending,
  onAutomaticBusy,
  managedAutoStart = false,
  onEndpointSaved,
  generatedWebhookSecret,
  generatingSetupSecret,
  onGenerateSetupSecret,
  onAction,
}: {
  provider: ChatProvider;
  slackStage: "app" | "credentials" | "finish";
  onSlackCredentialsContinue: () => void;
  onSlackVerificationContinue: () => void;
  slackVerificationError: boolean;
  onSlackAppCreated: () => void;
  agentName: string;
  endpoint: ChatEndpoint;
  credentials: Record<string, string>;
  setCredentials: Dispatch<SetStateAction<Record<string, string>>>;
  repairing: boolean;
  pending: boolean;
  managedAutoStart?: boolean;
  onAutomaticBusy: (busy: boolean) => void;
  onEndpointSaved: (endpoint: ChatEndpoint) => void;
  generatedWebhookSecret: string;
  generatingSetupSecret: boolean;
  onGenerateSetupSecret: () => void;
  onAction: (
    action: ChatEndpointSetupAction,
    values?: Record<string, string>,
  ) => void;
}) {
  useFullAppsTranslation();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const slackBotToken = (credentials.botToken ?? "").trim();
  const slackBotTokenInvalid = provider === "slack" && slackBotToken.length > 0 &&
    !slackBotToken.startsWith("xoxb-");
  const slackSigningSecretHasTokenPrefix = provider === "slack" &&
    /^x[a-z0-9]*-/i.test((credentials.signingSecret ?? "").trim());
  const slackCredentialsSaved = provider === "slack" && Boolean(endpoint.providerAccountId);
  const continueWithSavedSlackCredentials = slackCredentialsSaved && !repairing &&
    !slackBotToken && !credentials.signingSecret?.trim();
  const reportCopyFailure = () =>
    pushToast({
      title: fullAppsT("fullApps.couldn_t_copy_to_clipboard_72ff54"),
      body: fullAppsT("fullApps.select_and_copy_the_value_manually_d630d4"),
      tone: "error",
    });
  const field = (key: string, label: string, type = "password") => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        type={type}
        value={credentials[key] ?? ""}
        onChange={(event) =>
          setCredentials({ ...credentials, [key]: event.target.value })
        }
      />
    </label>
  );
  const openProviderSetup = (fallback: string) =>
    window.open(
      endpoint.setup?.authorizationUrl ??
        endpoint.setup?.providerUrl ??
        fallback,
      "_blank",
      "noopener,noreferrer",
    );
  const endpointValue = (label: string, value: string | null | undefined) => (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="rounded-lg border border-border bg-muted p-3 font-mono text-xs break-all">
        {value ??
          fullAppsT("fullApps.this_endpoint_is_unavailable_check_the_server_s_publ_b74970")}
      </div>
    </div>
  );
  const [manifestCopied, setManifestCopied] = useState(false);
  // A hook rather than a sticky boolean: this step stays mounted when the
  // secret is regenerated, so a latched "copied" would keep vouching for a
  // value the reader never copied. The status resets itself, and a refused
  // clipboard reads as a failure instead of a success.
  const webhookSecretCopy = useCopyAction();
  const [openingSlackApp, setOpeningSlackApp] = useState(false);
  const slackAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setOpeningSlackApp(false);
    return () => {
      if (slackAdvanceTimer.current !== null) {
        clearTimeout(slackAdvanceTimer.current);
        slackAdvanceTimer.current = null;
      }
    };
  }, [slackStage]);
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const [privateKeyFileError, setPrivateKeyFileError] = useState<AppDisplayText | null>(
    null,
  );
  const [privateKeyFileLoaded, setPrivateKeyFileLoaded] = useState(false);
  const [privateKeyFileLoading, setPrivateKeyFileLoading] = useState(false);
  const privateKeyFileInputRef = useRef<HTMLInputElement>(null);
  const privateKeyReadGuard = useRef(createGitHubPrivateKeyReadGuard()).current;
  useEffect(
    () => () => {
      privateKeyReadGuard.invalidate();
    },
    [privateKeyReadGuard],
  );
  const loadPrivateKeyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const readRevision = privateKeyReadGuard.start();
    setPrivateKeyFileError(null);
    setPrivateKeyFileLoaded(false);
    setPrivateKeyFileLoading(true);
    try {
      const privateKey = await readGitHubPrivateKeyFile(file);
      if (!privateKeyReadGuard.isCurrent(readRevision)) return;
      setCredentials((current) => ({ ...current, privateKey }));
      setPrivateKeyVisible(false);
      setPrivateKeyFileLoaded(true);
    } catch (error) {
      if (!privateKeyReadGuard.isCurrent(readRevision)) return;
      setPrivateKeyFileError(
        error instanceof Error
          ? appErrorDisplay(error)
          : ownAppDisplayText("fullApps.paperclip_couldn_t_read_that_file_choose_the_pem_fil_f8fe49"),
      );
    } finally {
      if (privateKeyReadGuard.isCurrent(readRevision)) {
        setPrivateKeyFileLoading(false);
      }
    }
  };
  const replacePrivateKey = (privateKey: string) => {
    privateKeyReadGuard.invalidate();
    setPrivateKeyFileError(null);
    setPrivateKeyFileLoaded(false);
    setPrivateKeyFileLoading(false);
    setCredentials((current) => ({ ...current, privateKey }));
  };
  const slackApp = endpoint.setup?.slackApp ?? {
    ...defaultSlackAppConfiguration(agentName),
    ...(endpoint.setup?.command ? { command: endpoint.setup.command } : {}),
  };
  const automaticSlack = isProvisionedSlackSetup(endpoint.setup?.slackSetupMethod);
  const slackValidation = slackAppConfigurationSchema.safeParse(slackApp);
  const saveSlackAndExit = () => navigate("/apps");
  const slackAppName = slackApp.appName.trim();
  const slackBotName = slackApp.botName.trim();
  const slackCommand = slackApp.command.trim();
  const slackWebhookUrl =
    endpoint.setup?.webhookUrl ?? "<paperclip-webhook-url>";
  const slackManifest = JSON.stringify(buildSlackAppManifest({
    app: { appName: slackAppName, botName: slackBotName, command: slackCommand }, agentName,
    webhookUrl: slackWebhookUrl,
    ...(automaticSlack && endpoint.setup?.slackOAuthCallbackUri ? { redirectUri: endpoint.setup.slackOAuthCallbackUri } : {}),
  }), null, 2);
  const slackCreateUrl = `https://api.slack.com/apps?new_app=1&manifest_json=${encodeURIComponent(slackManifest)}`;
  useEffect(() => setManifestCopied(false), [slackManifest]);
  const teamsClientId =
    credentials.clientId?.trim() || "<application-client-id>";
  const teamsManifestSettings = JSON.stringify(
    {
      bots: [
        {
          botId: teamsClientId,
          scopes: ["personal", "team", "groupChat"],
          supportsFiles: true,
          isNotificationOnly: false,
          commandLists: [
            {
              scopes: ["personal", "groupChat"],
              commands: [
                {
                  title: "/status",
                  description: fullAppsT("fullApps.show_the_active_paperclip_task_status_5475e3"),
                },
                {
                  title: "/new",
                  description: fullAppsT("fullApps.start_a_new_paperclip_task_in_this_chat_7986d3"),
                },
                {
                  title: "/close",
                  description: fullAppsT("fullApps.close_the_active_chat_conversation_0ac684"),
                },
              ],
            },
          ],
        },
      ],
      webApplicationInfo: {
        id: teamsClientId,
        resource: "https://paperclip.ing",
      },
      authorization: {
        permissions: {
          resourceSpecific: [
            { name: "ChannelMessage.Read.Group", type: "Application" },
            { name: "ChatMessage.Read.Chat", type: "Application" },
          ],
        },
      },
    },
    null,
    2,
  );
  if (provider === "speko") return <SpekoProviderSetup onSaveExit={() => navigate("/apps")} agentName={agentName} credentials={credentials} onChange={setCredentials} onConnect={(values) => onAction(repairing ? "reconnect" : "configure", values)} callbackUrl={endpoint.setup?.webhookUrl} pending={pending} repairing={repairing} signingSecretConfigured={endpoint.setup?.webhookSecretConfigured} />;
  if (provider === "imessage-photon") return <PhotonConnectStep endpoint={endpoint} agentName={agentName} repairing={repairing} pending={pending} onAction={onAction} />;
  if (provider === "discord") {
    const applicationId = credentials.applicationId?.trim() ?? "";
    const guildId = credentials.guildId?.trim() ?? "";
    const installUrl = applicationId
      ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(applicationId)}&permissions=309237763136&scope=bot${guildId ? `&guild_id=${encodeURIComponent(guildId)}&disable_guild_select=true` : ""}`
      : null;
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold"><FullAppsTrans i18nKey="fullApps.connect_to_discord_d6d0a1" components={{ part1: <>{agentName}</> }} /></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repairing
              ? fullAppsT("fullApps.reconnect_verifies_this_same_discord_application_and_526a3c")
              : fullAppsT("fullApps.create_one_dedicated_discord_application_and_bot_for_addb1a")}
          </p>
        </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>{fullAppsT("fullApps.in_discord_developer_portal_create_an_application_co_c64fd9")}</li>
          <li>{fullAppsT("fullApps.open_bot_create_the_bot_enable_message_content_inten_de4d6d")}</li>
          <li>{fullAppsT("fullApps.enable_developer_mode_in_discord_right_click_the_tar_65acc2")}</li>
          <li>{fullAppsT("fullApps.enter_those_values_below_then_use_the_generated_inst_552ecc")}</li>
        </ol>
        <Button
          variant="outline"
          onClick={() =>
            openProviderSetup("https://discord.com/developers/applications")
          }
        >{fullAppsT("fullApps.open_discord_developer_portal_090b2a")}<ExternalLink />
        </Button>
        {field("applicationId", fullAppsT("fullApps.application_id_77e90b"), "text")}
        {field("guildId", fullAppsT("fullApps.server_id_ff21e8"), "text")}
        {field("botToken", fullAppsT("fullApps.bot_token_5bb9ae"))}
        {installUrl && (
          <Button asChild variant="outline">
            <a href={installUrl} target="_blank" rel="noreferrer">{fullAppsT("fullApps.install_bot_in_this_server_8f6e4f")}<ExternalLink />
            </a>
          </Button>
        )}
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_install_link_grants_only_view_channels_send_mess_1f80c9")}</p>
        <Button
          disabled={
            (!repairing &&
              (!credentials.applicationId ||
                !credentials.guildId ||
                !credentials.botToken)) ||
            pending
          }
          onClick={() =>
            onAction(repairing ? "reconnect" : "configure", credentials)
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {repairing ? fullAppsT("fullApps.reconnect_discord_bot_5abd85") : fullAppsT("fullApps.connect_discord_bot_e2cc44")}
        </Button>
      </div>
    );
  }
  if (provider === "telegram")
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold"><FullAppsTrans i18nKey="fullApps.create_in_telegram_768c9d" components={{ part1: <>{agentName}</> }} /></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repairing
              ? fullAppsT("fullApps.reconnect_verifies_this_same_botfather_bot_and_autom_ac88d2")
              : fullAppsT("fullApps.create_a_bot_with_botfather_then_paste_the_token_it__e7cbd4")}
          </p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li><FullAppsTrans i18nKey="fullApps.open_botfather_and_send_095abf" components={{ part1: <code>/newbot</code> }} /></li>
          <li>{fullAppsT("fullApps.enter_the_bot_display_name_4feda6")}</li>
          <li><FullAppsTrans i18nKey="fullApps.choose_an_available_username_ending_in_100269" components={{ part1: <code>bot</code> }} /></li>
        </ol>
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.paperclip_works_with_telegram_s_default_bot_privacy__1eac38" components={{ part1: <>{" "}</>, part2: <code>/task@bot_username &lt;request&gt;</code> }} /></p>
        <Button
          variant="outline"
          onClick={() => openProviderSetup("https://t.me/BotFather")}
        >{fullAppsT("fullApps.open_botfather_a099b6")}<ExternalLink />
        </Button>
        {field("botToken", fullAppsT("fullApps.bot_token_5bb9ae"))}
        {(!endpoint.setup?.webhookUrl || automaticSlack && !endpoint.setup?.slackOAuthCallbackUri?.startsWith("https://")) && (
          <p className="text-sm text-destructive">{fullAppsT("fullApps.configure_a_public_https_url_for_this_paperclip_inst_be6146")}</p>
        )}
        <Button
          disabled={
            (!repairing && !credentials.botToken) ||
            !endpoint.setup?.webhookUrl ||
            pending
          }
          onClick={() =>
            onAction(repairing ? "reconnect" : "configure", credentials)
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {repairing ? fullAppsT("fullApps.reconnect_bot_56693e") : fullAppsT("fullApps.connect_bot_301e42")}
        </Button>
      </div>
    );
  if (provider === "microsoft-teams")
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold"><FullAppsTrans i18nKey="fullApps.connect_to_microsoft_teams_e38adc" components={{ part1: <>{agentName}</> }} /></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repairing
              ? fullAppsT("fullApps.reconnect_verifies_this_same_microsoft_app_tenant_an_328b17")
              : fullAppsT("fullApps.use_your_own_microsoft_app_credentials_for_this_bot_556108")}
          </p>
        </div>
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{fullAppsT("fullApps.this_setup_requires_a_microsoft_365_work_or_school_o_ec9dc0")}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>{fullAppsT("fullApps.in_microsoft_entra_create_a_single_tenant_app_regist_4a2aac")}</li>
          <li>{fullAppsT("fullApps.in_azure_create_an_azure_bot_choose_single_tenant_us_cf6848")}</li>
          <li>{fullAppsT("fullApps.in_teams_developer_portal_create_an_app_add_a_bot_wi_d8d35e")}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a
              href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noreferrer"
            >{fullAppsT("fullApps.open_microsoft_entra_f23b82")}<ExternalLink />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://portal.azure.com/#create/Microsoft.AzureBot"
              target="_blank"
              rel="noreferrer"
            >{fullAppsT("fullApps.create_azure_bot_adaaf3")}<ExternalLink />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://dev.teams.microsoft.com/apps"
              target="_blank"
              rel="noreferrer"
            >{fullAppsT("fullApps.open_teams_developer_portal_8606db")}<ExternalLink />
            </a>
          </Button>
        </div>
        {endpointValue(
          fullAppsT("fullApps.paperclip_messaging_endpoint_8201b3"),
          endpoint.setup?.messagingEndpoint,
        )}
        {field("clientId", "Application / Client ID", "text")}
        {field("tenantId", "Directory / Tenant ID", "text")}
        {field("clientSecret", fullAppsT("fullApps.client_secret_value_1aae7c"))}
        <section className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">{fullAppsT("fullApps.microsoft_portal_field_map_6a0f14")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.use_these_exact_portal_sections_and_reuse_the_same_a_8bea85")}</p>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li><FullAppsTrans i18nKey="fullApps.select_choose_then_select_copy_and_under_select_and__953197" components={{ part1: <strong>Microsoft Entra admin center · App registrations</strong>, part2: <strong>New registration</strong>, part3: <>{" "}</>, part4: <strong>
                Accounts in this organizational directory only (Single tenant)
              </strong>, part5: <strong>Register</strong>, part6: <>{" "}</>, part7: <strong>Application (client) ID</strong>, part8: <>{" "}</>, part9: <strong>Directory (tenant) ID</strong>, part10: <>{" "}</>, part11: <strong>Certificates &amp; secrets · Client secrets</strong>, part12: <strong>New client secret</strong>, part13: <>{" "}</>, part14: <strong>Value</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.set_to_set_to_and_enter_the_application_id_and_tenan_b45977" components={{ part1: <strong>Azure · Create Azure Bot</strong>, part2: <>{" "}</>, part3: <strong>Microsoft App ID</strong>, part4: <>{" "}</>, part5: <strong>Single Tenant</strong>, part6: <strong>Creation type</strong>, part7: <>{" "}</>, part8: <strong>Use existing app registration</strong>, part9: <>{" "}</>, part10: <strong>Settings · Configuration</strong>, part11: <>{" "}</>, part12: <strong>Messaging endpoint</strong>, part13: <>{" "}</>, part14: <strong>Settings · Channels</strong>, part15: <>{" "}</>, part16: <strong>Microsoft Teams</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.select_under_add_an_existing_bot_using_the_same_appl_2749bd" components={{ part1: <strong>Teams Developer Portal · Apps</strong>, part2: <>{" "}</>, part3: <strong>New app</strong>, part4: <>{" "}</>, part5: <strong>Configure · App features · Bot</strong>, part6: <>{" "}</>, part7: <strong>Personal</strong>, part8: <strong>Team</strong>, part9: <>{" "}</>, part10: <strong>Group chat</strong>, part11: <>{" "}</>, part12: <strong>Configure · Permissions</strong>, part13: <>{" "}</>, part14: <strong>Application</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.select_choose_the_downloaded_package_and_install_it__4082c6" components={{ part1: <strong>Microsoft Teams · Apps · Manage your apps</strong>, part2: <>{" "}</>, part3: <strong>Upload an app · Upload a custom app</strong> }} /></li>
          </ol>
        </section>
        <label className="grid gap-2 text-sm font-medium">{fullAppsT("fullApps.required_teams_app_manifest_block_55ea4f")}<Textarea
            className="min-h-80 font-mono text-xs"
            readOnly
            value={teamsManifestSettings}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!credentials.clientId?.trim()}
            onClick={() => {
              void copyTextToClipboard(teamsManifestSettings).then(
                () => setManifestCopied(true),
                reportCopyFailure,
              );
            }}
          >
            {manifestCopied
              ? fullAppsT("fullApps.manifest_settings_copied_c8f17e")
              : fullAppsT("fullApps.copy_manifest_settings_b0b424")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.enter_the_application_client_id_above_before_copying_bb8a73")}</p>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.paperclip_does_not_use_teams_single_sign_on_in_this__6531be" components={{ part1: <code>webApplicationInfo</code> }} /></p>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_two_application_rsc_permissions_let_the_bot_rece_7578d0")}</p>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.this_release_supports_personal_chats_group_chats_and_c75b60" components={{ part1: <code>supportsFiles: true</code>, part2: <>{" "}</> }} /></p>
        {!endpoint.setup?.messagingEndpoint && (
          <p className="text-sm text-destructive">{fullAppsT("fullApps.configure_a_public_https_url_for_this_paperclip_inst_64624a")}</p>
        )}
        <Button
          disabled={
            (!repairing &&
              (!credentials.clientId ||
                !credentials.tenantId ||
                !credentials.clientSecret)) ||
            !endpoint.setup?.messagingEndpoint ||
            pending
          }
          onClick={() =>
            onAction(repairing ? "reconnect" : "configure", credentials)
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {repairing
            ? fullAppsT("fullApps.reconnect_microsoft_app_c3748c")
            : fullAppsT("fullApps.verify_microsoft_credentials_716e44")}
        </Button>
      </div>
    );
  if (provider === "github")
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">
            {repairing
              ? fullAppsT("fullApps.reconnect_github_app_39ee43")
              : fullAppsT("fullApps.create_or_connect_a_github_app_2ede47")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repairing
              ? fullAppsT("fullApps.reconnect_verifies_this_same_app_and_installation_th_e9a6cd")
              : fullAppsT("fullApps.configure_its_webhook_and_permissions_then_verify_th_42a657")}
          </p>
        </div>
        {!repairing && (
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>{fullAppsT("fullApps.under_the_target_user_or_organization_create_a_new_g_d17f40")}</li>
            <li><FullAppsTrans i18nKey="fullApps.keep_on_enter_the_paperclip_webhook_url_and_the_pape_f3bc62" components={{ part1: <strong>Webhooks · Active</strong>, part2: <strong>Enable SSL verification</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.under_repository_permissions_set_and_to_leave_every__078f81" components={{ part1: <strong>Issues</strong>, part2: <>{" "}</>, part3: <strong>Pull requests</strong>, part4: <>{" "}</>, part5: <strong>Read &amp; write</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.subscribe_to_github_sends_and_to_every_github_app_au_e7edb8" components={{ part1: <strong>Issue comment</strong>, part2: <code>issue_comment</code>, part3: <>{" "}</>, part4: <strong>Pull request review comment</strong>, part5: <code>pull_request_review_comment</code>, part6: <>{" "}</>, part7: <code>installation</code>, part8: <>{" "}</>, part9: <code>installation_repositories</code> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.choose_create_the_app_copy_its_app_id_generate_one_p_6ad7a5" components={{ part1: <strong>Only on this account</strong> }} /></li>
          </ol>
        )}
        {endpointValue(
          fullAppsT("fullApps.paperclip_homepage_url_d06f60"),
          publicOrigin(endpoint.setup?.webhookUrl),
        )}
        {endpointValue(fullAppsT("fullApps.paperclip_webhook_url_57aa8a"), endpoint.setup?.webhookUrl)}
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              repairing
                ? "https://github.com/settings/apps"
                : (endpoint.setup?.authorizationUrl ??
                    "https://github.com/settings/apps/new"),
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          {repairing ? fullAppsT("fullApps.open_github_app_settings_139552") : fullAppsT("fullApps.open_new_github_app_form_09512a")}{" "}
          <ExternalLink />
        </Button>
        {field("appId", "GitHub App ID", "text")}
        <div className="grid gap-2 text-sm font-medium">
          <label htmlFor="github-private-key">{fullAppsT("fullApps.private_key_pem_1a5ad9")}</label>
          <div className="relative">
            {privateKeyVisible ? (
              <Textarea
                id="github-private-key"
                className="min-h-24 pr-11 font-mono text-xs"
                value={credentials.privateKey ?? ""}
                onChange={(event) => replacePrivateKey(event.target.value)}
              />
            ) : (
              <Input
                id="github-private-key"
                type="password"
                className="pr-11 font-mono text-xs"
                value={credentials.privateKey ?? ""}
                onChange={(event) => replacePrivateKey(event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  replacePrivateKey(event.clipboardData.getData("text"));
                }}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1"
              aria-label={
                privateKeyVisible ? fullAppsT("fullApps.hide_private_key_6ffb67") : fullAppsT("fullApps.show_private_key_adde31")
              }
              onClick={() => setPrivateKeyVisible((visible) => !visible)}
            >
              {privateKeyVisible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <input
            ref={privateKeyFileInputRef}
            type="file"
            accept=".pem,.key,application/x-pem-file,application/pkcs8,text/plain"
            className="hidden"
            aria-label={fullAppsT("fullApps.choose_github_app_private_key_file_676237")}
            onChange={loadPrivateKeyFile}
          />
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => privateKeyFileInputRef.current?.click()}
            >{fullAppsT("fullApps.choose_pem_file_bd0840")}</Button>
          </div>
          {privateKeyFileError ? (
            <p role="alert" className="text-sm text-destructive">
              {renderAppDisplayText(privateKeyFileError)}
            </p>
          ) : null}
          {privateKeyFileLoading ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >{fullAppsT("fullApps.reading_private_key_file_c5c985")}</p>
          ) : privateKeyFileLoaded ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >{fullAppsT("fullApps.private_key_loaded_it_stays_in_this_form_until_you_c_13a973")}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{fullAppsT("fullApps.webhook_secret_342da9")}</p>
          {generatedWebhookSecret ? (
            <>
              <Input
                aria-label={fullAppsT("fullApps.generated_webhook_secret_90e15b")}
                className="font-mono text-xs"
                readOnly
                value={generatedWebhookSecret}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Both signals, and each covers the other's blind spot.
                    // The toast is the loud one, the way this step's other two
                    // copy buttons report failure — but the provider dedupes an
                    // identical toast inside 3.5s, so a reader who clicks twice
                    // on a blocked clipboard would see nothing the second time.
                    // The inline state answers every click.
                    void webhookSecretCopy
                      .copy(generatedWebhookSecret)
                      .then((status) => {
                        if (status === "failed") reportCopyFailure();
                      });
                  }}
                >
                  {webhookSecretCopy.copied
                    ? fullAppsT("fullApps.webhook_secret_copied_444c36")
                    : webhookSecretCopy.failed
                      ? fullAppsT("fullApps.couldn_t_copy_select_it_manually_368f60")
                      : fullAppsT("fullApps.copy_webhook_secret_a6635b")}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.copy_this_value_now_paperclip_will_not_show_it_again_32126b")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {endpoint.setup?.webhookSecretConfigured
                ? fullAppsT("fullApps.a_webhook_secret_is_configured_and_cannot_be_shown_a_60ae90")
                : fullAppsT("fullApps.generate_the_secret_in_paperclip_then_paste_it_into__765173")}
            </p>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={generatingSetupSecret}
              onClick={onGenerateSetupSecret}
            >
              {generatingSetupSecret && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {endpoint.setup?.webhookSecretConfigured
                ? fullAppsT("fullApps.regenerate_webhook_secret_825666")
                : fullAppsT("fullApps.generate_webhook_secret_cfbc14")}
            </Button>
          </div>
          {endpoint.setup?.webhookSecretConfigured && (
            <p className="text-sm text-muted-foreground">
              {endpoint.providerAccountId || endpoint.botExternalId
                ? fullAppsT("fullApps.regenerating_immediately_invalidates_github_webhook__ca9e3b")
                : fullAppsT("fullApps.generating_another_secret_replaces_the_previous_valu_7ac931")}
            </p>
          )}
          {endpoint.setup?.webhookSecretConfigured && (
            <p
              className={`text-sm ${endpoint.setup.webhookVerifiedAt ? "text-foreground" : "text-muted-foreground"}`}
            >
              {endpoint.setup.webhookVerifiedAt
                ? fullAppsT("fullApps.github_has_verified_this_webhook_f7c4fe")
                : fullAppsT("fullApps.waiting_for_github_to_deliver_its_signed_webhook_pin_4255e1")}
            </p>
          )}
        </div>
        {(!endpoint.setup?.webhookUrl || automaticSlack && !endpoint.setup?.slackOAuthCallbackUri?.startsWith("https://")) && (
          <p className="text-sm text-destructive">{fullAppsT("fullApps.configure_a_public_https_url_for_this_paperclip_inst_54b718")}</p>
        )}
        <Button
          disabled={
            (!repairing && (!credentials.appId || !credentials.privateKey)) ||
            !endpoint.setup?.webhookSecretConfigured ||
            !endpoint.setup?.webhookVerifiedAt ||
            !endpoint.setup?.webhookUrl ||
            privateKeyFileLoading ||
            generatingSetupSecret ||
            pending
          }
          onClick={() =>
            onAction(repairing ? "reconnect" : "configure", credentials)
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {repairing ? fullAppsT("fullApps.reconnect_and_verify_948723") : fullAppsT("fullApps.connect_and_verify_a2bfc0")}
        </Button>
      </div>
    );
  const slackRequestUrlInstructions = <ol className="list-decimal space-y-2 pl-5 text-sm">
      <li><a className="underline underline-offset-4" href={endpoint.setup?.slackRegistration?.appId ? `https://api.slack.com/apps/${encodeURIComponent(endpoint.setup.slackRegistration.appId)}/event-subscriptions` : "https://api.slack.com/apps"} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_slack_app_settings_30cfde")}<ExternalLink className="inline size-3" /></a>{fullAppsT("fullApps.and_choose_566c1f")}<strong>{slackApp.appName}</strong>.</li>
      <li><FullAppsTrans i18nKey="fullApps.choose_6b07ad" components={{ part1: <strong>Event Subscriptions</strong> }} /></li>
      <li><FullAppsTrans i18nKey="fullApps.beside_the_prefilled_click_if_it_isn_t_verified_save_df48c9" components={{ part1: <strong>Request URL</strong>, part2: <strong>Retry</strong> }} /></li>
    </ol>;
  if (slackStage === "finish")
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">{automaticSlack ? fullAppsT("fullApps.send_a_message_to_your_agent_48d584") : fullAppsT("fullApps.verify_slack_connection_f64c0a")}</h1>
          {!automaticSlack && <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.slack_needs_to_confirm_that_it_can_reach_your_paperc_a2c02d")}</p>}
        </div>
        {automaticSlack ? <Button asChild variant="outline"><a href={endpoint.setup?.slackAccount?.dmChannelId && endpoint.providerAccountId ? `https://app.slack.com/client/${encodeURIComponent(endpoint.providerAccountId)}/${encodeURIComponent(endpoint.setup.slackAccount.dmChannelId)}` : endpoint.setup?.providerUrl ?? "https://app.slack.com"} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_slack_4ddf02")}<ExternalLink className="size-4" /></a></Button> : slackRequestUrlInstructions}
        {endpoint.setup?.webhookVerifiedAt ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-(--status-task-done)" />{fullAppsT("fullApps.your_slack_connection_is_working_33e867")}{pending ? automaticSlack ? fullAppsT("fullApps.finishingSetup") : fullAppsT("fullApps.openingMessageTest") : ""}
          </p>
        ) : slackVerificationError ? (
          <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_check_verification_we_ll_keep_trying_check__e9747d")}</p>
        ) : (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {automaticSlack ? fullAppsT("fullApps.waiting_for_your_message_03cbcf") : fullAppsT("fullApps.waiting_for_slack_we_ll_continue_automatically_6e9b68")}
          </p>
        )}
        <SlackSetupAdvanced label={automaticSlack ? fullAppsT("fullApps.didn_t_work_8f0821") : fullAppsT("fullApps.troubleshooting_c3af07")}>
          {automaticSlack && slackRequestUrlInstructions}
          <p className="text-muted-foreground">{fullAppsT("fullApps.if_the_request_url_is_missing_or_different_paste_thi_f35fe9")}</p>
          {endpointValue(fullAppsT("fullApps.paperclip_webhook_url_57aa8a"), endpoint.setup?.webhookUrl)}
        </SlackSetupAdvanced>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate("/apps")}>{fullAppsT("agentSetupUi.setup.saveExit")}</Button>
          {(!automaticSlack || endpoint.setup?.webhookVerifiedAt) && <Button disabled={pending || !endpoint.setup?.webhookVerifiedAt} onClick={() =>
            endpoint.setup?.step === "provider_setup" ? onAction("verify") : onSlackVerificationContinue()
          }>{pending && <Loader2 className="size-4 animate-spin" />}{fullAppsT("onboarding.actions.continue")}</Button>}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      {(!endpoint.setup?.webhookUrl || automaticSlack && !endpoint.setup?.slackOAuthCallbackUri?.startsWith("https://")) && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{fullAppsT("fullApps.public_https_url_required_e211fd")}</p>
            <p className="text-sm">{fullAppsT("fullApps.slack_needs_a_public_https_url_to_send_messages_to_p_4d8a53")}</p>
            <a
              href="https://docs.paperclip.ing/reference/deploy/https/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4"
            >{fullAppsT("fullApps.learn_how_to_set_up_https_d73f79")}</a>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold">{endpoint.setup?.slackSetupMethod === "managed" ? fullAppsT("fullApps.connect_to_slack_cfcdea") : slackStage === "app" ? automaticSlack ? fullAppsT("fullApps.app_configuration_access_token_c6fb13") : fullAppsT("fullApps.create_a_slack_app_80a0f9") : automaticSlack ? fullAppsT("fullApps.install_slack_app_8c9397") : fullAppsT("fullApps.add_slack_credentials_eafbd7")}</h1>
        {repairing && !automaticSlack && (
          <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.reconnect_verifies_or_replaces_credentials_for_this__c4328e")}</p>
        )}
      </div>
      <div hidden={slackStage !== "app" || automaticSlack} className="space-y-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground underline underline-offset-4">{fullAppsT("fullApps.view_slack_app_manifest_d0918c")}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{fullAppsT("fullApps.slack_app_manifest_3d57b6")}</DialogTitle>
                  <DialogDescription>{fullAppsT("fullApps.generated_from_your_app_name_bot_name_and_slash_comm_1feb77")}</DialogDescription>
                </DialogHeader>
                <Textarea
                  aria-label={fullAppsT("fullApps.slack_app_manifest_3d57b6")}
                  className="h-80 font-mono text-xs"
                  readOnly
                  value={slackManifest}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={!slackValidation.success}
                    onClick={() => {
                      void copyTextToClipboard(slackManifest).then(
                        () => setManifestCopied(true),
                        reportCopyFailure,
                      );
                    }}
                  >
                    {manifestCopied ? fullAppsT("fullApps.manifest_copied_64e643") : fullAppsT("fullApps.copy_manifest_415f92")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {!automaticSlack && <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => void saveSlackAndExit()}>{fullAppsT("agentSetupUi.setup.saveExit")}</Button>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" disabled={openingSlackApp || !endpoint.setup?.webhookUrl || !slackValidation.success} onClick={onSlackAppCreated}>{fullAppsT("fullApps.i_already_created_the_app_b71ded")}</Button>
            {!repairing && (
              <Button
                disabled={openingSlackApp || !endpoint.setup?.webhookUrl || !slackValidation.success}
                onClick={() => {
                  window.open(slackCreateUrl, "_blank", "noopener,noreferrer");
                  setOpeningSlackApp(true);
                  // Let Slack open before changing the step behind its new tab.
                  slackAdvanceTimer.current = setTimeout(() => {
                    slackAdvanceTimer.current = null;
                    setOpeningSlackApp(false);
                    onSlackAppCreated();
                  }, 1000);
                }}
              >{fullAppsT("fullApps.create_slack_app_7e043d")}<ExternalLink />
              </Button>
            )}
          </div>
        </div>}
      </div>
      {automaticSlack && <SlackSetup
        key={endpoint.id}
        autoStart={managedAutoStart}
        reconnect={repairing}
        endpoint={endpoint} stage={slackStage} disabled={!endpoint.setup?.webhookUrl || !endpoint.setup?.slackOAuthCallbackUri?.startsWith("https://") || !slackValidation.success}
        saveDetails={async () => {}}
        onBusy={onAutomaticBusy} onSaved={onEndpointSaved} onContinue={onSlackAppCreated}
        onManual={async existing => {
          onEndpointSaved(await chatEndpointsApi.update(endpoint.id, { slackSetupMethod: existing ? "existing" : "manual" }));
          if (existing) onSlackAppCreated();
        }}
        onSaveExit={() => void saveSlackAndExit()}
      />}
      {!automaticSlack && <div hidden={slackStage !== "credentials"} className="space-y-5">
        <p className="text-sm">{fullAppsT("fullApps.now_you_need_to_find_two_secrets_they_are_in_two_dif_6aa5da")}</p>
        {slackCredentialsSaved && !repairing && (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.your_credentials_are_saved_leave_the_fields_blank_to_817aa6")}</p>
        )}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold"><label htmlFor="slack-bot-token">Bot User OAuth Token</label></h2>
          <ul id="slack-bot-token-help" className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{fullAppsT("fullApps.open_slack_app_settings_30cfde")}<ExternalLink className="inline size-3" />
              </a>{fullAppsT("fullApps.and_choose_566c1f")}<strong>{slackApp.appName}</strong>.
            </li>
            <li><FullAppsTrans i18nKey="fullApps.choose_bc1cb3" components={{ part1: <strong>OAuth &amp; Permissions</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.copy_and_paste_your_cb641c" components={{ part1: <strong>Bot OAuth Token</strong> }} /></li>
          </ul>
          <Input
            id="slack-bot-token"
            type="password"
            placeholder={slackCredentialsSaved ? fullAppsT("fullApps.saved_leave_blank_to_keep_f1a85f") : undefined}
            value={credentials.botToken ?? ""}
            aria-invalid={slackBotTokenInvalid || undefined}
            aria-describedby={`slack-bot-token-help${slackBotTokenInvalid ? " slack-bot-token-warning" : ""}`}
            onChange={(event) => setCredentials({ ...credentials, botToken: event.target.value })}
          />
          {slackBotTokenInvalid && (
            <p id="slack-bot-token-warning" role="alert" className="text-sm text-destructive"><FullAppsTrans i18nKey="fullApps.your_bot_user_oauth_token_must_start_with_copy_it_fr_a91af1" components={{ part1: <code>xoxb-</code>, part2: <strong>OAuth &amp; Permissions</strong> }} /></p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold"><label htmlFor="slack-signing-secret">Signing Secret</label></h2>
          <ul id="slack-signing-secret-help" className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{fullAppsT("fullApps.open_slack_app_settings_30cfde")}<ExternalLink className="inline size-3" />
              </a>{fullAppsT("fullApps.and_choose_566c1f")}<strong>{slackApp.appName}</strong>.
            </li>
            <li><FullAppsTrans i18nKey="fullApps.choose_bc1cb3" components={{ part1: <strong>Basic Information</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.copy_and_paste_your_cb641c" components={{ part1: <strong>Signing Secret</strong> }} /></li>
          </ul>
          <Input
            id="slack-signing-secret"
            type="password"
            placeholder={slackCredentialsSaved ? fullAppsT("fullApps.saved_leave_blank_to_keep_f1a85f") : undefined}
            value={credentials.signingSecret ?? ""}
            aria-invalid={slackSigningSecretHasTokenPrefix || undefined}
            aria-describedby={`slack-signing-secret-help${slackSigningSecretHasTokenPrefix ? " slack-signing-secret-warning" : ""}`}
            onChange={(event) => setCredentials({ ...credentials, signingSecret: event.target.value })}
          />
          {slackSigningSecretHasTokenPrefix && (
            <p id="slack-signing-secret-warning" role="alert" className="text-sm text-destructive"><FullAppsTrans i18nKey="fullApps.use_the_not_an_app_or_bot_token_the_signing_secret_h_88ad85" components={{ part1: <strong>Signing Secret</strong> }} /></p>
          )}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate("/apps")}>{fullAppsT("agentSetupUi.setup.saveExit")}</Button>
          <Button
            className="ml-auto"
            disabled={
              (!repairing && !slackCredentialsSaved && (!slackBotToken || !credentials.signingSecret?.trim())) ||
              !endpoint.setup?.webhookUrl || !slackValidation.success ||
              pending || slackSigningSecretHasTokenPrefix || slackBotTokenInvalid
            }
            onClick={() => continueWithSavedSlackCredentials
              ? onSlackCredentialsContinue()
              : onAction(repairing || slackCredentialsSaved ? "reconnect" : "configure", credentials)}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {continueWithSavedSlackCredentials ? fullAppsT("onboarding.actions.continue") : repairing || slackCredentialsSaved ? fullAppsT("fullApps.reconnect_slack_app_dcbcb3") : fullAppsT("fullApps.connect_slack_app_db03af")}
          </Button>
        </div>
      </div>}
    </div>
  );
}

function TryStep({
  endpointId,
  provider,
  agentName,
  botLabel,
  botUsername,
  slackAccount,
  photonAllocation,
  providerUrl,
  guestIsolationState,
  pending,
  onOpenAccess,
  onTest,
  onSaveExit,
}: {
  endpointId: string;
  provider: ChatProvider;
  agentName: string;
  botLabel?: string | null;
  botUsername?: string | null;
  slackAccount?: import("@paperclipai/shared").SlackAccountState;
  photonAllocation?: "dedicated" | "shared";
  providerUrl?: string | null;
  guestIsolationState: "loading" | "enabled" | "disabled" | "unknown";
  pending: boolean;
  onOpenAccess: () => void;
  onTest: () => void;
  onSaveExit: () => void;
}) {
  useFullAppsTranslation();
  const [commandCopied, setCommandCopied] = useState(false);
  const [commandCopyError, setCommandCopyError] = useState(false);
  const principalsQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.principals(endpointId),
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
    enabled: provider !== "slack",
    refetchInterval: 1_500,
  });
  const [numberCopied, setNumberCopied] = useState(false);
  const [copyError, setCopyError] = useState<AppDisplayText | null>(null);
  const identities = principalsQuery.data ?? [];
  const unlinkedIdentities = identities.filter(
    (identity) => identity.status !== "linked",
  );
  const freshConversationInstruction =
    provider === "imessage-photon" ? fullAppsT("fullApps.send_a_fresh_message_to_your_photon_number_c0a082") : provider === "telegram"
      ? fullAppsT("fullApps.start_a_fresh_conversation_with_new_and_send_the_tes_21f484")
      : provider === "github"
        ? fullAppsT("fullApps.start_a_new_issue_or_pull_request_conversation_and_m_33065f")
        : provider === "microsoft-teams"
          ? fullAppsT("fullApps.start_a_new_channel_post_and_mention_the_agent_again_e77379")
          : fullAppsT("fullApps.send_a_new_root_mention_to_the_agent_5e9f1b");
  const identityGuidance = provider === "slack" ? null : provider === "imessage-photon" && principalsQuery.isSuccess && (identities.length === 0 || unlinkedIdentities.length > 0)
    ? { tone: "info" as const, title: fullAppsT("fullApps.link_your_messages_identity_6f8fce"), body: fullAppsT("fullApps.send_one_message_to_discover_your_phone_number_or_ap_afa9d8") }
    : principalsQuery.isError
    ? {
        tone: "warning" as const,
        title: fullAppsT("fullApps.identity_readiness_could_not_be_checked_eadefd"),
        body: fullAppsT("fullApps.message_3d2c413e257c", { value1: freshConversationInstruction }),
      }
    : !principalsQuery.isSuccess || guestIsolationState === "loading"
      ? null
      : identities.length === 0
        ? guestIsolationState === "disabled"
          ? {
              tone: "warning" as const,
              title: fullAppsT("fullApps.link_the_account_you_re_testing_8e3ed0"),
              body:
                provider === "telegram"
                  ? fullAppsT("fullApps.tap_start_in_telegram_to_discover_your_account_the_w_e600f1")
                  : fullAppsT("fullApps.message_09492f0a262a", { value1: providerNames[provider], value2: agentName, value3: freshConversationInstruction }),
            }
          : {
              tone: "info" as const,
              title: fullAppsT("fullApps.your_first_message_identifies_your_account_c6aabd"),
              body:
                provider === "telegram"
                  ? fullAppsT("fullApps.tap_start_in_telegram_to_discover_your_account_until_4f2014")
                  : fullAppsT("fullApps.message_3f0841934a2c", { value1: freshConversationInstruction }),
            }
        : unlinkedIdentities.length > 0
          ? guestIsolationState === "disabled"
            ? {
                tone: "warning" as const,
                title: fullAppsT("fullApps.link_the_account_you_re_testing_8e3ed0"),
                body: fullAppsT("fullApps.message_d13a7b2f3e43", { value1: agentName, value2: freshConversationInstruction }),
              }
            : {
                tone: "info" as const,
                title: fullAppsT("fullApps.unlinked_identity_detected_f9a121"),
                body: fullAppsT("fullApps.message_72c68dd85dac", { value1: freshConversationInstruction }),
              }
          : null;
  const providerBotUsername = botUsername?.replace(/^@/, "");
  const normalizedBotUsername =
    provider === "github"
      ? providerBotUsername?.replace(/\[bot\]$/i, "")
      : providerBotUsername;
  const botMention = normalizedBotUsername
    ? `@${normalizedBotUsername}`
    : (botLabel ?? agentName);
  const slackTestMessage = slackAccount?.status === "linked" ? fullAppsT("fullApps.you_there_8c7b79") : fullAppsT("fullApps.you_there_089082", { value1: botMention.startsWith("@") ? botMention : `@${botMention}` });
  const instructions =
    provider === "imessage-photon" ? [
      photonAllocation === "shared" ? fullAppsT("fullApps.in_your_photon_project_enroll_your_sender_in_users_a_ad5d30") : fullAppsT("fullApps.message_d14d072bdf37", { value1: botUsername ?? botLabel ?? fullAppsT("fullApps.copy_a9dff50fc4ff") }),
      fullAppsT("fullApps.link_the_discovered_sender_to_a_paperclip_person_in__a4e720"),
      fullAppsT("fullApps.wait_for_the_agent_s_actual_reply_setup_completes_af_715fab"),
      ...(photonAllocation === "shared" ? [fullAppsT("fullApps.this_pro_compatible_channel_supports_dms_only_group__337781")] : [fullAppsT("fullApps.for_a_group_add_the_number_in_messages_send_a_messag_8ce529")]),
    ] : provider === "discord"
      ? [
          fullAppsT("fullApps.open_a_text_channel_where_the_bot_is_installed_78e784"),
          fullAppsT("fullApps.message_a0b92606cbe1", { value1: botMention }),
          fullAppsT("fullApps.message_3a03b990bd4e", { value1: agentName }),
        ]
      : provider === "telegram"
        ? [
            fullAppsT("fullApps.open_the_bot_s_private_chat_8a8159"),
            fullAppsT("fullApps.tap_start_1a183a"),
            fullAppsT("fullApps.send_help_me_test_this_6b61d9"),
          ]
        : provider === "github"
          ? [
              fullAppsT("fullApps.open_an_installed_issue_or_pull_request_0e6bba"),
              fullAppsT("fullApps.message_9feb61c84809", { value1: botMention }),
              fullAppsT("fullApps.add_another_comment_to_continue_the_same_task_2bf1a5"),
            ]
          : provider === "microsoft-teams"
            ? [
                fullAppsT("fullApps.open_an_installed_channel_and_start_a_new_post_3bff28"),
                fullAppsT("fullApps.message_7b3a347b36e5", { value1: botMention }),
                fullAppsT("fullApps.reply_once_beneath_the_post_ed5e8d"),
              ]
            : [
                fullAppsT("fullApps.message_e4dd07dcc7cc", { value1: botMention }),
                fullAppsT("fullApps.message_ca022826dc3c", { value1: botMention }),
                fullAppsT("fullApps.message_9c1afd08e045", { value1: agentName }),
              ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold"><FullAppsTrans i18nKey="fullApps.try_in_b593d1" components={{ part1: <>{agentName}</>, part2: <>{providerNames[provider]}</> }} /></h1>
        {provider !== "slack" && <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.complete_this_real_conversation_to_finish_setup_fae6c4")}</p>}
      </div>
      {provider !== "slack" && (!principalsQuery.isSuccess || guestIsolationState === "loading") &&
      !principalsQuery.isError ? (
        <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.checking_identity_and_guest_readiness_572f06")}</p>
      ) : null}
      {identityGuidance ? (
        <div
          role={identityGuidance.tone === "warning" ? "alert" : "status"}
          className={
            identityGuidance.tone === "warning"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm"
              : "rounded-lg border border-border bg-muted/30 p-4 text-sm"
          }
        >
          <h2 className="font-medium">{identityGuidance.title}</h2>
          <p className="mt-1 text-muted-foreground">{identityGuidance.body}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={onOpenAccess}
          >{fullAppsT("fullApps.review_identity_access_31688e")}</Button>
        </div>
      ) : null}
      {provider === "imessage-photon" && botUsername && <div className="space-y-2"><Button variant="outline" onClick={() => { void copyTextToClipboard(botUsername).then(() => { setNumberCopied(true); setCopyError(null); }, () => setCopyError(ownAppDisplayText("fullApps.could_not_copy_the_number_select_it_in_the_instructi_9bb7a5"))); }}>{numberCopied ? fullAppsT("fullApps.number_copied_4bf3f0") : fullAppsT("fullApps.copy_9776ba", { value1: botUsername })}</Button>{copyError && <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(copyError)}</p>}</div>}
      {provider === "slack" ? (
        <>
          <ol className="list-decimal space-y-4 pl-5 text-sm">
            <li>{slackAccount?.status === "linked" ? <Button asChild variant="outline"><a href={providerUrl ?? "https://app.slack.com"} target="_blank" rel="noopener noreferrer">{slackAccount.dmChannelId ? fullAppsT("fullApps.open_your_slack_dm_654353") : fullAppsT("fullApps.open_slack_4ddf02")}<ExternalLink /></a></Button> : <>{fullAppsT("fullApps.inviteBotToChannel", { name: botMention })}</>}</li>
            <li>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <code>{slackTestMessage}</code>
                <Button size="sm" variant="ghost" onClick={() => {
                  void copyTextToClipboard(slackTestMessage).then(() => { setCommandCopied(true); setCommandCopyError(false); }, () => setCommandCopyError(true));
                }}><Copy className="size-4" />{commandCopied ? fullAppsT("taskPanels.preview.copied") : fullAppsT("taskChatUi.bubble.copy")}</Button>
              </div>
              {slackAccount?.status !== "linked" && <p className="mt-2 text-muted-foreground">{fullAppsT("fullApps.select_the_bot_from_slack_s_mention_suggestions_dc432c")}</p>}
            </li>
            <li>{fullAppsT("fullApps.continue_the_conversation_in_the_thread_88bf89")}</li>
          </ol>
          {commandCopyError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_copy_select_and_copy_the_command_above_2d6635")}</p>}
          <SetupWizardFooter onSaveExit={onSaveExit} disabled={pending}>
            <Button disabled={pending} onClick={onTest}><FullAppsTrans i18nKey="fullApps.done_892543" components={{ part1: <>{pending && <Loader2 className="size-4 animate-spin" />}</> }} /></Button>
          </SetupWizardFooter>
        </>
      ) : <>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        {instructions.map((item) => <li key={item}>{item}</li>)}
      </ol>
      <div className="flex flex-wrap gap-2">
        {providerUrl && (
          <Button asChild variant="outline">
            <a href={providerUrl} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.openNamedProvider", { name: providerNames[provider] })} <ExternalLink />
            </a>
          </Button>
        )}
        <Button disabled={pending} onClick={onTest}><FullAppsTrans i18nKey="fullApps.i_ve_sent_the_test_message_cbba60" components={{ part1: <>{pending && <Loader2 className="h-4 w-4 animate-spin" />}</> }} /></Button>
      </div>
      </>}
    </div>
  );
}
