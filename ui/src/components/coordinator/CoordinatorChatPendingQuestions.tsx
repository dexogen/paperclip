import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { AttentionItem } from "@paperclipai/shared";
import { ArrowUpRight } from "lucide-react";
import { api, detachInflightGet } from "@/api/client";
import { Link } from "@/lib/router";
import { useCoordinatorWorkspaceEnabled } from "@/hooks/useCoordinatorWorkspaceEnabled";
import { AttentionInteractionResolver } from "@/components/AttentionInteractionResolver";
import { Button } from "@/components/ui/button";

const EMPTY_QUESTIONS: AttentionItem[] = [];

/** A read projection of the task's question, never a second conversation form. */
export function useCoordinatorChatPendingQuestions(issueId: string | null, conversationMode: boolean | undefined) {
  const { enabled, userId } = useCoordinatorWorkspaceEnabled();
  const active = enabled && !!issueId && !!userId && conversationMode === true;
  const query = useQuery({
    queryKey: ["issues", "pending-questions", issueId, userId],
    enabled: active,
    queryFn: ({ signal }) => {
      const path = `/issues/${issueId}/pending-questions`;
      detachInflightGet(path);
      return api.get<AttentionItem[]>(path, { signal, cache: "no-store" });
    },
    });
  const accessUnavailable = !!query.error && "status" in query.error && [401, 403, 404].includes(Number(query.error.status));
  return { ...query, enabled: active, questions: active && !accessUnavailable ? query.data ?? EMPTY_QUESTIONS : EMPTY_QUESTIONS };
}

export function CoordinatorChatPendingQuestion({ item }: { item: AttentionItem }) {
  useUiTranslation();
  const { userId } = useCoordinatorWorkspaceEnabled();
  const task = item.relatedIssue;
  if (!task) return null;
  const href = `${(task.href ?? `/issues/${task.id}`).split("#")[0]}#interaction-${item.subject.id}`;
  return <section data-testid="coordinator-chat-pending-question" className="space-y-3">
    <p className="text-sm text-muted-foreground">{item.originAgentName ?? translateUi("interfaceUpdates.your_agent_1ffbc15d")} {translateUi("interfaceUpdates.needs_your_input_on_4345cd80")} {task.title ?? task.identifier ?? translateUi("interfaceUpdates.this_task_5249804f")}.</p>
    <article className="coordinator-decision-card space-y-4 rounded-xl border border-border bg-card p-6">
      <AttentionInteractionResolver companyId={task.companyId} issueId={task.id} interactionId={item.subject.id} currentUserId={userId} presentation="coordinator-decision" footerSlot={<Link to={href} className="flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <span className="shrink-0">{task.identifier ?? translateUi("interfaceUpdates.open_task_6b5c9394")}</span><span className="truncate">{task.title}</span><ArrowUpRight className="size-4 shrink-0" />
      </Link>} />

    </article>
  </section>;
}

export function CoordinatorChatQuestionStatus({ query }: { query: ReturnType<typeof useCoordinatorChatPendingQuestions> }) {
  useUiTranslation();
  if (!query.enabled || !query.isError) return null;
  return <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
    <span>{translateUi("interfaceUpdates.task_questions_couldn_t_load_647424e0")}</span><Button size="sm" variant="ghost" onClick={() => void query.refetch()}>{translateUi("newIssue.retry")}</Button>
  </div>;
}
