import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQueryView } from "@/components/QueryView";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, History, Loader2 } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { Agent, AttentionItem, DecisionHistoryItem } from "@paperclipai/shared";
import { attentionApi } from "@/api/attention";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { usePanel } from "@/context/PanelContext";
import { useSidebar } from "@/context/SidebarContext";
import { useCoordinatorWorkspaceEnabled } from "@/hooks/useCoordinatorWorkspaceEnabled";
import { useNavigate, useSearchParams } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { coordinatorAttentionQueryKey, COORDINATOR_RECENT_DECISION_MS, recentDecisionReceipts } from "@/lib/coordinator-attention";
import { attentionDetailLine, isInlineResolvable } from "@/lib/attention";
import { AttentionInteractionResolver } from "@/components/AttentionInteractionResolver";
import { StalledReviewActions } from "@/components/StalledReviewActions";
import { DecisionResolver } from "@/components/DecisionResolver";
import { PROPERTIES_PANE_HEADER_SLOT_ID } from "@/components/PropertiesPanel";
import { SidePanelTab } from "@/components/side-panel";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { parseCssTimeMs } from "@/components/task-chat/motion-tokens";
import { readIssueReviewPolicyMetadata } from "@/lib/review-policy";
import { CoordinatorDecisionReceipt as Receipt } from "./CoordinatorDecisionReceipt";
import { CoordinatorTaskMotion } from "./CoordinatorTaskCommitment";

type Group = "none" | "task" | "agent" | "project";

