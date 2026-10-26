// @vitest-environment jsdom
import { act } from "react";
import { i18n, useTranslation } from "@/i18n";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperclipQuestionResponse, PaperclipQuestionSet } from "@paperclipai/adapter-utils";
import { QuestionForm } from "./QuestionForm";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./TaskChatRichInput", () => ({
  TaskChatRichInput: ({ value, onChange, placeholder }: { value: string; onChange(value: string): void; placeholder?: string }) =>
    <textarea aria-label="Answer" placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />,
}));
vi.mock("@/components/MarkdownBody", () => ({ MarkdownBody: ({ children }: { children: string }) => <div>{children}</div> }));

const questionSet: PaperclipQuestionSet = { schema: "paperclip.question_set.v1", questions: [
  { id: "draft", prompt: "Edit the draft", required: true, answerMode: "text", initialText: "  Draft\n漢字\n" },
] };

describe("QuestionForm initial text", () => {
  let container: HTMLDivElement;
  let root: Root;
  const submit = vi.fn();
  beforeEach(() => { localStorage.clear(); submit.mockReset(); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });
  const input = () => container.querySelector("textarea")!;
  async function render(set = questionSet, initialResponse?: PaperclipQuestionResponse) {
    await act(async () => root.render(<QuestionForm id="edit" questionSet={set} initialResponse={initialResponse} draftKey="question-initial-text" onSubmit={submit} />));
  }
  async function edit(text: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input(), text);
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function remount(set = questionSet) { await act(async () => root.unmount()); root = createRoot(container); await render(set); }
  it("shows exact editable text without sending until the operator submits", async () => {
    await render();
    expect(input().value).toBe("  Draft\n漢字\n");
    expect(submit).not.toHaveBeenCalled();
    await act(async () => Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Submit answers")!.click());
    expect(submit).toHaveBeenCalledExactlyOnceWith({ schema: "paperclip.question_response.v1", answers: { draft: { text: "  Draft\n漢字\n" } } });
  });
  it("preserves edits through a refreshed request and reload instead of reapplying a default", async () => {
    await render(); await edit("Operator edit\n");
    const refreshed = { ...questionSet, questions: [{ ...questionSet.questions[0]!, initialText: "New provider default" }] };
    await render(refreshed); expect(input().value).toBe("Operator edit\n");
    await remount(refreshed); expect(input().value).toBe("Operator edit\n");
    expect(submit).not.toHaveBeenCalled();
  });
  it("retains an explicitly cleared draft and required validation across reload", async () => {
    await render(); await edit(""); await remount();
    expect(input().value).toBe("");
    expect(Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Submit answers")!.disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
  it("isolates pending requests with the same field ids and restores each edited draft when switching back", async () => {
    async function showRequest(id: string, initialText: string) {
      const set = { ...questionSet, questions: [{ ...questionSet.questions[0]!, initialText }] };
      await act(async () => root.render(
        <QuestionForm id={id} questionSet={set} draftKey={`question:${id}`} onSubmit={submit} />,
      ));
    }
    const storedText = (id: string) => JSON.parse(localStorage.getItem(`question:${id}`)!).answers.draft.text;

    await showRequest("request-a", "Provider draft A");
    await edit("Operator edit A");
    await showRequest("request-b", "Provider draft B");
    expect(input().value).toBe("Provider draft B");
    expect(storedText("request-a")).toBe("Operator edit A");
    expect(storedText("request-b")).toBe("Provider draft B");
    await edit("Operator edit B");

    await showRequest("request-a", "Refreshed provider draft A");
    expect(input().value).toBe("Operator edit A");
    await showRequest("request-b", "Refreshed provider draft B");
    expect(input().value).toBe("Operator edit B");
    expect(storedText("request-a")).toBe("Operator edit A");
    expect(storedText("request-b")).toBe("Operator edit B");
    expect(submit).not.toHaveBeenCalled();
    await act(async () => Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Submit answers")!.click());
    expect(submit).toHaveBeenCalledExactlyOnceWith({ schema: "paperclip.question_response.v1", answers: { draft: { text: "Operator edit B" } } });
  });

  it("prefers an existing response and keeps text constraints on defaults", async () => {
    await render(questionSet, { schema: "paperclip.question_response.v1", answers: { draft: { text: "Existing answer" } } });
    expect(input().value).toBe("Existing answer");
    await act(async () => root.unmount()); localStorage.clear(); root = createRoot(container);
    await render({ ...questionSet, questions: [{ ...questionSet.questions[0]!, initialText: "bad", textValidation: { minLength: 5 } }] });
    expect(input().value).toBe("bad");
    expect(Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Submit answers")!.disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("QuestionForm locale state", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { localStorage.clear(); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => { root.unmount(); await i18n.changeLanguage("en"); }); container.remove(); localStorage.clear(); });
  const button = (text: string) => Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((node) => node.textContent?.trim() === text)!;
  async function changeText(value: string) {
    const input = container.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("preserves selected options, custom text, focus and literal labels through EN/RU/EN before exact submission", async () => {
    const submit = vi.fn();
    const cancel = vi.fn();
    const set: PaperclipQuestionSet = { schema: "paperclip.question_set.v1", submitLabel: "Send <tag>custom</tag>", questions: [
      { id: "choose", prompt: "Pick <strong>literal</strong>", answerMode: "multi_select", required: true,
        options: [{ id: "canonical-a", label: "Option <b>A</b>", recommended: true }, { id: "canonical-b", label: "Option B" }],
        customAnswer: { enabled: true, label: "Other <i>custom</i>", placeholder: "Provider <b>placeholder</b>" } },
      { id: "note", prompt: "Your note", answerMode: "text", required: true },
    ] };
    await act(async () => { root.render(<QuestionForm id="locale-request" questionSet={set} draftKey="locale-question" onSubmit={submit} onCancel={cancel} />); });
    const selected = container.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
    await act(async () => { selected.click(); });
    await act(async () => { button("Other <i>custom</i>").click(); });
    await changeText("Custom **Markdown** <tag>literal</tag>\n");
    const textarea = container.querySelector("textarea")!;
    textarea.focus();
    const storedDraft = localStorage.getItem("locale-question");
    for (const language of ["ru", "en"] as const) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(container.querySelector("textarea")).toBe(textarea);
      expect(document.activeElement).toBe(textarea);
      expect(textarea.value).toBe("Custom **Markdown** <tag>literal</tag>\n");
      expect(textarea.placeholder).toBe("Provider <b>placeholder</b>");
      expect(selected.getAttribute("aria-checked")).toBe("true");
      expect(localStorage.getItem("locale-question")).toBe(storedDraft);
      expect(container.textContent).toContain("Pick <strong>literal</strong>");
      expect(container.textContent).toContain(language === "ru" ? "Рекомендуется" : "Recommended");
      expect(submit).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
    }
    expect(container.querySelector("strong,b,i,tag")).toBeNull();
    await act(async () => { button("Next").click(); });
    await changeText("Answer **body**\n");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("2 из 2");
    await act(async () => { button("Send <tag>custom</tag>").click(); });
    expect(submit).toHaveBeenCalledExactlyOnceWith({ schema: "paperclip.question_response.v1", answers: {
      choose: { selectedOptionIds: ["canonical-a"], customText: "Custom **Markdown** <tag>literal</tag>\n" },
      note: { text: "Answer **body**\n" },
    } });
    expect(cancel).not.toHaveBeenCalled();
    expect(localStorage.getItem("locale-question")).toBeNull();
  });

  it.each([1, 2, 5, 21])("updates max-length validation for %s without replacing the typed answer", async (count) => {
    const submit = vi.fn();
    const set: PaperclipQuestionSet = { schema: "paperclip.question_set.v1", questions: [{ id: "text", prompt: "Literal prompt", answerMode: "text", required: true, textValidation: { maxLength: count } }] };
    await act(async () => { root.render(<QuestionForm id="length" questionSet={set} onSubmit={submit} />); });
    await changeText("x".repeat(count + 1));
    const input = container.querySelector("textarea")!;
    expect(container.textContent).toContain(`Enter no more than ${count} characters.`);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain(`Введите не более ${count} ${count === 1 || count === 21 ? "символа" : "символов"}.`);
    expect(container.querySelector("textarea")).toBe(input);
    expect(button("Отправить ответы").disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    await changeText("x".repeat(count));
    await act(async () => { button("Отправить ответы").click(); });
    expect(submit).toHaveBeenCalledExactlyOnceWith({ schema: "paperclip.question_response.v1", answers: { text: { text: "x".repeat(count) } } });
  });

  it.each([
    { validation: { inputType: "integer" as const }, input: "1.5", expected: "Введите корректное целое число." },
    { validation: { inputType: "number" as const }, input: "not-a-number", expected: "Введите корректное число." },
    { validation: { inputType: "number" as const, minimum: 2 }, input: "1", expected: "Введите значение не меньше 2." },
    { validation: { inputType: "number" as const, maximum: 5 }, input: "6", expected: "Введите значение не больше 5." },
    { validation: { minLength: 5 }, input: "abc", expected: "Введите не менее 5 символов." },
    { validation: { pattern: "^[A-Z][A-Z][A-Z]$" }, input: "123", expected: "Используйте указанный формат." },
    { validation: { pattern: "(a+)+$" }, input: "aaa", expected: "Для этого вопроса задан неподдерживаемый шаблон проверки." },
  ])("preserves validation rules for $input", async ({ validation, input, expected }) => {
    const submit = vi.fn();
    const set: PaperclipQuestionSet = { schema: "paperclip.question_set.v1", questions: [{ id: "value", prompt: "Provider value", answerMode: "text", required: true, textValidation: validation }] };
    await act(async () => { root.render(<QuestionForm id="validation" questionSet={set} onSubmit={submit} />); });
    await changeText(input);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain(expected);
    expect(container.querySelector("textarea")!.value).toBe(input);
    expect(button("Отправить ответы").disabled).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });

  it("reformats a stored failure using the current host formatter without another submission", async () => {
    const cause = { code: "audience_denied", detail: "Raw <tag>evidence</tag>" };
    const submit = vi.fn().mockRejectedValue(cause);
    const format = vi.fn((value: unknown, language: string) => value === cause ? `${language}: Raw <tag>evidence</tag>` : "unexpected");
    function Host() {
      const { i18n: language } = useTranslation();
      return <QuestionForm id="formatted" questionSet={questionSet} onSubmit={submit} formatError={(value) => format(value, language.resolvedLanguage ?? "en")} />;
    }
    await act(async () => { root.render(<Host />); });
    await act(async () => { button("Submit answers").click(); });
    expect(container.textContent).toContain("en: Raw <tag>evidence</tag>");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("ru: Raw <tag>evidence</tag>");
    expect(format).toHaveBeenLastCalledWith(cause, "ru");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(container.querySelector("tag")).toBeNull();
  });

  it.each([new Error("Provider <b>error</b>"), "failed"])("retains failed sends while translating only the local fallback", async (cause) => {
    const submit = vi.fn().mockRejectedValue(cause);
    await act(async () => { root.render(<QuestionForm id="failed" questionSet={questionSet} onSubmit={submit} />); });
    await act(async () => { button("Submit answers").click(); });
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain(cause instanceof Error ? cause.message : "Не удалось отправить ответы.");
    await changeText("Edited unsent text");
    expect(container.textContent).toContain(cause instanceof Error ? cause.message : "Не удалось отправить ответы.");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(container.querySelector("b")).toBeNull();
  });
});
