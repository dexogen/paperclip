import { t as fullSharedTailT, Trans as FullSharedTailTrans, useTranslation as useFullSharedTailTranslation } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { Issue } from "@paperclipai/shared";
import { Boxes, CircleCheck, CirclePlus, FolderOpen, History, LayoutDashboard, MessageCircle, Package, Repeat, Search, Unplug, Users } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { SidebarAccountMenu } from "./SidebarAccountMenu";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { SidebarNavExpandedProvider, SidebarNavItem } from "./SidebarNavItem";
import { SidebarSection } from "./SidebarSection";
import { TruncatedTextMarqueeProvider } from "./TruncatedText";
import { Button } from "./ui/button";
import { FlyoutAppearanceProvider } from "./ui/flyout";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useScrollbarWhileScrolling } from "./side-panel/use-scrollbar-while-scrolling";

export type DesignSidebarRecentTask = Pick<Issue, "id" | "companyId" | "identifier" | "title">;

/** Shared staged sidebar. The caller supplies company-scoped recent tasks and actions. */
export function DesignSidebar({ onNewTask, recentTasks = [] }: { onNewTask: () => void; recentTasks?: readonly DesignSidebarRecentTask[] }) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const { selectedCompany } = useCompany();
  const root = `/${selectedCompany?.issuePrefix ?? "PAP"}`;
  const companyRecentTasks = recentTasks.filter(task => task.companyId === selectedCompany?.id);
  const handleRecentScroll = useScrollbarWhileScrolling();
  return (
    <FlyoutAppearanceProvider><TruncatedTextMarqueeProvider><SidebarNavExpandedProvider>
      <div className="design-sidebar">
        <div className="design-sidebar-brand">
          <SidebarCompanyMenu showChevron={false} />
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="design-sidebar-search" aria-label={fullSharedT("fullShared.global_search_f72cf4")} onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true, cancelable: true }))}><Search aria-hidden /></Button></TooltipTrigger><TooltipContent side="right">{fullSharedT("fullShared.search_tasks_agents_projects_597135")}</TooltipContent></Tooltip>
        </div>
        <nav className="design-sidebar-navigation" aria-label={fullSharedT("fullShared.main_navigation_eb3559")}>
          <div className="design-sidebar-primary">
            <Button variant="ghost" className="design-sidebar-new-task" onClick={onNewTask}><CirclePlus aria-hidden />{fullSharedT("sidebar.newTask")}</Button>
            <SidebarNavItem className="design-sidebar-item" to={`${root}/dashboard`} label={fullSharedT("sidebar.dashboard")} icon={LayoutDashboard} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/chats`} label={fullSharedT("sidebar.chat")} icon={MessageCircle} />
          </div>
          <SidebarSection label={fullSharedT("sidebar.work")}>
            <SidebarNavItem className="design-sidebar-item" to={`${root}/issues`} label={fullSharedT("sidebar.tasks")} icon={CircleCheck} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/projects`} label={fullSharedT("sidebar.projects")} icon={FolderOpen} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/routines`} label={fullSharedT("sidebar.routines")} icon={Repeat} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/artifacts`} label={fullSharedT("sidebar.artifacts")} icon={Package} />
          </SidebarSection>
          <SidebarSection label={fullSharedT("sidebar.org")}>
            <SidebarNavItem className="design-sidebar-item" to={`${root}/agents`} label={fullSharedT("sidebar.agents")} icon={Users} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/skills`} label={fullSharedT("sidebar.skills")} icon={Boxes} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/apps`} label={fullSharedT("sidebar.connectors")} icon={Unplug} />
            <SidebarNavItem className="design-sidebar-item" to={`${root}/activity`} label={fullSharedT("sidebar.audit")} icon={History} />
          </SidebarSection>
          {companyRecentTasks.length > 0 ? <div className="design-sidebar-recents">
            <SidebarSection label={fullSharedTailT("fullSharedTail.recent_tasks_49a027")}>
              <div onScroll={handleRecentScroll} className="design-sidebar-recent-list scrollbar-while-scrolling" role="region" aria-label={fullSharedT("fullShared.recent_tasks_7b940d")} tabIndex={0}>
              {companyRecentTasks.map(issue => <SidebarNavItem key={issue.id} className="design-sidebar-item" to={`${root}/issues/${issue.identifier}`} label={issue.title} />)}
              </div>
            </SidebarSection>
          </div> : null}
        </nav>
        <div className="design-sidebar-account"><SidebarAccountMenu forceExpanded /></div>
      </div>
    </SidebarNavExpandedProvider></TruncatedTextMarqueeProvider></FlyoutAppearanceProvider>
  );
}
