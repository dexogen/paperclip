import type { AttentionDisplayMessage } from "@paperclipai/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { formatAttentionDisplayText } from "./attention-display";

const en = i18n.getFixedT("en");
const ru = i18n.getFixedT("ru");
const message = (value: unknown) => value as AttentionDisplayMessage;

afterEach(async () => { await i18n.changeLanguage("en"); });

describe("attention display provenance", () => {
  it("translates explicit defaults while preserving identical custom and older-server text", async () => {
    await i18n.changeLanguage("ru");
    expect(formatAttentionDisplayText("verbLabel", "Confirm", { code: "verb.confirm" })).toBe("Confirm");
    expect(formatAttentionDisplayText("verbLabel", "Confirm", { code: "verb.confirm" }, ru)).toBe("Подтвердить");
    for (const absent of [undefined, null]) {
      expect(formatAttentionDisplayText("verbLabel", "Confirm", absent, ru)).toBe("Confirm");
      expect(formatAttentionDisplayText("subjectTitle", "Confirmation requested", absent, ru)).toBe("Confirmation requested");
    }
    expect(formatAttentionDisplayText("planTitle", "Plan", { code: "detail.plan.defaultTitle" }, ru)).toBe("План");
    expect(formatAttentionDisplayText("planTitle", "Plan", undefined, ru)).toBe("Plan");
    for (const slot of ["subjectTitle", "summaryExcerpt"] as const) {
      expect(formatAttentionDisplayText(slot, "Human join request", { code: "title.join.human" }, ru)).toBe("Запрос на присоединение пользователя");
    }
  });

  it.each([
    undefined, null, "verb.confirm", [], { code: "future.action" },
    { code: "verb.confirm" }, { code: "title.planApproval" },
    { code: "title.planApproval", args: [] }, { code: "title.planApproval", args: { issueTitle: 1 } },
    { code: "title.join.agent", args: { lng: "ru" } },
  ])("falls back for malformed or cross-slot metadata %#", (input) => {
    expect(formatAttentionDisplayText("subjectTitle", "Raw <tag> {{value}}", message(input), ru)).toBe("Raw <tag> {{value}}");
  });

  it("does not create text for a null field or expose a translation key for unknown codes", () => {
    expect(formatAttentionDisplayText("subjectTitle", null, { code: "title.join.agent" }, ru)).toBeNull();
    expect(formatAttentionDisplayText("whyNow", "Original reason", message({ code: "why.newReason" }), ru)).toBe("Original reason");
    expect(formatAttentionDisplayText("verbDescription", null, { code: "description.approval.approve" }, ru)).toBeNull();
    expect(formatAttentionDisplayText("summaryExcerpt", "Raw", { code: "detail.plan.defaultTitle" }, ru)).toBe("Raw");
  });

  it("preserves literal interpolation and does not modify metadata or spread translation options", () => {
    const args = Object.freeze({ issueTitle: "<strong>Plan</strong> {{literal}}", lng: "ru", ns: "other", defaultValue: "Forged", returnObjects: true });
    const input = Object.freeze({ code: "title.planApproval", args });
    expect(formatAttentionDisplayText("subjectTitle", "Fallback", message(input), en)).toBe("Plan approval - <strong>Plan</strong> {{literal}}");
    expect(formatAttentionDisplayText("subjectTitle", "Fallback", message(input), ru)).toBe("Согласование плана — <strong>Plan</strong> {{literal}}");
    const translator = vi.fn(() => "Translated") as unknown as TFunction;
    expect(formatAttentionDisplayText("subjectTitle", "Fallback", message(input), translator)).toBe("Translated");
    expect(translator).toHaveBeenCalledExactlyOnceWith("decisionsUi.feed.title.planApproval", { issueTitle: args.issueTitle, defaultValue: "Fallback" });
    expect(input.args).toBe(args);
  });

  it.each([
    [0, "задач"], [1, "задачу"], [2, "задачи"], [5, "задач"], [11, "задач"], [21, "задачу"], [22, "задачи"], [25, "задач"],
  ])("renders whole blocker messages for %s without changing the count", (count, noun) => {
    const input: AttentionDisplayMessage = { code: "why.blocker.needsAttention", args: { count: Number(count) } };
    expect(formatAttentionDisplayText("whyNow", "fallback", input, ru)).toBe(`Блокирует ${count} ${noun} и требует внимания пользователя.`);
    expect(formatAttentionDisplayText("whyNow", "fallback", input, en)).toBe(`Blocks ${count} ${count === 1 ? "task" : "tasks"} and needs human attention.`);
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "2", null])("rejects malformed count %s instead of inventing a translated fact", (count) => {
    expect(formatAttentionDisplayText("whyNow", "Original count evidence", message({ code: "why.blocker.stalled", args: { count } }), ru)).toBe("Original count evidence");
  });
});
