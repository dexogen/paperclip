import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, renderAppError } from "@/pages/apps/app-display-text";
import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { SpekoPhoneLine } from "@/components/voice/SpekoPhoneLine";
import { SpekoIncomingCalls } from "@/components/voice/SpekoIncomingCalls";
import { SpekoCallActivityItem, SpekoUnapprovedCallActivityItem, useSpekoCallHistory } from "@/components/voice/SpekoCallHistory";
import { SpekoPhoneCallback } from "@/components/voice/SpekoPhoneCallback";
import { deriveInitials } from "@/components/Identity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { agentAvatarUrl } from "@/lib/agent-avatar-url";
import { resolveAgentAppearance } from "@paperclipai/shared";
import { SlackTestMessageButton } from "./SlackTestMessageButton";
import { AgentAvatar } from "@/components/AgentAvatar";
import { SlackSetupAdvanced } from "./SlackAppDetails";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SlackToolsSettings, SlackSearchAccess } from "./SlackToolSettings";
import { ChatCommunicationInstructions } from "./ChatCommunicationInstructions";
import { ChatExecutionDefaults } from "./ChatExecutionDefaults";
import { agentsApi } from "@/api/agents";
import { ChatConversationList } from "./ChatConversationList";
import { GitHubConnectionRecoveryNotice } from "./GitHubConnectionRecovery";
import { GitHubBotManagement, GitHubReviews } from "./GitHubBotManagement";
import { GitHubBotMention, GitHubAppIdentityActions } from "./GitHubAppIdentity";
import { GitHubConnectionComplete, type GitHubConnectionCompleteLocationState } from "./GitHubConnectionComplete";
import { EmailEndpointSettings } from "./EmailEndpointSetup";
import { EmailConnectionAccess } from "@/components/EmailConnectionAccess";
import { emailApi } from "@/api/email";
import { toolsApi } from "@/api/tools";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Check,
  Activity as ActivityIcon,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Unlink,
} from "lucide-react";
import {
  chatEndpointsApi,
  type ChatActivityItem,
  type ChatEndpoint,
  type ChatEndpointResource,
  type ChatProvider,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AppLogo } from "../AppLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Link, Navigate, useLocation, useNavigate, useParams } from "@/lib/router";

const tabs = ["settings", "access", "reviews", "conversations", "activity"] as const;
type ChatTab = (typeof tabs)[number];
const tabItems = tabs.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));
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

const providerLifecycleGuidance: Record<
  ChatProvider,
  { reconnect: string; remove: string }
> = {
  speko: {
    get reconnect() { return fullAppsT("fullApps.reverify_this_voice_persona_and_update_its_signed_se_e0ea2d"); },
    get remove() { return fullAppsT("fullApps.stop_this_connection_from_accepting_voice_requests_a_169924"); },
  },
  agentmail: { get reconnect() { return fullAppsT("fullApps.reconnect_the_same_email_inbox_1b5cb9"); }, get remove() { return fullAppsT("fullApps.disconnect_email_and_retain_task_history_e12c70"); } },
  slack: {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_or_replaces_credentials_for_this__60f6b3"); },
    get remove() { return fullAppsT("fullApps.paperclip_archives_the_endpoint_stops_new_ingress_an_ce21d4"); },
  },
  github: {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_this_same_app_and_installation_th_8855f9"); },
    get remove() { return fullAppsT("fullApps.paperclip_archives_the_endpoint_stops_new_ingress_an_cbccc0"); },
  },
  discord: {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_this_same_discord_application_and_3d62ed"); },
    get remove() { return fullAppsT("fullApps.paperclip_archives_the_endpoint_stops_its_paperclip__1dd664"); },
  },
  "microsoft-teams": {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_this_same_microsoft_app_tenant_an_9b637a"); },
    get remove() { return fullAppsT("fullApps.paperclip_archives_the_endpoint_stops_new_ingress_an_080f28"); },
  },
  "imessage-photon": {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_the_same_photon_project_and_line__e16085"); },
    get remove() { return fullAppsT("fullApps.disconnect_archives_this_channel_and_removes_its_sav_08283d"); },
  },
  telegram: {
    get reconnect() { return fullAppsT("fullApps.reconnect_verifies_this_same_botfather_bot_and_autom_e3463e"); },
    get remove() { return fullAppsT("fullApps.paperclip_archives_the_endpoint_and_queues_durable_r_ad5c6e"); },
  },
};

const activityKindLabels: Record<ChatActivityItem["kind"], string> = {
  get delivery() { return fullAppsT("fullApps.inbound_delivery_9ac4ff"); },
  get publication() { return fullAppsT("fullApps.outbound_publication_8dcc69"); },
  get action() { return fullAppsT("fullApps.provider_action_58176e"); },
  get health() { return fullAppsT("fullApps.connection_health_883d0e"); },
  get repair() { return fullAppsT("fullApps.connection_repair_2c777c"); },
};

const replayableFailureStates = new Set(["failed"]);
// Provider callbacks do not necessarily emit a Board activity event. Refresh
// only mounted operational views, and stop polling when the browser is hidden.
const liveChatQueryOptions = {
  staleTime: 0,
  refetchInterval: 5_000,
  refetchIntervalInBackground: false,
} as const;

export function isReplayEligible(item: ChatActivityItem): boolean {
  if (
    item.fileTransfer ||
    !item.replayable ||
    !replayableFailureStates.has(item.status)
  ) {
    return false;
  }
  if (item.kind === "delivery") return item.status === "failed";
  return item.kind === "publication";
}

export function activityResolutionActions(item: ChatActivityItem) {
  const offered = item.resolutionActions ?? [];
  if (!item.fileTransfer) return offered;
  if (
    item.kind !== "publication" ||
    !Number.isSafeInteger(item.fileTransfer.version) ||
    item.fileTransfer.version < 1
  )
    return [];
  if (
    ![
      "consent_unknown",
      "upload_unknown",
      "file_info_unknown",
      "conflict",
    ].includes(item.fileTransfer.phase)
  )
    return [];
  // Only the file-info stage can use ordinary visible-delivery resolution.
  // Earlier consent/upload evidence must not be fabricated by these buttons.
  return item.fileTransfer.phase === "file_info_unknown"
    ? offered
    : offered.filter((action) => action === "cancel");
}

export function activityResolutionDescription(item: ChatActivityItem): string {
  const phase = item.fileTransfer?.phase;
  if (phase === "file_info_unknown")
    return fullAppsT("fullApps.the_file_upload_was_confirmed_but_its_teams_notifica_cf8db3");
  if (phase === "consent_unknown")
    return fullAppsT("fullApps.the_consent_card_may_have_reached_teams_file_deliver_267408");
  if (phase)
    return fullAppsT("fullApps.the_file_may_already_exist_in_onedrive_cancelling_st_b4025b");
  return fullAppsT("fullApps.paperclip_lost_confirmation_after_sending_check_the__1a7e11");
}

