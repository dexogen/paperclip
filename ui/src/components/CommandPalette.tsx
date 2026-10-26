import { i18n, Trans, useTranslation } from "@/i18n";
import type { TFunction } from "i18next";
import { AgentIdentity } from "@/components/AgentIdentity";
import { useCombinedInboxTasksEnabled } from "@/hooks/useCombinedInboxTasksEnabled";
import { useState, useEffect, useMemo, useCallback } from "react";
import { defaultFilter } from "cmdk";
import { useLocation, useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useSidebar } from "../context/SidebarContext";
import { issuesApi } from "../api/issues";
import { authApi } from "../api/auth";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { instanceSettingsApi } from "../api/instanceSettings";
import { queryKeys } from "../lib/queryKeys";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  CircleDot,
  Bot,
  Hexagon,
  Target,
  LayoutDashboard,
  Inbox,
  DollarSign,
  History,
  SquarePen,
  FileCode2,
  Plus,
  Search,
} from "lucide-react";
import { agentUrl, projectUrl } from "../lib/utils";
import {
  SEARCH_OPERATOR_QUICK_FILTERS,
  buildSearchPathFromQuery,
  parseSearchQuery,
  type SearchQueryParserContext,
} from "../lib/search-query-parser";

const SEARCH_ALL_VALUE = "__paperclip-search-all__";

export function buildFullSearchPath(query: string, context: SearchQueryParserContext = {}) {
  return buildSearchPathFromQuery(query, context);
}

const ISSUE_DETAIL_PATH_RE = /\/issues\/[^/?#]+(?:$|\?|#|\/)/;

function isOnIssueDetail(pathname: string): boolean {
  return ISSUE_DETAIL_PATH_RE.test(pathname);
}

/** Max promoted project matches kept when typing in the palette. */
const MAX_MATCHED_PROJECTS = 5;
/** Task cap when projects are also promoted, so Tasks can't crowd them out. */
const TASK_LIMIT_WITH_PROJECTS = 6;
const TASK_LIMIT = 10;

/** True when every char of `needle` appears in `haystack` in order (fuzzy). */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (haystack[j] === needle[i]) i += 1;
  }
  return i === needle.length;
}

/**
 * Score a project against a lowercased query. Higher is a better match;
 * `null` means no match. Prefers name hits (exact > prefix > substring) over
 * description hits, with fuzzy subsequence as a last resort.
 */
function scoreProjectMatch(name: string, description: string, q: string): number | null {
  if (name === q) return 1000;
  // Shorter names rank first, but clamp the length penalty so a prefix match can
  // never sink below the substring band (max 699) for unusually long names —
  // keeps the prefix > substring > description > fuzzy ordering invariant.
  if (name.startsWith(q)) return Math.max(700, 900 - name.length);
  const nameIdx = name.indexOf(q);
  if (nameIdx >= 0) return 700 - nameIdx;
  if (description.includes(q)) return 400;
  if (isSubsequence(q, name)) return 200;
  return null;
}

function paletteRoleLabel(role: string, t: TFunction = i18n.getFixedT("en")): string {
  switch (role) {
    case "ceo": return t("searchUi.palette.roles.ceo");
    case "cto": return t("searchUi.palette.roles.cto");
    case "cmo": return t("searchUi.palette.roles.cmo");
    case "cfo": return t("searchUi.palette.roles.cfo");
    case "security": return t("searchUi.palette.roles.security");
    case "engineer": return t("searchUi.palette.roles.engineer");
    case "designer": return t("searchUi.palette.roles.designer");
    case "pm": return t("searchUi.palette.roles.pm");
    case "qa": return t("searchUi.palette.roles.qa");
    case "devops": return t("searchUi.palette.roles.devops");
    case "researcher": return t("searchUi.palette.roles.researcher");
    case "general": return t("searchUi.palette.roles.general");
    default: return role;
  }
}

