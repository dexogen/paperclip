import { statusLabel } from "@/i18n/ui-labels";
import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useMemo } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  buildReusableExecutionWorkspaceOptionGroups,
  reusableWorkspaceOptionMatches,
  scoreReusableWorkspaceOptionMatch,
  type ReusableExecutionWorkspaceLike,
  type ReusableWorkspaceOption,
} from "@/lib/reusable-execution-workspaces";
import { cn } from "@/lib/utils";

const COMPACT_TRIGGER_CLASS = "h-8 px-2 py-1.5 text-xs font-normal";

interface ReusableExecutionWorkspaceSelectProps<TWorkspace extends ReusableExecutionWorkspaceLike> {
  value: string;
  workspaces: readonly TWorkspace[];
  onValueChange: (workspaceId: string, option: ReusableWorkspaceOption<TWorkspace>) => void;
  placeholder?: string;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  disablePortal?: boolean;
}

export function ReusableExecutionWorkspaceSelect<TWorkspace extends ReusableExecutionWorkspaceLike>({
  value,
  workspaces,
  onValueChange,
  placeholder = fullSharedT("fullShared.choose_an_existing_workspace_f8f732"),
  loading = false,
  error = false,
  disabled = false,
  className,
  triggerClassName,
  disablePortal,
}: ReusableExecutionWorkspaceSelectProps<TWorkspace>) {
  useFullSharedTranslation();
  const groups = useMemo(() => buildReusableExecutionWorkspaceOptionGroups(workspaces), [workspaces]);

  return (
    <SearchableSelect<string, ReusableWorkspaceOption<TWorkspace>>
      value={value}
      groups={groups}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={fullSharedTailT("fullSharedTail.searchWorkspaces")}
      emptyMessage={error ? fullSharedT("fullShared.workspaces_failed_to_load_d6a5fb") : fullSharedT("taskProperties.fields.noMatchingWorkspaces")}
      loadingMessage={fullSharedTailT("fullSharedTail.loadingWorkspaces")}
      loading={loading}
      disabled={disabled}
      className={className}
      triggerClassName={cn(COMPACT_TRIGGER_CLASS, triggerClassName)}
      filterOption={reusableWorkspaceOptionMatches}
      scoreOption={scoreReusableWorkspaceOptionMatch}
      disablePortal={disablePortal}
      renderOption={(option, { selected }) => (
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", selected && "font-medium")}>{option.label}</span>
          <span className="truncate text-(length:--text-micro) text-muted-foreground">
            {option.workspace.status ? `${statusLabel(option.workspace.status)} - ` : ""}
            {option.description}
          </span>
        </span>
      )}
    />
  );
}
