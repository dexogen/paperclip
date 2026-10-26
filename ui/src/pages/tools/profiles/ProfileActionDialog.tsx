import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { AlertTriangle } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProfileActionDialogKind = "archive" | "delete" | "restore";

export function ProfileActionDialog({
  kind,
  profile,
  pending,
  onClose,
  onArchive,
  onRestore,
  onDelete,
}: {
  kind: ProfileActionDialogKind | null;
  profile: ToolProfileWithDetails | null;
  pending: boolean;
  onClose: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  useFullAppsTranslation();
  if (!kind || !profile) return null;

  const defaultDeleteBlocked = kind === "delete" && profile.summary.isCompanyDefault;
  const copy = {
    archive: {
      title: fullAppsT("fullApps.archive_profile_2962d8"),
      body: fullAppsT("fullApps.archiveProfileAgents", { count: profile.summary.appliesToAgentCount }),
      confirm: fullAppsT("fullApps.copy_66f4804ee23d"),
      action: onArchive,
    },
    restore: {
      title: fullAppsT("fullApps.restore_profile_ec01a8"),
      body: fullAppsT("fullApps.this_profile_will_be_active_again_and_can_be_assigne_945f98"),
      confirm: fullAppsT("fullApps.copy_a76e13b98392"),
      action: onRestore,
    },
    delete: {
      title: fullAppsT("fullApps.delete_profile_47311a"),
      body: defaultDeleteBlocked
        ? fullAppsT("fullApps.this_profile_is_the_organization_default_reassign_th_b0c43e")
        : fullAppsT("fullApps.deleteProfileAssignments", { count: profile.summary.assignmentCount }),
      confirm: fullAppsT("fullApps.copy_e2d0a54968ea"),
      action: onDelete,
    },
  }[kind];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {defaultDeleteBlocked ? (
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{fullAppsT("fullApps.choose_another_access_profile_and_make_it_the_organi_29f96b")}</span>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{fullAppsT("fullApps.cancel_19766e")}</Button>
          <Button
            variant={kind === "delete" ? "destructive" : "default"}
            disabled={pending || defaultDeleteBlocked}
            onClick={copy.action}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
