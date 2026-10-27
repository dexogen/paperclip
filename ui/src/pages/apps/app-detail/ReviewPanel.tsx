import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { ReviewQueueCard } from "../ReviewQueueCard";
import { QuarantinedActionsReview } from "./SetupPanel";
import type { AppDetailSectionProps } from "./types";

export function ReviewPanel({
  connectionId,
  quarantined = [],
  pending = false,
  onReviewQuarantined,
}: Pick<AppDetailSectionProps, "connectionId"> &
  Partial<Pick<AppDetailSectionProps, "quarantined" | "pending">> & {
    onReviewQuarantined?: (enabledIds: string[]) => void;
  }) {
  useFullAppsTranslation();
  const showsQuarantinedActions = quarantined.length > 0 && !!onReviewQuarantined;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">{fullAppsT("fullApps.review_aff076")}</h2>
      {showsQuarantinedActions ? (
        <QuarantinedActionsReview
          entries={quarantined}
          disabled={pending}
          onSubmit={onReviewQuarantined}
        />
      ) : null}
      <ReviewQueueCard
        connectionId={connectionId}
        heading={fullAppsT("fullApps.waiting_for_your_ok_2c9582")}
        emptyState={showsQuarantinedActions ? "hidden" : "reassure"}
        plain
      />
    </div>
  );
}
