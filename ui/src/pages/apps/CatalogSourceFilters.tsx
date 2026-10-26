import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { TabFilters } from "@/components/TabBar";

export const CATALOG_SOURCES = ["paperclip", "composio", "arcade", "installed", "all"] as const;
export type CatalogSource = typeof CATALOG_SOURCES[number];
export const CATALOG_SOURCE_NAMES = { paperclip: "Paperclip", composio: "Composio", arcade: "Arcade", executor: "Executor", get installed() { return fullAppsT("fullApps.copy_f8b32f4e92bd"); }, get all() { return fullAppsT("fullApps.copy_a52ace420f21"); } };

export function CatalogSourceFilters({ source, onChange }: { source: CatalogSource; onChange: (source: CatalogSource) => void }) {
  useFullAppsTranslation();
  return <TabFilters label={fullAppsT("fullApps.app_filters_8a51c4")} size="standard" items={CATALOG_SOURCES.map(value => ({ value, label: CATALOG_SOURCE_NAMES[value] }))} value={source} onValueChange={onChange} />;
}
