import type { AttentionDisplayMessage } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";

export type AttentionDisplaySlot = "subjectTitle" | "whyNow" | "verbLabel"
  | "verbDescription" | "planTitle" | "summaryExcerpt";

export function formatAttentionDisplayText(
  slot: AttentionDisplaySlot,
  fallback: string,
  message: AttentionDisplayMessage | null | undefined,
  t?: TFunction,
): string;
export function formatAttentionDisplayText(
  slot: AttentionDisplaySlot,
  fallback: string | null,
  message: AttentionDisplayMessage | null | undefined,
  t?: TFunction,
): string | null;
export function formatAttentionDisplayText(
  slot: AttentionDisplaySlot,
  fallback: string | null,
  message: AttentionDisplayMessage | null | undefined,
  t: TFunction = i18n.getFixedT("en"),
): string | null {
  if (fallback === null || !message || typeof message !== "object" || Array.isArray(message)) return fallback;
  const candidate = message as unknown as Record<string, unknown>;
  const args = candidate.args && typeof candidate.args === "object" && !Array.isArray(candidate.args)
    ? candidate.args as Record<string, unknown>
    : null;
  switch (candidate.code) {
    case "title.approval.hireAgent":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.approval.hireAgent", { defaultValue: fallback });
    case "title.approval.ceoStrategy":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.approval.ceoStrategy", { defaultValue: fallback });
    case "title.approval.budgetOverride":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.approval.budgetOverride", { defaultValue: fallback });
    case "title.approval.boardApproval":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.approval.boardApproval", { defaultValue: fallback });
    case "title.interaction.confirmation":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.confirmation", { defaultValue: fallback });
    case "title.interaction.checkbox":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.checkbox", { defaultValue: fallback });
    case "title.interaction.questions":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.questions", { defaultValue: fallback });
    case "title.interaction.tasks":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.tasks", { defaultValue: fallback });
    case "title.interaction.verdicts":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.verdicts", { defaultValue: fallback });
    case "title.interaction.generic":
      if ((slot !== "subjectTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.interaction.generic", { defaultValue: fallback });
    case "title.planApproval":
      if (slot !== "subjectTitle" || typeof args?.issueTitle !== "string") return fallback;
      return t("decisionsUi.feed.title.planApproval", { issueTitle: args.issueTitle, defaultValue: fallback });
    case "title.join.agent":
      if ((slot !== "subjectTitle" && slot !== "summaryExcerpt") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.join.agent", { defaultValue: fallback });
    case "title.join.human":
      if ((slot !== "subjectTitle" && slot !== "summaryExcerpt") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.title.join.human", { defaultValue: fallback });
    case "title.run.failed":
      if (slot !== "subjectTitle" || typeof args?.agentName !== "string") return fallback;
      return t("decisionsUi.feed.title.run.failed", { agentName: args.agentName, defaultValue: fallback });
    case "title.run.timedOut":
      if (slot !== "subjectTitle" || typeof args?.agentName !== "string") return fallback;
      return t("decisionsUi.feed.title.run.timedOut", { agentName: args.agentName, defaultValue: fallback });
    case "title.budget.hardStop":
      if (slot !== "subjectTitle" || typeof args?.scopeName !== "string") return fallback;
      return t("decisionsUi.feed.title.budget.hardStop", { scopeName: args.scopeName, defaultValue: fallback });
    case "title.budget.warning":
      if (slot !== "subjectTitle" || typeof args?.scopeName !== "string") return fallback;
      return t("decisionsUi.feed.title.budget.warning", { scopeName: args.scopeName, defaultValue: fallback });
    case "why.approval.pending":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.approval.pending", { defaultValue: fallback });
    case "why.interaction.confirmation":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.confirmation", { defaultValue: fallback });
    case "why.interaction.checkbox":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.checkbox", { defaultValue: fallback });
    case "why.interaction.questions":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.questions", { defaultValue: fallback });
    case "why.interaction.tasks":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.tasks", { defaultValue: fallback });
    case "why.interaction.verdicts":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.verdicts", { defaultValue: fallback });
    case "why.interaction.generic":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.interaction.generic", { defaultValue: fallback });
    case "why.decision.pending":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.decision.pending", { defaultValue: fallback });
    case "why.join.pending":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.join.pending", { defaultValue: fallback });
    case "why.recovery.escalated":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.recovery.escalated", { defaultValue: fallback });
    case "why.recovery.assigned":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.recovery.assigned", { defaultValue: fallback });
    case "why.blocker.needsAttention":
      if (slot !== "whyNow" || typeof args?.count !== "number" || !Number.isSafeInteger(args.count) || args.count < 0) return fallback;
      return t("decisionsUi.feed.why.blocker.needsAttention", { count: args.count, defaultValue: fallback });
    case "why.blocker.stalled":
      if (slot !== "whyNow" || typeof args?.count !== "number" || !Number.isSafeInteger(args.count) || args.count < 0) return fallback;
      return t("decisionsUi.feed.why.blocker.stalled", { count: args.count, defaultValue: fallback });
    case "why.review.stalled":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.review.stalled", { defaultValue: fallback });
    case "why.review.approval":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.review.approval", { defaultValue: fallback });
    case "why.review.participant":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.review.participant", { defaultValue: fallback });
    case "why.review.assigned":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.review.assigned", { defaultValue: fallback });
    case "why.run.exhausted":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.run.exhausted", { defaultValue: fallback });
    case "why.budget.hardStop":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.budget.hardStop", { defaultValue: fallback });
    case "why.budget.warning":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.budget.warning", { defaultValue: fallback });
    case "why.agent.error":
      if ((slot !== "whyNow") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.why.agent.error", { defaultValue: fallback });
    case "verb.respond":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.respond", { defaultValue: fallback });
    case "verb.confirm":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.confirm", { defaultValue: fallback });
    case "verb.decline":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.decline", { defaultValue: fallback });
    case "verb.accept":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.accept", { defaultValue: fallback });
    case "verb.reject":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.reject", { defaultValue: fallback });
    case "verb.approve":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.approve", { defaultValue: fallback });
    case "verb.requestRevision":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.requestRevision", { defaultValue: fallback });
    case "verb.review":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.review", { defaultValue: fallback });
    case "verb.resolve":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.resolve", { defaultValue: fallback });
    case "verb.reassign":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.reassign", { defaultValue: fallback });
    case "verb.cancel":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.cancel", { defaultValue: fallback });
    case "verb.unblock":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.unblock", { defaultValue: fallback });
    case "verb.nudge":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.nudge", { defaultValue: fallback });
    case "verb.chooseReviewPath":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.chooseReviewPath", { defaultValue: fallback });
    case "verb.requestChanges":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.requestChanges", { defaultValue: fallback });
    case "verb.retry":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.retry", { defaultValue: fallback });
    case "verb.dismiss":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.dismiss", { defaultValue: fallback });
    case "verb.raiseBudget":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.raiseBudget", { defaultValue: fallback });
    case "verb.keepPaused":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.keepPaused", { defaultValue: fallback });
    case "verb.inspect":
      if ((slot !== "verbLabel") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.verb.inspect", { defaultValue: fallback });
    case "description.questions.respond":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.questions.respond", { defaultValue: fallback });
    case "description.confirmation.accept":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.confirmation.accept", { defaultValue: fallback });
    case "description.confirmation.reject":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.confirmation.reject", { defaultValue: fallback });
    case "description.interaction.accept":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.interaction.accept", { defaultValue: fallback });
    case "description.interaction.reject":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.interaction.reject", { defaultValue: fallback });
    case "description.approval.approve":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.approval.approve", { defaultValue: fallback });
    case "description.approval.reject":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.approval.reject", { defaultValue: fallback });
    case "description.approval.revision":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.approval.revision", { defaultValue: fallback });
    case "description.decision.review":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.decision.review", { defaultValue: fallback });
    case "description.join.approve":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.join.approve", { defaultValue: fallback });
    case "description.join.reject":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.join.reject", { defaultValue: fallback });
    case "description.recovery.resolve":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.recovery.resolve", { defaultValue: fallback });
    case "description.recovery.reassign":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.recovery.reassign", { defaultValue: fallback });
    case "description.recovery.cancel":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.recovery.cancel", { defaultValue: fallback });
    case "description.blocker.route":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.blocker.route", { defaultValue: fallback });
    case "description.blocker.repair":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.blocker.repair", { defaultValue: fallback });
    case "description.blocker.reassign":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.blocker.reassign", { defaultValue: fallback });
    case "description.blocker.nudge":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.blocker.nudge", { defaultValue: fallback });
    case "description.review.path":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.review.path", { defaultValue: fallback });
    case "description.review.changes":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.review.changes", { defaultValue: fallback });
    case "description.review.approve":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.review.approve", { defaultValue: fallback });
    case "description.run.retry":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.run.retry", { defaultValue: fallback });
    case "description.run.reassign":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.run.reassign", { defaultValue: fallback });
    case "description.run.dismiss":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.run.dismiss", { defaultValue: fallback });
    case "description.budget.raise":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.budget.raise", { defaultValue: fallback });
    case "description.budget.keepPaused":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.budget.keepPaused", { defaultValue: fallback });
    case "description.agent.inspect":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.agent.inspect", { defaultValue: fallback });
    case "description.agent.dismiss":
      if ((slot !== "verbDescription") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.description.agent.dismiss", { defaultValue: fallback });
    case "detail.plan.defaultTitle":
      if ((slot !== "planTitle") || candidate.args !== undefined) return fallback;
      return t("decisionsUi.feed.detail.plan.defaultTitle", { defaultValue: fallback });
    default:
      return fallback;
  }
}
