import type { TFunction } from "i18next";
import { useTranslation, i18n } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isUuidLike, type ProjectWorkspace } from "@paperclipai/shared";
import { ArrowLeft, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { ChoosePathButton } from "../components/PathInstructionsModal";
import { MissingPluginTabPlaceholder } from "../components/MissingPluginTabPlaceholder";
import { projectsApi } from "../api/projects";
import { PageTabBar } from "../components/PageTabBar";
import { PluginSlotMount, usePluginSlots } from "@/plugins/slots";
import {
  buildWorkspaceRuntimeControlSections,
  WorkspaceRuntimeControls,
  type WorkspaceRuntimeControlRequest,
} from "../components/WorkspaceRuntimeControls";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useManagedSandboxOnly } from "../hooks/useManagedSandboxOnly";
import { queryKeys } from "../lib/queryKeys";
import { formatDateTime, projectRouteRef, projectWorkspaceUrl } from "../lib/utils";

type WorkspaceFormState = {
  name: string;
  sourceType: ProjectWorkspaceSourceType;
  cwd: string;
  repoUrl: string;
  repoRef: string;
  defaultRef: string;
  visibility: ProjectWorkspaceVisibility;
  setupCommand: string;
  cleanupCommand: string;
  remoteProvider: string;
  remoteWorkspaceRef: string;
  sharedWorkspaceKey: string;
  runtimeConfig: string;
};

type ProjectWorkspaceSourceType = ProjectWorkspace["sourceType"];
type ProjectWorkspaceVisibility = ProjectWorkspace["visibility"];
type ProjectWorkspaceBaseTab = "configuration";
type ProjectWorkspacePluginTab = `plugin:${string}`;
type ProjectWorkspaceTab = ProjectWorkspaceBaseTab | ProjectWorkspacePluginTab;
type OrderedProjectWorkspaceTabItem = {
  value: ProjectWorkspaceTab;
  label: string;
  order: number;
};

const DEFAULT_PLUGIN_DETAIL_TAB_ORDER = 100;

function isProjectWorkspacePluginTab(value: string | null): value is ProjectWorkspacePluginTab {
  return typeof value === "string" && value.startsWith("plugin:");
}

function projectWorkspaceTabFromSearch(search: string): ProjectWorkspaceTab {
  const tab = new URLSearchParams(search).get("tab");
  if (isProjectWorkspacePluginTab(tab)) return tab;
  return "configuration";
}

function orderProjectWorkspaceTabItems(items: OrderedProjectWorkspaceTabItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => left.item.order - right.item.order || left.index - right.index)
    .map(({ item }) => item);
}

function sourceTypeOptions(t: TFunction): Array<{ value: ProjectWorkspaceSourceType; label: string; description: string }> {
  return [
    { value: "local_path", label: t("projectWorkspacesUi.source.local"), description: t("projectWorkspacesUi.source.localHint") },
    { value: "non_git_path", label: t("projectWorkspacesUi.source.nonGit"), description: t("projectWorkspacesUi.source.nonGitHint") },
    { value: "git_repo", label: t("projectWorkspacesUi.source.repo"), description: t("projectWorkspacesUi.source.repoHint") },
    { value: "remote_managed", label: t("projectWorkspacesUi.source.remote"), description: t("projectWorkspacesUi.source.remoteHint") },
  ];
}

function visibilityOptions(t: TFunction): Array<{ value: ProjectWorkspaceVisibility; label: string }> {
  return [
    { value: "default", label: t("projectWorkspacesUi.visibility.default") },
    { value: "advanced", label: t("projectWorkspacesUi.visibility.advanced") },
  ];
}

function isSafeExternalUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAbsolutePath(value: string) {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function readText(value: string | null | undefined) {
  return value ?? "";
}

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

function formStateFromWorkspace(workspace: ProjectWorkspace): WorkspaceFormState {
  return {
    name: workspace.name,
    sourceType: workspace.sourceType,
    cwd: readText(workspace.cwd),
    repoUrl: readText(workspace.repoUrl),
    repoRef: readText(workspace.repoRef),
    defaultRef: readText(workspace.defaultRef),
    visibility: workspace.visibility,
    setupCommand: readText(workspace.setupCommand),
    cleanupCommand: readText(workspace.cleanupCommand),
    remoteProvider: readText(workspace.remoteProvider),
    remoteWorkspaceRef: readText(workspace.remoteWorkspaceRef),
    sharedWorkspaceKey: readText(workspace.sharedWorkspaceKey),
    runtimeConfig: formatJson(workspace.runtimeConfig?.workspaceRuntime),
  };
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRuntimeConfigJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null as Record<string, unknown> | null };

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false as const,
        error: { code: "jsonObject" as const },
      };
    }
    return { ok: true as const, value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? { raw: error.message } : { code: "json" as const },
    };
  }
}

