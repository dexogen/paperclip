import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { ReactNode } from "react";
import { ResponsibleUserDenialNotice } from "@/components/ResponsibleUserDenialNotice";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * UX lab for PAP-12462 (P7): run "on behalf of {user}" surfacing + responsible-user
 * denial copy. Renders before/after of both surfaces with real design tokens so the
 * states can be captured for UX review. Route: /ux-lab/responsible-user-denial
 */

function LabSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  useFullSharedTranslation();
  return (
    <section className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function BeforeAfter({ label, children }: { label: string; children: ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="space-y-2">
      <div className="text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">
        {label}
      </div>
      <Card className="block border-border/60 p-3">{children}</Card>
    </div>
  );
}

/** A faithful copy of a run ledger row header (see IssueRunLedger.tsx). */
function RunLedgerRow({
  onBehalfOf,
  denial,
}: {
  onBehalfOf?: string | null;
  denial?: ReactNode;
}) {
  useFullSharedTranslation();
  return (
    <article className="space-y-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{t("fullDiagnostics.run")}</span>
        <span className="min-w-0 max-w-full truncate font-mono text-foreground">a1b2c3d4</span>
        <span>{t("fullDiagnostics.byCodexcoder")}</span>
        {onBehalfOf ? (
          <span className="min-w-0 max-w-full truncate text-muted-foreground">{t("fullDiagnostics.onBehalfOf")}{" "}<span className="text-foreground">{onBehalfOf}</span>
          </span>
        ) : null}
        <span className="rounded-md border border-border px-1.5 py-0.5 text-(length:--text-micro) capitalize text-muted-foreground">
          {denial ? fullSharedT("fullShared.failed_031a8f") : fullSharedT("taskDisplay.external.category.succeeded")}
        </span>
        <span className="ml-auto shrink-0">{t("fullDiagnostics.2mAgo")}</span>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="min-w-0">
          <span className="text-foreground">{t("runUi.ledger.elapsed")}</span>{" "}{t("fullDiagnostics.1m4s")}</div>
        <div className="min-w-0">
          <span className="text-foreground">{t("runUi.ledger.lastAction")}</span>{" "}{t("fullDiagnostics.2mAgo")}</div>
        <div className="min-w-0">
          <span className="text-foreground">{fullSharedT("fullShared.stop_cae7d5")}</span> {denial ? fullSharedT("runUi.transcriptView.denied") : fullSharedT("fullShared.completed_22a970")}
        </div>
      </div>
      {denial}
    </article>
  );
}

/** A faithful copy of the run-detail header identity block (see AgentDetail.tsx RunDetail). */
function RunDetailHeader({ onBehalfOf, denial }: { onBehalfOf?: string | null; denial?: ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-foreground">{t("fullDiagnostics.runA1b2c3d4")}</span>
        <span className="rounded-md border border-border px-1.5 py-0.5 text-(length:--text-micro) capitalize text-muted-foreground">
          {denial ? fullSharedT("fullShared.failed_5d28a9") : fullSharedT("fullShared.succeeded_5dceae")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-(length:--text-micro) text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 text-(length:--text-nano) font-medium uppercase tracking-wide">
          codex local
        </span>
        <span>anthropic/claude-opus-4-8</span>
      </div>
      {onBehalfOf ? (
        <div className="text-xs text-muted-foreground">{t("agentDetailUi.run.onBehalf")}{" "}<span className="text-foreground">{onBehalfOf}</span>
        </div>
      ) : null}
      {denial}
    </div>
  );
}

export function ResponsibleUserDenialUxLab() {
  useFullSharedTranslation();
  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <div className="text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">
            PAP-12462 · P7
          </div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">{t("fullDiagnostics.runOnBehalfOfSurfacingDenialCopy")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("fullDiagnostics.beforeAfterOfTheTwoRunSurfaces")}</p>
        </header>

        <LabSection
          title={t("fullDiagnostics.1RunIdentityOnBehalfOfUser")}
          description={t("fullDiagnostics.aRunActingForAHumanNow")}
        >
          <BeforeAfter label={t("fullDiagnostics.beforeRunLedger")}>
            <RunLedgerRow />
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.afterRunLedger")}>
            <RunLedgerRow onBehalfOf="Ada Lovelace" />
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.beforeRunDetail")}>
            <RunDetailHeader />
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.afterRunDetail")}>
            <RunDetailHeader onBehalfOf="Ada Lovelace" />
          </BeforeAfter>
        </LabSection>

        <LabSection
          title={t("fullDiagnostics.2DenialStateResponsibleUserNotAuthorized")}
          description={t("fullDiagnostics.theAgentIsAllowedButTheUser")}
        >
          <BeforeAfter label={t("fullDiagnostics.beforeGenericFailureText")}>
            <div className="text-xs">
              <span className="text-red-600 dark:text-red-400">
                Forbidden: action not permitted
              </span>
              <span className="ml-1 text-muted-foreground">(RESPONSIBLE_USER_UNAUTHORIZED)</span>
            </div>
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.afterActionableDenialCopy")}>
            <ResponsibleUserDenialNotice
              code="RESPONSIBLE_USER_UNAUTHORIZED"
              userName="Ada Lovelace"
            />
          </BeforeAfter>
        </LabSection>

        <LabSection
          title={t("fullDiagnostics.3DenialStateAgentLacksPermissionUnchanged")}
          description={t("fullDiagnostics.aDenialThatIsNotAResponsible")}
        >
          <BeforeAfter label={t("fullDiagnostics.agentLacksPermissionFailure")}>
            <div className="text-xs">
              <span className="text-red-600 dark:text-red-400">
                Forbidden: agent is not permitted to perform this action
              </span>
              <span className="ml-1 text-muted-foreground">(deny_missing_membership)</span>
            </div>
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.noResponsibleUserNoticeRendered")}>
            <div className="text-xs text-muted-foreground">{t("fullDiagnostics.responsibleUserDenialNoticeIntentionallyAbsentFor")}</div>
          </BeforeAfter>
        </LabSection>

        <LabSection
          title={t("fullDiagnostics.4DenialStateResponsibleUserUnavailable")}
          description={t("fullDiagnostics.theUserThisRunActsForWas")}
        >
          <BeforeAfter label={t("fullDiagnostics.beforeGenericFailureText")}>
            <div className="text-xs">
              <span className="text-red-600 dark:text-red-400">
                Forbidden: responsible user unavailable
              </span>
              <span className="ml-1 text-muted-foreground">(RESPONSIBLE_USER_UNAVAILABLE)</span>
            </div>
          </BeforeAfter>
          <BeforeAfter label={t("fullDiagnostics.afterActionableDenialCopy")}>
            <ResponsibleUserDenialNotice
              code="RESPONSIBLE_USER_UNAVAILABLE"
              userName="Grace Hopper"
            />
          </BeforeAfter>
        </LabSection>

        <LabSection
          title={t("fullDiagnostics.inContextDenialInsideAFailedRun")}
          description={t("fullDiagnostics.howTheNoticeReadsWithinARun")}
        >
          <BeforeAfter label={t("fullDiagnostics.unauthorized")}>
            <RunLedgerRow
              onBehalfOf="Ada Lovelace"
              denial={
                <ResponsibleUserDenialNotice
                  code="RESPONSIBLE_USER_UNAUTHORIZED"
                  userName="Ada Lovelace"
                />
              }
            />
          </BeforeAfter>
          <BeforeAfter label={fullSharedT("taskProperties.locked.unavailable")}>
            <RunLedgerRow
              onBehalfOf="Grace Hopper"
              denial={
                <ResponsibleUserDenialNotice
                  code="RESPONSIBLE_USER_UNAVAILABLE"
                  userName="Grace Hopper"
                />
              }
            />
          </BeforeAfter>
        </LabSection>

        <p className={cn("text-center text-(length:--text-micro) text-muted-foreground")}>{t("fullDiagnostics.copyIsSourcedFromTheShared")}{" "}<code>describeResponsibleUserDenial</code>{" "}{t("fullDiagnostics.contract")}</p>
      </div>
    </div>
  );
}