export function isResolutionEligible(item: ChatActivityItem): boolean {
  return (
    (item.kind === "publication" || item.kind === "action") &&
    item.status === "delivery_unknown" &&
    activityResolutionActions(item).length > 0
  );
}

export function isIndividuallyToggleableResource(
  provider: ChatProvider,
  resourceType: string,
): boolean {
  return !(
    provider === "microsoft-teams" &&
    (resourceType === "direct_message" || resourceType === "group_chat")
  );
}

function activityDetailLabel(item: ChatActivityItem): string {
  return replayableFailureStates.has(item.status) ? fullAppsT("fullApps.caption_f81ab834de") : fullAppsT("fullApps.caption_45989de49f");
}

export function connectionHealthPresentation(
  endpoint: Pick<ChatEndpoint, "status" | "healthMessage" | "lastError">,
) {
  // Health events outlive pause/removal. They are history, not lifecycle state.
  const lifecycleMessages = {
    draft: fullAppsT("fullApps.connection_setup_is_incomplete_59e83b"),
    verifying: fullAppsT("fullApps.connection_verification_is_in_progress_7e9914"),
    paused: fullAppsT("fullApps.connection_is_paused_resume_it_to_receive_new_messag_7f7bd7"),
    attention: fullAppsT("fullApps.connection_needs_attention_642533"),
    revoked: fullAppsT("fullApps.connection_access_is_revoked_reconnect_to_verify_acc_a03c45"),
    archived: fullAppsT("fullApps.connection_has_been_removed_from_paperclip_6a5560"),
  };
  const lifecycleMessage =
    endpoint.status === "active" ? null : lifecycleMessages[endpoint.status];
  return {
    message: lifecycleMessage ?? endpoint.healthMessage ?? null,
    previousHealth: lifecycleMessage ? (endpoint.healthMessage ?? null) : null,
    error: endpoint.lastError ?? null,
    errorLabel: ["active", "attention", "revoked"].includes(endpoint.status)
      ? fullAppsT("fullApps.caption_f81ab834de")
      : fullAppsT("fullApps.last_reported_error_cded00"),
  };
}