function buildWorkspacePatch(initialState: WorkspaceFormState, nextState: WorkspaceFormState) {
  const patch: Record<string, unknown> = {};
  const maybeAssign = (key: keyof WorkspaceFormState, transform?: (value: string) => unknown) => {
    const initialValue = initialState[key];
    const nextValue = nextState[key];
    if (initialValue === nextValue) return;
    patch[key] = transform ? transform(nextValue) : nextValue;
  };

  maybeAssign("name", normalizeText);
  maybeAssign("sourceType");
  maybeAssign("cwd", normalizeText);
  maybeAssign("repoUrl", normalizeText);
  maybeAssign("repoRef", normalizeText);
  maybeAssign("defaultRef", normalizeText);
  maybeAssign("visibility");
  maybeAssign("setupCommand", normalizeText);
  maybeAssign("cleanupCommand", normalizeText);
  maybeAssign("remoteProvider", normalizeText);
  maybeAssign("remoteWorkspaceRef", normalizeText);
  maybeAssign("sharedWorkspaceKey", normalizeText);
  if (initialState.runtimeConfig !== nextState.runtimeConfig) {
    const parsed = parseRuntimeConfigJson(nextState.runtimeConfig);
    if (!parsed.ok) throw new Error(workspaceFormErrorLabel(parsed.error, i18n.getFixedT("en")));
    patch.runtimeConfig = {
      workspaceRuntime: parsed.value,
    };
  }

  return patch;
}

