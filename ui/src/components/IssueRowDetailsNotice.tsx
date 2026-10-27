import { useTranslation } from "@/i18n";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";

/** Out of document flow so a failed optional read cannot move task rows. */
export function IssueRowDetailsNotice({ error, onRetry, message, retryLabel }: {
  error: Error | null;
  onRetry: () => void;
  message?: string;
  retryLabel?: string;
}) {
  const { t } = useTranslation();
  if (!error) return null;
  return createPortal(
    <div role="alert" className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-lg">
      <p>{message ?? t("fullSharedTail.taskDetailsPartial")}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>{retryLabel ?? t("fullSharedTail.retryDetails")}</Button>
    </div>, document.body,
  );
}
