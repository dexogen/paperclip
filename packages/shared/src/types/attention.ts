import type {
  IssueThreadInteractionCanonicalResolverPolicy,
  IssueThreadInteractionEffectiveResolverPolicySource,
  IssueThreadInteractionResolverPolicyProvenance,
} from "../constants.js";
import type { InboxDismissalKind } from "./inbox-dismissal.js";

export const ATTENTION_SOURCE_KINDS = [
  "approval",
  "decision",
  "issue_thread_interaction",
  "join_request",
  "recovery_action",
  // Legacy persisted decision sources remain readable; no feed items are generated.
  "productivity_review",
  "blocker_attention",
  "review",
  "failed_run",
  "budget_alert",
  "agent_error_alert",
] as const;

export type AttentionSourceKind = (typeof ATTENTION_SOURCE_KINDS)[number];

export type AttentionSubjectKind =
  | "approval"
  | "decision"
  | "issue"
  | "interaction"
  | "join_request"
  | "recovery_action"
  | "run"
  | "budget_incident"
  | "agent";

export type AttentionSeverity = "critical" | "high" | "medium" | "low";

type AttentionNoArgsMessage<Code extends string> = { code: Code; args?: never };

export type AttentionTitleMessage =
  | AttentionNoArgsMessage<
      | "title.approval.hireAgent"
      | "title.approval.ceoStrategy"
      | "title.approval.budgetOverride"
      | "title.approval.boardApproval"
      | "title.interaction.confirmation"
      | "title.interaction.checkbox"
      | "title.interaction.questions"
      | "title.interaction.tasks"
      | "title.interaction.verdicts"
      | "title.interaction.generic"
      | "title.join.agent"
      | "title.join.human"
    >
  | { code: "title.planApproval"; args: { issueTitle: string } }
  | { code: "title.run.failed"; args: { agentName: string } }
  | { code: "title.run.timedOut"; args: { agentName: string } }
  | { code: "title.budget.hardStop"; args: { scopeName: string } }
  | { code: "title.budget.warning"; args: { scopeName: string } };

export type AttentionWhyNowMessage =
  | AttentionNoArgsMessage<
      | "why.approval.pending"
      | "why.interaction.confirmation"
      | "why.interaction.checkbox"
      | "why.interaction.questions"
      | "why.interaction.tasks"
      | "why.interaction.verdicts"
      | "why.interaction.generic"
      | "why.decision.pending"
      | "why.join.pending"
      | "why.recovery.escalated"
      | "why.recovery.assigned"
      | "why.review.stalled"
      | "why.review.approval"
      | "why.review.participant"
      | "why.review.assigned"
      | "why.run.exhausted"
      | "why.budget.hardStop"
      | "why.budget.warning"
      | "why.agent.error"
    >
  | { code: "why.blocker.needsAttention"; args: { count: number } }
  | { code: "why.blocker.stalled"; args: { count: number } };

export type AttentionVerbLabelMessage =
  | AttentionNoArgsMessage<
      | "verb.respond"
      | "verb.confirm"
      | "verb.decline"
      | "verb.accept"
      | "verb.reject"
      | "verb.approve"
      | "verb.requestRevision"
      | "verb.review"
      | "verb.resolve"
      | "verb.reassign"
      | "verb.cancel"
      | "verb.unblock"
      | "verb.nudge"
      | "verb.chooseReviewPath"
      | "verb.requestChanges"
      | "verb.retry"
      | "verb.dismiss"
      | "verb.raiseBudget"
      | "verb.keepPaused"
      | "verb.inspect"
    >;

