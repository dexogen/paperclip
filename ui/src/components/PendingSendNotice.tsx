import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shown above a composer while a send waits for the connection. The text stays
 * on this device and resends with its original request ID, so it cannot post
 * twice; the user can resend now or take the text back with Cancel.
 *
 * Without `onResendNow` (a send saved by an older version, with no stored
 * request to replay) it only says the outcome is unknown and offers Cancel.
 */
export function PendingSendNotice({
  noun = "message",
  resending,
  stalled,
  persisted = false,
  onResendNow,
  onCancel,
  className,
}: {
  /** What is being sent: "comment", "task", "update". */
  noun?: string;
  resending: boolean;
  stalled: boolean;
  persisted?: boolean;
  onResendNow?: () => void;
  onCancel: () => void;
  className?: string;
}) {
  useUiTranslation();
  const replayable = Boolean(onResendNow);
  const title = !replayable
    ? translateUi("interfaceUpdates.we_couldn_t_confirm_whether_this_value_was_sent_dd451b64", { value1: (noun) })
    : resending
      ? translateUi("interfaceUpdates.sending_b8ed5279")
      : stalled
        ? translateUi("interfaceUpdates.couldn_t_send_this_value_yet_9a7ace86", { value1: (noun) })
        : translateUi("interfaceUpdates.sending_when_reconnected_8639e646");
  const detail = replayable
    ? persisted ? `Your ${noun} is saved on this device.`
      : "Browser storage is unavailable. Keep this tab open or copy your text before leaving."
    : "It may already be in the conversation. Check it before sending again; Cancel keeps your text.";
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pending-send-notice"
      className={cn("space-y-2 rounded-md border border-border bg-muted p-3 text-sm", className)}
    >
      <p className="flex items-center gap-2 font-medium">
        {resending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {title}
      </p>
      <p className="text-muted-foreground">{detail}</p>
      <div className="flex items-center gap-2">
        {onResendNow ? (
          <Button type="button" size="sm" variant="outline" disabled={resending} onClick={onResendNow}>
            {translateUi("interfaceUpdates.resend_now_a4fab5c8")}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={resending} onClick={onCancel}>
          {translateUi("interfaceUpdates.cancel_19766ed6")}
        </Button>
      </div>
    </div>
  );
}
