import type { ExecutionWorkspaceCloseAction } from "@paperclipai/shared";
import type { TFunction } from "i18next";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function messageLabel(value: unknown, t: TFunction): string | null {
  const message = record(value);
  if (!message) return null;
  const params = record(message.params) ?? {};
  switch (message.code) {
    case "no_local_path": return t("projectWorkspacesUi.closeMessages.noLocalPath");
    case "git_unverified": return t("projectWorkspacesUi.closeMessages.gitUnverified");
    case "shared_session": return t("projectWorkspacesUi.closeMessages.sharedSession");
    case "storage_unavailable": return t("projectWorkspacesUi.closeMessages.storageUnavailable");
    case "missing_path": return typeof params.path === "string"
      ? t("projectWorkspacesUi.closeMessages.missingPath", { path: params.path }) : null;
    case "keep_project_directory": return typeof params.path === "string"
      ? t("projectWorkspacesUi.closeMessages.keepProjectDirectory", { path: params.path }) : null;
    case "git_inspection_failed": return typeof params.path === "string" && typeof params.error === "string"
      ? t("projectWorkspacesUi.closeMessages.gitInspectionFailed", { path: params.path, error: params.error }) : null;
    case "git_status_failed": return typeof params.path === "string" && typeof params.error === "string"
      ? t("projectWorkspacesUi.closeMessages.gitStatusFailed", { path: params.path, error: params.error }) : null;
    case "git_comparison_failed": return typeof params.baseRef === "string" && typeof params.error === "string"
      ? t("projectWorkspacesUi.closeMessages.gitComparisonFailed", { baseRef: params.baseRef, error: params.error }) : null;
    case "open_issues": return count(params.count)
      ? params.count === 1 ? t("projectWorkspacesUi.closeMessages.openIssueSingle")
        : t("projectWorkspacesUi.closeMessages.openIssues", { count: params.count }) : null;
    case "shared_open_issues": return count(params.count)
      ? params.count === 1 ? t("projectWorkspacesUi.closeMessages.sharedOpenIssueSingle")
        : t("projectWorkspacesUi.closeMessages.sharedOpenIssues", { count: params.count }) : null;
    case "stop_services": return count(params.count)
      ? t("projectWorkspacesUi.closeMessages.stopServices", { count: params.count }) : null;
    case "dirty_files": return count(params.count)
      ? t("projectWorkspacesUi.closeMessages.dirtyFiles", { count: params.count }) : null;
    case "untracked_files": return count(params.count)
      ? t("projectWorkspacesUi.closeMessages.untrackedFiles", { count: params.count }) : null;
    case "ahead": return count(params.count) && (params.baseRef === null || typeof params.baseRef === "string")
      ? t("projectWorkspacesUi.closeMessages.ahead", { count: params.count, baseRef: params.baseRef ?? t("projectWorkspacesUi.closeMessages.aheadBaseRef") }) : null;
    case "behind": return count(params.count) && (params.baseRef === null || typeof params.baseRef === "string")
      ? t("projectWorkspacesUi.closeMessages.behind", { count: params.count, baseRef: params.baseRef ?? t("projectWorkspacesUi.closeMessages.behindBaseRef") }) : null;
    default: return null;
  }
}

export function workspaceCloseMessages(raw: readonly string[], descriptors: unknown, t: TFunction): string[] {
  if (!Array.isArray(descriptors)) return [...raw];
  return raw.map((fallback, index) => {
    const matches = descriptors.filter((item) => record(item)?.index === index);
    if (matches.length !== 1) return fallback;
    return messageLabel(record(matches[0])?.message, t) ?? fallback;
  });
}

export function workspaceCloseActionLabel(action: ExecutionWorkspaceCloseAction, t: TFunction): { label: string; description: string } {
  const fallback = { label: action.label, description: action.description };
  const display = record(action.display);
  if (!display) return fallback;
  const params = record(display.params) ?? {};
  const expectedKind = display.code === "workspace_cleanup" || display.code === "project_cleanup" ? "cleanup_command" : display.code;
  if (action.kind !== expectedKind) return fallback;
  switch (display.code) {
    case "archive_record": return { label: t("projectWorkspacesUi.closeMessages.actions.archive.label"), description: t("projectWorkspacesUi.closeMessages.actions.archive.description") };
    case "workspace_cleanup": return { label: t("projectWorkspacesUi.closeMessages.actions.workspaceCleanup.label"), description: t("projectWorkspacesUi.closeMessages.actions.workspaceCleanup.description") };
    case "project_cleanup": return { label: t("projectWorkspacesUi.closeMessages.actions.projectCleanup.label"), description: t("projectWorkspacesUi.closeMessages.actions.projectCleanup.description") };
    case "teardown_command": return { label: t("projectWorkspacesUi.closeMessages.actions.teardown.label"), description: t("projectWorkspacesUi.closeMessages.actions.teardown.description") };
    case "remove_provider_workspace": return { label: t("projectWorkspacesUi.closeMessages.actions.provider.label"), description: t("projectWorkspacesUi.closeMessages.actions.provider.description") };
    case "git_branch_delete": return { label: t("projectWorkspacesUi.closeMessages.actions.branch.label"), description: t("projectWorkspacesUi.closeMessages.actions.branch.description") };
    case "git_worktree_remove": return typeof params.path === "string"
      ? { label: t("projectWorkspacesUi.closeMessages.actions.worktree.label"), description: t("projectWorkspacesUi.closeMessages.actions.worktree.description", { path: params.path }) } : fallback;
    case "remove_local_directory": return typeof params.path === "string"
      ? { label: t("projectWorkspacesUi.closeMessages.actions.directory.label"), description: t("projectWorkspacesUi.closeMessages.actions.directory.description", { path: params.path }) } : fallback;
    case "stop_runtime_services": {
      if (!count(params.count) || (params.serviceName !== null && typeof params.serviceName !== "string")) return fallback;
      return {
        label: t("projectWorkspacesUi.closeMessages.actions.stopLabel", { count: params.count }),
        description: params.count === 1
          ? params.serviceName === null ? t("projectWorkspacesUi.closeMessages.actions.stopUnnamed") : t("projectWorkspacesUi.closeMessages.actions.stopNamed", { name: params.serviceName })
          : t("projectWorkspacesUi.closeMessages.actions.stopDescription", { count: params.count }),
      };
    }
    default: return fallback;
  }
}
