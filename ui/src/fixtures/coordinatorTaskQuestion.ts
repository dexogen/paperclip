import { t as translateUi } from "@/i18n";
import type { AttentionItem } from "@paperclipai/shared";
import { pendingAskUserQuestionsInteraction } from "./issueThreadInteractionFixtures";

export const coordinatorTaskQuestion = {
  ...pendingAskUserQuestionsInteraction,
  id: "task-audience-question", issueId: "task-launch", get title() { return translateUi("interfaceUpdates.who_should_the_launch_post_help_0b95299e"); },
  summary: "The draft needs an audience before its examples and success criteria can be chosen.",
  payload: { version: 1 as const, get title() { return translateUi("interfaceUpdates.who_should_the_launch_post_help_0b95299e"); }, get submitLabel() { return translateUi("interfaceUpdates.confirm_audience_86f2cc47"); }, questions: [{
    id: "audience", prompt: "Who is the primary reader?", selectionMode: "single" as const, required: true,
    options: [{ id: "operators", get label() { return translateUi("interfaceUpdates.people_setting_up_agents_70f8dfb6"); }, get description() { return translateUi("interfaceUpdates.explain_how_to_choose_access_for_their_team_36c07ea2"); } },
      { id: "teammates", get label() { return translateUi("interfaceUpdates.teammates_using_agents_0c3125b7"); }, get description() { return translateUi("interfaceUpdates.explain_what_they_can_do_with_the_connected_tools_5497530b"); } }],
  }] },
};

export const coordinatorTaskQuestionAttention: AttentionItem = {
  id: `issue_thread_interaction:${coordinatorTaskQuestion.id}`, companyId: coordinatorTaskQuestion.companyId,
  sourceKind: "issue_thread_interaction", subject: { kind: "interaction", id: coordinatorTaskQuestion.id,
    companyId: coordinatorTaskQuestion.companyId, title: coordinatorTaskQuestion.title, identifier: null, status: "pending",
    href: `/issues/PAPER-102#interaction-${coordinatorTaskQuestion.id}` },
  relatedIssue: { kind: "issue", id: coordinatorTaskQuestion.issueId, companyId: coordinatorTaskQuestion.companyId,
    get title() { return translateUi("interfaceUpdates.write_the_launch_post_a0c36928"); }, identifier: "PAPER-102", status: "blocked", href: "/issues/PAPER-102" },
  whyNow: "The task needs an audience.", decisionVerbs: [], inlineResolvable: true, entryRule: "pending", exitRule: "answered",
  dedupKey: coordinatorTaskQuestion.id, dismissalKey: coordinatorTaskQuestion.id, dismissal: null, severity: "medium", rank: 1,
  activityAt: new Date(coordinatorTaskQuestion.createdAt).toISOString(), createdAt: new Date(coordinatorTaskQuestion.createdAt).toISOString(), updatedAt: new Date(coordinatorTaskQuestion.updatedAt).toISOString(),
  project: null, workspace: null, expiresAt: null, ruleKey: null, originAgentName: "Mira", queues: [], shelf: false,
  retentionDays: 0, keep: false, archivedAt: null, retentionVersion: 1, decideBy: null, decideByAttribution: null,
  snoozedUntil: null, detail: { kind: "questions", questionCount: 1, firstQuestionText: "Who is the primary reader?", images: [] }, trainingExampleId: null,
};