export type AttentionVerbDescriptionMessage =
  | AttentionNoArgsMessage<
      | "description.questions.respond"
      | "description.confirmation.accept"
      | "description.confirmation.reject"
      | "description.interaction.accept"
      | "description.interaction.reject"
      | "description.approval.approve"
      | "description.approval.reject"
      | "description.approval.revision"
      | "description.decision.review"
      | "description.join.approve"
      | "description.join.reject"
      | "description.recovery.resolve"
      | "description.recovery.reassign"
      | "description.recovery.cancel"
      | "description.blocker.route"
      | "description.blocker.repair"
      | "description.blocker.reassign"
      | "description.blocker.nudge"
      | "description.review.path"
      | "description.review.changes"
      | "description.review.approve"
      | "description.run.retry"
      | "description.run.reassign"
      | "description.run.dismiss"
      | "description.budget.raise"
      | "description.budget.keepPaused"
      | "description.agent.inspect"
      | "description.agent.dismiss"
    >;

export type AttentionPlanTitleMessage =
  | AttentionNoArgsMessage<
      | "detail.plan.defaultTitle"
    >;

export type AttentionJoinTitleMessage = AttentionNoArgsMessage<"title.join.agent" | "title.join.human">;

export type AttentionDisplayMessage =
  | AttentionTitleMessage
  | AttentionWhyNowMessage
  | AttentionVerbLabelMessage
  | AttentionVerbDescriptionMessage
  | AttentionPlanTitleMessage;

export interface AttentionSubject {
  kind: AttentionSubjectKind;
  id: string;
  companyId: string;
  title: string | null;
  identifier: string | null;
  status: string | null;
  href: string | null;
  metadata?: Record<string, unknown>;
  display?: { title?: AttentionTitleMessage };
}

export interface AttentionDecisionVerb {
  id: string;
  label: string;
  description: string | null;
  display?: { label?: AttentionVerbLabelMessage; description?: AttentionVerbDescriptionMessage };
}

export interface AttentionProjectRef {
  id: string;
  name: string;
  urlKey: string;
  color: string | null;
  icon: string | null;
}

export interface AttentionWorkspaceRef {
  id: string;
  name: string;
}

export interface AttentionQueueRef {
  key: string;
  title: string;
}

export interface AttentionTriageAttribution {
  type: "agent" | "user";
  agentId: string | null;
  agentName: string | null;
  userId: string | null;
  runId: string | null;
  responsibleUserId: string | null;
  updatedAt: string;
}

export type AttentionSortMode = "activity" | "decide";

export interface AttentionFeedQuery {
  includeDismissed?: boolean;
  archived?: boolean;
  /** Return the complete filtered snapshot in one response. */
  all?: boolean;
  activitySince?: string;
  activityUntil?: string;
  queue?: string;
  sort?: AttentionSortMode;
  cursor?: string;
  limit?: number;
}

export interface AttentionDetailImage {
  assetId: string;
  alt?: string | null;
}

export interface AttentionItemDismissal {
  kind: InboxDismissalKind;
  dismissedAt: string;
  snoozedUntil: string | null;
  isActive: boolean;
}

export type AttentionItemDetail =
  | {
      kind: "approval";
      approvalType: string;
      summaryExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "plan_approval";
      display?: { planTitle?: AttentionPlanTitleMessage };
      issueTitle: string | null;
      planTitle: string | null;
      summaryExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "confirmation";
      promptExcerpt: string | null;
      isPlanTarget: false;
      images: AttentionDetailImage[];
    }
  | {
      kind: "questions";
      questionCount: number;
      firstQuestionText: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "suggested_tasks";
      taskCount: number;
      firstTaskTitle: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "checkbox_confirmation";
      optionCount: number;
      promptExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "item_verdicts";
      itemCount: number;
      promptExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "failed_run";
      agentName: string | null;
      failureReasonExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "blocker";
      blockingIssue: {
        id: string | null;
        identifier: string | null;
        title: string | null;
      } | null;
      blockedTaskCount?: number;
      images: AttentionDetailImage[];
    }
  | {
      kind: "budget";
      observedPercent: number;
      amountObserved: number;
      amountLimit: number;
      images: AttentionDetailImage[];
    }
  | {
      kind: "agent_error";
      agentName: string | null;
      failureReasonExcerpt: string | null;
      images: AttentionDetailImage[];
    }
  | {
      kind: "generic";
      display?: { summaryExcerpt?: AttentionJoinTitleMessage };
      summaryExcerpt: string | null;
      images: AttentionDetailImage[];
    };

