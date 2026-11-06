import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQueryView } from "@/components/QueryView";
import { useMemo, useState } from "react";
import { useCoordinatorChatTaskHandoffs } from "./CoordinatorChatTaskHandoffs";
import { CoordinatorCreatedTaskLink } from "./CoordinatorTaskCommitment";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** The task list is source-conversation scoped, independent of reassignment. */
export function CoordinatorConversationTasksPanel({ conversationIssueId }: { conversationIssueId: string }) {
  useUiTranslation();
  const tasks = useCoordinatorChatTaskHandoffs(conversationIssueId);
  const tasksView = useQueryView(tasks);
  const waiting = ["loading", "reconnecting"].includes(tasksView.kind);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return tasks.handoffs.filter(task => (!status || task.status === status) && (!needle || `${task.identifier ?? ""} ${task.title}`.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : (sort === "oldest" ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [tasks.handoffs, query, status, sort]);
  return <section className="space-y-4" aria-label={translateUi("interfaceUpdates.tasks_from_this_conversation_8752e6d1")}>
    <div className="space-y-1"><h2 className="text-lg font-medium">{translateUi("tasks.title")}</h2><p className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.created_from_this_conversation_379e4f9c")}</p></div>
    <ToolbarSearch query={query} onQueryChange={setQuery} label={translateUi("interfaceUpdates.search_conversation_tasks_a85cd512")} placeholder={translateUi("interfaceUpdates.search_tasks_or_ids_79f9b89a")} />
    <div className="flex flex-wrap gap-2">
      <NativeSelect value={status} onChange={event => setStatus(event.target.value)} aria-label={translateUi("interfaceUpdates.filter_conversation_tasks_by_status_de43fd9c")} className="w-auto"><option value="">{translateUi("surfacesGap.audit.allStatuses")}</option><option value="todo">{translateUi("interfaceUpdates.ready_to_start_bc403cd6")}</option><option value="in_progress">{translateUi("fullSharedTail.stateNames_active")}</option><option value="in_review">{translateUi("interfaceUpdates.needs_review_07297fa9")}</option><option value="blocked">{translateUi("interfaceUpdates.blocked_18f2a094")}</option><option value="done">{translateUi("interfaceUpdates.done_11a6767d")}</option><option value="cancelled">{translateUi("interfaceUpdates.cancelled_d353a99e")}</option></NativeSelect>
      <NativeSelect value={sort} onChange={event => setSort(event.target.value)} aria-label={translateUi("interfaceUpdates.sort_conversation_tasks_60587310")} className="w-auto"><option value="newest">{translateUi("decisionsUi.sort.newest")}</option><option value="oldest">{translateUi("decisionsUi.sort.oldest")}</option><option value="title">{translateUi("interfaceUpdates.title_7e8cd205")}</option></NativeSelect>
    </div>
    {waiting && <p role="status" className="text-sm text-muted-foreground">{translateUi("taskProperties.taskPanel.loading")}</p>}
    {(tasksView.kind === "error") && <div role="alert" className="space-y-2"><p className="text-sm">{translateUi("interfaceUpdates.tasks_couldn_t_load_6efc21ac")}</p><Button variant="outline" onClick={() => void tasks.refetch()}>{translateUi("newIssue.retry")}</Button></div>}
    <div className="space-y-3">{visible.map(task => <div key={task.id} className="overflow-hidden rounded-xl border border-border bg-card"><CoordinatorCreatedTaskLink task={task} /></div>)}</div>
    {!waiting && !(tasksView.kind === "error") && !visible.length && <p className="py-4 text-sm text-muted-foreground">{query || status ? translateUi("interfaceUpdates.no_loaded_tasks_match_these_filters_d41a500a") : translateUi("interfaceUpdates.tasks_created_from_this_conversation_will_appear_h_1dbab0dd")}</p>}
    {tasks.hasNextPage && <Button variant="outline" disabled={tasks.isFetchingNextPage} onClick={() => void tasks.fetchNextPage()}>{tasks.isFetchingNextPage ? translateUi("taskPanels.loading") : translateUi("fullPages.loadMoreTasks")}</Button>}
  </section>;
}
