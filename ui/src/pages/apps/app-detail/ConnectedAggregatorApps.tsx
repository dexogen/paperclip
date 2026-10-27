import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import type { ToolConnection } from "@paperclipai/shared";
import { AGGREGATOR_APP_CATALOG } from "@paperclipai/shared/aggregator-app-catalog";
import { AGGREGATOR_NAMES, type AggregatorAppSnapshot, isAppAggregator } from "@paperclipai/shared/aggregator-apps";
import { useAccountIdentity } from "@/api/companies-query";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { AppLogo } from "../AppLogo";

const catalogBySlug = new Map(AGGREGATOR_APP_CATALOG.map(app => [app.slug, app]));

export function ConnectedAggregatorApps({ connection }: { connection: ToolConnection }) {
  useFullAppsTranslation();
  const queryClient = useQueryClient();
  const { userId, settled, failed } = useAccountIdentity();
  const queryKey = queryKeys.tools.aggregatorApps(connection.id, userId);
  const firstRefreshFor = useRef<string | null>(null);
  const identityKey = JSON.stringify([connection.id, userId]);
  const query = useQuery({
    queryKey,
    queryFn: () => toolsApi.listAggregatorApps(connection.id),
    enabled: settled,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchInterval: query => query.state.data?.sync.status === "syncing" ? 1500 : 60_000,
  });
  const refresh = useMutation({
    mutationFn: (_viewingUserId: string | null) => toolsApi.syncAggregatorApps(connection.id, true),
    onSuccess: (result, viewingUserId) => queryClient.setQueryData(queryKeys.tools.aggregatorApps(connection.id, viewingUserId), result),
  });
  const data = settled ? query.data : undefined;
  const provider = data?.provider ?? connection.config?.sourceTemplateKey;
  const providerName = isAppAggregator(provider) ? AGGREGATOR_NAMES[provider] : "provider";
  const waitingForFirstRefresh = settled && data?.discovery.availability === "available" && firstRefreshFor.current !== identityKey;
  const syncing = waitingForFirstRefresh || refresh.isPending || data?.sync.status === "syncing";
  const loadFailed = query.isError || failed;
  const syncFailed = refresh.isError || data?.sync.status === "error";
  const unavailable = data && data.discovery.availability !== "available";
  const apps = useMemo(() => {
    const grouped = new Map<string, AggregatorAppSnapshot[]>();
    for (const snapshot of data?.apps ?? []) {
      if (!snapshot.accounts.length) continue;
      grouped.set(snapshot.appSlug, [...(grouped.get(snapshot.appSlug) ?? []), snapshot]);
    }
    return [...grouped.values()].sort((a, b) => a[0].appName.localeCompare(b[0].appName));
  }, [data?.apps]);
  useEffect(() => {
    if (!waitingForFirstRefresh) return;
    firstRefreshFor.current = identityKey;
    refresh.mutate(userId);
  }, [waitingForFirstRefresh, identityKey, refresh.mutate, userId]);

  return <section aria-labelledby="connected-aggregator-apps-heading" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="connected-aggregator-apps-heading" className="text-sm font-semibold">{fullAppsT("fullApps.connected_apps_c023d1")}</h2>
      <Button variant="outline" size="sm" aria-label={fullAppsT("fullApps.refresh_1aec84", { value1: providerName })}
        disabled={!settled || query.isLoading || syncing || Boolean(unavailable)}
        onClick={() => refresh.mutate(userId)}>
        <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        {syncing ? fullAppsT("providerSetup.model.refreshing") : fullAppsT("fullApps.refresh_1aec84", { value1: providerName })}
      </Button>
    </div>
    {loadFailed || syncFailed ? <p role="alert" className="text-sm text-destructive"><FullAppsTrans i18nKey="fullApps.couldn_t_refresh_apps_0fbc94" components={{ part1: <>{providerName}</>, part2: <>{apps.length ? fullAppsT("fullApps.lastKnownApps") : fullAppsT("fullApps.refreshAgain")}</> }} /></p> : null}
    {syncing ? <p role="status" className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.refreshing_apps_242781" components={{ part1: <>{data?.sync.total ? fullAppsT("fullApps.of_96e04a", { value1: data.sync.checked, value2: data.sync.total }) : ""}</> }} /></p> : refresh.isSuccess && !syncFailed && !unavailable ? <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.apps_refreshed_3d1a63")}</p> : null}
    {(!settled && !failed) || query.isLoading ? <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_apps_f8bcca")}</p>
      : apps.length ? <ul aria-label={fullAppsT("fullApps.connected_apps_374fd8", { value1: providerName })} tabIndex={0}
        className="max-h-80 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {apps.map(snapshots => {
          const app = snapshots[0];
          const accounts = [...new Map(snapshots.flatMap(snapshot => snapshot.accounts).map(account => [account.id, account])).values()];
          const stale = loadFailed || syncFailed || unavailable || snapshots.some(snapshot => snapshot.freshness === "stale" || snapshot.errorAt);
          const connected = !stale && accounts.some(account => account.status === "ACTIVE");
          const status = stale ? fullAppsT("fullApps.not_verified_151339") : connected ? "Connected"
            : accounts.some(account => account.status === "UNVERIFIED") ? fullAppsT("fullApps.not_verified_151339")
            : accounts.some(account => account.status === "INITIATED") ? fullAppsT("fullApps.waiting_for_sign_in_749a34") : fullAppsT("fullApps.needs_sign_in_1077f6");
          const logoUrl = catalogBySlug.get(app.appSlug)?.routes.find(route => route.provider === provider)?.logoUrl;
          return <li key={app.appSlug} className="flex items-center gap-3 px-3 py-3">
            <AppLogo name={app.appName} brandKey={app.appSlug} logoUrl={logoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={app.appName}>{app.appName}</p>
              {accounts.length > 1 ? <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.accounts_78a73f" components={{ part1: <>{accounts.length}</> }} /></p>
                : accounts[0]?.alias ? <p className="truncate text-xs text-muted-foreground">{accounts[0].alias}</p> : null}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              {connected ? <Check className="size-4 text-(--status-task-done)" aria-hidden="true" /> : null}
              {status}
            </span>
          </li>;
        })}
      </ul> : !loadFailed && !syncFailed && !syncing ? <p className="text-sm text-muted-foreground">
        {data?.discovery.message ?? fullAppsT("fullApps.no_connected_apps_found_in_c4170a", { value1: providerName })}
      </p> : null}
  </section>;
}
