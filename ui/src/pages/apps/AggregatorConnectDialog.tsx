import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { aggregatorManagementUrl } from "@paperclipai/shared/aggregator-apps";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import type { AggregatorAppCatalogEntry, AggregatorAppRoute } from "@paperclipai/shared/aggregator-app-catalog";
import { isToolConnectionAttentionHealth, type ToolConnection } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLogo } from "./AppLogo";
import { remoteMcpProviders } from "@/features/connections/remote-mcp/providers";
import { ComposioAppSetup } from "./ComposioAppSetup";

export function aggregatorAppConnectHref(route: AggregatorAppRoute, connection?: ToolConnection) {
  const params = new URLSearchParams({ source: route.provider, targetToolkit: route.toolkit });
  if (connection) params.set(connection.status === "draft" ? "resume" : "reconnect", connection.id);
  return `/apps/connect?${params}`;
}

export function AggregatorConnectDialog({ app, connections, initialProvider, onClose, onNavigate }: {
  app: AggregatorAppCatalogEntry;
  connections: Partial<Record<AggregatorAppRoute["provider"], ToolConnection[]>>;
  initialProvider?: AggregatorAppRoute["provider"];
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  useFullAppsTranslation();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selected, setSelected] = useState<AggregatorAppRoute | null>(() => app.routes.find(route => route.provider === initialProvider) ?? (app.routes.length === 1 ? app.routes[0] : null));
  const canChooseProvider = app.routes.length > 1;
  const existing = selected ? connections[selected.provider] ?? [] : [];
  const usableConnection = existing.find((connection) => connection.status === "active" && connection.enabled && !isToolConnectionAttentionHealth(connection.healthStatus));
  const account = existing.find(connection => connection.id === selectedAccountId) ?? usableConnection ?? existing[0];
  const managementUrl = selected ? aggregatorManagementUrl(selected.provider, typeof account?.config?.managementUrl === "string" ? account.config.managementUrl : null) : null;
  const provider = selected ? remoteMcpProviders[selected.provider] : null;
  function choose(route: AggregatorAppRoute) {
    const accounts = connections[route.provider] ?? [];
    if (accounts.length === 0) { onNavigate(aggregatorAppConnectHref(route)); onClose(); }
    else setSelected(route);
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{provider ? fullAppsT("fullApps.connect_through_034a87", { value1: app.name, value2: provider.name }) : fullAppsT("fullApps.connect_60c786", { value1: app.name })}</DialogTitle>
        <DialogDescription className={selected?.provider === "composio" ? "sr-only" : undefined}>{selected?.provider === "composio"
          ? fullAppsT("fullApps.choose_a_saved_composio_account_or_connect_a_new_one_7547df", { value1: app.name })
          : provider
          ? fullAppsT("fullApps.your_gateway_is_already_saved_authorization_is_manag_ae438a", { value1: provider.name, value2: app.name, value3: provider.name })
          : fullAppsT("fullApps.which_service_would_you_like_to_use_this_service_han_f4e368")}</DialogDescription>
      </DialogHeader>
      {!selected ? <div className="space-y-2">{[...app.routes].sort((a, b) => Number(Boolean(connections[b.provider]?.length)) - Number(Boolean(connections[a.provider]?.length))).map((route) => {
        const accounts = connections[route.provider] ?? [];
        const name = remoteMcpProviders[route.provider].name;
        const status = accounts.some((connection) => connection.status === "active" && connection.enabled && !isToolConnectionAttentionHealth(connection.healthStatus))
          ? fullAppsT("fullApps.already_connected_be03b8") : accounts.some((connection) => connection.status === "draft") ? fullAppsT("fullApps.setup_incomplete_167fc0") : accounts.length ? fullAppsT("fullApps.needs_attention_c1ebc7") : fullAppsT("fullApps.set_up_a_connection_4832cc");
        return <button type="button" key={route.provider} onClick={() => choose(route)}
          className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <AppLogo name={name} brandKey={route.provider} size={24} />
          <div className="min-w-0 flex-1"><div className="text-sm font-medium">{name}</div><div className="text-xs text-muted-foreground">{status}</div></div>
          <span className="text-xs text-muted-foreground">{fullAppsT("fullApps.continue_496267")}</span>
        </button>;
      })}</div> : <div className="space-y-4">
        {selected.provider !== "composio" ? <div className="space-y-2"><Label htmlFor="aggregator-account"><FullAppsTrans i18nKey="fullApps.account_a9eedf" components={{ part1: <>{provider!.name}</> }} /></Label>
          <select id="aggregator-account" value={account?.id ?? ""} onChange={event => setSelectedAccountId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {existing.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
          </select>
        </div> : null}
        {selected.provider === "composio" ? <ComposioAppSetup name={app.name} toolkit={selected.toolkit} connections={existing.filter(connection => connection.status === "active" && connection.enabled && !isToolConnectionAttentionHealth(connection.healthStatus))} onClose={onClose}
          onBack={canChooseProvider ? () => setSelected(null) : undefined} onConnectNew={() => { onNavigate(`${aggregatorAppConnectHref(selected)}&new=1`); onClose(); }} /> : null}

      </div>}
      {selected?.provider !== "composio" ? <DialogFooter className="sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={selected && canChooseProvider ? () => setSelected(null) : onClose}>{selected && canChooseProvider ? fullAppsT("onboarding.actions.back") : fullAppsT("fullApps.cancel_19766e")}</Button>
        {selected ? <div className="flex flex-wrap items-center gap-3">
          {managementUrl ? <Button asChild><a href={managementUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}>{fullAppsT("onboarding.actions.continue")}<ExternalLink className="size-4" /></a></Button> : null}
          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => { onNavigate(`${aggregatorAppConnectHref(selected)}&new=1`); onClose(); }}>{fullAppsT("fullApps.connect_a_new_account_2a4210")}</Button>
        </div> : null}
      </DialogFooter> : null}
    </DialogContent>
  </Dialog>;
}
