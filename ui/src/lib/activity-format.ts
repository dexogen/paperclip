import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import type { Agent } from "@paperclipai/shared";
import type { CompanyUserProfile } from "./company-members";
import { formatReviewPolicyValue } from "./review-policy";

type ActivityDetails = Record<string, unknown> | null | undefined;

type ActivityParticipant = {
  type: "agent" | "user";
  agentId?: string | null;
  userId?: string | null;
};

type ActivityIssueReference = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
};

interface ActivityFormatOptions {
  agentMap?: Map<string, Agent>;
  userProfileMap?: Map<string, CompanyUserProfile>;
  currentUserId?: string | null;
}

function activityRowVerb(action: string, t: TFunction): string {
  switch (action) {
    case "case.created": return t("activityUi.verbs.case.created");
    case "case.updated": return t("activityUi.verbs.case.updated");
    case "case.fields_changed": return t("activityUi.verbs.case.fields_changed");
    case "case.status_changed": return t("activityUi.verbs.case.status_changed");
    case "case.issue_linked": return t("activityUi.verbs.case.issue_linked");
    case "case.issue_unlinked": return t("activityUi.verbs.case.issue_unlinked");
    case "case.child_linked": return t("activityUi.verbs.case.child_linked");
    case "case.attachment_added": return t("activityUi.verbs.case.attachment_added");
    case "case.label_added": return t("activityUi.verbs.case.label_added");
    case "case.label_removed": return t("activityUi.verbs.case.label_removed");
    case "case.document_revised": return t("activityUi.verbs.case.document_revised");
    case "case.handoff_requested": return t("activityUi.verbs.case.handoff_requested");
    case "case.handoff_applied": return t("activityUi.verbs.case.handoff_applied");
    case "case.handoff_delivered": return t("activityUi.verbs.case.handoff_delivered");
    case "case.handoff_retry_requested": return t("activityUi.verbs.case.handoff_retry_requested");
    case "case.handoff_cancelled": return t("activityUi.verbs.case.handoff_cancelled");
    case "case.handoff_completed": return t("activityUi.verbs.case.handoff_completed");
    case "issue.created": return t("activityUi.verbs.issue.created");
    case "issue.updated": return t("activityUi.verbs.issue.updated");
    case "issue.read_marked": return t("activityUi.verbs.issue.read_marked");
    case "issue.read_unmarked": return t("activityUi.verbs.issue.read_unmarked");
    case "issue.checked_out": return t("activityUi.verbs.issue.checked_out");
    case "issue.released": return t("activityUi.verbs.issue.released");
    case "issue.comment_added": return t("activityUi.verbs.issue.comment_added");
    case "issue.comment_cancelled": return t("activityUi.verbs.issue.comment_cancelled");
    case "issue.queued_comment_edited": return t("activityUi.verbs.issue.queued_comment_edited");
    case "issue.queued_comments_reordered": return t("activityUi.verbs.issue.queued_comments_reordered");
    case "issue.queued_comment_discarded": return t("activityUi.verbs.issue.queued_comment_discarded");
    case "issue.comment_deleted": return t("activityUi.verbs.issue.comment_deleted");
    case "issue.attachment_added": return t("activityUi.verbs.issue.attachment_added");
    case "issue.attachment_removed": return t("activityUi.verbs.issue.attachment_removed");
    case "issue.document_created": return t("activityUi.verbs.issue.document_created");
    case "issue.document_updated": return t("activityUi.verbs.issue.document_updated");
    case "issue.document_locked": return t("activityUi.verbs.issue.document_locked");
    case "issue.document_unlocked": return t("activityUi.verbs.issue.document_unlocked");
    case "issue.document_deleted": return t("activityUi.verbs.issue.document_deleted");
    case "issue.monitor_scheduled": return t("activityUi.verbs.issue.monitor_scheduled");
    case "issue.monitor_triggered": return t("activityUi.verbs.issue.monitor_triggered");
    case "issue.monitor_cleared": return t("activityUi.verbs.issue.monitor_cleared");
    case "issue.monitor_skipped": return t("activityUi.verbs.issue.monitor_skipped");
    case "issue.monitor_exhausted": return t("activityUi.verbs.issue.monitor_exhausted");
    case "issue.monitor_recovery_wake_queued": return t("activityUi.verbs.issue.monitor_recovery_wake_queued");
    case "issue.monitor_recovery_issue_created": return t("activityUi.verbs.issue.monitor_recovery_issue_created");
    case "issue.monitor_escalated_to_board": return t("activityUi.verbs.issue.monitor_escalated_to_board");
    case "issue.commented": return t("activityUi.verbs.issue.commented");
    case "issue.deleted": return t("activityUi.verbs.issue.deleted");
    case "issue.successful_run_handoff_required": return t("activityUi.verbs.issue.successful_run_handoff_required");
    case "issue.successful_run_handoff_resolved": return t("activityUi.verbs.issue.successful_run_handoff_resolved");
    case "issue.successful_run_handoff_escalated": return t("activityUi.verbs.issue.successful_run_handoff_escalated");
    case "issue.accepted_plan_decomposition_updated": return t("activityUi.verbs.issue.accepted_plan_decomposition_updated");
    case "issue.recovery_action_opened": return t("activityUi.verbs.issue.recovery_action_opened");
    case "issue.workspace_recovered": return t("activityUi.verbs.issue.workspace_recovered");
    case "issue.workspace_recovery_requested": return t("activityUi.verbs.issue.workspace_recovery_requested");
    case "issue.recovery_action_resolved": return t("activityUi.verbs.issue.recovery_action_resolved");
    case "issue.recovery_action_escalated": return t("activityUi.verbs.issue.recovery_action_escalated");
    case "agent.created": return t("activityUi.verbs.agent.created");
    case "agent.updated": return t("activityUi.verbs.agent.updated");
    case "agent.paused": return t("activityUi.verbs.agent.paused");
    case "agent.resumed": return t("activityUi.verbs.agent.resumed");
    case "agent.error_cleared": return t("activityUi.verbs.agent.error_cleared");
    case "agent.terminated": return t("activityUi.verbs.agent.terminated");
    case "agent.key_created": return t("activityUi.verbs.agent.key_created");
    case "agent.budget_updated": return t("activityUi.verbs.agent.budget_updated");
    case "agent.runtime_session_reset": return t("activityUi.verbs.agent.runtime_session_reset");
    case "heartbeat.invoked": return t("activityUi.verbs.heartbeat.invoked");
    case "heartbeat.cancelled": return t("activityUi.verbs.heartbeat.cancelled");
    case "heartbeat.output_stale_source_resolved": return t("activityUi.verbs.heartbeat.output_stale_source_resolved");
    case "heartbeat.output_stale_recovery_recursion_refused": return t("activityUi.verbs.heartbeat.output_stale_recovery_recursion_refused");
    case "approval.created": return t("activityUi.verbs.approval.created");
    case "approval.approved": return t("activityUi.verbs.approval.approved");
    case "approval.rejected": return t("activityUi.verbs.approval.rejected");
    case "issue.thread_interaction_created": return t("activityUi.verbs.issue.thread_interaction_created");
    case "issue.thread_interaction_accepted": return t("activityUi.verbs.issue.thread_interaction_accepted");
    case "issue.thread_interaction_rejected": return t("activityUi.verbs.issue.thread_interaction_rejected");
    case "issue.thread_interaction_answered": return t("activityUi.verbs.issue.thread_interaction_answered");
    case "issue.thread_interaction_withdrawn": return t("activityUi.verbs.issue.thread_interaction_withdrawn");
    case "issue.thread_interaction_cancelled": return t("activityUi.verbs.issue.thread_interaction_cancelled");
    case "issue.thread_interaction_skipped": return t("activityUi.verbs.issue.thread_interaction_skipped");
    case "issue.thread_interaction_dismissed": return t("activityUi.verbs.issue.thread_interaction_dismissed");
    case "issue.thread_interaction_expired": return t("activityUi.verbs.issue.thread_interaction_expired");
    case "issue.thread_interaction_item_verdicts_submitted": return t("activityUi.verbs.issue.thread_interaction_item_verdicts_submitted");
    case "issue.stalled_review_decided": return t("activityUi.verbs.issue.stalled_review_decided");
    case "project.created": return t("activityUi.verbs.project.created");
    case "project.updated": return t("activityUi.verbs.project.updated");
    case "project.deleted": return t("activityUi.verbs.project.deleted");
    case "goal.created": return t("activityUi.verbs.goal.created");
    case "goal.updated": return t("activityUi.verbs.goal.updated");
    case "goal.deleted": return t("activityUi.verbs.goal.deleted");
    case "cost.reported": return t("activityUi.verbs.cost.reported");
    case "cost.recorded": return t("activityUi.verbs.cost.recorded");
    case "company.created": return t("activityUi.verbs.company.created");
    case "company.updated": return t("activityUi.verbs.company.updated");
    case "company.archived": return t("activityUi.verbs.company.archived");
    case "company.reactivated": return t("activityUi.verbs.company.reactivated");
    case "company.budget_updated": return t("activityUi.verbs.company.budget_updated");
    case "audit.exported": return t("activityUi.verbs.audit.exported");
    case "tool_app.connected": return t("activityUi.verbs.tool_app.connected");
    case "tool_app.oauth_connected": return t("activityUi.verbs.tool_app.oauth_connected");
    case "tool_app.oauth_failed": return t("activityUi.verbs.tool_app.oauth_failed");
    case "tool_app.oauth_access_finalized": return t("activityUi.verbs.tool_app.oauth_access_finalized");
    case "tool_app.finished": return t("activityUi.verbs.tool_app.finished");
    case "tool_app.reconnected": return t("activityUi.verbs.tool_app.reconnected");
    case "tool_connection.created": return t("activityUi.verbs.tool_connection.created");
    case "tool_connection.updated": return t("activityUi.verbs.tool_connection.updated");
    case "tool_connection.archived": return t("activityUi.verbs.tool_connection.archived");
    case "tool_connection.catalog_refresh": return t("activityUi.verbs.tool_connection.catalog_refresh");
    case "tool_connection.installs_synced": return t("activityUi.verbs.tool_connection.installs_synced");
    case "tool_connection.install_access_extended": return t("activityUi.verbs.tool_connection.install_access_extended");
    case "tool_connection.grant_audience_replaced": return t("activityUi.verbs.tool_connection.grant_audience_replaced");
    case "tool_connection.grant_added": return t("activityUi.verbs.tool_connection.grant_added");
    case "tool_connection.grant_revoked": return t("activityUi.verbs.tool_connection.grant_revoked");
    case "tool_connection.grant_delegated": return t("activityUi.verbs.tool_connection.grant_delegated");
    case "tool_connection.grant_delegation_revoked": return t("activityUi.verbs.tool_connection.grant_delegation_revoked");
    default: return action.replace(/[._]/g, " ");
  }
}

