import { useTranslation } from "@/i18n";
import { useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentWorkspaceRetry, WorkspaceRecoveryReceiptError } from "./WorkspaceBaseRefRecovery";

export function WorkspaceRetryControl() {
  const retry = useCurrentWorkspaceRetry();
  return retry ? <WorkspaceRetryButton key={`${retry.actionId}:${retry.runId}`} {...retry} /> : null;
}

export function WorkspaceRetryButton({ onRetry, unavailableReason }: {
  onRetry: () => Promise<void>;
  unavailableReason: string | null;
}) {
  const { t } = useTranslation();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  async function retry() {
    if (inFlight.current || requested || unavailableReason) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try { await onRetry(); setRequested(true); }
    catch (cause) { setError({ cause }); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <div className="flex flex-col items-start gap-2 py-3">
    <Button size="xs" variant="outline" disabled={pending || requested || Boolean(unavailableReason)}
      title={unavailableReason ?? undefined} onClick={() => void retry()}>
      {pending ? <Loader2 aria-hidden className="size-3 animate-spin motion-reduce:animate-none" /> : <RotateCcw aria-hidden className="size-3" />}
      {pending || requested ? t("runUi.workspace.retrying") : t("runUi.workspace.retry")}
    </Button>
    {error ? <p role="alert" className="text-sm text-destructive">{error.cause instanceof WorkspaceRecoveryReceiptError ? error.cause.kind === "retry" ? t("runUi.workspace.changedRetry") : t("runUi.workspace.changedRepair") : error.cause instanceof Error ? error.cause.message : t("runUi.workspace.retryError")}</p> : null}
  </div>;
}
