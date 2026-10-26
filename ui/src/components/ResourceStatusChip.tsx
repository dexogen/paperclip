import { useTranslation } from "@/i18n";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brandChipBadge, type BrandChipColor } from "@/lib/status-colors";

/**
 * The load-bearing visual grammar for the built-in bundle status panel
 * (Reflection Coach — [PAP-13099], ux-spec §4). Each variant double-encodes
 * state as glyph + word + color so it never relies on color alone
 * (WCAG 1.4.1). Colors route through the shared `brandChipBadge` families — no
 * bespoke tints are minted here (ux-spec §10).
 *
 * A single resource shows at most one readiness chip and at most one drift
 * chip; when both a readiness problem and a drift state coexist, the caller
 * suppresses the drift chip until readiness is `ready` (ux-spec §4).
 */
export type ResourceStatusVariant =
  | "ready"
  | "needs_setup"
  | "missing"
  | "error"
  | "update_available"
  | "drifted"
  | "schedule_off"
  | "schedule_on"
  | "pending_approval"
  | "proposal_pending";

interface VariantSpec {
  color: BrandChipColor;
  glyph: string;
  label: string;
  title: string;
}

function variants(t: TFunction): Record<ResourceStatusVariant, VariantSpec> { return {
  ready: { color: "green", glyph: "●", label: t("agentDetailUi.resource.ready"), title: t("agentDetailUi.resource.readyHelp") },
  needs_setup: { color: "amber", glyph: "⚠", label: t("agentDetailUi.resource.needsSetup"), title: t("agentDetailUi.resource.needsSetupHelp") },
  missing: { color: "amber", glyph: "⚠", label: t("agentDetailUi.resource.missing"), title: t("agentDetailUi.resource.missingHelp") },
  error: { color: "red", glyph: "✕", label: t("agentDetailUi.resource.error"), title: t("agentDetailUi.resource.errorHelp") },
  update_available: {
    color: "blue",
    glyph: "↑",
    label: t("agentDetailUi.resource.update"),
    title: t("agentDetailUi.resource.updateHelp"),
  },
  drifted: {
    color: "gray",
    glyph: "✎",
    label: t("agentDetailUi.resource.drifted"),
    title: t("agentDetailUi.resource.driftedHelp"),
  },
  schedule_off: {
    color: "gray",
    glyph: "◌",
    label: t("agentDetailUi.resource.off"),
    title: t("agentDetailUi.resource.offHelp"),
  },
  schedule_on: { color: "green", glyph: "●", label: t("agentDetailUi.resource.weekly"), title: t("agentDetailUi.resource.weeklyHelp") },
  pending_approval: {
    color: "amber",
    glyph: "⚠",
    label: t("agentDetailUi.resource.approval"),
    title: t("agentDetailUi.resource.approvalHelp"),
  },
  proposal_pending: {
    color: "blue",
    glyph: "↑",
    label: t("agentDetailUi.resource.proposal"),
    title: t("agentDetailUi.resource.proposalHelp"),
  },
}; }

export function ResourceStatusChip({
  variant,
  label,
  compact = false,
  className,
}: {
  variant: ResourceStatusVariant;
  /** Override the default label (e.g. "Weekly · Mon 09:00 UTC"). */
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const spec = variants(t)[variant];
  return (
    <Badge
      variant="outline"
      className={cn(
        brandChipBadge[spec.color],
        "font-medium",
        compact && "px-1.5 py-0 text-(length:--text-nano)",
        className,
      )}
      title={spec.title}
    >
      <span aria-hidden="true">{spec.glyph}</span>
      {label ?? spec.label}
    </Badge>
  );
}
