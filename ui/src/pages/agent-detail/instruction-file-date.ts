import { t } from "@/i18n";
import type { AgentInstructionsFileSummary } from "@paperclipai/shared";
import { formatDate } from "@/lib/utils";

/** Missing historical metadata must never become an invented creation date. */
export function instructionFileDateLabel(file?: Pick<AgentInstructionsFileSummary, "createdAt" | "updatedAt"> | null) {
  if (file?.updatedAt && Number.isFinite(Date.parse(file.updatedAt))) return t("agentDetailUi.instructions.updatedDate", { date: formatDate(file.updatedAt) });
  if (file?.createdAt && Number.isFinite(Date.parse(file.createdAt))) return t("agentDetailUi.instructions.createdDate", { date: formatDate(file.createdAt) });
  return t("agentDetailUi.instructions.unknownDate");
}