const ISSUE_ACTIVITY_LABELS: Record<string, string> = {
  "issue.created": "created the issue",
  "issue.updated": "updated the issue",
  "issue.checked_out": "checked out the issue",
  "issue.released": "released the issue",
  "issue.comment_added": "added a comment",
  "issue.comment_cancelled": "cancelled a queued comment",
  "issue.queued_comment_edited": "edited a queued comment",
  "issue.queued_comments_reordered": "reordered queued comments",
  "issue.queued_comment_discarded": "discarded a queued comment",
  "issue.comment_deleted": "deleted a comment",
  "issue.feedback_vote_saved": "saved feedback on an AI output",
  "issue.attachment_added": "added an attachment",
  "issue.attachment_removed": "removed an attachment",
  "issue.document_created": "created a document",
  "issue.document_updated": "updated a document",
  "issue.document_locked": "locked a document",
  "issue.document_unlocked": "unlocked a document",
  "issue.document_deleted": "deleted a document",
  "issue.monitor_scheduled": "scheduled a monitor",
  "issue.monitor_triggered": "triggered a monitor",
  "issue.monitor_cleared": "cleared a monitor",
  "issue.monitor_skipped": "skipped a monitor",
  "issue.monitor_exhausted": "exhausted a monitor",
  "issue.monitor_recovery_wake_queued": "queued a monitor recovery wake",
  "issue.monitor_recovery_issue_created": "created a monitor recovery issue",
  "issue.monitor_escalated_to_board": "escalated a monitor to the board",
  "issue.deleted": "deleted the issue",
  "issue.successful_run_handoff_required": "Run finished without a clear next step",
  "issue.successful_run_handoff_resolved": "Next step chosen",
  "issue.successful_run_handoff_escalated": "Run finished without a next step - recovery escalated",
  "issue.cross_issue_influence_cap_rejected": "hit the per-run cross-task write cap",
  "issue.cross_issue_influence_observed": "made a cross-task write",
  "issue.attribution_spoof_rejected": "tried to choose its own responsible user",
  "issue.recovery_action_opened": "Opened a source-scoped recovery action",
  "issue.workspace_recovered": "Saved work recovered.",
  "issue.workspace_recovery_requested": "Requested workspace recovery",
  "issue.recovery_action_resolved": "Resolved the recovery action",
  "issue.recovery_action_escalated": "Escalated the recovery action",
  "issue.accepted_plan_decomposition_updated": "updated the accepted-plan decomposition",
  "agent.created": "created an agent",
  "agent.updated": "updated the agent",
  "agent.paused": "paused the agent",
  "agent.resumed": "resumed the agent",
  "agent.error_cleared": "cleared the agent error",
  "agent.terminated": "terminated the agent",
  "heartbeat.invoked": "invoked a heartbeat",
  "heartbeat.cancelled": "cancelled a heartbeat",
  "heartbeat.output_stale_source_resolved": "System folded a stale run",
  "heartbeat.output_stale_recovery_recursion_refused": "Refused recovery-on-recovery escalation",
  "approval.created": "requested approval",
  "approval.approved": "approved",
  "approval.rejected": "rejected",
  "issue.thread_interaction_created": "asked for a decision",
  "issue.thread_interaction_accepted": "accepted the request",
  "issue.thread_interaction_rejected": "rejected the request",
  "issue.thread_interaction_answered": "answered the request",
  "issue.thread_interaction_withdrawn": "withdrew the request",
  "issue.thread_interaction_cancelled": "cancelled the request",
  "issue.thread_interaction_skipped": "skipped the request",
  "issue.thread_interaction_dismissed": "deferred the request",
  "issue.thread_interaction_expired": "expired the request",
  "issue.thread_interaction_item_verdicts_submitted": "submitted verdicts on the request",
  "issue.stalled_review_decided": "recorded a review verdict",
};

