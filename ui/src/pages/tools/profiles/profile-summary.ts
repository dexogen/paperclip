import { t as fullAppsT } from "@/i18n";
import type { ToolProfileStatus, ToolProfileSummary, ToolProfileWithDetails } from "@paperclipai/shared";

/**
 * Prosumer copy for the access-profile index (PAP-10997, AP1). Reads the
 * server-computed `summary` and renders the friendly "Allows" / "Assigned to"
 * lines the table shows. Vocabulary gate: nothing here says
 * binding/entry/selector/priority — only "tools", "apps", "agents".
 */

/** "9 tools · 3 apps" / "All tools" / "All except 2 tools". */
export function allowsLabel(summary: ToolProfileSummary): string {
  if (summary.accessMode === "all_except") {
    return summary.excludedToolCount === 0
      ? fullAppsT("fullApps.all_tools_81c151")
      : fullAppsT("fullApps.allExceptTools", { count: summary.excludedToolCount });
  }
  const parts = [fullAppsT("fullApps.profileTools", { count: summary.allowedToolCount })];
  if (summary.allowedApplicationCount > 0) {
    parts.push(fullAppsT("fullApps.profileApps", { count: summary.allowedApplicationCount }));
  }
  return parts.join(" · ");
}

export interface AssignedLabel {
  text: string;
  /** A profile with no assignment has no effect — the index shows a quiet hint. */
  unassigned: boolean;
}

/** "Organization default" / "2 agents" / "Not assigned yet". */
export function assignedLabel(summary: ToolProfileSummary): AssignedLabel {
  if (summary.isCompanyDefault) return { text: fullAppsT("agentToolsUi.access.organizationDefault"), unassigned: false };
  if (summary.appliesToAgentCount > 0) {
    return { text: fullAppsT("fullApps.profileAgents", { count: summary.appliesToAgentCount }), unassigned: false };
  }
  if (summary.assignmentCount > 0) {
    return { text: fullAppsT("fullApps.profileAssignments", { count: summary.assignmentCount }), unassigned: false };
  }
  return { text: fullAppsT("fullApps.not_assigned_yet_b988b4"), unassigned: true };
}

export const STATUS_LABEL: Record<ToolProfileStatus, string> = {
  get draft() { return fullAppsT("fullApps.profileStatus_draft"); },
  get active() { return fullAppsT("fullApps.profileStatus_active"); },
  get disabled() { return fullAppsT("fullApps.profileStatus_disabled"); },
  get archived() { return fullAppsT("fullApps.profileStatus_archived"); },
};

export function isDraft(profile: Pick<ToolProfileWithDetails, "status">): boolean {
  return profile.status === "draft";
}
