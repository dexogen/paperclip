import { Trans, useTranslation } from "@/i18n";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { museDetectorCleanupAttestationSchema } from "@paperclipai/shared";
import type { MuseConnection, MusePairing, MuseAttestStopInput, MuseDetectorCleanupAttestationInput } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { MuseConnectionChangedError, useMuseConnection, useMuseConnectionState } from "@/hooks/useMuseConnection";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { AgentSetupPrompt } from "./AgentSetupPrompt";
import { MuseConnectionChecks } from "./new-agent/ExternalAgentInviteContent";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export interface MuseConnectionDetailsProps {
  connection: MuseConnection;
  pairing?: MusePairing | null;
  busy?: boolean;
  error?: string;
  offline?: boolean;
  onTest: () => void;
  onRepair: () => void;
  onPause: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onAttest: (input: MuseAttestStopInput) => void;
  onAttestDetectorCleanup?: (input: MuseDetectorCleanupAttestationInput) => void;
}

/** The settings view uses the same connection evidence as the invitation. */
export function MuseConnectionDetails({ connection, pairing, busy, error, offline = false, onTest, onRepair, onPause, onDisconnect, onRefresh, onAttest, onAttestDetectorCleanup }: MuseConnectionDetailsProps) {
  const { t } = useTranslation();
  const b = connection.binding;
  const [attestation, setAttestation] = useState<MuseAttestStopInput | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [detectorSnapshot, setDetectorSnapshot] = useState<Omit<MuseDetectorCleanupAttestationInput, "observation" | "detectorRemoved"> | null>(null);
  const [detectorHookId, setDetectorHookId] = useState("");
  const [observationDigest, setObservationDigest] = useState("");
  const [detectorObservedAt, setDetectorObservedAt] = useState("");
  const detectorObservedAtValid = museDetectorCleanupAttestationSchema.shape.observation.shape.observedAt.safeParse(detectorObservedAt).success;
  const [detectorConfirmed, setDetectorConfirmed] = useState(false);
  const detectorIdentity = JSON.stringify([b?.id, b?.generation, b?.revision, b?.qualification?.id, b?.cleanup.hookScript, b?.cleanup.attestationEligible, offline]);
  useEffect(() => { setDetectorSnapshot(null); setObservationDigest(""); setDetectorObservedAt(""); setDetectorHookId(""); setDetectorConfirmed(false); }, [detectorIdentity]);
  const boundaryIdentity = JSON.stringify(b?.stop.boundary);
  const stopBindingRevision = b?.stop.bindingRevision;
  useEffect(() => { setAttestation(null); setConfirmed(false); }, [boundaryIdentity, stopBindingRevision]);
  const live = !!b && b.status !== "revoked";
  const state = useMuseConnectionState(connection, { offline });
  const testing = state.testing;
  const configure = !offline && connection.enabled && connection.canConfigureConnection && !!connection.publicOrigin;
  const credentialLabel = b?.credentialState === "pending" ? t("externalAgentUi.muse.credential.pending") : b?.credentialState === "active" ? t("externalAgentUi.muse.credential.active") : b?.credentialState === "expired" ? t("externalAgentUi.muse.credential.expired") : b?.credentialState === "revoked" ? t("externalAgentUi.muse.credential.revoked") : b?.credentialState;
  const timestamp = (value: string | null) => value ? formatDateTime(value, { includeSeconds: true }) : t("externalAgentUi.muse.notObserved");
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{t("externalAgentUi.muse.description")}</p>
    {!connection.enabled && <p className="text-sm text-muted-foreground">{t("externalAgentUi.muse.disabled")}</p>}
    {!connection.publicOrigin && <p className="text-sm text-muted-foreground">{t("externalAgentUi.muse.publicOrigin")}</p>}
    {b && <>
      <MuseConnectionChecks state={state} />
      <dl className="space-y-2 text-xs">
        {[
          ["lastReceiver", t("externalAgentUi.muse.rows.lastReceiver"), timestamp(b.lastReceiverContactAt)],
          ["lastWorker", t("externalAgentUi.muse.rows.lastWorker"), timestamp(b.lastWorkerActivityAt)],
          ["lastReply", t("externalAgentUi.muse.rows.lastReply"), timestamp(b.lastVerifiedReplyAt)],
          ["credential", t("externalAgentUi.muse.rows.credential"), credentialLabel],
          ["refreshExpires", t("externalAgentUi.muse.rows.refreshExpires"), timestamp(b.refreshExpiresAt)],
          ["clientVersion", t("externalAgentUi.muse.rows.clientVersion"), b.clientVersion ?? t("externalAgentUi.muse.notReported")],
          ["liveAssignments", t("externalAgentUi.muse.rows.liveAssignments"), formatNumber(b.liveAssignments)],
          ["uncertainOperations", t("externalAgentUi.muse.rows.uncertainOperations"), formatNumber(b.uncertainOperations)],
          ["pendingInputs", t("externalAgentUi.muse.rows.pendingInputs"), formatNumber(b.pendingInputs)],
          ["usage", t("externalAgentUi.muse.rows.usage"), t("externalAgentUi.muse.unavailable")],
        ].map(([id, label, value]) => <div key={id} className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">{t("externalAgentUi.muse.contactLag", { count: Math.ceil(b.contactPersistenceLagMs / 1000) })}</p>
      {b.status === "revoked" && <p role="status" className="text-sm text-muted-foreground">{t("externalAgentUi.muse.disconnected")}</p>}
      {(b.cleanup.pending || b.status === "revoked") && <div className="space-y-2 text-sm text-muted-foreground">
        {"detectorRemovalRequested" in b.cleanup && b.cleanup.detectorRemovalRequested === true && !b.cleanup.detectorRemoved && <p>{t("externalAgentUi.muse.removalRequested")}</p>}
        <p>{t("externalAgentUi.muse.cleanupSummary", { detector: b.cleanup.detectorEvidence?.source === "operator_runtime_attestation" ? t("externalAgentUi.muse.detectorOperator") : b.cleanup.detectorRemoved ? t("externalAgentUi.muse.detectorAcknowledged") : t("externalAgentUi.muse.notConfirmed"), worker: b.cleanup.workerQuiescenceReported ? t("externalAgentUi.muse.workerReported") : t("externalAgentUi.muse.notConfirmed") })}</p>
        {b.cleanup.authenticatedAfterRevocation === false && <p>{t("externalAgentUi.muse.afterDisconnect")}</p>}
        {b.cleanup.expiresAt && <p className="text-xs">{t("externalAgentUi.muse.cleanupExpires", { time: formatDateTime(b.cleanup.expiresAt) })}</p>}
        {b.cleanup.detectorEvidence && <p>{b.cleanup.detectorEvidence.source === "operator_runtime_attestation" ? t("externalAgentUi.muse.evidenceOperator", { time: timestamp(b.cleanup.detectorEvidence.recordedAt) }) : t("externalAgentUi.muse.evidenceWorker", { time: timestamp(b.cleanup.detectorEvidence.recordedAt) })}</p>}
        {b.cleanup.attestationEligible && onAttestDetectorCleanup && !detectorSnapshot && <Button type="button" variant="outline" disabled={busy || offline} onClick={() => {
          if (!b.cleanup.hookScript) return;
          setDetectorSnapshot({ bindingId: b.id, generation: b.generation, expectedRevision: b.revision, qualificationId: b.qualification?.id ?? null, hookScript: b.cleanup.hookScript });
        }}>{t("externalAgentUi.muse.recordDetector")}</Button>}
        <p>{t("externalAgentUi.muse.separateCleanup")}</p>
      </div>}
      {b.stop.status !== "none" && <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">{b.stop.status === "operator_attested" ? t("externalAgentUi.muse.operatorStopped")
          : b.stop.status === "worker_reported" ? t("externalAgentUi.muse.workerQuiescent")
          : t("externalAgentUi.muse.stopUnknown")}</p>
        {b.stop.nativeEffectsUnknown && <p role="status" className="text-muted-foreground">{t("externalAgentUi.muse.unknownEffects")}</p>}
        {b.stop.boundary && stopBindingRevision == null && b.stop.status !== "operator_attested" && <p role="status" className="text-muted-foreground">{t("externalAgentUi.muse.missingStopRevision")}</p>}
        {b.stop.boundary && b.stop.status !== "operator_attested" && !attestation && <Button type="button" variant="outline" disabled={busy || stopBindingRevision == null} onClick={() => {
          if (!b.stop.boundary || stopBindingRevision == null) return;
          setAttestation({ boundary: { ...b.stop.boundary }, expectedRevision: stopBindingRevision, workerStopped: true }); setConfirmed(false);
        }}>{t("externalAgentUi.muse.attestWorker")}</Button>}
      </div>}
    </>}
    {detectorSnapshot && <section aria-label={t("externalAgentUi.muse.detectorSection")} className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">{t("externalAgentUi.muse.recordExact")}</p>
      <p className="break-all font-mono text-xs">{detectorSnapshot.hookScript}</p>
      <p className="text-sm text-muted-foreground"><Trans t={t} i18nKey="externalAgentUi.muse.detectorHelp" values={{ command: "hooks.list({ include_disabled: true })" }} components={{ command: <code /> }} tOptions={{ interpolation: { escapeValue: true } }} shouldUnescape /></p>
      <label className="block space-y-2 text-sm">{t("externalAgentUi.muse.hookId")}<Input aria-label={t("externalAgentUi.muse.hookIdAria")} value={detectorHookId} onChange={event => { setDetectorHookId(event.target.value); setDetectorConfirmed(false); }} autoComplete="off" /></label>
      <label className="block space-y-2 text-sm">{t("externalAgentUi.muse.digest")}<Input aria-label={t("externalAgentUi.muse.digestAria")} value={observationDigest} onChange={event => { setObservationDigest(event.target.value); setDetectorConfirmed(false); }} autoComplete="off" /></label>
      <p className="text-xs text-muted-foreground">{t("externalAgentUi.muse.digestHelp")}</p>
      <label className="block space-y-2 text-sm">{t("externalAgentUi.muse.observedAt")}<Input aria-label={t("externalAgentUi.muse.observedAtAria")} value={detectorObservedAt} onChange={event => { setDetectorObservedAt(event.target.value); setDetectorConfirmed(false); }} placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" autoComplete="off" /></label>
      <p className="text-xs text-muted-foreground">{t("externalAgentUi.muse.observedAtHelp")}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={detectorConfirmed} onChange={event => setDetectorConfirmed(event.target.checked)} className="mt-1 accent-primary" /><span>{t("externalAgentUi.muse.detectorConsent")}</span></label>
      <div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setDetectorSnapshot(null)}>{t("externalAgentUi.common.cancel")}</Button><Button type="button" disabled={!detectorConfirmed || !detectorObservedAtValid || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(detectorHookId) || !/^[a-f0-9]{64}$/.test(observationDigest) || busy || offline} onClick={() => onAttestDetectorCleanup?.({ ...detectorSnapshot, detectorRemoved: true, observation: { method: "hooks.list", includeDisabled: true, hookId: detectorHookId, outcome: "exact_hook_absent", observedAt: detectorObservedAt, sha256: observationDigest } })}>{t("externalAgentUi.muse.confirmDetector")}</Button></div>
    </section>}
    {attestation && <section aria-label={t("externalAgentUi.muse.workerSection")} className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">{t("externalAgentUi.muse.confirmExactWorker")}</p>
      <dl className="space-y-2 text-xs">
        {Object.entries(attestation.boundary).map(([key, value]) => <div key={key} className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted-foreground">{key}</dt><dd className="break-all font-mono">{value === null ? t("externalAgentUi.muse.none") : String(value)}</dd></div>)}
      </dl>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 accent-primary" /><span>{t("externalAgentUi.muse.workerConsent")}</span></label>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => setAttestation(null)}>{t("externalAgentUi.common.cancel")}</Button>
        <Button type="button" disabled={!confirmed || busy} onClick={() => onAttest(attestation)}>{t("externalAgentUi.muse.confirmWorker")}</Button>
      </div>
    </section>}
    {pairing && !b?.paired && <div className="space-y-2">
      <AgentSetupPrompt key={pairing.bindingId + pairing.revision} prompt={pairing.setupInstruction} label={t("externalAgentUi.common.copySetup")} title={t("externalAgentUi.common.connectMuse")} agent={{ name: "Muse", icon: <Bot className="size-5" /> }} description={t("externalAgentUi.muse.promptDescription")} />
      <p className="text-xs text-muted-foreground">{t("externalAgentUi.muse.promptExpires", { time: formatDateTime(pairing.expiresAt) })}</p>
    </div>}
    <div className="flex flex-wrap items-center gap-2">
      {live && <Button type="button" variant="outline" disabled={!configure || b.credentialState !== "active" || !b.paired || busy || testing} onClick={onTest}>{testing ? t("externalAgentUi.muse.testing") : t("externalAgentUi.common.testBackground")}</Button>}
      <Button type="button" variant="outline" disabled={!configure || busy} onClick={onRepair}>{b?.credentialState === "expired" ? t("externalAgentUi.common.reconnectMuse") : live ? t("externalAgentUi.muse.repair") : t("externalAgentUi.muse.connect")}</Button>
      {connection.agentStatus !== "paused" && connection.agentStatus !== "terminated" && <Button type="button" variant="outline" disabled={busy} onClick={onPause}>{t("externalAgentUi.muse.pause")}</Button>}
      {live && <Button type="button" variant="outline" disabled={busy} onClick={onDisconnect}>{t("externalAgentUi.muse.disconnect")}</Button>}
      <Button type="button" variant="ghost" disabled={busy} onClick={onRefresh}>{t("externalAgentUi.common.refresh")}</Button>
      <Button type="button" asChild variant="ghost"><a href="https://muse.ai" target="_blank" rel="noopener noreferrer">{t("externalAgentUi.common.openMuse")}</a></Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

export function MuseRunnerConnection({ companyId, agentId }: { companyId?: string; agentId?: string }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const muse = useMuseConnection(companyId, agentId);
  const pause = useMutation({ mutationFn: () => agentsApi.pause(agentId!, companyId), onSuccess: () => {
    void muse.refresh(); void cache.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
    if (companyId) void cache.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
  } });
  if (!agentId) return <p className="text-sm text-muted-foreground">{t("externalAgentUi.muse.saveFirst")}</p>;
  const error = muse.state.error ?? muse.pair.error ?? muse.verify.error ?? muse.revoke.error ?? muse.attest.error ?? muse.attestDetector.error ?? pause.error;
  const errorMessage = error instanceof MuseConnectionChangedError ? t("externalAgentUi.muse.connectionChanged") : error?.message;
  if (muse.identity.failed) return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{t("externalAgentUi.muse.identityFailed")}</p><Button type="button" variant="outline" onClick={() => { void cache.invalidateQueries({ queryKey: queryKeys.auth.session }); }}>{t("externalAgentUi.common.refresh")}</Button></div>;
  if (!muse.state.data) return <div className="space-y-3"><p role="status" className="text-sm text-muted-foreground">{muse.state.error ? t("externalAgentUi.muse.loadFailed") : t("externalAgentUi.muse.loading")}</p>{error && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}<Button type="button" variant="outline" onClick={() => { void muse.state.refetch(); }}>{t("externalAgentUi.common.refresh")}</Button></div>;
  return <MuseConnectionDetails key={muse.identity.userId} connection={muse.state.data} pairing={muse.pairing} offline={muse.state.isError}
    busy={muse.pair.isPending || muse.verify.isPending || muse.revoke.isPending || muse.attest.isPending || muse.attestDetector.isPending || pause.isPending}
    error={errorMessage} onTest={() => { if (muse.binding) muse.verify.mutate(muse.binding); }} onRepair={muse.repair}
    onPause={() => pause.mutate()} onDisconnect={() => { if (muse.binding) muse.revoke.mutate(muse.binding); }}
    onRefresh={() => { void muse.state.refetch(); }} onAttest={input => muse.attest.mutate(input)} onAttestDetectorCleanup={input => muse.attestDetector.mutate(input)} />;
}
