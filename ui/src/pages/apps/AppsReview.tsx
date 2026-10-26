import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect } from "react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { ReviewQueueCard } from "./ReviewQueueCard";

/**
 * Review — the "decisions waiting on you" inbox (PAP-12371, Finding B).
 *
 * Ask-first approvals used to live only inside the "Needs attention" page,
 * folded together with health/error triage. That buried the one thing a user
 * must act on for their agents to proceed. This is the explicit, top-level
 * home for those approvals, aligned with the Inbox "waiting for your OK"
 * language from the approved PAP-11178 gateway UX. Health issues stay on
 * "Needs attention"; decisions live here.
 */
export function AppsReview() {
  useFullAppsTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: fullAppsT("sidebar.connectors"), href: "/apps" },
      { label: fullAppsT("fullApps.review_aff076") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, fullAppsI18n.resolvedLanguage]);

  if (!selectedCompanyId) {
    return <div className="p-6 text-sm text-muted-foreground">{fullAppsT("fullApps.select_an_organization_to_review_approvals_85763b")}</div>;
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{fullAppsT("fullApps.review_aff076")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.actions_your_agents_want_to_run_that_need_your_ok_fi_033730")}</p>
      </header>

      <ReviewQueueCard emptyState="reassure" heading={fullAppsT("fullApps.waiting_for_your_ok_2c9582")} />
    </div>
  );
}
