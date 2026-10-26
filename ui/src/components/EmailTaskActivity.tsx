import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { EmailMessageCard } from "./EmailMessageCard";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi } from "@/api/email";
import { useEmailThread } from "@/hooks/useEmailThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailPublicationSummary } from "@paperclipai/shared";

// Email actions belong to the agent's task conversation. Only surface mail
// without a task comment yet and delivery outcomes that need attention here.
export function EmailTaskActivity({
  companyId,
  issueId,
}: {
  companyId: string;
  issueId: string;
}) {
  useFullSharedTranslation();
  const cache = useQueryClient();
  const threadKey = ["email-thread", companyId, issueId];
  const queryEnabled = Boolean(companyId && issueId) && !issueId.startsWith("chat:");
  const thread = useEmailThread(companyId, issueId);
  if (!queryEnabled) return null;
  const data = thread.data;
  const messages = data?.messages.filter((m) => !m.commentId) ?? [];
  const publications = data?.publications.filter(
    (p) => !p.providerMessageId || p.outcome === "uncertain",
  ) ?? [];
  if (!thread.error && !messages.length && !publications.length) return null;
  return (
    <div className="space-y-3">
      {thread.error && (
        <p role="alert" className="text-sm text-destructive">
          {thread.error.message}
        </p>
      )}
      {messages.map((m) => (
        <EmailMessageCard
          contextNotice
          key={m.id}
          issueId={issueId}
          message={m}
          publication={data?.publications.find(
            (p) => p.providerMessageId === m.providerMessageId,
          )}
        />
      ))}
      {publications.map((p) => (
        <EmailDelivery
          key={p.id}
          companyId={companyId}
          publication={p}
          onResolved={() => {
            void cache.invalidateQueries({ queryKey: threadKey });
          }}
        />
      ))}
    </div>
  );
}

function EmailDelivery({
  companyId,
  publication: p,
  onResolved,
}: {
  companyId: string;
  publication: EmailPublicationSummary;
  onResolved: () => void;
}) {
  useFullSharedTranslation();
  const [messageId, setMessageId] = useState("");
  const resolve = useMutation({
    mutationFn: (outcome: "sent" | "failed") =>
      emailApi.resolve(companyId, p.id, outcome, messageId || undefined),
    onSuccess: onResolved,
  });
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {p.request && !p.providerMessageId && (
        <article
          aria-label={fullSharedT("fullShared.email_send_intent_5cd558")}
          className="task-context-notice space-y-3"
        >
          <p className="font-semibold">{p.request.subject ?? fullSharedT("fullShared.email_reply_ef902e")}</p>
          {p.request.to && <p><FullSharedTrans i18nKey="fullShared.to_bdc0ca" components={{ part1: <>{p.request.to.join(", ")}</> }} /></p>}
          <div className="whitespace-pre-wrap break-words text-sm text-foreground">
            {p.request.text}
          </div>
        </article>
      )}
      <p><FullSharedTrans i18nKey="fullShared.email_d33502" components={{ part1: <>{p.outcome}</>, part2: <>{p.error ? ` — ${p.error}` : ""}</> }} /></p>
      {p.outcome === "uncertain" && (
        <details>
          <summary className="cursor-pointer">{fullSharedT("fullShared.resolve_delivery_after_checking_agentmail_457318")}</summary>
          <div className="space-y-2 py-2">
            <p>{fullSharedT("fullShared.confirm_the_outcome_in_agentmail_before_resolving_th_0e8704")}</p>
            <Input
              aria-label={fullSharedT("fullShared.provider_message_id_c250cf")}
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
              placeholder={fullSharedT("fullShared.provider_message_id_c250cf")}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!messageId || resolve.isPending}
                onClick={() => resolve.mutate("sent")}
              >{fullSharedT("fullShared.confirm_sent_a1913b")}</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate("failed")}
              >{fullSharedT("fullShared.confirm_not_sent_e948b4")}</Button>
            </div>
            {resolve.error && (
              <p role="alert" className="text-destructive">
                {resolve.error.message}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
