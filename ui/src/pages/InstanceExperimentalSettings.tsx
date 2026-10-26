import { i18n } from "@/i18n";
import { t, useTranslation } from "@/i18n";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FlaskConical, Lock, Play } from "lucide-react";
import type {
  InstanceExperimentalSettings,
  InstanceExperimentalSettingsWithManaged,
  InstanceFeatureKey,
  ManagedSettingMetadata,
  PatchInstanceExperimentalSettings,
} from "@paperclipai/shared";
import { experimentalSettingKey } from "@paperclipai/shared";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useHiddenSettings } from "@/hooks/useHiddenSettings";
import { getWorktreeInstanceId, isWorktreeRuntime } from "../lib/worktree-branding";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";

type WorktreeRunExecutionDisplayState =
  | { kind: "off" }
  | { kind: "armed"; activatedAt: string }
  | { kind: "fail_closed"; reason: "missing_cutoff" | "missing_instance_id" | "instance_mismatch" };

/**
 * Mirror of the server's `resolveWorktreeRunExecutionActivation` fail-closed
 * ladder (server/src/services/instance-settings.ts) so the card never claims a
 * copied/legacy row is arming execution. The derived fields are display-only —
 * the PATCH the toggle sends still writes just the boolean.
 */
function resolveWorktreeRunExecutionDisplayState(
  settings:
    | Pick<
        InstanceExperimentalSettings,
        | "enableWorktreeRunExecution"
        | "worktreeRunExecutionActivatedAt"
        | "worktreeRunExecutionActivationInstanceId"
      >
    | undefined,
  currentInstanceId: string | null,
): WorktreeRunExecutionDisplayState {
  if (settings?.enableWorktreeRunExecution !== true) return { kind: "off" };
  if (!settings.worktreeRunExecutionActivatedAt) return { kind: "fail_closed", reason: "missing_cutoff" };
  if (!currentInstanceId) return { kind: "fail_closed", reason: "missing_instance_id" };
  if (settings.worktreeRunExecutionActivationInstanceId !== currentInstanceId) {
    return { kind: "fail_closed", reason: "instance_mismatch" };
  }
  return { kind: "armed", activatedAt: settings.worktreeRunExecutionActivatedAt };
}

function formatActivationTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// PAP-11233: keep Conference Room code intact, but hide the user-facing opt-in for now.
const SHOW_CONFERENCE_ROOM_EXPERIMENTAL_SETTING = false;

function ManagedByCloudBadge() {
  useTranslation();
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Lock aria-hidden="true" />{t("fullPages.managedByPaperclipCloud")}</Badge>
  );
}

function ExperimentalToggleCard({
  title,
  description,
  footnote,
  checked,
  onCheckedChange,
  disabled,
  settingKey,
  managed,
  ariaLabel,
}: {
  title: string;
  description: string;
  footnote?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
  /** Flag key backing this card; operator-hidden keys render nothing. */
  settingKey: InstanceFeatureKey;
  managed?: ManagedSettingMetadata;
  ariaLabel: string;
}) {
  useTranslation();
  const { hidden: hiddenSettings } = useHiddenSettings();
  const isManaged = managed?.managed === true;
  if (hiddenSettings.has(experimentalSettingKey(settingKey))) return null;
  return (
    <Card className="block bg-transparent p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            {isManaged ? <ManagedByCloudBadge /> : null}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          {footnote ? <p className="max-w-2xl text-xs text-muted-foreground">{footnote}</p> : null}
        </div>
        <ToggleSwitch
          checked={checked}
          onCheckedChange={(next) => {
            if (isManaged) return;
            onCheckedChange(next);
          }}
          disabled={disabled || isManaged}
          aria-label={ariaLabel}
        />
      </div>
    </Card>
  );
}