/**
 * `issue.stalled_review_decided` carries the verb the actor chose, so the line
 * names the verdict ("approved the review") rather than the generic action.
 * Mirrors `StalledReviewDecisionAction` in shared.
 */
const STALLED_REVIEW_DECISION_LABELS: Record<string, string> = {
  approve: "approved the review",
  request_changes: "requested changes on the review",
  send_back: "sent the review back to work",
};

/**
 * `issue.thread_interaction_accepted` / `_rejected` fire for *every* interaction
 * kind, not only for a review. A task suggestion or a question is accepted, not
 * approved, so the kind on the event picks the verb. Kinds absent from a map
 * keep the neutral "accepted the request" wording from the tables above, which
 * is also the fallback for an event that carries no kind.
 */
const INTERACTION_ACCEPTED_LABELS: Record<string, string> = {
  request_confirmation: "approved the request",
  request_checkbox_confirmation: "approved the request",
  suggest_tasks: "accepted the task suggestions",
  ask_user_questions: "accepted the answers",
};

const INTERACTION_REJECTED_LABELS: Record<string, string> = {
  request_confirmation: "rejected the request",
  request_checkbox_confirmation: "rejected the request",
  suggest_tasks: "declined the task suggestions",
  ask_user_questions: "declined the questions",
};

