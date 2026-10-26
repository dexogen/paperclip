import { i18n, t } from "./index";

export function statusLabel(value: string, casing: "raw" | "sentence" | "title" = "raw"): string {
  const label = localizedStatus(value);
  if (casing === "raw") return label;
  if (casing === "title" && i18n.resolvedLanguage === "en") {
    return label.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function localizedStatus(value: string): string {
  switch (value) {
    case "active": return t("statuses.active");
    case "running": return t("statuses.running");
    case "scheduled_retry": return t("statuses.scheduled_retry");
    case "paused": return t("statuses.paused");
    case "idle": return t("statuses.idle");
    case "archived": return t("statuses.archived");
    case "planned": return t("statuses.planned");
    case "achieved": return t("statuses.achieved");
    case "completed": return t("statuses.completed");
    case "failed": return t("statuses.failed");
    case "timed_out": return t("statuses.timed_out");
    case "succeeded": return t("statuses.succeeded");
    case "ok": return t("statuses.ok");
    case "warning": return t("statuses.warning");
    case "error": return t("statuses.error");
    case "info": return t("statuses.info");
    case "terminated": return t("statuses.terminated");
    case "pending": return t("statuses.pending");
    case "queued": return t("statuses.queued");
    case "pending_approval": return t("statuses.pending_approval");
    case "revision_requested": return t("statuses.revision_requested");
    case "approved": return t("statuses.approved");
    case "rejected": return t("statuses.rejected");
    case "draft": return t("statuses.draft");
    case "backlog": return t("statuses.backlog");
    case "todo": return t("statuses.todo");
    case "in_progress": return t("statuses.in_progress");
    case "in_review": return t("statuses.in_review");
    case "blocked": return t("statuses.blocked");
    case "done": return t("statuses.done");
    case "cancelled": return t("statuses.cancelled");
    case "allowed": return t("statuses.allowed");
    case "denied": return t("statuses.denied");
    case "block": return t("statuses.block");
    case "require-approval": return t("statuses.require_approval");
    case "redacted": return t("statuses.redacted");
    case "rate-limit": return t("statuses.rate_limit");
    case "deferred": return t("statuses.deferred");
    case "hidden": return t("statuses.hidden");
    case "critical": return t("statuses.critical");
    case "high": return t("statuses.high");
    case "medium": return t("statuses.medium");
    case "low": return t("statuses.low");
    default: return value.replace(/[_-]/g, " ");
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case "ceo": return t("searchUi.palette.roles.ceo");
    case "cto": return t("searchUi.palette.roles.cto");
    case "cmo": return t("searchUi.palette.roles.cmo");
    case "cfo": return t("searchUi.palette.roles.cfo");
    case "security": return t("searchUi.palette.roles.security");
    case "engineer": return t("searchUi.palette.roles.engineer");
    case "designer": return t("searchUi.palette.roles.designer");
    case "pm": return t("searchUi.palette.roles.pm");
    case "qa": return t("searchUi.palette.roles.qa");
    case "devops": return t("searchUi.palette.roles.devops");
    case "researcher": return t("searchUi.palette.roles.researcher");
    case "general": return t("searchUi.palette.roles.general");
    default: return role;
  }
}
