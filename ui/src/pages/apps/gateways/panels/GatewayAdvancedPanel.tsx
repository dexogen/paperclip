import { renderAppError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import type { ToolMcpGatewayWithTokens } from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/context/ToastContext";
import { copyTextToClipboard } from "@/lib/clipboard";
import { gatewaysQueryKey } from "../NewGatewayDialog";

/**
 * Advanced tab — raw protocol/transport details, config JSON and the archive
 * (destructive) action live here, out of the default prosumer view per the
 * PAP-11174 contract's default-vs-Advanced split.
 */
export function GatewayAdvancedPanel({
  companyId,
  gateway,
}: {
  companyId: string;
  gateway: ToolMcpGatewayWithTokens;
}) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const endpoint = `${typeof window !== "undefined" ? window.location.origin : ""}${gateway.endpointPath}`;
  const rawConfig = JSON.stringify(
    {
      gatewayPublicId: gateway.gatewayPublicId,
      displaySlug: gateway.displaySlug,
      status: gateway.status,
      profileId: gateway.profileId,
      defaultProfileMode: gateway.defaultProfileMode,
      contextScopeType: gateway.contextScopeType,
      contextScopeId: gateway.contextScopeId,
      endpointPath: gateway.endpointPath,
      authConfig: gateway.authConfig,
      headerPolicy: gateway.headerPolicy,
      metadataPolicy: gateway.metadataPolicy,
      onDemandToolsConfig: gateway.onDemandToolsConfig,
    },
    null,
    2,
  );

  const archiveMutation = useMutation({
    mutationFn: () => toolsApi.updateGateway(companyId, gateway.id, { status: "archived" }),
    onSuccess: async () => {
      pushToast({ title: fullAppsT("fullApps.gateway_archived_b6b73f"), body: fullAppsT("fullApps.message_2f199b88683d", { value1: gateway.name }), tone: "success" });
      await queryClient.invalidateQueries({ queryKey: gatewaysQueryKey(companyId) });
      navigate("/apps/gateways");
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_archive_the_gateway_ab9a77"),
        body: error instanceof Error ? renderAppError(error) : String(error),
        tone: "error",
      }),
  });

  async function copy(value: string, label: string) {
    try {
      await copyTextToClipboard(value);
      pushToast({ title: fullAppsT("taskPanels.preview.copied"), body: label, tone: "success" });
    } catch {
      pushToast({ title: fullAppsT("taskPanels.viewer.copy.failed"), body: fullAppsT("fullApps.clipboard_access_is_unavailable_0899c2"), tone: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{fullAppsT("runUi.provider.detail.transport")}</h3>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label={fullAppsT("runUi.provider.detail.transport")} value="streamable_http" />
          <Row label={fullAppsT("providerSetup.setup.authentication")} value="bearer" />
          <Row label={fullAppsT("fullApps.protocol_version_cdd735")} value="2025-03-26" />
          <Row label={fullAppsT("fullApps.public_id_3705b6")} value={gateway.gatewayPublicId} mono />
        </dl>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {endpoint}
          </code>
          <Button variant="outline" size="sm" onClick={() => void copy(endpoint, fullAppsT("fullApps.copy_2578179d1779"))}>
            <Copy className="mr-1 h-3.5 w-3.5" />{fullAppsT("taskDetailCommon.markdown.copy")}</Button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{fullAppsT("fullApps.raw_configuration_493d4f")}</h3>
          <Button variant="outline" size="sm" onClick={() => void copy(rawConfig, fullAppsT("fullApps.gateway_config_json_7dc544"))}>
            <Copy className="mr-1 h-3.5 w-3.5" />{fullAppsT("fullApps.copy_json_7708c6")}</Button>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
          {rawConfig}
        </pre>
      </section>

      <section className="space-y-2 rounded-lg border border-destructive/40 p-4">
        <h3 className="text-sm font-semibold text-destructive">{fullAppsT("skillsGap.dangerZone")}</h3>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.archiving_takes_the_gateway_offline_for_every_client_7297cf")}</p>
        {confirming ? (
          <div className="space-y-2">
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={gateway.name}
              aria-label={fullAppsT("fullApps.type_the_gateway_name_to_confirm_archive_7add56")}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={confirmName.trim() !== gateway.name || archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
              >
                {archiveMutation.isPending ? fullAppsT("fullApps.archiving_af9e1c") : fullAppsT("fullApps.archive_gateway_62da42")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setConfirming(false); setConfirmName(""); }}>{fullAppsT("fullApps.cancel_19766e")}</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>{fullAppsT("fullApps.archive_gateway_62da42")}</Button>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  useFullAppsTranslation();
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-foreground" : "mt-0.5 text-foreground"}>{value}</dd>
    </div>
  );
}
