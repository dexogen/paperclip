import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, MoreHorizontal, Plus, ShieldCheck, Users } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/context/ToastContext";
import { EffectiveAgentPanel } from "../ProfilesTab";
import { ErrorState, LoadingState, RelativeTime, ToolsPageHeader } from "../shared";
import { ProfileActionDialog, type ProfileActionDialogKind } from "./ProfileActionDialog";
import { TEMPLATES, type TemplateKey } from "./profile-model";
import { useProfilesData } from "./useProfilesData";
import { allowsLabel, assignedLabel, isDraft, STATUS_LABEL } from "./profile-summary";

/** The wizard route for a fresh profile, optionally seeded with a template. */
function newProfileHref(template?: TemplateKey): string {
  return template
    ? `/apps/advanced/profiles/new?template=${encodeURIComponent(template)}`
    : "/apps/advanced/profiles/new";
}

function statusVariant(status: ToolProfileWithDetails["status"]): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline";
}

export function ProfilesIndex({
  companyId,
  initialStatusFilter,
  initialResolverOpen,
}: {
  companyId: string;
  initialStatusFilter?: "active" | "archived";
  initialResolverOpen?: boolean;
}) {
  useFullAppsTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { profiles, agents } = useProfilesData(companyId);
  const [resolverOpen, setResolverOpen] = useState(Boolean(initialResolverOpen));
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">(initialStatusFilter ?? "active");
  const [actionDialog, setActionDialog] = useState<{
    kind: ProfileActionDialogKind;
    profile: ToolProfileWithDetails;
  } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("check") === "1") setResolverOpen(true);
  }, []);

  const agentOptions = useMemo(
    () => (agents.data ?? []).map((a) => ({ id: a.id, name: a.name })),
    [agents.data],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.profiles(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.testAgentAccesses() });
  };

  const errorBody = (error: unknown) => String((error as Error)?.message ?? error);

  const duplicate = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.duplicateProfile(profile.id, { name: `${profile.name} (copy)` }),
    onSuccess: () => {
      pushToast({ title: fullAppsT("fullApps.profile_duplicated_7a2bc1"), body: fullAppsT("fullApps.the_copy_is_not_assigned_to_anyone_yet_5f0ff0"), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) =>
      pushToast({ title: fullAppsT("fullApps.could_not_duplicate_552d5a"), body: errorBody(error), tone: "error" }),
  });

  const archive = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.updateProfile(profile.id, { status: "archived" }),
    onSuccess: () => {
      pushToast({ title: fullAppsT("fullApps.profile_archived_114157"), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: fullAppsT("fullApps.could_not_archive_060291"), body: errorBody(error), tone: "error" }),
  });

  const restore = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) =>
      toolsApi.updateProfile(profile.id, { status: "active" }),
    onSuccess: () => {
      pushToast({ title: fullAppsT("fullApps.profile_restored_6e40ed"), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: fullAppsT("fullApps.could_not_restore_fc2b76"), body: errorBody(error), tone: "error" }),
  });

  const remove = useMutation({
    mutationFn: (profile: ToolProfileWithDetails) => toolsApi.deleteProfile(profile.id),
    onSuccess: () => {
      pushToast({ title: fullAppsT("fullApps.profile_deleted_451546"), tone: "success" });
      invalidate();
    },
    onError: (error: unknown) => pushToast({ title: fullAppsT("fullApps.could_not_delete_00035f"), body: errorBody(error), tone: "error" }),
  });

  const header = (
    <ToolsPageHeader
      title={fullAppsT("agentToolsUi.access.profiles")}
      description={fullAppsT("fullApps.decide_which_tools_your_agents_can_use_build_a_profi_6d0044")}
      actions={
        <>
          <Button variant="outline" onClick={() => setResolverOpen(true)}>
            <ShieldCheck className="mr-1.5 h-4 w-4" />{fullAppsT("fullApps.check_an_agent_s_access_cfb8ca")}</Button>
          <Button onClick={() => navigate(newProfileHref())}>
            <Plus className="mr-1.5 h-4 w-4" />{fullAppsT("fullApps.new_profile_fcf4f3")}</Button>
        </>
      }
    />
  );

  const resolverDialog = (
    <Sheet open={resolverOpen} onOpenChange={setResolverOpen}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{fullAppsT("fullApps.check_an_agent_s_access_cfb8ca")}</SheetTitle>
          <SheetDescription>{fullAppsT("fullApps.see_exactly_which_tools_an_agent_can_use_right_now_a_014cb0")}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <EffectiveAgentPanel companyId={companyId} agentOptions={agentOptions} />
        </div>
      </SheetContent>
    </Sheet>
  );

  if (profiles.isLoading) {
    return (
      <div className="space-y-5">
        {header}
        <LoadingState label={fullAppsT("fullApps.loading_profiles_16b0bb")} />
      </div>
    );
  }
  if (profiles.isError) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState t={fullAppsI18n.t} error={profiles.error} onRetry={() => profiles.refetch()} />
      </div>
    );
  }

  const allRows = profiles.data?.profiles ?? [];
  const rows = allRows.filter((p) => (statusFilter === "archived" ? p.status === "archived" : p.status !== "archived"));

  return (
    <div className="space-y-5">
      {header}

      <div className="inline-flex rounded-md border border-border p-0.5">
        {(["active", "archived"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium",
              statusFilter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key === "active" ? fullAppsT("fullApps.active_923406") : fullAppsT("fullApps.archived_bdb865")}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        statusFilter === "archived" ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">{fullAppsT("fullApps.no_archived_profiles_392d10")}</div>
        ) : (
          <EmptyTemplatePicker onPick={(key) => navigate(newProfileHref(key))} />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-(--sz-30pct)" />
              <col className="w-(--sz-18pct)" />
              <col className="w-(--sz-24pct)" />
              <col className="w-(--sz-12pct)" />
              <col className="w-(--sz-12pct)" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2 font-medium">{fullAppsT("profile.title")}</th>
                <th className="px-3 py-2 font-medium">{fullAppsT("fullApps.allows_8b1d52")}</th>
                <th className="px-3 py-2 font-medium">{fullAppsT("fullApps.assigned_to_08ee45")}</th>
                <th className="px-3 py-2 font-medium">{fullAppsT("sidebar.status")}</th>
                <th className="px-3 py-2 font-medium">{fullAppsT("fullApps.updated_3a5ecc")}</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => {
                const assigned = assignedLabel(profile.summary);
                const draft = isDraft(profile);
                const open = () => navigate(draft ? `/apps/advanced/profiles/${profile.id}/edit` : `/apps/advanced/profiles/${profile.id}`);
                return (
                  <tr
                    key={profile.id}
                    className="group h-10 border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="min-w-0 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={open}
                        title={profile.name}
                        className="block w-full truncate text-left font-medium text-foreground hover:underline"
                      >
                        {profile.name}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span>{allowsLabel(profile.summary)}</span>
                        {(profile.newToolsPendingCount ?? 0) > 0 ? (
                          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"><FullAppsTrans i18nKey="fullApps.new_b2f594" components={{ part1: <>{profile.newToolsPendingCount}</> }} /></Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {assigned.unassigned ? (
                        <span className="text-muted-foreground">
                          {assigned.text}
                          <span className="ml-1 text-xs text-muted-foreground/70">{fullAppsT("fullApps.does_not_change_access_0952f0")}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          {profile.summary.isCompanyDefault ? null : (
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {assigned.text}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-2">
                        <Badge variant={statusVariant(profile.status)}>{STATUS_LABEL[profile.status]}</Badge>
                        {draft ? (
                          <button
                            type="button"
                            onClick={open}
                            className="text-xs font-medium text-primary hover:underline"
                          >{fullAppsT("agentDetailUi.run.resume")}</button>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <RelativeTime t={fullAppsI18n.t} value={profile.updatedAt} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <RowMenu
                        onEdit={open}
                        onDuplicate={() => duplicate.mutate(profile)}
                        onArchive={() => archive.mutate(profile)}
                        onRestore={profile.status === "archived" ? () => setActionDialog({ kind: "restore", profile }) : undefined}
                        onDelete={() => setActionDialog({ kind: "delete", profile })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resolverDialog}
      <ProfileActionDialog
        kind={actionDialog?.kind ?? null}
        profile={actionDialog?.profile ?? null}
        pending={restore.isPending || remove.isPending}
        onClose={() => setActionDialog(null)}
        onArchive={() => {
          if (!actionDialog) return;
          archive.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
        onRestore={() => {
          if (!actionDialog) return;
          restore.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
        onDelete={() => {
          if (!actionDialog) return;
          remove.mutate(actionDialog.profile, { onSuccess: () => setActionDialog(null) });
        }}
      />
    </div>
  );
}

function RowMenu({
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  useFullAppsTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={fullAppsT("fullApps.profile_actions_f29b9c")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>{fullAppsT("fullApps.edit_464c4f")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>{fullAppsT("fullApps.duplicate_02cdaa")}</DropdownMenuItem>
        {onRestore ? (
          <DropdownMenuItem onSelect={onRestore}>
            <ArchiveRestore className="mr-1.5 h-4 w-4" />{fullAppsT("fullApps.restore_a76e13")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onArchive}>{fullAppsT("fullApps.archive_66f480")}</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">{fullAppsT("taskPanels.delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Empty state (AP2): the same five step-1 template cards the wizard opens with. */
function EmptyTemplatePicker({ onPick }: { onPick: (key: TemplateKey) => void }) {
  useFullAppsTranslation();
  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <div className="mb-4 max-w-2xl">
        <h3 className="text-base font-semibold text-foreground">{fullAppsT("fullApps.create_your_first_access_profile_1234b0")}</h3>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.pick_a_starting_point_you_can_fine_tune_exactly_whic_e07fd8")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => onPick(template.key)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors",
              "hover:border-primary hover:bg-primary/5",
            )}
          >
            <span className="text-sm font-medium text-foreground">{template.title}</span>
            <span className="text-xs text-muted-foreground">{template.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