/**
 * Kind-aware wording for an interaction outcome, or `null` when the tables
 * above already say it well enough.
 */
function formatInteractionOutcomeLabel(action: string, details: ActivityDetails): string | null {
  const table = action === "issue.thread_interaction_accepted"
    ? INTERACTION_ACCEPTED_LABELS
    : action === "issue.thread_interaction_rejected"
      ? INTERACTION_REJECTED_LABELS
      : null;
  if (!table) return null;
  const kind = typeof details?.interactionKind === "string" ? details.interactionKind : null;
  return kind ? table[kind] ?? null : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function humanizeValue(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "none");
  return value.replace(/_/g, " ");
}

function isActivityParticipant(value: unknown): value is ActivityParticipant {
  const record = asRecord(value);
  if (!record) return false;
  return record.type === "agent" || record.type === "user";
}

function isActivityIssueReference(value: unknown): value is ActivityIssueReference {
  return asRecord(value) !== null;
}

function readParticipants(details: ActivityDetails, key: string): ActivityParticipant[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityParticipant);
}

function readIssueReferences(details: ActivityDetails, key: string): ActivityIssueReference[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityIssueReference);
}

function formatUserLabel(userId: string | null | undefined, options: ActivityFormatOptions = {}, t?: TFunction): string {
  if (!userId || userId === "local-board") return t ? t("activityUi.actor.board") : "Board";
  if (options.currentUserId && userId === options.currentUserId) return t ? t("activityUi.actor.you") : "You";
  const profile = options.userProfileMap?.get(userId);
  if (profile) return profile.label;
  return t ? t("activityUi.actor.user", { id: userId.slice(0, 5) }) : `user ${userId.slice(0, 5)}`;
}

