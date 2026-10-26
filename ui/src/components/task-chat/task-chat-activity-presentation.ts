import { formatTaskChatResource } from "./task-chat-adapter";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Box,
  Clock3,
  Database,
  FileCheck2,
  FilePenLine,
  FileText,
  GitBranch,
  Info,
  ListChecks,
  PackageCheck,
  Search,
  ShieldCheck,
  TerminalSquare,
  Users,
} from "lucide-react";
import type {
  TaskChatMaterializedResourceItem,
  TaskChatProtocolItem,
  TaskChatProviderActivityItem,
  TaskChatWorkspaceChangeItem,
  TaskChatWorkspaceFileItem,
} from "./task-chat-model";
import {
  humanizeToolName,
  isGenericToolName,
  mcpToolIdentity,
  toolActivityPresentation,
  type ToolIcon,
} from "./tool-taxonomy";

export interface TaskChatActivityPresentation {
  icon: ToolIcon;
  runningLabel: string;
  completedLabel: string;
  failedLabel?: string;
  interruptedLabel?: string;
  detail?: string;
}

export function providerNoticeSeverity(item: TaskChatProviderActivityItem): "info" | "warning" | "error" {
  const severity = item.details.find((entry) => entry.label === "Severity")?.value;
  if (item.status === "failed" || severity === "error") return "error";
  return severity === "info" ? "info" : "warning";
}

function providerDetail(item: TaskChatProviderActivityItem, ...labels: string[]): string | undefined {
  return item.details.find((entry) => labels.includes(entry.label))?.value;
}

function meaningfulToolDetail(value: string | undefined): string | undefined {
  if (!value || isGenericToolName(value) || /^tool(?:\s+|_)call\b/i.test(value)) return undefined;
  return value;
}

