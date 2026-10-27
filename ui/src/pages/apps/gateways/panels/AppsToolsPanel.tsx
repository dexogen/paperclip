import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { allowedToolsLabel, type GatewayAppRow, gatewayAppDisplayName } from "../gateway-helpers";

/**
 * Apps & tools tab — which apps this gateway exposes and how many tools each
 * contributes, derived from the bound access profile. Missing credentials
 * surface as "Needs attention", carried from the connection health status.
 */
export function AppsToolsPanel({
  apps,
  profile,
}: {
  apps: GatewayAppRow[];
  profile: ToolProfileWithDetails | undefined;
}) {
  useFullAppsTranslation();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.these_apps_go_through_this_gateway_the_bound_profile_6db5b7" components={{ part1: <>{profile ? ` (${profile.name})` : ""}</>, part2: <>{profile ? ` — ${allowedToolsLabel(profile)}.` : "."}</> }} /></p>

      {apps.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{fullAppsT("fullApps.no_apps_are_assigned_to_this_gateway_s_profile_yet_20c299")}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-(--sz-32rem) text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">{fullAppsT("surfacesGap.toolsAudit.app")}</th>
                <th className="px-4 py-2.5">{fullAppsT("agentDetailUi.nav.tools")}</th>
                <th className="px-4 py-2.5">{fullAppsT("sidebar.status")}</th>
                <th className="px-4 py-2.5 text-right" />
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const href = app.connection
                  ? `/apps/${app.connection.id}/permissions`
                  : `/apps/app/${app.application.id}/permissions`;
                return (
                  <tr key={app.application.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link to={href} className="font-medium text-foreground hover:underline">
                        {gatewayAppDisplayName(app)}
                      </Link>
                      {app.needsAttention && app.attentionReason ? (
                        <div className="text-xs text-muted-foreground">{app.attentionReason}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {app.toolCount} {app.toolCount === 1 ? fullAppsT("fullApps.tool_7c9bbe") : fullAppsT("fullApps.tools_f9d35d")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          app.needsAttention
                            ? "border-foreground bg-foreground text-background"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {app.needsAttention ? fullAppsT("inboxUi.blocked.variant.needs_attention") : fullAppsT("projectConfigUi.budget.healthy")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={href} className="text-xs font-medium text-primary hover:underline">{fullAppsT("fullApps.open_1d2902")}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
