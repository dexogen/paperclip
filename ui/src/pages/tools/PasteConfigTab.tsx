import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay, AppDisplayError } from "@/pages/apps/app-display-text";
import { i18n as fullAppsI18n } from "@/i18n";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import type {
  ConnectToolAppResult,
  McpJsonImportDraft,
  McpJsonImportPreview,
  ToolAppConnectionActionSummary,
  ToolOAuthStartResult,
} from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { toolsApi } from "@/api/tools";
import { navigateTopLevel } from "@/lib/browserNavigation";
import { prepareOAuthNavigation, savePendingCloudHandoff } from "@/lib/oauthHandoff";
import { useNavigate } from "@/lib/router";
import {
  OAuthConnectStateScreen,
  type OAuthConnectPhase,
} from "@/features/connections/ConnectionSetupFlow";
import { endpointHost } from "@/pages/apps/generic-mcp-connect";
import { McpConfigHelpDialog } from "./McpConfigHelpDialog";
import { ErrorState } from "./shared";

const SAMPLE_CONFIG = `{
  "mcpServers": {
    "github": {
      "command": "npx -y @modelcontextprotocol/server-github",
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}`;

/** Turn an env/header key (e.g. `GITHUB_TOKEN`) into a friendly field label. */
function humanizeKey(raw: string): string {
  const cleaned = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!cleaned) return fullAppsT("fullApps.caption_99a52df3ff");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function draftSummary(draft: McpJsonImportDraft): string {
  const keyCount = draft.credentialFields.length || draft.credentialRefs.length;
  const where = draft.transport === "local_stdio" ? fullAppsT("fullApps.runs_in_your_workspace_188afb") : fullAppsT("fullApps.connects_over_the_web_f1b4d1");
  if (keyCount === 0) return fullAppsT("fullApps.message_f2dd79fac966", { value1: where });
  return fullAppsT("fullApps.configKeys", { where, count: keyCount });
}

/**
 * A draft is connectable when it's a remote server with a real http(s) URL — that
 * is exactly what the "Connect with a link" wizard step needs to land an active
 * `tool_connection`. Imported stdio commands stay draft-only (they require an
 * approved Paperclip template), so they get no hand-off here.
 */
function draftConnectUrl(draft: McpJsonImportDraft): string | null {
  if (draft.transport !== "mcp_remote") return null;
  const raw = draft.config?.url;
  if (typeof raw !== "string") return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function credentialValueKey(draft: McpJsonImportDraft, configPath: string): string {
  return `${draft.name}::${configPath}`;
}

function credentialValuesForDraft(draft: McpJsonImportDraft, values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of draft.credentialFields) {
    const value = values[credentialValueKey(draft, field.configPath)]?.trim();
    if (value) out[field.configPath] = value;
  }
  return out;
}

function missingCredentialFields(draft: McpJsonImportDraft, values: Record<string, string>): string[] {
  return draft.credentialFields
    .filter((field) => field.required)
    .filter((field) => !values[credentialValueKey(draft, field.configPath)]?.trim())
    .map((field) => field.configPath);
}

