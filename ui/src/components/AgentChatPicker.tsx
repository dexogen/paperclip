import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Agent } from "@paperclipai/shared";
import { AgentIcon } from "@/components/AgentIconPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

export interface AgentChatPickerProps {
  agents: Agent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (agent: Agent, signal?: AbortSignal) => void | Promise<void>;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  existingChatAgentIds?: readonly string[];
  renderAgentIcon?: (agent: Agent) => ReactNode;
}

export function AgentChatPicker({ open, onOpenChange, ...props }: AgentChatPickerProps) {
  useFullSharedTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="px-4 pt-4 pb-3">
          <DialogTitle>{fullSharedT("fullShared.chat_with_an_agent_73adff")}</DialogTitle>
          {props.existingChatAgentIds && <p className="mt-2 text-sm text-muted-foreground">{fullSharedT("fullShared.one_conversation_per_agent_pick_up_where_you_left_of_2daf9f")}</p>}
        </div>
        {/* The dialog unmounts its content on close, so each search starts empty. */}
        <AgentChatPickerResults key={String(open)} {...props} onComplete={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AgentChatPickerResults({ agents, onSelect, onComplete, loading, error, onRetry, existingChatAgentIds, renderAgentIcon }: Omit<AgentChatPickerProps, "open" | "onOpenChange"> & { onComplete: () => void }) {
  useFullSharedTranslation();
  const mounted = useRef(false);
  const selection = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; selection.current?.abort(); };
  }, []);
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  async function selectAgent(agent: Agent) {
    if (openingId) return;
    setOpeningId(agent.id);
    setSelectionError(null);
    const request = new AbortController();
    selection.current = request;
    try {
      await onSelect(agent, request.signal);
      if (mounted.current) onComplete();
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Couldn’t open chat. Try again.");
    } finally {
      setOpeningId(null);
    }
  }
  return (
    <Command>
      <CommandInput
        aria-label={fullSharedT("fullShared.search_agents_by_name_or_role_e5d13d")}
        placeholder={fullSharedT("fullShared.search_by_name_or_role_ada757")}
        value={search}
        onValueChange={setSearch}
      />
      {selectionError && <p role="alert" className="px-4 py-3 text-sm text-destructive">{selectionError}</p>}
      {openingId && <p role="status" className="sr-only">{fullSharedT("fullShared.opening_conversation_12a7ad")}</p>}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-2 p-4 text-sm">
          <p>{fullSharedT("fullShared.couldn_t_load_agents_try_again_3ca8c8")}</p>
          {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{fullSharedT("newIssue.retry")}</Button>}
        </div>
      ) : loading ? (
        <p role="status" className="p-4 text-sm text-muted-foreground">{fullSharedT("fullShared.loading_agents_ae0c14")}</p>
      ) : (
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 px-4">
              <span>{agents.length ? fullSharedT("fullShared.no_agents_match_1c722f", { value1: search }) : fullSharedT("providerSetup.access.picker.empty")}</span>
              {agents.length ? <>
                <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.try_another_name_or_role_ec1f4d")}</span>
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{fullSharedT("common.clearSearch")}</Button>
              </> : <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.create_an_agent_from_the_agents_page_to_start_chatti_8f52c0")}</span>}
            </div>
          </CommandEmpty>
          <CommandGroup>
            {agents.map((agent) => (
              <CommandItem
                key={agent.id}
                value={agent.id}
                keywords={[agent.name, agent.title ?? "", agent.role]}
                onSelect={() => { void selectAgent(agent); }}
                disabled={openingId !== null}
                className="gap-3 px-3 py-3"
              >
                {renderAgentIcon ? renderAgentIcon(agent) : <AgentIcon icon={agent.icon} className="size-4 shrink-0" />}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{agent.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{agent.title ?? agent.role}</span>
                </span>
                {existingChatAgentIds && <span className="shrink-0 text-xs text-muted-foreground">{existingChatAgentIds.includes(agent.id) ? fullSharedT("fullShared.open_chat_060017") : fullSharedT("fullShared.new_chat_db1838")}</span>}
                {agent.status === "paused" && <span className="text-xs text-(--status-agent-paused)">{fullSharedT("fullShared.paused_e159b0")}</span>}
                {agent.status === "terminated" && <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.terminated_56a88f")}</span>}
                {agent.status === "pending_approval" && <span className="text-xs text-muted-foreground">{fullSharedT("decisionForms.interaction.awaitingApproval")}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}
