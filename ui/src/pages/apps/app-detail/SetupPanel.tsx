import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { ToolCatalogEntry, ToolConnection } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { appDefinitionSlug } from "../app-definition-display";
import type { AppDetailSectionProps } from "./types";
import { googleSheetsConfigWithAllowlist, parseGoogleSheetIds } from "../google-sheets";

export function SetupPanel({
  connection,
  galleryEntry,
  onUpdateConfig,
  configUpdateDisabled,
  identities,
  agentsSummary,
  permissionsSummary,
  permissionsLoading,
  onOpenPermissions,
}: Pick<
  AppDetailSectionProps,
  "connection" | "galleryEntry"
> & {
  onUpdateConfig: (config: Record<string, unknown>) => void;
  configUpdateDisabled: boolean;
  /**
   * The fixed Identity section. It replaces the old generic OAuth "workspace
   * authorization" block and shows the identity type chosen during setup.
   */
  identities?: ReactNode;
  agentsSummary: string;
  permissionsSummary: string | null;
  permissionsLoading: boolean;
  onOpenPermissions: () => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="space-y-10">
      {identities}
      <SetupLinkSection title={fullAppsT("sidebar.agents")} summary={agentsSummary} onClick={onOpenPermissions} />
      <SetupLinkSection
        title={fullAppsT("searchUi.palette.actions")}
        summary={permissionsLoading ? fullAppsT("fullApps.loading_permissions_946f15") : permissionsSummary ?? fullAppsT("fullApps.manage_permissions_2630ba")}
        onClick={onOpenPermissions}
      />
      {appDefinitionSlug(galleryEntry) === "google-sheets" && (
        <GoogleSheetsAllowlistSection
          connection={connection}
          disabled={configUpdateDisabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}
      {appDefinitionSlug(galleryEntry) === "posthog" && (
        <PostHogConfigurationSection connection={connection} />
      )}
    </div>
  );
}

function SetupLinkSection({
  title,
  summary,
  onClick,
}: {
  title: string;
  summary: string;
  onClick: () => void;
}) {
  useFullAppsTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 text-sm text-muted-foreground">{summary}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </section>
  );
}

/**
 * Provider label used in identity and revoke copy. Falls back to the app's own
 * display name so a pasted server never reads as a generic "OAuth".
 */
export function connectionProviderName(
  galleryEntry: Parameters<typeof appDefinitionSlug>[0],
  fallback: string,
): string {
  switch (appDefinitionSlug(galleryEntry)) {
    case "notion":
      return "Notion";
    case "posthog":
      return "PostHog";
    case "gmail":
      return "Gmail";
    case "google-sheets":
      return "Google Sheets";
    default:
      return fallback;
  }
}

function PostHogConfigurationSection({ connection }: { connection: ToolConnection }) {
  useFullAppsTranslation();
  const raw = connection.config?.methodConfig;
  const config = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const method = connection.config?.connectionMethodKey === "mcp-oauth" ? fullAppsT("fullApps.posthog_sign_in_90840e") : fullAppsT("fullApps.personal_api_key_a9a0c7");
  const features = typeof config.features === "string" ? config.features : fullAppsT("fullApps.caption_dc937b5989");
  const tools = typeof config.tools === "string" && config.tools ? config.tools : fullAppsT("fullApps.caption_dc937b5989");
  const rows = [
    [fullAppsT("fullApps.connection_method_5d8534"), method],
    [fullAppsT("fullApps.project_pin_8475eb"), typeof config.projectId === "string" ? config.projectId : fullAppsT("fullApps.use_active_project_87b122")],
    [fullAppsT("fullApps.read_only_mode_d06de4"), config.readOnly === true ? fullAppsT("fullApps.caption_1300117561") : fullAppsT("fullApps.caption_ca7981b46e")],
    [fullAppsT("fullApps.feature_groups_a6ed85"), features],
    [fullAppsT("fullApps.individual_tools_99d1d1"), tools],
    [fullAppsT("fullApps.response_mode_2db3ac"), typeof config.mode === "string" ? config.mode : "tools"],
  ];
  return (
    <section>
      <h2 className="text-sm font-bold text-foreground">{fullAppsT("fullApps.posthog_access_scope_8b34d1")}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{fullAppsT("fullApps.posthog_uses_its_normal_account_defaults_unless_you__84a948")}</p>
      <dl className="mt-4 divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-2 sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm text-foreground sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function currentSpreadsheetIds(connection: ToolConnection): string[] {
  const raw = connection.config?.allowedSpreadsheetIds;
  return Array.isArray(raw) ? raw.map((value) => String(value).trim()).filter(Boolean) : [];
}

function googleSheetsUrlForId(id: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit`;
}

function GoogleSheetsAllowlistSection({
  connection,
  disabled,
  onUpdateConfig,
}: {
  connection: ToolConnection;
  disabled: boolean;
  onUpdateConfig: (config: Record<string, unknown>) => void;
}) {
  useFullAppsTranslation();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<AppDisplayText | null>(null);
  const ids = currentSpreadsheetIds(connection);
  const saveIds = (nextIds: string[]) =>
    onUpdateConfig(googleSheetsConfigWithAllowlist(connection.config, nextIds));

  return (
    <section>
      <div>
        <h2 className="text-sm font-bold text-foreground">{fullAppsT("fullApps.sheets_agents_can_use_38b73b")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{fullAppsT("fullApps.agents_can_only_use_the_sheets_listed_here_17ba1d")}</p>
      </div>

      <div className="mt-4 space-y-2">
        {ids.length === 0 ? (
          <div className="text-sm text-muted-foreground">{fullAppsT("fullApps.no_sheets_are_connected_yet_ee54c8")}</div>
        ) : (
          ids.map((id) => {
            const sheetUrl = googleSheetsUrlForId(id);
            return (
              <div key={id} className="flex items-center gap-3 border-t border-border py-2 first:border-t-0">
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 text-sm font-medium text-foreground underline-offset-2 hover:underline"
                >
                  <span className="block truncate">{fullAppsT("fullApps.open_sheet_f2df24")}</span>
                  <span className="block truncate font-mono text-xs font-normal text-muted-foreground">
                    {sheetUrl}
                  </span>
                  <span className="block truncate font-mono text-(length:--text-micro) font-normal text-muted-foreground/80">
                    ID: {id}
                  </span>
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || ids.length <= 1}
                  title={ids.length <= 1 ? fullAppsT("fullApps.add_another_sheet_before_removing_this_one_a9ae30") : undefined}
                  onClick={() => saveIds(ids.filter((current) => current !== id))}
                >{fullAppsT("profile.remove")}</Button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="h-10"
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            const parsed = parseGoogleSheetIds(draft);
            if (parsed.ids.length === 0) {
              setError(ownAppDisplayText("fullApps.paste_a_google_sheets_link_3140b1"));
              return;
            }
            if (parsed.invalidCount > 0) {
              setError(ownAppDisplayText("fullApps.that_doesn_t_look_like_a_google_sheets_link_42b2bd"));
              return;
            }
            saveIds(Array.from(new Set([...ids, ...parsed.ids])));
            setDraft("");
          }}
        >{fullAppsT("fullApps.add_sheet_e05a0e")}</Button>
      </div>
      {error && <div className="mt-2 text-xs text-destructive">{renderAppDisplayText(error)}</div>}
    </section>
  );
}

export function QuarantinedActionsReview({
  entries,
  disabled,
  onSubmit,
}: {
  entries: ToolCatalogEntry[];
  disabled: boolean;
  onSubmit: (enabledIds: string[]) => void;
}) {
  useFullAppsTranslation();
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const count = entries.length;
  const selectedIds = entries.filter((entry) => enabledIds.has(entry.id)).map((entry) => entry.id);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {fullAppsT("fullApps.newActionsReview", { count })}
          </div>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{fullAppsT("fullApps.turn_on_the_actions_agents_may_use_anything_left_off_6a8de8")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs font-medium text-amber-800 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
            disabled={disabled}
            onClick={() => setEnabledIds(new Set(entries.map((entry) => entry.id)))}
          >{fullAppsT("fullApps.turn_all_on_08f6d3")}</button>
          <button
            type="button"
            className="text-xs font-medium text-amber-800 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
            disabled={disabled}
            onClick={() => setEnabledIds(new Set())}
          >{fullAppsT("fullApps.turn_all_off_59d74f")}</button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const enabled = enabledIds.has(entry.id);
          const label = entry.title ?? entry.toolName;
          return (
            <div key={entry.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{label}</div>
                {entry.description && (
                  <div className="truncate text-xs text-muted-foreground">{entry.description}</div>
                )}
              </div>
              <ToggleSwitch
                aria-label={fullAppsT("fullApps.allowed_fdaa67", { value1: label })}
                checked={enabled}
                disabled={disabled}
                onCheckedChange={(next) => {
                  setEnabledIds((current) => {
                    const updated = new Set(current);
                    if (next) updated.add(entry.id);
                    else updated.delete(entry.id);
                    return updated;
                  });
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-amber-700 dark:text-amber-300"><FullAppsTrans i18nKey="fullApps.of_will_be_on_ac6376" components={{ part1: <>{selectedIds.length}</>, part2: <>{count}</> }} /></span>
        <Button size="sm" disabled={disabled} onClick={() => onSubmit(selectedIds)}>
          {disabled ? fullAppsT("fullApps.saving_23e392") : fullAppsT("fullApps.save_choices_035882")}
        </Button>
      </div>
    </section>
  );
}
