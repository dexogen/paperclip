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
  { value: "tasks", label: "Tasks" },
  { value: "all", label: "All files" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "text", label: "Text" },
  { value: "file", label: "Files" },
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
