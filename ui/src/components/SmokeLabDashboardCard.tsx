import { useTranslation } from "@/i18n";
import type { TFunction } from "i18next";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, ChevronRight } from "lucide-react";
import { Link } from "@/lib/router";
import { smokeLabApi } from "@/api/smokeLab";
import { queryKeys } from "@/lib/queryKeys";
import { useSmokeLabEnabled } from "@/hooks/useSmokeLabEnabled";
import { advancedTabHref } from "@/pages/tools/tool-tabs";
import { cn } from "@/lib/utils";
import { failingPaths, runHealth, type SmokeHealth } from "@/pages/tools/smoke-lab-matrix";

const HEALTH_DOT: Record<SmokeHealth, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

function healthLabel(health: SmokeHealth, t: TFunction): string {
  switch (health) {
    case "green": return t("liveDashboardUi.smoke.green");
    case "amber": return t("liveDashboardUi.smoke.amber");
    case "red": return t("liveDashboardUi.smoke.red");
    case "unknown": return t("liveDashboardUi.smoke.unknown");
  }
}

function formatTime(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Compact "Integration smoke" dashboard card (PAP-13347 / S2, plan §D3).
 * Renders only when `experimental.enableSmokeLab` is on (board-readable flag),
 * so the dashboard stays clean for everyone who isn't running the Smoke Lab.
 * Operator-facing copy stays plain; protocol depth lives behind the link into
 * the Developer › Smoke Lab tab.
 */
export function SmokeLabDashboardCard({ companyId }: { companyId: string }) {
  const { t, i18n } = useTranslation();
  const { enabled, loaded } = useSmokeLabEnabled();

  const runsQuery = useQuery({
    queryKey: queryKeys.smokeLab.runs(companyId),
    queryFn: () => smokeLabApi.listRuns(companyId),
    enabled: enabled && loaded,
  });

  const latestRun = runsQuery.data?.runs?.[0];

  const detailQuery = useQuery({
    queryKey: queryKeys.smokeLab.run(companyId, latestRun?.id ?? "__none__"),
    queryFn: () => smokeLabApi.getRun(companyId, latestRun!.id),
    enabled: enabled && loaded && !!latestRun,
  });

  if (!loaded || !enabled) return null;

  const steps = detailQuery.data?.steps ?? [];
  const health = runHealth(latestRun, steps);
  const failing = failingPaths(steps);

  return (
    <Link
      to={advancedTabHref("smoke-lab")}
      className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
      data-testid="smoke-lab-dashboard-card"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", HEALTH_DOT[health])} />
            <p className="truncate text-sm font-semibold text-foreground">{t("liveDashboardUi.smoke.title")}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {healthLabel(health, t)}
            {failing.length > 0 && `: ${failing.join(", ")}`}
          </p>
          <p className="mt-0.5 truncate text-(length:--text-micro) text-muted-foreground/80">
            {latestRun ? t("liveDashboardUi.smoke.lastRun", { time: formatTime(latestRun.startedAt, i18n.resolvedLanguage === "ru" ? "ru-RU" : "en-US") }) : t("liveDashboardUi.smoke.start")}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
