import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toolsApi } from "@/api/tools";
import { AgentPanel } from "@/components/agent-detail/AgentPanels";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { AppLogo } from "../apps/AppLogo";

const SHOWN_LOGOS = 3;

export function AgentAllowedConnectors({ agentId, companyId }: { agentId: string; companyId: string }) {
  useUiTranslation();
  const effective = useQuery({
    queryKey: queryKeys.tools.effectiveProfilesForAgent(companyId, agentId),
    queryFn: () => toolsApi.getEffectiveProfilesForAgent(companyId, agentId),
  });
  const connections = useQuery({
    queryKey: queryKeys.tools.connections(companyId),
    queryFn: () => toolsApi.listConnections(companyId),
  });
  const applications = useQuery({
    queryKey: queryKeys.tools.applications(companyId),
    queryFn: () => toolsApi.listApplications(companyId),
  });

  const apps = useMemo(() => {
    const connectionApp = new Map((connections.data?.connections ?? []).map((connection) => [connection.id, connection.applicationId]));
    const appById = new Map((applications.data?.applications ?? []).map((application) => [application.id, application]));
    const seen = new Map<string, { id: string; name: string; key?: string }>();
    for (const tool of effective.data?.allowedTools ?? []) {
      const applicationId = connectionApp.get(tool.connectionId);
      const application = applicationId ? appById.get(applicationId) : undefined;
      if (!application || seen.has(application.id)) continue;
      seen.set(application.id, { id: application.id, name: application.name, key: application.applicationKey });
    }
    return [...seen.values()];
  }, [applications.data?.applications, connections.data?.connections, effective.data?.allowedTools]);

  const loading = effective.isLoading || connections.isLoading || applications.isLoading;
  const failed = effective.error || connections.error || applications.error;

  return (
    <AgentPanel
      title={translateUi("interfaceUpdates.allowed_connectors_d64f3e6e")}
      aria-label={translateUi("interfaceUpdates.allowed_connectors_d64f3e6e")}
      action={
        <Button variant="ghost" size="icon-xs" asChild>
          <Link to="/apps?source=installed" aria-label={translateUi("interfaceUpdates.manage_connectors_c35d0b33")} title={translateUi("interfaceUpdates.manage_connectors_c35d0b33")}>
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center px-(--agent-detail-module-inset) pb-(--agent-detail-module-inset)">
        {loading ? (
          <p role="status" className="text-xs text-muted-foreground">{translateUi("interfaceUpdates.resolving_access_339156e7")}</p>
        ) : failed ? (
          <p role="alert" className="text-xs text-destructive">{translateUi("interfaceUpdates.couldn_t_load_this_agent_s_connectors_90eb36b9")}</p>
        ) : apps.length === 0 ? (
          <p className="text-xs text-muted-foreground">{translateUi("interfaceUpdates.no_connectors_are_allowed_yet_ab7c226f")}</p>
        ) : (
          <ul aria-label={translateUi("sidebar.connectors")} className="flex max-h-(--agent-detail-logo-rows-h) flex-wrap gap-3 overflow-hidden">
            {apps.slice(0, SHOWN_LOGOS).map((app) => (
              <li key={app.id} className="flex shrink-0" title={app.name}>
                <AppLogo name={app.name} brandKey={app.key} size={24} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AgentPanel>
  );
}
