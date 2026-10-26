import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GOOGLE_WORKSPACE_DEFAULT_SELECTION, GOOGLE_WORKSPACE_SERVICE_GROUPS, googleWorkspaceSelectionForScopes, type GoogleWorkspaceServiceSelection, type ToolConnection } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AppLogo } from "@/pages/apps/AppLogo";

export function GoogleWorkspaceServiceFields({ value, onChange }: {
  value: GoogleWorkspaceServiceSelection;
  onChange: (value: GoogleWorkspaceServiceSelection) => void;
}) {
  useFullAppsTranslation();
  return <div className="divide-y">
    {GOOGLE_WORKSPACE_SERVICE_GROUPS.map(group => <div key={group.id} className="flex items-center gap-3 py-3">
      <AppLogo name={group.name} brandKey={group.brandKey} size={28} />
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={`workspace-service-${group.id}`} className="text-sm font-medium">{group.name}</label>
        {"description" in group && <p className="text-xs text-muted-foreground">{group.description}</p>}
      </div>
      <NativeSelect aria-label={fullAppsT("fullApps.access_b0ab62", { value1: group.name })} disabled={!value[group.id]} value={value[group.id] ?? "write"}
        className="w-auto shrink-0 disabled:opacity-50"
        onChange={event => onChange({ ...value, [group.id]: event.target.value as "read" | "write" })}>
        <option value="read">{fullAppsT("skillsGap.readOnly")}</option><option value="write">{fullAppsT("fullApps.read_write_5cf0e8")}</option>
      </NativeSelect>
      <ToggleSwitch id={`workspace-service-${group.id}`} aria-label={group.name} checked={Boolean(value[group.id])}
        onCheckedChange={checked => {
          const next = { ...value };
          if (checked) next[group.id] = "write";
          else delete next[group.id];
          onChange(next);
        }} />
    </div>)}
  </div>;
}

type DialogProps = {
  onContinue: (value: GoogleWorkspaceServiceSelection) => void;
  onCancel: (selection?: GoogleWorkspaceServiceSelection) => void;
  initial?: GoogleWorkspaceServiceSelection;
  connection?: ToolConnection;
};

export function GoogleWorkspaceServicesDialog(props: DialogProps) {
  useFullAppsTranslation();
  const existing = props.connection && props.connection.status !== "draft" ? props.connection : null;
  const grants = useQuery({ queryKey: ["workspace-service-consent", existing?.id], queryFn: () => toolsApi.listConnectionGrants(existing!.id), enabled: Boolean(existing) });
  if (existing && !grants.data) return <Dialog open onOpenChange={open => { if (!open) props.onCancel(); }}><DialogContent>
    <DialogTitle>{fullAppsT("fullApps.connect_google_workspace_e0d417")}</DialogTitle><DialogDescription>{grants.isError ? fullAppsT("fullApps.could_not_load_your_saved_service_access_your_connec_6b4223") : fullAppsT("fullApps.loading_your_saved_service_access_d4dd20")}</DialogDescription>
    <footer className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => props.onCancel()}>{fullAppsT("fullApps.cancel_19766e")}</Button>{grants.isError && <Button onClick={() => void grants.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</Button>}</footer>
  </DialogContent></Dialog>;
  const grant = grants.data?.grants.find(grant => existing?.credentialPolicy === "per_user"
    ? grant.kind === "user" && grant.subjectUserId === grants.data?.currentUserId
    : existing?.credentialPolicy === "per_agent"
      ? grant.kind === "agent" && grant.subjectAgentId === (existing.config?.oauth as { connectorSubjectAgentId?: string } | undefined)?.connectorSubjectAgentId
      : grant.kind === "organization");
  const savedScopes = grant?.providerTenant?.oauth?.requestedScopes ?? grant?.providerTenant?.oauth?.scopes ?? [];
  return <ServicePicker {...props} initial={props.initial ?? (existing ? googleWorkspaceSelectionForScopes(savedScopes) : undefined)} />;
}

function ServicePicker({ onContinue, onCancel, initial = GOOGLE_WORKSPACE_DEFAULT_SELECTION }: DialogProps) {
  useFullAppsTranslation();
  const [selection, setSelection] = useState(initial);
  const empty = Object.keys(selection).length === 0;
  return <Dialog open onOpenChange={open => { if (!open) onCancel(selection); }}>
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader className="text-left">
        <div className="flex items-center gap-3"><AppLogo name="Google Workspace" brandKey="google" size={40} /><DialogTitle>{fullAppsT("fullApps.connect_google_workspace_e0d417")}</DialogTitle></div>
        <DialogDescription className="sr-only">{fullAppsT("fullApps.choose_the_google_services_to_connect_ec8b28")}</DialogDescription>
      </DialogHeader>
      <GoogleWorkspaceServiceFields value={selection} onChange={setSelection} />
      {empty && <p role="status" className="text-xs text-muted-foreground">{fullAppsT("fullApps.select_at_least_one_service_to_continue_53f086")}</p>}
      <footer className="flex items-center justify-between gap-3 pt-4">
        <Button variant="ghost" onClick={() => onCancel(selection)}>{fullAppsT("fullApps.cancel_19766e")}</Button>
        <Button disabled={empty} onClick={() => onContinue(selection)}>{fullAppsT("onboarding.actions.continue")}</Button>
      </footer>
    </DialogContent>
  </Dialog>;
}
