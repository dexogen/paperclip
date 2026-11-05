import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useState } from "react";
import { ChevronDown, Loader2, Settings2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { AgentPanel } from "@/components/agent-detail/AgentPanels";
import { queryKeys } from "@/lib/queryKeys";

type Field = "root" | "entry";
type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; root: string; entry: string }
  | { kind: "error"; field: Field | null; message: string };

export function checkExternalProfile(root: string, entry: string): { field: Field; message: string } | null {
  if (!root.startsWith("/") && !root.startsWith("~")) return { field: "root", message: translateUi("interfaceUpdates.use_an_absolute_path_that_starts_with_or_1e652e18") };
  if (entry.startsWith("/") || entry.split(/[\\/]/).includes("..")) {
    return { field: "entry", message: translateUi("interfaceUpdates.the_entry_file_has_to_sit_inside_the_root_path_cb2cf2bc") };
  }
  return null;
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export function InstructionsBundleSettings({
  agentId,
  agentUrlKey,
  companyId,
  mode,
  rootPath,
  entryFile,
  blocked,
  onSwitched,
}: {
  agentId: string;
  agentUrlKey?: string | null;
  companyId?: string;
  mode: "managed" | "external";
  rootPath: string;
  entryFile: string;
  blocked: boolean;
  onSwitched: () => void;
}) {
  useUiTranslation();
  const queryClient = useQueryClient();
  const [root, setRoot] = useState(mode === "external" ? rootPath : "");
  const [entry, setEntry] = useState(mode === "external" ? entryFile : "");
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const busy = load.kind === "loading";
  const trimmedRoot = root.trim();
  const trimmedEntry = entry.trim();
  const unchanged = mode === "external" && trimmedRoot === rootPath && trimmedEntry === entryFile;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.agents.instructionsBundle(agentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
    if (agentUrlKey) queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentUrlKey) });
  };

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    if (!busy) setLoad({ kind: "idle" });
  };

  const loadProfile = async () => {
    const problem = checkExternalProfile(trimmedRoot, trimmedEntry);
    if (problem) return setLoad({ kind: "error", ...problem });
    setLoad({ kind: "loading" });
    try {
      await agentsApi.updateInstructionsBundle(
        agentId,
        { mode: "external", rootPath: trimmedRoot, entryFile: trimmedEntry, requireExistingEntry: true },
        companyId,
      );
    } catch (error) {
      setLoad({ kind: "error", field: null, message: errorMessage(error, `Couldn’t read ${trimmedEntry} in ${trimmedRoot}.`) });
      return;
    }
    await refresh();
    onSwitched();
    setLoad({ kind: "loaded", root: trimmedRoot, entry: trimmedEntry });
  };

  const switchToManaged = async () => {
    setLoad({ kind: "loading" });
    try {
      await agentsApi.updateInstructionsBundle(agentId, { mode: "managed", rootPath: null, entryFile }, companyId);
      await refresh();
      onSwitched();
      setLoad({ kind: "idle" });
    } catch (error) {
      setLoad({ kind: "error", field: null, message: errorMessage(error, "Couldn’t switch back to the managed bundle.") });
    }
  };

  const invalid = (field: Field) => load.kind === "error" && load.field === field;

  return (
    <Collapsible defaultOpen={mode === "external"} className="flex flex-col gap-(--agent-detail-module-gap)">
      <CollapsibleTrigger className="group flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-foreground">
        <Settings2 className="size-4" aria-hidden />
        {translateUi("projectConfigUi.budget.advanced")}
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AgentPanel className="gap-4 p-(--agent-detail-module-inset)" aria-label={translateUi("interfaceUpdates.external_management_4b81b102")}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{translateUi("interfaceUpdates.external_management_4b81b102")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{translateUi("interfaceUpdates.point_this_agent_at_a_directory_on_disk_paperclip__7f68f070")}</p>
          </div>
          <div className="grid gap-(--agent-detail-module-gap) sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{translateUi("agentDetailUi.instructions.rootPath")}</span>
              <Input
                value={root}
                onChange={(event) => edit(setRoot)(event.target.value)}
                disabled={busy || blocked}
                aria-invalid={invalid("root") || undefined}
                placeholder={translateUi("interfaceUpdates.absolute_path_to_agent_prompts_809c3523")}
                className="font-mono text-xs"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{translateUi("agentDetailUi.instructions.entry")}</span>
              <Input
                value={entry}
                onChange={(event) => edit(setEntry)(event.target.value)}
                disabled={busy || blocked}
                aria-invalid={invalid("entry") || undefined}
                placeholder={translateUi("interfaceUpdates.agents_md_a54ff182")}
                className="font-mono text-xs"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {mode === "external" ? (
              <Button variant="ghost" size="sm" className="mr-auto -ml-3" onClick={() => void switchToManaged()} disabled={busy || blocked}>
                {translateUi("interfaceUpdates.use_managed_bundle_807bd816")}
              </Button>
            ) : null}
            <p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-xs">
              {blocked ? <span className="text-muted-foreground">{translateUi("interfaceUpdates.save_or_discard_your_file_changes_first_b83fbcc3")}</span> : null}
              {!blocked && load.kind === "error" ? <span className="text-destructive">{load.message}</span> : null}
              {!blocked && load.kind === "loaded" ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full bg-(--agent-detail-dot-saved)" aria-hidden />
                  {translateUi("interfaceUpdates.loaded_d01476df")} {load.entry} {translateUi("fullDiagnostics.fromModule")} {load.root}
                </span>
              ) : null}
            </p>
            <Button size="sm" onClick={() => void loadProfile()} disabled={!trimmedRoot || !trimmedEntry || busy || blocked || unchanged}>
              {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}
              {busy ? translateUi("taskPanels.loading") : translateUi("interfaceUpdates.load_profile_186b373f")}
            </Button>
          </div>
        </AgentPanel>
      </CollapsibleContent>
    </Collapsible>
  );
}
