import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import type {
  Issue,
  IssueBlockedInboxAttention,
  IssueBlockedInboxReason,
  IssueBlockedInboxSeverity,
} from "@paperclipai/shared";

export type BlockedReasonVariant =
  | "needs_decision"
  | "stalled"
  | "needs_attention"
  | "recovery_required"
  | "external_wait"
  | "owner_paused";

const VARIANT_BY_REASON: Record<IssueBlockedInboxReason, BlockedReasonVariant> = {
  pending_board_decision: "needs_decision",
  pending_user_decision: "needs_decision",
  missing_successful_run_disposition: "needs_decision",
  blocked_chain_stalled: "stalled",
  blocked_by_unassigned_issue: "needs_attention",
  blocked_by_assigned_backlog_issue: "needs_attention",
  blocked_by_cancelled_issue: "needs_attention",
  in_review_without_action_path: "needs_attention",
  invalid_review_participant: "needs_attention",
  open_recovery_issue: "recovery_required",
  external_owner_action: "external_wait",
  blocked_by_uninvokable_assignee: "owner_paused",
};

export const BLOCKED_REASON_VARIANT_ORDER: BlockedReasonVariant[] = [
  "needs_decision",
  "stalled",
  "needs_attention",
  "recovery_required",
  "external_wait",
  "owner_paused",
];

function blockedVariantLabels(t: TFunction) {
  return {
    needs_decision: t("inboxUi.blocked.variant.needs_decision"),
    stalled: t("inboxUi.blocked.variant.stalled"),
    needs_attention: t("inboxUi.blocked.variant.needs_attention"),
    recovery_required: t("inboxUi.blocked.variant.recovery_required"),
    external_wait: t("inboxUi.blocked.variant.external_wait"),
    owner_paused: t("inboxUi.blocked.variant.owner_paused"),
  };
}

export const BLOCKED_VARIANT_LABELS: Record<BlockedReasonVariant, string> = blockedVariantLabels(i18n.getFixedT("en"));

function blockedReasonLabels(t: TFunction) {
  return {
    pending_board_decision: t("inboxUi.blocked.reason.pending_board_decision"),
    pending_user_decision: t("inboxUi.blocked.reason.pending_user_decision"),
    missing_successful_run_disposition: t("inboxUi.blocked.reason.missing_successful_run_disposition"),
    blocked_chain_stalled: t("inboxUi.blocked.reason.blocked_chain_stalled"),
    blocked_by_unassigned_issue: t("inboxUi.blocked.reason.blocked_by_unassigned_issue"),
    blocked_by_assigned_backlog_issue: t("inboxUi.blocked.reason.blocked_by_assigned_backlog_issue"),
    blocked_by_cancelled_issue: t("inboxUi.blocked.reason.blocked_by_cancelled_issue"),
    in_review_without_action_path: t("inboxUi.blocked.reason.in_review_without_action_path"),
    invalid_review_participant: t("inboxUi.blocked.reason.invalid_review_participant"),
    open_recovery_issue: t("inboxUi.blocked.reason.open_recovery_issue"),
    external_owner_action: t("inboxUi.blocked.reason.external_owner_action"),
    blocked_by_uninvokable_assignee: t("inboxUi.blocked.reason.blocked_by_uninvokable_assignee"),
  };
}

const SEVERITY_RANK: Record<IssueBlockedInboxSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type BlockedInboxBadgeTone = "muted" | "amber" | "red";

export function blockedReasonVariant(reason: IssueBlockedInboxReason): BlockedReasonVariant {
  return VARIANT_BY_REASON[reason] ?? "needs_attention";
}

export function blockedReasonLabel(reason: IssueBlockedInboxReason, t: TFunction = i18n.getFixedT("en")): string {
  return blockedReasonLabels(t)[reason] ?? t("inboxUi.blocked.stoppedLabel");
}

export function blockedVariantLabel(variant: BlockedReasonVariant, t: TFunction = i18n.getFixedT("en")): string {
  return blockedVariantLabels(t)[variant];
}

export function blockedSeverityRank(severity: IssueBlockedInboxSeverity): number {
  return SEVERITY_RANK[severity] ?? 9;
}

