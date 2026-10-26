import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brandChipBadge } from "@/lib/status-colors";
import type { BuiltInAgentStatus } from "@/api/builtInAgents";

/**
 * Derived lifecycle chip. Rendered for the amber attention states
 * (`needs_setup`, `pending_approval`). Kept separate from the real agent status
 * (`idle/active/…`) per ux-spec D1.
 */
export function BuiltInLifecycleChip({
  status,
  compact = false,
  className,
}: {
  status: BuiltInAgentStatus;
  compact?: boolean;
  className?: string;
}) {
  useFullSharedTranslation();
  if (status !== "needs_setup" && status !== "pending_approval") return null;
  const isPendingApproval = status === "pending_approval";
  return (
    <Badge
      variant="outline"
      className={cn(
        brandChipBadge.amber,
        compact && "px-1.5 py-0 text-(length:--text-nano)",
        className,
      )}
      title={
        isPendingApproval
          ? fullSharedT("fullShared.waiting_on_board_hire_approval_before_the_feature_ca_b63833")
          : fullSharedT("fullShared.needs_adapter_model_setup_before_the_feature_can_run_7a0680")
      }
    >
      {isPendingApproval ? (compact ? fullSharedT("taskProperties.fields.approval") : fullSharedT("agentDetailUi.resource.approval")) : compact ? fullSharedT("onboarding.setup") : fullSharedT("fullShared.needs_setup_b6df24")}
    </Badge>
  );
}
