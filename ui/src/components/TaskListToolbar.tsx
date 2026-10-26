import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { ComponentProps, Ref } from "react";
import { ChevronDown, CirclePlus, Columns3, List, ListTree } from "lucide-react";
import { IssueFiltersPopover } from "./IssueFiltersPopover";
import { Button } from "./ui/button";
import { ToolbarSearch } from "./ToolbarSearch";
import { FlyoutHeader, FlyoutOptions } from "./ui/flyout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { taskListViews as views, type TaskListView } from "@/lib/task-list-views";

/** Canonical proposed task toolbar; review under Components / Toolbars / Tasks. */
export function TaskListToolbar({ view, onViewChange, query, onQueryChange, searchRef, layout, onLayoutChange, allExpanded, onToggleExpanded, onNewTask, filters }: {
  view: TaskListView;
  onViewChange: (view: TaskListView) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchRef?: Ref<HTMLInputElement>;
  layout: "list" | "board";
  onLayoutChange: (layout: "list" | "board") => void;
  allExpanded: boolean;
  onToggleExpanded: () => void;
  onNewTask: () => void;
  filters: ComponentProps<typeof IssueFiltersPopover>;
}) {
  useFullSharedTranslation();
  return (
    <div data-canonical-toolbar="tasks" className="design-page-toolbar" role="toolbar" aria-label={fullSharedT("fullShared.task_list_controls_515af1")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" className="design-toolbar-button design-view-trigger" aria-label={fullSharedT("fullShared.task_view_4fffa6", { value1: views.find(option => option.value === view)!.label })}>{views.find(option => option.value === view)!.label}<ChevronDown aria-hidden /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="task-list-options" aria-label={fullSharedT("fullShared.task_views_eb704b")}>
          <DropdownMenuLabel asChild><FlyoutHeader className="task-list-options-heading">{fullSharedT("fullShared.views_69c404")}</FlyoutHeader></DropdownMenuLabel>
          <DropdownMenuRadioGroup asChild value={view} onValueChange={value => onViewChange(value as TaskListView)}><FlyoutOptions className="task-list-options-items">
            {views.map(option => <DropdownMenuRadioItem className="task-list-options-item" key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
          </FlyoutOptions></DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolbarSearch query={query} onQueryChange={onQueryChange} inputRef={searchRef} label={fullSharedT("tasks.search")} placeholder={fullSharedT("fullShared.search_tasks_945d1c")} />
      <div className="design-view-toggle" role="group" aria-label={fullSharedT("fullShared.task_layout_9d37ef")}>
        {[{ value: "list", label: fullSharedT("agents.listView"), icon: List }, { value: "board", label: fullSharedT("tasks.boardView"), icon: Columns3 }].map(({ value, label, icon: Icon }) => (
          <Tooltip key={value}><TooltipTrigger asChild><Button variant="ghost" className="design-toolbar-button design-toolbar-icon" aria-label={label} aria-pressed={layout === value} onClick={() => onLayoutChange(value as "list" | "board")}><Icon aria-hidden /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
        ))}
      </div>
      <div className="design-toolbar-actions">
        <Tooltip><TooltipTrigger asChild><Button variant="outline" className="design-toolbar-button design-toolbar-icon" disabled={layout !== "list"} aria-label={allExpanded ? fullSharedT("fullShared.collapse_all_tasks_87bb61") : fullSharedT("fullShared.expand_all_tasks_91d629")} onClick={onToggleExpanded}><ListTree aria-hidden /></Button></TooltipTrigger><TooltipContent>{allExpanded ? fullSharedT("fullShared.collapse_all_tasks_87bb61") : fullSharedT("fullShared.expand_all_tasks_91d629")}</TooltipContent></Tooltip>
        <div className="design-toolbar-filter"><IssueFiltersPopover {...filters} presentation="refreshed" buttonVariant="outline" iconOnly enableExternalObjectFilters={false} /></div>
        <Button className="design-toolbar-button design-new-task" onClick={onNewTask}><CirclePlus aria-hidden />{fullSharedT("sidebar.newTask")}</Button>
      </div>
    </div>
  );
}
