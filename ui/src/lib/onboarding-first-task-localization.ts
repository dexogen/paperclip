import { createContext, useContext } from "react";
import type { AskUserQuestionsInteraction, AskUserQuestionsPayload, Issue, IssueComment } from "@paperclipai/shared";
import type { TFunction } from "i18next";

export type OnboardingTaskContext = Pick<Issue, "id" | "companyId" | "originKind">;
const OnboardingTask = createContext<OnboardingTaskContext | null>(null);
export const OnboardingTaskProvider = OnboardingTask.Provider;
export const useOnboardingTask = () => useContext(OnboardingTask);

export function localizeOnboardingTaskTitle(issue: Pick<Issue, "title" | "originKind">, t: TFunction): string {
  return issue.originKind === "onboarding_first_task"
    && (issue.title === "Paperclip onboarding" || issue.title === "Начало работы с Paperclip")
    ? t("onboardingGap.taskTitle") : issue.title;
}

function belongsToOnboardingTask(record: { issueId: string; companyId: string }, issue: OnboardingTaskContext | null): boolean {
  return issue?.originKind === "onboarding_first_task"
    && record.issueId === issue.id && record.companyId === issue.companyId;
}

/** Only the unchanged, server-authored seed is display copy. Never rewrite stored comments. */
export function localizeOnboardingGreeting(
  comment: IssueComment & { runId?: string | null },
  issue: OnboardingTaskContext | null,
  agentName: string | null | undefined,
  t: TFunction,
): string {
  if (!belongsToOnboardingTask(comment, issue)
    || comment.authorType !== "agent" || !comment.authorAgentId || comment.authorUserId
    || comment.runId || comment.createdByRunId || comment.deletedAt
    || comment.metadata?.authorizationReason !== "onboarding first-task greeting"
    || !Number.isFinite(new Date(comment.createdAt).getTime())
    || new Date(comment.createdAt).getTime() !== new Date(comment.updatedAt).getTime()
  ) return comment.body;
  const name = agentName?.trim();
  const english = `Welcome to Paperclip! I'm ${name ? `${name}, ` : ""}your first agent teammate. Pick how you'd like to start and I'll take it from there.`;
  const russian = `Добро пожаловать в Paperclip! Я — ${name ? `${name}, ` : ""}ваш первый агент. Выберите, с чего начать, и я помогу с дальнейшими шагами.`;
  if (comment.body !== english && comment.body !== russian) return comment.body;
  return name ? t("onboardingGap.greetingNamed", { agentName: name }) : t("onboardingGap.greetingUnnamed");
}

// Frozen copies identify these specific server-owned seed versions. Do not use the
// current translation catalog as a matcher: an upstream copy change must fail closed.
const knownQuestionCopy = [
  {
    prompt: "What would you like to do?", submitLabel: "Continue",
    interviewLabel: "Interview me and propose a plan and an agent team to execute it.",
    interviewDescription: "A few questions about what you're building, then a short plan and the team to carry it out, for you to approve.",
    taskLabel: "I have a task in mind", taskDescription: "Describe it and I'll propose how to get it done.",
  },
  {
    prompt: "С чего начнём?", submitLabel: "Продолжить",
    interviewLabel: "Задайте мне вопросы, затем предложите план и команду агентов.",
    interviewDescription: "Ответьте на несколько вопросов о своём проекте. Затем агент предложит короткий план и команду для вашего согласования.",
    taskLabel: "У меня уже есть задача", taskDescription: "Опишите её, и я предложу, как её выполнить.",
  },
];

function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left);
  const b = Object.keys(right);
  return a.length === b.length && a.every((key) => Object.hasOwn(right, key)
    && sameJson((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

/** Returns presentation only; action handlers must retain the original interaction. */
export function localizeOnboardingQuestion(
  interaction: AskUserQuestionsInteraction,
  issue: OnboardingTaskContext | null,
  t: TFunction,
): AskUserQuestionsPayload {
  const original = interaction.payload;
  if (!belongsToOnboardingTask(interaction, issue)
    || interaction.idempotencyKey !== `onboarding-first-task:${issue!.id}:opening-question`
    || !interaction.createdByAgentId || interaction.createdByUserId
    || interaction.sourceRunId || interaction.sourceCommentId || interaction.sourceIdentityContextId
    || interaction.title || interaction.summary
    || !knownQuestionCopy.some((copy) => sameJson(original, {
      version: 1, submitLabel: copy.submitLabel, supersedeOnUserComment: true,
      questions: [{ id: "first-task-opening", prompt: copy.prompt, helpText: null,
        selectionMode: "single", required: true,
        options: [
          { id: "interview", label: copy.interviewLabel, description: copy.interviewDescription },
          { id: "task", label: copy.taskLabel, description: copy.taskDescription, freeText: true },
        ],
      }],
    }))
  ) return original;
  return {
    ...original, submitLabel: t("onboardingGap.question.submit"),
    questions: original.questions.map((question) => ({
      ...question, prompt: t("onboardingGap.question.prompt"),
      options: question.options.map((option) => ({
        ...option,
        label: option.id === "interview" ? t("onboardingGap.question.interviewLabel") : t("onboardingGap.question.taskLabel"),
        description: option.id === "interview" ? t("onboardingGap.question.interviewDescription") : t("onboardingGap.question.taskDescription"),
      })),
    })),
  };
}
