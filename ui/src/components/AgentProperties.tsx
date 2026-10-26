import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { AgentIdentity } from "@/components/AgentIdentity";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { type Agent, type AgentRuntimeState } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { agentDisplayAdapterType, getAdapterLabel } from "../adapters/adapter-display-registry";
import { queryKeys } from "../lib/queryKeys";
import { AgentStatusBadge } from "./StatusBadge";
import { Identity } from "./Identity";
import { formatDate, agentUrl } from "../lib/utils";
import { Separator } from "@/components/ui/separator";

interface AgentPropertiesProps {
  agent: Agent;
  runtimeState?: AgentRuntimeState;
}

import { roleLabel } from "@/i18n/ui-labels";

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0 w-20 mt-0.5">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">{children}</div>
    </div>
  );
}

export function AgentProperties({ agent, runtimeState }: AgentPropertiesProps) {
  useFullSharedTranslation();
  const { selectedCompanyId } = useCompany();
  const lastErrorIsActive = agent.status === "error";

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && !!agent.reportsTo,
  });

  const reportsToAgent = agent.reportsTo ? agents?.find((a) => a.id === agent.reportsTo) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <PropertyRow label={fullSharedT("sidebar.status")}>
          <AgentStatusBadge status={agent.status} />
        </PropertyRow>
        {lastErrorIsActive && agent.errorReason && (
          <PropertyRow label={fullSharedT("fullShared.error_reason_430764")}>
            <span className="text-xs text-red-600 dark:text-red-400 break-words min-w-0">
              {agent.errorReason}
            </span>
          </PropertyRow>
        )}
        <PropertyRow label={fullSharedT("approvalsUi.role")}>
          <span className="text-sm">{roleLabel(agent.role)}</span>
        </PropertyRow>
        {agent.title && (
          <PropertyRow label={fullSharedT("agentConfigUi.title")}>
            <span className="text-sm">{agent.title}</span>
          </PropertyRow>
        )}
        <PropertyRow label={fullSharedT("approvalsUi.adapter")}>
          <span className="text-sm font-mono">{getAdapterLabel(agentDisplayAdapterType(agent))}</span>
        </PropertyRow>
      </div>

      <Separator />

      <div className="space-y-1">
        {(runtimeState?.sessionDisplayId ?? runtimeState?.sessionId) && (
          <PropertyRow label={fullSharedT("agentDetailUi.overview.session")}>
            <span className="text-xs font-mono">
              {String(runtimeState.sessionDisplayId ?? runtimeState.sessionId).slice(0, 12)}...
            </span>
          </PropertyRow>
        )}
        {runtimeState?.lastError && (
          <PropertyRow label={lastErrorIsActive ? fullSharedT("taskProperties.fields.lastError") : fullSharedT("fullShared.last_run_error_bcda9f")}>
            <span
              className={
                lastErrorIsActive
                  ? "text-xs text-red-600 dark:text-red-400 break-words min-w-0"
                  : "text-xs text-muted-foreground break-words min-w-0"
              }
            >
              {runtimeState.lastError}
            </span>
          </PropertyRow>
        )}
        {agent.lastHeartbeatAt && (
          <PropertyRow label={fullSharedT("fullShared.last_heartbeat_d591d3")}>
            <span className="text-sm">{formatDate(agent.lastHeartbeatAt)}</span>
          </PropertyRow>
        )}
        {agent.reportsTo && (
          <PropertyRow label={fullSharedT("fullShared.reports_to_8b48a5")}>
            {reportsToAgent ? (
              <Link to={agentUrl(reportsToAgent)} className="hover:underline">
                <AgentIdentity agent={reportsToAgent} size="sm" />
              </Link>
            ) : (
              <span className="text-sm font-mono">{agent.reportsTo.slice(0, 8)}</span>
            )}
          </PropertyRow>
        )}
        <PropertyRow label={fullSharedT("fullShared.created_d70b9e")}>
          <span className="text-sm">{formatDate(agent.createdAt)}</span>
        </PropertyRow>
      </div>
    </div>
  );
}