export function compareBlockedAttention(
  a: IssueBlockedInboxAttention,
  b: IssueBlockedInboxAttention,
): number {
  const sevDiff = blockedSeverityRank(a.severity) - blockedSeverityRank(b.severity);
  if (sevDiff !== 0) return sevDiff;
  const aSince = a.stoppedSinceAt ? new Date(a.stoppedSinceAt).getTime() : Number.POSITIVE_INFINITY;
  const bSince = b.stoppedSinceAt ? new Date(b.stoppedSinceAt).getTime() : Number.POSITIVE_INFINITY;
  const sinceDiff = aSince - bSince;
  return Number.isFinite(sinceDiff) ? sinceDiff : 0;
}

export interface BlockedInboxIssueRow {
  issue: Issue;
  attention: IssueBlockedInboxAttention;
  variant: BlockedReasonVariant;
  reasonLabel: string;
  stoppedAtMs: number | null;
}

export type BlockedInboxGroupBy = "blocker_type" | "none";
export type BlockedInboxSort = "urgency" | "most_recent" | "longest_stopped";

export function blockedGroupOptions(t: TFunction = i18n.getFixedT("en")): readonly [BlockedInboxGroupBy, string][] {
  return [
    ["blocker_type", t("inboxUi.blocked.group.blocker_type")],
    ["none", t("inboxUi.blocked.group.none")],
  ];
}

export const BLOCKED_GROUP_OPTIONS = blockedGroupOptions();

export function blockedSortOptions(t: TFunction = i18n.getFixedT("en")): readonly [BlockedInboxSort, string][] {
  return [
    ["urgency", t("inboxUi.blocked.sort.urgency")],
    ["most_recent", t("inboxUi.blocked.sort.most_recent")],
    ["longest_stopped", t("inboxUi.blocked.sort.longest_stopped")],
  ];
}

export const BLOCKED_SORT_OPTIONS = blockedSortOptions();

export interface BlockedInboxGroup {
  variant: BlockedReasonVariant;
  label: string;
  rows: BlockedInboxIssueRow[];
}

export function buildBlockedInboxRows(issues: readonly Issue[], t: TFunction = i18n.getFixedT("en")): BlockedInboxIssueRow[] {
  const rows: BlockedInboxIssueRow[] = [];
  for (const issue of issues) {
    const attention = issue.blockedInboxAttention;
    if (!attention) continue;
    rows.push({
      issue,
      attention,
      variant: blockedReasonVariant(attention.reason),
      reasonLabel: blockedReasonLabel(attention.reason, t),
      stoppedAtMs: attention.stoppedSinceAt ? new Date(attention.stoppedSinceAt).getTime() : null,
    });
  }
  return rows;
}

function issueTimestampMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function blockedRowRecencyMs(row: BlockedInboxIssueRow): number {
  return row.stoppedAtMs ?? issueTimestampMs(row.issue.updatedAt) ?? 0;
}

function compareBlockedRowsByTitle(a: BlockedInboxIssueRow, b: BlockedInboxIssueRow): number {
  const byTitle = a.issue.title.localeCompare(b.issue.title);
  if (byTitle !== 0) return byTitle;
  return a.issue.id.localeCompare(b.issue.id);
}

export function compareBlockedRows(
  a: BlockedInboxIssueRow,
  b: BlockedInboxIssueRow,
  sort: BlockedInboxSort = "urgency",
): number {
  if (sort === "most_recent") {
    const recencyDiff = blockedRowRecencyMs(b) - blockedRowRecencyMs(a);
    if (recencyDiff !== 0) return recencyDiff;
    const attentionDiff = compareBlockedAttention(a.attention, b.attention);
    if (attentionDiff !== 0) return attentionDiff;
    return compareBlockedRowsByTitle(a, b);
  }

  if (sort === "longest_stopped") {
    const aStopped = a.stoppedAtMs ?? Number.POSITIVE_INFINITY;
    const bStopped = b.stoppedAtMs ?? Number.POSITIVE_INFINITY;
    const stoppedDiff = aStopped - bStopped;
    if (stoppedDiff !== 0) return stoppedDiff;
    const severityDiff = blockedSeverityRank(a.attention.severity) - blockedSeverityRank(b.attention.severity);
    if (severityDiff !== 0) return severityDiff;
    return compareBlockedRowsByTitle(a, b);
  }

  const attentionDiff = compareBlockedAttention(a.attention, b.attention);
  if (attentionDiff !== 0) return attentionDiff;
  const recencyDiff = blockedRowRecencyMs(b) - blockedRowRecencyMs(a);
  if (recencyDiff !== 0) return recencyDiff;
  return compareBlockedRowsByTitle(a, b);
}

