import { i18n } from "@/i18n";
import { statusLabel } from "@/i18n/ui-labels";
import { t as fullSharedT } from "@/i18n";
import type { IssueChangeReceiptEntry } from "@paperclipai/shared";
import { formatReviewPolicyValue } from "./review-policy";

/**
 * Read + format the field-level change receipts carried on an `issue.updated`
 * activity event (the open cross-task write design (audit), built on the field-change receipts the API already records).
 *
 * Every issue PATCH — agent and board alike — must leave an auditable record of
 * who changed what, when, and under which authorization. The server writes that
 * receipt; this module turns it into something a human can scan in the activity
 * stream without opening the audit log.
 *
 * The server already drops `updatedAt` and truncates long text (flagging it with
 * `updated: true`), so this module renders what it is given rather than
 * re-deciding what is interesting.
 */

/** Field names whose raw ids carry no meaning in a scannable summary. */
const FIELD_LABELS: Record<string, string> = {
  get priority() { return fullSharedT("fullActivity.fieldPriority"); },
  get status() { return fullSharedT("fullActivity.fieldStatus"); },
  get description() { return fullSharedT("fullActivity.fieldDescription"); },
  get title() { return fullSharedT("fullActivity.fieldTitle"); },
  get assigneeAgentId() { return fullSharedT("fullShared.assignee_5e20d2"); },
  get assigneeUserId() { return fullSharedT("fullShared.assignee_user_aab320"); },
  get responsibleUserId() { return fullSharedT("surfacesGap.audit.responsible"); },
  get blockedByIssueIds() { return fullSharedT("fullShared.blockers_cb9b9d"); },
  get labelIds() { return fullSharedT("issueFilters.labels"); },
  get parentId() { return fullSharedT("taskProperties.fields.parent"); },
  get projectId() { return fullSharedT("newIssue.project"); },
  get goalId() { return fullSharedT("taskChatUi.add.goal"); },
  get workMode() { return fullSharedT("fullShared.work_mode_b4c4ae"); },
  get reviewPolicy() { return fullSharedT("fullShared.who_can_approve_933be0"); },
  get billingCode() { return fullSharedT("fullShared.billing_code_1aad3d"); },
  get checkoutRunId() { return fullSharedT("fullShared.checkout_run_d75594"); },
  get executionRunId() { return fullSharedT("fullShared.execution_run_d78fe7"); },
  get hiddenAt() { return fullSharedT("fullStaleReview.issueHidden"); },
  get startedAt() { return fullSharedT("taskProperties.fields.started"); },
  get completedAt() { return fullSharedT("fullShared.completed_22a970"); },
  get cancelledAt() { return fullSharedT("fullShared.cancelled_d353a9"); },
  get requestDepth() { return fullSharedT("fullShared.request_depth_bdf641"); },
  get sourceTrust() { return fullSharedT("fullShared.source_trust_5894ec"); },
  get executionPolicy() { return fullSharedT("taskProperties.fields.executionPolicy"); },
  get executionWorkspaceId() { return fullSharedT("projectWorkspacesUi.kind.execution"); },
  get projectWorkspaceId() { return fullSharedT("taskChatUi.worktree.shared"); },
};

/** Human label for a changed field, e.g. `assigneeAgentId` → "Assignee". */
export function issueChangeFieldLabel(field: string): string {
  const known = FIELD_LABELS[field];
  if (known) return known;
  // camelCase / snake_case → "Sentence case".
  const spaced = field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const VALUE_PREVIEW_BUDGET = 72;

/**
 * Render one side of a change for display. Never returns an empty string, so a
 * receipt row always reads as "from → to" rather than trailing into nothing.
 */
export function formatIssueChangeValue(
  value: unknown,
  options: { resolveAgentLabel?: (id: string) => string | null | undefined;
    resolveUserLabel?: (id: string) => string | null | undefined;
    field?: string } = {},
): string {
  // `reviewPolicy` is nullable-by-default: a cleared column means "anyone can
  // approve", not "no value" (PAP-16506), so it resolves before the null branch.
  if (options.field === "reviewPolicy") return formatReviewPolicyValue(value);
  if (value === null || value === undefined || value === "") return fullSharedT("fullActivity.none");
  if (typeof value === "boolean") return value ? fullSharedT("fullActivity.yes") : fullSharedT("fullActivity.no");
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return fullSharedT("fullActivity.none");
    const strings = value.filter((entry): entry is string => typeof entry === "string");
    if (strings.length !== value.length) return fullSharedT("fullActivity.itemCount", { count: value.length });
    return strings.length <= 3
      ? strings.map((id) => shortenId(id)).join(", ")
      : fullSharedT("fullActivity.itemCount", { count: strings.length });
  }

  if (value instanceof Date) return value.toLocaleString(i18n.resolvedLanguage);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fullSharedT("fullActivity.none");
    // Ids resolve to names when the directory is loaded; otherwise they shorten.
    const resolved = options.field?.toLowerCase().includes("agent")
      ? options.resolveAgentLabel?.(trimmed)
      : options.field?.toLowerCase().includes("user")
        ? options.resolveUserLabel?.(trimmed)
        : null;
    if (resolved) return resolved;
    if (isIsoTimestamp(trimmed)) return new Date(trimmed).toLocaleString(i18n.resolvedLanguage);
    if (looksLikeId(trimmed)) return shortenId(trimmed);
    if (options.field === "status" || options.field === "priority") return truncate(statusLabel(trimmed));
    const humanized = trimmed.includes(" ") ? trimmed : trimmed.replace(/_/g, " ");
    return truncate(humanized);
  }

  // Objects (execution policy, workspace settings) are structural — the receipt
  // records that they moved, and the audit log holds the full value.
  return fullSharedT("fullActivity.updated");
}

