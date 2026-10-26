import type { TFunction } from "i18next";
import { i18n, useTranslation } from "@/i18n";
import { useMemo, type CSSProperties } from "react";
import { Folder, GitBranch, GitBranchPlus, Monitor } from "lucide-react";
import type { ExecutionWorkspaceSummary } from "@paperclipai/shared";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { orderReusableExecutionWorkspaces } from "@/lib/reusable-execution-workspaces";

interface WorktreeOption extends SearchableSelectOption {
  mode: string;
  workspaceId?: string;
  description: string;
}

interface ComposerWorktreePickerProps {
  mode: string;
  workspaceId: string;
  workspaces: readonly ExecutionWorkspaceSummary[];
  onChange: (mode: string, workspaceId: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled?: boolean;
  mobile?: boolean;
  contentStyle?: CSSProperties;
  selectedWorkspaceLabel?: string;
}

function worktreeModeOptions(t: TFunction): WorktreeOption[] {
  return [
    { key: "isolated_workspace", value: "isolated_workspace", mode: "isolated_workspace", label: t("taskChatUi.worktree.new"), description: t("taskChatUi.worktree.newHint"),
      searchText: [i18n.getFixedT("en")("taskChatUi.worktree.new"), i18n.getFixedT("ru")("taskChatUi.worktree.new")].join(" ") },
    { key: "shared_workspace", value: "shared_workspace", mode: "shared_workspace", label: t("taskChatUi.worktree.shared"), description: t("taskChatUi.worktree.sharedHint"),
      searchText: [i18n.getFixedT("en")("taskChatUi.worktree.shared"), i18n.getFixedT("ru")("taskChatUi.worktree.shared")].join(" ") },
    { key: "operator_branch", value: "operator_branch", mode: "operator_branch", label: t("taskChatUi.worktree.branch"), description: t("taskChatUi.worktree.branchHint"),
      searchText: [i18n.getFixedT("en")("taskChatUi.worktree.branch"), i18n.getFixedT("ru")("taskChatUi.worktree.branch")].join(" ") },
    { key: "agent_default", value: "agent_default", mode: "agent_default", label: t("taskChatUi.worktree.agentDefault"), description: t("taskChatUi.worktree.agentDefaultHint"),
      searchText: [i18n.getFixedT("en")("taskChatUi.worktree.agentDefault"), i18n.getFixedT("ru")("taskChatUi.worktree.agentDefault")].join(" ") },
    { key: "inherit", value: "inherit", mode: "inherit", label: t("taskChatUi.worktree.projectDefault"), description: t("taskChatUi.worktree.projectDefaultHint"),
      searchText: [i18n.getFixedT("en")("taskChatUi.worktree.projectDefault"), i18n.getFixedT("ru")("taskChatUi.worktree.projectDefault")].join(" ") },
  ];
}

/** Reuses the searchable selector and the existing workspace recency ordering. */
export function ComposerWorktreePicker({
  mode, workspaceId, workspaces, onChange, loading, error, onRetry,
  disabled, mobile, contentStyle, selectedWorkspaceLabel,
}: ComposerWorktreePickerProps) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const modeOptions = worktreeModeOptions(t);
    return [
      { id: "new", options: [modeOptions[0]!] },
      {
        id: "reuse", label: t("taskChatUi.worktree.reuse"),
        options: orderReusableExecutionWorkspaces(workspaces).map((workspace): WorktreeOption => ({
          key: `reuse:${workspace.id}`, value: `reuse:${workspace.id}`,
          workspaceId: workspace.id, mode: "reuse_existing", label: workspace.name,
          description: workspace.branchName ?? t("taskChatUi.worktree.existing"),
          searchText: `${workspace.branchName ?? ""} ${workspace.id} ${workspace.branchName ? "" : [i18n.getFixedT("en")("taskChatUi.worktree.existing"), i18n.getFixedT("ru")("taskChatUi.worktree.existing")].join(" ")}`,
        })),
      },
      {
        id: "other", label: t("taskChatUi.worktree.other"),
        options: modeOptions.filter((option) => option.mode === "shared_workspace"
          || (option.mode !== "isolated_workspace" && option.mode === mode)),
      },
    ];
  }, [mode, workspaces, t]);

  const value = mode === "reuse_existing" ? `reuse:${workspaceId}` : mode;
  return (
    <SearchableSelect<string, WorktreeOption>
      value={value}
      groups={groups}
      onValueChange={(_, option) => onChange(option.mode, option.workspaceId ?? "")}
      placeholder={t("taskChatUi.worktree.title")}
      triggerAriaLabel={t("taskChatUi.worktree.title")}
      mobileTitle={t("taskChatUi.worktree.title")}
      searchPlaceholder={t("taskChatUi.worktree.search")}
      emptyMessage={t("taskChatUi.worktree.empty")}
      disabled={disabled}
      modal={mobile}
      contentStyle={contentStyle}
      contentWidth="auto"
      className="min-w-0 flex-1 sm:flex-none sm:max-w-72"
      triggerClassName="h-8 gap-1.5 border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-0"
      renderValue={(option) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <GitBranch className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="hidden text-muted-foreground sm:inline">{t("taskChatUi.worktree.prefix")}</span>
            {option?.label ?? selectedWorkspaceLabel ?? t("taskChatUi.worktree.select")}
          </span>
        </span>
      )}
      renderOption={(option) => {
        const Icon = option.workspaceId ? GitBranch : option.mode === "isolated_workspace" ? GitBranchPlus
          : option.mode === "agent_default" ? Monitor : option.mode === "operator_branch" ? GitBranch : Folder;
        return (
          <>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              <span className="truncate text-xs text-muted-foreground">{option.description}</span>
            </span>
          </>
        );
      }}
      listFooter={loading || error || workspaces.length === 0 ? (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground" role="status">
          {loading ? t("taskChatUi.worktree.loading") : error ? (
            <span className="flex items-center justify-between gap-2">
              {t("taskChatUi.worktree.error")}
              <button type="button" className="rounded px-2 py-1 text-foreground hover:bg-accent" onClick={onRetry}>{t("taskChatUi.worktree.retry")}</button>
            </span>
          ) : t("taskChatUi.worktree.none")}
        </div>
      ) : undefined}
    />
  );
}
