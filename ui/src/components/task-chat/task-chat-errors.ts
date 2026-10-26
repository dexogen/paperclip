import type { TFunction } from "i18next";
import { i18n } from "@/i18n";

export type TaskChatErrorCode = "uploadNoUrl" | "attachmentRemoved" | "uploadFailed" | "fileTypeUnsupported" | "createFailed" | "goalConversation" | "goalAttachments" | "goalUnsupported" | "goalAgentRequired" | "goalActionFailed" | "skipFailed" | "stopFailed" | "goalSelectAgent" | "goalNoGoal" | "goalAddObjective" | "taskUnavailable" | "queueNotEditable" | "questionClosed" | "questionCancelUnavailable" | "savedQuestionRequired" | "runtimeIdentityMissing" | "permissionFormUnsupported" | "skipUnavailable" | "queueReorderUnavailable" | "steeringUnavailable" | "discardUnavailable" | "runtimeRequestFailed";

function taskChatErrorText(code: TaskChatErrorCode, t: TFunction): string {
  switch (code) {
    case "taskUnavailable": return t("taskChatUi.thread.taskUnavailable");
    case "queueNotEditable": return t("taskChatUi.thread.queueNotEditable");
    case "questionClosed": return t("taskChatUi.thread.questionClosed");
    case "questionCancelUnavailable": return t("taskChatUi.thread.questionCancelUnavailable");
    case "savedQuestionRequired": return t("taskChatUi.thread.savedQuestionRequired");
    case "runtimeIdentityMissing": return t("taskChatUi.thread.runtimeIdentityMissing");
    case "permissionFormUnsupported": return t("taskChatUi.thread.permissionFormUnsupported");
    case "skipUnavailable": return t("taskChatUi.thread.skipUnavailable");
    case "queueReorderUnavailable": return t("taskChatUi.thread.queueReorderUnavailable");
    case "steeringUnavailable": return t("taskChatUi.thread.steeringUnavailable");
    case "discardUnavailable": return t("taskChatUi.thread.discardUnavailable");
    case "runtimeRequestFailed": return t("taskChatUi.protocol.requestFailed");
    case "uploadNoUrl": return t("taskChatUi.composer.uploadNoUrl");
    case "attachmentRemoved": return t("taskChatUi.composer.attachmentRemoved");
    case "uploadFailed": return t("taskChatUi.composer.uploadFailed");
    case "fileTypeUnsupported": return t("taskChatUi.composer.fileTypeUnsupported");
    case "createFailed": return t("taskChatUi.composer.createFailed");
    case "goalConversation": return t("taskChatUi.composer.goalConversation");
    case "goalAttachments": return t("taskChatUi.composer.goalAttachments");
    case "goalUnsupported": return t("taskChatUi.composer.goalUnsupported");
    case "goalAgentRequired": return t("taskChatUi.composer.goalAgentRequired");
    case "goalActionFailed": return t("taskChatUi.composer.goalActionFailed");
    case "skipFailed": return t("taskChatUi.composer.skipFailed");
    case "stopFailed": return t("taskChatUi.composer.stopFailed");
    case "goalSelectAgent": return t("taskChatUi.goal.selectAgent");
    case "goalNoGoal": return t("taskChatUi.goal.noGoal");
    case "goalAddObjective": return t("taskChatUi.goal.addObjective");
  }
}

export class TaskChatUiError extends Error {
  constructor(readonly code: TaskChatErrorCode) {
    super(taskChatErrorText(code, i18n.getFixedT("en")));
    this.name = "TaskChatUiError";
  }
}

export function formatTaskChatError(cause: unknown, fallback: TaskChatErrorCode, t: TFunction = i18n.getFixedT("en")): string {
  if (cause instanceof TaskChatUiError) return taskChatErrorText(cause.code, t);
  return cause instanceof Error ? cause.message : taskChatErrorText(fallback, t);
}
