import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FAST_RESPONSE_DEFAULT_MODEL,
  type FastResponseSettings,
  type AiManagedConnectionSummary,
  type FastResponseTestResult,
  type UpdateFastResponse,
  type AiProvider,
} from "@paperclipai/shared";
import { fastResponsesApi } from "@/api/fast-responses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleField } from "@/components/agent-config-primitives";
import { ConnectionChoiceList } from "@/features/connections/ConnectionChoiceList";
import { AppLogo } from "@/pages/apps/AppLogo";
import { ConnectionSetupFlow } from "@/features/connections/ConnectionSetupFlow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "@/lib/router";

const editable = (s: FastResponseSettings): UpdateFastResponse => ({
  enabled: s.enabled,
  connectionId: s.connectionId,
  grantId: s.grantId,
  model: s.model,
  allowSponsored: s.allowSponsored,
});

export function FastResponseSettingsView({
  settings,
  choices,
  models = [],
  saving,
  testing,
  error,
  result,
  newlyConnectedId,
  onSave,
  onTest,
  onConnectionChange,
  onAdd,
}: {
  settings: FastResponseSettings;
  choices: AiManagedConnectionSummary[];
  models?: Array<{ id: string; label?: string }>;
  newlyConnectedId?: string | null;
  saving?: boolean;
  testing?: boolean;
  error?: string | null;
  result?: FastResponseTestResult | null;
  onAdd?: () => void;
  onSave: (value: UpdateFastResponse) => void;
  onTest: () => void;
  onConnectionChange?: (id: string | null) => void;
}) {
  useFullSharedTranslation();
  const [draft, setDraft] = useState<UpdateFastResponse>(() =>
    editable(settings),
  );
  const modelListId = useId();
  const revision = JSON.stringify(editable(settings));
  useEffect(() => {
    setDraft(editable(settings));
    onConnectionChange?.(settings.connectionId);
  }, [revision]);
  const appliedConnection = useRef<string | null>(null);
  useEffect(() => {
    if (!newlyConnectedId) {
      appliedConnection.current = null;
      return;
    }
    if (appliedConnection.current === newlyConnectedId) return;
    const connection = choices.find((row) => row.id === newlyConnectedId);
    if (!connection) return;
    appliedConnection.current = newlyConnectedId;
    setDraft((value) => ({
      ...value,
      connectionId: connection.id,
      grantId: connection.grantId,
      model:
        connection.provider === "openrouter" ||
        connection.routing?.kind === "openrouter"
          ? FAST_RESPONSE_DEFAULT_MODEL
          : (connection.routing?.models[0]?.id ?? null),
      enabled: value.connectionId ? value.enabled : true,
    }));
    onConnectionChange?.(connection.id);
  }, [newlyConnectedId, choices, onConnectionChange]);
  const selected = choices.find((c) => c.grantId === draft.grantId);
  const dirty =
    draft.enabled !== settings.enabled ||
    draft.grantId !== settings.grantId ||
    draft.model !== settings.model ||
    draft.allowSponsored !== settings.allowSponsored;
  return (
    <section className="max-w-2xl space-y-4" aria-label={fullSharedT("fullShared.fast_response_b68363")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{fullSharedT("fullShared.fast_response_b68363")}</h2>
        <Link
          to="/activity/costs?tab=fast-responses"
          className="text-sm underline underline-offset-4"
        >{fullSharedT("fullShared.view_usage_2e4ae3")}</Link>
      </div>
      <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.send_a_short_acknowledgement_while_your_agent_starts_399bf4")}</p>
      <ConnectionChoiceList
        selectedId={draft.grantId ?? undefined}
        disabled={saving || testing}
        choices={choices.map((c) => ({
          id: c.grantId,
          name: c.name,
          description:
            c.status === "connected" ? fullSharedT("environmentsUi.terminal.connected") : fullSharedT("inboxUi.blocked.variant.needs_attention"),
          icon: <AppLogo name={c.provider} brandKey={c.provider} size={24} />,
        }))}
        onSelect={(grantId) => {
          const c = choices.find((c) => c.grantId === grantId)!;
          setDraft((d) => ({
            ...d,
            connectionId: c.id,
            grantId,
            model:
              c.provider === "openrouter" || c.routing?.kind === "openrouter"
                ? FAST_RESPONSE_DEFAULT_MODEL
                : (c.routing?.models[0]?.id ?? null),
            enabled: d.connectionId ? d.enabled : true,
          }));
          onConnectionChange?.(c.id);
        }}
      />
      {!choices.length && (
        <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.add_a_shared_api_connection_in_apps_to_get_started_971ac7")}</p>
      )}
      <div className="flex items-center gap-3">
        {onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>{fullSharedT("fullShared.add_connection_685f88")}</Button>
        )}
        <Link to="/apps" className="text-sm underline underline-offset-4">{fullSharedT("skillsGap.manageConnections")}</Link>
      </div>
      {draft.connectionId && (
        <fieldset disabled={saving || testing} className="space-y-4">
          {!selected && (
            <p role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.the_saved_connection_is_unavailable_disable_fast_res_e3768a")}</p>
          )}
          <div className="space-y-2">
            <label
              htmlFor={`${modelListId}-input`}
              className="text-sm font-medium"
            >{fullSharedT("onboarding.model.label")}</label>
            <Input
              id={`${modelListId}-input`}
              list={modelListId}
              value={draft.model ?? ""}
              placeholder={fullSharedT("fullShared.choose_or_enter_a_model_id_457327")}
              onChange={(e) =>
                setDraft((d) => ({ ...d, model: e.target.value || null }))
              }
            />
            <datalist id={modelListId}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label ?? m.id}
                </option>
              ))}
            </datalist>
          </div>
          <ToggleField
            label={fullSharedT("fullShared.enable_fast_responses_b60a1e")}
            checked={draft.enabled}
            onChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
          <div className="space-y-2">
            <ToggleField
              label={fullSharedT("fullShared.allow_company_sponsored_fast_responses_08376e")}
              checked={draft.allowSponsored}
              onChange={(allowSponsored) =>
                setDraft((d) => ({ ...d, allowSponsored }))
              }
            />
            <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.covers_accepted_external_messages_from_people_withou_451c2b")}</p>
          </div>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!dirty &&
        result &&
        (result.status === "succeeded" ? (
          <div role="status" className="space-y-2 text-sm">
            <p>{result.text}</p>
            <p className="text-xs text-muted-foreground"><FullSharedTrans i18nKey="fullShared.seconds_input_output_tokens_usage_recorded_in_costs_1e69c3" components={{ part1: <>{(result.durationMs / 1000).toFixed(2)}</>, part2: <>{" "}</>, part3: <>{result.usage.inputTokens ?? "—"}</>, part4: <>{" "}</>, part5: <>{result.usage.outputTokens ?? "—"}</> }} /></p>
          </div>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {result.reason === "timeout"
              ? fullSharedT("fullShared.the_model_did_not_respond_within_three_seconds_try_a_57f4c3")
              : fullSharedT("fullShared.could_not_generate_a_response_check_the_connection_a_268ada")}
          </p>
        ))}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={dirty || !settings.enabled || saving || testing}
          >
            {testing ? fullSharedT("onboarding.progress.testing") : fullSharedT("fullShared.test_response_39779b")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {dirty
              ? fullSharedT("companySettings.observability.saveBeforeTest")
              : fullSharedT("fullShared.runs_a_small_sample_with_an_api_charge_9e0456")}
          </p>
        </div>
        {dirty && (
          <Button
            disabled={
              saving ||
              testing ||
              (draft.enabled &&
                (!draft.model || selected?.status !== "connected"))
            }
            onClick={() => onSave(draft)}
          >
            {saving ? fullSharedT("fullShared.saving_23e392") : fullSharedT("fullShared.save_fast_response_3676a7")}
          </Button>
        )}
      </div>
    </section>
  );
}
export function FastResponseSettingsSection({
  companyId,
}: {
  companyId: string;
}) {
  useFullSharedTranslation();
  const client = useQueryClient(),
    key = ["fast-response", companyId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => fastResponsesApi.settings(companyId),
  });
  const [newlyConnectedId, setNewlyConnectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const models = useQuery({
    queryKey: ["fast-response-models", companyId, connectionId],
    queryFn: () => fastResponsesApi.models(companyId, connectionId!),
    enabled: Boolean(connectionId),
  });
  const settingsRevision = JSON.stringify(
    query.data?.settings ?? { companyId },
  );
  const test = useMutation({
    mutationFn: (_revision: string) => fastResponsesApi.test(companyId),
    onSettled: () => {
      void client.invalidateQueries({
        queryKey: ["fast-response-history", companyId],
      });
      void client.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).includes("cost"),
      });
    },
  });
  const resetTest = test.reset;
  useEffect(() => {
    resetTest();
  }, [settingsRevision, resetTest]);
  const save = useMutation({
    mutationFn: (settings: UpdateFastResponse) =>
      fastResponsesApi.update(companyId, settings),
    onSuccess: (settings) => {
      test.reset();
      client.setQueryData(key, { ...query.data, settings });
    },
  });
  if (query.isPending)
    return (
      <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_fast_response_5c8027")}</p>
    );
  if (query.error)
    return (
      <div role="alert">
        <p className="text-sm text-destructive">{fullSharedT("fullShared.could_not_load_fast_response_settings_388d16")}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>{fullSharedT("fullShared.try_again_d8b839")}</Button>
      </div>
    );
  if (!query.data?.canManage || !query.data.settings) return null;
  return (
    <>
      <FastResponseSettingsView
        key={companyId}
        newlyConnectedId={newlyConnectedId}
        settings={query.data.settings}
        choices={query.data.choices}
        models={models.data}
        saving={save.isPending}
        testing={test.isPending}
        error={
          save.error?.message ??
          test.error?.message ??
          (models.error
            ? "Could not load models. Enter a model ID or retry later."
            : null)
        }
        result={test.variables === settingsRevision ? test.data : null}
        onConnectionChange={setConnectionId}
        onSave={(v) => save.mutate(v)}
        onTest={() => test.mutate(settingsRevision)}
        onAdd={() => {
          setProvider(null);
          setAdding(true);
        }}
      />
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-2xl max-h-(--sz-85vh) overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fullSharedT("fullShared.add_a_fast_response_connection_384f85")}</DialogTitle>
            <DialogDescription>{fullSharedT("fullShared.use_a_shared_api_connection_for_short_acknowledgemen_4e5d99")}</DialogDescription>
          </DialogHeader>
          {provider ? (
            <ConnectionSetupFlow
              host="dialog"
              serviceSlug={provider}
              forceNewConnection
              aiConnection={{ provider, method: "api_key", mode: "shared" }}
              requiredAiOwnership="shared"
              onCancel={() => setAdding(false)}
              onComplete={async (result) => {
                const refreshed = await query.refetch();
                if (
                  "connectionId" in result &&
                  result.connectionId &&
                  refreshed.data?.choices.some(
                    (row) => row.id === result.connectionId,
                  )
                )
                  setNewlyConnectedId(result.connectionId);
                setAdding(false);
              }}
            />
          ) : (
            <ConnectionChoiceList
              choices={[
                "openrouter",
                "openai",
                "anthropic",
                "google",
                "xai",
              ].map((id) => ({
                id,
                description: fullSharedT("fullShared.shared_api_connection_2f85b7"),
                name:
                  id === "openrouter"
                    ? "OpenRouter"
                    : id === "openai"
                      ? "OpenAI"
                      : id === "xai"
                        ? "xAI"
                        : id === "google"
                          ? "Google"
                          : "Anthropic",
                icon: <AppLogo name={id} brandKey={id} size={24} />,
              }))}
              onSelect={(id) => setProvider(id as AiProvider)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
