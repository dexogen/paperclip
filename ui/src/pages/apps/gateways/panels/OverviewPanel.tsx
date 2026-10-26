import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { Copy } from "lucide-react";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  activeTokenCount,
  allowedToolsLabel,
  expiringTokenCount,
  formatScope,
  type GatewayAppRow,
  gatewayAppDisplayName,
  isGatewayOn,
} from "../gateway-helpers";

export function OverviewPanel({
  gateway,
  profile,
  apps,
  agentNames,
  projectNames,
  toggleDisabled,
  onToggle,
}: {
  gateway: ToolMcpGatewayWithTokens;
  profile: ToolProfileWithDetails | undefined;
  apps: GatewayAppRow[];
  agentNames: Map<string, string>;
  projectNames: Map<string, string>;
  toggleDisabled: boolean;
  onToggle: () => void;
}) {
  useFullAppsTranslation();
  const { pushToast } = useToast();
  const endpoint = `${typeof window !== "undefined" ? window.location.origin : ""}${gateway.endpointPath}`;
  const active = activeTokenCount(gateway);
  const expiring = expiringTokenCount(gateway);
  const needsAttention = apps.filter((app) => app.needsAttention);
  const on = isGatewayOn(gateway);

  const snippet = [
    "{",
    '  "mcpServers": {',
    `    "paperclip-${gateway.displaySlug}": {`,
    `      "url": "${endpoint}",`,
    '      "headers": { "Authorization": "Bearer pcgw_•••_TOKEN" }',
    "    }",
    "  }",
    "}",
  ].join("\n");

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs font-medium text-muted-foreground">{on ? fullAppsT("fullApps.on_130011") : fullAppsT("fullApps.off_ca7981")}</div>
          <div className="mt-2">
            <ToggleSwitch checked={on} disabled={toggleDisabled} onCheckedChange={onToggle} aria-label={fullAppsT("fullApps.toggle_gateway_10748b")} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{fullAppsT("fullApps.toggle_the_whole_gateway_off_here_a27be6")}</p>
        </div>
        <StatCard label={fullAppsT("agentDetailUi.nav.apps")}>
          {apps.length} {apps.length === 1 ? fullAppsT("fullApps.app_a172ce") : fullAppsT("fullApps.apps_d56f63")}
          {profile ? ` · ${allowedToolsLabel(profile)}` : ""}
        </StatCard>
        <StatCard label={fullAppsT("fullApps.tokens_a039df")}><FullAppsTrans i18nKey="fullApps.active_c2525c" components={{ part1: <>{active}</>, part2: <>{expiring > 0 ? fullAppsT("fullApps.expiring_c0ade7", { value1: expiring }) : ""}</> }} /></StatCard>
        <StatCard label={fullAppsT("fullApps.health_558984")}>
          {needsAttention.length === 0 ? fullAppsT("fullApps.all_green_f7836f") : fullAppsT("fullApps.needs_attention_2773f1", { value1: needsAttention.length })}
        </StatCard>
      </div>

      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{fullAppsT("fullApps.who_can_use_it_82d9af")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.anyone_holding_an_active_token_below_restricted_by_t_bd0cff")}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip><FullAppsTrans i18nKey="fullApps.scope_266181" components={{ part1: <>{formatScope(gateway, projectNames, agentNames)}</> }} /></Chip>
          <Chip><FullAppsTrans i18nKey="fullApps.profile_ab49a9" components={{ part1: <>{profile?.name ?? fullAppsT("fullApps.unavailable_ca1844")}</> }} /></Chip>
          <Chip>{fullAppsT("fullApps.activeTokens", { count: active })}</Chip>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{fullAppsT("fullApps.apps_in_this_gateway_f79f93")}</h3>
        {apps.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{fullAppsT("fullApps.this_gateway_s_profile_doesn_t_include_any_apps_yet_de912b")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {apps.map((app) => (
              <AppRow key={app.application.id} app={app} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{fullAppsT("fullApps.how_clients_connect_0b9f00")}</h3>
          <Button variant="outline" size="sm" onClick={() => void copy(snippet, fullAppsT("fullApps.client_config_3633cf"))}>
            <Copy className="mr-1 h-3.5 w-3.5" />{fullAppsT("taskDetailCommon.markdown.copy")}</Button>
        </div>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-3 font-mono text-xs text-muted-foreground">
          {snippet}
        </pre>
      </section>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  useFullAppsTranslation();
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  useFullAppsTranslation();
  return (
    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function AppRow({ app }: { app: GatewayAppRow }) {
  useFullAppsTranslation();
  const href = app.connection
    ? `/apps/${app.connection.id}/permissions`
    : `/apps/app/${app.application.id}/permissions`;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <Link to={href} className="font-medium text-foreground hover:underline">
          {gatewayAppDisplayName(app)}
        </Link>
        <div className="text-xs text-muted-foreground">
          {app.toolCount} {app.toolCount === 1 ? fullAppsT("fullApps.tool_7c9bbe") : fullAppsT("fullApps.tools_f9d35d")}
          {app.needsAttention && app.attentionReason ? ` · ${app.attentionReason}` : ""}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
          app.needsAttention
            ? "border-foreground bg-foreground text-background"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        {app.needsAttention ? fullAppsT("inboxUi.blocked.variant.needs_attention") : fullAppsT("projectConfigUi.budget.healthy")}
      </span>
    </li>
  );
}
