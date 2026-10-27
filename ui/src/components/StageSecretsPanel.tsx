import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { KeyRound, Save } from "lucide-react";
import type { CompanySecret, RoutineEnvConfig } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { EnvironmentVariablesEditor } from "./environment-variables-editor";
import { AgentAvatar, type AvatarAgent } from "./AgentAvatar";

export interface StageSecretsPanelProps {
  /** Whether the stage has a backing automation routine with an assignee. */
  hasAutomation: boolean;
  /** Display name + icon of the agent that runs this step (when automation exists). */
  agentName?: string | null;
  agentIcon?: string | null;
  agent?: AvatarAgent;
  /** Company secret inventory (shared, not stage-scoped). */
  secrets: CompanySecret[];
  secretsLoading: boolean;
  value: RoutineEnvConfig;
  onChange: (env: RoutineEnvConfig) => void;
  onCreateSecret: (name: string, value: string) => Promise<CompanySecret>;
  /** Jump to the Automation section so the user can pick an agent. */
  onSetupAutomation: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}

/**
 * Stage Secrets tab body. Stage secrets are env bindings on the step's backing
 * automation routine — the same company-secret backbone used by routines,
 * agents, and projects. This panel is intentionally dense and reuses
 * `EnvironmentVariablesEditor` for secret refs, inline secret creation, version
 * selection, and missing/disabled-secret warnings.
 */
export function StageSecretsPanel({
  hasAutomation,
  agentName,
  agentIcon,
  agent,
  secrets,
  secretsLoading,
  value,
  onChange,
  onCreateSecret,
  onSetupAutomation,
  onSave,
  saving,
  dirty,
}: StageSecretsPanelProps) {
  useFullSharedTranslation();
  // No backing automation/assignee → nothing can receive secrets at runtime.
  // Point the user at Automation instead of creating a hidden routine just
  // because the Secrets tab was opened.
  if (!hasAutomation) {
    return (
      <EmptyState
        icon={KeyRound}
        message={fullSharedT("fullShared.secrets_are_available_only_to_step_automation_pick_a_e45aba")}
        action="Set up automation"
        onAction={onSetupAutomation}
      />
    );
  }

  const displayName = agentName?.trim() || "the responsible agent";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        {agentName ? (
          <AgentAvatar agent={agent} name={displayName} size={16} />
        ) : (
          <KeyRound className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        )}
        <p><FullSharedTrans i18nKey="fullShared.these_env_vars_are_injected_when_runs_this_step_they_d92bf3" components={{ part1: <>{" "}</>, part2: <span className="font-medium text-foreground">{displayName}</span>, part3: <span className="font-mono">PAPERCLIP_*</span> }} /></p>
      </div>

      {secretsLoading ? (
        <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_secrets_3775fb")}</p>
      ) : (
        <EnvironmentVariablesEditor
          value={value}
          secrets={secrets}
          onCreateSecret={onCreateSecret}
          onChange={(env) => onChange((env ?? {}) as RoutineEnvConfig)}
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={onSave} disabled={!dirty || saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? fullSharedT("fullShared.saving_23e392") : fullSharedT("fullShared.save_secrets_a84c95")}
        </Button>
        {dirty && !saving ? <span className="text-xs text-muted-foreground">{fullSharedT("formsUi.editor.unsaved")}</span> : null}
      </div>
    </div>
  );
}