export function providerActivityPresentation(item: TaskChatProviderActivityItem, t: TFunction = i18n.getFixedT("en")): TaskChatActivityPresentation {
  const detail = item.summary
    ?? providerDetail(item, "Query", "URL", "Target", "Name", "Reference", "Reason", "Summary");
  switch (item.family) {
    case "research": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "open_page") {
        return { icon: Search, runningLabel: t("runUi.activity.openPage.running"), completedLabel: t("runUi.activity.openPage.completed"), failedLabel: t("runUi.activity.openPage.failed"), interruptedLabel: t("runUi.activity.openPage.interrupted"), detail };
      }
      if (action === "find_in_page") {
        return { icon: Search, runningLabel: t("runUi.activity.findPage.running"), completedLabel: t("runUi.activity.findPage.completed"), failedLabel: t("runUi.activity.findPage.failed"), interruptedLabel: t("runUi.activity.findPage.interrupted"), detail };
      }
      return { icon: Search, runningLabel: t("runUi.activity.web.running"), completedLabel: t("runUi.activity.web.completed"), failedLabel: t("runUi.activity.web.failed"), interruptedLabel: t("runUi.activity.web.interrupted"), detail };
    }
    case "tool_execution": {
      const name = providerDetail(item, "Name");
      const target = providerDetail(item, "Target");
      const progress = providerDetail(item, "Progress");
      const tool = toolActivityPresentation({
        name,
        transport: providerDetail(item, "Transport"),
        namespace: providerDetail(item, "Namespace"),
        operation: providerDetail(item, "Operation"),
        target,
        progress,
      });
      const boundedActivity = meaningfulToolDetail(item.summary)
        ?? meaningfulToolDetail(progress)
        ?? meaningfulToolDetail(target);
      const activityIsIdentity = Boolean(
        boundedActivity && name && humanizeToolName(boundedActivity) === humanizeToolName(name),
      );
      const technicalName = name ? mcpToolIdentity(name)?.name ?? name : tool.displayName;
      const source = tool.sourceLabel
        ? `${tool.sourceLabel} · ${technicalName}`
        : name && !isGenericToolName(name) && humanizeToolName(name) !== tool.runningLabel.replace(/^Running /, "")
          ? name
          : undefined;
      const display = toolActivityPresentation({ name, transport: providerDetail(item, "Transport"), namespace: providerDetail(item, "Namespace"), operation: providerDetail(item, "Operation"), target, progress }, t);
      return {
        icon: tool.icon,
        runningLabel: display.runningLabel,
        completedLabel: display.completedLabel,
        failedLabel: display.failedLabel,
        interruptedLabel: display.interruptedLabel,
        detail: [activityIsIdentity ? undefined : boundedActivity, source].filter(Boolean).join(" · ") || undefined,
      };
    }
    case "plan":
      return { icon: ListChecks, runningLabel: t("runUi.activity.plan.running"), completedLabel: t("runUi.activity.plan.completed"), failedLabel: t("runUi.activity.plan.failed"), interruptedLabel: t("runUi.activity.plan.interrupted"), detail };
    case "delegation": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "message") return { icon: Users, runningLabel: t("runUi.activity.messageAgent.running"), completedLabel: t("runUi.activity.messageAgent.completed"), failedLabel: t("runUi.activity.messageAgent.failed"), interruptedLabel: t("runUi.activity.messageAgent.interrupted"), detail };
      if (action === "resume") return { icon: Users, runningLabel: t("runUi.activity.resumeAgent.running"), completedLabel: t("runUi.activity.resumeAgent.completed"), failedLabel: t("runUi.activity.resumeAgent.failed"), interruptedLabel: t("runUi.activity.resumeAgent.interrupted"), detail };
      if (action === "close") return { icon: Users, runningLabel: t("runUi.activity.closeAgent.running"), completedLabel: t("runUi.activity.closeAgent.completed"), failedLabel: t("runUi.activity.closeAgent.failed"), interruptedLabel: t("runUi.activity.closeAgent.interrupted"), detail };
      if (action === "wait") return { icon: Users, runningLabel: t("runUi.activity.waitAgents.running"), completedLabel: t("runUi.activity.waitAgents.completed"), failedLabel: t("runUi.activity.waitAgents.failed"), interruptedLabel: t("runUi.activity.waitAgents.interrupted"), detail };
      return { icon: Users, runningLabel: t("runUi.activity.startAgent.running"), completedLabel: t("runUi.activity.startAgent.completed"), failedLabel: t("runUi.activity.startAgent.failed"), interruptedLabel: t("runUi.activity.startAgent.interrupted"), detail };
    }
    case "model_identity":
      return item.eventType === "model.route.changed"
        ? { icon: Bot, runningLabel: t("runUi.activity.switchModel.running"), completedLabel: t("runUi.activity.switchModel.completed"), failedLabel: t("runUi.activity.switchModel.failed"), interruptedLabel: t("runUi.activity.switchModel.interrupted"), detail }
        : { icon: Bot, runningLabel: t("runUi.activity.verifyModel.running"), completedLabel: t("runUi.activity.verifyModel.completed"), failedLabel: t("runUi.activity.verifyModel.failed"), interruptedLabel: t("runUi.activity.verifyModel.interrupted"), detail };
    case "context":
      return { icon: Database, runningLabel: t("runUi.activity.context.running"), completedLabel: t("runUi.activity.context.completed"), failedLabel: t("runUi.activity.context.failed"), interruptedLabel: t("runUi.activity.context.interrupted"), detail };
    case "artifact": {
      const viewed = item.eventType === "artifact.viewed";
      return viewed
        ? { icon: Box, runningLabel: t("runUi.activity.viewArtifact.running"), completedLabel: t("runUi.activity.viewArtifact.completed"), failedLabel: t("runUi.activity.viewArtifact.failed"), interruptedLabel: t("runUi.activity.viewArtifact.interrupted"), detail }
        : { icon: Box, runningLabel: t("runUi.activity.generateArtifact.running"), completedLabel: t("runUi.activity.generateArtifact.completed"), failedLabel: t("runUi.activity.generateArtifact.failed"), interruptedLabel: t("runUi.activity.generateArtifact.interrupted"), detail };
    }
    case "review": {
      const state = providerDetail(item, "State")?.toLowerCase();
      return state === "exited"
        ? { icon: FileCheck2, runningLabel: t("runUi.activity.leaveReview.running"), completedLabel: t("runUi.activity.leaveReview.completed"), failedLabel: t("runUi.activity.leaveReview.failed"), interruptedLabel: t("runUi.activity.leaveReview.interrupted"), detail }
        : { icon: FileCheck2, runningLabel: t("runUi.activity.enterReview.running"), completedLabel: t("runUi.activity.enterReview.completed"), failedLabel: t("runUi.activity.enterReview.failed"), interruptedLabel: t("runUi.activity.enterReview.interrupted"), detail };
    }
    case "hook":
      return { icon: GitBranch, runningLabel: t("runUi.activity.hook.running"), completedLabel: t("runUi.activity.hook.completed"), failedLabel: t("runUi.activity.hook.failed"), interruptedLabel: t("runUi.activity.hook.interrupted"), detail };
    case "memory":
      return { icon: BookOpen, runningLabel: t("runUi.activity.memory.running"), completedLabel: t("runUi.activity.memory.completed"), failedLabel: t("runUi.activity.memory.failed"), interruptedLabel: t("runUi.activity.memory.interrupted"), detail };
    case "safety":
      return { icon: ShieldCheck, runningLabel: t("runUi.activity.safety.running"), completedLabel: t("runUi.activity.safety.completed"), failedLabel: t("runUi.activity.safety.failed"), interruptedLabel: t("runUi.activity.safety.interrupted"), detail };
    case "terminal":
      return { icon: TerminalSquare, runningLabel: t("runUi.activity.terminal.running"), completedLabel: t("runUi.activity.terminal.completed"), failedLabel: t("runUi.activity.terminal.failed"), interruptedLabel: t("runUi.activity.terminal.interrupted"), detail };
    case "wait":
      return { icon: Clock3, runningLabel: t("runUi.activity.wait.running"), completedLabel: t("runUi.activity.wait.completed"), failedLabel: t("runUi.activity.wait.failed"), interruptedLabel: t("runUi.activity.wait.interrupted"), detail };
    case "provider_notice":
      return { icon: providerNoticeSeverity(item) === "info" ? Info : AlertTriangle, runningLabel: t("runUi.activity.notice.running"), completedLabel: t("runUi.activity.notice.completed"), failedLabel: t("runUi.activity.notice.failed"), interruptedLabel: t("runUi.activity.notice.interrupted"), detail };
  }
}

