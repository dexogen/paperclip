// @vitest-environment jsdom
import englishQuestion from "../../../server/src/onboarding-assets/first-task/opening-question.json";
import russianQuestion from "../../../server/src/onboarding-assets/first-task/ru/opening-question.json";
import englishGreeting from "../../../server/src/onboarding-assets/first-task/greeting.md?raw";
import { act, forwardRef, useImperativeHandle } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { AskUserQuestionsInteraction, IssueComment } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { pendingAskUserQuestionsInteraction } from "@/fixtures/issueThreadInteractionFixtures";
import { ThemeProvider } from "@/context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskChatCompactInteractionCard } from "@/components/task-chat/TaskChatCompactInteractionCard";
import { IssueThreadInteractionCard } from "@/components/IssueThreadInteractionCard";
import { localizeOnboardingGreeting, localizeOnboardingQuestion, localizeOnboardingTaskTitle, OnboardingTaskProvider } from "./onboarding-first-task-localization";

vi.mock("@/components/MarkdownEditor", () => ({
  MarkdownEditor: forwardRef(function MockEditor({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }, ref) {
    useImperativeHandle(ref, () => ({ focus: () => {} }));
    return <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
  }),
}));

const issue = { id: "onboarding-issue", companyId: "onboarding-company", originKind: "onboarding_first_task" as const };
const date = new Date("2026-10-26T12:00:00Z");
const t = i18n.getFixedT("ru");
function question(locale: "en" | "ru" = "en"): AskUserQuestionsInteraction {
  const source = structuredClone(locale === "ru" ? russianQuestion : englishQuestion);
  return { ...pendingAskUserQuestionsInteraction, id: "opening-question", issueId: issue.id, companyId: issue.companyId,
    idempotencyKey: `onboarding-first-task:${issue.id}:opening-question`, title: null, summary: null,
    createdByAgentId: "agent-1", createdByUserId: null, sourceRunId: null, sourceCommentId: null, sourceIdentityContextId: null,
    payload: { version: 1, submitLabel: source.submitLabel, supersedeOnUserComment: true,
      questions: [{ id: "first-task-opening", prompt: source.prompt, helpText: null, selectionMode: "single", required: true, options: source.options }] },
  };
}
function greeting(): IssueComment {
  return { id: "greeting", companyId: issue.companyId, issueId: issue.id, authorType: "agent", authorAgentId: "agent-1", authorUserId: null,
    body: englishGreeting.trim().replace("{{agentName}}", "CEO"),
    metadata: { version: 1, sections: [], authorizationReason: "onboarding first-task greeting" }, presentation: null, createdAt: date, updatedAt: date,
  };
}