function formatParticipantLabel(participant: ActivityParticipant, options: ActivityFormatOptions, t?: TFunction): string {
  if (participant.type === "agent") {
    const agentId = participant.agentId ?? "";
    return options.agentMap?.get(agentId)?.name ?? (t ? t("activityUi.actor.agent") : "agent");
  }
  return formatUserLabel(participant.userId, options, t);
}

function formatIssueReferenceLabel(reference: ActivityIssueReference, t?: TFunction): string {
  if (reference.identifier) return reference.identifier;
  if (reference.title) return reference.title;
  if (reference.id) return reference.id.slice(0, 8);
  return t ? t("activityUi.reference.task") : "task";
}

function formatChangedEntityLabel(
  singular: string,
  plural: string,
  labels: string[],
): string {
  if (labels.length <= 0) return plural;
  if (labels.length === 1) return `${singular} ${labels[0]}`;
  return `${labels.length} ${plural}`;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function readStringArrayLength(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((entry) => typeof entry === "string" && entry.length > 0).length;
}

function formatAcceptedPlanDecompositionDetail(details: ActivityDetails): string | null {
  if (!details) return null;
  const status = typeof details.status === "string" ? details.status : null;
  const requested = readNumber(details.requestedChildCount);
  const totalChildren = readStringArrayLength(details.childIssueIds);
  const newlyCreated = readStringArrayLength(details.newlyCreatedChildIssueIds);
  const reused = Math.max(0, totalChildren - newlyCreated);
  const parts: string[] = [];
  if (newlyCreated > 0) parts.push(`created ${newlyCreated} new`);
  if (reused > 0) parts.push(`reused ${reused} existing`);
  if (parts.length === 0 && requested !== null) parts.push(`${requested} requested`);
  const summary = parts.length > 0 ? parts.join(", ") : null;
  if (status === "completed" && summary) return `decomposition completed (${summary})`;
  if (status === "completed") return "decomposition completed";
  if (status === "in_flight" && summary) return `decomposition in flight (${summary})`;
  return summary;
}

function activityValue(value: unknown, t: TFunction): string {
  switch (value) {
    case "backlog": return t("statuses.backlog");
    case "todo": return t("statuses.todo");
    case "in_progress": return t("statuses.in_progress");
    case "in_review": return t("statuses.in_review");
    case "done": return t("statuses.done");
    case "blocked": return t("statuses.blocked");
    case "cancelled": return t("statuses.cancelled");
    case "idle": return t("statuses.idle");
    case "critical": return t("statuses.critical");
    case "high": return t("statuses.high");
    case "medium": return t("statuses.medium");
    case "low": return t("statuses.low");
    case null:
    case undefined: return t("activityUi.value.none");
    default: return humanizeValue(value);
  }
}

function formatIssueUpdatedVerb(details: ActivityDetails, t: TFunction): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  if (details.status !== undefined) {
    const from = previous.status;
    const to = activityValue(details.status === "in_review" && details.externalConversationState === "waiting" ? "idle" : details.status, t);
    return from
      ? t("activityUi.status.fromTo", { from: activityValue(from, t), to })
      : t("activityUi.status.to", { to });
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    return from
      ? t("activityUi.priority.fromTo", { from: activityValue(from, t), to: activityValue(details.priority, t) })
      : t("activityUi.priority.to", { to: activityValue(details.priority, t) });
  }
  return null;
}

function formatAssigneeName(details: ActivityDetails, options: ActivityFormatOptions): string | null {
  if (!details) return null;
  const agentId = details.assigneeAgentId;
  const userId = details.assigneeUserId;
  if (typeof agentId === "string" && agentId) {
    return options.agentMap?.get(agentId)?.name ?? "agent";
  }
  if (typeof userId === "string" && userId) {
    return formatUserLabel(userId, options);
  }
  return null;
}

