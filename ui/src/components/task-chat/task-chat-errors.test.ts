import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { formatTaskChatError, TaskChatUiError } from "./task-chat-errors";

describe("task chat error provenance", () => {
  it("localizes only typed validation errors and keeps an equal provider message literal", () => {
    const error = new TaskChatUiError("goalSelectAgent");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Select an agent to use /goal.");
    expect(formatTaskChatError(error, "goalActionFailed", i18n.getFixedT("ru"))).toBe("Выберите агента, чтобы использовать /goal.");
    expect(formatTaskChatError(new Error(error.message), "goalActionFailed", i18n.getFixedT("ru"))).toBe(error.message);
    expect(formatTaskChatError({ code: "goalSelectAgent", message: error.message }, "uploadFailed", i18n.getFixedT("ru"))).toBe("Не удалось загрузить файл");
    expect(formatTaskChatError(error, "uploadFailed")).toBe(error.message);
  });
});
