import { useTranslation } from "@/i18n";
import { formatRunDisplayText } from "./task-chat-display";
import { cn, formatNumber } from "@/lib/utils";
import { Gauge } from "lucide-react";
import type { TaskChatUsageItem } from "./task-chat-model";

/**
 * Second-tier live token/cost readout (ACP UsageUpdate). Concrete progress —
 * context fill %, tokens, and cost — rather than an indeterminate spinner.
 * Recedes to metadata weight so it never competes with message content.
 */
export function TaskChatUsageReadout({ item }: { item: TaskChatUsageItem }) {
  const { t } = useTranslation();
  const label = formatRunDisplayText("usageLabel", item.label, item.display?.label, t);
  const detail = formatRunDisplayText("usageDetail", item.detail, item.display?.detail, t);
  const { used, size, inputTokens, outputTokens, costUsd } = item.usage;
  const contextWindowSize = typeof size === "number" && size > 0 ? size : null;
  const pct = contextWindowSize ? Math.min(100, Math.round((used / contextWindowSize) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1 px-1 py-1 text-(length:--text-micro) text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Gauge className="h-3 w-3" />
        {label ? <span className="font-medium">{label}</span> : null}
        {contextWindowSize ? (
          <span>
            {t("runUi.usage.context", { used: formatNumber(used), size: formatNumber(contextWindowSize), percent: formatNumber(pct) })}
          </span>
        ) : null}
        {inputTokens != null || outputTokens != null ? (
          <span>
            · ↑{formatNumber(inputTokens ?? 0)} ↓{formatNumber(outputTokens ?? 0)}
          </span>
        ) : null}
        {costUsd != null ? <span>· ${formatNumber(costUsd, { minimumFractionDigits: 4, maximumFractionDigits: 4, useGrouping: false })}</span> : null}
      </div>
      {detail ? <div>{detail}</div> : null}
      {contextWindowSize ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full bg-(--status-agent-running)")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
