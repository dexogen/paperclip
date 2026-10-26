import { t as fullSharedT } from "@/i18n";
import { t, useTranslation } from "@/i18n";
import type { ArtifactGroupBy, ArtifactKindFilter } from "@/api/artifacts";
import { TabFilters, type TabBarItem } from "@/components/TabBar";

/**
 * The Artifacts page's one row of views (mock node 2129:133457): Tasks —
 * one tile per task, the default — then every file flat, by type. Grouping
 * and the kind filter are still two URL parameters; a view maps onto both.
 */
export type ArtifactsV1View = "tasks" | Exclude<ArtifactKindFilter, never>;

export const ARTIFACTS_V1_VIEWS: TabBarItem<ArtifactsV1View>[] = [
  { value: "tasks", get label() { return fullSharedT("sidebar.tasks"); } },
  { value: "all", get label() { return fullSharedT("surfacesGap.artifacts.allFiles"); } },
  { value: "image", get label() { return fullSharedT("surfacesGap.artifacts.images"); } },
  { value: "video", get label() { return fullSharedT("surfacesGap.artifacts.videos"); } },
  { value: "document", get label() { return fullSharedT("newIssue.documents"); } },
  { value: "text", get label() { return fullSharedT("taskChatUi.attachment.text"); } },
  { value: "file", get label() { return fullSharedT("taskPanels.tabs.files"); } },
];

function artifactViews(): TabBarItem<ArtifactsV1View>[] {
  return [
  { value: "tasks", label: t("surfacesGap.artifacts.tasks") },
  { value: "all", label: t("surfacesGap.artifacts.allFiles") },
  { value: "image", label: t("surfacesGap.artifacts.images") },
  { value: "video", label: t("surfacesGap.artifacts.videos") },
  { value: "document", label: t("surfacesGap.artifacts.documents") },
  { value: "text", label: t("surfacesGap.artifacts.texts") },
  { value: "file", label: t("surfacesGap.artifacts.files") },
  ];
}

/** Any grouping reads as the Tasks view; flat views are named by their kind. */
export const artifactsV1View = (groupBy: ArtifactGroupBy, kind: ArtifactKindFilter): ArtifactsV1View => (groupBy !== "none" ? "tasks" : kind);

export function ArtifactsV1Filters({ view, onViewChange }: { view: ArtifactsV1View; onViewChange: (view: ArtifactsV1View) => void }) {
  useTranslation();
  return <TabFilters items={artifactViews()} value={view} onValueChange={onViewChange} size="standard" label={t("surfacesGap.artifacts.viewFilter")} />;
}
