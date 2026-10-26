import { useTranslation } from "@/i18n";
import { agentConfigRoleLabel } from "../agent-config-primitives";
import { useId } from "react";
import { AGENT_ROLES } from "@paperclipai/shared";
import type { MuseInvitationDraft } from "@/lib/muse-invitation-draft";
import { Input } from "../ui/input";
import { Link } from "@/lib/router";
import { ArrowLeft, Bot, Check, Circle, CircleAlert, Loader2 } from "lucide-react";
import { AdapterMark } from "../AdapterMark";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Button } from "../ui/button";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";

export type ExternalAgentPreset = "dot" | "grok_bot" | "muse" | "hermes" | "other";
export type DotConnectionState = {
  phase: "waiting" | "connected" | "subscribed" | "testing" | "finishing" | "ready";
  problem?: "event_timeout" | "prompt_unavailable" | "offline" | "agent_unavailable";
};

const presets = [
  { id: "dot", adapter: "openai_dot" },
  { id: "grok_bot", adapter: "grok_bot" },
  { id: "muse", adapter: "muse" },
  { id: "hermes", adapter: "hermes_gateway" },
  { id: "other", adapter: "http" },
] as const;

export function ExternalAgentPresetPicker({ onSelect, dotDisabledReason, grokDisabledReason, museEnabled = false }: { onSelect: (preset: ExternalAgentPreset) => void; dotDisabledReason?: string; grokDisabledReason?: string; museEnabled?: boolean }) {
  const { t } = useTranslation();
  const labels = {
    dot: { name: "Dot", description: t("externalAgentUi.preset.dot") },
    grok_bot: { name: "Grok Bot", description: t("externalAgentUi.preset.grok") },
    muse: { name: t("externalAgentUi.preset.museName"), description: t("externalAgentUi.preset.muse") },
    hermes: { name: "Hermes", description: t("externalAgentUi.preset.hermes") },
    other: { name: t("externalAgentUi.preset.otherName"), description: t("externalAgentUi.preset.other") },
  };
  return <div className={cn("grid grid-cols-2 gap-3", !museEnabled && "sm:grid-cols-4")}>
    {presets.filter(preset => preset.id !== "muse" || museEnabled).map(preset => <button
      key={preset.id}
      type="button"
      onClick={() => onSelect(preset.id)}
      disabled={preset.id === "dot" && !!dotDisabledReason || preset.id === "grok_bot" && !!grokDisabledReason}
      title={preset.id === "dot" ? dotDisabledReason : preset.id === "grok_bot" ? grokDisabledReason : undefined}
      className="flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-3 py-4 text-center transition-colors disabled:opacity-50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <AdapterMark type={preset.adapter} className="size-8" />
      <span className="text-sm font-medium">{labels[preset.id].name}</span>
      <span className="sr-only">{labels[preset.id].description}</span>
    </button>)}
  </div>;
}

