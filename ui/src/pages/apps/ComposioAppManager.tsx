import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { ToolConnection } from "@paperclipai/shared";
import { findComposioCatalogApp, type AggregatorAppCatalogEntry } from "@paperclipai/shared/aggregator-app-catalog";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { COMPOSIO_APP_MANAGEMENT_URL } from "@/lib/aggregator-app-setup";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ComposioAppManager({ app, connections, initialConnectionId, onClose }: {
  app: AggregatorAppCatalogEntry; connections: ToolConnection[]; initialConnectionId?: string; onClose: () => void;
}) {
  useFullAppsTranslation();
  const [connectionId, setConnectionId] = useState(initialConnectionId ?? connections[0]?.id ?? "");
  const connection = connections.find(candidate => candidate.id === connectionId);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle><FullAppsTrans i18nKey="fullApps.manage_a05881" components={{ part1: <>{app.name}</> }} /></DialogTitle><DialogDescription>{fullAppsT("fullApps.accounts_and_sign_in_are_managed_in_composio_ace5e9")}</DialogDescription></DialogHeader>
    {connections.length > 1 ? <div className="space-y-2"><Label htmlFor="composio-manage-gateway">{fullAppsT("fullApps.composio_account_c7d01d")}</Label>
      <select id="composio-manage-gateway" value={connectionId} onChange={event => setConnectionId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
        {connections.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
      </select></div> : null}
    {connection ? <ComposioAccountObservations key={connection.id} app={app} connection={connection} onClose={onClose} /> : <p role="alert">{fullAppsT("fullApps.this_composio_connection_is_no_longer_available_6a505f")}</p>}
  </DialogContent></Dialog>;
}

function ComposioAccountObservations({ app, connection, onClose }: { app: AggregatorAppCatalogEntry; connection: ToolConnection; onClose: () => void }) {
  useFullAppsTranslation();
  const queries = useQueryClient();
  const key = queryKeys.tools.composioApps(connection.id);
  const accountsQuery = useQuery({ queryKey: key, queryFn: () => toolsApi.listComposioApps(connection.id), staleTime: Infinity, refetchOnWindowFocus: false });
  const snapshots = accountsQuery.data?.apps.filter(candidate => findComposioCatalogApp(candidate.toolkit)?.slug === app.slug) ?? [];
  const accounts = snapshots.flatMap(snapshot => snapshot.accounts.map(account => ({ account, snapshot })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  async function refresh() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const toolkits = snapshots.length ? snapshots.map(snapshot => snapshot.toolkit) : [app.routes.find(route => route.provider === "composio")!.toolkit];
      queries.setQueryData(key, await toolsApi.refreshComposioApps(connection.id, toolkits));
    } catch (cause) {
      setError(cause instanceof Error ? appErrorDisplay(cause) : ownAppDisplayText("fullApps.couldn_t_check_composio_try_again_3d95bd"));
      await queries.invalidateQueries({ queryKey: key });
    } finally { setBusy(false); }
  }
  return <>
    {error || accountsQuery.isError ? <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(error) ?? fullAppsT("fullApps.couldn_t_load_composio_accounts_refresh_to_try_again_df1f5d")}</p> : null}
    {accountsQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_accounts_2494bd")}</p> : accounts.length === 0 ? <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.no_connected_accounts_087a23" components={{ part1: <>{app.name}</> }} /></p> : <div className="divide-y divide-border">
      {accounts.map(({ account, snapshot }) => <div key={`${snapshot.toolkit}:${account.id}`} className="py-3">
        <p className="truncate text-sm font-medium">{account.alias || fullAppsT("fullApps.account_44d1d1", { value1: app.name })}</p>
        <p className="text-xs text-muted-foreground">{snapshot.errorAt || Date.now() - new Date(snapshot.checkedAt).getTime() > 5 * 60_000
          ? fullAppsT("fullApps.last_known_account_refresh_to_verify_398f59") : account.status === "ACTIVE" ? fullAppsT("environmentsUi.terminal.connected") : account.status === "INITIATED" ? fullAppsT("fullApps.waiting_for_sign_in_749a34") : fullAppsT("fullApps.needs_sign_in_1077f6")}{account.isDefault ? fullAppsT("fullApps.default_2a7e0b") : ""}</p>
      </div>)}
    </div>}
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>{fullAppsT("fullApps.via_2ed8b8")}<Link to={`/apps/${connection.id}/permissions`} onClick={onClose} className="underline underline-offset-2">“{connection.name}”</Link></p>
      <p>{fullAppsT("fullApps.composio_permissions_apply_to_all_apps_on_this_conne_5d564e")}</p>
    </div>
    <DialogFooter className="sm:items-center sm:justify-between"><Button variant="ghost" onClick={onClose}>{fullAppsT("common.close")}</Button>
      <div className="flex items-center gap-2"><Button variant="ghost" disabled={busy} onClick={() => void refresh()}>{busy ? fullAppsT("taskProperties.fields.checking") : fullAppsT("externalAgentUi.common.refresh")}</Button>
        <Button asChild><a href={COMPOSIO_APP_MANAGEMENT_URL} target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.open_in_composio_08118c")}<ExternalLink className="size-4" /></a></Button></div>
    </DialogFooter>
  </>;
}
