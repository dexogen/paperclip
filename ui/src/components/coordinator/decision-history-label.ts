import type { DecisionHistoryItem } from "@paperclipai/shared";
import type { TFunction } from "i18next";

export function decisionHistoryLabel(item: DecisionHistoryItem, t: TFunction): string {
  const label = item.display?.label;
  if (!label) return item.label;
  switch (label.code) {
    case "approved": return t("decisionForms.common.approved");
    case "changesRequested": return t("decisionForms.interaction.changesRequested");
    case "answersRecorded": return t("interfaceUpdates.answers_recorded_37d183a4");
    case "cancelled": return t("decisionForms.common.cancelled");
    case "expired": return t("decisionForms.common.expired");
    case "failed": return t("decisionForms.common.failed");
    case "superseded": return t("fullApps.caption_e5830d2654");
    case "answeredInTask": return t("agentEdition.receipt.answeredInTask");
    case "recorded": return t("agentEdition.receipt.recorded");
    case "reviewRecorded": return t("agentEdition.receipt.reviewRecorded");
    case "itemVerdicts": break;
    default: return item.label;
  }
  const counts = label.args;
  if (!counts || ![counts.approve, counts.reject, counts.defer].every(count => Number.isSafeInteger(count) && count >= 0)) {
    return item.label;
  }
  const parts = [
    counts.approve && t("taskChatUi.compactInteraction.summaryApproved", { count: counts.approve }),
    counts.reject && t("taskChatUi.compactInteraction.summaryRejected", { count: counts.reject }),
    counts.defer && t("taskChatUi.compactInteraction.summaryDeferred", { count: counts.defer }),
  ];
  return parts.filter(Boolean).join(" · ") || t("agentEdition.receipt.reviewRecorded");
}