export function CommandPalette() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompanyId } = useCompany();
  const { openNewIssue, openNewAgent } = useDialogActions();
  const { isMobile, setSidebarOpen } = useSidebar();
  const searchQuery = query.trim();
  const onIssueDetail = isOnIssueDetail(location.pathname);
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
    retry: false,
  });
  const { enabled: combinedInboxTasksEnabled } = useCombinedInboxTasksEnabled();
  const fileViewerEnabled = experimentalSettings?.enableExperimentalFileViewer === true;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        if (isMobile) setSidebarOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, setSidebarOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && open,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && open,
  });
  const projects = useMemo(
    () => allProjects,
    [allProjects],
  );

  const { data: labels = [] } = useQuery({
    queryKey: queryKeys.issues.labels(selectedCompanyId!),
    queryFn: () => issuesApi.listLabels(selectedCompanyId!),
    enabled: !!selectedCompanyId && open,
  });

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    enabled: open,
  });

  const currentUserId = session?.user?.id ?? session?.session?.userId ?? null;
  const parserContext = useMemo<SearchQueryParserContext>(() => ({
    currentUserId,
    agents,
    projects,
    labels,
  }), [agents, currentUserId, labels, projects]);
  const parsedQuery = useMemo(() => parseSearchQuery(query, parserContext), [parserContext, query]);
  const quickSearchQuery = parsedQuery.query.trim();

  const { data: issues = [] } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && open && searchQuery.length === 0,
  });

  const { data: searchedIssues = [] } = useQuery({
    queryKey: queryKeys.issues.search(selectedCompanyId!, quickSearchQuery, undefined, 10),
    queryFn: () => issuesApi.list(selectedCompanyId!, { q: quickSearchQuery, limit: 10, includeRoutineExecutions: true }),
    enabled: !!selectedCompanyId && open && quickSearchQuery.length > 0,
  });

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  function goFullSearch() {
    go(buildFullSearchPath(searchQuery, parserContext));
  }

  const agentName = (id: string | null) => {
    if (!id) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  const visibleIssues = useMemo(
    () => (quickSearchQuery.length > 0 ? searchedIssues : issues),
    [issues, searchedIssues, quickSearchQuery],
  );

  // Client-side typeahead ranking over the already-loaded projects. cmdk ranks
  // items by their `value` (which defaults to the rendered name) and would bury
  // or drop description-only matches, so we rank in JS and force-match below.
  const matchedProjects = useMemo(() => {
    if (quickSearchQuery.length === 0) return [];
    const q = quickSearchQuery.toLowerCase();
    return projects
      .map((project) => ({
        project,
        score: scoreProjectMatch(
          project.name.toLowerCase(),
          (project.description ?? "").toLowerCase(),
          q,
        ),
      }))
      .filter((entry): entry is { project: (typeof projects)[number]; score: number } => entry.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHED_PROJECTS)
      .map((entry) => entry.project);
  }, [projects, quickSearchQuery]);

  const showSearchAll = searchQuery.length > 0;
  const showPromotedProjects = showSearchAll && matchedProjects.length > 0;
  const commandFilter = useCallback((value: string, search: string, keywords?: string[]) => {
    if (value.startsWith(SEARCH_ALL_VALUE) || (showPromotedProjects && value.startsWith("project:"))) return 1;
    return defaultFilter(value, search, keywords);
  }, [showPromotedProjects]);
  const taskLimit = showPromotedProjects ? TASK_LIMIT_WITH_PROJECTS : TASK_LIMIT;
  const showEmptyHint =
    showSearchAll && visibleIssues.length === 0 && matchedProjects.length === 0;

  return (
    <CommandDialog filter={commandFilter} open={open} onOpenChange={(v) => {
        setOpen(v);
        if (v && isMobile) setSidebarOpen(false);
      }}>
      <CommandInput
        placeholder={t("searchUi.palette.placeholder")}
        aria-label={t("searchUi.palette.query")}
        value={query}
        onValueChange={setQuery}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            goFullSearch();
            return;
          }
          if (event.key === "Enter" && showEmptyHint) {
            const selectedId = event.currentTarget.getAttribute("aria-activedescendant");
            const selectedValue = selectedId ? document.getElementById(selectedId)?.getAttribute("data-value") : null;
            if (!selectedValue || selectedValue.startsWith(SEARCH_ALL_VALUE)) {
              event.preventDefault();
              goFullSearch();
            }
          }
        }}
      />
      <CommandList>
        <CommandEmpty>
          {showSearchAll ? (
            <span>
              <Trans
                i18nKey="searchUi.palette.emptyHint"
                components={{
                  key: <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-(length:--text-nano)" />,
                  action: <span className="font-medium" />,
                }}
              />
            </span>
          ) : (
            t("searchUi.palette.noResults")
          )}
        </CommandEmpty>

        {showSearchAll ? (
          <CommandGroup heading={t("searchUi.palette.search")}>
            <CommandItem
              value={`${SEARCH_ALL_VALUE} ${searchQuery}`}
              onSelect={goFullSearch}
              className="bg-accent/40 border border-accent data-[selected=true]:bg-accent/60"
              data-testid="command-search-all"
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                <Trans
                  i18nKey="searchUi.palette.searchAll"
                  values={{ query: searchQuery }}
                  components={{ query: <span className="font-semibold" /> }}
                  tOptions={{ interpolation: { escapeValue: true } }}
                  shouldUnescape
                />
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span>{t("searchUi.palette.openFullSearch")}</span>
                <kbd className="rounded border border-border bg-background px-1 py-0.5 text-(length:--text-nano)">↵</kbd>
              </span>
            </CommandItem>
          </CommandGroup>
        ) : null}

        {showSearchAll ? <CommandSeparator /> : null}

        <CommandGroup heading={t("searchUi.palette.quickFilters")}>
          {SEARCH_OPERATOR_QUICK_FILTERS.map((chip) => (
            <CommandItem
              key={chip}
              value={`quick-filter ${chip}`}
              onSelect={() => setQuery((current) => current.trim() ? `${current.trim()} ${chip}` : chip)}
              data-testid="command-filter-chip"
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="font-mono text-xs">{chip}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {showPromotedProjects && (
          <>
            <CommandGroup heading={t("searchUi.palette.projects")}>
              {matchedProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project:${project.id}`}
                  keywords={[searchQuery, project.name, project.description ?? ""]}
                  onSelect={() => go(projectUrl(project))}
                  data-testid="command-project-match"
                >
                  <Hexagon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{project.name}</span>
                  {project.description ? (
                    <span className="ml-2 hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:inline">
                      {project.description}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading={t("searchUi.palette.actions")}>
          <CommandItem value="action:create-task" keywords={[t("searchUi.palette.newTask", { lng: "en" }), t("searchUi.palette.newTask", { lng: "ru" })]}
            onSelect={() => {
              setOpen(false);
              openNewIssue();
            }}
          >
            <SquarePen className="mr-2 h-4 w-4" />
            {t("searchUi.palette.newTask")}
            <span className="ml-auto text-xs text-muted-foreground">C</span>
          </CommandItem>
          {onIssueDetail && fileViewerEnabled && (
            <CommandItem value="action:open-file" keywords={[t("searchUi.palette.openFile", { lng: "en" }), t("searchUi.palette.openFile", { lng: "ru" })]}
              onSelect={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("paperclip:open-file-viewer"));
              }}
            >
              <FileCode2 className="mr-2 h-4 w-4" />
              {t("searchUi.palette.openFile")}
              <span className="ml-auto text-xs text-muted-foreground">g f</span>
            </CommandItem>
          )}
          <CommandItem value="action:create-agent" keywords={[t("searchUi.palette.newAgent", { lng: "en" }), t("searchUi.palette.newAgent", { lng: "ru" })]}
            onSelect={() => {
              setOpen(false);
              openNewAgent();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("searchUi.palette.newAgent")}
          </CommandItem>
          <CommandItem value="action:create-project" keywords={[t("searchUi.palette.newProject", { lng: "en" }), t("searchUi.palette.newProject", { lng: "ru" })]} onSelect={() => go("/projects")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("searchUi.palette.newProject")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("searchUi.palette.pages")}>
          <CommandItem value="page:dashboard" keywords={[t("searchUi.palette.dashboard", { lng: "en" }), t("searchUi.palette.dashboard", { lng: "ru" })]} onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t("searchUi.palette.dashboard")}
          </CommandItem>
          <CommandItem value="page:inbox" keywords={combinedInboxTasksEnabled
            ? [t("searchUi.palette.myWork", { lng: "en" }), t("searchUi.palette.myWork", { lng: "ru" })]
            : [t("searchUi.palette.inbox", { lng: "en" }), t("searchUi.palette.inbox", { lng: "ru" })]} onSelect={() => go(combinedInboxTasksEnabled ? "/issues?view=mine" : "/inbox")}>
            <Inbox className="mr-2 h-4 w-4" />
            {combinedInboxTasksEnabled ? t("searchUi.palette.myWork") : t("searchUi.palette.inbox")}
          </CommandItem>
          <CommandItem value="page:tasks" keywords={[t("searchUi.palette.tasks", { lng: "en" }), t("searchUi.palette.tasks", { lng: "ru" })]} onSelect={() => go("/issues")}>
            <CircleDot className="mr-2 h-4 w-4" />
            {t("searchUi.palette.tasks")}
          </CommandItem>
          <CommandItem value="page:projects" keywords={[t("searchUi.palette.projects", { lng: "en" }), t("searchUi.palette.projects", { lng: "ru" })]} onSelect={() => go("/projects")}>
            <Hexagon className="mr-2 h-4 w-4" />
            {t("searchUi.palette.projects")}
          </CommandItem>
          <CommandItem value="page:goals" keywords={[t("searchUi.palette.goals", { lng: "en" }), t("searchUi.palette.goals", { lng: "ru" })]} onSelect={() => go("/goals")}>
            <Target className="mr-2 h-4 w-4" />
            {t("searchUi.palette.goals")}
          </CommandItem>
          <CommandItem value="page:agents" keywords={[t("searchUi.palette.agents", { lng: "en" }), t("searchUi.palette.agents", { lng: "ru" })]} onSelect={() => go("/agents")}>
            <Bot className="mr-2 h-4 w-4" />
            {t("searchUi.palette.agents")}
          </CommandItem>
          <CommandItem value="page:costs" keywords={[t("searchUi.palette.costs", { lng: "en" }), t("searchUi.palette.costs", { lng: "ru" })]} onSelect={() => go("/costs")}>
            <DollarSign className="mr-2 h-4 w-4" />
            {t("searchUi.palette.costs")}
          </CommandItem>
          <CommandItem value="page:activity" keywords={[t("searchUi.palette.activity", { lng: "en" }), t("searchUi.palette.activity", { lng: "ru" })]} onSelect={() => go("/activity")}>
            <History className="mr-2 h-4 w-4" />
            {t("searchUi.palette.activity")}
          </CommandItem>
        </CommandGroup>

        {visibleIssues.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("searchUi.palette.tasks")}>
              {visibleIssues.slice(0, taskLimit).map((issue) => (
                <CommandItem
                  key={issue.id}
                  value={`issue:${issue.id}`}
                  keywords={[searchQuery, issue.identifier ?? "", issue.title]}
                  onSelect={() => go(`/issues/${issue.identifier ?? issue.id}`)}
                >
                  <CircleDot className="mr-2 h-4 w-4" />
                  <span className="text-muted-foreground mr-2 font-mono text-xs">
                    {issue.identifier ?? issue.id.slice(0, 8)}
                  </span>
                  <span className="flex-1 truncate">{issue.title}</span>
                  {issue.assigneeAgentId && (() => {
                    const name = agentName(issue.assigneeAgentId);
                    return name ? <AgentIdentity agent={agents?.find((agent) => agent.id === issue.assigneeAgentId) ?? { id: issue.assigneeAgentId, name }} size="sm" className="ml-2 hidden sm:inline-flex" /> : null;
                  })()}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {agents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("searchUi.palette.agents")}>
              {agents.slice(0, 10).map((agent) => (
                <CommandItem key={agent.id} value={`agent:${agent.id}`} keywords={[agent.name, agent.role, ...new Set([paletteRoleLabel(agent.role), paletteRoleLabel(agent.role, i18n.getFixedT("ru")), paletteRoleLabel(agent.role, t)])]} onSelect={() => go(agentUrl(agent))}>
                  <Bot className="mr-2 h-4 w-4" />
                  {agent.name}
                  <span className="text-xs text-muted-foreground ml-2">{paletteRoleLabel(agent.role, t)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && !showSearchAll && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("searchUi.palette.projects")}>
              {projects.slice(0, 10).map((project) => (
                <CommandItem key={project.id} value={`project:${project.id}`} keywords={[project.name]} onSelect={() => go(projectUrl(project))}>
                  <Hexagon className="mr-2 h-4 w-4" />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
