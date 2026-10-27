import { renderAppError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConfigureRailwaySsh, ConnectionGrantsResponse, RailwaySshSetup, ToolConnection } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RailwayAccessPanel({ connection, grants }: { connection: ToolConnection; grants?: ConnectionGrantsResponse }) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const id = useId();
  const setup = connection.config?.railwaySsh as RailwaySshSetup | null | undefined;
  const owned = (grants?.grants ?? []).filter((grant) => grant.kind !== "user" || grant.subjectUserId === grants?.currentUserId);
  const eligible = owned.filter((grant) => grant.status === "active");
  const [selectedGrant, setSelectedGrant] = useState("");
  const [knownHosts, setKnownHosts] = useState(setup?.knownHosts ?? "");
  useEffect(() => { setKnownHosts(setup?.knownHosts ?? ""); }, [setup?.knownHosts]);
  const grantId = setup?.grantId ?? (selectedGrant || eligible[0]?.id);
  const canConfigure = grants?.capabilities.canConfigure && connection.status === "active" && eligible.some((grant) => grant.id === grantId);
  const canRemove = grants?.capabilities.canConfigure && owned.some((grant) => grant.id === setup?.grantId);
  const mutation = useMutation({
    mutationFn: (input: ConfigureRailwaySsh) => toolsApi.configureRailwaySsh(connection.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tools.connection(connection.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectionGrants(connection.id) });
    },
  });
  return <section className="space-y-4" aria-labelledby={`${id}-title`}>
    <div className="space-y-2">
      <h2 id={`${id}-title`} className="text-lg font-semibold">{fullAppsT("fullApps.railway_operations_b60e1b")}</h2>
      <p className="text-sm text-muted-foreground">
        {typeof connection.config?.railwayApiMessage === "string" ? connection.config?.railwayApiMessage : fullAppsT("fullApps.refresh_actions_after_connecting_to_check_service_lo_9155fa")}
      </p>
    </div>
    <div className="space-y-2">
      <h3 className="font-medium">{fullAppsT("fullApps.container_access_c77387")}</h3>
      <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.to_allow_paperclip_direct_ssh_access_to_railway_cont_f53030" components={{ part1: <a className="underline" href="https://docs.railway.com/cli/ssh" target="_blank" rel="noreferrer">{fullAppsT("fullApps.railway_ssh_documentation_b6144c")}</a> }} /></p>
    </div>
    {!canConfigure && <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_connection_manager_and_authorization_owner_can_c_cd2c32")}</p>}
    {(canConfigure || canRemove) && grantId && <>
      {!setup && eligible.length > 1 && <div className="space-y-2">
        <Label htmlFor={`${id}-grant`}>{fullAppsT("fullApps.authorization_ca5839")}</Label>
        <select id={`${id}-grant`} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={grantId} onChange={(event) => setSelectedGrant(event.target.value)}>
          {eligible.map((grant) => <option key={grant.id} value={grant.id}>{grant.kind === "organization" ? fullAppsT("fullApps.shared_account_8d29b6") : grant.kind === "user" ? fullAppsT("fullApps.my_account_b53181") : fullAppsT("fullApps.agent_account_dd7e3e")}</option>)}
        </select>
      </div>}
      {!setup && <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "prepare", grantId })}>{fullAppsT("fullApps.generate_ssh_key_pair_9ee96d")}</Button>}
      {setup && <>
        <div className="space-y-2">
          <Label htmlFor={`${id}-public`}>{fullAppsT("agentDetailUi.overview.publicKey")}</Label>
          <Textarea id={`${id}-public`} readOnly value={setup.publicKey} className="font-mono text-xs" />
          <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.register_this_public_key_in_the_railway_account_used_4583aa" components={{ part1: <a className="underline" href="https://docs.railway.com/cli/ssh#manage-ssh-keys" target="_blank" rel="noreferrer">{fullAppsT("fullApps.railway_key_setup_c078b6")}</a> }} /></p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-host`}>{fullAppsT("fullApps.verified_railway_host_key_74d7e1")}</Label>
          <Textarea id={`${id}-host`} value={knownHosts} onChange={(event) => setKnownHosts(event.target.value)} placeholder="ssh.railway.com ssh-ed25519 …" className="font-mono text-xs" />
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.paste_the_ssh_railway_com_line_from_a_known_hosts_en_f6c567")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canConfigure || mutation.isPending || !knownHosts.trim()} onClick={() => mutation.mutate({ action: "enable", grantId, knownHosts })}>{setup.enabled ? fullAppsT("fullApps.update_trusted_host_key_b299b5") : fullAppsT("fullApps.enable_container_access_7e7d11")}</Button>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "remove", grantId })}>{fullAppsT("fullApps.remove_container_key_c21f62")}</Button>
        </div>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.removing_the_key_stops_new_paperclip_connections_als_9959b1" components={{ part1: <>{setup.enabled ? fullAppsT("fullApps.container_access_is_enabled_for_this_authorization_780066") : fullAppsT("fullApps.register_the_public_key_and_verify_the_host_key_befo_be1388")}</> }} /></p>
      </>}
    </>}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error instanceof Error ? renderAppError(mutation.error) : fullAppsT("fullApps.container_access_could_not_be_updated_a8d256")}</p>}
  </section>;
}
