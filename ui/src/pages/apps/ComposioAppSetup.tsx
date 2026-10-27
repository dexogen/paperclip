import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { ComposioAppSetupInput, ComposioAppSetupResult, ToolConnection } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { useAccountIdentity } from "@/api/companies-query";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";

/** Provider authorization is performed by the backend; no task or agent run. */
export function ComposioAppSetup({ name, toolkit, connections, onClose, onBack, onConnectNew }: {
  name: string; toolkit: string; connections: ToolConnection[]; onClose: () => void;
  onBack?: () => void; onConnectNew: () => void;
}) {
  useFullAppsTranslation();
  const queries = useQueryClient();
  const { userId, settled } = useAccountIdentity();
  const { pushToast } = useToast();
  const [selectedConnectionId, setConnectionId] = useState<string | null>(null);
  const connectionId = selectedConnectionId ?? connections[0]?.id ?? "__new__";
  const [result, setResult] = useState<ComposioAppSetupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const connection = connections.find(candidate => candidate.id === connectionId);

  async function submit(input: ComposioAppSetupInput) {
    if (busy || !connection || !settled) return;
    setConnectionId(connection.id);
    setBusy(true);
    setError(null);
    try {
      const next = await toolsApi.setupComposioApp(connection.id, toolkit, input);
      setResult(next);
      await queries.invalidateQueries({ queryKey: queryKeys.tools.composioApps(connection.id), exact: true });
      await queries.invalidateQueries({ queryKey: queryKeys.tools.aggregatorApps(connection.id, userId), exact: true });
      if (next.status === "connected") {
        pushToast({ title: fullAppsT("fullApps.is_connected_through_composio_0fa2d9", { value1: name }), tone: "success" });
        onClose();
      }
    } catch (cause) {
      setError(cause instanceof Error ? appErrorDisplay(cause) : ownAppDisplayText("fullApps.couldn_t_configure_this_app_try_again_ee7cd5"));
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="composio-app-account">{fullAppsT("fullApps.composio_account_c7d01d")}</Label>
      <select id="composio-app-account" value={connectionId} disabled={busy} onChange={event => {
        setConnectionId(event.target.value); setResult(null); setError(null);
      }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {connections.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        <option value="__new__">{fullAppsT("fullApps.connect_a_new_account_1e5517")}</option>
      </select>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(error)}</p> : null}
    {result ? <p role="status" className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.finish_connecting_in_composio_then_return_here_f8da3d" components={{ part1: <>{name}</> }} /></p> : null}
    {result?.authorizationUrl ? <Button asChild variant="outline" className="w-full">
      <a href={result.authorizationUrl} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.connectInComposio", { name })}<ExternalLink className="size-4" /></a>
    </Button> : null}
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" disabled={busy} onClick={onBack ?? onClose}>{onBack ? fullAppsT("onboarding.actions.back") : fullAppsT("fullApps.cancel_19766e")}</Button>
      <div className="flex items-center gap-2">
      {result && result.status !== "connected" ? <Button variant="ghost" disabled={busy} onClick={() => void submit({ action: "start" })}>{fullAppsT("fullApps.get_a_new_link_a402df")}</Button> : null}
      <Button disabled={!settled || busy || (!connection && connectionId !== "__new__")} onClick={() => {
        if (connectionId === "__new__") onConnectNew();
        else void submit(result ? { action: "complete" } : { action: "start" });
      }}>
        {busy ? fullAppsT("taskProperties.fields.checking") : connectionId === "__new__" ? fullAppsT("fullApps.connect_new_account_fcd079") : result ? fullAppsT("fullApps.i_ve_connected_it_d245c7") : fullAppsT("onboarding.actions.continue")}
      </Button>
      </div>
    </div>
  </div>;
}
