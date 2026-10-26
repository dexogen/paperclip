import { useTranslation } from "@/i18n";
import { ShieldCheck, ShieldX, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export interface ProjectAccessNoticeProps {
  agentName?: string;
  projectName?: string;
  ready: boolean;
  canManage: boolean;
  canRetry: boolean;
  onManage: () => void;
  onRetry: () => void;
  error?: Error | null;
  className?: string;
}

export function ProjectAccessNotice({ agentName, projectName, ready, canManage, canRetry, onManage, onRetry, error, className }: ProjectAccessNoticeProps) {
  const { t } = useTranslation();
  return <section role={ready ? "status" : "alert"} aria-label={t("runUi.projectAccess.label")} className={cn("space-y-4 rounded-lg border border-border p-4", className)}>
    <div className="flex items-start gap-3">
      {ready ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden /> : <ShieldX className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />}
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold">{ready ? t("runUi.projectAccess.ready") : agentName == null ? t("runUi.projectAccess.deniedFallback") : t("runUi.projectAccess.denied", { agentName })}</h3>
        <p className="text-sm text-muted-foreground">{ready
          ? t("runUi.projectAccess.readyBody")
          : projectName == null ? t("runUi.projectAccess.bodyFallback") : t("runUi.projectAccess.body", { projectName })}</p>
        {!ready && !canManage && <p className="text-sm text-muted-foreground">{t("runUi.projectAccess.help")}</p>}
      </div>
    </div>
    <div className="flex flex-wrap gap-2 pl-8">
      {ready ? canRetry && <Button size="sm" onClick={onRetry}>{t("runUi.projectAccess.retry")}<ArrowRight className="size-4" aria-hidden /></Button>
        : <Button size="sm" variant="outline" onClick={onManage}>{canManage ? t("runUi.projectAccess.manage") : t("runUi.projectAccess.view")}<ArrowRight className="size-4" aria-hidden /></Button>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
    {!ready && <details className="pl-8 text-xs text-muted-foreground"><summary className="cursor-pointer">{t("runUi.projectAccess.details")}</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2"><dt>{t("runUi.projectAccess.stoppedDuring")}</dt><dd>{t("runUi.projectAccess.setup")}</dd><dt>{t("runUi.projectAccess.reason")}</dt><dd>{t("runUi.projectAccess.outside")}</dd><dt>{t("runUi.projectAccess.started")}</dt><dd>{t("runUi.projectAccess.no")}</dd></dl>
    </details>}
  </section>;
}