describe("owned onboarding seed presentation", () => {
  it("recognizes real assets in both languages while preserving raw data and user names", () => {
    for (const locale of ["en", "ru"] as const) {
      const card = question(locale);
      const snapshot = JSON.stringify(card);
      expect(localizeOnboardingQuestion(card, issue, t).questions[0].prompt).toBe("С чего начнём?");
      expect(localizeOnboardingQuestion(card, issue, i18n.getFixedT("en")).questions[0].prompt).toBe("What would you like to do?");
      expect(JSON.stringify(card)).toBe(snapshot);
    }
    const comment = greeting();
    const name = "CLI & <agent> {{literal}}";
    comment.body = comment.body.replace("CEO", name);
    expect(localizeOnboardingGreeting(comment, issue, name, t)).toContain(`Я — ${name}, ваш первый агент.`);
    expect(comment.body).toContain("Welcome to Paperclip!");
    expect(localizeOnboardingTaskTitle({ ...issue, title: "Paperclip onboarding" }, t)).toBe("Начало работы с Paperclip");
    expect(localizeOnboardingTaskTitle({ ...issue, title: "My renamed task" }, t)).toBe("My renamed task");
    expect(localizeOnboardingTaskTitle({ originKind: "manual", title: "Paperclip onboarding" }, t)).toBe("Paperclip onboarding");
  });

  it.each([
    ["another issue", { issueId: "elsewhere" }], ["another company", { companyId: "elsewhere" }],
    ["missing metadata", { metadata: null }], ["other authorization", { metadata: { version: 1, sections: [], authorizationReason: "agent comment" } }],
    ["user author", { authorType: "user", authorUserId: "user-1" }], ["missing author", { authorAgentId: null }],
    ["agent run", { createdByRunId: "run-1" }], ["edited comment", { updatedAt: new Date(date.getTime() + 1) }],
    ["edited body", { body: "Welcome to Paperclip! Edited by user" }], ["deleted comment", { deletedAt: date }],
  ])("leaves %s greeting literal", (_name, patch) => {
    const comment = { ...greeting(), ...patch } as IssueComment;
    expect(localizeOnboardingGreeting(comment, issue, "CEO", t)).toBe(comment.body);
  });

  it("requires the issue origin and the exact agent name for a greeting", () => {
    const comment = greeting();
    for (const context of [null, { ...issue, originKind: "manual" as const }]) expect(localizeOnboardingGreeting(comment, context, "CEO", t)).toBe(comment.body);
    expect(localizeOnboardingGreeting(comment, issue, "renamed agent", t)).toBe(comment.body);
  });

  it.each([
    ["another issue", { issueId: "elsewhere" }], ["another company", { companyId: "elsewhere" }],
    ["missing idempotency", { idempotencyKey: undefined }], ["different idempotency", { idempotencyKey: "copied" }],
    ["user copy", { createdByUserId: "user-1" }], ["missing agent", { createdByAgentId: null }],
    ["agent run", { sourceRunId: "run-1" }], ["comment copy", { sourceCommentId: "comment-1" }],
    ["custom title", { title: "User title" }],
  ])("leaves %s question literal", (_name, patch) => {
    const card = { ...question(), ...patch } as AskUserQuestionsInteraction;
    expect(localizeOnboardingQuestion(card, issue, t)).toBe(card.payload);
  });

  it("rejects changed prompts, option copy, IDs, flags and payload shape", () => {
    const mutations = [
      (card: AskUserQuestionsInteraction) => { card.payload.questions[0].prompt += " edited"; },
      (card: AskUserQuestionsInteraction) => { card.payload.questions[0].options[0].label += " edited"; },
      (card: AskUserQuestionsInteraction) => { card.payload.questions[0].options[1].id = "other"; },
      (card: AskUserQuestionsInteraction) => { card.payload.questions[0].options[1].freeText = false; },
      (card: AskUserQuestionsInteraction) => { card.payload.questions[0].allowOther = false; },
      (card: AskUserQuestionsInteraction) => { card.payload.submitLabel = "Send elsewhere"; },
    ];
    for (const change of mutations) {
      const card = question(); change(card);
      expect(localizeOnboardingQuestion(card, issue, t)).toBe(card.payload);
    }
    const card = question();
    expect(localizeOnboardingQuestion(card, null, t)).toBe(card.payload);
    expect(localizeOnboardingQuestion(card, { ...issue, originKind: "manual" }, t)).toBe(card.payload);
  });

  it.each(["modern", "classic"])("keeps the %s question draft and submits original protocol data across languages", async (view) => {
    const card = question();
    const snapshot = JSON.stringify(card);
    const submit = vi.fn().mockResolvedValue(undefined);
    const container = document.createElement("div"); document.body.appendChild(container);
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      await act(async () => {
        await i18n.changeLanguage("en");
        root.render(<QueryClientProvider client={client}><ThemeProvider><TooltipProvider><OnboardingTaskProvider value={issue}>
          {view === "modern" ? <TaskChatCompactInteractionCard interaction={card} onSubmitInteractionAnswers={submit} /> : <IssueThreadInteractionCard interaction={card} onSubmitInteractionAnswers={submit} />}
        </OnboardingTaskProvider></TooltipProvider></ThemeProvider></QueryClientProvider>);
      });
      expect(container.textContent).toContain("What would you like to do?");
      const taskButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("I have a task in mind"));
      // The modern question form exposes its custom-answer editor directly.
      if (taskButton) await act(async () => { taskButton.click(); });
      const input = container.querySelector("textarea")!;
      expect(input).not.toBeNull();
      const draft = "  CLI <draft> & {{literal}}  ";
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, draft);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      input.focus(); input.setSelectionRange(3, 7);
      await act(async () => { await i18n.changeLanguage("ru"); });
      expect(container.textContent).toContain("С чего начнём?");
      expect(container.querySelector("textarea")).toBe(input);
      expect(input.value).toBe(draft);
      expect(document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 7]);
      expect(submit).not.toHaveBeenCalled();
      const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Продолжить")!;
      expect(button).toBeDefined();
      await act(async () => { button.click(); });
      expect(submit).toHaveBeenCalledExactlyOnceWith(card, [{ questionId: "first-task-opening", optionIds: [], otherText: draft.trim() }]);
      expect(submit.mock.calls[0][0]).toBe(card);
      expect(JSON.stringify(card)).toBe(snapshot);
    } finally {
      await act(async () => { root.unmount(); await i18n.changeLanguage("en"); });
      client.clear(); container.remove();
    }
  });
});