function formatIssueUpdatedAction(details: ActivityDetails, options: ActivityFormatOptions = {}): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  const parts: string[] = [];

  if (details.status !== undefined) {
    const from = previous.status;
    const to = humanizeValue(details.status === "in_review" && details.externalConversationState === "waiting" ? "idle" : details.status);
    parts.push(
      from
        ? `changed the status from ${humanizeValue(from)} to ${to}`
        : `changed the status to ${to}`,
    );
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    parts.push(
      from
        ? `changed the priority from ${humanizeValue(from)} to ${humanizeValue(details.priority)}`
        : `changed the priority to ${humanizeValue(details.priority)}`,
    );
  }
  if (details.assigneeAgentId !== undefined || details.assigneeUserId !== undefined) {
    const assigneeName = formatAssigneeName(details, options);
    parts.push(assigneeName ? `made ${assigneeName} responsible for the task` : "cleared the responsible");
  }
  if (details.reviewPolicy !== undefined) {
    // `null` is the default ("anyone can approve"), so it must not read as
    // "changed the review policy to none" (PAP-16506).
    parts.push(`changed who can approve to ${formatReviewPolicyValue(details.reviewPolicy)}`);
  }
  if (details.title !== undefined) parts.push("updated the title");
  if (details.description !== undefined) parts.push("updated the description");

  return parts.length > 0 ? parts.join(", ") : null;
}

function formatStructuredIssueChange(input: {
  action: string;
  details: ActivityDetails;
  options: ActivityFormatOptions;
  forIssueDetail: boolean;
  t?: TFunction;
}): string | null {
  const details = input.details;
  const t = input.t ?? i18n.getFixedT("en");
  if (!details) return null;

  if (input.action === "issue.blockers_updated") {
    const added = readIssueReferences(details, "addedBlockedByIssues").map(reference => formatIssueReferenceLabel(reference, input.t));
    const removed = readIssueReferences(details, "removedBlockedByIssues").map(reference => formatIssueReferenceLabel(reference, input.t));
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel("blocker", "blockers", added);
      return input.forIssueDetail ? `added ${changed}` : added.length === 1
        ? t("activityUi.blockers.addNamed", { name: added[0] })
        : t("activityUi.blockers.addCount", { count: added.length });
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel("blocker", "blockers", removed);
      return input.forIssueDetail ? `removed ${changed}` : removed.length === 1
        ? t("activityUi.blockers.removeNamed", { name: removed[0] })
        : t("activityUi.blockers.removeCount", { count: removed.length });
    }
    return input.forIssueDetail ? "updated blockers" : t("activityUi.blockers.updated");
  }

  if (input.action === "issue.reviewers_updated" || input.action === "issue.approvers_updated") {
    const added = readParticipants(details, "addedParticipants").map((participant) => formatParticipantLabel(participant, input.options, input.t));
    const removed = readParticipants(details, "removedParticipants").map((participant) => formatParticipantLabel(participant, input.options, input.t));
    const singular = input.action === "issue.reviewers_updated" ? "reviewer" : "approver";
    const plural = input.action === "issue.reviewers_updated" ? "reviewers" : "approvers";
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, added);
      if (input.forIssueDetail) return `added ${changed}`;
      if (input.action === "issue.reviewers_updated") return added.length === 1
        ? t("activityUi.reviewers.addNamed", { name: added[0] })
        : t("activityUi.reviewers.addCount", { count: added.length });
      return added.length === 1
        ? t("activityUi.approvers.addNamed", { name: added[0] })
        : t("activityUi.approvers.addCount", { count: added.length });
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, removed);
      if (input.forIssueDetail) return `removed ${changed}`;
      if (input.action === "issue.reviewers_updated") return removed.length === 1
        ? t("activityUi.reviewers.removeNamed", { name: removed[0] })
        : t("activityUi.reviewers.removeCount", { count: removed.length });
      return removed.length === 1
        ? t("activityUi.approvers.removeNamed", { name: removed[0] })
        : t("activityUi.approvers.removeCount", { count: removed.length });
    }
    return input.forIssueDetail ? `updated ${plural}` : input.action === "issue.reviewers_updated"
      ? t("activityUi.reviewers.updated") : t("activityUi.approvers.updated");
  }

  return null;
}

