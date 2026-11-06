import { i18n } from "@/i18n";
import type { TFunction } from "i18next";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Webhook } from "lucide-react";
import type { TaskChatProviderActivityItem } from "./task-chat-model";
import type { ToolIcon } from "./tool-taxonomy";

/**
 * Governance rows: automatic approval reviews and harness hooks. They render
 * as small grey activity rows so automatic decisions stay auditable. A row
 * that stopped the agent (denied, blocked, timed out) is tinted and carries
 * its reason on a second line, because that reason explains what the agent
 * did next.
 */
export type GovernanceTone = "neutral" | "blocked" | "failed";

export interface GovernancePresentation {
  icon: ToolIcon;
  label: string;
  detail?: string;
  tone: GovernanceTone;
  /** The provider's reason, shown under the row when the action was stopped. */
  note?: string;
}

function detail(item: TaskChatProviderActivityItem, label: string): string | undefined {
  const value = item.details.find((entry) => entry.label === label)?.value?.trim();
  return value ? value : undefined;
}

function joined(...parts: Array<string | undefined | null | false>): string | undefined {
  const value = parts.filter((part): part is string => Boolean(part)).join(" · ");
  return value || undefined;
}

/** "preToolUse" (Codex) and "PreToolUse" (Claude) both read as "PreToolUse". */
export function hookEventLabel(value: string | undefined): string | undefined {
  if (!value || value === "unknown") return undefined;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function durationLabel(value: string | undefined, t: TFunction): string | undefined {
  const ms = value ? Number(value) : Number.NaN;
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  return ms < 1000 ? t("runtimeUpdates.durationMs", { value: Math.round(ms) }) : t("runtimeUpdates.durationSeconds", { value: (ms / 1000).toFixed(1) });
}

function riskLabel(value: string | undefined, t: TFunction): string | undefined {
  if (!value) return undefined;
  let risk = value;
  switch (value) {
    case "low": risk = t("runtimeUpdates.riskLow"); break;
    case "medium": risk = t("runtimeUpdates.riskMedium"); break;
    case "high": risk = t("runtimeUpdates.riskHigh"); break;
    case "critical": risk = t("runtimeUpdates.riskCritical"); break;
  }
  return t("runtimeUpdates.risk", { risk });
}

function blockedSubject(eventName: string | undefined, t: TFunction): string {
  const event = eventName?.toLowerCase();
  if (event === "pretooluse" || event === "permissionrequest") return t("runtimeUpdates.toolCall");
  if (event === "userpromptsubmit") return t("runtimeUpdates.prompt");
  return t("runtimeUpdates.action");
}

function hookPresentation(item: TaskChatProviderActivityItem, t: TFunction): GovernancePresentation {
  const eventName = hookEventLabel(detail(item, "Event"));
  const subject = eventName ? t("runtimeUpdates.hookNamed", { event: eventName }) : t("runtimeUpdates.hook");
  const tool = detail(item, "Tool Name");
  const outcome = detail(item, "Outcome") ?? detail(item, "Status");
  const message = item.summary?.trim() || detail(item, "Message");
  const source = detail(item, "Source");
  const duration = durationLabel(detail(item, "Duration Ms"), t);
  // The run ended before the hook reported a result.
  if (item.status === "interrupted") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.value_stopped_without_a_result_ed4e4dd4", { value1: (subject) }), detail: joined(tool, source), tone: "neutral" };
  }
  if (item.status === "running" || outcome === "running") {
    return { icon: Webhook, label: eventName ? t("interfaceUpdates.running_value_hook_f308e083", { value1: (eventName) }) : t("runUi.activity.hook.running"), detail: joined(tool, source), tone: "neutral" };
  }
  if (outcome === "blocked") {
    return {
      icon: ShieldX,
      label: t("interfaceUpdates.value_blocked_value_faccf6ac", { value1: (subject), value2: (tool ?? blockedSubject(eventName, t)) }),
      detail: joined(source, duration),
      tone: "blocked",
      note: message,
    };
  }
  if (outcome === "stopped") {
    return { icon: ShieldX, label: t("interfaceUpdates.value_stopped_the_turn_10d704cf", { value1: (subject) }), detail: joined(source, duration), tone: "blocked", note: message };
  }
  if (outcome === "failed" || item.status === "failed") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.value_failed_31c1258c", { value1: (subject) }), detail: joined(source, duration), tone: "failed", note: message };
  }
  if (outcome === "feedback") {
    return { icon: Webhook, label: t("interfaceUpdates.value_sent_feedback_2558ba45", { value1: (subject) }), detail: joined(message, source), tone: "neutral" };
  }
  if (outcome === "context") {
    return { icon: Webhook, label: t("interfaceUpdates.value_added_context_e44367da", { value1: (subject) }), detail: joined(message, source), tone: "neutral" };
  }
  return { icon: Webhook, label: t("interfaceUpdates.value_ran_e3893e66", { value1: (subject) }), detail: joined(tool, source, duration), tone: "neutral" };
}

function safetyPresentation(item: TaskChatProviderActivityItem, t: TFunction): GovernancePresentation {
  const decision = detail(item, "Decision");
  const action = detail(item, "Action");
  const risk = riskLabel(detail(item, "Risk Level"), t);
  const rationale = item.summary?.trim() || detail(item, "Rationale");
  // The run ended before the reviewer reported a decision.
  if (item.status === "interrupted") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.auto_review_stopped_without_a_decision_26856667"), detail: action, tone: "neutral" };
  }
  if (item.status === "running" || decision === "pending") {
    return { icon: Shield, label: t("interfaceUpdates.auto_reviewing_5705699b"), detail: action, tone: "neutral" };
  }
  if (decision === "allowed") {
    return { icon: ShieldCheck, label: t("interfaceUpdates.auto_review_approved_5a48c6fa"), detail: joined(action, risk), tone: "neutral" };
  }
  if (decision === "denied") {
    return { icon: ShieldX, label: t("interfaceUpdates.auto_review_denied_34d0be71"), detail: joined(action, risk), tone: "blocked", note: rationale };
  }
  if (decision === "timed_out") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.auto_review_timed_out_c861a14a"), detail: action, tone: "blocked", note: rationale ?? t("runtimeUpdates.actionNotRun") };
  }
  if (decision === "aborted") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.auto_review_stopped_00a9f908"), detail: action, tone: "neutral" };
  }
  if (decision === "user_required") {
    return { icon: ShieldAlert, label: t("interfaceUpdates.auto_review_asked_for_approval_0f9c79ed"), detail: joined(action, risk), tone: "neutral", note: rationale };
  }
  return { icon: ShieldCheck, label: t("interfaceUpdates.auto_review_finished_2a7ffe23"), detail: action, tone: "neutral" };
}

export function governancePresentation(item: TaskChatProviderActivityItem, t: TFunction = i18n.getFixedT("en")): GovernancePresentation | null {
  if (item.family === "hook") return hookPresentation(item, t);
  if (item.family === "safety") return safetyPresentation(item, t);
  return null;
}
