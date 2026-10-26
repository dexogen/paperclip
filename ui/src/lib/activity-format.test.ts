import type { Agent } from "@paperclipai/shared";
import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { formatActivityVerb, formatIssueActivityAction } from "./activity-format";

describe("activity formatting", () => {
  const agentMap = new Map<string, Agent>([
    ["agent-reviewer", { id: "agent-reviewer", name: "Reviewer Bot" } as Agent],
    ["agent-approver", { id: "agent-approver", name: "Approver Bot" } as Agent],
  ]);

  it("labels a Slack settlement as idle while retaining actual review wording", () => {
    const details = { status: "in_review", externalConversationState: "waiting" };
    expect(formatActivityVerb("issue.updated", details)).toBe("changed status to idle on");
    expect(formatIssueActivityAction("issue.updated", details)).toBe("changed the status to idle");
    expect(formatActivityVerb("issue.updated", { status: "in_review" })).toBe("changed status to in review on");
  });

  it("uses readable verbs for task read-state changes", () => {
    expect(formatActivityVerb("issue.read_marked")).toBe("read");
    expect(formatActivityVerb("issue.read_unmarked")).toBe("marked unread");
  });

  it("formats blocker activity using linked issue identifiers", () => {
    const details = {
      addedBlockedByIssues: [
        { id: "issue-2", identifier: "PAP-22", title: "Blocked task" },
      ],
      removedBlockedByIssues: [],
    };

    expect(formatActivityVerb("issue.blockers_updated", details)).toBe("added blocker PAP-22 to");
    expect(formatIssueActivityAction("issue.blockers_updated", details)).toBe("added blocker PAP-22");
  });

  it("formats reviewer activity using agent names", () => {
    const details = {
      addedParticipants: [
        { type: "agent", agentId: "agent-reviewer", userId: null },
      ],
      removedParticipants: [],
    };

    expect(formatActivityVerb("issue.reviewers_updated", details, { agentMap })).toBe("added reviewer Reviewer Bot to");
    expect(formatIssueActivityAction("issue.reviewers_updated", details, { agentMap })).toBe("added reviewer Reviewer Bot");
  });

  it("formats approver removals using user-aware labels", () => {
    const details = {
      addedParticipants: [],
      removedParticipants: [
        { type: "user", agentId: null, userId: "local-board" },
      ],
    };

    expect(formatActivityVerb("issue.approvers_updated", details)).toBe("removed approver Board from");
    expect(formatIssueActivityAction("issue.approvers_updated", details)).toBe("removed approver Board");
  });

  it("falls back to updated wording when reviewers are both added and removed", () => {
    const details = {
      addedParticipants: [
        { type: "agent", agentId: "agent-reviewer", userId: null },
      ],
      removedParticipants: [
        { type: "agent", agentId: "agent-approver", userId: null },
      ],
    };

    expect(formatActivityVerb("issue.reviewers_updated", details, { agentMap })).toBe("updated reviewers on");
    expect(formatIssueActivityAction("issue.reviewers_updated", details, { agentMap })).toBe("updated reviewers");
  });

  it("formats monitor activity with direct verbs", () => {
    expect(formatActivityVerb("issue.monitor_scheduled")).toBe("scheduled monitor on");
    expect(formatActivityVerb("issue.monitor_exhausted")).toBe("exhausted monitor on");
    expect(formatIssueActivityAction("issue.monitor_triggered")).toBe("triggered a monitor");
    expect(formatIssueActivityAction("issue.monitor_cleared")).toBe("cleared a monitor");
    expect(formatIssueActivityAction("issue.monitor_recovery_issue_created")).toBe("created a monitor recovery issue");
  });

  it("labels each queued-comment queue mutation", () => {
    expect(formatActivityVerb("issue.queued_comment_edited")).toBe("edited a queued comment on");
    expect(formatActivityVerb("issue.queued_comments_reordered")).toBe("reordered queued comments on");
    expect(formatActivityVerb("issue.queued_comment_discarded")).toBe("discarded a queued comment on");
    expect(formatIssueActivityAction("issue.queued_comment_edited")).toBe("edited a queued comment");
    expect(formatIssueActivityAction("issue.queued_comments_reordered")).toBe("reordered queued comments");
    expect(formatIssueActivityAction("issue.queued_comment_discarded")).toBe("discarded a queued comment");
  });

  // PAP-16506 P4: agents can now resolve an interaction, including a review of
  // their own work, so an outcome has to read as an outcome in the timeline
  // instead of leaking the raw action id.
  it("reads an interaction outcome as an outcome, whoever gave it", () => {
    expect(formatIssueActivityAction("issue.thread_interaction_accepted")).toBe("accepted the request");
    expect(formatIssueActivityAction("issue.thread_interaction_rejected")).toBe("rejected the request");
    expect(formatIssueActivityAction("issue.thread_interaction_withdrawn")).toBe("withdrew the request");
    expect(formatIssueActivityAction("issue.thread_interaction_expired")).toBe("expired the request");
    expect(formatActivityVerb("issue.thread_interaction_accepted")).toBe("accepted the request on");
    expect(formatActivityVerb("issue.thread_interaction_rejected")).toBe("rejected the request on");
  });

  // The accepted/rejected actions fire for every interaction kind, so only a
  // confirmation may read as an approval.
  it("says 'approved' only for a confirmation, never for a suggestion or a question", () => {
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "request_confirmation" }))
      .toBe("approved the request");
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "request_checkbox_confirmation" }))
      .toBe("approved the request");
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "suggest_tasks" }))
      .toBe("accepted the task suggestions");
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "ask_user_questions" }))
      .toBe("accepted the answers");
    expect(formatIssueActivityAction("issue.thread_interaction_rejected", { interactionKind: "request_confirmation" }))
      .toBe("rejected the request");
    expect(formatIssueActivityAction("issue.thread_interaction_rejected", { interactionKind: "suggest_tasks" }))
      .toBe("declined the task suggestions");
    expect(formatActivityVerb("issue.thread_interaction_accepted", { interactionKind: "suggest_tasks" }))
      .toBe("accepted the task suggestions on");
  });

  it("keeps the neutral wording for a kind it does not know", () => {
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "request_item_verdicts" }))
      .toBe("accepted the request");
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: "future_kind" }))
      .toBe("accepted the request");
    expect(formatIssueActivityAction("issue.thread_interaction_accepted", { interactionKind: 7 }))
      .toBe("accepted the request");
  });

  it("names the verb an actor chose on a stalled review", () => {
    expect(formatIssueActivityAction("issue.stalled_review_decided", { action: "approve" }))
      .toBe("approved the review");
    expect(formatIssueActivityAction("issue.stalled_review_decided", { action: "request_changes" }))
      .toBe("requested changes on the review");
    expect(formatIssueActivityAction("issue.stalled_review_decided", { action: "send_back" }))
      .toBe("sent the review back to work");
    expect(formatActivityVerb("issue.stalled_review_decided", { action: "approve" }))
      .toBe("approved the review on");
  });

  it("falls back to a generic verdict line when the decision verb is missing", () => {
    expect(formatIssueActivityAction("issue.stalled_review_decided")).toBe("recorded a review verdict");
    expect(formatIssueActivityAction("issue.stalled_review_decided", { action: "shrug" }))
      .toBe("recorded a review verdict");
  });

  it("describes a review-policy change without calling the default 'none'", () => {
    expect(formatIssueActivityAction("issue.updated", { reviewPolicy: null }))
      .toBe("changed who can approve to anyone");
    expect(formatIssueActivityAction("issue.updated", { reviewPolicy: "human_only" }))
      .toBe("changed who can approve to human only");
    expect(formatIssueActivityAction("issue.updated", { reviewPolicy: "not_creator" }))
      .toBe("changed who can approve to anyone else");
  });

  it("uses plain next-step copy for successful-run handoff activity", () => {
    expect(formatActivityVerb("issue.successful_run_handoff_required")).toBe("flagged missing next step on");
    expect(formatIssueActivityAction("issue.successful_run_handoff_required")).toBe("Run finished without a clear next step");
    expect(formatIssueActivityAction("issue.successful_run_handoff_resolved")).toBe("Next step chosen");
    expect(formatIssueActivityAction("issue.successful_run_handoff_escalated")).toBe(
      "Run finished without a next step - recovery escalated",
    );
  });
});


