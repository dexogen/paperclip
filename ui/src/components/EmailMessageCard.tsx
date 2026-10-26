import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Paperclip } from "lucide-react";
import type {
  EmailMessage,
  EmailPublicationSummary,
  EmailThreadSummary,
} from "@paperclipai/shared";
import { useEmailThread } from "@/hooks/useEmailThread";
import { issuesApi } from "@/api/issues";
const EmailContext = createContext<EmailThreadSummary | null>(null);
export function EmailThreadProvider({
  companyId,
  issueId,
  children,
}: {
  companyId: string;
  issueId: string;
  children: ReactNode;
}) {
  useFullSharedTranslation();
  const thread = useEmailThread(companyId, issueId);
  return (
    <EmailContext.Provider value={thread.data ?? null}>
      {children}
    </EmailContext.Provider>
  );
}
export function useEmailComment(commentId: string) {
  useFullSharedTranslation();
  const thread = useContext(EmailContext);
  const message = thread?.messages.find((m) => m.commentId === commentId);
  return message && thread ? (
    <EmailMessageCard
      message={message}
      publication={thread.publications.find(
        (p) => p.providerMessageId === message.providerMessageId,
      )}
      issueId={thread.issueId}
    />
  ) : null;
}
export function EmailMessageCard({
  message,
  publication,
  issueId,
  contextNotice = false,
}: {
  contextNotice?: boolean;
  message: EmailMessage;
  publication?: EmailPublicationSummary;
  issueId: string;
}) {
  useFullSharedTranslation();
  const attachments = useQuery({
    queryKey: ["email-attachments", issueId],
    queryFn: () => issuesApi.listAttachments(issueId),
    enabled: message.attachmentIds.length > 0,
  });
  return (
    <article
      aria-label={
        message.direction === "inbound" ? fullSharedT("fullShared.email_received_1bd1d0") : fullSharedT("fullShared.email_sent_a5e14a")
      }
      className={contextNotice ? "task-context-notice space-y-3" : "space-y-4 rounded-xl border border-border bg-card p-5"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="size-4" />
          {message.direction === "inbound" ? fullSharedT("fullShared.email_received_1bd1d0") : fullSharedT("fullShared.email_sent_a5e14a")}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleString()}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {message.from}
          {message.direction === "inbound" && (
            <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{fullSharedT("fullShared.external_68c114")}</span>
          )}
        </p>
        <p className="break-words text-xs text-muted-foreground"><FullSharedTrans i18nKey="fullShared.to_bdc0ca" components={{ part1: <>{message.to.join(", ")}</> }} /></p>
        {!!message.cc?.length && (
          <p className="break-words text-xs text-muted-foreground"><FullSharedTrans i18nKey="fullShared.cc_39f388" components={{ part1: <>{message.cc.join(", ")}</> }} /></p>
        )}
        <p className="text-sm font-semibold">{message.subject}</p>
      </div>
      <div className="whitespace-pre-wrap break-words text-sm">
        {message.text || fullSharedT("fullShared.no_text_body_b47872")}
      </div>
      {!!message.attachmentIds.length && (
        <div className="flex flex-wrap gap-2">
          {message.attachmentIds.map((id) => {
            const attachment = attachments.data?.find((a) => a.id === id);
            return (
              <a
                key={id}
                href={`/api/attachments/${id}/content`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
              >
                <Paperclip className="size-3.5" />
                {attachment?.originalFilename ?? fullSharedT("fullShared.open_attachment_9aeeab")}
              </a>
            );
          })}
        </div>
      )}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">{fullSharedT("fullShared.email_details_2f33e4")}</summary>
        <div className="space-y-2 pt-3">
          {!!message.bcc?.length && <p><FullSharedTrans i18nKey="fullShared.bcc_ef786f" components={{ part1: <>{message.bcc.join(", ")}</> }} /></p>}
          <p className="break-all"><FullSharedTrans i18nKey="fullShared.message_id_bb4592" components={{ part1: <>{message.providerMessageId}</> }} /></p>
          {message.fullText !== message.text && (
            <div className="whitespace-pre-wrap break-words">
              {message.fullText}
            </div>
          )}
        </div>
      </details>
      {publication && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {publication.outcome === "delivered"
            ? fullSharedT("fullShared.delivered_906115")
            : publication.outcome === "failed"
              ? fullSharedT("fullShared.delivery_failed_b48652")
              : publication.outcome === "uncertain"
                ? fullSharedT("fullShared.delivery_uncertain_0308cc")
                : publication.outcome === "queued"
                  ? fullSharedT("taskChatUi.bubble.queued")
                  : fullSharedT("fullShared.sent_c16bc8")}
          {publication.error ? ` · ${publication.error}` : ""}
        </p>
      )}
      {attachments.error && (
        <p role="alert" className="text-xs text-destructive">{fullSharedT("fullShared.attachments_could_not_be_loaded_0d3fe6")}</p>
      )}
    </article>
  );
}
