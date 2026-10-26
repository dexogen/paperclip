import { t } from "@/i18n";
import { statusLabel } from "@/i18n/ui-labels";

/** UI labels only: stored enum values and unknown provider values stay unchanged. */
export function pageValueLabel(value: string): string {
  switch (value) {
    case "owner": return t("fullPages.display_owner");
    case "admin": return t("fullPages.display_admin");
    case "operator": return t("fullPages.display_operator");
    case "viewer": return t("fullPages.display_viewer");
    case "member": return t("fullPages.display_member");
    case "human": return t("fullPages.display_human");
    case "agent": return t("fullPages.display_agent");
    case "both": return t("fullPages.display_both");
    case "create": return t("fullPages.display_create");
    case "update": return t("fullPages.display_update");
    case "skip": return t("fullPages.display_skip");
    case "overwrite": return t("fullPages.display_overwrite");
    case "replace": return t("fullPages.display_replace");
    case "none": return t("fullPages.display_none");
    case "imported": return t("fullPages.display_imported");
    case "reused": return t("fullPages.display_reused");
    case "created": return t("fullPages.display_created");
    case "skipped": return t("fullPages.display_skipped");
    case "skill": return t("fullPages.display_skill");
    case "project": return t("fullPages.display_project");
    case "routine": return t("fullPages.display_routine");
    case "company": return t("fullPages.display_company");
    case "secret": return t("fullPages.display_secret");
    case "plain": return t("fullPages.display_plain");
    case "bundled": return t("fullPages.display_bundled");
    case "optional": return t("fullPages.display_optional");
    case "starting": return t("fullPages.display_starting");
    case "stopped": return t("fullPages.display_stopped");
    case "crashed": return t("fullPages.display_crashed");
    case "healthy": return t("fullPages.display_healthy");
    case "degraded": return t("fullPages.display_degraded");
    case "unhealthy": return t("fullPages.display_unhealthy");
    case "not_ready": return t("fullPages.display_not_ready");
    default: return statusLabel(value);
  }
}

export function joinInviteLabel(joinType: string, role: string | null | undefined): string {
  return role
    ? t("fullPages.joinInviteWithRole", { type: pageValueLabel(joinType), role: pageValueLabel(role) })
    : t("fullPages.joinInviteWithoutRole", { type: pageValueLabel(joinType) });
}
