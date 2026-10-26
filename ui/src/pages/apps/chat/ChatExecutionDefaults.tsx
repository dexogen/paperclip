import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChatExecutionDefaults as Defaults, TaskWorkspaceSelection } from "@paperclipai/shared";
import { projectsApi } from "@/api/projects";
import { executionWorkspacesApi } from "@/api/execution-workspaces";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";

function selectionKey(value: TaskWorkspaceSelection | null | undefined): string {
  if (value === undefined) return "inherit";
  if (value === null) return "clear";
  if (value.kind === "task_directory") return "task";
  if (value.kind === "existing") return `existing:${value.workspaceId}`;
  return `source:${value.projectWorkspaceId}:${value.mode}`;
}

export function ChatExecutionDefaults({ companyId, value, resource = false, onSave }: {
  companyId: string;
  value: Defaults | null | undefined;
  resource?: boolean;
  onSave: (defaults: Defaults | null) => Promise<void>;
}) {
  useFullAppsTranslation();
  const id = useId();
  const [draft, setDraft] = useState<Defaults | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const [savedFrom, setSavedFrom] = useState<string | null>(null);
  const projects = useQuery({ queryKey: queryKeys.projects.list(companyId), queryFn: () => projectsApi.list(companyId) });
  const workspaces = useQuery({
    queryKey: ["channel-workspace-choices", companyId],
    queryFn: () => executionWorkspacesApi.listSummaries(companyId, { selectableForTask: true }),
  });
  const current = draft ?? value ?? {};
  const valueKey = JSON.stringify(value ?? {});
  const saved = savedFrom !== null;
  // Keep the accepted selections until the parent publishes refreshed defaults.
  useEffect(() => {
    if (savedFrom !== null && savedFrom !== valueKey) setDraft(null);
  }, [savedFrom, valueKey]);
  const projectValue = current.projectId === undefined ? "inherit" : current.projectId ?? "none";
  const workspaceValue = selectionKey(current.workspace);
  const choices = new Map<string, TaskWorkspaceSelection>();
  choices.set("task", { kind: "task_directory" });
  for (const project of projects.data ?? []) {
    for (const source of project.workspaces ?? []) {
      for (const mode of ["managed_isolated", "shared"] as const) {
        choices.set(`source:${source.id}:${mode}`, { kind: "configured_source", projectWorkspaceId: source.id, mode });
      }
    }
  }
  for (const workspace of workspaces.data ?? []) {
    choices.set(`existing:${workspace.id}`, { kind: "existing", workspaceId: workspace.id });
  }
  const dirty = !saved && JSON.stringify(current) !== valueKey;
  const change = (next: Defaults) => { setDraft(next); setSavedFrom(null); setError(null); };
  return <form className="space-y-3" aria-labelledby={`${id}-title`} onSubmit={async (event) => {
    event.preventDefault();
    if (pending || !dirty) return;
    setPending(true); setError(null); setSavedFrom(null);
    try { await onSave(Object.keys(current).length ? current : null); setSavedFrom(valueKey); }
    catch (cause) { setError(cause instanceof Error ? appErrorDisplay(cause) : ownAppDisplayText("fullApps.couldn_t_save_task_defaults_try_again_590d88")); }
    finally { setPending(false); }
  }}>
    <div className="space-y-1">
      <h3 id={`${id}-title`} className="text-sm font-semibold">{fullAppsT("fullApps.task_defaults_1aa47f")}</h3>
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.applies_to_new_conversations_existing_tasks_keep_the_a7a456")}</p>
    </div>
    {(projects.isError || workspaces.isError) && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_load_available_projects_or_workspaces_b9b901")}<button type="button" className="underline" onClick={() => { void projects.refetch(); void workspaces.refetch(); }}>{fullAppsT("fullApps.try_again_d8b839")}</button></p>}
    <div className="space-y-2">
      <label htmlFor={`${id}-project`} className="text-sm font-medium">{fullAppsT("newIssue.project")}</label>
      <NativeSelect id={`${id}-project`} value={projectValue} disabled={pending || projects.isPending} onChange={(event) => {
        const { projectId: _previous, ...rest } = current;
        change(event.target.value === "inherit" ? rest : { ...rest, projectId: event.target.value === "none" ? null : event.target.value });
      }}>
        <option value="inherit">{resource ? fullAppsT("fullApps.use_connection_defaults_45a567") : fullAppsT("fullApps.use_task_defaults_e9d8b8")}</option>
        <option value="none">{fullAppsT("newIssue.noProject")}</option>
        {current.projectId && !projects.data?.some((project) => project.id === current.projectId) && <option value={current.projectId}>{fullAppsT("fullApps.saved_project_unavailable_8cc816")}</option>}
        {(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </NativeSelect>
    </div>
    <div className="space-y-2">
      <label htmlFor={`${id}-workspace`} className="text-sm font-medium">{fullAppsT("taskViews.column_workspace")}</label>
      <NativeSelect id={`${id}-workspace`} value={workspaceValue} disabled={pending || projects.isPending || workspaces.isPending} onChange={(event) => {
        const key = event.target.value;
        const { workspace: _previous, ...rest } = current;
        if (key === "inherit") change(rest);
        else if (key === "clear") change({ ...rest, workspace: null });
        else { const workspace = choices.get(key); if (workspace) change({ ...rest, workspace }); }
      }}>
        <option value="inherit">{resource ? fullAppsT("fullApps.use_connection_defaults_45a567") : fullAppsT("fullApps.use_project_or_task_defaults_1dd0a3")}</option>
        {resource && <option value="clear">{fullAppsT("fullApps.use_project_or_task_defaults_1dd0a3")}</option>}
        {!resource && workspaceValue === "clear" && <option value="clear">{fullAppsT("fullApps.use_project_or_task_defaults_1dd0a3")}</option>}
        <option value="task">{fullAppsT("fullApps.task_files_separate_folder_28c185")}</option>
        {current.workspace && !choices.has(workspaceValue) && <option value={workspaceValue}>{fullAppsT("fullApps.saved_workspace_unavailable_9da39c")}</option>}
        {(projects.data ?? []).filter((project) => project.workspaces?.length).map((project) => <optgroup key={project.id} label={project.name}>
          {project.workspaces.flatMap((source) => [
            <option key={`${source.id}:isolated`} value={`source:${source.id}:managed_isolated`}><FullAppsTrans i18nKey="fullApps.isolated_checkout_da201d" components={{ part1: <>{source.name}</> }} /></option>,
            <option key={`${source.id}:shared`} value={`source:${source.id}:shared`}><FullAppsTrans i18nKey="fullApps.shared_folder_2fa5c9" components={{ part1: <>{source.name}</> }} /></option>,
          ])}
        </optgroup>)}
        {(workspaces.data?.length ?? 0) > 0 && <optgroup label={fullAppsT("fullApps.existing_workspaces_d497d7")}>{workspaces.data!.map((workspace) => <option key={workspace.id} value={`existing:${workspace.id}`}>{workspace.name}</option>)}</optgroup>}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.project_and_workspace_access_is_checked_for_each_tas_565c94")}</p>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{renderAppDisplayText(error)}</p>}
    <div className="flex items-center justify-between gap-3">
      <div>{dirty ? <Button type="button" variant="ghost" disabled={pending} onClick={() => { setDraft(null); setError(null); }}>{fullAppsT("fullApps.cancel_19766e")}</Button> : saved ? <span role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.saved_for_new_tasks_43f571")}</span> : null}</div>
      <Button type="submit" disabled={!dirty || pending}>{pending ? fullAppsT("fullApps.saving_23e392") : fullAppsT("fullApps.save_defaults_a91af2")}</Button>
    </div>
  </form>;
}
