import { useTranslation } from "@/i18n";
import type { TaskBrowser } from "@paperclipai/shared";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaskBrowserActivity({
  browser,
  label,
  labelDisplay,
  onOpen,
}: {
  browser: TaskBrowser;
  label?: string;
  labelDisplay?: { code: "browser.label"; number?: number };
  onOpen?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const displayLabel = labelDisplay?.code === "browser.label"
    ? labelDisplay.number == null ? t("taskChatUi.browser.browser")
      : Number.isSafeInteger(labelDisplay.number) && labelDisplay.number > 0 ? t("taskChatUi.browser.numbered", { number: labelDisplay.number }) : label ?? t("taskChatUi.browser.browser")
    : label ?? t("taskChatUi.browser.browser");
  const statusLabels: Record<string, string> = {
    starting: t("taskPanels.browser.statusStarting"), running: t("taskPanels.browser.statusRunning"),
    idle: t("taskPanels.browser.statusIdle"), stopping: t("taskPanels.browser.statusStopping"),
    closed: t("taskPanels.browser.statusClosed"), failed: t("taskPanels.browser.statusFailed"),
  };
  const closed = browser.status === "closed" || browser.status === "failed";
  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-sm" aria-label={t("taskChatUi.browser.session", { label: displayLabel })}>
      <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{displayLabel}</span>
      <span className="text-muted-foreground">· {statusLabels[browser.status] ?? browser.status}</span>
      {onOpen && (
        <Button variant="ghost" size="sm" onClick={() => onOpen(browser.id)}>
          {closed ? t("taskChatUi.browser.viewSession") : t("taskChatUi.browser.openBrowser")}
        </Button>
      )}
    </div>
  );
}
