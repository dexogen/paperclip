import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/lib/router";
import { accessApi } from "@/api/access";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";

/**
 * Best-effort admin gate for the access-profiles surface, mirroring
 * `AdvancedToolsRoute` (PAP-10862, plan D8). Local boards, instance admins,
 * and active company owners/admins/operators pass; the server stays
 * authoritative. Shared so the profiles index and create wizard guard identically.
 */
export function ToolsAdminGate({ children }: { children: ReactNode }) {
  useFullAppsTranslation();
  const { selectedCompanyId } = useCompany();
  const boardAccess = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: () => accessApi.getCurrentBoardAccess(),
    retry: false,
  });

  if (boardAccess.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{fullAppsT("taskPanels.loading")}</div>;
  }

  const data = boardAccess.data;
  const membership = data?.memberships?.find((m) => m.companyId === selectedCompanyId && m.status === "active");
  const canManageTools =
    data?.source === "local_implicit" ||
    Boolean(data?.isInstanceAdmin) ||
    membership?.membershipRole === "owner" ||
    membership?.membershipRole === "admin" ||
    membership?.membershipRole === "operator" ||
    membership?.membershipRole === "member";

  if (!canManageTools) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{fullAppsT("fullApps.access_profiles_require_editing_access_0057f2")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.access_profiles_decide_which_tools_your_agents_can_u_ed7340")}{" "}
            <Link to="/apps" className="font-medium text-primary hover:underline">{fullAppsT("fullApps.your_apps_d37a3c")}</Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
