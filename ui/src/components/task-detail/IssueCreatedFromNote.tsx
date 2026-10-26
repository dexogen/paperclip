import { Trans, useTranslation } from "@/i18n";
import type { IssueCreationSource } from "@paperclipai/shared";
import { GitBranch } from "lucide-react";
import {
  createIssueDetailPath,
  rememberIssueDetailLocationState,
} from "@/lib/issueDetailBreadcrumb";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

export interface IssueCreatedFromNoteProps {
  /** Access-checked creation provenance from the issue detail response. */
  createdFrom: IssueCreationSource | null | undefined;
  issueLinkState?: unknown;
  className?: string;
}

/**
 * "Created from PAP-168 by Paperclip QA": the task a run was executing when it
 * created this one. Provenance only; it is not the structural parent and it is
 * not a blocker. Renders nothing when the viewer may not see the source.
 */
export function IssueCreatedFromNote({ createdFrom, issueLinkState, className }: IssueCreatedFromNoteProps) {
  const { t } = useTranslation();
  if (!createdFrom) return null;
  const { issue, agent } = createdFrom;
  const ref = issue.identifier ?? issue.id;
  return (
    <p
      data-testid="issue-created-from"
      className={cn("flex min-w-0 items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <GitBranch aria-hidden className="h-3 w-3 shrink-0" />
      <Trans
        t={t}
        i18nKey={agent ? "taskProperties.provenance.fromAgent" : "taskProperties.provenance.fromTask"}
        values={{ task: issue.identifier ? `${issue.identifier} ${issue.title}` : issue.title, agent: agent?.name }}
        components={{
          prefix: <span className="shrink-0" />,
          source: <Link to={createIssueDetailPath(ref)} state={issueLinkState} onClickCapture={() => rememberIssueDetailLocationState(ref, issueLinkState)} className="min-w-0 truncate hover:text-foreground transition-colors" title={issue.title} />,
          author: <span className="shrink-0" />,
        }}
        tOptions={{ interpolation: { escapeValue: true } }}
        shouldUnescape
      />
    </p>
  );
}
