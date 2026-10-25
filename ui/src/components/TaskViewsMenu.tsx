import { useTranslation } from "../i18n";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_VIEW_GROUPS, taskView, type TaskViewKey } from "@/lib/task-views";
import { cn } from "@/lib/utils";

/**
 * The single control that replaced both the Inbox tab bar and the implicit
 * "all tasks" default on Tasks (PAP-670). One menu, grouped by scope, so the
 * nav does not have to grow a row every time a view is added.
 */
export function TaskViewsMenu({
  value,
  onChange,
  badgeCount,
}: {
  value: TaskViewKey;
  onChange: (next: TaskViewKey) => void;
  /** Unread count surfaced next to the My-work group, mirroring the nav badge. */
  badgeCount?: number;
}) {
  const { t } = useTranslation();
  const active = taskView(value);
  const labels: Record<TaskViewKey, string> = {
    mine: t("taskViews.mine"),
    unread: t("taskViews.unread"),
    blocked: t("taskViews.blocked"),
    recent: t("taskViews.recent"),
    everything: t("taskViews.everything"),
    all: t("taskViews.all"),
    active: t("taskViews.active"),
    backlog: t("taskViews.backlog"),
    done: t("taskViews.done"),
  };
  const hints: Record<TaskViewKey, string> = {
    mine: t("taskViews.hints.mine"),
    unread: t("taskViews.hints.unread"),
    blocked: t("taskViews.hints.blocked"),
    recent: t("taskViews.hints.recent"),
    everything: t("taskViews.hints.everything"),
    all: t("taskViews.hints.all"),
    active: t("taskViews.hints.active"),
    backlog: t("taskViews.hints.backlog"),
    done: t("taskViews.hints.done"),
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          aria-label={t("taskViews.changeView", { view: labels[active.key] })}
        >
          <span className="max-w-(--sz-160px) truncate font-medium">{labels[active.key]}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--sz-260px)">
        {TASK_VIEW_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex === 0 ? t("taskViews.myWork") : t("taskViews.organization")}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>{groupIndex === 0 ? t("taskViews.myWork") : t("taskViews.organization")}</span>
              {groupIndex === 0 && badgeCount != null && badgeCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-(length:--text-nano) leading-tight text-primary-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </DropdownMenuLabel>
            {group.views.map((view) => {
              const selected = view.key === value;
              return (
                <DropdownMenuItem
                  key={view.key}
                  onSelect={() => onChange(view.key)}
                  className="items-start gap-2"
                  aria-current={selected ? "true" : undefined}
                >
                  <Check
                    aria-hidden="true"
                    className={cn("mt-0.5 size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0">
                    <span className={cn("block truncate", selected && "font-medium")}>{labels[view.key]}</span>
                    <span className="block text-(length:--text-nano) text-muted-foreground">{hints[view.key]}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
