import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { CatalogSourceFilters, type CatalogSource } from "./CatalogSourceFilters";

/** Shared catalog search and source filters; data and scope changes stay in Browse. */
export function ConnectorsToolbar({ query, onQueryChange, source, onSourceChange }: {
  query: string;
  onQueryChange: (value: string) => void;
  source: CatalogSource;
  onSourceChange: (value: CatalogSource) => void;
}) {
  useFullAppsTranslation();
  return <header data-canonical-toolbar="connectors" role="toolbar" aria-label={fullAppsT("fullApps.connectors_controls_8b98f2")} className="flex flex-wrap items-center gap-3">
    <div className="w-full">
      <ToolbarSearch query={query} onQueryChange={onQueryChange} label={fullAppsT("fullApps.search_connectors_706a60")} placeholder={fullAppsT("fullApps.search_connectors_fad7e4")} inputType="search" />
    </div>
    <CatalogSourceFilters source={source} onChange={onSourceChange} />
  </header>;
}