export function sortBlockedInboxRows(
  rows: readonly BlockedInboxIssueRow[],
  sort: BlockedInboxSort = "urgency",
): BlockedInboxIssueRow[] {
  return [...rows].sort((a, b) => compareBlockedRows(a, b, sort));
}

export function groupBlockedInboxRows(
  rows: readonly BlockedInboxIssueRow[],
  sort: BlockedInboxSort = "urgency",
  t: TFunction = i18n.getFixedT("en"),
): BlockedInboxGroup[] {
  const buckets = new Map<BlockedReasonVariant, BlockedInboxIssueRow[]>();
  for (const row of rows) {
    const list = buckets.get(row.variant) ?? [];
    list.push(row);
    buckets.set(row.variant, list);
  }
  const groups: BlockedInboxGroup[] = [];
  for (const variant of BLOCKED_REASON_VARIANT_ORDER) {
    const list = buckets.get(variant);
    if (!list || list.length === 0) continue;
    const sorted = sortBlockedInboxRows(list, sort);
    groups.push({ variant, label: blockedVariantLabel(variant, t), rows: sorted });
  }
  return groups;
}

export function blockedRowMatchesSearch(row: BlockedInboxIssueRow, query: string, t: TFunction = i18n.getFixedT("en")): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.issue.title,
    row.issue.identifier ?? "",
    row.attention.owner.label ?? "",
    row.attention.action.label,
    row.attention.action.detail ?? "",
    row.reasonLabel,
    blockedVariantLabel(row.variant, t),
    blockedReasonLabel(row.attention.reason, i18n.getFixedT("en")),
    blockedReasonLabel(row.attention.reason, i18n.getFixedT("ru")),
    blockedVariantLabel(row.variant, i18n.getFixedT("en")),
    blockedVariantLabel(row.variant, i18n.getFixedT("ru")),
    row.attention.leafIssue?.identifier ?? "",
    row.attention.leafIssue?.title ?? "",
    row.attention.recoveryIssue?.identifier ?? "",
    row.attention.recoveryIssue?.title ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function blockedBadgeTone(rows: readonly BlockedInboxIssueRow[]): BlockedInboxBadgeTone {
  if (rows.length === 0) return "muted";
  let highest: IssueBlockedInboxSeverity = "low";
  for (const row of rows) {
    if (blockedSeverityRank(row.attention.severity) < blockedSeverityRank(highest)) {
      highest = row.attention.severity;
    }
  }
  if (highest === "critical") return "red";
  if (highest === "high") return "amber";
  return "muted";
}

export function formatStoppedAge(stoppedSinceAt: string | null, now: number = Date.now(), t: TFunction = i18n.getFixedT("en")): string {
  if (!stoppedSinceAt) return t("inboxUi.blocked.age.stopped");
  const then = new Date(stoppedSinceAt).getTime();
  if (!Number.isFinite(then)) return t("inboxUi.blocked.age.stopped");
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return t("inboxUi.blocked.age.justNow");
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return t("inboxUi.blocked.age.minutes", { count: m });
  }
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    return t("inboxUi.blocked.age.hours", { count: h });
  }
  if (seconds < 86_400 * 7) {
    const d = Math.floor(seconds / 86_400);
    return t("inboxUi.blocked.age.days", { count: d });
  }
  if (seconds < 86_400 * 30) {
    const w = Math.floor(seconds / (86_400 * 7));
    return t("inboxUi.blocked.age.weeks", { count: w });
  }
  const mo = Math.floor(seconds / (86_400 * 30));
  return t("inboxUi.blocked.age.months", { count: mo });
}
