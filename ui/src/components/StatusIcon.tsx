import type { TFunction } from "i18next";
import { i18n, useTranslation } from "@/i18n";
import { useState } from "react";
import type { IssueBlockerAttention } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { StatusGlyph, type StatusGlyphSize } from "./StatusGlyph";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const allStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"];

function statusLabel(status: string, t: TFunction): string {
  const label = (() => {
    switch (status) {
      case "backlog": return t("statuses.backlog");
      case "todo": return t("statuses.todo");
      case "in_progress": return t("statuses.in_progress");
      case "in_review": return t("statuses.in_review");
      case "done": return t("statuses.done");
      case "cancelled": return t("statuses.cancelled");
      case "blocked": return t("statuses.blocked");
      case "idle": return t("statuses.idle");
      default: return status.replace(/_/g, " ");
    }
  })();
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusIconProps {
  status: string;
  externalConversationState?: "active" | "waiting" | null;
  blockerAttention?: IssueBlockerAttention | null;
  onChange?: (status: string) => void;
  className?: string;
  /** Optional layout wrapper around the glyph. Does not change glyph dimensions. */
  glyphContainerClassName?: string;
  showLabel?: boolean;
  /** Glyph size (PAP-243a). Default `md` (16px); lists/detail/mentions use `lg` (20px). */
  size?: StatusGlyphSize;
}

function blockedAttentionLabel(blockerAttention: IssueBlockerAttention | null | undefined, t: TFunction) {
  if (!blockerAttention || blockerAttention.state === "none") return statusLabel("blocked", t);

  if (blockerAttention.reason === "active_child") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return t("taskDisplay.status.activeChildNamed", { identifier: blockerAttention.sampleBlockerIdentifier });
    }
    return t("taskDisplay.status.activeChildren", { count });
  }

  if (blockerAttention.reason === "active_dependency") {
    const count = blockerAttention.coveredBlockerCount;
    if (count === 1 && blockerAttention.sampleBlockerIdentifier) {
      return t("taskDisplay.status.activeDependencyNamed", { identifier: blockerAttention.sampleBlockerIdentifier });
    }
    return t("taskDisplay.status.activeDependencies", { count });
  }

  if (blockerAttention.reason === "stalled_review") {
    const count = blockerAttention.stalledBlockerCount;
    const leaf = blockerAttention.sampleStalledBlockerIdentifier ?? blockerAttention.sampleBlockerIdentifier;
    if (count === 1 && leaf) return t("taskDisplay.status.stalledReviewNamed", { identifier: leaf });
    return t("taskDisplay.status.stalledReviews", { count });
  }

  if (blockerAttention.reason === "attention_required") {
    const count = blockerAttention.attentionBlockerCount || blockerAttention.unresolvedBlockerCount;
    const coveredCount = blockerAttention.coveredBlockerCount;
    return coveredCount > 0
      ? t("taskDisplay.status.attentionCovered", { count, coveredCount })
      : t("taskDisplay.status.attention", { count });
  }

  return statusLabel("blocked", t);
}

/** Shared accessible/tooltip copy, including waiting and covered-blocker states. */
export function getStatusIconLabel(status: string, externalConversationState?: "active" | "waiting" | null, blockerAttention?: IssueBlockerAttention | null, t: TFunction = i18n.getFixedT("en")): string {
  const displayStatus = status === "in_review" && externalConversationState === "waiting" ? "idle" : status;
  return status === "blocked" ? blockedAttentionLabel(blockerAttention, t) : statusLabel(displayStatus, t);
}

/**
 * Task/issue status indicator — renders the unified, color-blind-safe
 * {@link StatusGlyph} (one distinct shape per status). With `onChange` it also
 * acts as a status picker (popover). This one component drives every standalone
 * status surface: list, kanban, detail header, properties row + picker flyout,
 * sub-task / blocked-by pills, blocked inbox, quicklook, sibling nav, filters,
 * search, columns, dashboard.
 *
 * A "covered" blocked task (waiting on active work) maps to the `in_queue`
 * glyph — the blocked shape recoloured blue — while the full blocked reason
 * still rides on the accessible label.
 */
export function StatusIcon({ status, externalConversationState, blockerAttention, onChange, className, glyphContainerClassName, showLabel, size = "md" }: StatusIconProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const displayStatus = status === "in_review" && externalConversationState === "waiting" ? "idle" : status;
  const isCoveredBlocked = status === "blocked" && blockerAttention?.state === "covered";
  const ariaLabel = getStatusIconLabel(status, externalConversationState, blockerAttention, t);
  const glyphStatus = isCoveredBlocked ? "in_queue" : displayStatus;

  const glyphIcon = (
    <StatusGlyph
      status={glyphStatus}
      size={size}
      className={cn(onChange && !showLabel && "cursor-pointer", className)}
      title={ariaLabel}
    />
  );
  const glyph = glyphContainerClassName ? (
    <span className={glyphContainerClassName} data-status-glyph-container="true">
      {glyphIcon}
    </span>
  ) : glyphIcon;

  if (!onChange) {
    return showLabel ? (
      <span className="inline-flex items-center gap-1.5">
        {glyph}
        <span className="text-sm">{statusLabel(displayStatus, t)}</span>
      </span>
    ) : (
      glyph
    );
  }

  const trigger = showLabel ? (
    <button
      type="button"
      aria-label={t("taskDisplay.status.change", { status: ariaLabel })}
      className="inline-flex min-h-5 items-center gap-1.5 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5 transition-colors"
    >
      {glyph}
      <span className="text-sm">{statusLabel(displayStatus, t)}</span>
    </button>
  ) : (
    <button
      type="button"
      data-slot="icon-button"
      aria-label={t("taskDisplay.status.change", { status: ariaLabel })}
      className="inline-flex cursor-pointer items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-(length:--rad-3) focus-visible:ring-ring"
    >
      {glyph}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {allStatuses.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-xs", s === status && "bg-accent")}
            onClick={() => {
              onChange(s);
              setOpen(false);
            }}
          >
            <StatusIcon status={s} size="lg" />
            {statusLabel(s, t)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