/**
 * Who may resolve an issue-thread interaction, as the server evaluated it
 * (PAP-17287). A collapsed attention row carries decision buttons before the
 * full interaction is ever fetched, so the audience has to travel with the feed
 * item — otherwise the queue asks for a decision without saying whose it is.
 *
 * These are *facts*, not copy: the canonical policy the resolution evaluator
 * will apply plus the identities it will compare against. Presentation layers
 * turn them into a sentence; nothing here grants or withholds capability, which
 * the server re-checks at use time.
 */
export interface AttentionResolverAudience {
  /** Canonical policy the creator asked for, before caps and clamps. */
  requestedResolverPolicy: IssueThreadInteractionCanonicalResolverPolicy;
  /** Canonical policy the server will actually enforce. */
  effectiveResolverPolicy: IssueThreadInteractionCanonicalResolverPolicy;
  /** Why the effective policy differs from the requested one, if it does. */
  effectiveResolverPolicySource: IssueThreadInteractionEffectiveResolverPolicySource;
  /** Whether the requested policy was explicit, inherited, or pre-migration. */
  resolverPolicyProvenance: IssueThreadInteractionResolverPolicyProvenance;
  /** Agent the card is addressed to, when it names one. */
  addresseeAgentId: string | null;
  /** User the card is addressed to, when it names one. */
  addresseeUserId?: string | null;
  /** Display name of the agent addressee, resolved server-side. */
  addresseeName: string | null;
  /** Agent that created the card, excluded when the policy is `not_creator`. */
  createdByAgentId: string | null;
  /** Display name of {@link createdByAgentId}, resolved server-side. */
  createdByAgentName: string | null;
}

export interface AttentionItem {
  id: string;
  companyId: string;
  sourceKind: AttentionSourceKind;
  subject: AttentionSubject;
  whyNow: string;
  display?: { whyNow?: AttentionWhyNowMessage };
  decisionVerbs: AttentionDecisionVerb[];
  inlineResolvable: boolean;
  entryRule: string;
  exitRule: string;
  dedupKey: string;
  dismissalKey: string;
  dismissal: AttentionItemDismissal | null;
  severity: AttentionSeverity;
  rank: number;
  activityAt: string;
  createdAt: string;
  updatedAt: string;
  relatedIssue: AttentionSubject | null;
  project: AttentionProjectRef | null;
  workspace: AttentionWorkspaceRef | null;
  expiresAt: string | null;
  ruleKey: string | null;
  originAgentName: string | null;
  queues: AttentionQueueRef[];
  shelf: boolean;
  retentionDays: number;
  keep: boolean;
  archivedAt: string | null;
  retentionVersion: number;
  decideBy: string | null;
  decideByAttribution: AttentionTriageAttribution | null;
  snoozedUntil: string | null;
  detail: AttentionItemDetail | null;
  trainingExampleId: string | null;
  /**
   * Set for `issue_thread_interaction` rows only. Absent on every other source
   * kind, whose decisions are not governed by a resolver policy.
   */
  resolverAudience?: AttentionResolverAudience | null;
}

export interface AttentionFeed {
  companyId: string;
  generatedAt: string;
  totalCount: number;
  /**
   * The sidebar badge: distinct items that either surfaced today ("new today")
   * or carry an explicit decide-by deadline that is due today/past ("overdue").
   * Computed before pagination so a small first page still reflects the
   * company-wide load. The desk no longer editorializes about what "can wait".
   */
  deskBadgeCount: number;
  nextCursor: string | null;
  countsBySourceKind: Record<AttentionSourceKind, number>;
  items: AttentionItem[];
}
