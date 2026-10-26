import type { TFunction } from "i18next";
import { useTranslation } from "../i18n";
import { useState } from "react";
import type { BudgetIncident } from "@paperclipai/shared";
import { AlertOctagon, AlertTriangle, ArrowUpRight, PauseCircle } from "lucide-react";
import { formatCents } from "../lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function centsInputValue(value: number) {
  return (value / 100).toFixed(2);
}

function parseDollarInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function incidentStateLabel(incident: BudgetIncident, t: TFunction) {
  if (incident.status === "resolved") return t("costCardsUi.incident.resolved");
  if (incident.status === "dismissed") return t("costCardsUi.incident.dismissed");
  if (incident.approvalStatus === "revision_requested") return t("costCardsUi.incident.escalated");
  if (incident.approvalStatus === "pending") return t("costCardsUi.incident.pending");
  return t("costCardsUi.incident.open");
}

export function BudgetIncidentCard({
  incident,
  onRaiseAndResume,
  onKeepPaused,
  isMutating,
}: {
  incident: BudgetIncident;
  onRaiseAndResume: (amountCents: number) => void;
  onKeepPaused: () => void;
  isMutating?: boolean;
}) {
  const { t } = useTranslation();
  const isWarning = incident.thresholdType === "soft";
  const scopeCaption = incident.scopeType === "company"
    ? isWarning ? t("costCardsUi.incident.companyWarning") : t("costCardsUi.incident.companyStop")
    : incident.scopeType === "agent"
      ? isWarning ? t("costCardsUi.incident.agentWarning") : t("costCardsUi.incident.agentStop")
      : incident.scopeType === "project"
        ? isWarning ? t("costCardsUi.incident.projectWarning") : t("costCardsUi.incident.projectStop")
        : isWarning ? t("costCardsUi.incident.unknownWarning", { scope: incident.scopeType }) : t("costCardsUi.incident.unknownStop", { scope: incident.scopeType });
  const [draftAmount, setDraftAmount] = useState(
    centsInputValue(isWarning
      ? Math.max(incident.amountObserved, incident.amountLimit) + 1000
      : Math.max(incident.amountObserved + 1000, incident.amountLimit)),
  );
  const parsed = parseDollarInput(draftAmount);
  const stateLabel = incidentStateLabel(incident, t);

  return (
    <Card className={isWarning ? "overflow-hidden border-amber-500/30 bg-amber-500/5" : "overflow-hidden border-red-500/20 bg-(image:--gradient-extract-4)"}>
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={isWarning
                ? "text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-amber-700 dark:text-amber-200"
                : "text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-red-700/90 dark:text-red-200/80"}>
                {scopeCaption}
              </div>
              <Badge variant={incident.status === "resolved" ? "outline" : "secondary"}>
                {stateLabel}
              </Badge>
            </div>
            <CardTitle className={isWarning ? "mt-1 text-base" : "mt-1 text-base text-red-950 dark:text-red-50"}>{incident.scopeName}</CardTitle>
            <CardDescription className={isWarning ? "mt-1" : "mt-1 text-red-900/75 dark:text-red-100/70"}>
              {incident.thresholdType === "hard" && incident.amountObserved < incident.amountLimit
                ? t("costCardsUi.incident.incomplete", { amount: formatCents(incident.amountObserved) })
                : t("costCardsUi.incident.reached", { amount: formatCents(incident.amountObserved), limit: formatCents(incident.amountLimit) })}
            </CardDescription>
          </div>
          {isWarning ? (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : (
            <div className="rounded-full border border-red-400/30 bg-red-500/10 p-2 text-red-600 dark:text-red-200">
              <AlertOctagon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        {isWarning ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950/90 dark:text-amber-50/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {t("costCardsUi.incident.warningHint")}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-950/90 dark:text-red-50/90">
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {incident.scopeType === "project"
                ? t("costCardsUi.incident.projectPaused")
                : t("costCardsUi.incident.paused")}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <label className="text-(length:--text-micro) uppercase tracking-(--tracking-caps) text-muted-foreground">
            {t("costCardsUi.incident.newBudget")}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Input
              value={draftAmount}
              onChange={(event) => setDraftAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
            <Button
              className="gap-2"
              disabled={isMutating || parsed === null || parsed <= incident.amountObserved}
              onClick={() => {
                if (typeof parsed === "number") onRaiseAndResume(parsed);
              }}
            >
              <ArrowUpRight className="h-4 w-4" />
              {isMutating ? t("costCardsUi.incident.applying") : isWarning ? t("costCardsUi.incident.raise") : t("costCardsUi.incident.raiseResume")}
            </Button>
          </div>
          {parsed !== null && parsed <= incident.amountObserved ? (
            <p className="mt-2 text-xs text-red-700 dark:text-red-200/80">
              {t("costCardsUi.incident.mustExceed")}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" className="text-muted-foreground" disabled={isMutating} onClick={onKeepPaused}>
            {isWarning ? t("costCardsUi.incident.dismissWarning") : t("costCardsUi.incident.keepPaused")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