export function InstanceExperimentalSettings() {
  useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { hidden: hiddenSettings } = useHiddenSettings();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("sidebar.settings"), href: "/company/settings" },
      { label: t("fullPages.experimental") },
    ]);
  }, [setBreadcrumbs, i18n.language]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation<
    InstanceExperimentalSettingsWithManaged,
    Error,
    PatchInstanceExperimentalSettings,
    { previousSettings?: InstanceExperimentalSettingsWithManaged }
  >({
    mutationFn: async (patch: PatchInstanceExperimentalSettings) =>
      instanceSettingsApi.updateExperimental(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.instance.experimentalSettings });
      const previousSettings = queryClient.getQueryData<InstanceExperimentalSettingsWithManaged>(
        queryKeys.instance.experimentalSettings,
      );
      if (previousSettings) {
        queryClient.setQueryData<InstanceExperimentalSettingsWithManaged>(
          queryKeys.instance.experimentalSettings,
          { ...previousSettings, ...patch },
        );
      }
      return { previousSettings };
    },
    onSuccess: async (updatedSettings) => {
      setActionError(null);
      queryClient.setQueryData(queryKeys.instance.experimentalSettings, updatedSettings);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adapters.all }),
        queryClient.invalidateQueries({ queryKey: ["built-in-agents"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
        queryClient.invalidateQueries({ queryKey: ["apps"] }),
      ]);
    },
    onError: (error, _patch, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.instance.experimentalSettings, context.previousSettings);
      }
      setActionError(error instanceof Error ? error.message : t("fullPages.failedToUpdateExperimentalSettings"));
    },
  });

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("fullPages.loadingExperimentalSettings")}</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : t("fullPages.failedToLoadExperimentalSettings")}
      </div>
    );
  }

  const inWorktree = isWorktreeRuntime();
  // Present only on cloud-managed instances: keys the managed overlay controls
  // render locked with the "Managed by Paperclip Cloud" badge. Self-hosted
  // responses carry no `managedKeys`, so every card stays editable.
  const managedKeys = experimentalQuery.data?.managedKeys ?? {};
  const enableWorktreeRunExecution = experimentalQuery.data?.enableWorktreeRunExecution === true;
  const worktreeRunExecutionManaged = managedKeys.enableWorktreeRunExecution?.managed === true;
  const worktreeRunExecutionState = resolveWorktreeRunExecutionDisplayState(
    experimentalQuery.data,
    getWorktreeInstanceId(),
  );
  const enableEnvironments = experimentalQuery.data?.enableEnvironments === true;
  const enableNativeRunner = experimentalQuery.data?.enableNativeRunner === true;
  const enableChatConnectors = experimentalQuery.data?.enableChatConnectors === true;
  const enableManagedSandboxOnly = experimentalQuery.data?.enableManagedSandboxOnly === true;
  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const enableIsolatedWorkspacesByDefault =
    experimentalQuery.data?.enableIsolatedWorkspacesByDefault === true;
  // Streamlined left navigation is now the standard sidebar (PAP-12472); the
  // experimental opt-out was retired, so it no longer surfaces a toggle here.
  const enableStreamlinedUi = experimentalQuery.data?.enableStreamlinedUi !== false;
  const enableConferenceRoomChat = experimentalQuery.data?.enableConferenceRoomChat === true;
  const enableClassicTaskInterface = experimentalQuery.data?.enableClassicTaskInterface === true;
  const enableIssuePlanDecompositions =
    experimentalQuery.data?.enableIssuePlanDecompositions === true;
  const enableExperimentalFileViewer =
    experimentalQuery.data?.enableExperimentalFileViewer === true;
  const enableExternalObjects = experimentalQuery.data?.enableExternalObjects === true;
  const enableBuiltInAgents = experimentalQuery.data?.enableBuiltInAgents === true;
  const enableBetaSkills = experimentalQuery.data?.enableBetaSkills === true;
  const enableSummaries = experimentalQuery.data?.enableSummaries === true;
  const enableStatusCards = experimentalQuery.data?.enableStatusCards === true;
  const summariesManaged = managedKeys.enableSummaries?.managed === true;
  const statusCardsManaged = managedKeys.enableStatusCards?.managed === true;
  const statusCardsBlockedByManagedSummaries = summariesManaged && !enableSummaries;
  const summariesRequiredByManagedStatusCards = statusCardsManaged && enableStatusCards;
  const enableDecisions = experimentalQuery.data?.enableDecisions === true;
  const enableGoalsSidebarLink = experimentalQuery.data?.enableGoalsSidebarLink === true;
  const enableCases = experimentalQuery.data?.enableCases === true;
  const enableServerInfoDebugView = experimentalQuery.data?.enableServerInfoDebugView === true;
  const enablePaperclipDeveloperMode =
    experimentalQuery.data?.enablePaperclipDeveloperMode === true;
  const enableSimplifiedEnglishInteractions =
    experimentalQuery.data?.enableSimplifiedEnglishInteractions === true;
  const enableFirstTaskPlanProposal =
    experimentalQuery.data?.enableFirstTaskPlanProposal === true;
  const enableSmokeLab = experimentalQuery.data?.enableSmokeLab === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;
  const isVisible = (key: InstanceFeatureKey) => !hiddenSettings.has(experimentalSettingKey(key));
  const showWorktreeRunExecution = inWorktree && isVisible("enableWorktreeRunExecution");
  const showDeveloperSection = showWorktreeRunExecution || ([
    "autoRestartDevServerWhenIdle",
    "enableManagedSandboxOnly",
    "enablePaperclipDeveloperMode",
    "enableServerInfoDebugView",
    "enableSmokeLab",
    "enableIssuePlanDecompositions",
  ] satisfies InstanceFeatureKey[]).some(isVisible);
  const showLegacySection = isVisible("enableClassicTaskInterface") || isVisible("enableGoalsSidebarLink");
  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("fullPages.experimental")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("fullPages.optIntoFeaturesThatAreStillBeing")}</p>
      </div>

      <div
        role="alert"
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{t("fullPages.experimentalFeaturesMayBreakAtAnyTime")}</p>
            <p className="text-muted-foreground">{t("fullPages.theseFeaturesAreOptInAndCome")}</p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="space-y-3" aria-labelledby="experimental-features-heading">
        <div className="space-y-1">
          <h2 id="experimental-features-heading" className="text-sm font-semibold">{t("fullPages.experimentalFeatures")}</h2>
          <p className="text-sm text-muted-foreground">{t("fullPages.optionalProductFeaturesThatAreStillBeing")}</p>
        </div>

        <ExperimentalToggleCard
          title={t("fullPages.agentChat")}
          description={t("fullPages.talkToEachAgentInOneOngoing")}
          footnote={t("fullPages.turningThisOffPreservesConversationsAndLets")}
          checked={experimentalQuery.data?.enableAgentChat ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableAgentChat: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableAgentChat"
          managed={managedKeys.enableAgentChat}
          ariaLabel={t("fullPages.toggleAgentChatExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.artifactsV1")}
          description={t("fullPages.showArtifactsTheWayTheArtifactDirections")}
          footnote={t("fullPages.presentationOnlyTurningThisOffRestoresThe")}
          checked={experimentalQuery.data?.enableArtifactsV1 ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableArtifactsV1: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableArtifactsV1"
          managed={managedKeys.enableArtifactsV1}
          ariaLabel={t("fullPages.toggleArtifactsV1ExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.assistantConnectionsMcp")}
          description={t("fullPages.connectCodexClaudeAndOtherAssistantsTo")}
          footnote={<>{t("fullPages.requiresAnAuthenticatedInstanceWithAConfigured")}{experimentalQuery.data?.enablePublicMcp && <> <Link className="underline" to="/apps/assistant-connection">{t("fullPages.setUpAnAssistantConnection")}</Link></>}</>}
          checked={experimentalQuery.data?.enablePublicMcp === true}
          onCheckedChange={(checked) => toggleMutation.mutate({ enablePublicMcp: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enablePublicMcp"
          managed={managedKeys.enablePublicMcp}
          ariaLabel={t("fullPages.toggleAssistantConnectionsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.betaSkills")}
          description={t("fullPages.allowAgentsToPinBetaReleasesOf")}
          checked={enableBetaSkills}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableBetaSkills: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableBetaSkills"
          managed={managedKeys.enableBetaSkills}
          ariaLabel={t("fullPages.toggleBetaSkillsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.builtInAgents")}
          description={t("fullPages.showPaperclipManagedBuiltInAgentSurfaces")}
          checked={enableBuiltInAgents}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableBuiltInAgents: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableBuiltInAgents"
          managed={managedKeys.enableBuiltInAgents}
          ariaLabel={t("fullPages.toggleBuiltInAgentsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("sidebar.cases")}
          description={t("fullPages.durableWorkProductsBlogPostsTweetStorms")}
          footnote={t("fullPages.turningCasesOffHidesTheTabAnd")}
          checked={enableCases}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableCases: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableCases"
          managed={managedKeys.enableCases}
          ariaLabel={t("fullPages.toggleCasesExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.chatConnectors")}
          description={t("fullPages.connectAgentsToSlackDiscordMicrosoftTeams")}
          footnote={t("fullPages.turningThisOffHidesExperimentalChatSetup")}
          checked={enableChatConnectors}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableChatConnectors: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableChatConnectors"
          managed={managedKeys.enableChatConnectors}
          ariaLabel={t("fullPages.toggleChatConnectorsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.combinedInboxTaskList")}
          description={t("fullPages.foldInboxIntoTasksOneTasksRow")}
          footnote={t("fullPages.oldInboxLinksRedirectToTheMatching")}
          checked={experimentalQuery.data?.enableCombinedInboxTasks ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableCombinedInboxTasks: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableCombinedInboxTasks"
          managed={managedKeys.enableCombinedInboxTasks}
          ariaLabel={t("fullPages.toggleCombinedInboxAndTaskListExperimental")}
        />

        {SHOW_CONFERENCE_ROOM_EXPERIMENTAL_SETTING ? (
          <ExperimentalToggleCard
            title={t("fullPages.conferenceRoomChat")}
            description={t("fullPages.addsAConferenceRoomOneChatWhere")}
            checked={enableConferenceRoomChat}
            onCheckedChange={(checked) => toggleMutation.mutate({ enableConferenceRoomChat: checked })}
            disabled={toggleMutation.isPending}
            settingKey="enableConferenceRoomChat"
            managed={managedKeys.enableConferenceRoomChat}
            ariaLabel={t("fullPages.toggleConferenceRoomChatExperimentalSetting")}
          />
        ) : null}

        <ExperimentalToggleCard
          title={t("sidebar.decisions")}
          description={t("fullPages.showTheDecisionsItemInTheMain")}
          checked={enableDecisions}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableDecisions: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableDecisions"
          managed={managedKeys.enableDecisions}
          ariaLabel={t("fullPages.toggleDecisionsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.enableEnvironments")}
          description={t("fullPages.showEnvironmentManagementInCompanySettingsAnd")}
          checked={enableEnvironments}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableEnvironments: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableEnvironments"
          managed={managedKeys.enableEnvironments}
          ariaLabel={t("fullPages.toggleEnvironmentsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.enableExternalObjects")}
          description={t("fullPages.detectExternalUrlsInIssuesAndShow")}
          checked={enableExternalObjects}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableExternalObjects: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableExternalObjects"
          managed={managedKeys.enableExternalObjects}
          ariaLabel={t("fullPages.toggleExternalObjectsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.enableIsolatedWorkspaces")}
          description={t("fullPages.showExecutionWorkspaceControlsInProjectConfiguration")}
          checked={enableIsolatedWorkspaces}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableIsolatedWorkspaces: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableIsolatedWorkspaces"
          managed={managedKeys.enableIsolatedWorkspaces}
          ariaLabel={t("fullPages.toggleIsolatedWorkspacesExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.experimentalFastResponses")}
          description={t("fullPages.allowShortAcknowledgementsWhileAgentsBeginWork")}
          checked={experimentalQuery.data?.enableFastResponses ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableFastResponses: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableFastResponses"
          managed={managedKeys.enableFastResponses}
          ariaLabel={t("fullPages.toggleFastResponsesExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.experimentalFileViewer")}
          description={t("fullPages.showTaskDetailControlsForBrowsingAnd")}
          checked={enableExperimentalFileViewer}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableExperimentalFileViewer: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableExperimentalFileViewer"
          managed={managedKeys.enableExperimentalFileViewer}
          ariaLabel={t("fullPages.toggleExperimentalFileViewerSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.firstTaskProposeWithAPlanDocument")}
          description={t("fullPages.whenTheUserSFirstRequestIs")}
          checked={enableFirstTaskPlanProposal}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ enableFirstTaskPlanProposal: checked })
          }
          disabled={toggleMutation.isPending}
          settingKey="enableFirstTaskPlanProposal"
          managed={managedKeys.enableFirstTaskPlanProposal}
          ariaLabel={t("fullPages.toggleFirstTaskPlanProposalExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.githubReviewBots")}
          description={t("fullPages.connectAgentsToGithubWithTheirOwn")}
          footnote={t("fullPages.independentOfChatConnectorsTurningThisOff")}
          checked={experimentalQuery.data?.enableGitHubReviewBots === true}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableGitHubReviewBots: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableGitHubReviewBots"
          managed={managedKeys.enableGitHubReviewBots}
          ariaLabel={t("fullPages.toggleGithubReviewBotsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title="Grok Bot"
          description={t("fullPages.connectAnExistingGrokBotAsAn")}
          footnote={t("fullPages.requiresAssistantConnectionsMcpPaperclipRunnerAnd")}
          checked={experimentalQuery.data?.enableGrokBot === true}
          onCheckedChange={checked => toggleMutation.mutate({ enableGrokBot: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableGrokBot" managed={managedKeys.enableGrokBot}
          ariaLabel={t("fullPages.toggleGrokBotExperimentalSetting")}
        />


        <ExperimentalToggleCard
          title={t("fullPages.memoryConnectors")}
          description={t("fullPages.connectMem0ZepSupermemoryCogneeAndHoncho")}
          footnote={t("fullPages.turningThisOffHidesSetupForThese")}
          checked={experimentalQuery.data?.enableMemoryConnectors === true}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableMemoryConnectors: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableMemoryConnectors"
          managed={managedKeys.enableMemoryConnectors}
          ariaLabel={t("fullPages.toggleMemoryConnectorsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("agentConfigUi.musePersonal")}
          description={t("fullPages.connectYourPersonalMetaMusePairIt")}
          footnote={t("fullPages.requiresPaperclipRunnerAndAnAuthenticatedInstance")}
          checked={experimentalQuery.data?.enableMuse === true}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableMuse: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableMuse"
          managed={managedKeys.enableMuse}
          ariaLabel={t("fullPages.toggleMuseExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title="OpenAI Dot"
          description={t("fullPages.addOpenaiDotAsAStandaloneAgent")}
          footnote={t("fullPages.requiresAssistantConnectionsMcpAndAnAuthenticated")}
          checked={experimentalQuery.data?.enableOpenAiDot === true}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableOpenAiDot: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableOpenAiDot"
          managed={managedKeys.enableOpenAiDot}
          ariaLabel={t("fullPages.toggleOpenaiDotExperimentalSetting")}
        />


        <ExperimentalToggleCard
          title={t("runtimeSelect.paperclip")}
          description={t("fullPages.allowAgentsToSelectPaperclipRunnerIncluding")}
          checked={enableNativeRunner}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ enableNativeRunner: checked })
          }
          disabled={toggleMutation.isPending}
          settingKey="enableNativeRunner"
          managed={managedKeys.enableNativeRunner}
          ariaLabel={t("fullPages.togglePaperclipRunnerExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.simplifiedEnglishInteractions")}
          description={t("fullPages.instructAgentsToWriteUserInteractionsPlan")}
          checked={enableSimplifiedEnglishInteractions}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ enableSimplifiedEnglishInteractions: checked })
          }
          disabled={toggleMutation.isPending}
          settingKey="enableSimplifiedEnglishInteractions"
          managed={managedKeys.enableSimplifiedEnglishInteractions}
          ariaLabel={t("fullPages.toggleSimplifiedEnglishInteractionsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.statusCards")}
          description={t("fullPages.enableTheExperimentalSharedStatusCardBoard")}
          footnote={t("fullPages.enablingStatusCardsAlsoEnablesSummaries")}
          checked={enableStatusCards}
          onCheckedChange={(checked) =>
            toggleMutation.mutate(
              checked
                ? { enableSummaries: true, enableStatusCards: true }
                : { enableStatusCards: false },
            )
          }
          disabled={toggleMutation.isPending || statusCardsBlockedByManagedSummaries}
          settingKey="enableStatusCards"
          managed={managedKeys.enableStatusCards}
          ariaLabel={t("fullPages.toggleStatusCardsExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.streamlinedUi")}
          description={t("fullPages.useTheSimplifiedMainSidebarSharedTasks")}
          footnote={t("fullPages.turningThisOffRestoresTheLegacyShell")}
          checked={enableStreamlinedUi}
          onCheckedChange={(checked) => toggleMutation.mutate({ enableStreamlinedUi: checked })}
          disabled={toggleMutation.isPending}
          settingKey="enableStreamlinedUi"
          managed={managedKeys.enableStreamlinedUi}
          ariaLabel={t("fullPages.toggleStreamlinedUiExperimentalSetting")}
        />

        <ExperimentalToggleCard
          title={t("fullPages.summaries")}
          description={t("fullPages.showSummarizerGeneratedStatusSlotsOnProject")}
          footnote={t("fullPages.statusCardsRequiresSummariesDisablingSummariesAlso")}
          checked={enableSummaries}
          onCheckedChange={(checked) =>
            toggleMutation.mutate(
              checked || !enableStatusCards
                ? { enableSummaries: checked }
                : { enableSummaries: false, enableStatusCards: false },
            )
          }
          disabled={toggleMutation.isPending || summariesRequiredByManagedStatusCards}
          settingKey="enableSummaries"
          managed={managedKeys.enableSummaries}
          ariaLabel={t("fullPages.toggleSummariesExperimentalSetting")}
        />

        {enableIsolatedWorkspaces && (
          <ExperimentalToggleCard
            title={t("fullPages.useIsolatedWorkspacesByDefault")}
            description={t("fullPages.treatAProjectThatHasNoExecution")}
            checked={enableIsolatedWorkspacesByDefault}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableIsolatedWorkspacesByDefault: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableIsolatedWorkspacesByDefault"
            managed={managedKeys.enableIsolatedWorkspacesByDefault}
            ariaLabel={t("fullPages.toggleIsolatedWorkspacesByDefaultExperimentalSetting")}
          />
        )}
      </section>

      {showDeveloperSection ? (
        <section className="space-y-3" aria-labelledby="developer-mode-heading">
          <div className="space-y-1">
            <h2 id="developer-mode-heading" className="text-sm font-semibold">{t("fullPages.paperclipDeveloperMode")}</h2>
            <p className="text-sm text-muted-foreground">{t("fullPages.internalToolsForDevelopingTestingAndDebugging")}</p>
          </div>

          <ExperimentalToggleCard
            title={t("fullPages.autoRestartDevServerWhenIdle")}
            description={t("fullPages.inPnpmDevOnceWaitForAll")}
            checked={autoRestartDevServerWhenIdle}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ autoRestartDevServerWhenIdle: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="autoRestartDevServerWhenIdle"
            managed={managedKeys.autoRestartDevServerWhenIdle}
            ariaLabel={t("fullPages.toggleGuardedDevServerAutoRestart")}
          />

          <ExperimentalToggleCard
            title={t("fullPages.managedEnvironmentOnly")}
            description={t("fullPages.hideTheLocalEnvironmentAndRunAll")}
            checked={enableManagedSandboxOnly}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableManagedSandboxOnly: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableManagedSandboxOnly"
            managed={managedKeys.enableManagedSandboxOnly}
            ariaLabel={t("fullPages.toggleManagedEnvironmentOnlyExperimentalSetting")}
          />

          <ExperimentalToggleCard
            title={t("fullPages.paperclipDeveloperMode")}
            description={t("fullPages.showInternalPaperclipMaintainerToolsAndObservability")}
            checked={enablePaperclipDeveloperMode}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enablePaperclipDeveloperMode: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enablePaperclipDeveloperMode"
            managed={managedKeys.enablePaperclipDeveloperMode}
            ariaLabel={t("fullPages.togglePaperclipDeveloperModeExperimentalSetting")}
          />

          {showWorktreeRunExecution ? (
            <Card className="block bg-transparent p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{t("fullPages.runTasksInThisWorktree")}</h3>
                      {worktreeRunExecutionManaged ? <ManagedByCloudBadge /> : null}
                    </div>
                    <p className="max-w-2xl text-sm text-muted-foreground">{t("fullPages.thisIsAnIsolatedGitWorktreePreview")}</p>
                  </div>
                  <ToggleSwitch
                    checked={enableWorktreeRunExecution}
                    onCheckedChange={(checked) => {
                      if (worktreeRunExecutionManaged) return;
                      toggleMutation.mutate({ enableWorktreeRunExecution: checked });
                    }}
                    disabled={toggleMutation.isPending || worktreeRunExecutionManaged}
                    aria-label={t("fullPages.toggleWorktreeRunExecutionSetting")}
                  />
                </div>

                {worktreeRunExecutionState.kind === "armed" ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-foreground">
                    <Play className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{t("fullPages.runningTasksCreatedAfter")}{" "}
                      <span className="font-medium">
                        {formatActivationTimestamp(worktreeRunExecutionState.activatedAt)}
                      </span>
                      .
                    </span>
                  </div>
                ) : null}

                {worktreeRunExecutionState.kind === "fail_closed" ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{t("fullPages.executionIsSuppressedEffectivelyOff")}</p>
                      <p className="text-muted-foreground">
                        {worktreeRunExecutionState.reason === "instance_mismatch"
                          ? t("fullPages.thisSettingWasArmedInADifferent")
                          : t("fullPages.thisSettingIsMissingItsActivationCutoff")}{" "}{t("fullPages.toggleItOffAndBackOnTo")}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <ExperimentalToggleCard
            title={t("fullPages.serverInfoDebugView")}
            description={t("fullPages.showAServerSectionInTheAccount")}
            checked={enableServerInfoDebugView}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableServerInfoDebugView: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableServerInfoDebugView"
            managed={managedKeys.enableServerInfoDebugView}
            ariaLabel={t("fullPages.toggleServerInfoDebugViewExperimentalSetting")}
          />

          <ExperimentalToggleCard
            title={t("fullPages.smokeLab")}
            description={t("fullPages.addASmokeLabTabUnderApps")}
            checked={enableSmokeLab}
            onCheckedChange={(checked) => toggleMutation.mutate({ enableSmokeLab: checked })}
            disabled={toggleMutation.isPending}
            settingKey="enableSmokeLab"
            managed={managedKeys.enableSmokeLab}
            ariaLabel={t("fullPages.toggleSmokeLabExperimentalSetting")}
          />

          <ExperimentalToggleCard
            title={t("fullPages.taskPlanDecomposition")}
            description={t("fullPages.showAcceptedPlanDecompositionHistoryOnTask")}
            checked={enableIssuePlanDecompositions}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableIssuePlanDecompositions: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableIssuePlanDecompositions"
            managed={managedKeys.enableIssuePlanDecompositions}
            ariaLabel={t("fullPages.toggleTaskPlanDecompositionPanelExperimentalSetting")}
          />
        </section>
      ) : null}

      {showLegacySection ? (
        <section className="space-y-3" aria-labelledby="legacy-heading">
          <div className="space-y-1">
            <h2 id="legacy-heading" className="text-sm font-semibold">{t("fullPages.legacy")}</h2>
            <p className="text-sm text-muted-foreground">{t("fullPages.theseFeaturesAreGoingToBeRemoved")}</p>
          </div>

          <ExperimentalToggleCard
            title={t("fullPages.classicTaskInterface")}
            description={t("fullPages.restoresThePreviousTaskDetailPageThe")}
            footnote={t("fullPages.switchingTakesEffectImmediatelyNoTaskData")}
            checked={enableClassicTaskInterface}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableClassicTaskInterface: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableClassicTaskInterface"
            managed={managedKeys.enableClassicTaskInterface}
            ariaLabel={t("fullPages.toggleClassicTaskInterfaceExperimentalSetting")}
          />

          <ExperimentalToggleCard
            title={t("fullPages.goalsSidebarLink")}
            description={t("fullPages.restoreTheGoalsItemInTheMain")}
            checked={enableGoalsSidebarLink}
            onCheckedChange={(checked) =>
              toggleMutation.mutate({ enableGoalsSidebarLink: checked })
            }
            disabled={toggleMutation.isPending}
            settingKey="enableGoalsSidebarLink"
            managed={managedKeys.enableGoalsSidebarLink}
            ariaLabel={t("fullPages.toggleGoalsSidebarLinkExperimentalSetting")}
          />
        </section>
      ) : null}
    </div>
  );
}
