import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import {
  codexLocalReasoningEffortsForModel,
  type CodexLocalReasoningEffort,
} from "@paperclipai/adapter-codex-local";

function codexReasoningEffortLabels(t: TFunction): Record<CodexLocalReasoningEffort, string> {
  return {
    minimal: t("taskProperties.effort.minimal"),
    low: t("taskProperties.effort.low"),
    medium: t("taskProperties.effort.medium"),
    high: t("taskProperties.effort.high"),
    xhigh: t("taskProperties.effort.xhigh"),
    max: t("taskProperties.effort.max"),
    ultra: t("taskProperties.effort.ultra"),
  };
}

export function codexReasoningEffortOptions(
  model: string | null | undefined,
  defaultLabel?: string,
  t: TFunction = i18n.getFixedT("en"),
) {
  const labels = codexReasoningEffortLabels(t);
  return [
    { value: "", label: defaultLabel ?? t("taskProperties.effort.default") },
    ...codexLocalReasoningEffortsForModel(model).map((value) => ({
      value,
      label: labels[value],
    })),
  ];
}
