import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useMemo } from "react";
import {
  humanizeConnectionDisplayName,
  type Agent,
  type ToolCallEvent,
  type ToolConnectionLifecycleEvent,
} from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/timeAgo";
import { appTabHref } from "../app-tabs";
import type { ActivityPanelProps } from "./types";

export function ActivityPanel(props: ActivityPanelProps) {
  useFullAppsTranslation();
  return <RecentActivity {...props} />;
}

type TimelineRow = {
  key: string;
  createdAt: Date | string;
  primary: string;
  dotClass: string;
  /** Secondary "while working on PAP-…" issue link, tool-call rows only. */
  issue?: { identifier: string } | null;
  /** Deep-link rendered after the timestamp, lifecycle rows only. */
  link?: { to: string; label: string } | null;
};

function RecentActivity({
  events,
  lifecycleEvents,
  issues,
  actionRequests,
  loading,
  agents,
  connectionId,
  appName,
  userLabelById,
}: ActivityPanelProps) {
  useFullAppsTranslation();
  const nameById = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);

  const rows = useMemo<TimelineRow[]>(() => {
    const callRows: TimelineRow[] = events
      .filter((e) => HUMANIZED_EVENTS.has(e.eventType))
      .map((event) => {
        const row = humanizeEvent(
          event,
          nameById.get(event.agentId ?? "") ?? null,
          event.actionRequestId ? actionRequests[event.actionRequestId] : undefined,
          isTestEvent(event) ? resolveActorLabel(event.actorId, userLabelById) : null,
        );
        return {
          key: `call:${event.id}`,
          createdAt: event.createdAt,
          primary: row.primary,
          dotClass: dotColor(event),
          issue: event.issueId ? issues[event.issueId] ?? null : null,
        };
      });

    const permissionsHref = appTabHref(connectionId, "permissions");
    const lifecycleRows: TimelineRow[] = lifecycleEvents.map((event) => ({
      key: `lifecycle:${event.id}`,
      createdAt: event.createdAt,
      primary: humanizeLifecycleEvent(event, appName, nameById.get(event.agentId ?? "") ?? null),
      dotClass: lifecycleDotColor(event),
      link: { to: permissionsHref, label: lifecycleLinkLabel(event) },
    }));

    return [...callRows, ...lifecycleRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [events, lifecycleEvents, issues, actionRequests, nameById, connectionId, appName, userLabelById]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{fullAppsT("fullApps.recent_activity_6cb44b")}</h2>
      </div>
      {loading ? (
        <div className="space-y-2 py-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-5 text-sm text-muted-foreground">{fullAppsT("fullApps.no_activity_yet_a288d2")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start gap-3 py-3 text-sm">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", row.dotClass)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-foreground">{row.primary}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.issue ? (
                    <>{fullAppsT("fullApps.while_working_on_74d62b")}{" "}
                      <Link
                        to={`/issues/${row.issue.identifier}`}
                        className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {row.issue.identifier}
                      </Link>
                      {" · "}
                    </>
                  ) : null}
                  {timeAgo(row.createdAt)}
                  {row.link ? (
                    <>
                      {" · "}
                      <Link
                        to={row.link.to}
                        className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {row.link.label}
                      </Link>
                    </>
                  ) : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const HUMANIZED_EVENTS = new Set<ToolCallEvent["eventType"]>([
  "call_completed",
  "call_failed",
  "call_denied",
  "approval_requested",
  "approval_resolved",
]);

/**
 * A row is a prosumer Test-tab call (vs. a real heartbeat-driven agent run) when
 * the gateway tagged the audit event `metadata.source === "test"` (PAP-11349).
 */
export function isTestEvent(event: ToolCallEvent): boolean {
  return (event.metadata as { source?: unknown } | null)?.source === "test";
}

/** Display name for the human who ran a Test-tab call, from the company directory. */
export function resolveActorLabel(
  actorId: string | null,
  userLabelById: Map<string, string> | undefined,
): string {
  if (actorId) {
    const label = userLabelById?.get(actorId);
    if (label) return label;
    if (actorId === "local-board") return fullAppsT("fullApps.copy_4816cbfd74aa");
  }
  return fullAppsT("fullApps.copy_864c855e3d64");
}

export function humanizeEvent(
  event: ToolCallEvent,
  agentName: string | null,
  actionRequest?: ActivityPanelProps["actionRequests"][string],
  /** When set, this row is a Test-tab call run by the named user; prefix accordingly. */
  testRunnerLabel?: string | null,
): { primary: string } {
  // For Test-tab calls, surface "<User> tested as <Agent>" so prosumer test runs are
  // distinguishable from real heartbeat agent activity in the audit trail (PAP-11415).
  const who = testRunnerLabel
    ? fullAppsT("fullApps.message_ae2ef5f7320b", { value1: testRunnerLabel, value2: agentName ?? fullAppsT("fullApps.copy_647936ec3e40") })
    : agentName ?? fullAppsT("fullApps.copy_ea6a03636c62");
  // The raw gateway tool name is prefixed (e.g. `mcp.app-gallery-link-…:kv-set`);
  // humanize it to "Kv Set" to match the cross-app Activity view (PAP-11105).
  const action = event.toolName ? humanizeConnectionDisplayName(event.toolName) : fullAppsT("fullApps.copy_a1d98dfadc18");
  switch (event.eventType) {
    case "call_completed":
      return {
        primary: event.outcome === "success"
          ? fullAppsT("fullApps.message_b3fa3ce10c3d", { value1: who, value2: action })
          : fullAppsT("fullApps.message_b0e5a4cf2d14", { value1: who, value2: action }),
      };
    case "call_failed":
      return { primary: fullAppsT("fullApps.message_6ec27974bfe6", { value1: action, value2: lower(who) }) };
    case "call_denied":
      return {
        primary: testRunnerLabel
          ? fullAppsT("fullApps.message_667e1a8a5a20", { value1: who, value2: action })
          : fullAppsT("fullApps.message_4f9d5a58b264", { value1: action }),
      };
    case "approval_requested":
      return { primary: fullAppsT("fullApps.message_bde577a9fa6f", { value1: who, value2: action }) };
    case "approval_resolved":
      return { primary: humanizeApprovalResolved(action, actionRequest) };
    default:
      return { primary: fullAppsT("fullApps.message_b3fa3ce10c3d", { value1: who, value2: action }) };
  }
}

function humanizeApprovalResolved(
  action: string,
  actionRequest?: ActivityPanelProps["actionRequests"][string],
): string {
  const resolver = actionRequest?.resolverDisplayName ?? fullAppsT("fullApps.copy_864c855e3d64");
  if (actionRequest?.status === "approved") return fullAppsT("fullApps.message_a316f47347e3", { value1: resolver, value2: action });
  if (actionRequest?.status === "rejected") return fullAppsT("fullApps.message_13ffdc15ad9f", { value1: resolver, value2: action });
  return fullAppsT("fullApps.message_47f20d29d5fb", { value1: resolver, value2: action });
}

/** Humanize a connection lifecycle event into a prosumer sentence (PAP-11284). */
function humanizeLifecycleEvent(
  event: ToolConnectionLifecycleEvent,
  appName: string,
  agentName: string | null,
): string {
  const who = event.actorDisplayName ?? agentName ?? fullAppsT("fullApps.copy_864c855e3d64");
  switch (event.type) {
    case "app_connected":
      return fullAppsT("fullApps.message_74f4fe5f0718", { value1: who, value2: appName });
    case "app_paused":
      return fullAppsT("fullApps.message_84ea7221e811", { value1: who });
    case "app_resumed":
      return fullAppsT("fullApps.message_e3988187437d", { value1: who });
    case "reconnected":
      return fullAppsT("fullApps.message_30736f0bba26", { value1: who, value2: appName });
    case "disconnected":
      return fullAppsT("fullApps.message_40b873f4d024", { value1: who, value2: appName });
    case "allowlist_changed":
      return humanizeAllowlistChange(who, event.details);
    case "actions_quarantined": {
      const count = numberFrom(event.details?.count);
      return fullAppsT("fullApps.actionsNeedReview", { count });
    }
    default:
      return fullAppsT("fullApps.message_45070a53078d", { value1: who });
  }
}

function humanizeAllowlistChange(who: string, details: Record<string, unknown> | null): string {
  const added = numberFrom(details?.added);
  const removed = numberFrom(details?.removed);
  if (added > 0 && removed === 0) {
    return fullAppsT("fullApps.sheetsAdded", { name: who, count: added });
  }
  if (removed > 0 && added === 0) {
    return fullAppsT("fullApps.sheetsRemoved", { name: who, count: removed });
  }
  if (added > 0 && removed > 0) {
    return fullAppsT("fullApps.message_4537da05ef5d", { value1: who, value2: added, value3: removed });
  }
  return fullAppsT("fullApps.message_9eb832c794ef", { value1: who });
}

function lifecycleLinkLabel(event: ToolConnectionLifecycleEvent): string {
  return event.type === "actions_quarantined" ? fullAppsT("fullApps.review_permissions_5b9f70") : fullAppsT("fullApps.view_permissions_92f9bd");
}

function numberFrom(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function lower(who: string): string {
  return who === "An agent" ? "an agent" : who;
}

function dotColor(event: ToolCallEvent): string {
  if (event.eventType === "call_failed" || event.outcome === "failure" || event.outcome === "timeout") {
    return "bg-red-400";
  }
  if (event.eventType === "call_denied" || event.outcome === "denied") return "bg-amber-400";
  if (event.eventType === "approval_requested") return "bg-amber-400";
  return "bg-emerald-400";
}

function lifecycleDotColor(event: ToolConnectionLifecycleEvent): string {
  if (event.type === "disconnected") return "bg-red-400";
  if (event.type === "app_paused" || event.type === "actions_quarantined") return "bg-amber-400";
  return "bg-emerald-400";
}
