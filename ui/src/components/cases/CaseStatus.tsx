import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { CaseStatus as CaseStatusValue } from "@/api/cases";
import { StatusBadge } from "@/components/StatusBadge";

export const CASE_STATUS_LABELS: Record<CaseStatusValue, string> = {
  get draft() { return fullSharedT("taskPanels.workProduct.draft"); },
  get in_progress() { return fullSharedT("taskPanels.workProduct.inProgress"); },
  get in_review() { return fullSharedT("decisionForms.interaction.inReview"); },
  get approved() { return fullSharedT("fullShared.approved_87b42e"); },
  get done() { return fullSharedT("fullShared.done_11a676"); },
  get cancelled() { return fullSharedT("fullShared.cancelled_d353a9"); },
};

export function CaseStatus({ status, className }: { status: CaseStatusValue; className?: string }) {
  useFullSharedTranslation();
  return <StatusBadge status={status} label={CASE_STATUS_LABELS[status]} className={className} />;
}
