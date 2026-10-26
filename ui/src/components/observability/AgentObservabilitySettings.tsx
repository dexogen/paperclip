import { useEffect, useRef, useState } from "react";
import { t, useTranslation } from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_AGENT_OBSERVABILITY_CAPTURE, updateAgentObservabilitySchema, isSameOtlpOrigin,
  type AgentObservabilityCapture, type AgentObservabilitySettings, type AgentObservabilitySettingsResponse,
  type AgentObservabilityTestReceipt, type UpdateAgentObservabilityRequest,
} from "@paperclipai/shared";
import { agentObservabilityApi } from "@/api/agent-observability";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/agent-config-primitives";

type HeaderDraft = { id: number; originalName: string | null; name: string; value: string };
const captureLabels: Array<{ key: keyof AgentObservabilityCapture; label: () => string }> = [
  { key: "userPrompts", label: () => t("companySettings.observability.capturePrompts") },
  { key: "assistantResponses", label: () => t("companySettings.observability.captureResponses") },
  { key: "toolContent", label: () => t("companySettings.observability.captureToolContent") },
  { key: "toolDetails", label: () => t("companySettings.observability.captureToolDetails") },
];
export interface AgentObservabilitySettingsViewProps {
  companyId: string;
  settings: AgentObservabilitySettings | null;
  canManage?: boolean;
  saving?: boolean;
  testing?: boolean;
  removing?: boolean;
  error?: string | null;
  conflict?: boolean;
  result?: AgentObservabilityTestReceipt | null;
  /** Changes only after an explicit successful mutation, never a background refetch. */
  resetKey?: number;
  onSave: (input: UpdateAgentObservabilityRequest) => void;
  onTest: () => void;
  onRemove: () => void;
  onReload?: () => void;
}

