import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import type { IssueBlockerAttention } from "@paperclipai/shared";

/**
 * Everything a task status surface needs to pick its glyph and label. Every
 * view (sidebar rows, task header, properties, status picker, lists, inbox,
 * pills, search) resolves through {@link resolveTaskStatusPresentation}, so one
 * underlying state always renders the same icon and label (BUG-07).
 */
export interface TaskStatusPresentationInput {
  status: string;
  /** Server-derived presentation; mutations still use the canonical status. */
  displayStatus?: string | null;
  externalConversationState?: "active" | "waiting" | null;
  blockerAttention?: IssueBlockerAttention | null;
}

export interface TaskStatusPresentation {
  /** Key into the unified StatusGlyph icon/colour tables. */
  glyphStatus: string;
  /** Short visible label ("Blocked", "Idle", "Monitoring", …). */
  label: string;
  /** Full accessible/tooltip copy, including the blocked reason. */
  ariaLabel: string;
}

export function taskStatusLabel(status: string, t: TFunction = i18n.getFixedT(i18n.resolvedLanguage ?? "en")): string {
  const label = (() => {
    switch (status) {
      case "backlog": return t("statuses.backlog");
      case "todo": return t("statuses.todo");
      case "in_progress": return t("statuses.in_progress");
      case "in_review": return t("statuses.in_review");
      case "done": return t("statuses.done");
      case "cancelled": return t("statuses.cancelled");
      case "blocked": return t("statuses.blocked");
      case "monitoring": return t("statuses.monitoring");
      case "idle": return t("statuses.idle");
      default: return status.replace(/_/g, " ");
    }
  })();
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function blockedAttentionLabel(blockerAttention: IssueBlockerAttention | null | undefined, t: TFunction) {
  if (!blockerAttention || blockerAttention.state === "none") return taskStatusLabel("blocked", t);

  if (blockerAttention.reason === "active_child") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return t("taskDisplay.status.activeChildNamed", { identifier: blockerAttention.sampleBlockerIdentifier });
    }
    return t("taskDisplay.status.activeChildren", { count });
  }

  if (blockerAttention.reason === "active_dependency") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return t("taskDisplay.status.activeDependencyNamed", { identifier: blockerAttention.sampleBlockerIdentifier });
    }
    return t("taskDisplay.status.activeDependencies", { count });
  }

  if (blockerAttention.reason === "stalled_review") {
    const count = blockerAttention.stalledBlockerCount;
    const leaf = blockerAttention.sampleStalledBlockerIdentifier ?? blockerAttention.sampleBlockerIdentifier;
    if (count === 1 && leaf) return t("taskDisplay.status.stalledReviewNamed", { identifier: leaf });
    return t("taskDisplay.status.stalledReviews", { count });
  }

  if (blockerAttention.reason === "attention_required") {
    const count = blockerAttention.attentionBlockerCount || blockerAttention.unresolvedBlockerCount;
    const coveredCount = blockerAttention.coveredBlockerCount;
    return coveredCount > 0
      ? t("taskDisplay.status.attentionCovered", { count, coveredCount })
      : t("taskDisplay.status.attention", { count });
  }

  return taskStatusLabel("blocked", t);
}

/**
 * The one state → glyph/label mapping:
 * - in_review whose external conversation is waiting → "Idle"
 * - in_progress presented as monitoring → "Monitoring" (clock)
 * - blocked and covered by active work → the blue "in queue" glyph, with the
 *   blocked reason on the accessible label
 */
export function resolveTaskStatusPresentation(input: TaskStatusPresentationInput, t: TFunction = i18n.getFixedT(i18n.resolvedLanguage ?? "en")): TaskStatusPresentation {
  const { status, displayStatus, externalConversationState, blockerAttention } = input;
  const visibleStatus = status === "in_review" && externalConversationState === "waiting"
    ? "idle"
    : status === "in_progress" && displayStatus === "monitoring"
      ? "monitoring"
      : status;
  const isCoveredBlocked = status === "blocked" && blockerAttention?.state === "covered";
  return {
    glyphStatus: isCoveredBlocked ? "in_queue" : visibleStatus,
    label: taskStatusLabel(visibleStatus, t),
    ariaLabel: status === "blocked" ? blockedAttentionLabel(blockerAttention, t) : taskStatusLabel(visibleStatus, t),
  };
}

type TaskStatusSource = {
  status: string;
  displayStatus?: string | null;
  externalConversationState?: "active" | "waiting" | null;
  blockerAttention?: IssueBlockerAttention | null;
};

/**
 * Pick every status-presentation field from a task record so a view cannot
 * silently drop one (e.g. `blockerAttention`) and render a different glyph
 * than the task pane. Spread into `<StatusIcon {...taskStatusIconProps(task)} />`.
 */
export function taskStatusIconProps(task: TaskStatusSource): TaskStatusPresentationInput {
  return {
    status: task.status,
    displayStatus: task.displayStatus ?? null,
    externalConversationState: task.externalConversationState ?? null,
    blockerAttention: task.blockerAttention ?? null,
  };
}
