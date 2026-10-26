import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ToolMcpGatewayWithTokens, ToolRedactedValueSummary } from "@paperclipai/shared";
import { toolsApi, type ToolAuditOutcome, type ToolGatewayActivityEvent } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorState, RelativeTime } from "@/pages/tools/shared";

const PAGE_SIZE = 25;

const OUTCOME_META: Record<ToolAuditOutcome, { label: string; status: string }> = {
  allowed: { get label() { return fullAppsT("fullApps.allowed_1bb201"); }, status: "allowed" },
  blocked: { get label() { return fullAppsT("fullApps.blocked_18f2a0"); }, status: "denied" },
  asked_first: { get label() { return fullAppsT("surfacesGap.toolsAudit.asked"); }, status: "require-approval" },
  waiting: { get label() { return fullAppsT("fullApps.waiting_6e293a"); }, status: "deferred" },
  failed: { get label() { return fullAppsT("fullApps.failed_031a8f"); }, status: "failed" },
  unknown: { get label() { return fullAppsT("fullApps.recorded_c7175f"); }, status: "unchecked" },
};

function detailString(details: Record<string, unknown> | null, key: string): string | null {
  const value = details?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatSummary(summary: ToolRedactedValueSummary | null | undefined): string | null {
  if (!summary?.summary) return null;
  try {
    return JSON.stringify(JSON.parse(summary.summary), null, 2);
  } catch {
    return summary.summary;
  }
}

function summaryFromDetails(
  details: Record<string, unknown> | null,
  key: "argumentsSummary" | "resultSummary",
): ToolRedactedValueSummary | null {
  const value = details?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const summary = (value as Record<string, unknown>).summary;
  return typeof summary === "string" ? { summary } : null;
}

function durationLabel(event: ToolGatewayActivityEvent): string | null {
  const started = event.invocation?.startedAt ? new Date(event.invocation.startedAt).getTime() : Number.NaN;
  const completed = event.invocation?.completedAt ? new Date(event.invocation.completedAt).getTime() : Number.NaN;
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) return null;
  return fullAppsT("fullApps.message_de6e1be7a93b", { value1: completed - started });
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  useFullAppsTranslation();
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className={mono ? "min-w-0 break-all font-mono text-(length:--text-micro) text-foreground" : "min-w-0 text-foreground"}>
        {value}
      </dd>
    </div>
  );
}

function ActivityRow({ event }: { event: ToolGatewayActivityEvent }) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  const outcome = OUTCOME_META[event.normalizedOutcome] ?? OUTCOME_META.unknown;
  const actor = event.agentDisplayName ?? fullAppsT("fullApps.caption_0c77fe09ab");
  const app = event.appDisplayName ?? event.connectionDisplayName ?? event.applicationDisplayName ?? fullAppsT("fullApps.caption_0d04bfeb7d");
  const tool = event.toolDisplayName ?? event.invocation?.toolName ?? fullAppsT("fullApps.tool_call_170110");
  const rawTool = event.invocation?.toolName ?? detailString(event.details, "tool") ?? detailString(event.details, "toolName");
  const reason = detailString(event.details, "reasonCode");
  const argumentsText = formatSummary(
    event.invocation?.argumentsSummary ?? summaryFromDetails(event.details, "argumentsSummary"),
  );
  const resultText = formatSummary(
    event.invocation?.resultSummary ?? summaryFromDetails(event.details, "resultSummary"),
  );
  const duration = durationLabel(event);

  return (
    <li className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-accent/50"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-foreground"><FullAppsTrans i18nKey="fullApps.used_in_bf39f0" components={{ part1: <span className="font-medium">{actor}</span>, part2: <span className="font-medium">{tool}</span>, part3: <>{app}</> }} /></span>
        </span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <StatusBadge status={outcome.status} label={outcome.label} />
          <span className="text-xs text-muted-foreground">
            · <RelativeTime t={fullAppsI18n.t} value={event.createdAt} />
          </span>
        </span>
      </button>

      {open ? (
        <div className="border-t border-border bg-muted/30 px-4 py-3 pl-10 text-xs">
          <dl>
            {rawTool ? <Fact label={fullAppsT("agentToolsUi.access.tool")} value={rawTool} mono /> : null}
            {event.invocation?.status ? <Fact label={fullAppsT("fullApps.call_status_c43d98")} value={event.invocation.status} /> : null}
            {event.invocation?.policyDecision ? <Fact label={fullAppsT("decisionsUi.source.decision")} value={event.invocation.policyDecision} /> : null}
            {reason ? <Fact label={fullAppsT("taskProperties.fields.reason")} value={reason} mono /> : null}
            {duration ? <Fact label={fullAppsT("fullApps.duration_4fc52a")} value={duration} /> : null}
            {event.invocation?.id ? <Fact label={fullAppsT("fullApps.invocation_id_56d237")} value={event.invocation.id} mono /> : null}
            {event.invocation?.errorCode ? <Fact label={fullAppsT("decisionForms.interaction.errorCode")} value={event.invocation.errorCode} mono /> : null}
            {event.invocation?.errorMessage ? <Fact label={fullAppsT("fullApps.error_54a0e8")} value={event.invocation.errorMessage} /> : null}
          </dl>
          {argumentsText ? (
            <div className="mt-2 space-y-1">
              <div className="text-muted-foreground">{fullAppsT("fullApps.arguments_redacted_1965f7")}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground">
                {argumentsText}
              </pre>
            </div>
          ) : null}
          {resultText ? (
            <div className="mt-3 space-y-1">
              <div className="text-muted-foreground">{fullAppsT("fullApps.result_redacted_1a33ba")}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground">
                {resultText}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function GatewayActivityPanel({
  companyId,
  gateway,
}: {
  companyId: string;
  gateway: ToolMcpGatewayWithTokens;
}) {
  useFullAppsTranslation();
  const activityQuery = useInfiniteQuery({
    queryKey: queryKeys.tools.activity(companyId, { gateway: gateway.id, window: "30d" }),
    queryFn: ({ pageParam }) =>
      toolsApi.listActivity(companyId, {
        gateway: gateway.id,
        window: "30d",
        limit: PAGE_SIZE,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const events = useMemo(
    () => activityQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [activityQuery.data],
  );

  if (activityQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (activityQuery.isError) {
    return <ErrorState t={fullAppsI18n.t} error={activityQuery.error} onRetry={() => activityQuery.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.calls_through_this_gateway_from_the_last_30_days_ope_4c86c7")}</p>
      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{fullAppsT("fullApps.no_calls_have_gone_through_this_gateway_yet_a4511e")}</div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {events.map((event) => <ActivityRow key={event.id} event={event} />)}
        </ul>
      )}
      {activityQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activityQuery.fetchNextPage()}
            disabled={activityQuery.isFetchingNextPage}
          >
            {activityQuery.isFetchingNextPage ? fullAppsT("taskPanels.loading") : fullAppsT("surfacesGap.audit.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