describe("localized activity presentation", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });

  it("localizes legacy task history with the caller translator while preserving source names and details", () => {
    const ru = i18n.getFixedT("ru");
    const details = { status: "in_review", externalConversationState: "waiting", _previous: { status: "in_progress" }, assigneeUserId: "literal-name" };
    const snapshot = JSON.stringify(details);
    const options = { userProfileMap: new Map([["literal-name", { label: "You <em>raw</em>", image: null }]]) };
    const result = formatIssueActivityAction("issue.updated", details, options, ru);
    expect(result).toContain('изменил статус с «В работе» на «Ожидает»');
    expect(result).toContain('назначил ответственным за задачу: You <em>raw</em>');
    expect(JSON.stringify(details)).toBe(snapshot);
    expect(formatIssueActivityAction("issue.updated", details, options)).toContain("changed the status from in progress to idle");
    expect(formatIssueActivityAction("issue.updated", { reviewPolicy: null }, {}, ru)).toBe("изменил правило согласования: кто угодно");
    expect(formatIssueActivityAction("issue.updated", { reviewPolicy: "human_only" }, {}, ru)).toBe("изменил правило согласования: только человек");
    expect(formatIssueActivityAction("issue.document_created", { key: "plan", title: "User title" }, {}, ru)).toContain("plan (User title)");
  });

  it("uses whole legacy relation messages and plural forms for task history", () => {
    const ru = i18n.getFixedT("ru");
    const options = { userProfileMap: new Map([["user-1", { label: "Board", image: null }]]) };
    expect(formatIssueActivityAction("issue.reviewers_updated", { addedParticipants: [{ type: "user", userId: "user-1" }] }, options, ru)).toBe('добавил проверяющего «Board»');
    for (const [count, expected] of [[2, "добавил 2 блокирующие задачи"], [5, "добавил 5 блокирующих задач"], [21, "добавил 21 блокирующую задачу"]] as const) {
      expect(formatIssueActivityAction("issue.blockers_updated", { addedBlockedByIssues: Array.from({ length: count }, (_, i) => ({ identifier: `TASK-${i}` })) }, {}, ru)).toBe(expected);
    }
    expect(formatIssueActivityAction("issue.accepted_plan_decomposition_updated", { status: "completed", childIssueIds: ["a", "b"], newlyCreatedChildIssueIds: ["a"] }, {}, ru)).toBe("декомпозиция завершена (создано новых задач: 1, использовано существующих задач: 1)");
  });

  it("translates selected event semantics while legacy consumers stay in English", async () => {
    await i18n.changeLanguage("ru");
    const ru = i18n.getFixedT("ru");
    const settled = { status: "in_review", externalConversationState: "waiting", _previous: { status: "in_progress" } };
    expect(formatActivityVerb("issue.updated", settled, {}, ru)).toBe("изменил статус с «В работе» на «Ожидает» у");
    expect(formatActivityVerb("issue.updated", settled)).toBe("changed status from in progress to idle on");
    expect(formatIssueActivityAction("issue.updated", settled)).toBe("changed the status from in progress to idle");
    expect(formatActivityVerb("issue.thread_interaction_accepted", { interactionKind: "request_confirmation" }, {}, ru)).toBe("подтвердил запрос по");
    expect(formatActivityVerb("issue.thread_interaction_accepted", { interactionKind: "suggest_tasks" }, {}, ru)).toBe("принял предложенные задачи по");
    expect(formatActivityVerb("issue.thread_interaction_accepted", { interactionKind: "future_kind" }, {}, ru)).toBe("принял запрос по");
    expect(formatActivityVerb("issue.stalled_review_decided", { action: "send_back" }, {}, ru)).toBe("вернул в работу после проверки");
    expect(formatActivityVerb("issue.updated", { priority: "future_priority" }, {}, ru)).toBe("изменил приоритет на «future priority» у");
    expect(formatActivityVerb("future.action_name", null, {}, ru)).toBe("future action name");
    expect(formatActivityVerb("toString", null, {}, ru)).toBe("toString");
    expect(formatActivityVerb("issue.thread_interaction_accepted", { interactionKind: "toString" }, {}, ru)).toBe("принял запрос по");
  });
  it("keeps named participants literal and uses whole relation count messages", () => {
    const ru = i18n.getFixedT("ru");
    const options = { userProfileMap: new Map([["named-you", { label: "You", image: null }], ["named-board", { label: "Board <em>raw</em>", image: null }]]), currentUserId: "current-user" };
    const participant = (userId: string) => ({ type: "user", userId });
    expect(formatActivityVerb("issue.reviewers_updated", { addedParticipants: [participant("named-you")] }, options, ru)).toBe('добавил проверяющего «You» для');
    expect(formatActivityVerb("issue.approvers_updated", { removedParticipants: [participant("named-board")] }, options, ru)).toBe('убрал согласующего «Board <em>raw</em>» у');
    expect(formatActivityVerb("issue.reviewers_updated", { addedParticipants: [participant("current-user")] }, options, ru)).toBe('добавил проверяющего «Вы» для');
    expect(formatActivityVerb("issue.reviewers_updated", { addedParticipants: [participant("local-board")] }, options, ru)).toBe('добавил проверяющего «Оператор» для');
    const nouns = [
      [2, "блокирующие задачи", "проверяющих", "согласующих"],
      [5, "блокирующих задач", "проверяющих", "согласующих"],
      [21, "блокирующую задачу", "проверяющего", "согласующего"],
    ] as const;
    for (const [count, blocker, reviewer, approver] of nouns) {
      const references = Array.from({ length: count }, (_, i) => ({ id: `issue-${i}`, identifier: `TASK-${i}` }));
      const participants = Array.from({ length: count }, (_, i) => participant(`user-${i}`));
      for (const [action, added, removed, values, noun] of [
        ["issue.blockers_updated", "addedBlockedByIssues", "removedBlockedByIssues", references, blocker],
        ["issue.reviewers_updated", "addedParticipants", "removedParticipants", participants, reviewer],
        ["issue.approvers_updated", "addedParticipants", "removedParticipants", participants, approver],
      ] as const) {
        expect(formatActivityVerb(action, { [added]: values, [removed]: [] }, options, ru)).toBe(`добавил ${count} ${noun} для`);
        expect(formatActivityVerb(action, { [added]: [], [removed]: values }, options, ru)).toBe(`убрал ${count} ${noun} у`);
      }
    }
    const details = { addedBlockedByIssues: [{ identifier: "TASK-1", title: "unselected raw title" }], removedBlockedByIssues: [] };
    expect(formatActivityVerb("issue.blockers_updated", details, options, ru)).toBe('добавил блокирующую задачу «TASK-1» для');
    expect(formatActivityVerb("issue.reviewers_updated", { addedParticipants: [participant("a")], removedParticipants: [participant("b")] }, options, ru)).toBe("обновил список проверяющих для");
    expect(formatIssueActivityAction("issue.blockers_updated", details, options)).toBe("added blocker TASK-1");
  });

  it("preserves tool provenance, raw normalization and source payloads", () => {
    const ru = i18n.getFixedT("ru");
    const details = { tool: "Provider.<strong>raw_name</strong>", upstreamToolName: "ignored", source: "test" };
    const before = JSON.stringify(details);
    expect(formatActivityVerb("tool_gateway.call_completed", details, {}, ru)).toBe('проверил «Provider <strong>raw name</strong>» для');
    expect(formatActivityVerb("tool_gateway.call_completed", { upstreamToolName: "an app action" }, {}, ru)).toBe('использовал «an app action» для');
    expect(formatActivityVerb("tool_gateway.call_completed", {}, {}, ru)).toBe('использовал «действие приложения» для');
    expect(formatActivityVerb("tool_gateway.call_allowed", { source: "test" }, {}, ru)).toBe('начал проверку «действие приложения» для');
    expect(formatActivityVerb("tool_gateway.call_allowed", {}, {}, ru)).toBe('получил разрешение использовать «действие приложения» для');
    expect(formatActivityVerb("tool_gateway.call_completed", details)).toBe("tested Provider <strong>raw name</strong> on");
    expect(JSON.stringify(details)).toBe(before);
  });

});
