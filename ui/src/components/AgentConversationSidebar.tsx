import { agentConfigRoleLabel } from "./agent-config-primitives";
import { t as fullSharedT, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, Search, Users, X } from "lucide-react";
import { Badge } from "./ui/badge";
import type { Agent } from "@paperclipai/shared";
import { AgentChatPicker } from "@/components/AgentChatPicker";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "@/lib/router";
import { agentRouteRef, cn } from "@/lib/utils";

export interface AgentConversationSidebarProps {
  agents: Agent[];
  /** Agents with a saved conversation; defaults to every listed agent. */
  existingChatAgentIds?: readonly string[];
  availableAgents?: Agent[];
  activeId?: string;
  previews?: Record<string, string>;
  unreadAgentIds?: readonly string[];
  unreadMessageCounts?: ReadonlyMap<string, number>;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  initialSearch?: string;
  onSelect?: (agent: Agent, signal?: AbortSignal) => void | Promise<void>;
  onBrowse?: () => void;
  onAddChat?: (agent: Agent, signal?: AbortSignal) => void | Promise<void>;
  historyLoading?: boolean;
  historyError?: Error | null;
  onRetryHistory?: () => void;
  onCreateAgent?: () => void;
  renderAgentAction?: (agent: Agent) => ReactNode;
}

