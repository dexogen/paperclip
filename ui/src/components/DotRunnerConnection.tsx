import { useTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
import { buildDotSetupPrompt } from "../lib/dot-setup-prompt";
import { AgentSetupPrompt } from "./AgentSetupPrompt";

interface Connection {
  enabled: boolean;
  resourceUrl: string | null;
  binding: { id: string; status: string; connected: boolean; subscriptionVerified: boolean; hasPendingChallenge: boolean;
    assignment?: { status: string; attentionRequired: boolean } | null } | null;
}

/** Pairing codes stay in component memory and expire; never save them in config. */
export function DotRunnerConnection({ companyId, agentId, bindingId, onBinding }: {
  companyId?: string; agentId?: string; bindingId?: string; onBinding: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [pairing, setPairing] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const path = `/companies/${companyId}/agents/${agentId}/dot-binding`;
  const key = ["dot-binding", companyId, agentId];
  const state = useQuery({ queryKey: key, enabled: !!companyId && !!agentId,
    queryFn: () => api.get<Connection>(path),
    refetchInterval: query => query.state.data?.binding?.status === "pairing" ||
      (query.state.data?.binding?.connected && !query.state.data.binding.subscriptionVerified) ||
      query.state.data?.binding?.hasPendingChallenge || query.state.data?.binding?.assignment ? 5000 : false });
  const pair = useMutation({ mutationFn: () => api.post<{ bindingId: string; pairingCode: string; expiresAt: string }>(path, {}),
    onSuccess: result => { setPairing(result); onBinding(result.bindingId); void client.invalidateQueries({ queryKey: key }); } });
  const test = useMutation({ mutationFn: () => api.post(path + "/event-test", {}),
    onSuccess: () => { void client.invalidateQueries({ queryKey: key }); } });
  const revoke = useMutation({ mutationFn: () => api.delete(path),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<Connection>(key, previous => previous ? { ...previous, binding: null } : previous);
      setPairing(null); onBinding("");
      await client.invalidateQueries({ queryKey: key });
    } });
  useEffect(() => {
    if (!pairing) return;
    const timer = window.setTimeout(() => setPairing(null), Math.max(0, Date.parse(pairing.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pairing]);
  const existingBindingId = state.data?.binding?.id;
  useEffect(() => {
    if (existingBindingId && existingBindingId !== bindingId && !revoke.isPending) onBinding(existingBindingId);
  }, [existingBindingId, bindingId, onBinding, revoke.isPending]);
  if (!agentId) return <p className="text-sm text-muted-foreground">{t("externalAgentUi.dot.saveFirst")}</p>;
  const error = state.error ?? pair.error ?? test.error ?? revoke.error;
  const b = state.data?.binding;
  const statusLabel = b?.status === "pairing" ? t("externalAgentUi.dot.status.pairing") : b?.status === "connected" ? t("externalAgentUi.dot.status.connected") : b?.status === "ready" ? t("externalAgentUi.dot.status.ready") : b?.status === "revoked" ? t("externalAgentUi.dot.status.revoked") : b?.status;
  const setupPrompt = pairing && state.data?.resourceUrl && companyId && agentId
    ? buildDotSetupPrompt({ companyId, agentId, resourceUrl: state.data.resourceUrl, ...pairing })
    : "";
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{t("externalAgentUi.dot.description")}</p>
    {state.data && !state.data.enabled && <p className="text-sm text-muted-foreground">{t("externalAgentUi.dot.enable")}</p>}
    {state.data?.resourceUrl && <p className="text-sm break-all">{t("externalAgentUi.dot.url")} <code>{state.data.resourceUrl}</code></p>}
    {b && <p className="text-sm">{b.subscriptionVerified ? t("externalAgentUi.dot.subscriptionVerified", { status: statusLabel }) : t("externalAgentUi.dot.subscriptionRequired", { status: statusLabel })}</p>}
    {b?.assignment && <p className="text-sm">{b.assignment.status === "offered" ? t("externalAgentUi.dot.assignmentOffered") : t("externalAgentUi.dot.assignmentAccepted")}</p>}
    {b?.assignment?.attentionRequired && <p className="text-sm text-destructive" role="alert">{t("externalAgentUi.dot.attention")}</p>}
    {pairing && setupPrompt && b?.status === "pairing" && <div className="space-y-2">
      <AgentSetupPrompt
        prompt={setupPrompt}
        label={t("externalAgentUi.dot.setup")}
        agent={{ name: "Dot", src: "/brands/adapters/openai-dot.svg" }}
        title={t("externalAgentUi.dot.title")}
        description={t("externalAgentUi.dot.promptDescription")}
        side="bottom"
      />
      <p className="text-xs text-muted-foreground">{t("externalAgentUi.dot.expires", { time: new Date(pairing.expiresAt).toLocaleTimeString(i18n.resolvedLanguage) })}</p>
    </div>}
    {!pairing && b?.status === "pairing" && <p className="text-sm text-muted-foreground">{t("externalAgentUi.dot.replacePrompt")}</p>}
    <div className="flex flex-wrap items-center gap-2">
      {!b && <Button type="button" variant="outline" disabled={!state.data?.enabled || !state.data?.resourceUrl || pair.isPending} onClick={() => pair.mutate()}>{t("externalAgentUi.dot.pair")}</Button>}
      {b?.subscriptionVerified && <Button type="button" variant="outline" disabled={test.isPending || b.hasPendingChallenge} onClick={() => test.mutate()}>{t("externalAgentUi.dot.test")}</Button>}
      <Button type="button" variant="outline" onClick={() => { void state.refetch(); }}>{t("externalAgentUi.common.refreshConnection")}</Button>
      {b && <Button type="button" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate()}>{t("externalAgentUi.dot.revoke")}</Button>}
    </div>
    {b?.hasPendingChallenge && <p className="text-sm text-muted-foreground">{t("externalAgentUi.dot.waiting")}</p>}
    {error && <p className="text-sm text-destructive" role="alert">{error instanceof Error ? error.message : t("externalAgentUi.dot.failed")}</p>}
  </div>;
}