export function AgentObservabilitySettingsView(props: AgentObservabilitySettingsViewProps) {
  const { t, i18n } = useTranslation();
  const { companyId, settings, canManage = true, saving, testing, removing, error, conflict, onSave, onTest, onRemove, onReload } = props;
  const [provider, setProvider] = useState<"braintrust" | "otlp">("braintrust");
  const [projectId, setProjectId] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [capture, setCapture] = useState<AgentObservabilityCapture>({ ...DEFAULT_AGENT_OBSERVABILITY_CAPTURE });
  const [apiKey, setApiKey] = useState("");
  const [replaceKey, setReplaceKey] = useState(false);
  const [headers, setHeaders] = useState<HeaderDraft[]>([]);
  const [validation, setValidation] = useState<{ message?: string; freshHeaders?: boolean; invalidInput?: boolean } | null>(null);
  const [applied, setApplied] = useState<AgentObservabilitySettings | null>(settings);
  const nextHeader = useRef(0);
  const revision = settings?.revision ?? null;
  function reset() {
    setApplied(settings);
    setProvider(settings?.destination.provider ?? "braintrust");
    setProjectId(settings?.destination.provider === "braintrust" ? settings.destination.projectId : "");
    setEndpoint(settings?.destination.provider === "otlp" ? settings.destination.endpointBaseUrl : "");
    setEnabled(settings?.enabled ?? false);
    setCapture({ ...(settings?.capture ?? DEFAULT_AGENT_OBSERVABILITY_CAPTURE) });
    setApiKey(""); setReplaceKey(false); setValidation(null);
    setHeaders((settings?.destination.provider === "otlp" ? settings.headerNames : []).map(name => ({ id: nextHeader.current++, originalName: name, name, value: "" })));
  }
  const original = applied;
  const headersChanged = provider === "otlp" && (headers.some(row => row.value || row.originalName !== row.name.toLowerCase())
    || JSON.stringify(headers.map(row => row.name.toLowerCase()).sort()) !== JSON.stringify(original?.destination.provider === "otlp" ? [...original.headerNames].sort() : []));
  const dirty = !original || provider !== original.destination.provider || enabled !== original.enabled || replaceKey || Boolean(apiKey) || headersChanged
    || JSON.stringify(capture) !== JSON.stringify(original.capture)
    || (provider === "braintrust" ? projectId !== (original.destination.provider === "braintrust" ? original.destination.projectId : "")
      : endpoint !== (original.destination.provider === "otlp" ? original.destination.endpointBaseUrl : ""));
  // Explicit mutation success/company changes erase secrets. Background reads
  // may update a clean form, but cannot overwrite an unsaved draft.
  useEffect(() => { reset(); }, [companyId, props.resetKey]);
  useEffect(() => { if (!dirty && !conflict) reset(); }, [revision]);
  const hasConflict = Boolean(conflict || revision !== (original?.revision ?? null));
  const requireFreshHeaders = provider === "otlp" && original?.destination.provider === "otlp"
    && original.headerNames.length > 0 && !isSameOtlpOrigin(original.destination, { provider: "otlp", endpointBaseUrl: endpoint });
  const busy = saving || testing || removing;
  const providerChanged = !original || original.destination.provider !== provider;
  function save(overrideEnabled?: boolean) {
    if (requireFreshHeaders && headers.some(row => !row.value)) {
      setValidation({ freshHeaders: true }); return;
    }
    const common = { expectedRevision: original?.revision ?? null, enabled: overrideEnabled ?? enabled, capture };
    const input = provider === "braintrust"
      ? { ...common, destination: { provider, projectId }, credentials: providerChanged || replaceKey || apiKey || (!original?.credentialsConfigured && common.enabled) ? { mode: "replace", apiKey } : { mode: "keep" } }
      : { ...common, destination: { provider, endpointBaseUrl: endpoint }, credentials: providerChanged || headersChanged || requireFreshHeaders
        ? { mode: "replace", headers: headers.map(row => ({ name: row.name, ...(row.value ? { value: row.value } : {}) })) } : { mode: "keep" } };
    const parsed = updateAgentObservabilitySchema.safeParse(input);
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.code === "invalid_union" ? { invalidInput: true } : { message: parsed.error.issues[0]?.message }); return; }
    setValidation(null); onSave(parsed.data);
  }
  const validationMessage = validation?.freshHeaders ? t("companySettings.observability.freshHeaders")
    : validation?.invalidInput ? t("companySettings.observability.invalidInput")
    : validation ? validation.message ?? t("companySettings.observability.reviewConfiguration") : null;
  const receipt = props.result?.revision === revision ? props.result : settings?.lastTest;
  return <section aria-labelledby="agent-observability-heading" className="max-w-2xl space-y-4">
    <div className="space-y-1">
      <h2 id="agent-observability-heading" className="text-lg font-medium">{t("companySettings.observability.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("companySettings.observability.description")}</p>
    </div>
    {!canManage ? <p className="text-sm text-muted-foreground">{t("companySettings.observability.permissionRequired")}</p> : <>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-observability-provider">{t("companySettings.observability.destination")}</Label>
          <select id="agent-observability-provider" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={provider}
            onChange={event => { setProvider(event.target.value as "braintrust" | "otlp"); setApiKey(""); setReplaceKey(false); setValidation(null); }}>
            <option value="braintrust">Braintrust</option><option value="otlp">{t("companySettings.observability.customOtlp")}</option>
          </select>
        </div>
        {provider === "braintrust" ? <>
          <div className="space-y-2"><Label htmlFor="agent-observability-project">{t("companySettings.observability.projectId")}</Label>
            <Input id="agent-observability-project" value={projectId} onChange={event => setProjectId(event.target.value)} placeholder={t("companySettings.observability.projectPlaceholder")} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-observability-key">{t("companySettings.observability.apiKey")}</Label>
            {!providerChanged && original?.credentialsConfigured && !replaceKey ? <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t("companySettings.observability.keyConfigured")}</span><Button type="button" variant="outline" size="sm" onClick={() => setReplaceKey(true)}>{t("companySettings.observability.replaceKey")}</Button>
            </div> : <Input id="agent-observability-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="new-password" />}
          </div>
        </> : <>
          <div className="space-y-2"><Label htmlFor="agent-observability-endpoint">{t("companySettings.observability.baseUrl")}</Label>
            <Input id="agent-observability-endpoint" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://collector.example.com" autoComplete="off" />
            <p className="text-xs text-muted-foreground">{t("companySettings.observability.baseUrlHint")}</p>
          </div>
          <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label>{t("companySettings.observability.headers")}</Label>
            <Button type="button" variant="outline" size="sm" disabled={headers.length >= 16} onClick={() => setHeaders(rows => [...rows, { id: nextHeader.current++, originalName: null, name: "", value: "" }])}>{t("companySettings.observability.addHeader")}</Button></div>
            {headers.length === 0 && <p className="text-sm text-muted-foreground">{t("companySettings.observability.noHeaders")}</p>}
            {headers.map(row => <div key={row.id} className="flex flex-wrap items-center gap-2">
              <Input className="min-w-0 flex-1" aria-label={t("companySettings.observability.headerName")} value={row.name} onChange={event => setHeaders(rows => rows.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} autoComplete="off" />
              <Input className="min-w-0 flex-1" aria-label={row.name ? t("companySettings.observability.headerValueAria", { name: row.name }) : t("companySettings.observability.unnamedHeaderValueAria")} type="password" value={row.value} placeholder={row.originalName && !requireFreshHeaders ? t("companySettings.observability.keepValue") : t("companySettings.observability.headerValue")}
                onChange={event => setHeaders(rows => rows.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} autoComplete="new-password" />
              <Button type="button" size="sm" variant="ghost" aria-label={row.name ? t("companySettings.observability.removeHeaderAria", { name: row.name }) : t("companySettings.observability.removeUnnamedHeaderAria")} onClick={() => setHeaders(rows => rows.filter(item => item.id !== row.id))}>{t("companySettings.observability.removeHeader")}</Button>
            </div>)}
          </div>
        </>}
        <p className="text-xs text-muted-foreground">{t("companySettings.observability.credentialsHint")}</p>
        <ToggleField label={t("companySettings.observability.enable")} checked={enabled} onChange={setEnabled} hint={t("companySettings.observability.enableHint")} />
        <details><summary className="cursor-pointer text-sm font-medium">{t("companySettings.observability.contentCapture")}</summary>
          <div className="space-y-3 pt-3">{captureLabels.map(row => <ToggleField key={row.key} label={row.label()} checked={capture[row.key]} onChange={value => setCapture(current => ({ ...current, [row.key]: value }))} />)}
            <p className="text-xs text-muted-foreground">{t("companySettings.observability.captureHint")}</p>
          </div>
        </details>
      </fieldset>
      {(validation || error || hasConflict) && <p role="alert" className="text-sm text-destructive">{validationMessage || error || t("companySettings.observability.conflict")}</p>}
      {hasConflict && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { reset(); onReload?.(); }}>{t("companySettings.observability.reload")}</Button>}
      {!dirty && receipt && <div role="status" className="space-y-1 text-sm">
        <p className="font-medium">{receipt.status === "accepted" ? t("companySettings.observability.testAccepted") : receipt.status === "partial" ? t("companySettings.observability.testPartial") : t("companySettings.observability.testFailed")}</p>
        <p className="text-xs text-muted-foreground">{t("companySettings.observability.testSent", { date: new Date(receipt.finishedAt).toLocaleString(i18n.resolvedLanguage) })}</p>
        {(["logs", "traces"] as const).map(signal => receipt.signals[signal].message && <p key={signal}>{signal === "logs" ? t("companySettings.observability.logs") : t("companySettings.observability.traces")}: {receipt.signals[signal].message}</p>)}
      </div>}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" disabled={busy || !dirty} onClick={reset}>{t("companySettings.observability.cancel")}</Button>
        <Button type="button" disabled={busy || !dirty || hasConflict} onClick={() => save()}>{saving ? t("companySettings.observability.saving") : t("companySettings.observability.save")}</Button>
      </div>
      {dirty && settings && <p className="text-xs text-muted-foreground">{t("companySettings.observability.saveBeforeTest")}</p>}
      {settings && <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy || dirty || hasConflict} onClick={onTest}>{testing ? t("companySettings.observability.testing") : t("companySettings.observability.test")}</Button>
        {settings.enabled && <Button type="button" size="sm" variant="ghost" disabled={busy || dirty || hasConflict} onClick={() => save(false)}>{t("companySettings.observability.disable")}</Button>}
        <Button type="button" size="sm" variant="ghost" disabled={busy || dirty || hasConflict} onClick={onRemove}>{removing ? t("companySettings.observability.removing") : t("companySettings.observability.removeConfiguration")}</Button>
      </div>}
    </>}
  </section>;
}

export function AgentObservabilitySettingsSection({ companyId }: { companyId: string }) {
  return <AgentObservabilitySettingsContainer key={companyId} companyId={companyId} />;
}
function AgentObservabilitySettingsContainer({ companyId }: { companyId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const queryKey = ["agent-observability", companyId];
  const query = useQuery({ queryKey, queryFn: () => agentObservabilityApi.settings(companyId) });
  const [error, setError] = useState<{ message?: string; conflict?: boolean } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const accept = (data: AgentObservabilitySettingsResponse) => { client.setQueryData(queryKey, data); setError(null); setConflict(false); setResetKey(value => value + 1); };
  const reject = (cause: unknown) => {
    const stale = cause instanceof ApiError && cause.status === 409;
    setConflict(stale);
    setError(stale ? { conflict: true } : cause instanceof Error ? { message: cause.message } : {});
  };
  const save = useMutation({ gcTime: 0, mutationFn: (input: UpdateAgentObservabilityRequest) => agentObservabilityApi.update(companyId, input), onSuccess: accept, onError: reject, onSettled: () => queueMicrotask(() => save.reset()) });
  const remove = useMutation({ mutationFn: (revision: string) => agentObservabilityApi.remove(companyId, revision), onSuccess: accept, onError: reject });
  const test = useMutation({ mutationFn: (revision: string) => agentObservabilityApi.test(companyId, revision), onSuccess: receipt => {
    setError(null); client.setQueryData<AgentObservabilitySettingsResponse>(queryKey, current => current?.settings?.revision === receipt.revision
      ? { ...current, settings: { ...current.settings, lastTest: receipt } } : current);
  }, onError: reject });
  useEffect(() => { setError(null); setConflict(false); save.reset(); test.reset(); remove.reset(); }, [companyId]);
  if (query.isPending) return <p className="text-sm text-muted-foreground">{t("companySettings.observability.loading")}</p>;
  if (!query.data) return <div role="alert" className="space-y-2 text-sm"><p>{t("companySettings.observability.loadFailed")}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>{t("companySettings.observability.retry")}</Button></div>;
  const errorMessage = error ? error.message ?? (error.conflict ? t("companySettings.observability.conflict") : t("companySettings.observability.updateFailed")) : null;
  return <AgentObservabilitySettingsView key={companyId} companyId={companyId} settings={query.data.settings} canManage={query.data.canManage}
    saving={save.isPending} removing={remove.isPending} testing={test.isPending} error={errorMessage ?? (query.isError ? t("companySettings.observability.refreshFailed") : null)} conflict={conflict} resetKey={resetKey}
    onSave={input => save.mutate(input)} onTest={() => { if (query.data.settings) test.mutate(query.data.settings.revision); }}
    onRemove={() => { if (query.data.settings) remove.mutate(query.data.settings.revision); }}
    onReload={() => { setConflict(false); setError(null); void query.refetch(); }} />;
}