/** Searchable navigation for one conversation per agent. */
export function AgentConversationSidebar({ agents, existingChatAgentIds, availableAgents = agents, activeId, previews = {}, unreadAgentIds = [], unreadMessageCounts, loading = false, error, onRetry, initialSearch = "", onSelect, onBrowse, onAddChat, historyLoading, historyError, onRetryHistory, onCreateAgent, renderAgentAction }: AgentConversationSidebarProps) {
  const { t } = useFullSharedTranslation();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const unreadIds = useMemo(() => new Set(unreadAgentIds), [unreadAgentIds]);
  const query = search.trim().toLocaleLowerCase();
  const visible = agents.filter(agent => `${agent.name} ${agent.title ?? ""} ${agent.role} ${agentConfigRoleLabel(agent.role, t)}`.toLocaleLowerCase().includes(query));
  function focusSearch() {
    setSearch("");
    searchRef.current?.focus();
  }
  return <aside aria-labelledby={headingId} className="flex h-full min-h-0 flex-col border-r border-border bg-background">
    <h2 id={headingId} className="sr-only">{fullSharedT("agentEdition.chatContacts")}</h2>
    <div className="flex shrink-0 items-center gap-2 px-3 pb-3 pt-5">
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input ref={searchRef} aria-label={fullSharedT("agentEdition.searchChats")} placeholder={fullSharedT("agentEdition.searchChats")} value={search} onChange={event => setSearch(event.target.value)}
          onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setSearch(""); } }}
          className="h-9 pl-8 pr-8 text-xs md:text-xs" />
        {search && <Button variant="ghost" size="icon-xs" aria-label={fullSharedT("common.clearSearch")} className="absolute right-1 top-1/2 -translate-y-1/2" onClick={focusSearch}><X className="size-3" /></Button>}
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 scrollbar-auto-hide">
      <span role="status" className="sr-only">{loading ? fullSharedT("fullShared.loading_agents_1190fd") : fullSharedT("fullSharedTail.agentCount", { count: visible.length })}</span>
      {historyLoading && <p role="status" className="px-2 text-xs text-muted-foreground">{fullSharedT("fullShared.loading_chat_history_d0422b")}</p>}
      {historyError && <div role="alert" className="flex flex-col items-start gap-2 px-2 py-3">
        <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.some_chat_history_couldn_t_load_d53de4")}</p>
        <Button variant="outline" size="sm" onClick={onRetryHistory}>{fullSharedT("fullShared.retry_chat_history_f9a932")}</Button>
      </div>}
      {error ? <div role="alert" className="flex flex-col items-start gap-2 px-2 py-6"><p className="text-sm">{fullSharedT("fullShared.couldn_t_load_your_chats_e0527b")}</p><Button variant="outline" size="sm" onClick={onRetry}>{fullSharedT("fullShared.try_again_d8b839")}</Button></div> : loading ? <div aria-hidden="true" className="flex flex-col gap-1">
        {[0, 1, 2, 3].map(index => <div key={index} className="flex items-center gap-3 rounded-md px-2 py-3 motion-safe:animate-pulse">
          <div className="size-8 shrink-0 rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-2"><div className="h-3 w-2/3 rounded-sm bg-muted" /><div className="h-2 w-full rounded-sm bg-muted" /></div>
        </div>)}
      </div> : visible.length ? <nav aria-label={fullSharedT("fullShared.agent_conversations_d0c272")} className="flex flex-col gap-1">
        {visible.map(agent => {
          const unreadCount = unreadMessageCounts?.get(agent.id) ?? 0;
          const hasUnread = unreadCount > 0 || unreadIds.has(agent.id);
          return <div key={agent.id} className="agent-pin-row agent-contact-pin-row group/agent-pin relative rounded-md" data-selected={activeId === agent.id || undefined} data-has-unread={hasUnread || undefined}><Link to={`/chats/${encodeURIComponent(agent.status === "terminated" ? agent.id : agentRouteRef(agent))}`}
          aria-current={activeId === agent.id ? "page" : undefined}
          title={`${agent.name}${agent.title ? ` · ${agent.title}` : ""}`}
          onClick={event => { if (onSelect) { event.preventDefault(); onSelect(agent); } }}
          className={cn("agent-contact-row flex min-w-0 items-center gap-3 rounded-md px-2.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", renderAgentAction && hasUnread && "pr-12", activeId === agent.id ? "bg-accent text-accent-foreground" : "group-hover/agent-pin:bg-accent/60 group-focus-within/agent-pin:bg-accent/60")}>
          <AgentAvatar agent={agent} size={40} />
          <span className="agent-pin-text flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{agent.name}</span>
            <span className="truncate text-xs text-muted-foreground">{agent.status === "terminated" ? fullSharedT("fullShared.terminated_56a88f") : agent.title ?? agentConfigRoleLabel(agent.role, t)}</span>
          </span>
          {unreadCount > 0 ? <Badge variant="ghost" aria-label={fullSharedT("agentEdition.unreadFrom", { count: unreadCount, name: agent.name })} className="shrink-0 bg-primary font-mono tabular-nums text-primary-foreground">{unreadCount}</Badge>
            : unreadIds.has(agent.id) && <span role="img" aria-label={fullSharedT("interfaceUpdates.unread_messages_from_value_46a46085", { value1: agent.name })} className="size-2 shrink-0 rounded-full bg-primary" />}
        </Link>{renderAgentAction?.(agent)}</div>;
        })}
      </nav> : !agents.length && (historyLoading || historyError) ? null : <div className="flex flex-col items-start gap-2 px-2 py-6">
        <p className="text-sm font-medium">{agents.length ? fullSharedT("fullShared.no_agents_found_066161") : fullSharedT("fullShared.no_chats_yet_269208")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{agents.length ? fullSharedT("fullShared.try_another_name_or_role_ec1f4d") : fullSharedT("fullShared.choose_an_agent_to_start_a_conversation_5503a3")}</p>
        {!agents.length && <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>{fullSharedT("taskChatUi.settings.chooseAgent")}</Button>}
        {agents.length > 0 && <Button variant="outline" size="sm" onClick={focusSearch}>{fullSharedT("common.clearSearch")}</Button>}
      </div>}
      {onCreateAgent && !loading && !error && <button type="button" onClick={onCreateAgent}
        className="flex min-w-0 items-center gap-3 rounded-md px-2.5 py-3 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center"><span className="agent-contact-create flex size-8 items-center justify-center bg-muted"><Plus className="size-5 text-foreground" /></span></span>
        <span className="text-sm font-medium">{fullSharedT("agentEdition.createAgent")}</span>
      </button>}
    </div>
    {onBrowse && <div className="shrink-0 px-3 py-4">
      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 text-muted-foreground" onClick={onBrowse}>
        <Users className="size-4" />{fullSharedT("fullShared.browse_all_agents_74cf48")}
      </Button>
    </div>}
    <AgentChatPicker agents={availableAgents} open={pickerOpen} onOpenChange={setPickerOpen}
      unreadMessageCounts={unreadMessageCounts}
      existingChatAgentIds={existingChatAgentIds ?? agents.map(agent => agent.id)} loading={loading} error={error} onRetry={onRetry}
      renderAgentIcon={agent => <AgentAvatar agent={agent} size={32} />}
      onSelect={async (agent, signal) => {
        if (onAddChat) await onAddChat(agent, signal);
        else if (onSelect) await onSelect(agent, signal);
        else navigate(`/chats/${encodeURIComponent(agentRouteRef(agent))}`);
        if (!signal?.aborted) setSearch("");
      }} />
  </aside>;
}
