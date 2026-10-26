import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Flag } from "lucide-react";
import type { Agent } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";

interface IssueAssignedBacklogNoticeProps {
  issueStatus: string;
  assigneeAgent: Agent | null;
  assigneeUserId?: string | null;
  onResume?: () => void;
  resuming?: boolean;
}

export function IssueAssignedBacklogNotice({
  issueStatus,
  assigneeAgent,
  assigneeUserId,
  onResume,
  resuming,
}: IssueAssignedBacklogNoticeProps) {
  useFullSharedTranslation();
  if (issueStatus !== "backlog") return null;
  if (!assigneeAgent && !assigneeUserId) return null;

  const assigneeLabel = assigneeAgent?.name ?? fullSharedT("runUi.blocked.assignee");

  return (
    <div
      data-testid="issue-assigned-backlog-notice"
      data-issue-status={issueStatus}
      className="mb-3 rounded-md border border-amber-300/70 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <div className="flex items-start gap-2">
        <Flag className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="leading-5"><FullSharedTrans i18nKey="fullShared.will_not_be_asked_to_work_on_this_until_status_chang_eec76b" components={{ part1: <span className="font-medium">{fullSharedTailT("fullSharedTail.parked")}</span>, part2: <>{" "}</>, part3: <span className="font-medium">{assigneeLabel}</span> }} /></p>
          {assigneeAgent ? (
            <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">{fullSharedT("fullShared.comments_still_notify_the_assignee_for_questions_or__e9afc8")}</p>
          ) : null}
          {onResume ? (
            <div className="pt-0.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-400/70 bg-background/80 text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-background/40 dark:text-amber-100 dark:hover:bg-amber-500/15"
                onClick={onResume}
                disabled={resuming}
                data-testid="issue-assigned-backlog-resume"
              >
                {resuming ? fullSharedT("fullShared.resuming_c494e3") : fullSharedT("fullShared.resume_now_6eddb4")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