function HistoryPanel({ companyId, agents, onClose, mobile = false }: { companyId: string; agents: Agent[]; onClose: () => void; mobile?: boolean }) {
  useUiTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("");
  const [agentId, setAgentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [groupBy, setGroupBy] = useState<Group>("none");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const projects = useQuery({ queryKey: queryKeys.projects.list(companyId), queryFn: () => projectsApi.list(companyId) });
  const history = useInfiniteQuery({
    queryKey: [...queryKeys.attention(companyId), "history", { search, outcome, agentId, projectId, sort }],
    queryFn: ({ pageParam }) => attentionApi.history(companyId, { search, outcome, agentId, projectId, sort, cursor: pageParam, limit: 40 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const historyView = useQueryView(history);
  const historyWaiting = ["loading", "reconnecting"].includes(historyView.kind);
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const label = groupBy === "task" ? item.issueIdentifier ?? item.issueTitle : groupBy === "agent" ? item.agentName ?? translateUi("interfaceUpdates.other_agents_2dc61bda") : groupBy === "project" ? item.projectName ?? translateUi("newIssue.noProject") : "";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const slot = typeof document !== "undefined" ? document.getElementById(PROPERTIES_PANE_HEADER_SLOT_ID) : null;
  const tab = <SidePanelTab id="decision-history" label={translateUi("interfaceUpdates.decision_history_b211a726")} active onSelect={() => {}} onClose={onClose} />;
  return <div className="space-y-5" data-coordinator-decision-history>
    {!mobile ? <>{slot ? createPortal(tab, slot) : tab}<h2 className="text-lg font-medium">{translateUi("interfaceUpdates.decision_history_b211a726")}</h2></> : null}
    <ToolbarSearch query={search} onQueryChange={setSearch} label={translateUi("interfaceUpdates.search_decision_history_1945564f")} placeholder={translateUi("interfaceUpdates.search_decisions_or_task_ids_30cc4653")} />
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect aria-label={translateUi("interfaceUpdates.filter_decision_outcomes_83cd18b6")} value={outcome} onChange={(event) => setOutcome(event.target.value)}>
        <option value="">{translateUi("surfacesGap.toolsAudit.allOutcomes")}</option><option value="accepted">{translateUi("interfaceUpdates.approved_87b42e40")}</option><option value="answered">{translateUi("decisionForms.common.answered")}</option><option value="rejected">{translateUi("fullDiagnostics.changesRequested")}</option><option value="decided">{translateUi("interfaceUpdates.decided_30ba702e")}</option><option value="cancelled">{translateUi("interfaceUpdates.cancelled_d353a99e")}</option><option value="expired">{translateUi("interfaceUpdates.expired_424a2551")}</option>
      </NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.sort_decision_history_ba964b90")} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">{translateUi("decisionsUi.sort.newest")}</option><option value="oldest">{translateUi("decisionsUi.sort.oldest")}</option></NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.filter_decision_history_by_agent_054d244d")} value={agentId} onChange={(event) => setAgentId(event.target.value)} className="col-span-2"><option value="">{translateUi("surfacesGap.audit.allAgents")}</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.filter_decision_history_by_project_f001d035")} value={projectId} onChange={(event) => setProjectId(event.target.value)} className="col-span-2"><option value="">{translateUi("fullPages.allProjects")}</option>{(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.group_decision_history_8172c3c2")} value={groupBy} onChange={(event) => setGroupBy(event.target.value as Group)} className="col-span-2"><option value="none">{translateUi("interfaceUpdates.no_grouping_a638b9f6")}</option><option value="task">{translateUi("interfaceUpdates.by_task_f99a5eef")}</option><option value="agent">{translateUi("costsUi.byAgent")}</option><option value="project">{translateUi("costsUi.byProject")}</option></NativeSelect>
    </div>
    {historyWaiting ? <p role="status" className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.loading_decisions_627476df")}</p> : null}
    {(historyView.kind === "error") ? <div role="alert" className="space-y-2 text-sm"><p>{translateUi("interfaceUpdates.decision_history_could_not_be_loaded_b57cd47b")}</p><Button variant="outline" onClick={() => void history.refetch()}>{translateUi("newIssue.retry")}</Button></div> : null}
    {!historyWaiting && !(historyView.kind === "error") && !items.length ? <p className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.no_decisions_match_these_filters_d1bb591a")}</p> : null}
    <div className="space-y-4">{[...groups].map(([label, entries]) => <section key={label} className="space-y-3">{label ? <h3 className="text-sm font-medium text-muted-foreground">{label}</h3> : null}{entries.map((item) => <div key={item.id} className="space-y-1"><Receipt item={item} onOpen={navigate} /><p className="px-1 text-xs text-muted-foreground"><time dateTime={item.resolvedAt}>{new Date(item.resolvedAt).toLocaleString()}</time></p></div>)}</section>)}</div>
    {history.hasNextPage ? <Button variant="outline" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? translateUi("taskPanels.loading") : translateUi("interfaceUpdates.load_more_decisions_10e74bc6")}</Button> : null}
  </div>;
}

export function CoordinatorNeedsYou() {
  useUiTranslation();
  const { selectedCompanyId } = useCompany();
  const { userId } = useCoordinatorWorkspaceEnabled();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openPanel, closePanel, setPanelVisible } = usePanel();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkDecisionId = searchParams.get("decisionId");
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [groupBy, setGroupBy] = useState<Group>("none");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [settling, setSettling] = useState<AttentionItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  useEffect(() => { setSettling([]); setSavedIds(new Set()); }, [selectedCompanyId, userId]);
  const [renderLimit, setRenderLimit] = useState(40);
  const feed = useQuery({ queryKey: coordinatorAttentionQueryKey(selectedCompanyId!),
    queryFn: () => attentionApi.list(selectedCompanyId!, { all: true }), enabled: !!selectedCompanyId, refetchOnWindowFocus: true });
  const feedView = useQueryView(feed);
  const feedWaiting = ["loading", "reconnecting"].includes(feedView.kind);
  const agentQuery = useQuery({ queryKey: queryKeys.agents.list(selectedCompanyId!), queryFn: () => agentsApi.list(selectedCompanyId!), enabled: !!selectedCompanyId });
  // Full history lives in its own paginated tab. Only the newest bounded page
  // is fetched here; its window expires visually without deleting any record.
  const recent = useQuery({ queryKey: [...queryKeys.attention(selectedCompanyId!), "history", "recent"],
    queryFn: () => attentionApi.history(selectedCompanyId!, { limit: 100, since: new Date(Date.now() - COORDINATOR_RECENT_DECISION_MS).toISOString() }), enabled: !!selectedCompanyId, refetchOnWindowFocus: true });
  const recentView = useQueryView(recent);
  const agentMap = useMemo(() => new Map((agentQuery.data ?? []).map((agent) => [agent.id, agent])), [agentQuery.data]);
  const recentItems = useMemo(() => recentDecisionReceipts(recent.data?.items ?? [], now), [recent.data, now]);
  const settlingIds = useMemo(() => new Set(settling.map(item => `${item.sourceKind}:${item.subject.id}`)), [settling]);
  const visibleRecentItems = useMemo(() => recentItems.filter((item) => {
    if (settlingIds.has(item.id)) return false;
    if (agentFilter && item.agentId !== agentFilter) return false;
    if (projectFilter && item.projectId !== projectFilter) return false;
    return [item.title, item.issueTitle, item.issueIdentifier, item.agentName, item.projectName, item.label]
      .join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }).sort((a, b) => (sort === "oldest" ? 1 : -1) * (Date.parse(a.resolvedAt) - Date.parse(b.resolvedAt))),
  [recentItems, settlingIds, agentFilter, projectFilter, query, sort]);
  const recentGroups = useMemo(() => {
    const result = new Map<string, DecisionHistoryItem[]>();
    for (const item of visibleRecentItems) {
      const label = groupBy === "task" ? item.issueIdentifier ?? item.issueTitle
        : groupBy === "agent" ? item.agentName ?? translateUi("interfaceUpdates.other_agents_2dc61bda")
          : groupBy === "project" ? item.projectName ?? translateUi("newIssue.noProject") : "";
      result.set(label, [...(result.get(label) ?? []), item]);
    }
    return [...result];
  }, [visibleRecentItems, groupBy]);
  const pendingItems = useMemo(() => {
    const receipts = new Set(recentItems.map((item) => item.id));
    const items = new Map((feed.data?.items ?? []).map((item) => [`${item.sourceKind}:${item.subject.id}`, item]));
    for (const item of settling) if (!items.has(`${item.sourceKind}:${item.subject.id}`)) items.set(`${item.sourceKind}:${item.subject.id}`, item);
    return [...items].filter(([key]) => settlingIds.has(key) || (!receipts.has(key) && !savedIds.has(key))).map(([, item]) => item);
  }, [feed.data, settling, settlingIds, recentItems, savedIds]);
  const filtered = useMemo(() => pendingItems.filter((item) => {
    const agentId = String(item.subject.metadata?.createdByAgentId ?? item.subject.metadata?.originAgentId ?? "");
    if (agentFilter && agentId !== agentFilter && item.originAgentName !== agentMap.get(agentFilter)?.name) return false;
    if (projectFilter && item.project?.id !== projectFilter) return false;
    return [item.subject.title, item.relatedIssue?.title, item.relatedIssue?.identifier, item.originAgentName, item.project?.name, attentionDetailLine(item)].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }).sort((a, b) => (sort === "oldest" ? 1 : -1) * (Date.parse(a.activityAt) - Date.parse(b.activityAt))), [pendingItems, agentFilter, projectFilter, query, sort, agentMap]);
  const groups = useMemo(() => {
    const result = new Map<string, AttentionItem[]>();
    for (const item of filtered.slice(0, renderLimit)) {
      const label = groupBy === "task" ? item.relatedIssue?.identifier ?? item.relatedIssue?.title ?? translateUi("interfaceUpdates.other_decisions_e8d0efb5")
        : groupBy === "agent" ? item.originAgentName ?? translateUi("interfaceUpdates.other_agents_2dc61bda") : groupBy === "project" ? item.project?.name ?? translateUi("newIssue.noProject") : "";
      result.set(label, [...(result.get(label) ?? []), item]);
    }
    return [...result];
  }, [filtered, groupBy, renderLimit]);
  useEffect(() => {
    if (!deepLinkDecisionId || !selectedCompanyId || !pendingItems.some(item => item.sourceKind === "decision" && item.subject.id === deepLinkDecisionId)) return;
    // A saved decision link takes precedence over local toolbar filters and the
    // rendering window. Consume it only after its actual card has mounted.
    if (query || agentFilter || projectFilter) { setQuery(""); setAgentFilter(""); setProjectFilter(""); return; }
    const index = filtered.findIndex(item => item.sourceKind === "decision" && item.subject.id === deepLinkDecisionId);
    if (index >= renderLimit) { setRenderLimit(Math.ceil((index + 1) / 40) * 40); return; }
    const card = document.getElementById(`coordinator-decision-${deepLinkDecisionId}`);
    if (!card) return;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    setSearchParams(current => { const next = new URLSearchParams(current); next.delete("decisionId"); return next; }, { replace: true });
  }, [deepLinkDecisionId, selectedCompanyId, pendingItems, filtered, query, agentFilter, projectFilter, renderLimit, reducedMotion, setSearchParams]);
  const projects = useMemo(() => [...new Map([
    ...pendingItems.flatMap((item) => item.project ? [[item.project.id, item.project.name] as const] : []),
    ...recentItems.flatMap((item) => item.projectId ? [[item.projectId, item.projectName ?? "Unnamed project"] as const] : []),
  ]).entries()], [pendingItems, recentItems]);
  const filtersActive = Boolean(query.trim() || agentFilter || projectFilter);
  const closeHistory = useCallback(() => { setHistoryOpen(false); closePanel(); }, [closePanel]);
  const showHistory = () => { setHistoryOpen(true); if (!isMobile) setPanelVisible(true); };
  useEffect(() => { setBreadcrumbs([{ label: translateUi("interfaceUpdates.needs_you_74b6abdf") }]); }, [setBreadcrumbs]);
  useEffect(() => {
    setSettling([]); setHistoryOpen(false); setNow(Date.now()); closePanel();
    return closePanel;
  }, [selectedCompanyId, closePanel]);
  useEffect(() => {
    if (!historyOpen || !selectedCompanyId || isMobile) { closePanel(); return; }
    setPanelVisible(true);
    openPanel(<HistoryPanel companyId={selectedCompanyId} agents={agentQuery.data ?? []} onClose={closeHistory} />);
  }, [historyOpen, selectedCompanyId, isMobile, agentQuery.data, openPanel, closePanel, closeHistory, setPanelVisible]);
  useEffect(() => {
    const next = recentItems.reduce((earliest, item) => Math.min(earliest, Date.parse(item.resolvedAt) + COORDINATOR_RECENT_DECISION_MS), Infinity);
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()) + 1);
    return () => window.clearTimeout(timer);
  }, [recentItems]);
  const onResolved = (item: AttentionItem) => {
    const id = `${item.sourceKind}:${item.subject.id}`;
    setSavedIds(current => new Set([...current, id]));
    setSettling(current => current.some(entry => entry.id === item.id) ? current : [...current, item]);
    void recent.refetch().then(result => {
      if (result.isError) setSettling(current => current.filter(entry => `${entry.sourceKind}:${entry.subject.id}` !== id));
    });
    void feed.refetch();
  };
  const duration = typeof document === "undefined" ? 0 : parseCssTimeMs(getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-base")) / 1_000;
  if (!selectedCompanyId) return <p className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.choose_a_company_to_see_its_decisions_ba231bf5")}</p>;
  return <LayoutGroup id="coordinator-decisions"><section className="coordinator-needs-you mx-auto w-full max-w-4xl space-y-6" aria-label={translateUi("interfaceUpdates.needs_you_74b6abdf")}>
    {isMobile ? <Sheet open={historyOpen} onOpenChange={open => { if (!open) closeHistory(); }}>
      <SheetContent side="bottom" aria-describedby={undefined} className="mobile-task-side-panel inset-0 h-dvh max-h-dvh w-full max-w-none gap-0 border-0 p-0 pt-(--sz-safe-top) pb-(--sz-safe-bottom)">
        <SheetHeader><SheetTitle>{translateUi("interfaceUpdates.decision_history_b211a726")}</SheetTitle></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4"><HistoryPanel companyId={selectedCompanyId} agents={agentQuery.data ?? []} onClose={closeHistory} mobile /></div>
      </SheetContent>
    </Sheet> : null}
    <header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-medium">{translateUi("interfaceUpdates.needs_you_74b6abdf")}</h1><Button variant="ghost" onClick={showHistory}><History className="size-4" />{translateUi("interfaceUpdates.decision_history_b211a726")}</Button></header>
    <div data-canonical-toolbar="coordinator-decisions" role="toolbar" aria-label={translateUi("decisionsUi.toolbar.label")} className="flex flex-wrap items-center gap-2">
      <ToolbarSearch query={query} onQueryChange={setQuery} label={translateUi("decisionsUi.toolbar.search")} placeholder={translateUi("interfaceUpdates.search_decisions_or_task_ids_30cc4653")} />
      <NativeSelect aria-label={translateUi("interfaceUpdates.filter_decisions_by_agent_2b6bef36")} value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="w-auto"><option value="">{translateUi("surfacesGap.audit.allAgents")}</option>{(agentQuery.data ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.filter_decisions_by_project_acdc140d")} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="w-auto"><option value="">{translateUi("fullPages.allProjects")}</option>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.group_decisions_1538bb85")} value={groupBy} onChange={(event) => setGroupBy(event.target.value as Group)} className="w-auto"><option value="none">{translateUi("interfaceUpdates.no_grouping_a638b9f6")}</option><option value="task">{translateUi("interfaceUpdates.by_task_f99a5eef")}</option><option value="agent">{translateUi("costsUi.byAgent")}</option><option value="project">{translateUi("costsUi.byProject")}</option></NativeSelect>
      <NativeSelect aria-label={translateUi("interfaceUpdates.sort_decisions_35a19db5")} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="w-auto"><option value="newest">{translateUi("decisionsUi.sort.newest")}</option><option value="oldest">{translateUi("decisionsUi.sort.oldest")}</option></NativeSelect>
    </div>
    {feedWaiting ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{translateUi("interfaceUpdates.loading_decisions_627476df")}</p> : null}
    {(feedView.kind === "error") ? <div role="alert" className="space-y-2"><p className="text-sm">{translateUi("interfaceUpdates.decisions_could_not_be_loaded_ebc96aa5")}</p><Button variant="outline" onClick={() => void feed.refetch()}>{translateUi("newIssue.retry")}</Button></div> : null}
    {!feedWaiting && !(feedView.kind === "error") && filtered.length === 0 ? <div className="space-y-3 py-8 text-center"><p className="text-sm text-muted-foreground">{filtersActive && !visibleRecentItems.length ? translateUi("interfaceUpdates.no_decisions_match_these_filters_d1bb591a") : pendingItems.length ? translateUi("interfaceUpdates.no_open_decisions_match_these_filters_5d1ee46f") : translateUi("interfaceUpdates.you_re_caught_up_48254fca")}</p><Button variant="ghost" onClick={showHistory}>{translateUi("interfaceUpdates.open_decision_history_4e9f8d78")}<ArrowUpRight className="size-4" /></Button></div> : null}
    {groups.map(([label, items]) => <div key={label} className="space-y-4">{label ? <h2 className="text-sm font-medium text-muted-foreground">{label}</h2> : null}{items.map((item) => {
      const issueId = item.relatedIssue?.id ?? String(item.subject.metadata?.issueId ?? "");
      const interaction = item.sourceKind === "issue_thread_interaction" && isInlineResolvable(item) && issueId;
      const decision = item.sourceKind === "decision" && isInlineResolvable(item);
      const stalledReview = item.sourceKind === "review" && item.subject.kind === "issue" && isInlineResolvable(item) && item.subject.metadata?.reviewAttentionState === "stalled";
      const taskRef = item.relatedIssue ?? (item.subject.kind === "issue" ? item.subject : null);
      const taskLink = taskRef?.href ? <button type="button" onClick={() => { if (taskRef.href) navigate(taskRef.href); }} className="flex max-w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground"><span className="shrink-0">{taskRef.identifier ?? translateUi("interfaceUpdates.open_task_6b5c9394")}</span><span className="truncate">{taskRef.title}</span><ArrowUpRight className="size-4 shrink-0" /></button> : null;
      const id = `${item.sourceKind}:${item.subject.id}`;
      const receipt = settlingIds.has(id) ? recentItems.find(entry => entry.id === id) : undefined;
      const phase = !receipt ? "pending" : ["cancelled", "expired"].includes(receipt.outcome) ? "closed" : "resolved";
      return <motion.div id={item.sourceKind === "decision" ? `coordinator-decision-${item.subject.id}` : undefined} tabIndex={item.sourceKind === "decision" ? -1 : undefined} layout={reducedMotion ? false : "position"} layoutId={reducedMotion ? undefined : id} transition={{ duration }} key={id}>
      <CoordinatorTaskMotion eventId={`decision:${selectedCompanyId}:${userId}:${id}`} phase={phase} createdAt={item.activityAt} className="coordinator-decision-motion"
        onSettled={() => setSettling(current => current.filter(entry => `${entry.sourceKind}:${entry.subject.id}` !== id))}>
      {receipt ? <Receipt item={receipt} onOpen={navigate} /> : <article className="coordinator-decision-card space-y-4 rounded-xl border border-border bg-card p-6">
        {interaction ? <AttentionInteractionResolver footerSlot={taskLink} presentation="coordinator-decision" companyId={selectedCompanyId} issueId={issueId} interactionId={item.subject.id} agentMap={agentMap} currentUserId={userId} onResolved={resolved => {
          if (!resolved || resolved.status === "pending") { void feed.refetch(); void recent.refetch(); return; }
          onResolved(item);
        }} />
          : decision ? <DecisionResolver companyId={selectedCompanyId} decisionId={item.subject.id} originIssue={item.relatedIssue} agentMap={agentMap} onResolved={() => onResolved(item)} />
          : stalledReview ? <><h2 className="text-lg font-medium">{translateUi("interfaceUpdates.choose_how_this_task_continues_11a940b3")}</h2><p className="text-sm">{translateUi("interfaceUpdates.this_task_is_still_in_review_with_no_active_review_1e925f44")}</p><StalledReviewActions footerSlot={taskLink} issueId={item.subject.id} companyId={selectedCompanyId} reviewPolicy={readIssueReviewPolicyMetadata(item.subject.metadata)} approveLabel="Mark task done" onResolved={() => { void feed.refetch(); void recent.refetch(); }} /></>
          : <><h2 className="text-lg font-medium">{item.subject.title ?? item.whyNow}</h2><p className="text-sm">{attentionDetailLine(item) ?? item.whyNow}</p><Button disabled={!item.subject.href} onClick={() => { if (item.subject.href) navigate(item.subject.href); }}>{translateUi("interfaceUpdates.open_to_review_c7bb7cad")}<ArrowUpRight className="size-4" /></Button></>}
        {!interaction && !stalledReview ? taskLink : null}
      </article>}
      </CoordinatorTaskMotion>
      </motion.div>;
    })}</div>)}
    {filtered.length > renderLimit ? <Button variant="outline" onClick={() => setRenderLimit((value) => value + 40)}>{translateUi("interfaceUpdates.show_more_decisions_2ac1733d")}</Button> : null}
    {visibleRecentItems.length ? <section className="space-y-3" aria-label={translateUi("interfaceUpdates.recent_decisions_339d5d63")}><h2 className="text-sm font-medium text-muted-foreground">{translateUi("interfaceUpdates.recent_decisions_339d5d63")}</h2>{recentGroups.map(([label, items]) => <div key={label} className="space-y-3">{label ? <h3 className="text-sm font-medium text-muted-foreground">{label}</h3> : null}{items.map((item) => <motion.div layout={!reducedMotion} layoutId={reducedMotion ? undefined : item.id} transition={{ duration }} key={item.id}><Receipt item={item} onOpen={navigate} /></motion.div>)}</div>)}</section> : null}
    {(recentView.kind === "error") ? <p role="alert" className="text-sm text-muted-foreground">{translateUi("interfaceUpdates.recent_decisions_could_not_be_loaded_b39fb0cd")} <button className="underline" onClick={() => void recent.refetch()}>{translateUi("newIssue.retry")}</button></p> : null}
  </section></LayoutGroup>;
}