function workspaceChangePresentation(item: TaskChatWorkspaceChangeItem, t: TFunction): TaskChatActivityPresentation {
  const count = item.totals.files || item.files.length;
  const detail = count > 0 ? t("runUi.activity.files", { count }) : undefined;
  return { icon: FilePenLine, runningLabel: t("runUi.activity.editing"), completedLabel: t("runUi.activity.edited"), detail };
}

function workspaceFilePresentation(item: TaskChatWorkspaceFileItem, t: TFunction): TaskChatActivityPresentation {
  return {
    icon: FileText,
    runningLabel: t("runUi.activity.referencing"),
    completedLabel: t("runUi.activity.referenced"),
    detail: item.line == null ? item.path : `${item.path}:${item.line}`,
  };
}

function resourcePresentation(item: TaskChatMaterializedResourceItem, t: TFunction): TaskChatActivityPresentation {
  return {
    icon: item.resourceKind === "document" ? FileText : PackageCheck,
    runningLabel: t("runUi.activity.saving"),
    completedLabel: item.resourceKind === "document" ? t("runUi.activity.document") : t("runUi.activity.deliverable"),
    detail: formatTaskChatResource(item, t).title,
  };
}

export function protocolActivityPresentation(item: TaskChatProtocolItem, t: TFunction = i18n.getFixedT("en")): TaskChatActivityPresentation | null {
  switch (item.surface) {
    case "provider_activity": return providerActivityPresentation(item, t);
    case "workspace_change": return workspaceChangePresentation(item, t);
    case "workspace_file": return workspaceFilePresentation(item, t);
    case "resource": return resourcePresentation(item, t);
    case "runtime_request":
    case "run_result":
    case "run_terminal":
      return null;
  }
}

export function protocolActivityIsRunning(item: TaskChatProtocolItem): boolean {
  if (item.surface === "provider_activity") return item.status === "running";
  if (item.surface === "workspace_change") return !item.complete;
  return false;
}

export function protocolActivityLabel(item: TaskChatProtocolItem, presentation: TaskChatActivityPresentation, t: TFunction = i18n.getFixedT("en")): string {
  if (item.surface !== "provider_activity") {
    return protocolActivityIsRunning(item) ? presentation.runningLabel : presentation.completedLabel;
  }
  if (item.status === "failed") return presentation.failedLabel ?? t("runUi.activity.failedFallback", { label: presentation.completedLabel });
  if (item.status === "interrupted") return presentation.interruptedLabel ?? t("runUi.activity.interruptedFallback", { label: presentation.completedLabel });
  return item.status === "running" ? presentation.runningLabel : presentation.completedLabel;
}