export function formatActivityVerb(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
  t: TFunction = i18n.getFixedT("en"),
): string {
  if (action.startsWith("tool_gateway.")) {
    const rawTool = typeof details?.tool === "string"
      ? details.tool
      : typeof details?.upstreamToolName === "string"
        ? details.upstreamToolName
        : null;
    const tool = rawTool === null ? t("activityUi.gateway.action") : rawTool.replace(/[._-]+/g, " ");
    const isTest = details?.source === "test";
    if (action === "tool_gateway.call_completed") return isTest ? t("activityUi.gateway.tested", { tool }) : t("activityUi.gateway.used", { tool });
    if (action === "tool_gateway.call_allowed") return isTest ? t("activityUi.gateway.testStarted", { tool }) : t("activityUi.gateway.allowed", { tool });
    if (action === "tool_gateway.call_denied") return t("activityUi.gateway.denied", { tool });
    if (action === "tool_gateway.approval_requested") return t("activityUi.gateway.requested", { tool });
    if (action === "tool_gateway.session_created") return t("activityUi.gateway.sessionCreated");
    if (action === "tool_gateway.session_rejected") return t("activityUi.gateway.sessionRejected");
    if (action === "tool_gateway.discovery") return t("activityUi.gateway.discovery");
  }

  if (action === "issue.updated") {
    const issueUpdatedVerb = formatIssueUpdatedVerb(details, t);
    if (issueUpdatedVerb) return issueUpdatedVerb;
  }

  if (action === "issue.stalled_review_decided") {
    const decision = typeof details?.action === "string" ? details.action : null;
    switch (decision) {
      case "approve": return t("activityUi.review.approve");
      case "request_changes": return t("activityUi.review.requestChanges");
      case "send_back": return t("activityUi.review.sendBack");
    }
  }

  if (action === "issue.thread_interaction_accepted") {
    switch (details?.interactionKind) {
      case "request_confirmation":
      case "request_checkbox_confirmation": return t("activityUi.outcome.acceptConfirmation");
      case "suggest_tasks": return t("activityUi.outcome.acceptSuggestions");
      case "ask_user_questions": return t("activityUi.outcome.acceptAnswers");
    }
  }
  if (action === "issue.thread_interaction_rejected") {
    switch (details?.interactionKind) {
      case "request_confirmation":
      case "request_checkbox_confirmation": return t("activityUi.outcome.rejectConfirmation");
      case "suggest_tasks": return t("activityUi.outcome.rejectSuggestions");
      case "ask_user_questions": return t("activityUi.outcome.rejectQuestions");
    }
  }

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: false,
    t,
  });
  if (structuredChange) return structuredChange;

  return activityRowVerb(action, t);
}

export function formatIssueActivityAction(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
): string {
  if (action === "issue.updated") {
    const issueUpdatedAction = formatIssueUpdatedAction(details, options);
    if (issueUpdatedAction) return issueUpdatedAction;
  }

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: true,
  });
  if (structuredChange) return structuredChange;

  if (action === "issue.accepted_plan_decomposition_updated") {
    const detail = formatAcceptedPlanDecompositionDetail(details);
    if (detail) return detail;
  }

  if (action === "issue.stalled_review_decided") {
    const decision = typeof details?.action === "string" ? details.action : null;
    const label = decision ? STALLED_REVIEW_DECISION_LABELS[decision] : null;
    if (label) return label;
  }

  const outcomeLabel = formatInteractionOutcomeLabel(action, details);
  if (outcomeLabel) return outcomeLabel;

  if (action.startsWith("issue.monitor_") && details) {
    const serviceName = typeof details.serviceName === "string" && details.serviceName.trim()
      ? details.serviceName.trim()
      : null;
    const base = ISSUE_ACTIVITY_LABELS[action] ?? action.replace(/[._]/g, " ");
    return serviceName ? `${base} for ${serviceName}` : base;
  }

  if (
    (
      action === "issue.document_created" ||
      action === "issue.document_updated" ||
      action === "issue.document_locked" ||
      action === "issue.document_unlocked" ||
      action === "issue.document_deleted"
    ) &&
    details
  ) {
    const key = typeof details.key === "string" ? details.key : "document";
    const title = typeof details.title === "string" && details.title ? ` (${details.title})` : "";
    return `${ISSUE_ACTIVITY_LABELS[action] ?? action} ${key}${title}`;
  }

  return ISSUE_ACTIVITY_LABELS[action] ?? action.replace(/[._]/g, " ");
}
