import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import type { Agent, ToolCatalogEntry, ToolPolicy, ToolProfileWithDetails } from "@paperclipai/shared";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";

export function AgentConnectionAccess({ connectionId, profiles, policies, catalog, agents, canManage, onRemove }: {
  connectionId: string;
  profiles: ToolProfileWithDetails[];
  policies: ToolPolicy[];
  catalog: ToolCatalogEntry[];
  agents: Agent[];
  canManage: boolean;
  onRemove: (profileId: string) => Promise<unknown>;
}) {
  useFullAppsTranslation();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const grants = profiles.filter(profile => {
    const agentId = profile.metadata?.agentId;
    return profile.status === "active"
      && profile.metadata?.source === "connection_intent"
      && profile.metadata.connectionId === connectionId
      && typeof agentId === "string"
      && profile.profileKey === `connection-intent:${connectionId}:${agentId}`
      && profile.bindings.some(binding => binding.targetType === "agent" && binding.targetId === agentId);
  });
  if (grants.length === 0) return null;

  async function remove(profileId: string) {
    setPending(profileId);
    setError(null);
    try {
      await onRemove(profileId);
    } catch (cause) {
      setError(cause instanceof Error ? appErrorDisplay(cause) : ownAppDisplayText("fullApps.couldn_t_remove_this_access_grant_please_try_again_6baf4b"));
    } finally {
      setPending(null);
    }
  }

  return <section className="space-y-4 border-t border-border pt-8">
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{fullAppsT("fullApps.additional_agent_access_40fcc4")}</h2>
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.these_agents_can_use_the_listed_actions_in_addition__51ff48")}</p>
    </div>
    {grants.map(profile => {
      const agentId = profile.metadata!.agentId as string;
      const agent = agents.find(candidate => candidate.id === agentId);
      const tools = catalog.filter(tool => profile.entries.some(entry => entry.effect === "include" && entry.catalogEntryId === tool.id));
      return <div key={profile.id} className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AgentAvatar agent={agent ?? { id: agentId, name: fullAppsT("fullApps.caption_11b39c9377") }} size={32} />
            <span className="text-sm font-medium">{agent?.name ?? fullAppsT("taskProperties.fields.agent")}</span>
          </div>
          {canManage && <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => void remove(profile.id)}>
            {pending === profile.id ? fullAppsT("companySettings.observability.removing") : fullAppsT("taskProperties.share.removeGrant")}
          </Button>}
        </div>
        <ul className="space-y-2">
          {tools.map(tool => {
            const askFirst = policies.some(policy => policy.enabled && policy.policyType === "require_approval"
              && policy.config?.source === "connection_intent"
              && policy.config.connectionId === connectionId && policy.config.agentId === agentId
              && policy.selectors?.catalogEntryId === tool.id);
            return <li key={tool.id} className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 break-all">{tool.title || tool.toolName}</span>
              <span className="shrink-0 text-muted-foreground">{askFirst ? fullAppsT("fullApps.ask_first_4a9e8c") : fullAppsT("fullApps.allowed_1bb201")}</span>
            </li>;
          })}
        </ul>
      </div>;
    })}
    {error && <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(error)}</p>}
  </section>;
}