/** Controlled by server evidence in the invite controller, never by copying a prompt. */
export function DotConnectionChecks({ state }: { state: DotConnectionState }) {
  const { t } = useTranslation();
  const checks = [
    { id: "connected", title: t("externalAgentUi.dotChecks.connected"), description: t("externalAgentUi.dotChecks.connectedDescription") },
    { id: "updates", title: t("externalAgentUi.dotChecks.updates"), description: t("externalAgentUi.dotChecks.updatesDescription") },
    { id: "confirmed", title: t("externalAgentUi.dotChecks.confirmed"), description: t("externalAgentUi.dotChecks.confirmedDescription") },
  ];
  const completed = { waiting: 0, connected: 1, subscribed: 2, testing: 2, finishing: 3, ready: 3 }[state.phase];
  const message = state.problem === "agent_unavailable" ? t("externalAgentUi.dotChecks.unavailable")
    : state.problem === "offline" ? t("externalAgentUi.dotChecks.offline")
    : state.problem === "prompt_unavailable" ? t("externalAgentUi.dotChecks.promptUnavailable")
    : state.problem === "event_timeout" ? t("externalAgentUi.dotChecks.timeout")
    : state.phase === "finishing" ? t("externalAgentUi.dotChecks.finishing")
    : state.phase === "ready" ? t("externalAgentUi.dotChecks.ready")
    : state.phase === "waiting" ? t("externalAgentUi.dotChecks.waiting")
    : state.phase === "connected" ? t("externalAgentUi.dotChecks.connectedWaiting")
    : t("externalAgentUi.dotChecks.confirming");
  return <section aria-label={t("externalAgentUi.dotChecks.label")} className="space-y-4">
    <ol className="space-y-4">
      {checks.map((check, index) => {
        const done = index < completed;
        const failed = index === completed && state.problem === "event_timeout";
        const active = index === completed && !state.problem;
        const Icon = done ? Check : failed ? CircleAlert : active ? Loader2 : Circle;
        return <li key={check.id} className="flex items-start gap-3" aria-current={active ? "step" : undefined}>
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-accent text-foreground" : failed ? "text-destructive" : "text-muted-foreground")}>
            <Icon className={cn("size-4", active && "animate-spin motion-reduce:animate-none")} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm", done || active || failed ? "font-medium" : "text-muted-foreground")}>
              <span aria-hidden="true">{check.title}</span><span className="sr-only">{done ? t("externalAgentUi.checks.complete", { title: check.title }) : failed ? t("externalAgentUi.checks.attention", { title: check.title }) : active ? t("externalAgentUi.checks.progress", { title: check.title }) : t("externalAgentUi.checks.waiting", { title: check.title })}</span>
            </p>
            {done && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.description}</p>}
          </div>
        </li>;
      })}
    </ol>
    <p role={state.problem && state.problem !== "prompt_unavailable" ? "alert" : "status"} aria-live="polite" className={cn("text-sm leading-relaxed", state.problem && state.problem !== "prompt_unavailable" ? "text-destructive" : "text-muted-foreground")}>{message}</p>
  </section>;
}

export type MuseConnectionState = {
  paired: boolean;
  receiverDetected: boolean;
  backgroundReplyVerified: boolean;
  ready: boolean;
  finishing?: boolean;
  testing?: boolean;
  problem?: "no_recent_response" | "prompt_unavailable" | "offline" | "agent_unavailable" | "disconnected" | "disabled" | "connection_expired";
};