function truncate(value: string): string {
  const chars = Array.from(value);
  if (chars.length <= VALUE_PREVIEW_BUDGET) return value;
  return `${chars.slice(0, VALUE_PREVIEW_BUDGET).join("")}…`;
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
}

function looksLikeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function shortenId(value: string): string {
  return looksLikeId(value) ? value.slice(0, 8) : truncate(value);
}

export interface IssueChangeReceiptRow {
  field: string;
  label: string;
  from: string;
  to: string;
  /** Server flagged the values as truncated previews of long text. */
  truncated: boolean;
}

function isChangeEntry(value: unknown): value is IssueChangeReceiptEntry {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && "from" in (value as object) && "to" in (value as object);
}

/**
 * Parse `details.changes` off an activity event into display rows. Returns an
 * empty array for events with no receipt (older rows, non-PATCH actions), so
 * callers can render nothing without special-casing.
 */
export function readIssueChangeReceipt(
  details: Record<string, unknown> | null | undefined,
  options: Parameters<typeof formatIssueChangeValue>[1] = {},
): IssueChangeReceiptRow[] {
  const changes = details?.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];

  const rows: IssueChangeReceiptRow[] = [];
  for (const [field, entry] of Object.entries(changes as Record<string, unknown>)) {
    if (!isChangeEntry(entry)) continue;
    rows.push({
      field,
      label: issueChangeFieldLabel(field),
      from: formatIssueChangeValue(entry.from, { ...options, field }),
      to: formatIssueChangeValue(entry.to, { ...options, field }),
      truncated: entry.updated === true,
    });
  }
  // Stable, scannable order regardless of JSON key order (jsonb reorders keys).
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

/** Authorization reasons, as recorded by the server's write-policy decision. */
const AUTHORIZATION_REASON_LABELS: Record<string, string> = {
  get allow_visible_issue_write() { return fullSharedT("fullShared.default_open_write_on_a_visible_task_b8bfd7"); },
  get allow_scoped_agent_write() { return fullSharedT("fullShared.scoped_agent_write_bc00f9"); },
  get allow_board_actor() { return fullSharedT("fullShared.board_actor_cf2ed1"); },
  get allow_self() { return fullSharedT("fullShared.own_task_d37df8"); },
  get allow_issue_mention_grant() { return fullSharedT("fullShared.mention_grant_982e0e"); },
  get allow_direct_parent_report() { return fullSharedT("fullShared.direct_parent_report_0141a9"); },
  get allow_low_trust_boundary() { return fullSharedT("fullShared.low_trust_boundary_allowance_c03a45"); },
  get allow_explicit_grant() { return fullSharedT("fullShared.explicit_permission_grant_af5e90"); },
  get allow_instance_admin() { return fullSharedT("fullShared.instance_admin_6eabc9"); },
  get allow_local_board() { return fullSharedT("fullShared.local_board_59e8df"); },
  get internal_agent_write() { return fullSharedT("fullShared.internal_agent_write_1a965c"); },
};

/**
 * Human phrasing for the authorization reason on a write receipt. Unknown
 * reasons degrade to their humanized code rather than disappearing — an
 * unexplained write is worse than an ugly one.
 */
export function issueAuthorizationReasonLabel(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  if (!trimmed) return null;
  return AUTHORIZATION_REASON_LABELS[trimmed] ?? trimmed.replace(/_/g, " ");
}
