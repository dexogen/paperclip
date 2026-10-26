import { useTranslation } from "@/i18n";
import { agentConfigRoleLabel } from "../agent-config-primitives";
import { useId } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { AGENT_ROLES, type CreateGrokInvitation, type DotPairing, type GrokConnection } from "@paperclipai/shared";
import { AdapterMark } from "../AdapterMark";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Button, buttonVariants } from "../ui/button";
import { CopyText } from "../CopyText";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/select";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { buildGrokAccessPrompt, buildGrokRoutinePrompt } from "@/lib/grok-bot-setup-prompt";
import { Link } from "@/lib/router";

export type GrokSetupStep = 0 | 1 | 2 | 3;
export interface GrokBotSetupContentProps {
  step: GrokSetupStep; companyName: string; companyNameIsFallback?: boolean; details: CreateGrokInvitation;
  created: boolean; loading?: boolean; busy?: boolean; error?: string;
  managers: Array<{ id: string; name: string }>;
  connection?: GrokConnection; pairing: DotPairing | null; approvalHref?: string;
  webhookUrl: string; webhookKey: string; editingCredentials?: boolean;
  onEditCredentials?: () => void;
  onDetails: (details: CreateGrokInvitation) => void;
  onCredentials: (url: string, key: string) => void;
  onBack: () => void; onExit: () => void; onNext: () => void; onRetry: () => void;
}
export function GrokBotSetupContent(p: GrokBotSetupContentProps) {
  const { t, i18n } = useTranslation();
  const steps = [
    { id: "identify", label: t("grokSetupUi.setup.steps.identify") },
    { id: "access", label: t("grokSetupUi.setup.steps.access") },
    { id: "assignments", label: t("grokSetupUi.setup.steps.assignments") },
    { id: "verify", label: t("grokSetupUi.setup.steps.verify") },
  ];
  const pairingCodeId = useId();
  const binding = p.connection?.binding;
  const routine = binding?.routine;
  const exchange = routine?.lastExchange;
  const delivered = exchange?.status === "accepted" || exchange?.status === "acknowledged";
  const replied = !!routine?.verified && exchange?.status === "acknowledged";
  const ready = replied && p.connection?.agentLifecycleState === "ready" && !!p.connection.canConfigureConnection && !routine?.recoveryNeeded;
  const pending = exchange && ["prepared", "sending", "accepted"].includes(exchange.status) && Date.parse(exchange.expiresAt) > Date.now();
  const nextDisabled = p.busy || p.loading || !!p.approvalHref
    || p.step === 0 && (!p.details.name.trim() || !p.details.botName.trim())
    || p.step === 1 && !binding?.connected
    || p.step === 2 && ((!routine?.configured || p.editingCredentials) && (!p.webhookUrl || !p.webhookKey))
    || p.step === 3 && !ready && (!!pending || !!routine?.recoveryNeeded || !!replied);
  return <>
    <div className="min-h-0 space-y-6 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
      <div className="space-y-3 pr-5">
        <AdapterMark type="grok_bot" className="size-10" />
        <DialogTitle className="text-xl font-semibold tracking-tight">{ready ? t("grokSetupUi.setup.connectedTitle") : t("grokSetupUi.setup.title")}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{ready ? (p.companyNameIsFallback ? t("grokSetupUi.setup.readyFallback", { botName: p.details.botName }) : t("grokSetupUi.setup.readyNamed", { botName: p.details.botName, companyName: p.companyName })) : (p.companyNameIsFallback ? t("grokSetupUi.setup.descriptionFallback") : t("grokSetupUi.setup.descriptionNamed", { companyName: p.companyName }))}</DialogDescription>
      </div>
      <ol aria-label={t("grokSetupUi.setup.label")} className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        {steps.map(({ id, label }, index) => <li key={id} aria-current={p.step === index ? "step" : undefined} className={p.step === index ? "font-medium text-foreground" : ""}>{index + 1}. {label}</li>)}
      </ol>
      {p.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{p.error}</p><Button variant="outline" disabled={p.busy} onClick={p.onRetry}>{t("grokSetupUi.setup.retry")}</Button></div>}
      {p.loading ? <p role="status" className="text-sm text-muted-foreground">{t("grokSetupUi.setup.restoring")}</p> : p.approvalHref ? <p className="text-sm text-muted-foreground">{t("grokSetupUi.setup.approval")}</p> : <>
        {p.step === 0 && <div className="space-y-4">
          <label className="block space-y-2 text-sm"><span>{t("grokSetupUi.setup.name")}</span><Input value={p.details.name} disabled={p.created} onChange={e => p.onDetails({ ...p.details, name: e.target.value })} autoComplete="off" maxLength={100} /></label>
          <label className="block space-y-2 text-sm"><span>{t("grokSetupUi.common.botName")}</span><Input value={p.details.botName} disabled={p.created} onChange={e => p.onDetails({ ...p.details, botName: e.target.value })} autoComplete="off" maxLength={100} /></label>
          <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.nameHelp")}</p>
          <label className="block space-y-2 text-sm"><span>{t("grokSetupUi.setup.role")}</span><NativeSelect disabled={p.created} value={p.details.role ?? "general"} onChange={e => p.onDetails({ ...p.details, role: e.target.value as CreateGrokInvitation["role"] })}>{AGENT_ROLES.map(role => <option key={role} value={role}>{agentConfigRoleLabel(role, t)}</option>)}</NativeSelect></label>
          <label className="block space-y-2 text-sm"><span>{t("grokSetupUi.setup.manager")}</span><NativeSelect disabled={p.created} value={p.details.reportsTo ?? ""} onChange={e => p.onDetails({ ...p.details, reportsTo: e.target.value || null })}><option value="">{t("grokSetupUi.setup.noManager")}</option>{p.managers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</NativeSelect></label>
        </div>}
        {p.step === 1 && <div className="space-y-4 text-sm">
          <p>{t("grokSetupUi.setup.accessHelp")}</p>
          {p.connection?.resourceUrl && <AgentSetupPrompt prompt={buildGrokAccessPrompt(p.connection.resourceUrl, p.details.botName)} label={t("grokSetupUi.common.copyConnection")} title={t("grokSetupUi.setup.accessTitle")} description={t("grokSetupUi.setup.accessDescription")} />}
          {!binding?.connected && p.pairing && <div className="space-y-2">
            <label htmlFor={pairingCodeId}>{t("grokSetupUi.common.code")}</label>
            <div className="flex items-center gap-2">
              <Input id={pairingCodeId} value={p.pairing.pairingCode} readOnly type="password" autoComplete="off" />
              <CopyText text={p.pairing.pairingCode} ariaLabel={t("grokSetupUi.common.copyCodeAria")} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("grokSetupUi.common.copyCode")}</CopyText>
            </div>
            <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.codeHelp", { time: new Date(p.pairing.expiresAt).toLocaleTimeString(i18n.resolvedLanguage) })}</p>
          </div>}
          <p role="status" aria-live="polite" className="text-muted-foreground">{binding?.connected ? t("grokSetupUi.setup.accessConnected") : t("grokSetupUi.setup.accessWaiting")}</p>
          <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.accountWide")}</p>
        </div>}
        {p.step === 2 && <div className="space-y-4 text-sm">
          <p>{t("grokSetupUi.setup.routineHelp")}</p>
          {binding && <AgentSetupPrompt prompt={buildGrokRoutinePrompt(binding.id, p.details.botName)} label={t("grokSetupUi.common.copyRoutine")} title={t("grokSetupUi.common.enableAssignments")} description={t("grokSetupUi.setup.routineDescription")} />}
          <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.routineNavigation")}</p>
          {routine?.configured && !p.editingCredentials && !p.webhookUrl && !p.webhookKey ? <div className="space-y-2"><p role="status" className="text-muted-foreground">{t("grokSetupUi.setup.credentialsStored")}</p>{p.onEditCredentials && <Button variant="outline" onClick={p.onEditCredentials} disabled={p.busy}>{t("grokSetupUi.common.replace")}</Button>}</div> : <>
            <label className="block space-y-2"><span>{t("grokSetupUi.common.webhookUrl")}</span><Input value={p.webhookUrl} onChange={e => p.onCredentials(e.target.value, p.webhookKey)} type="password" autoComplete="off" spellCheck={false} /></label>
            <label className="block space-y-2"><span>{t("grokSetupUi.common.webhookKey")}</span><Input value={p.webhookKey} onChange={e => p.onCredentials(p.webhookUrl, e.target.value)} type="password" autoComplete="off" spellCheck={false} /></label>
          </>}
          <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.credentialsHelp")}</p>
        </div>}
        {p.step === 3 && <section aria-label={t("grokSetupUi.setup.checks")} className="space-y-4 text-sm">
          {[{ id: "delivery", label: t("grokSetupUi.setup.delivered"), done: delivered }, { id: "reply", label: t("grokSetupUi.setup.reply"), done: replied }].map(check => <p key={check.id} className="flex items-center gap-3">{check.done ? <Check className="size-4" /> : pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Circle className="size-4 text-muted-foreground" />}{check.label}<span className="text-muted-foreground">{check.done ? t("grokSetupUi.setup.complete") : t("grokSetupUi.setup.waiting")}</span></p>)}
          <p role="status" aria-live="polite" className="text-muted-foreground">{routine?.recoveryNeeded ? t("grokSetupUi.setup.recovery") : ready ? t("grokSetupUi.setup.ready") : replied ? t("grokSetupUi.setup.finishing") : exchange?.status === "rejected" ? t("grokSetupUi.setup.rejected") : delivered ? t("grokSetupUi.setup.deliveredWaiting") : t("grokSetupUi.setup.challenge")}</p>
          <p className="text-xs text-muted-foreground">{t("grokSetupUi.setup.externalHelp")}</p>
        </section>}
      </>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
      <div className="flex items-center gap-2"><Button variant="ghost" onClick={p.onBack} disabled={p.busy}>{t("grokSetupUi.setup.back")}</Button><Button variant="ghost" onClick={p.onExit} disabled={p.busy}>{t("grokSetupUi.setup.exit")}</Button></div>
      {p.approvalHref ? <Button asChild><Link to={p.approvalHref} onClick={p.onExit}>{t("grokSetupUi.setup.reviewApproval")}</Link></Button> : <Button onClick={p.onNext} disabled={nextDisabled}>{p.busy ? t("grokSetupUi.setup.saving") : ready ? t("grokSetupUi.setup.done") : p.step === 3 ? pending ? t("grokSetupUi.setup.waitingReply") : replied ? t("grokSetupUi.setup.finishingAction") : t("grokSetupUi.common.verify") : t("grokSetupUi.setup.continue")}</Button>}
    </div>
  </>;
}