function validateWorkspaceForm(form: WorkspaceFormState) {
  const cwd = normalizeText(form.cwd);
  const repoUrl = normalizeText(form.repoUrl);
  const remoteWorkspaceRef = normalizeText(form.remoteWorkspaceRef);

  if (form.sourceType === "remote_managed") {
    if (!remoteWorkspaceRef && !repoUrl) {
      return { code: "remote" as const };
    }
  } else if (!cwd && !repoUrl) {
    return { code: "required" as const };
  }

  if (cwd && (form.sourceType === "local_path" || form.sourceType === "non_git_path") && !isAbsolutePath(cwd)) {
    return { code: "absolute" as const };
  }

  if (repoUrl) {
    try {
      new URL(repoUrl);
    } catch {
      return { code: "url" as const };
    }
  }

  const runtimeConfig = parseRuntimeConfigJson(form.runtimeConfig);
  if (!runtimeConfig.ok) {
    return runtimeConfig.error;
  }

  return null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{label}</span>
        {hint ? <span className="text-(length:--text-micro) leading-relaxed text-muted-foreground sm:text-right">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5 sm:flex-row sm:items-start sm:gap-3">
      <div className="shrink-0 text-xs text-muted-foreground sm:w-28">{label}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function ProjectWorkspaceDetail() {
  const { t } = useTranslation();
  const { companyPrefix, projectId, workspaceId } = useParams<{
    companyPrefix?: string;
    projectId: string;
    workspaceId: string;
  }>();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hideHostPaths } = useManagedSandboxOnly();
  const [form, setForm] = useState<WorkspaceFormState | null>(null);
  const [errorMessage, setErrorMessage] = useState<WorkspaceFormError | null>(null);
  const [runtimeActionMessage, setRuntimeActionMessage] = useState<WorkspaceRuntimeControlRequest["action"] | null>(null);
  const routeProjectRef = projectId ?? "";
  const routeWorkspaceId = workspaceId ?? "";
  const activeTab = useMemo(() => projectWorkspaceTabFromSearch(location.search), [location.search]);

  const routeCompanyId = useMemo(() => {
    if (!companyPrefix) return null;
    const requestedPrefix = companyPrefix.toUpperCase();
    return companies.find((company) => company.issuePrefix.toUpperCase() === requestedPrefix)?.id ?? null;
  }, [companies, companyPrefix]);

  const lookupCompanyId = routeCompanyId ?? selectedCompanyId ?? undefined;
  const canFetchProject = routeProjectRef.length > 0 && (isUuidLike(routeProjectRef) || Boolean(lookupCompanyId));
  const projectQuery = useQuery({
    queryKey: [...queryKeys.projects.detail(routeProjectRef), lookupCompanyId ?? null],
    queryFn: () => projectsApi.get(routeProjectRef, lookupCompanyId),
    enabled: canFetchProject,
  });

  const project = projectQuery.data ?? null;
  const workspace = useMemo(
    () => project?.workspaces.find((item) => item.id === routeWorkspaceId) ?? null,
    [project, routeWorkspaceId],
  );
  const canonicalProjectRef = project ? projectRouteRef(project) : routeProjectRef;
  const initialState = useMemo(() => (workspace ? formStateFromWorkspace(workspace) : null), [workspace]);
  const isDirty = Boolean(form && initialState && JSON.stringify(form) !== JSON.stringify(initialState));
  const {
    slots: pluginDetailSlots,
    isLoading: pluginDetailSlotsLoading,
    errorMessage: pluginDetailSlotsError,
  } = usePluginSlots({
    slotTypes: ["detailTab"],
    entityType: "project_workspace",
    companyId: project?.companyId ?? null,
    enabled: Boolean(project?.companyId),
  });
  const pluginTabItems = useMemo(
    () => pluginDetailSlots.map((slot) => ({
      value: `plugin:${slot.pluginKey}:${slot.id}` as ProjectWorkspacePluginTab,
      label: slot.displayName,
      order: slot.order ?? DEFAULT_PLUGIN_DETAIL_TAB_ORDER,
      slot,
    })),
    [pluginDetailSlots],
  );
  const tabItems = useMemo(
    () => orderProjectWorkspaceTabItems([{ value: "configuration", label: t("projectWorkspacesUi.page.configuration"), order: 30 }, ...pluginTabItems]),
    [pluginTabItems, t, i18n.language],
  );

  useEffect(() => {
    if (!project?.companyId || project.companyId === selectedCompanyId) return;
    setSelectedCompanyId(project.companyId, { source: "route_sync" });
  }, [project?.companyId, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    if (!workspace) return;
    setForm(formStateFromWorkspace(workspace));
    setErrorMessage(null);
  }, [workspace]);

  useEffect(() => {
    if (!project) return;
    setBreadcrumbs([
      { label: t("projectWorkspacesUi.page.projects"), href: "/projects" },
      { label: project.name, href: `/projects/${canonicalProjectRef}` },
      { label: t("projectWorkspacesUi.page.workspaces"), href: `/projects/${canonicalProjectRef}/workspaces` },
      { label: workspace?.name ?? routeWorkspaceId },
    ]);
  }, [setBreadcrumbs, project, canonicalProjectRef, workspace?.name, routeWorkspaceId, t, i18n.language]);

  useEffect(() => {
    if (!project) return;
    if (routeProjectRef === canonicalProjectRef) return;
    navigate(`${projectWorkspaceUrl(project, routeWorkspaceId)}${location.search}`, { replace: true });
  }, [project, routeProjectRef, canonicalProjectRef, routeWorkspaceId, location.search, navigate]);

  const invalidateProject = () => {
    if (!project) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.urlKey) });
    if (lookupCompanyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all(lookupCompanyId) });
    }
  };

  const updateWorkspace = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      projectsApi.updateWorkspace(project!.id, routeWorkspaceId, patch, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? { raw: error.message } : { code: "save" });
    },
  });

  const setPrimaryWorkspace = useMutation({
    mutationFn: () => projectsApi.updateWorkspace(project!.id, routeWorkspaceId, { isPrimary: true }, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? { raw: error.message } : { code: "update" });
    },
  });

  const controlRuntimeServices = useMutation({
    mutationFn: (request: WorkspaceRuntimeControlRequest) =>
      projectsApi.controlWorkspaceCommands(project!.id, routeWorkspaceId, request.action, lookupCompanyId, request),
    onSuccess: (result, request) => {
      invalidateProject();
      setErrorMessage(null);
      setRuntimeActionMessage(request.action);
    },
    onError: (error) => {
      setRuntimeActionMessage(null);
      setErrorMessage(error instanceof Error ? { raw: error.message } : { code: "control" });
    },
  });

  if (projectQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("projectWorkspacesUi.page.loading")}</p>;
  if (projectQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {projectQuery.error instanceof Error ? projectQuery.error.message : t("projectWorkspacesUi.page.loadFailed")}
      </p>
    );
  }
  if (!project || !workspace || !form || !initialState) {
    return <p className="text-sm text-muted-foreground">{t("projectWorkspacesUi.page.notFound")}</p>;
  }

  const canRunWorkspaceCommands = Boolean(workspace.cwd);
  const canStartRuntimeServices = Boolean(workspace.runtimeConfig?.workspaceRuntime) && canRunWorkspaceCommands;
  const runtimeControlSections = buildWorkspaceRuntimeControlSections({
    runtimeConfig: workspace.runtimeConfig?.workspaceRuntime ?? null,
    runtimeServices: workspace.runtimeServices ?? [],
    canStartServices: canStartRuntimeServices,
    canRunJobs: canRunWorkspaceCommands,
  });
  const pendingRuntimeAction = controlRuntimeServices.isPending ? controlRuntimeServices.variables ?? null : null;

  const saveChanges = () => {
    const validationError = validateWorkspaceForm(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const patch = buildWorkspacePatch(initialState, form);
    if (Object.keys(patch).length === 0) return;
    updateWorkspace.mutate(patch);
  };

  const sourceTypeDescription = sourceTypeOptions(t).find((option) => option.value === form.sourceType)?.description ?? null;
  const handleTabChange = (tab: ProjectWorkspaceTab) => {
    const workspacePath = projectWorkspaceUrl(project, routeWorkspaceId);
    if (isProjectWorkspacePluginTab(tab)) {
      navigate(`${workspacePath}?tab=${encodeURIComponent(tab)}`);
      return;
    }
    navigate(workspacePath);
  };
  const activePluginTab = pluginTabItems.find((item) => item.value === activeTab) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${canonicalProjectRef}/workspaces`}>
            <ArrowLeft className="mr-1 h-4 w-4" />{t("projectWorkspacesUi.page.back")}</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-xs font-medium uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.kind.project")}</div>
          <h1 className="truncate text-xl font-semibold sm:text-2xl">{workspace.name}</h1>
        </div>
        {!workspace.isPrimary ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={setPrimaryWorkspace.isPending}
            onClick={() => setPrimaryWorkspace.mutate()}
          >
            {setPrimaryWorkspace.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Check className="mr-2 h-4 w-4" />}
            {t("projectWorkspacesUi.page.makePrimary")}
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 sm:max-w-sm">
            <Sparkles className="h-4 w-4" />{t("projectWorkspacesUi.page.primary")}</div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as ProjectWorkspaceTab)}>
        <PageTabBar
          items={tabItems.map((item) => ({ value: item.value, label: item.label }))}
          align="start"
          value={activeTab}
          onValueChange={(value) => handleTabChange(value as ProjectWorkspaceTab)}
        />
      </Tabs>

      {activeTab === "configuration" ? (
      <div className="grid gap-6 lg:grid-cols-(--gtc-53)">
        <div className="space-y-6">
          <Card className="block p-5">
            <p className="max-w-2xl text-sm text-muted-foreground">{t("projectWorkspacesUi.page.intro")}</p>

            <Separator className="my-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("projectWorkspacesUi.page.name")}>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.name}
                  onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder={t("projectWorkspacesUi.page.name")}
                />
              </Field>

              <Field label={t("projectWorkspacesUi.page.visibility")}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, visibility: event.target.value as ProjectWorkspaceVisibility } : current)
                  }
                >
                  {visibilityOptions(t).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label={t("projectWorkspacesUi.page.sourceType")} hint={sourceTypeDescription ?? undefined}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.sourceType}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, sourceType: event.target.value as ProjectWorkspaceSourceType } : current)
                  }
                >
                  {sourceTypeOptions(t).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              {/*
                The local path is an absolute path on the execution host. Under
                the managed-sandbox-only policy every agent runs in the
                platform-managed environment, so neither the field nor the
                folder picker renders; the server refuses a cwd write anyway.
              */}
              {!hideHostPaths && (
                <div className="grid gap-4 md:grid-cols-(--gtc-13)">
                  <Field label={t("projectWorkspacesUi.page.localPath")}>
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                      value={form.cwd}
                      onChange={(event) => setForm((current) => current ? { ...current, cwd: event.target.value } : current)}
                      placeholder="/absolute/path/to/workspace"
                    />
                  </Field>
                  <div className="flex items-end">
                    <ChoosePathButton />
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspacesUi.page.repoUrl")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.repoUrl}
                    onChange={(event) => setForm((current) => current ? { ...current, repoUrl: event.target.value } : current)}
                    placeholder="https://github.com/org/repo"
                  />
                </Field>
                <Field label={t("projectWorkspacesUi.page.repoRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.repoRef}
                    onChange={(event) => setForm((current) => current ? { ...current, repoRef: event.target.value } : current)}
                    placeholder="origin/main"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspacesUi.page.defaultRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.defaultRef}
                    onChange={(event) => setForm((current) => current ? { ...current, defaultRef: event.target.value } : current)}
                    placeholder="origin/main"
                  />
                </Field>
                <Field label={t("projectWorkspacesUi.page.sharedKey")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.sharedWorkspaceKey}
                    onChange={(event) => setForm((current) => current ? { ...current, sharedWorkspaceKey: event.target.value } : current)}
                    placeholder="frontend"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspacesUi.page.remoteProvider")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.remoteProvider}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteProvider: event.target.value } : current)}
                    placeholder="codespaces"
                  />
                </Field>
                <Field label={t("projectWorkspacesUi.page.remoteRef")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.remoteWorkspaceRef}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteWorkspaceRef: event.target.value } : current)}
                    placeholder="workspace-123"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspacesUi.page.setupCommand")} hint={t("projectWorkspacesUi.page.setupHint")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.setupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, setupCommand: event.target.value } : current)}
                    placeholder="pnpm install && pnpm dev"
                  />
                </Field>
                <Field label={t("projectWorkspacesUi.page.cleanupCommand")} hint={t("projectWorkspacesUi.page.cleanupHint")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.cleanupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, cleanupCommand: event.target.value } : current)}
                    placeholder="pkill -f vite || true"
                  />
                </Field>
              </div>

              <details className="rounded-xl border border-dashed border-border/70 bg-background px-3 py-3">
                <summary className="cursor-pointer text-sm font-medium">{t("projectWorkspacesUi.page.advancedJson")}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{t("projectWorkspacesUi.page.jsonIntro")}</p>
                <div className="mt-3">
                  <Field label={t("projectWorkspacesUi.page.commandsJson")} hint={t("projectWorkspacesUi.page.commandsHint")}>
                    <textarea
                      className="min-h-96 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                      value={form.runtimeConfig}
                      onChange={(event) => setForm((current) => current ? { ...current, runtimeConfig: event.target.value } : current)}
                      placeholder={"{\n  \"commands\": [\n    {\n      \"id\": \"web\",\n      \"name\": \"web\",\n      \"kind\": \"service\",\n      \"command\": \"pnpm dev\",\n      \"cwd\": \".\",\n      \"port\": { \"type\": \"auto\" },\n      \"readiness\": {\n        \"type\": \"http\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"expose\": {\n        \"type\": \"url\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"lifecycle\": \"shared\",\n      \"reuseScope\": \"project_workspace\"\n    },\n    {\n      \"id\": \"db-migrate\",\n      \"name\": \"db:migrate\",\n      \"kind\": \"job\",\n      \"command\": \"pnpm db:migrate\",\n      \"cwd\": \".\"\n    }\n  ]\n}"}
                    />
                  </Field>
                </div>
              </details>
            </div>

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button className="w-full sm:w-auto" disabled={!isDirty || updateWorkspace.isPending} onClick={saveChanges}>
                {updateWorkspace.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("projectWorkspacesUi.page.save")}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!isDirty || updateWorkspace.isPending}
                onClick={() => {
                  setForm(initialState);
                  setErrorMessage(null);
                }}
              >{t("projectWorkspacesUi.page.reset")}</Button>
              {errorMessage ? <p className="text-sm text-destructive">{workspaceFormErrorLabel(errorMessage, t)}</p> : null}
              {!errorMessage && runtimeActionMessage ? <p className="text-sm text-muted-foreground">{runtimeActionLabel(runtimeActionMessage, t)}</p> : null}
              {!errorMessage && !isDirty ? <p className="text-sm text-muted-foreground">{t("projectWorkspacesUi.page.clean")}</p> : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="block p-5">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.page.facts")}</div>
              <h2 className="text-lg font-semibold">{t("projectWorkspacesUi.page.current")}</h2>
            </div>
            <Separator className="my-4" />
            <DetailRow label={t("projectWorkspacesUi.page.project")}>
              <Link to={`/projects/${canonicalProjectRef}`} className="hover:underline">{project.name}</Link>
            </DetailRow>
            <DetailRow label={t("projectWorkspacesUi.page.id")}>
              <span className="break-all font-mono text-xs">{workspace.id}</span>
            </DetailRow>
            {hideHostPaths ? null : (
              <DetailRow label={t("projectWorkspacesUi.page.localPath")}>
                <span className="break-all font-mono text-xs">{workspace.cwd ?? t("projectWorkspacesUi.page.none")}</span>
              </DetailRow>
            )}
            <DetailRow label={t("projectWorkspacesUi.page.repo")}>
              {workspace.repoUrl && isSafeExternalUrl(workspace.repoUrl) ? (
                <a href={workspace.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {workspace.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : workspace.repoUrl ? (
                <span className="break-all font-mono text-xs">{workspace.repoUrl}</span>
              ) : t("projectWorkspacesUi.page.none")}
            </DetailRow>
            <DetailRow label={t("projectWorkspacesUi.page.defaultRef")}>{workspace.defaultRef ?? t("projectWorkspacesUi.page.none")}</DetailRow>
            <DetailRow label={t("projectWorkspacesUi.page.updated")}>{formatDateTime(workspace.updatedAt)}</DetailRow>
          </Card>

          <Card className="block p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("projectWorkspacesUi.page.commands")}</div>
                <h2 className="text-lg font-semibold">{t("projectWorkspacesUi.page.servicesJobs")}</h2>
                <p className="text-sm text-muted-foreground">{t("projectWorkspacesUi.page.commandsIntro")}</p>
              </div>
            </div>
            <WorkspaceRuntimeControls
              className="mt-4"
              sections={runtimeControlSections}
              isPending={controlRuntimeServices.isPending}
              pendingRequest={pendingRuntimeAction}
              serviceEmptyMessage={
                workspace.runtimeConfig?.workspaceRuntime
                  ? t("projectWorkspacesUi.page.noStarted")
                  : t("projectWorkspacesUi.page.noConfig")
              }
              jobEmptyMessage={t("projectWorkspacesUi.page.noJobs")}
              disabledHint={t("projectWorkspacesUi.page.disabledHint")}
              onAction={(request) => controlRuntimeServices.mutate(request)}
            />
          </Card>
        </div>
      </div>
      ) : null}

      {isProjectWorkspacePluginTab(activeTab) ? (
        activePluginTab ? (
          <PluginSlotMount
            slot={activePluginTab.slot}
            context={{
              companyId: project.companyId,
              companyPrefix: companyPrefix ?? null,
              projectId: project.id,
              entityId: workspace.id,
              entityType: "project_workspace",
            }}
            missingBehavior="placeholder"
          />
        ) : pluginDetailSlotsLoading || pluginDetailSlotsError ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground">
            {pluginDetailSlotsError ? pluginDetailSlotsError : t("projectWorkspacesUi.page.pluginLoading")}
          </div>
        ) : (
          <MissingPluginTabPlaceholder
            defaultTabHref={`${projectWorkspaceUrl(project, routeWorkspaceId)}?tab=configuration`}
            defaultTabLabel={t("projectWorkspacesUi.page.backConfiguration")}
          />
        )
      ) : null}
    </div>
  );
}

type WorkspaceFormError = { raw: string } | { code: "remote" | "required" | "absolute" | "url" | "jsonObject" | "json" | "save" | "update" | "control" };

function workspaceFormErrorLabel(error: WorkspaceFormError, t: TFunction): string {
  if ("raw" in error) return error.raw;
  switch (error.code) {
    case "remote": return t("projectWorkspacesUi.error.remote");
    case "required": return t("projectWorkspacesUi.error.required");
    case "absolute": return t("projectWorkspacesUi.error.absolute");
    case "url": return t("projectWorkspacesUi.error.url");
    case "jsonObject": return t("projectWorkspacesUi.error.jsonObject");
    case "json": return t("projectWorkspacesUi.error.json");
    case "save": return t("projectWorkspacesUi.error.save");
    case "update": return t("projectWorkspacesUi.error.update");
    case "control": return t("projectWorkspacesUi.error.control");
  }
}

function runtimeActionLabel(action: WorkspaceRuntimeControlRequest["action"], t: TFunction) {
  switch (action) {
    case "run": return t("projectWorkspacesUi.runtime.jobCompleted");
    case "stop": return t("projectWorkspacesUi.runtime.stopped");
    case "restart": return t("projectWorkspacesUi.runtime.restarted");
    case "start": return t("projectWorkspacesUi.runtime.started");
  }
}