export function ChatEndpointDetail() {
  useFullAppsTranslation();
  const { endpointId = "", tab: routeTab, reviewId } = useParams<{
    endpointId: string;
    tab?: string;
    reviewId?: string;
  }>();
  const tab = reviewId ? "reviews" : (routeTab ?? "settings");
  const activeTab = tabs.includes(tab as ChatTab) ? (tab as ChatTab) : null;
  const navigate = useNavigate();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const completion = (location.state as GitHubConnectionCompleteLocationState | null)?.githubConnectionComplete;
  const { setBreadcrumbs } = useBreadcrumbs();
  const endpointQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.detail(endpointId),
    queryFn: () => chatEndpointsApi.get(endpointId),
    enabled: Boolean(endpointId && activeTab),
    ...liveChatQueryOptions,
    refetchInterval:
      activeTab === "activity" || activeTab === "conversations"
        ? liveChatQueryOptions.refetchInterval
        : false,
  });
  const endpoint = endpointQuery.data;
  const avatarAgent = useQuery({
    queryKey: queryKeys.agents.detail(endpoint?.assignedAgentId ?? ""),
    queryFn: () => agentsApi.get(endpoint!.assignedAgentId),
    enabled: endpoint?.provider === "github",
  });
  const [copyStatus, setCopyStatus] = useState<AppDisplayText | null>(null);
  const agentQuery = useQuery({
    queryKey: queryKeys.agents.detail(endpoint?.assignedAgentId ?? ""),
    queryFn: () => agentsApi.get(endpoint!.assignedAgentId, endpoint!.companyId),
    enabled: Boolean(endpoint?.assignedAgentId),
  });

  useEffect(() => {
    if (!endpoint || !activeTab) return;
    setBreadcrumbs([
      { label: fullAppsT("sidebar.connectors"), href: "/apps" },
      {
        label: `${endpoint.assignedAgentName} · ${providerNames[endpoint.provider]}`,
        href: `/apps/chat/${endpoint.id}/settings`,
      },
      ...(reviewId ? [{ label: fullAppsT("fullApps.reviews_84cb78"), href: `/apps/chat/${endpoint.id}/reviews` }, { label: fullAppsT("fullApps.review_aff076") }] : [{
        label:
          tabItems.find((item) => item.value === activeTab)?.label ??
          fullAppsT("companySwitcher.settings"),
      }]),
    ]);
    return () => setBreadcrumbs([]);
  }, [activeTab, endpoint, reviewId, setBreadcrumbs, fullAppsI18n.resolvedLanguage]);

  if (!activeTab)
    return <Navigate replace to={`/apps/chat/${endpointId}/settings`} />;
  if (endpointQuery.isLoading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />{fullAppsT("grokSetupUi.connection.loading")}</div>
    );
  if (endpointQuery.isError || !endpoint)
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{fullAppsT("fullApps.this_chat_connection_could_not_be_loaded_89a518")}</p>
        <Button variant="outline" onClick={() => endpointQuery.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
      </div>
    );
  if (endpoint.provider === "agentmail" && activeTab === "settings")
    return <div className="space-y-7"><EmailEndpointSettings key={endpoint.id} endpointId={endpoint.id} companyId={endpoint.companyId} assignedAgentName={endpoint.assignedAgentName} /><EndpointExecutionDefaults endpoint={endpoint} /></div>;
  const setupIncomplete =
    endpoint.setup?.step !== "complete" &&
    !(endpoint.provider === "slack" && endpoint.setup?.step === "test") &&
    ["draft", "verifying", "attention", "revoked"].includes(endpoint.status);
  const slackAppId = endpoint.setup?.slackRegistration?.appId;
  const slackUrl = endpoint.provider === "slack"
    ? slackAppId ? `https://api.slack.com/apps/${encodeURIComponent(slackAppId)}/oauth` : "https://api.slack.com/apps"
    : null;

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <AgentAvatar agent={agentQuery.data ?? { id: endpoint.assignedAgentId, name: endpoint.assignedAgentName }} size={endpoint.provider === "github" ? 64 : 48} />
          <div className="min-w-0">
          <h1 ref={heading} tabIndex={-1} className={endpoint.provider === "speko" ? "flex items-center gap-3 text-xl font-bold" : "text-xl font-bold"}>
            {endpoint.provider === "speko" && <AppLogo name="Speko" brandKey="speko" size={36} />}
            {endpoint.provider === "github" ? (endpoint.botLabel ?? endpoint.assignedAgentName) : endpoint.assignedAgentName}{endpoint.provider === "speko" ? fullAppsT("fullApps.in_speko_07cc45") : ""}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {endpoint.provider === "github" ? <><AppLogo name="GitHub" brandKey="github" compact className="size-4! rounded-sm bg-transparent" /><Link to={`/agents/${endpoint.assignedAgentId}`} className="hover:underline">{endpoint.assignedAgentName}</Link>{endpoint.providerAccountLabel && <span>· {endpoint.providerAccountLabel}</span>}</> : endpoint.providerAccountLabel ?? (endpoint.provider === "agentmail" ? endpoint.botExternalId ?? fullAppsT("fullApps.email_connection_7033ce") : fullAppsT("fullApps.chat_connection_c3b314"))}
          </p>
          {endpoint.provider === "github" && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <GitHubBotMention endpoint={endpoint} />
            <GitHubAppIdentityActions endpoint={endpoint} avatarUrl={avatarAgent.data ? agentAvatarUrl(resolveAgentAppearance(avatarAgent.data.appearance, endpoint.assignedAgentId), 512, 1, "rest") : undefined} />
          </div>}
          {endpoint.provider === "imessage-photon" && endpoint.botExternalId && endpoint.photonAllocation !== "shared" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>{endpoint.botExternalId}</span>
              <Button variant="ghost" size="sm" aria-label={fullAppsT("fullApps.copy_dedicated_number_0a559c")} onClick={async () => {
                try { await copyTextToClipboard(endpoint.botExternalId!); setCopyStatus(ownAppDisplayText("fullApps.number_copied_4bf3f0")); }
                catch { setCopyStatus(ownAppDisplayText("fullApps.could_not_copy_the_number_select_and_copy_it_manuall_89546d")); }
              }}><Copy className="size-4" />{fullAppsT("fullApps.copy_number_f35c40")}</Button>
              <span role="status" className="text-muted-foreground">{renderAppDisplayText(copyStatus)}</span>
            </div>
          )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {endpoint.provider === "speko" && <a href="https://platform.speko.ai/agents" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">{fullAppsT("fullApps.open_speko_4f1e19")}<ExternalLink className="size-3.5" aria-hidden="true" /></a>}
          {slackUrl && <Button asChild variant="outline"><a href={slackUrl} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_slack_configuration_a2dfb2")}<ExternalLink className="size-4" /></a></Button>}
          {setupIncomplete ? (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/apps/chat/connect?provider=${endpoint.provider}&purpose=chat&resume=${endpoint.id}`,
                )
              }
            >{fullAppsT("fullApps.continue_setup_c5702c")}</Button>
          ) : null}
          {endpoint.status !== "active" && <StatusBadge status={endpoint.status} className={endpoint.provider === "speko" ? "text-foreground" : undefined} />}
        </div>
      </header>
      {endpoint.provider === "github" && <GitHubConnectionRecoveryNotice endpoint={endpoint} />}
      {activeTab === "settings" && endpoint.provider === "speko" && endpoint.status === "active" && <div className="space-y-6"><SpekoPhoneCallback companyId={endpoint.companyId} endpointId={endpoint.id} /><SpekoPhoneLine companyId={endpoint.companyId} endpointId={endpoint.id} /><SpekoIncomingCalls companyId={endpoint.companyId} endpointId={endpoint.id} agentId={endpoint.assignedAgentId} /></div>}
      {endpoint.provider === "slack" && <SlackTestMessageButton key={endpoint.id} endpointId={endpoint.id} />}
      {endpoint.provider === "github" && <div hidden={activeTab !== "settings" && activeTab !== "access"}>
        <GitHubBotManagement key={endpoint.id} endpoint={endpoint} view={activeTab === "access" ? "access" : "settings"} />
      </div>}
      {activeTab === "settings" && endpoint.provider !== "github" && <Settings endpointId={endpoint.id} endpoint={endpoint} />}
      {activeTab === "settings" && <EndpointExecutionDefaults endpoint={endpoint} />}
      {activeTab === "reviews" && endpoint.provider === "github" && <GitHubReviews endpointId={endpoint.id} reviewId={reviewId} />}
      {activeTab === "access" && endpoint.provider === "speko" && (
        <section className="max-w-3xl space-y-3">
          <h2 className="text-lg font-semibold">{fullAppsT("fullApps.private_voice_access_771c1d")}</h2>
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.browser_calls_use_the_signed_in_paperclip_user_s_cur_76d6fa")}</p>
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.outgoing_calls_use_your_saved_callback_number_and_op_c159d3")}</p>
        </section>
      )}
{activeTab === "access" && endpoint.provider === "agentmail" && <EmailAccess endpoint={endpoint} />}
{activeTab === "access" && endpoint.provider !== "speko" && endpoint.provider !== "github" && endpoint.provider !== "agentmail" && (
        <Access
          endpointId={endpoint.id}
          allowUnlinked={endpoint.allowUnlinkedPeople}
          endpoint={endpoint}
        />
      )}
      {activeTab === "conversations" && (
        <Conversations endpointId={endpoint.id} provider={endpoint.provider} />
      )}
      {activeTab === "activity" && (
        <Activity endpointId={endpoint.id} endpoint={endpoint} />
      )}
      {endpoint.provider === "github" && activeTab === "settings" && endpoint.status === "active" &&
        endpoint.setup?.step === "complete" && completion?.endpointId === endpoint.id && (
        <GitHubConnectionComplete
          endpoint={endpoint}
          agent={avatarAgent.data}
          runtimeChecks={completion.runtimeChecks}
          onClose={() => {
            const { githubConnectionComplete: _complete, ...rest } = location.state as GitHubConnectionCompleteLocationState;
            navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: rest });
          }}
          onCloseAutoFocus={() => heading.current?.focus()}
        />
      )}
    </div>
  );
}

function EndpointExecutionDefaults({ endpoint }: { endpoint: ChatEndpoint }) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  return <section className="max-w-3xl py-5"><ChatExecutionDefaults
    key={endpoint.id}
    companyId={endpoint.companyId}
    value={endpoint.executionDefaults}
    onSave={async (executionDefaults) => {
      const next = await chatEndpointsApi.update(endpoint.id, { executionDefaults });
      queryClient.setQueryData(queryKeys.chatEndpoints.detail(endpoint.id), next);
    }}
  /></section>;
}

function EmailAccess({ endpoint }: { endpoint: ChatEndpoint }) {
  useFullAppsTranslation();
  const connection = useQuery({
    queryKey: queryKeys.tools.connection(endpoint.connectionId ?? ""),
    queryFn: () => toolsApi.getConnection(endpoint.connectionId!),
    enabled: Boolean(endpoint.connectionId),
  });
  const agents = useQuery({
    queryKey: queryKeys.agents.list(endpoint.companyId),
    queryFn: () => agentsApi.list(endpoint.companyId),
  });
  if (!endpoint.connectionId || agents.isError || connection.isError) return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.connection_access_could_not_be_loaded_953390")}</p>
      <Button variant="outline" onClick={() => { void agents.refetch(); void connection.refetch(); }}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
    </div>
  );
  if (agents.isPending || connection.isPending) return <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullStaleReview.loadingAccess")}</p>;
  const sourceId = connection.data.config?.credentialConnectionId;
  const credentialId = typeof sourceId === "string" ? sourceId : endpoint.connectionId;
  return <section className="max-w-3xl space-y-4">
    <h2 className="text-lg font-semibold">{fullAppsT("instanceAccess.access")}</h2>
    {credentialId !== endpoint.connectionId && <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.these_settings_apply_to_the_saved_agentmail_account__ccb5f8")}</p>}
    <EmailConnectionAccess key={credentialId} companyId={endpoint.companyId} connectionId={credentialId} agents={agents.data} />
  </section>;
}

function Settings({
  endpointId,
  endpoint,
}: {
  endpointId: string;
  endpoint: Awaited<ReturnType<typeof chatEndpointsApi.get>>;
}) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const resourcesQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.resources(endpointId),
    queryFn: () => chatEndpointsApi.listResources(endpointId),
    enabled: endpoint.provider !== "speko",
    ...(endpoint.provider === "slack" ? liveChatQueryOptions : {}),
  });
  const saveResources = useMutation({
    mutationFn: (resource: Pick<ChatEndpointResource, "id" | "enabled">) =>
      chatEndpointsApi.updateResources(endpointId, [resource]),
    onSuccess: (resources) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.resources(endpointId),
        resources,
      ),
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_update_destination_f23b38"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const updateEndpoint = useMutation({
    mutationFn: chatEndpointsApi.update.bind(null, endpointId),
    onSuccess: (next) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.detail(endpointId),
        next,
      ),
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_update_settings_522457"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  if (endpoint.provider === "speko") return null;
  const resources = resourcesQuery.data ?? [];
  const destinationResources = resources.filter((resource) =>
    isIndividuallyToggleableResource(endpoint.provider, resource.type),
  );
  const toggleResource = (resource: ChatEndpointResource, enabled: boolean) =>
    // A cached inventory must not overwrite another operator's unrelated edits.
    saveResources.mutate({ id: resource.id, enabled });
  return (
    <section className="max-w-3xl space-y-7">
      {endpoint.provider === "imessage-photon" && <p className="text-sm text-muted-foreground">{endpoint.photonAllocation === "shared" ? fullAppsT("fullApps.shared_photon_project_direct_messages_only_enroll_se_bdbec1") : fullAppsT("fullApps.enable_each_group_individually_agent_replies_are_vis_ade429")}</p>}
      {endpoint.provider === "telegram" && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{fullAppsT("fullApps.telegram_group_command_a2c515")}</h2>
          <div className="rounded-lg border border-border p-3 text-sm">
            <code>
              /task@
              {endpoint.botUsername?.replace(/^@/, "") ?? "bot_username"}{" "}
              &lt;request&gt;
            </code>
            <p className="mt-2 text-muted-foreground">{fullAppsT("fullApps.telegram_s_default_privacy_mode_does_not_deliver_ord_20d8b8")}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{endpoint.provider === "slack" ? fullAppsT("fullApps.allowed_channels_e57f04") : fullAppsT("fullApps.destinations_72eb63")}</h3>
        {resourcesQuery.isError ? <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_load_channels_b48a52")}<button className="underline" onClick={() => void resourcesQuery.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</button></p> : resourcesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_destinations_b78eda")}</p>
        ) : destinationResources.length === 0 && endpoint.provider !== "slack" ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{fullAppsT("fullApps.no_destinations_yet_42dc9c")}</p>
        ) : (
          <div className={endpoint.provider === "slack" ? "space-y-1" : "divide-y divide-border border-y border-border"}>
            {destinationResources.map((resource) => (
              <div key={resource.id} className="py-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {resource.label}
                  </p>
                  {(resource.availability !== "available" || resource.detail) && <p className="text-xs text-muted-foreground">
                    {resource.availability === "available"
                      ? resource.detail
                      : fullAppsT("fullApps.unavailable_at_the_provider_b0c0c1")}
                  </p>}
                  {resource.participants?.length ? <p className="mt-1 break-words text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.participants_4ad7a2" components={{ part1: <>{resource.participants.join(", ")}</> }} /></p> : null}
                </div>
                <ToggleSwitch
                  aria-label={fullAppsT("fullApps.enable_cca71c", { value1: resource.label })}
                  checked={resource.enabled}
                  disabled={
                    endpoint.photonAllocation === "shared" ||
                    resource.availability !== "available" ||
                    saveResources.isPending
                  }
                  onCheckedChange={(enabled) =>
                    toggleResource(resource, enabled)
                  }
                />
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">{fullAppsT("fullApps.task_defaults_1aa47f")}</summary>
                <div className="pt-3"><ChatExecutionDefaults
                  companyId={endpoint.companyId}
                  value={resource.executionDefaults}
                  resource
                  onSave={async (executionDefaults) => {
                    const next = await chatEndpointsApi.updateResources(endpointId, [{ id: resource.id, executionDefaults }]);
                    queryClient.setQueryData(queryKeys.chatEndpoints.resources(endpointId), next);
                  }}
                /></div>
              </details>
              </div>
            ))}
            {endpoint.provider === "slack" && (
              <p className="py-3 text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.invite_to_a_channel_to_add_it_13a8ab" components={{ part1: <>{endpoint.assignedAgentName}</> }} /></p>
            )}
          </div>
        )}
      </div>
      {endpoint.provider !== "github" && (
        <div className="space-y-3">
          <SettingToggle
            label={fullAppsT("fullApps.allow_direct_messages_e2f7f1")}
            detail={
              endpoint.provider === "discord"
                ? fullAppsT("fullApps.people_must_also_enable_direct_messages_in_their_sha_f78465")
                : undefined
            }
            checked={endpoint.allowDirectMessages ?? false}
            pending={updateEndpoint.isPending}
            onChange={(allowDirectMessages) =>
              updateEndpoint.mutate({ allowDirectMessages })
            }
          />
          {endpoint.provider === "slack" && (
            <SettingToggle
              label={fullAppsT("fullApps.require_at_mention_814963")}
              detail={fullAppsT("fullApps.in_channels_only_respond_to_messages_that_mention_th_26953d")}
              checked={endpoint.requireAtMention ?? false}
              pending={updateEndpoint.isPending}
              onChange={(requireAtMention) =>
                updateEndpoint.mutate({ requireAtMention })
              }
            />
          )}
          {endpoint.provider === "microsoft-teams" && (
            <SettingToggle
              label={fullAppsT("fullApps.allow_group_chats_5fabb0")}
              detail={fullAppsT("fullApps.the_bot_may_participate_in_group_chats_where_it_is_i_a815e4")}
              checked={endpoint.allowGroupChats ?? false}
              pending={updateEndpoint.isPending}
              onChange={(allowGroupChats) =>
                updateEndpoint.mutate({ allowGroupChats })
              }
            />
          )}
        </div>
      )}
      {endpoint.provider === "slack" && <ChatCommunicationInstructions
        key={endpoint.id}
        value={endpoint.communicationInstructions ?? ""}
        onSave={async (communicationInstructions) => {
          const next = await chatEndpointsApi.update(endpointId, { communicationInstructions });
          queryClient.setQueryData(queryKeys.chatEndpoints.detail(endpointId), next);
        }}
      />}
      {endpoint.provider === "slack" && <SlackSetupAdvanced label={fullAppsT("fullApps.slack_tools_192c25")}><SlackToolsSettings companyId={endpoint.companyId} endpointId={endpointId} /></SlackSetupAdvanced>}
    </section>
  );
}

function SettingToggle({
  label,
  detail,
  checked,
  pending,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  pending: boolean;
  onChange: (value: boolean) => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <ToggleSwitch
        aria-label={label}
        checked={checked}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function Access({
  endpointId,
  allowUnlinked,
  endpoint,
}: {
  endpointId: string;
  allowUnlinked: boolean;
  endpoint: ChatEndpoint;
}) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [joinCommandCopied, setJoinCommandCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmationFor, setConfirmationFor] = useState<string | null>(null);
  const joinCommand = `${endpoint.setup?.slackApp?.command ?? endpoint.setup?.command ?? "/paperclip"} connect`;
  const linksQuery = useQuery({
    queryKey: queryKeys.chatEndpoints.principals(endpointId),
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
    refetchInterval: 5000,
  });
  const updatePolicy = useMutation({
    mutationFn: (value: boolean) =>
      chatEndpointsApi.update(endpointId, { allowUnlinkedPeople: value }),
    onSuccess: (next) =>
      queryClient.setQueryData(
        queryKeys.chatEndpoints.detail(endpointId),
        next,
      ),
    onError: (error) => pushToast({ title: fullAppsT("fullApps.couldn_t_update_access_147970"), body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"), tone: "error" }),
  });
  const createIntent = useMutation({
    mutationFn: (principalId: string) =>
      chatEndpointsApi.createLinkIntent(endpointId, principalId),
    onSuccess: ({ confirmationUrl }) => {
      setConfirmationUrl(
        new URL(confirmationUrl, window.location.origin).toString(),
      );

    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_create_identity_link_619b3f"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const revoke = useMutation({
    mutationFn: (principalId: string) =>
      chatEndpointsApi.revokeLink(endpointId, principalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.principals(endpointId) }),
    onError: (error) => pushToast({ title: fullAppsT("fullApps.couldn_t_disconnect_account_3bb513"), body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"), tone: "error" }),
  });
  const links = linksQuery.data ?? [];
  return (
    <section className="max-w-3xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{fullAppsT("taskProperties.share.people")}</h2>
        {endpoint.provider === "slack" && <Dialog>
          <DialogTrigger asChild><Button>{fullAppsT("fullApps.invite_people_27bf0f")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle><FullAppsTrans i18nKey="fullApps.invite_people_to_talk_to_85ae8b" components={{ part1: <>{endpoint.assignedAgentName}</> }} /></DialogTitle>
              <DialogDescription>{fullAppsT("fullApps.share_these_instructions_with_someone_in_your_slack__8e287a")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <ol className="list-decimal space-y-3 pl-5">
                <li><FullAppsTrans i18nKey="fullApps.send_in_slack_fb1b0c" components={{ part1: <code className="font-mono">{joinCommand}</code> }} /></li>
                <li>{fullAppsT("fullApps.open_the_bot_s_private_link_and_sign_in_to_paperclip_070eb4")}</li>
                <li>{fullAppsT("fullApps.if_you_re_new_to_this_organization_request_access_an_2bb42e")}</li>
              </ol>
              <p className="text-muted-foreground">{fullAppsT("fullApps.the_confirmation_link_is_personal_and_expires_after__dc6c66")}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => {
                  void copyTextToClipboard(joinCommand).then(() => setJoinCommandCopied(true), () => pushToast({ title: fullAppsT("fullApps.couldn_t_copy_the_command_f3a00b"), tone: "error" }));
                }}>{joinCommandCopied ? <Check className="size-4" /> : <Copy className="size-4" />}{joinCommandCopied ? fullAppsT("taskPanels.preview.copied") : fullAppsT("fullApps.copy_command_9a01fe")}</Button>
                <Button onClick={() => {
                  const workspace = endpoint.providerAccountId ? `https://app.slack.com/client/${encodeURIComponent(endpoint.providerAccountId)}` : "https://app.slack.com/";
                  void copyTextToClipboard(fullAppsT("fullApps.clipboardSlackInvite", { name: endpoint.assignedAgentName, workspace: workspace, command: joinCommand })).then(() => setInviteCopied(true), () => pushToast({ title: fullAppsT("fullApps.couldn_t_copy_invitation_7994c1"), tone: "error" }));
                }}>{inviteCopied ? <Check className="size-4" /> : <Copy className="size-4" />}{inviteCopied ? fullAppsT("fullApps.invitation_copied_a4c64c") : fullAppsT("fullApps.copy_invitation_74554e")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}
      </div>
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.people_with_linked_accounts_use_their_own_paperclip__2d60bb")}<Link className="underline underline-offset-4" to="/company/settings/members">{fullAppsT("fullApps.manage_members_7ce24d")}</Link></p>
      {confirmationUrl && (
        <div className="space-y-2 border-y border-border py-3">
          <p className="text-sm font-medium">{confirmationFor ? <FullAppsTrans i18nKey="fullApps.confirm_119e2e" components={{ part1: <>{confirmationFor}</> }} /> : fullAppsT("fullApps.confirmAccountGeneric")}</p>
          <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.share_only_with_this_person_they_must_sign_in_and_co_f90c6d")}</p>
          <p className="break-all text-xs text-muted-foreground">
            {confirmationUrl}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void copyTextToClipboard(confirmationUrl).then(
                () =>
                  pushToast({
                    title: fullAppsT("fullApps.confirmation_link_copied_715f61"),
                    tone: "success",
                  }),
                () =>
                  pushToast({
                    title: fullAppsT("fullApps.couldn_t_copy_the_link_6bad7b"),
                    body: fullAppsT("fullApps.select_and_copy_it_manually_0edc1f"),
                    tone: "error",
                  }),
              );
            }}
          >
            <Copy />{fullAppsT("fullApps.copy_link_dbf362")}</Button>
        </div>
      )}
      <div className="space-y-2">
        {linksQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_people_af6fe5")}</p> : linksQuery.isError ? <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_load_people_199d60")}<button className="underline" onClick={() => void linksQuery.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</button></p> : links.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{fullAppsT("fullApps.no_linked_accounts_yet_invite_someone_to_connect_922a59")}</p>
        ) : (
          <div role="list" aria-label={fullAppsT("taskProperties.share.people")} className="divide-y divide-border border-y border-border">
            {links.map((link) => (
              <div
                key={link.id}
                role="listitem"
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar aria-hidden="true">
                    {link.paperclipUserImage && <AvatarImage src={link.paperclipUserImage} alt="" />}
                    <AvatarFallback>{deriveInitials(link.paperclipUserLabel ?? link.externalLabel)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm" title={link.paperclipUserLabel ?? link.externalLabel}>{link.paperclipUserLabel ?? link.externalLabel}</p>
                    {(link.status !== "linked" || link.externalLabel !== link.paperclipUserLabel) && <p className="text-xs text-muted-foreground">
                      {link.status === "revoked" ? fullAppsT("skillsGap.disconnected") : link.status === "linked"
                        ? link.externalLabel
                        : fullAppsT("fullApps.waiting_for_account_confirmation_fb53a6")}
                    </p>}
                  </div>
                </div>
                {link.status === "linked" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(link.principalId)}
                  >
                    <Unlink />{fullAppsT("externalAgentUi.muse.disconnect")}</Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={createIntent.isPending}
                    onClick={() => { setConfirmationUrl(null); setConfirmationFor(link.externalLabel); createIntent.mutate(link.principalId); }}
                  >{fullAppsT("fullApps.create_confirmation_link_5ce43a")}</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SlackSetupAdvanced label={fullAppsT("fullApps.guest_access_a96229")}>
        <SettingToggle label={fullAppsT("fullApps.allow_unlinked_people_b61e32")}
          detail={fullAppsT("fullApps.people_without_linked_accounts_can_start_isolated_ta_b1f38e")}
          checked={allowUnlinked} pending={updatePolicy.isPending} onChange={value => updatePolicy.mutate(value)} />
      </SlackSetupAdvanced>
      {endpoint.provider === "slack" && <SlackSetupAdvanced label={fullAppsT("fullApps.personal_slack_search_b9be0d")}><SlackSearchAccess companyId={endpoint.companyId} endpointId={endpointId} /></SlackSetupAdvanced>}
    </section>
  );
}

function Conversations({
  endpointId,
  provider,
}: {
  endpointId: string;
  provider: ChatProvider;
}) {
  useFullAppsTranslation();
  const query = useQuery({
    queryKey: queryKeys.chatEndpoints.conversations(endpointId),
    queryFn: () => chatEndpointsApi.listConversations(endpointId),
    ...liveChatQueryOptions,
  });
  return (
    <section className="space-y-4">
      {query.isPending ? <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_conversations_1eec1d")}</p> : query.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.conversations_could_not_be_loaded_c96fc9")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
        </div>
      ) : <ChatConversationList rows={query.data ?? []} provider={provider} />}
    </section>
  );
}

function Activity({
  endpointId,
  endpoint,
}: {
  endpointId: string;
  endpoint: Awaited<ReturnType<typeof chatEndpointsApi.get>>;
}) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [resolutionItem, setResolutionItem] = useState<ChatActivityItem | null>(
    null,
  );
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[cursors.length - 1];
  useEffect(() => setCursors([undefined]), [endpointId]);
  const query = useQuery({
    queryKey: [...queryKeys.chatEndpoints.activity(endpointId), cursor ?? null],
    queryFn: () => chatEndpointsApi.listActivityPage(endpointId, cursor),
    ...liveChatQueryOptions,
    refetchInterval: cursor ? false : liveChatQueryOptions.refetchInterval,
  });
  const calls = useSpekoCallHistory(endpoint.companyId, endpointId, endpoint.provider === "speko" && !cursor);
  const replay = useMutation({
    mutationFn: (item: ChatActivityItem) =>
      item.kind === "publication"
        ? chatEndpointsApi.replayPublication(endpointId, item.id)
        : chatEndpointsApi.replayDelivery(endpointId, item.id),
    onSuccess: async (_result, item) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.activity(endpointId),
      });
      pushToast({
        title: fullAppsT("fullApps.queued_for_replay_b5d032", { value1: item.kind === "publication" ? fullAppsT("fullApps.caption_15fc65b693") : fullAppsT("fullApps.caption_52bfe584a5") }),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_replay_activity_e3eb4a"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const resolveActivity = useMutation({
    mutationFn: (input: {
      item: ChatActivityItem;
      action: "mark_delivered" | "retry_anyway" | "cancel";
    }) => {
      if (input.item.kind === "publication") {
        return chatEndpointsApi.resolvePublication(
          endpointId,
          input.item.id,
          input.action,
          input.item.fileTransfer
            ? {
                phase: input.item.fileTransfer.phase,
                version: input.item.fileTransfer.version,
              }
            : undefined,
        );
      }
      return chatEndpointsApi.resolveAction(
        endpointId,
        input.item.id,
        input.action,
      );
    },
    onSuccess: async (_result, input) => {
      setResolutionItem(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.activity(endpointId),
      });
      pushToast({
        title:
          input.item.actionType === "slash_task_start" &&
          input.action === "retry_anyway"
            ? fullAppsT("fullApps.task_start_retried_bd8d39")
            : input.item.actionType === "slash_task_start"
              ? fullAppsT("fullApps.task_start_cancelled_7153d3")
              : input.item.actionType === "provider_effect" &&
                  input.action === "mark_delivered"
                ? fullAppsT("fullApps.provider_reply_marked_delivered_44de89")
                : input.item.actionType === "provider_effect" &&
                    input.action === "retry_anyway"
                  ? fullAppsT("fullApps.provider_reply_retried_989eb2")
                  : input.item.actionType === "provider_effect"
                    ? fullAppsT("fullApps.provider_reply_cancelled_91ea1f")
                    : input.action === "mark_delivered"
                      ? fullAppsT("fullApps.publication_marked_delivered_ac3242")
                      : input.action === "retry_anyway"
                        ? fullAppsT("fullApps.publication_queued_for_retry_f9100c")
                        : fullAppsT("fullApps.publication_cancelled_67f02b"),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_resolve_activity_fce6f0"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const lifecycle = useMutation({
    mutationFn: async (action: "pause" | "resume" | "remove") =>
      endpoint.provider === "agentmail"
        ? emailApi.control(endpointId, action)
        : chatEndpointsApi.setup(endpointId, { action }),
    onSuccess: async (next, action) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatEndpoints.list(next.companyId),
      });
      if (endpoint.provider === "agentmail") {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["email-inboxes", next.companyId] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.detail(endpointId) }),
        ]);
      }
      if (action === "remove") {
        navigate("/apps");
        return;
      }
      if (endpoint.provider !== "agentmail") queryClient.setQueryData(queryKeys.chatEndpoints.detail(endpointId), next);
      pushToast({
        title: action === "pause" ? fullAppsT("fullApps.connection_paused_8870a3") : fullAppsT("fullApps.connection_resumed_e10324"),
        tone: "success",
      });
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_update_connection_a99084"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.try_again_a0c2cc"),
        tone: "error",
      }),
  });
  const rows = query.data?.items ?? [];
  // Calls use their own caller-authorized API and appear once in recent activity.
  // Older connection-event pages retain the existing cursor contract.
  const activityEntries = [
    ...(!query.isError ? rows.map(item => ({ kind: "connection" as const, id: `connection:${item.id}`, createdAt: item.createdAt, item })) : []),
    ...(!cursor && !calls.error ? calls.entries.map(entry => ({ kind: "call" as const, id: `call:${entry.session.id}`, createdAt: entry.session.createdAt, entry })) : []),
    ...(!cursor && !calls.incomingError ? calls.unapprovedCalls.map(call => ({ kind: "unapproved_call" as const, id: `unapproved:${call.id}`, createdAt: call.createdAt, call })) : []),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));

  const { status } = endpoint;
  const health = connectionHealthPresentation(endpoint);
  const lifecycleAction = lifecycle.variables;
  const callbackSurfaceRows = endpoint.setup?.callbackSurfaces
    ? ([
        ["Events API", endpoint.setup.callbackSurfaces.events],
        [fullAppsT("fullApps.caption_1d49a1c3bb"), endpoint.setup.callbackSurfaces.interactivity],
        [fullAppsT("fullApps.slash_command_85dec3"), endpoint.setup.callbackSurfaces.slashCommands],
      ] as const)
    : [];
  return (
    <section className="space-y-5" aria-label={fullAppsT("fullApps.connection_activity_52520f")}>
      <h2 className="text-lg font-semibold">{fullAppsT("fullApps.connection_activity_52520f")}</h2>
      {((status !== "active" && health.message) || health.error) && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${status === "attention" || status === "revoked" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/30 text-foreground"}`}
        >
          {(status === "attention" || status === "revoked") && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            {health.message && <p>{health.message}</p>}
            {health.previousHealth && (
              <p className="mt-1 text-xs opacity-80">
                <span className="font-medium">{fullAppsT("fullApps.last_reported_health_1b2bf6")}</span>{" "}
                {health.previousHealth}
              </p>
            )}
            {health.error && (
              <p className="mt-1 text-xs opacity-80">
                <span className="font-medium">{health.errorLabel}:</span>{" "}
                {health.error}
              </p>
            )}
          </div>
        </div>
      )}
      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium chat-connection-health-summary">
          <span>{fullAppsT("fullApps.connection_health_and_controls_de3243")}</span>
          <span className="flex items-center gap-2">
            {endpoint.setup?.callbacksNeedUpdate && <span className="text-xs text-(--status-task-blocked)">{fullAppsT("fullApps.callback_urls_need_attention_081c6a")}</span>}
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="space-y-5 border-t border-border p-4">
      {endpoint.provider === "slack" && callbackSurfaceRows.length > 0 && (
        <div
          className="space-y-3 text-sm"
        >
          <p className="font-medium">{fullAppsT("fullApps.slack_callback_health_035e2b")}</p>
          <p className="text-xs text-muted-foreground">
            {endpoint.setup?.callbacksNeedUpdate
              ? fullAppsT("fullApps.slack_callback_urls_need_an_update_save_the_current__05d99d")
              : fullAppsT("fullApps.paperclip_records_each_callback_surface_independentl_b49180")}
          </p>
          <div className="divide-y divide-border border-y border-border">
            {callbackSurfaceRows.map(([label, surface]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {surface.status === "current"
                    ? fullAppsT("fullApps.current_e0d1b6")
                    : surface.status === "stale"
                      ? fullAppsT("fullApps.stale_url_b095f4")
                      : fullAppsT("externalAgentUi.muse.notObserved")}
                </p>
                {surface.observedAt && (
                  <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.last_observed_ff4188")}{" "}
                    <time
                      dateTime={surface.observedAt}
                      title={surface.observedAt}
                      className="font-mono"
                    >
                      {formatDateTime(surface.observedAt, {
                        includeSeconds: true,
                      })}
                    </time>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {status !== "archived" && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {status === "active" && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("pause")}
              ><FullAppsTrans i18nKey="fullApps.pause_e4efb9" components={{ part1: <>{lifecycle.isPending && lifecycleAction === "pause" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Pause />
                )}</> }} /></Button>
            )}
            {status === "paused" && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("resume")}
              ><FullAppsTrans i18nKey="fullApps.resume_78de64" components={{ part1: <>{lifecycle.isPending && lifecycleAction === "resume" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play />
                )}</> }} /></Button>
            )}
            {[
              "active",
              "paused",
              "attention",
              "revoked",
              "draft",
              "verifying",
            ].includes(status) && (
              <Button
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() =>
                  navigate(
                    endpoint.provider === "agentmail" && status !== "draft" && status !== "verifying"
                      ? `/apps/chat/${endpoint.id}/settings`
                      : `/apps/chat/connect?provider=${endpoint.provider}&purpose=chat&resume=${endpoint.id}${status === "draft" || status === "verifying" ? "" : "&reconnect=1"}`,
                  )
                }
              >
                <RefreshCw />
                {status === "draft" || status === "verifying"
                  ? fullAppsT("agentSetupUi.setup.finish")
                  : fullAppsT("fullApps.reconnect_bf8a9e")}
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={lifecycle.isPending}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 />{fullAppsT("fullApps.remove_connection_e9e9e2")}</Button>
          </div>
          {status !== "draft" && status !== "verifying" && (
            <p className="text-xs text-muted-foreground">
              {providerLifecycleGuidance[endpoint.provider].reconnect}
            </p>
          )}
        </div>
      )}
        </div>
      </details>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{fullAppsT("fullApps.recent_activity_6cb44b")}</h3>
          {endpoint.provider === "speko" && !cursor && <Button size="sm" variant="ghost" onClick={() => { void query.refetch(); calls.onRetry(); }} disabled={query.isFetching || calls.loading}>{fullAppsT("externalAgentUi.common.refresh")}</Button>}
        </div>
        {endpoint.provider === "agentmail" && rows.some((item) => item.kind === "publication" && item.status === "delivery_unknown") && (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.review_unconfirmed_email_delivery_in_the_04b5b7")}{" "}
            <Link to={`/apps/chat/${endpointId}/conversations`} className="underline underline-offset-4">{fullAppsT("fullApps.conversation_s_task_2d8821")}</Link>.
          </p>
        )}
        <div className="divide-y divide-border border-y border-border">
          {(query.isLoading || calls.loading) && (
            <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />{fullAppsT("fullApps.loading_activity_a389c3")}</div>
          )}
          {query.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-sm text-destructive" role="alert">{fullAppsT("fullApps.connection_activity_could_not_be_loaded_65047e")}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => query.refetch()}
              >{fullAppsT("fullApps.try_again_d8b839")}</Button>
            </div>
          )}
          {endpoint.provider === "speko" && !cursor && [
            calls.error && fullAppsT("fullApps.message_7dbbac8ded6f", { value1: calls.error }),
            calls.incomingError && fullAppsT("fullApps.message_765a35fe21d0", { value1: calls.incomingError }),
            calls.endError && fullAppsT("fullApps.message_c0e954d7093e", { value1: calls.endError }),
          ].filter(Boolean).map((message) => <div key={String(message)} className="flex flex-wrap items-center justify-between gap-3 py-4"><p role="alert" className="text-sm text-destructive">{message}</p><Button size="sm" variant="outline" onClick={calls.onRetry}>{fullAppsT("fullApps.retry_calls_86c003")}</Button></div>)}
          {activityEntries.map(entry => {
            if (entry.kind === "call") return <SpekoCallActivityItem key={entry.id} entry={entry.entry} presentation="activity" onEnd={calls.onEnd} ending={calls.endingSessionId === entry.entry.session.id} />;
            if (entry.kind === "unapproved_call") return <SpekoUnapprovedCallActivityItem key={entry.id} call={entry.call} presentation="activity" />;
            const item = entry.item;
            return (
              <div
                key={entry.id}
                data-activity-kind="connection"
                className="flex items-start gap-3 px-2 py-3 transition-colors hover:bg-accent/50"
              >
                <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
                  {item.kind === "delivery" ? <ArrowDownLeft className="size-4" /> : item.kind === "publication" ? <ArrowUpRight className="size-4" /> : <ActivityIcon className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm font-medium">{item.summary}</p>
                    <StatusBadge status={item.status} />
                    <time dateTime={item.createdAt} title={item.createdAt} className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(item.createdAt, { includeSeconds: true })}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{activityKindLabels[item.kind]}</p>
                  {item.fileTransfer && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.fileTransfer.filename} —{" "}
                      {item.fileTransfer.phase.replaceAll("_", " ")}
                    </p>
                  )}
                  {item.detail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {activityDetailLabel(item)}:
                      </span>{" "}
                      {item.detail}
                    </p>
                  )}
                </div>
                {endpoint.provider !== "agentmail" && isReplayEligible(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={fullAppsT("fullApps.replay_failed_ba20b0", { value1: item.kind })}
                    disabled={replay.isPending}
                    onClick={() => replay.mutate(item)}
                  ><FullAppsTrans i18nKey="fullApps.replay_573457" components={{ part1: <>{replay.isPending && replay.variables?.id === item.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}</> }} /></Button>
                )}
                {endpoint.provider !== "agentmail" && isResolutionEligible(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResolutionItem(item)}
                  >{fullAppsT("fullStaleReview.resolveDelivery")}</Button>
                )}
              </div>
            );
          })}
          {!query.isLoading && !query.isError && !calls.loading && !calls.error && !calls.incomingError && activityEntries.length === 0 && (
            <p className="py-5 text-sm text-muted-foreground">{fullAppsT("fullApps.no_connection_activity_yet_3ba50f")}</p>
          )}
        </div>
      </div>
      <nav aria-label={fullAppsT("fullApps.activity_pagination_027564")} className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.page_c170ca" components={{ part1: <>{cursors.length}</> }} /></span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={cursors.length === 1 || query.isFetching} onClick={() => setCursors((pages) => pages.slice(0, -1))}>{fullAppsT("fullApps.previous_a57b08")}</Button>
          <Button size="sm" variant="outline" disabled={!query.data?.nextCursor || query.isFetching || query.isError} onClick={() => { if (query.data?.nextCursor) setCursors((pages) => [...pages, query.data.nextCursor!]); }}>{fullAppsT("fullApps.next_1ff57a")}</Button>
        </div>
      </nav>
      <AlertDialog
        open={resolutionItem !== null}
        onOpenChange={(open) => !open && setResolutionItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolutionItem?.actionType === "slash_task_start"
                ? fullAppsT("fullApps.resolve_unconfirmed_task_start_24ac2c")
                : resolutionItem?.actionType === "provider_effect"
                  ? fullAppsT("fullApps.resolve_unconfirmed_provider_reply_51da03")
                  : fullAppsT("fullApps.resolve_unconfirmed_delivery_a1666e")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolutionItem?.actionType === "slash_task_start"
                ? fullAppsT("fullApps.paperclip_lost_confirmation_after_asking_slack_to_st_b30cde")
                : resolutionItem?.actionType === "provider_effect"
                  ? fullAppsT("fullApps.paperclip_lost_confirmation_after_sending_this_provi_cfdcf6")
                  : resolutionItem
                    ? activityResolutionDescription(resolutionItem)
                    : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel disabled={resolveActivity.isPending}>{fullAppsT("fullApps.keep_unresolved_0de107")}</AlertDialogCancel>
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes("cancel") && (
                <Button
                  variant="outline"
                  disabled={resolveActivity.isPending}
                  onClick={() =>
                    resolutionItem &&
                    resolveActivity.mutate({
                      item: resolutionItem,
                      action: "cancel",
                    })
                  }
                >
                  {resolutionItem.actionType === "slash_task_start"
                    ? fullAppsT("fullApps.cancel_task_start_a2029d")
                    : resolutionItem.actionType === "provider_effect"
                      ? fullAppsT("fullApps.cancel_provider_reply_7cb71e")
                      : resolutionItem.fileTransfer
                        ? fullAppsT("fullApps.cancel_file_transfer_ad463f")
                        : fullAppsT("fullApps.cancel_publication_43d329")}
                </Button>
              )}
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes(
                "retry_anyway",
              ) && (
                <Button
                  variant="outline"
                  disabled={resolveActivity.isPending}
                  onClick={() =>
                    resolutionItem &&
                    resolveActivity.mutate({
                      item: resolutionItem,
                      action: "retry_anyway",
                    })
                  }
                >
                  {resolutionItem.fileTransfer
                    ? fullAppsT("fullApps.retry_file_notification_a2a166")
                    : fullAppsT("fullApps.retry_anyway_de4695")}
                </Button>
              )}
            {resolutionItem &&
              activityResolutionActions(resolutionItem).includes(
                "mark_delivered",
              ) && (
                <AlertDialogAction
                  disabled={resolveActivity.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    if (resolutionItem) {
                      resolveActivity.mutate({
                        item: resolutionItem,
                        action: "mark_delivered",
                      });
                    }
                  }}
                >{fullAppsT("fullApps.mark_delivered_3a4765")}</AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fullAppsT("fullApps.remove_this_connection_e91e08")}</AlertDialogTitle>
            <AlertDialogDescription><FullAppsTrans i18nKey="fullApps.will_stop_receiving_new_work_from_existing_paperclip_ba1e02" components={{ part1: <>{endpoint.assignedAgentName}</>, part2: <>{` ${providerNames[endpoint.provider]}`}</>, part3: <>{" "}</>, part4: <>{providerLifecycleGuidance[endpoint.provider].remove}</>, part5: <>{endpoint.provider === "slack" && (
                <> <a
                  href={endpoint.setup?.slackRegistration?.managementUrl ?? "https://api.slack.com/apps"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >{fullAppsT("fullApps.open_slack_app_settings_9d209c")}</a> {fullAppsT("fullApps.to_manage_or_delete_the_slack_app_9069ef")}</>
              )}</> }} /></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{fullAppsT("fullApps.cancel_19766e")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate("remove")}
            ><FullAppsTrans i18nKey="fullApps.remove_connection_790209" components={{ part1: <>{lifecycle.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}</> }} /></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
