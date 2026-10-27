import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DECISION_MODELS, type DecisionConnectionChoice, type DecisionModelSettings, type DecisionProvider, type DecisionResult, type UpdateDecisionModel } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { decisionModelsApi } from "@/api/decision-models";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ToggleField } from "@/components/agent-config-primitives";
import { ConnectionChoiceList } from "@/features/connections/ConnectionChoiceList";
import { ConnectionSetupFlow } from "@/features/connections/ConnectionSetupFlow";
import { AppLogo } from "@/pages/apps/AppLogo";

const failureMessages: Record<string, string> = {
  get not_configured() { return fullSharedTailT("fullSharedTail.display_3613eeaa8142"); }, get disabled() { return fullSharedTailT("fullSharedTail.display_f78b7953058b"); },
  get connection_unavailable() { return fullSharedTailT("fullSharedTail.display_aacb420ac772"); },
  get access_denied() { return fullSharedTailT("fullSharedTail.display_a1a0ff89ac09"); },
  get incompatible_connection() { return fullSharedTailT("fullSharedTail.display_ec62643ab081"); },
  get budget_blocked() { return fullSharedTailT("fullSharedTail.display_e3ee32822621"); },
  get provider_auth_failed() { return fullSharedTailT("fullSharedTail.display_f207183af70a"); },
  get provider_rate_limited() { return fullSharedTailT("fullSharedTail.display_76fda2882a9b"); },
  get timeout() { return fullSharedTailT("fullSharedTail.display_a0e04a15bb02"); },
  get refused() { return fullSharedTailT("fullSharedTail.display_7bfbf1f8c092"); },
};
export function DecisionModelSettingsView({ settings, choices, saving, testing, error, result, newlyConnectedId, onSave, onTest, onAdd }: {
  settings: DecisionModelSettings; choices: DecisionConnectionChoice[]; saving?: boolean; testing?: boolean;
  error?: string | null; result?: DecisionResult | null; newlyConnectedId?: string | null;
  onSave: (value: UpdateDecisionModel) => void; onTest: () => void; onAdd: () => void;
}) {
  useFullSharedTranslation();
  const [draft, setDraft] = useState<Required<UpdateDecisionModel>>(settings);
  const appliedConnection = useRef<string | null>(null);
  useEffect(() => { setDraft(settings); }, [settings.companyId, settings.connectionId, settings.grantId, settings.enabled, settings.allowBackground]);
  useEffect(() => {
    if (!newlyConnectedId) { appliedConnection.current = null; return; }
    if (appliedConnection.current === newlyConnectedId) return;
    const connection = choices.find(row => row.id === newlyConnectedId);
    if (connection) {
      appliedConnection.current = newlyConnectedId;
      setDraft(value => ({ ...value, connectionId: connection.id, grantId: connection.grantId, enabled: value.connectionId ? value.enabled : true }));
    }
  }, [newlyConnectedId, choices]);
  const selected = choices.find(row => row.grantId === draft.grantId);
  const dirty = draft.enabled !== settings.enabled || draft.allowBackground !== settings.allowBackground || draft.grantId !== settings.grantId;
  const unavailable = result && result.status !== "succeeded" ? failureMessages[result.status === "unavailable" ? result.reason : result.errorCode] ?? "The decision could not be completed. Review its entry in Costs." : null;
  return <section aria-labelledby="decision-model-heading" className="max-w-2xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="decision-model-heading" className="text-lg font-semibold">{fullSharedT("fullShared.decision_model_1e7a94")}</h2>
      <Link to="/activity/costs?tab=decisions" className="text-sm underline underline-offset-4">{fullSharedT("fullShared.view_usage_2e4ae3")}</Link>
    </div>
    <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.choose_the_shared_connection_paperclip_uses_for_opti_ee93f2")}</p>
    <ConnectionChoiceList selectedId={draft.grantId ?? undefined} disabled={saving || testing}
      choices={choices.map(row => ({ id: row.grantId, name: row.name,
        description: `${row.decisionModel} · ${row.status === "connected" ? fullSharedTailT("fullSharedTail.connected") : fullSharedTailT("fullSharedTail.needsAttention")}`,
        icon: <AppLogo name={row.provider === "openai" ? "OpenAI" : "OpenRouter"} brandKey={row.provider} size={24} />,
      }))}
      onSelect={grantId => { const row = choices.find(choice => choice.grantId === grantId)!; setDraft(value => ({ ...value, connectionId: row.id, grantId, enabled: value.connectionId ? value.enabled : true })); }} />
    {choices.length === 0 && <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.add_a_shared_openai_or_openrouter_api_connection_to__f90264")}</p>}
    {draft.connectionId && !selected && <p role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.the_saved_connection_is_unavailable_to_you_disable_d_2cc82e")}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={onAdd} disabled={saving || testing}>{fullSharedT("fullShared.add_connection_685f88")}</Button>
      {selected && <Link to={`/apps/${selected.id}/permissions`} className="text-sm underline underline-offset-4">{selected.status === "connected" ? fullSharedT("fullShared.manage_connection_ad2892") : fullSharedT("fullShared.reconnect_connection_ea91fe")}</Link>}
    </div>
    {draft.connectionId && <fieldset disabled={saving || testing} className="space-y-4">
      <ToggleField label={fullSharedT("fullShared.enable_decisions_219930")} checked={draft.enabled} onChange={enabled => setDraft(value => ({ ...value, enabled }))} />
      <div className="space-y-2">
        <ToggleField label={fullSharedT("fullShared.allow_company_sponsored_background_decisions_30f80d")} checked={draft.allowBackground} onChange={allowBackground => setDraft(value => ({ ...value, allowBackground }))} />
        <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.background_features_can_charge_this_connection_witho_cce892")}</p>
      </div>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!dirty && unavailable && <p role="alert" className="text-sm text-destructive">{unavailable}</p>}
    {!dirty && result?.status === "succeeded" && <div role="status" className="space-y-2 text-sm">
      <p className="font-medium">{fullSharedT("fullShared.decision_model_is_working_3aa710")}</p>
      <dl className="grid grid-cols-2 gap-2">{Object.entries(result.answers).map(([name, answer]) => <div key={name}>
        <dt className="text-muted-foreground">{name === "billing" ? fullSharedT("fullShared.billing_problem_332228") : name === "team" ? fullSharedT("fullShared.assigned_team_0dacf0") : fullSharedT("fullShared.disruption_score_828422")}</dt>
        <dd className="font-mono">{answer.type === "boolean" ? `${Math.round(answer.probability * 100)}%` : answer.type === "choice" ? answer.choice : `${answer.score.toFixed(2)} / 2`}</dd>
      </div>)}</dl>
      <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.usage_was_recorded_test_answers_are_not_saved_0d7317")}</p>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <Button variant="outline" size="sm" disabled={!settings.enabled || dirty || saving || testing || selected?.status !== "connected"} onClick={onTest}>{testing ? fullSharedT("fullShared.running_test_f1b4c1") : fullSharedT("agentSetupUi.runtime.run")}</Button>
        <p className="text-xs text-muted-foreground">{dirty ? fullSharedT("companySettings.observability.saveBeforeTest") : fullSharedT("fullShared.runs_a_small_sample_with_an_api_charge_9e0456")}</p>
      </div>
      {dirty && <Button onClick={() => onSave(draft)} disabled={saving || testing || (draft.enabled && selected?.status !== "connected")}>{saving ? fullSharedT("fullShared.saving_23e392") : fullSharedT("fullShared.save_decision_model_36dbf1")}</Button>}
    </div>
  </section>;
}

export function DecisionModelSettingsSection({ companyId }: { companyId: string }) {
  useFullSharedTranslation();
  const client = useQueryClient();
  const key = ["decision-model", companyId];
  const query = useQuery({ queryKey: key, queryFn: () => decisionModelsApi.settings(companyId) });
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<DecisionProvider | null>(null);
  const [newlyConnectedId, setNewlyConnectedId] = useState<string | null>(null);
  const settingsRevision = JSON.stringify(query.data?.settings ?? { companyId });
  const test = useMutation({ mutationFn: (_revision: string) => decisionModelsApi.test(companyId), onSettled: () => { void client.invalidateQueries({ queryKey: ["decision-history", companyId] }); void client.invalidateQueries({ predicate: q => String(q.queryKey[0]).includes("cost") }); } });
  const resetTest = test.reset;
  useEffect(() => { resetTest(); }, [settingsRevision, resetTest]);
  const save = useMutation({ mutationFn: (settings: UpdateDecisionModel) => decisionModelsApi.update(companyId, settings), onSuccess: settings => {
    setNewlyConnectedId(null); test.reset(); client.setQueryData(key, { ...query.data, settings });
  } });
  if (query.isPending) return <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_decision_model_d9061b")}</p>;
  if (query.error) return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{fullSharedT("fullShared.could_not_load_decision_settings_a6467a")}</p><Button variant="outline" onClick={() => void query.refetch()}>{fullSharedT("fullShared.try_again_d8b839")}</Button></div>;
  if (!query.data?.canManage || !query.data.settings) return null;
  return <>
    <DecisionModelSettingsView settings={query.data.settings} choices={query.data.choices} saving={save.isPending} testing={test.isPending}
      error={save.error?.message ?? (test.variables === settingsRevision ? test.error?.message : undefined)}
      result={test.variables === settingsRevision ? test.data : null} newlyConnectedId={newlyConnectedId}
      onSave={value => save.mutate(value)} onTest={() => test.mutate(settingsRevision)} onAdd={() => { setProvider(null); setAdding(true); }} />
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent className="sm:max-w-2xl max-h-(--sz-85vh) overflow-y-auto">
        <DialogHeader><DialogTitle>{fullSharedT("fullShared.add_a_decision_connection_7dcebe")}</DialogTitle><DialogDescription>{fullSharedT("fullShared.use_a_shared_api_connection_for_company_decisions_e384e3")}</DialogDescription></DialogHeader>
        {provider ? <ConnectionSetupFlow host="dialog" serviceSlug={provider} forceNewConnection
          aiConnection={{ provider, method: "api_key", mode: "shared" }} requiredAiOwnership="shared"
          onCancel={() => setAdding(false)} onComplete={async result => {
            const refreshed = await query.refetch();
            if ("connectionId" in result && result.connectionId && refreshed.data?.choices.some(row => row.id === result.connectionId)) setNewlyConnectedId(result.connectionId);
            setAdding(false);
          }} /> : <ConnectionChoiceList choices={(Object.keys(DECISION_MODELS) as DecisionProvider[]).map(id => ({ id,
            name: id === "openai" ? "OpenAI" : "OpenRouter", description: DECISION_MODELS[id].name,
            icon: <AppLogo name={id === "openai" ? "OpenAI" : "OpenRouter"} brandKey={id} size={24} />,
          }))} onSelect={id => setProvider(id as DecisionProvider)} />}
      </DialogContent>
    </Dialog>
  </>;
}
