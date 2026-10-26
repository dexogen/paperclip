import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { AgentMultiSelect } from "@/components/AgentMultiSelect";
import { RadioCardGroup } from "@/components/ui/radio-card";

export function EmailConnectionAccess({
  companyId,
  connectionId,
  agents,
}: {
  companyId: string;
  connectionId: string;
  agents: Agent[];
}) {
  useFullSharedTranslation();
  const cache = useQueryClient();
  const grants = useQuery({
    queryKey: queryKeys.tools.connectionGrants(connectionId),
    queryFn: () => toolsApi.listConnectionGrants(connectionId),
  });
  const installs = useQuery({
    queryKey: queryKeys.tools.connectionInstalls(connectionId),
    queryFn: () => toolsApi.getConnectionInstalls(connectionId),
  });
  const save = useMutation({
    mutationFn: (
      next: Array<{ targetType: "company" | "agent"; targetId: string }>,
    ) => toolsApi.putConnectionInstalls(connectionId, next),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: queryKeys.tools.connectionInstalls(connectionId),
      });
    },
  });
  if (grants.isLoading || installs.isLoading)
    return <p className="text-sm text-muted-foreground">{fullSharedT("projectConfigUi.access.loading")}</p>;
  if (grants.error || installs.error)
    return (
      <p role="alert" className="text-sm text-destructive">{fullSharedT("fullShared.connection_access_could_not_be_loaded_953390")}</p>
    );
  const active = grants.data?.grants.filter((g) => g.status === "active") ?? [];
  const everyone = active.some((g) => g.kind === "organization");
  const personal = active.find((g) => g.kind === "user");
  const humanLabel = everyone
    ? fullSharedT("providerSetup.access.anyHuman")
    : personal
      ? personal.subjectUserId === grants.data?.currentUserId
        ? fullSharedT("providerSetup.access.justMe")
        : fullSharedT("fullShared.only_the_credential_owner_78987d")
      : fullSharedT("taskProperties.share.revoked");
  const allAgents =
    installs.data?.installs.some((i) => i.targetType === "company") ?? false;
  const selected = new Set(
    installs.data?.installs
      .filter((i) => i.targetType === "agent")
      .map((i) => i.targetId),
  );
  const disabled = !grants.data?.capabilities.canConfigure || save.isPending;
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{fullSharedT("providerSetup.access.identityHeading")}</h2>
        <p className="text-sm">{humanLabel}</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">{fullSharedT("providerSetup.access.agentsHeading")}</h2>
        <RadioCardGroup
          ariaLabel="Which agents can use this connection"
          value={allAgents ? "all" : "selected"}
          disabled={disabled}
          className="sm:grid-cols-2"
          options={[
            { value: "selected", title: fullSharedT("providerSetup.access.justChosen") },
            { value: "all", title: fullSharedT("fullShared.any_agent_ee3e76") },
          ]}
          onValueChange={(value) =>
            save.mutate(
              value === "all"
                ? [{ targetType: "company", targetId: companyId }]
                : Array.from(selected, (targetId) => ({
                    targetType: "agent",
                    targetId,
                  })),
            )
          }
        />
        {!allAgents && (
          <AgentMultiSelect
            agents={agents.filter((a) => a.status !== "terminated")}
            selectedAgentIds={selected}
            disabled={disabled}
            onSave={(ids) =>
              save.mutate(
                Array.from(ids, (targetId) => ({
                  targetType: "agent",
                  targetId,
                })),
              )
            }
          />
        )}
        <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.removing_an_assigned_agent_stops_receiving_and_sendi_e816d5")}</p>
        {save.error && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
