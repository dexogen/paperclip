import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect } from "react";
import { useParams } from "@/lib/router";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { advancedTabHref } from "../tool-tabs";
import { ToolsAdminGate } from "./ToolsAdminGate";
import { ProfileDetail } from "./ProfileDetail";

export function ProfileDetailRoute() {
  useFullAppsTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const params = useParams<{ profileId?: string }>();

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? fullAppsT("companySettings.company"), href: "/dashboard" },
      { label: fullAppsT("agentDetailUi.nav.apps"), href: "/apps" },
      { label: fullAppsT("agentToolsUi.access.profiles"), href: advancedTabHref("profiles") },
      { label: fullAppsT("fullApps.profile_detail_584ea5") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, selectedCompany?.name, fullAppsI18n.resolvedLanguage]);

  if (!selectedCompanyId || !params.profileId) {
    return <div className="p-6 text-sm text-muted-foreground">{fullAppsT("fullApps.select_an_organization_and_profile_aac2b9")}</div>;
  }

  return (
    <ToolsAdminGate>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
        <ProfileDetail companyId={selectedCompanyId} profileId={params.profileId} />
      </div>
    </ToolsAdminGate>
  );
}
