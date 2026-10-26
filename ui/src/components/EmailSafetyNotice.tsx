import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { AlertTriangle } from "lucide-react";
export function EmailSafetyNotice() {
  useFullSharedTranslation();
  return (
    <div
      role="note"
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 text-(--status-agent-paused)" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{fullSharedT("fullShared.anyone_can_email_an_unrestricted_inbox_850d77")}</p>
          <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.incoming_email_can_create_tasks_and_trigger_agent_wo_50c1c4")}</p>
          <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.paperclip_does_not_verify_sender_restrictions_agentm_db40f3")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="https://console.agentmail.to"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >{fullSharedT("fullShared.open_agentmail_1d9d67")}</a>
        <a
          href="https://docs.agentmail.to/knowledge-base/allowlists-blocklists"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline underline-offset-4"
        >{fullSharedT("fullShared.set_up_allowlists_0bf5ad")}</a>
      </div>
    </div>
  );
}
