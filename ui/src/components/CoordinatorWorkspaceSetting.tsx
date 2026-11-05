import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { experimentalSettingKey } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useCompany } from "@/context/CompanyContext";
import { useCoordinatorWorkspaceEnabled } from "@/hooks/useCoordinatorWorkspaceEnabled";
import { useHiddenSettings } from "@/hooks/useHiddenSettings";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function CoordinatorWorkspaceSetting() {
  useUiTranslation();
  const { selectedCompany } = useCompany();
  const workspace = useCoordinatorWorkspaceEnabled();
  const { hidden, loaded: visibilityLoaded } = useHiddenSettings();
  const experimental = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const chatDisabled = experimental.isSuccess && experimental.data.enableAgentChat !== true;
  const boardAccess = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: () => accessApi.getCurrentBoardAccess(),
    enabled: chatDisabled && !!workspace.userId,
    staleTime: 30_000,
  });
  const chatManaged = experimental.data?.managedKeys?.enableAgentChat?.managed === true;
  const chatHidden = hidden.has(experimentalSettingKey("enableAgentChat"));
  const canEnableChat = visibilityLoaded && !chatHidden && !chatManaged && boardAccess.data?.userId === workspace.userId && (
    boardAccess.data?.source === "local_implicit" || boardAccess.data?.isInstanceAdmin === true
  );
  const error = workspace.error instanceof Error ? workspace.error.message : null;
  return (
    <Card className="block bg-transparent p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h3 id="coordinator-workspace-title" className="text-sm font-medium">{translateUi("interfaceUpdates.coordinator_workspace_c507cf6b")}</h3>
          <p id="coordinator-workspace-description" className="text-sm text-muted-foreground">
            {translateUi("interfaceUpdates.try_the_new_chat_tasks_and_needs_you_workspace_thi_251bae10")}
          </p>
          <p className="text-xs text-muted-foreground">
            {translateUi("interfaceUpdates.off_by_default_turn_it_off_to_return_to_the_classi_b9f1f3ae")}
          </p>
          {workspace.userId === "local-board" && (
            <p className="text-xs text-muted-foreground">{translateUi("interfaceUpdates.this_local_instance_uses_the_shared_local_board_id_ac7f7a0c")}</p>
          )}
          {chatDisabled && (
            <p className="text-sm text-muted-foreground">
              {translateUi("interfaceUpdates.agent_chat_is_off_for_this_instance_your_workspace_9c77e88e")}{" "}
              {canEnableChat ? (
                <a href="#experimental-enableAgentChat" className="underline underline-offset-4">{translateUi("interfaceUpdates.enable_agent_chat_below_3ef15f62")}</a>
              ) : chatManaged || chatHidden ? (
                translateUi("interfaceUpdates.chat_availability_is_managed_by_your_hosting_provi_dca0d3a1")
              ) : (
                translateUi("interfaceUpdates.ask_an_administrator_to_enable_agent_chat_in_exper_01fdb7b2")
              )}
            </p>
          )}
        </div>
        <ToggleSwitch
          checked={workspace.enabled}
          disabled={!workspace.loaded || workspace.isSaving || !workspace.userId || !selectedCompany || !!workspace.error}
          aria-label={translateUi("interfaceUpdates.enable_coordinator_workspace_a29e5a5c")}
          aria-describedby="coordinator-workspace-description"
          onCheckedChange={(enabled) => {
            if (!selectedCompany) return;
            // The hook exposes the error for the account that attempted the save.
            void workspace.setEnabled(selectedCompany.id, enabled).catch(() => {});
          }}
        />
      </div>
      {workspace.isSaving && <p role="status" className="mt-3 text-sm text-muted-foreground">{translateUi("interfaceUpdates.saving_your_workspace_3ea91c69")}</p>}
      {!workspace.loaded && <p role="status" className="mt-3 text-sm text-muted-foreground">{translateUi("interfaceUpdates.loading_your_preference_c765a3fb")}</p>}
      {error && (
        <div role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => { void workspace.retry(); }}>{translateUi("newIssue.retry")}</Button>
        </div>
      )}
    </Card>
  );
}