function askFirstLevelsFrom(result: ConnectToolAppResult): string[] {
  const raw = (result.suggestedDefaults as { askFirstRiskLevels?: unknown })?.askFirstRiskLevels;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

/**
 * M8a — "Paste a config" tab on the Advanced door (PAP-10862, plan D8).
 *
 * A thin, honest surface over `POST /companies/:id/tools/mcp/import-json`: paste
 * the snippet a README tells you to copy, and we parse it into a friendly
 * preview (humanized field labels, never the raw transport jargon). This is one
 * of the two M8 screens where "MCP" vocabulary is allowed (PAP-10827 vocab map).
 */
export function PasteConfigTab({ companyId }: { companyId: string }) {
  useFullAppsTranslation();
  const navigate = useNavigate();
  const [draftText, setDraftText] = useState("");
  const [preview, setPreview] = useState<McpJsonImportPreview | null>(null);
  const [connectionNames, setConnectionNames] = useState<Record<string, string>>({});
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [connectResult, setConnectResult] = useState<ConnectToolAppResult | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [activatedName, setActivatedName] = useState<string | null>(null);
  const [oauthPhase, setOAuthPhase] = useState<OAuthConnectPhase>("entry");
  const [oauthError, setOAuthError] = useState<AppDisplayText | null>(null);
  const [authorizationHost, setAuthorizationHost] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (mcpJson: string) => toolsApi.importMcpJson(companyId, { mcpJson }),
    onSuccess: (result) => {
      setPreview(result);
      setConnectionNames(Object.fromEntries(result.drafts.map((draft) => [draft.name, draft.name])));
      setConnectResult(null);
      setActivatedName(null);
    },
  });

  const openAuthorizationPage = async (
    authorizationUrl: string,
    handoff?: ToolOAuthStartResult["handoff"],
  ) => {
    try {
      const target = await prepareOAuthNavigation({ authorizationUrl, handoff });
      if (target.kind === "reauthentication" && handoff) {
        savePendingCloudHandoff(handoff.session);
      }
      setAuthorizationHost(target.host);
      setOAuthPhase(target.kind === "authorization" ? "redirecting" : "starting");
      navigateTopLevel(target.url);
    } catch (error) {
      setOAuthPhase("error");
      setOAuthError(error instanceof Error ? appErrorDisplay(error) : ownAppDisplayText("fullApps.paperclip_couldn_t_start_secure_sign_in_try_again_479282"));
    }
  };

  const oauthStartMutation = useMutation({
    mutationFn: (connectionId: string) => toolsApi.startOAuth(connectionId),
    onSuccess: (start) => void openAuthorizationPage(start.authorizationUrl, start.handoff),
    onError: (error) => {
      setOAuthPhase("error");
      setOAuthError(
        error instanceof Error
          ? appErrorDisplay(error)
          : ownAppDisplayText("fullApps.paperclip_couldn_t_start_secure_sign_in_try_again_479282"),
      );
    },
  });

  const connectMutation = useMutation({
    mutationFn: (draft: McpJsonImportDraft) => {
      const url = draftConnectUrl(draft);
      if (!url) throw new AppDisplayError("fullApps.only_remote_http_drafts_can_be_checked_and_activated_d983b9");
      return toolsApi.connectApp(companyId, {
        link: url,
        name: connectionNames[draft.name]?.trim() || draft.name,
        credentialValues: credentialValuesForDraft(draft, credentialValues),
      });
    },
    onSuccess: (result) => {
      setConnectResult(result);
      if (result.auth?.kind === "oauth") {
        setActivatedName(null);
        setAuthorizationHost(null);
        setOAuthError(null);
        if (result.auth.manualClientRequired) {
          setOAuthPhase("error");
          setOAuthError(
            ownAppDisplayText("fullApps.this_server_requires_oauth_client_details_from_its_p_b794cd"),
          );
          return;
        }
        const startUrl = result.auth.startUrl?.trim();
        if (startUrl) {
          void openAuthorizationPage(startUrl, result.auth.handoff);
        } else {
          setOAuthPhase("starting");
          oauthStartMutation.mutate(result.connectionId);
        }
        return;
      }
      const defaults: Record<string, boolean> = {};
      for (const action of result.actions.readOnly) defaults[action.catalogEntryId] = true;
      for (const action of result.actions.canMakeChanges) defaults[action.catalogEntryId] = true;
      setEnabled(defaults);
      setActivatedName(null);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => {
      const askFirstLevels = connectResult ? askFirstLevelsFrom(connectResult) : [];
      const enabledIds = Object.entries(enabled).filter(([, on]) => on).map(([id]) => id);
      const askFirstIds = (connectResult?.actions.canMakeChanges ?? [])
        .filter((action) => enabled[action.catalogEntryId] && askFirstLevels.includes(action.riskLevel))
        .map((action) => action.catalogEntryId);
      return toolsApi.finishApp(companyId, connectResult!.connectionId, {
        enabledCatalogEntryIds: enabledIds,
        askFirstCatalogEntryIds: askFirstIds,
        access: "all_agents",
      });
    },
    onSuccess: () => setActivatedName(connectResult?.application.name ?? "Imported app"),
  });

  const drafts = preview?.drafts ?? [];
  const canSubmit = draftText.trim().length > 0 && !importMutation.isPending;

  const localParseError = useMemo(() => {
    const trimmed = draftText.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return null;
    } catch {
      return fullAppsT("fullApps.that_doesn_t_look_like_valid_json_yet_paste_the_whol_6c94d4");
    }
  }, [draftText, fullAppsI18n.resolvedLanguage]);

  if (connectResult?.auth?.kind === "oauth") {
    const connectionUrl = typeof connectResult.connection.config?.url === "string"
      ? connectResult.connection.config.url
      : typeof connectResult.connection.transportConfig?.url === "string"
        ? connectResult.connection.transportConfig.url
        : "";
    return (
      <OAuthConnectStateScreen
        identity={{
          name: connectResult.application.name,
          unverifiedHost: endpointHost(connectionUrl),
        }}
        phase={oauthPhase}
        error={renderAppDisplayText(oauthError)}
        authorizationHost={authorizationHost}
        onRetry={() => {
          setOAuthError(null);
          setAuthorizationHost(null);
          setOAuthPhase("starting");
          oauthStartMutation.mutate(connectResult.connectionId);
        }}
        onBack={() => navigate(`/apps/${connectResult.connectionId}/permissions`)}
        onCancel={() => navigate("/apps")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex max-w-2xl items-start gap-1.5">
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.paste_the_mcp_config_snippet_from_the_tool_s_readme__1f218f")}</p>
        <McpConfigHelpDialog />
      </div>
      <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.just_a_url_88de1f")}{" "}
        <Link to="/apps" className="text-primary hover:underline">{fullAppsT("fullApps.browse_planned_app_connections_342995")}</Link>{" "}{fullAppsT("fullApps.instead_90b5d1")}</p>

      <div className="space-y-2">
        <Textarea
          value={draftText}
          onChange={(event) => {
            setDraftText(event.target.value);
            if (preview) setPreview(null);
            setConnectResult(null);
            setActivatedName(null);
          }}
          spellCheck={false}
          rows={10}
          placeholder={SAMPLE_CONFIG}
          className="min-h-(--sz-220px) bg-slate-900 font-mono text-(length:--text-compact) leading-relaxed text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-400"
        />
        {localParseError ? (
          <p className="text-xs text-amber-600">{localParseError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.paste_an_mcp_config_the_snippet_a_readme_tells_you_t_59ed50")}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => importMutation.mutate(draftText)}
          disabled={!canSubmit || Boolean(localParseError)}
        >
          {importMutation.isPending ? fullAppsT("taskProperties.fields.checking") : fullAppsT("fullApps.check_config_9f23db")}
        </Button>
        <span className="text-xs text-muted-foreground">{fullAppsT("fullApps.we_ll_read_it_and_show_what_we_found_before_anything_e36240")}</span>
      </div>

      {importMutation.isError ? <ErrorState t={fullAppsI18n.t} error={importMutation.error} /> : null}

      {preview ? (
        drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">{fullAppsT("fullApps.we_couldn_t_find_an_app_in_that_config_double_check__e68580")}</div>
        ) : (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />{fullAppsT("fullApps.configAppCount", { count: drafts.length })}</h3>
            {drafts.map((draft, index) => {
              const url = draftConnectUrl(draft);
              const missingFields = missingCredentialFields(draft, credentialValues);
              return (
                <DraftCard
                  key={`${draft.name}-${index}`}
                  draft={draft}
                  connectionName={connectionNames[draft.name] ?? draft.name}
                  onConnectionNameChange={(value) =>
                    setConnectionNames((previous) => ({ ...previous, [draft.name]: value }))
                  }
                  credentialValues={credentialValues}
                  onCredentialChange={(configPath, value) =>
                    setCredentialValues((prev) => ({ ...prev, [credentialValueKey(draft, configPath)]: value }))
                  }
                  checking={connectMutation.isPending && connectMutation.variables?.name === draft.name}
                  canCheck={Boolean(url) && missingFields.length === 0}
                  onCheck={url ? () => connectMutation.mutate(draft) : undefined}
                />
              );
            })}
            {drafts.some((d) => draftConnectUrl(d)) ? (
              <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.checking_a_remote_app_creates_a_draft_connection_sto_00667e")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.we_humanized_the_field_names_from_the_config_these_r_af267d")}</p>
            )}
          </div>
        )
      ) : null}

      {connectMutation.isError ? <ErrorState t={fullAppsI18n.t} error={connectMutation.error} /> : null}
      {connectResult ? (
        <CatalogReview
          result={connectResult}
          enabled={enabled}
          onToggle={(id, on) => setEnabled((prev) => ({ ...prev, [id]: on }))}
          onBulk={(ids, on) =>
            setEnabled((prev) => {
              const next = { ...prev };
              for (const id of ids) next[id] = on;
              return next;
            })
          }
          finishing={finishMutation.isPending}
          activatedName={activatedName}
          onFinish={() => finishMutation.mutate()}
        />
      ) : null}
      {finishMutation.isError ? <ErrorState t={fullAppsI18n.t} error={finishMutation.error} /> : null}
    </div>
  );
}

function DraftCard({
  draft,
  connectionName,
  onConnectionNameChange,
  credentialValues,
  onCredentialChange,
  checking,
  canCheck,
  onCheck,
}: {
  draft: McpJsonImportDraft;
  connectionName: string;
  onConnectionNameChange: (value: string) => void;
  credentialValues: Record<string, string>;
  onCredentialChange: (configPath: string, value: string) => void;
  checking: boolean;
  canCheck: boolean;
  onCheck?: () => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{draft.name}</div>
          <div className="text-xs text-muted-foreground">{draftSummary(draft)}</div>
        </div>
        {onCheck ? (
          <Button size="sm" className="shrink-0" onClick={onCheck} disabled={checking || !canCheck}><FullAppsTrans i18nKey="fullApps.check_actions_19f644" components={{ part1: <>{checking ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}</> }} /></Button>
        ) : null}
      </div>

      {onCheck ? (
        <label className="mt-4 block max-w-sm space-y-1 text-xs font-medium text-foreground">{fullAppsT("providerSetup.credentials.name")}<Input
            value={connectionName}
            onChange={(event) => onConnectionNameChange(event.target.value)}
            placeholder={draft.name}
            className="h-8 text-xs"
          />
        </label>
      ) : null}

      {draft.credentialFields.length > 0 ? (
        <div className="mt-4 space-y-3">
          {draft.credentialFields.map((field) => (
            <div key={`${field.configPath}-${field.key}`} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                {humanizeKey(field.label || field.key)}
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-(length:--text-micro) text-muted-foreground">
                  {field.key}
                </code>
                <Input
                  type="password"
                  value={credentialValues[credentialValueKey(draft, field.configPath)] ?? ""}
                  onChange={(event) => onCredentialChange(field.configPath, event.target.value)}
                  placeholder={fullAppsT("fullApps.paste_replacement_value_297ff2")}
                  className="h-8 max-w-sm text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      ) : draft.credentialRefs.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{fullAppsT("fullApps.keys_from_this_config_stay_draft_only_until_an_admin_c7c738")}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{fullAppsT("fullApps.no_keys_needed_for_this_one_0f5035")}</p>
      )}

      {draft.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-border pt-3">
          {draft.warnings.map((warning, i) => (
            <li key={i} className="text-xs text-amber-600">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CatalogReview({
  result,
  enabled,
  onToggle,
  onBulk,
  finishing,
  activatedName,
  onFinish,
}: {
  result: ConnectToolAppResult;
  enabled: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
  onBulk: (ids: string[], on: boolean) => void;
  finishing: boolean;
  activatedName: string | null;
  onFinish: () => void;
}) {
  useFullAppsTranslation();
  const askFirstLevels = askFirstLevelsFrom(result);
  const enabledCount = Object.values(enabled).filter(Boolean).length;
  const total = result.actions.readOnly.length + result.actions.canMakeChanges.length;
  return (
    <div className="space-y-4 border-t border-border pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />{fullAppsT("fullApps.reviewAppActions", { name: result.application.name })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{fullAppsT("fullApps.health_and_catalog_checks_passed_every_discovered_ac_cd29bd")}</p>
        </div>
        <Button size="sm" onClick={onFinish} disabled={finishing || enabledCount === 0 || Boolean(activatedName)}><FullAppsTrans i18nKey="fullApps.activate_of_d0dbf5" components={{ part1: <>{finishing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}</>, part2: <>{enabledCount}</>, part3: <>{total}</> }} /></Button>
      </div>
      <ActionGroup
        title={fullAppsT("agentSkillsUi.row.readOnly")}
        actions={result.actions.readOnly}
        enabled={enabled}
        onToggle={onToggle}
        onBulk={(on) => onBulk(result.actions.readOnly.map((action) => action.catalogEntryId), on)}
        askFirstLevels={askFirstLevels}
      />
      <ActionGroup
        title={fullAppsT("fullApps.can_make_changes_0bf247")}
        actions={result.actions.canMakeChanges}
        enabled={enabled}
        onToggle={onToggle}
        onBulk={(on) => onBulk(result.actions.canMakeChanges.map((action) => action.catalogEntryId), on)}
        askFirstLevels={askFirstLevels}
      />
      {activatedName ? (
        <p className="text-xs font-medium text-emerald-700"><FullAppsTrans i18nKey="fullApps.is_active_for_all_agents_bbcdfd" components={{ part1: <>{activatedName}</> }} /></p>
      ) : null}
    </div>
  );
}

function ActionGroup({
  title,
  actions,
  enabled,
  onToggle,
  onBulk,
  askFirstLevels,
}: {
  title: string;
  actions: ToolAppConnectionActionSummary[];
  enabled: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
  onBulk: (on: boolean) => void;
  askFirstLevels: string[];
}) {
  useFullAppsTranslation();
  if (actions.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onBulk(true)}>{fullAppsT("fullApps.turn_all_on_08f6d3")}</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onBulk(false)}>{fullAppsT("fullApps.turn_all_off_59d74f")}</Button>
        </div>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {actions.map((action) => {
          const on = enabled[action.catalogEntryId] ?? false;
          return (
            <div key={action.catalogEntryId} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{action.title || action.toolName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {askFirstLevels.includes(action.riskLevel) ? fullAppsT("fullApps.ask_first_when_enabled_68872e") : action.riskLevel}
                </div>
              </div>
              <ToggleSwitch checked={on} onCheckedChange={(next) => onToggle(action.catalogEntryId, next)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
