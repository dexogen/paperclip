import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT } from "@/i18n";
import type { StatusCard, StatusCardRefreshPolicy } from "@paperclipai/shared";

/**
 * The lifecycle states a status card renders as on the board (plan §7,
 * wireframe `07-card-states.svg`). Derived from the stored `status_cards` row:
 * the persisted `state` enum plus `archivedAt`, `generatingIssueId` and
 * `pendingChangeCount`. Kept in one place so the board tile, detail drawer and
 * tests agree on the mapping.
 */
export type StatusCardLifecycle =
  | "compiling"
  | "fresh"
  | "stale"
  | "updating"
  | "error"
  | "paused_budget"
  | "paused_hours"
  | "archived";

/**
 * Map a card row to its display lifecycle. Precedence, highest first:
 * archived → compiling → error → paused → updating (a run is in flight) →
 * stale (pending changes) → fresh.
 */
export function deriveStatusCardLifecycle(
  card: Pick<StatusCard, "state" | "archivedAt" | "generatingIssueId" | "pendingChangeCount">,
): StatusCardLifecycle {
  if (card.archivedAt) return "archived";
  if (card.state === "compiling") return "compiling";
  if (card.state === "error") return "error";
  if (card.state === "paused_budget") return "paused_budget";
  if (card.state === "paused_hours") return "paused_hours";
  if (card.generatingIssueId) return "updating";
  if (card.pendingChangeCount > 0) return "stale";
  return "fresh";
}

export interface StatusCardLifecyclePresentation {
  label: string;
  /** Tailwind classes for the leading state dot. */
  dotClassName: string;
  /** Short human description used in the states reference and empty affordances. */
  description: string;
  /** Whether the tile should render a dashed "building" border. */
  dashedBorder: boolean;
  /** Whether the last-good summary should stay visible under a banner. */
  keepsLastSummary: boolean;
}

export const STATUS_CARD_LIFECYCLE_PRESENTATION: Record<
  StatusCardLifecycle,
  StatusCardLifecyclePresentation
> = {
  compiling: {
    get label() { return fullSharedT("fullShared.setting_up_dbdf27"); },
    dotClassName: "bg-cyan-400 animate-pulse",
    get description() { return fullSharedT("fullShared.just_created_setting_up_and_generating_the_first_sum_226c1e"); },
    dashedBorder: true,
    keepsLastSummary: false,
  },
  fresh: {
    get label() { return fullSharedT("taskDisplay.external.liveness.fresh"); },
    dotClassName: "bg-emerald-400",
    get description() { return fullSharedT("fullShared.summary_reflects_all_known_changes_nothing_pending_52934f"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  stale: {
    get label() { return fullSharedT("fullShared.stale_40c9e5"); },
    dotClassName: "bg-amber-400",
    get description() { return fullSharedT("fullShared.changes_are_pending_since_the_last_update_c68136"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  updating: {
    // Blue (distinct from fresh-emerald and compiling-cyan) so an in-flight
    // update never reads as "fresh" on a glance-scan of the board.
    get label() { return fullSharedT("fullShared.updating_0b5260"); },
    dotClassName: "bg-blue-500 animate-pulse",
    get description() { return fullSharedT("fullShared.an_update_is_streaming_in_now_0b749e"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  error: {
    get label() { return fullSharedT("fullShared.error_54a0e8"); },
    dotClassName: "bg-red-500",
    get description() { return fullSharedT("fullShared.the_last_run_failed_the_last_good_summary_stays_visi_3a1419"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  paused_budget: {
    get label() { return fullSharedT("fullShared.paused_budget_62ae66"); },
    dotClassName: "bg-orange-400",
    get description() { return fullSharedT("fullShared.the_daily_token_cap_was_hit_auto_updates_are_suspend_7fb1a0"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  paused_hours: {
    get label() { return fullSharedT("fullShared.paused_hours_9e0292"); },
    dotClassName: "bg-orange-400",
    get description() { return fullSharedT("fullShared.outside_active_hours_changes_batch_into_one_update_a_5fc833"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
  archived: {
    get label() { return fullSharedT("fullShared.archived_bdb865"); },
    dotClassName: "bg-muted-foreground/50",
    get description() { return fullSharedT("fullShared.no_auto_updates_and_no_watches_restore_to_start_watc_cd8313"); },
    dashedBorder: false,
    keepsLastSummary: true,
  },
};

/** Compact token count, e.g. `1.1k`, `950`, `12.4k`. */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  return `${(tokens / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** US-dollar cost from integer cents, e.g. `$0.09`, `$1.20`. Sub-cent → `<$0.01`. */
export function formatUsdFromCents(cents: number): string {
  if (cents <= 0) return "$0.00";
  if (cents < 1) return "<$0.01";
  return `$${(cents / 100).toFixed(2)}`;
}

/** A one-line, human summary of a card's refresh policy for chips and footers. */
export function describeRefreshPolicy(policy: StatusCardRefreshPolicy): string {
  switch (policy.mode) {
    case "manual":
      return fullSharedTailT("fullSharedTail.refreshManual");
    case "interval":
      return policy.intervalMinutes
        ? fullSharedTailT("fullSharedTail.refreshInterval", { minutes: policy.intervalMinutes })
        : fullSharedTailT("fullSharedTail.refreshSchedule");
    case "reactive": {
      const debounce = policy.debounceSeconds ?? 60;
      return fullSharedTailT("fullSharedTail.refreshReactive", { seconds: debounce });
    }
    default:
      return fullSharedTailT("fullSharedTail.refreshManual");
  }
}