/** Receiver contact is separate from an authenticated, independent worker reply. */
export function MuseConnectionChecks({ state }: { state: MuseConnectionState }) {
  const { t } = useTranslation();
  const milestones = [
    { id: "paired", title: t("externalAgentUi.museChecks.paired"), done: state.paired, description: t("externalAgentUi.museChecks.pairedDescription") },
    { id: "receiver", title: t("externalAgentUi.museChecks.receiver"), done: state.receiverDetected, description: t("externalAgentUi.museChecks.receiverDescription") },
    { id: "background", title: t("externalAgentUi.museChecks.background"), done: state.backgroundReplyVerified, description: t("externalAgentUi.museChecks.backgroundDescription") },
  ];
  const checksPassed = milestones.every(item => item.done);
  const message = state.problem === "offline" ? t("externalAgentUi.museChecks.offline")
    : state.problem === "disconnected" ? t("externalAgentUi.museChecks.disconnected")
    : state.problem === "connection_expired" ? t("externalAgentUi.museChecks.expired")
    : state.problem === "disabled" ? t("externalAgentUi.museChecks.disabled")
    : state.problem === "prompt_unavailable" ? t("externalAgentUi.museChecks.promptUnavailable")
    : state.problem === "agent_unavailable" ? t("externalAgentUi.museChecks.unavailable")
    : state.problem === "no_recent_response" ? t("externalAgentUi.museChecks.noResponse")
    : state.testing ? t("externalAgentUi.museChecks.testing")
    : checksPassed && state.ready ? t("externalAgentUi.museChecks.ready")
    : checksPassed ? t("externalAgentUi.museChecks.finishing")
    : !state.paired ? t("externalAgentUi.museChecks.waitingPair")
    : !state.receiverDetected ? t("externalAgentUi.museChecks.waitingReceiver")
    : t("externalAgentUi.museChecks.waitingReply");
  return <section aria-label={t("externalAgentUi.museChecks.label")} className="space-y-4">
    <ol className="space-y-4">
      {milestones.map(item => <li key={item.id} className="flex items-start gap-3">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", item.done ? "bg-accent text-foreground" : "text-muted-foreground")}>
          {item.done ? <Check className="size-4" /> : <Circle className="size-4" />}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className={cn("text-sm", item.done ? "font-medium" : "text-muted-foreground")}>
            <span aria-hidden="true">{item.title}</span><span className="sr-only">{item.done ? t("externalAgentUi.checks.complete", { title: item.title }) : t("externalAgentUi.checks.waiting", { title: item.title })}</span>
          </p>
          {item.done && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
        </div>
      </li>)}
    </ol>
    <p role="status" aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">{message}</p>
  </section>;
}

/** Shared presentation for the invitation flow. The caller owns invitations and watching. */
export function ExternalAgentInviteContent({
  preset, prompt, companyName, companyNameIsFallback = false, connection, onSelect, onBack, onClose, onCopied, onRetry, onNewPrompt,
  dotDisabledReason, grokDisabledReason, grokDisabledReasonIsDuplicate, busy = false, error, approvalHref, museEnabled = false, museConnection, museDraft, onMuseDraftChange, onMuseContinue,
}: {
  museEnabled?: boolean;
  museConnection?: MuseConnectionState;
  museDraft?: MuseInvitationDraft;
  onMuseDraftChange?: (draft: MuseInvitationDraft) => void;
  onMuseContinue?: () => void;
  dotDisabledReason?: string;
  grokDisabledReason?: string;
  grokDisabledReasonIsDuplicate?: boolean;
  companyNameIsFallback?: boolean;
  busy?: boolean;
  error?: string;
  approvalHref?: string;
  preset: ExternalAgentPreset | null;
  prompt: string;
  companyName: string;
  connection: DotConnectionState;
  onSelect: (preset: ExternalAgentPreset) => void;
  onBack: () => void;
  onClose: () => void;
  onCopied: () => void;
  onRetry: () => void;
  onNewPrompt: () => void;
}) {
  const { t } = useTranslation();
  const detailsId = useId();
  const muse = preset === "muse";
  const museDetails = muse && !!museDraft;
  const museAwaitingInvitation = muse && !museDetails && !museConnection && !approvalHref;
  const museReady = muse && !!museConnection?.ready && museConnection.paired && museConnection.receiverDetected && museConnection.backgroundReplyVerified && !museConnection.problem && !museConnection.testing;
  const provider = presets.find(item => item.id === preset);
  const dot = preset === "dot";
  const ready = museReady || (dot && connection.phase === "ready" && !connection.problem);
  const connecting = dot && connection.phase !== "waiting";
  const progressLabel = connection.problem === "agent_unavailable" ? t("externalAgentUi.content.agentUnavailable")
    : connection.problem === "offline" ? t("externalAgentUi.content.updatesPaused")
    : connection.problem === "event_timeout" ? t("externalAgentUi.content.needsAttention")
    : connection.phase === "finishing" ? t("externalAgentUi.content.finishing")
    : connection.phase === "connected" ? t("externalAgentUi.content.connecting") : t("externalAgentUi.content.confirming");
  return <>
    <div className="min-h-0 space-y-6 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
      <div className="space-y-3 pr-5">
        {muse && <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-4" />{t("externalAgentUi.common.back")}</Button>}
        {provider && <AdapterMark type={provider.adapter} className="size-10" />}
        <div className="space-y-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {!provider ? t("externalAgentUi.content.title") : muse ? ready ? t("externalAgentUi.content.museConnected") : museDetails || museAwaitingInvitation ? t("externalAgentUi.content.inviteMuse") : t("externalAgentUi.common.connectMuse") : dot ? ready ? t("externalAgentUi.content.dotConnected") : t("externalAgentUi.dot.title") : preset === "hermes" ? t("externalAgentUi.content.inviteHermes") : t("externalAgentUi.content.inviteAgent")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {!provider ? (companyNameIsFallback ? t("externalAgentUi.content.bringFallback") : t("externalAgentUi.content.bring", { companyName }))
              : muse ? museDetails ? (companyNameIsFallback ? t("externalAgentUi.content.nameRoleFallback") : t("externalAgentUi.content.nameRole", { companyName }))
              : museAwaitingInvitation ? t("externalAgentUi.content.musePrerequisites")
              : ready ? (companyNameIsFallback ? t("externalAgentUi.content.museReadyFallback") : t("externalAgentUi.content.museReady", { companyName }))
              : !prompt && !museConnection?.paired ? t("externalAgentUi.content.checkingMuse")
              : t("externalAgentUi.content.museInstructions")
              : ready ? (companyNameIsFallback ? t("externalAgentUi.content.dotReadyFallback") : t("externalAgentUi.content.dotReady", { companyName }))
              : connection.problem === "agent_unavailable" ? t("externalAgentUi.content.dotUnavailable")
              : connection.phase === "finishing" ? t("externalAgentUi.content.dotFinishing")
              : connecting ? t("externalAgentUi.content.dotConnecting")
              : dot ? t("externalAgentUi.content.dotInstructions")
              : preset === "hermes" ? t("externalAgentUi.content.hermesInstructions") : t("externalAgentUi.content.agentInstructions")}
          </DialogDescription>
        </div>
      </div>
      {error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p>{!museAwaitingInvitation && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentUi.content.tryAgain")}</Button>}</div>}
      {!provider ? <><ExternalAgentPresetPicker onSelect={onSelect} dotDisabledReason={dotDisabledReason} grokDisabledReason={grokDisabledReason} museEnabled={museEnabled} />
        {dotDisabledReason && <p className="text-sm text-muted-foreground">{dotDisabledReason}</p>}{grokDisabledReason && !(grokDisabledReasonIsDuplicate ?? grokDisabledReason === dotDisabledReason) && <p className="text-sm text-muted-foreground">{grokDisabledReason}</p>}</>
        : approvalHref ? <p className="text-sm text-muted-foreground">{t("externalAgentUi.content.approval", { provider: muse ? "Muse" : "Dot" })}</p>
        : museAwaitingInvitation ? busy ? <p role="status" className="text-sm text-muted-foreground">{t("externalAgentUi.content.loadingMuseInvitation")}</p> : null
        : muse && busy && !museDetails && !prompt && !museConnection?.paired ? <p role="status" className="text-sm text-muted-foreground">{t("externalAgentUi.content.loadingMuseSetup")}</p>
        : museDetails ? <form id={detailsId} className="space-y-4" onSubmit={event => { event.preventDefault(); if (museDraft.name.trim() && !busy) onMuseContinue?.(); }}>
          <div className="space-y-2">
            <label htmlFor={`${detailsId}-name`} className="text-sm font-medium">{t("externalAgentUi.content.agentName")}</label>
            <Input id={`${detailsId}-name`} disabled={busy} autoFocus maxLength={100} value={museDraft.name} placeholder="Muse" onChange={event => onMuseDraftChange?.({ ...museDraft, name: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${detailsId}-role`} className="text-sm font-medium">{t("externalAgentUi.content.role")}</label>
            <select id={`${detailsId}-role`} disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={museDraft.role} onChange={event => {
              const role = AGENT_ROLES.find(value => value === event.target.value);
              if (role) onMuseDraftChange?.({ ...museDraft, role });
            }}>{AGENT_ROLES.map(role => <option key={role} value={role}>{agentConfigRoleLabel(role, t)}</option>)}</select>
          </div>
          <p className="text-xs text-muted-foreground">{t("externalAgentUi.content.museUsage")}</p>
        </form>
        : muse && museConnection ? <>
          <MuseConnectionChecks state={museConnection} />
          {museConnection.problem === "no_recent_response" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentUi.common.testBackground")}</Button>}
          {museConnection.problem === "offline" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentUi.common.refreshConnection")}</Button>}
          {!museConnection.paired && <a href="https://muse.ai" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-foreground underline underline-offset-4">{t("externalAgentUi.common.openMuse")}</a>}
          <p className="text-xs text-muted-foreground">{t("externalAgentUi.content.museLag")}</p>
        </>
        : busy && !prompt && connection.phase === "waiting" ? <p role="status" className="text-sm text-muted-foreground">{t("externalAgentUi.content.preparingInvitation")}</p> : dot ? <>
        <div className="border-t pt-6"><DotConnectionChecks state={connection} />
          {connection.phase === "waiting" && <p className="mt-4 text-xs text-muted-foreground">{t("externalAgentUi.content.dotUsage")}</p>}</div>
        {connection.problem === "event_timeout" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentUi.content.retryEvent")}</Button>}
        {connection.problem === "offline" && <Button variant="outline" disabled={busy} onClick={onRetry}>{t("externalAgentUi.content.reconnectUpdates")}</Button>}
      </> : <p className="text-sm leading-relaxed text-muted-foreground">{(companyNameIsFallback ? t("externalAgentUi.content.invitationIncludesFallback") : t("externalAgentUi.content.invitationIncludes", { companyName }))}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={muse ? onClose : provider ? onBack : onClose}>
          {provider && !muse && <ArrowLeft className="size-4" />}{muse ? ready ? t("externalAgentUi.common.close") : t("externalAgentUi.content.saveExit") : provider ? t("externalAgentUi.common.back") : t("externalAgentUi.common.cancel")}
        </Button>
      </div>
      {provider && (approvalHref ? <Button asChild><Link to={approvalHref} onClick={onClose}>{t("externalAgentUi.content.reviewApproval")}</Link></Button>
        : museDetails ? <Button type="submit" form={detailsId} disabled={busy || !museDraft.name.trim()}>{busy ? t("externalAgentUi.common.preparing") : t("externalAgentUi.common.continue")}</Button>
        : ready ? <Button onClick={onClose}>{t("externalAgentUi.common.done")}</Button>
        : museAwaitingInvitation ? <Button disabled={busy} onClick={onRetry}>{busy ? t("externalAgentUi.content.loadingSetup") : t("externalAgentUi.content.refreshSetup")}</Button>
        : muse ? museConnection?.problem === "disconnected" || museConnection?.problem === "connection_expired" ? <Button disabled={busy} onClick={onNewPrompt}>{t("externalAgentUi.common.reconnectMuse")}</Button>
          : museConnection?.problem === "prompt_unavailable" ? <Button disabled={busy} onClick={onNewPrompt}>{t("externalAgentUi.common.newPrompt")}</Button>
          : !museConnection?.paired && prompt ? <AgentSetupPrompt key={prompt} prompt={prompt} label={t("externalAgentUi.common.copySetup")} title={t("externalAgentUi.common.connectMuse")} agent={{ name: "Muse", icon: <Bot className="size-5" /> }} description={t("externalAgentUi.content.sendMuse")} align="end" className="min-w-0 shrink" onCopied={onCopied} />
          : busy ? <Button disabled>{t("externalAgentUi.common.preparing")}</Button>
          : <Button asChild><a href="https://muse.ai" target="_blank" rel="noopener noreferrer">{t("externalAgentUi.common.openMuse")}</a></Button>
        : connecting ? <Button disabled aria-live="polite">
          {!connection.problem && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {progressLabel}
        </Button>
        : dot && connection.problem === "prompt_unavailable" ? <Button disabled={busy} onClick={onNewPrompt}>{t("externalAgentUi.common.newPrompt")}</Button>
        : !prompt || busy ? <Button disabled>{busy ? t("externalAgentUi.common.preparing") : t("externalAgentUi.content.waitingDot")}</Button>
        : <AgentSetupPrompt
          key={preset}
          prompt={prompt}
          label={dot ? t("externalAgentUi.common.copySetup") : t("externalAgentUi.content.copyInvitation")}
          title={dot ? t("externalAgentUi.dot.title") : t("externalAgentUi.content.inviteAgent")}
          description={dot ? t("externalAgentUi.content.sendDot") : t("externalAgentUi.content.sendAgent")}
          agent={dot ? { name: "Dot", src: "/brands/adapters/openai-dot.svg" } : undefined}
          align="end"
          className="min-w-0 shrink"
          onCopied={onCopied}
        />)}
    </div>
  </>;
}
