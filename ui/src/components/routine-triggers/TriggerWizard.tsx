import { routineWeekdayLabel } from "@/lib/routine-display-labels";
import { i18n, useTranslation } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  AlertCircle,
  Globe,
  GitBranch,
  Radio,
  Webhook,
} from "lucide-react";
import {
  SetupWizardNavigation,
  SetupWizardFooter,
} from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { cn } from "@/lib/utils";
import { AgentInstructions, CopyField } from "./WebhookFields";
import { WebhookUrlWarning } from "./WebhookUrlWarning";

export type TriggerDraft = {
  kind: "choose" | "schedule" | "webhook";
  step: number;
  availableStep: number;
  sender: "custom" | "github";
  /** Retained when resuming webhooks created before generic signed-app support. */
  signingMode?: "bearer" | "app_webhook" | "fireflies_hmac";
  frequency: string;
  time: string;
  weekday: string;
  timezone: string;
  created: boolean;
};
export const defaultTriggerDraft: TriggerDraft = {
  kind: "choose",
  step: 0,
  availableStep: 0,
  sender: "custom",
  frequency: "weekdays",
  time: "09:00",
  weekday: "Monday",
  timezone: "America/Chicago",
  created: false,
};
export function webhookAgentInstructions(
  sender: TriggerDraft["sender"],
  routineTitle: string,
  webhookUrl: string,
  webhookSecret: string,
  setupPending = true,
  signingMode: TriggerDraft["signingMode"] = "app_webhook",
) {
  const common = [
    i18n.t("fullRoutinesSecrets.agentConnectRoutine", { title: JSON.stringify(routineTitle) }),
    i18n.t("fullRoutinesSecrets.agentWebhookUrl", { url: webhookUrl }),
    i18n.t("fullRoutinesSecrets.sendAnHTTPPOSTRequestWithAJSONObjectAs"),
    "Content-Type: application/json",
  ];
  const auth =
    sender === "github"
      ? [
          i18n.t("fullRoutinesSecrets.inGitHubOpenYourRepositorySettingsWebhooksAddWebhook"),
          i18n.t("fullRoutinesSecrets.useTheWebhookURLAboveAsPayloadURLAndSelect"),
          i18n.t("fullRoutinesSecrets.agentWebhookSecret", { secret: webhookSecret }),
          i18n.t("fullRoutinesSecrets.pasteThisValueIntoGitHubSSecretFieldGitHubSigns"),
          i18n.t("fullRoutinesSecrets.selectTheEventsThatShouldStartThisRoutineEnableThe"),
          i18n.t("fullRoutinesSecrets.toCheckTheConnectionOpenRecentDeliveriesAndRedeliverAn"),
        ]
      : [
          i18n.t("fullRoutinesSecrets.agentWebhookKey", { secret: webhookSecret }),
          ...(signingMode === "bearer" ? [] : [
            i18n.t("fullRoutinesSecrets.agentHmacSignature", { headers: signingMode === "fireflies_hmac" ? "X-Hub-Signature" : i18n.t("fullRoutinesSecrets.signatureHeaderOptions") }),
          ]),
          ...(signingMode === "fireflies_hmac" ? [] : [
            i18n.t("fullRoutinesSecrets.agentBearerHeader", { secret: webhookSecret }),
          ]),
          i18n.t("fullRoutinesSecrets.subscribeOnlyToTheEventsThatShouldStartThisRoutine"),
          i18n.t("fullRoutinesSecrets.inTheSendingAppAddAWebhookUsingThisURL"),
          i18n.t("fullRoutinesSecrets.sendAUniqueIdempotencyKeyHeaderForEachEventAnd"),
          i18n.t("fullRoutinesSecrets.exampleJSONBodyEventDeploymentCompletedEnvironmentProduction"),
          i18n.t("fullRoutinesSecrets.toCheckTheConnectionSendATestEventFromThe"),
        ];
  return [
    ...common,
    ...auth,
    i18n.t("fullRoutinesSecrets.openCheckConnectionInPaperclipToSeeWhetherTheEvent"),
    ...(setupPending
      ? [
          i18n.t("fullRoutinesSecrets.duringSetupDeliveriesOnlyTestTheConnectionTheyDoNot"),
          i18n.t("fullRoutinesSecrets.finishSetupInPaperclipToEnableThisWebhookForFuture"),
        ]
      : [
          i18n.t("fullRoutinesSecrets.thisWebhookIsEnabledDeliveriesCanStartTheRoutineAnd"),
        ]),
    i18n.t("fullRoutinesSecrets.storeTheKeySecurelyDoNotPutItInSource"),
  ].join("\n");
}
export function describeSchedule(draft: TriggerDraft) {
  if (draft.frequency === "daily") return i18n.t("fullRoutinesSecrets.dailyAt", { time: draft.time });
  if (draft.frequency === "weekly") return i18n.t("fullRoutinesSecrets.weeklyAt", { day: routineWeekdayLabel(draft.weekday), time: draft.time });
  return i18n.t("fullRoutinesSecrets.wizardWeekdaysAt", { time: draft.time });
}
export function RoutineTriggerWizard({
  initialDraft,
  onSaveExit,
  onFinish,
  onCreateWebhook,
  onRotateKey,
  routineTitle,
  routineId,
  routineActive = true,
  webhookUrl = "",
  webhookSecret = "",
  checkResult = "waiting",
}: {
  initialDraft: TriggerDraft;
  routineTitle: string;
  routineId: string;
  routineActive?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  onCreateWebhook?: (draft: TriggerDraft) => Promise<void>;
  onRotateKey?: () => Promise<void>;
  onSaveExit: (draft: TriggerDraft) => void | Promise<void>;
  onFinish: (draft: TriggerDraft) => void | Promise<void>;
  checkResult?: "waiting" | "received" | "rejected" | "no_event";
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { setBreadcrumbs } = useBreadcrumbs();
  const perform = useCallback(
    async (action: () => void | Promise<void>) => {
      if (busy) return;
      setBusy(true);
      setSaveError("");
      try {
        await action();
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : i18n.t("fullRoutinesSecrets.couldnTSavePleaseTryAgain"),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, t],
  );
  const saveAndExit = useCallback(() => {
    void perform(() => onSaveExit(draft));
  }, [draft, onSaveExit, perform, t]);
  useEffect(() => {
    setBreadcrumbs([
      {
        label: routineTitle,
        href: `/routines/${routineId}/triggers`,
        onClick: (event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          saveAndExit();
        },
      },
      { label: t("fullRoutinesSecrets.addTrigger") },
    ]);
  }, [saveAndExit, setBreadcrumbs, routineTitle, routineId, t]);
  const schedule = draft.kind === "schedule";
  const github = draft.sender === "github";
  const labels = schedule
    ? [i18n.t("fullRoutinesSecrets.chooseTrigger"), i18n.t("fullRoutinesSecrets.setSchedule"), i18n.t("fullRoutinesSecrets.reviewSchedule")]
    : [i18n.t("fullRoutinesSecrets.chooseTrigger"), i18n.t("fullRoutinesSecrets.connectYourApp"), i18n.t("fullRoutinesSecrets.checkConnection")];
  function patch(values: Partial<TriggerDraft>) {
    setDraft((current) => ({ ...current, ...values }));
  }
  function advance() {
    void perform(async () => {
      if (draft.kind === "webhook" && draft.step === 0 && !draft.created)
        await onCreateWebhook?.(draft);
      const step = draft.step + 1;
      patch({
        step,
        availableStep: Math.max(draft.availableStep, step),
        created:
          draft.created || (draft.kind === "webhook" && draft.step === 0),
      });
    });
  }
  const title =
    draft.step === 0
      ? t("fullRoutinesSecrets.whenShouldThisRoutineRun")
      : schedule
        ? draft.step === 1
          ? t("fullRoutinesSecrets.setASchedule")
          : t("fullRoutinesSecrets.reviewYourSchedule")
        : draft.step === 1
          ? github ? t("fullRoutinesSecrets.connectGitHub") : t("fullRoutinesSecrets.connectYourApp")
          : t("fullRoutinesSecrets.checkYourConnection");
  const subtitle =
    draft.step === 0
      ? t("fullRoutinesSecrets.chooseHowToStartYouCanAddAnotherTrigger", { "routineTitle": routineTitle })
      : schedule
        ? draft.step === 1
          ? t("fullRoutinesSecrets.chooseWhenPaperclipShouldStartThisRoutineAutomatically")
          : t("fullRoutinesSecrets.thisScheduleStartsTheRoutineAutomaticallyYouCanPause")
        : draft.step === 1
          ? t("fullRoutinesSecrets.copyTheseDetailsIntoTheSendingAppThenSave")
          : t("fullRoutinesSecrets.testThatEventsArriveAndAuthenticationWorksThisWon");
  const selectClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const goBack = (
    <Button variant="outline" onClick={() => patch({ step: draft.step - 1 })}>{t("fullRoutinesSecrets.back")}</Button>
  );
  return (
    <div className="min-w-0 w-full max-w-2xl space-y-6">
      <SetupWizardNavigation
        takeover
        disabled={busy}
        ariaLabel={i18n.t("fullRoutinesSecrets.triggerSetupProgress")}
        labels={labels}
        step={draft.step}
        availableStep={draft.availableStep}
        onSelect={(step) => patch({ step })}
      />
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!schedule && draft.step > 0 && <WebhookUrlWarning url={webhookUrl} />}
        {draft.step === 0 && (
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("fullRoutinesSecrets.triggerType")}</legend>
            {(
              [
                {
                  kind: "schedule",
                  label: t("fullRoutinesSecrets.onASchedule"),
                  detail: i18n.t("fullRoutinesSecrets.everyDayOnWeekdaysOrOnceAWeek"),
                  Icon: CalendarClock,
                },
                {
                  kind: "webhook",
                  label: t("fullRoutinesSecrets.whenAnotherAppSendsAWebhook"),
                  detail:
                    i18n.t("fullRoutinesSecrets.whenSomethingHappensInGitHubAnotherAppOrAScript"),
                  Icon: Webhook,
                },
              ] as const
            ).map(({ kind, label, detail, Icon }) => (
              <label
                key={kind}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-4 focus-within:ring-2 focus-within:ring-ring",
                  draft.kind === kind
                    ? "border-primary bg-accent/30"
                    : "border-border hover:bg-accent/20",
                )}
              >
                <input
                  type="radio"
                  name="trigger-kind"
                  checked={draft.kind === kind}
                  disabled={draft.created && kind !== draft.kind}
                  onChange={() =>
                    patch({
                      kind,
                      availableStep:
                        kind === draft.kind ? draft.availableStep : 0,
                    })
                  }
                  className="sr-only"
                />
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {detail}
                  </span>
                </span>
                {draft.kind === kind && <Check className="h-4 w-4" />}
              </label>
            ))}
          </fieldset>
        )}
        {schedule && draft.step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repeat">{t("fullRoutinesSecrets.repeat")}</Label>
                <select
                  id="repeat"
                  className={selectClass}
                  value={draft.frequency}
                  onChange={(event) => patch({ frequency: event.target.value })}
                >
                  <option value="daily">{t("fullRoutinesSecrets.everyDay")}</option>
                  <option value="weekdays">{t("fullRoutinesSecrets.weekdaysMondayFriday")}</option>
                  <option value="weekly">{t("fullRoutinesSecrets.everyWeek")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="run-time">{t("fullRoutinesSecrets.time")}</Label>
                <Input
                  id="run-time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => patch({ time: event.target.value })}
                />
              </div>
            </div>
            {draft.frequency === "weekly" && (
              <div className="space-y-2">
                <Label htmlFor="run-day">{t("fullRoutinesSecrets.day")}</Label>
                <select
                  id="run-day"
                  className={selectClass}
                  value={draft.weekday}
                  onChange={(event) => patch({ weekday: event.target.value })}
                >
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <option key={day} value={day}>{routineWeekdayLabel(day)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="timezone">{t("fullRoutinesSecrets.timeZone")}</Label>
              <select
                id="timezone"
                className={selectClass}
                value={draft.timezone}
                onChange={(event) => patch({ timezone: event.target.value })}
              >
                {Array.from(
                  new Set([
                    draft.timezone,
                    "America/Chicago",
                    "America/New_York",
                    "America/Los_Angeles",
                    "Europe/London",
                    "UTC",
                  ]),
                ).map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{t("fullRoutinesSecrets.theTimeFollowsThisZoneIncludingDaylightSavingChanges")}</p>
            </div>
          </div>
        )}
        {schedule && draft.step === 2 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-md bg-muted/40 p-4">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{describeSchedule(draft)}</p>
                <p className="text-xs text-muted-foreground">
                  {draft.timezone}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.eachScheduledRunCreatesATaskForTheRoutine")}</p>
          </div>
        )}
        {draft.step === 0 && draft.kind === "webhook" && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t("fullRoutinesSecrets.whatSSendingTheWebhook")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    sender: "custom",
                    label: t("fullRoutinesSecrets.anotherAppOrScript"),
                    Icon: Globe,
                  },
                  { sender: "github", label: "GitHub", Icon: GitBranch },
                ] as const
              ).map(({ sender, label, Icon }) => (
                <label
                  key={sender}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 focus-within:ring-2 focus-within:ring-ring",
                    draft.sender === sender
                      ? "border-primary bg-accent/30"
                      : "border-border",
                    draft.created && "cursor-default",
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="sender"
                    checked={draft.sender === sender}
                    disabled={draft.created}
                    onChange={() => patch({ sender })}
                  />
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{label}</span>
                  {draft.sender === sender && <Check className="h-4 w-4" />}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {draft.kind === "webhook" && draft.step === 0 && (
          <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.publicServicesNeedAPubliclyReachableHTTPSWebhookURL")}</p>
        )}
        {!schedule && draft.step === 1 && (
          <div className="space-y-5">
            {webhookSecret && (
              <AgentInstructions
                value={webhookAgentInstructions(
                  draft.sender,
                  routineTitle,
                  webhookUrl,
                  webhookSecret,
                  true,
                  draft.signingMode,
                )}
              />
            )}
            <CopyField
              label={github ? t("fullRoutinesSecrets.payloadURL") : t("fullRoutinesSecrets.webhookURL")}
              value={webhookUrl}
            />
            {!github && draft.signingMode !== "bearer" && (
              <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.pasteThisKeyIntoYourAppSSigningSecret")}{draft.signingMode !== "fireflies_hmac" && <>
                  {" "}{t("fullRoutinesSecrets.ifYourAppUsesCustomHeadersInsteadSetAuthorization")}</>}
              </p>
            )}
            {webhookSecret ? (
              <CopyField
                label={github ? t("fullRoutinesSecrets.secret") : draft.signingMode === "bearer" ? t("fullRoutinesSecrets.authorizationHeaderValue") : t("fullRoutinesSecrets.secretKey")}
                value={!github && draft.signingMode === "bearer" ? `Bearer ${webhookSecret}` : webhookSecret}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.theKeyIsHiddenAfterLeavingSetupIfYou")}</p>
                <Button
                  variant="outline"
                  onClick={() => void perform(() => onRotateKey?.())}
                >{t("fullRoutinesSecrets.generateNewKey")}</Button>
              </div>
            )}
          </div>
        )}
        {!schedule && draft.step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-sm font-medium">{t("fullRoutinesSecrets.connectionTestOnly")}</p>
              <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.eventsReceivedDuringSetupWonTStartTheRoutine")}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("fullRoutinesSecrets.sendAnEventFrom")}{" "}{github ? "GitHub" : t("fullRoutinesSecrets.yourApp")}
              </p>
              <p className="text-sm text-muted-foreground">
                {github
                  ? t("fullRoutinesSecrets.openThisWebhookInYourRepositorySettingsUnderRecent")
                  : t("fullRoutinesSecrets.lookForSendTestInYourAppSWebhook")}
              </p>
              <p className="text-xs text-muted-foreground">{t("fullRoutinesSecrets.keepThisPageOpenToSeeTheTestResult")}</p>
            </div>
            <div
              role="status"
              className="flex items-start gap-3 rounded-md bg-muted/40 p-4"
            >
              {checkResult === "received" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-(--status-task-done)" />
              ) : checkResult === "rejected" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              ) : (
                <Radio className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {checkResult === "received"
                    ? t("fullRoutinesSecrets.testEventReceivedConnectionWorking")
                    : checkResult === "rejected"
                      ? t("fullRoutinesSecrets.eventArrivedButTheKeyWasRejected")
                      : checkResult === "no_event"
                        ? t("fullRoutinesSecrets.noEventReceivedYet")
                        : t("fullRoutinesSecrets.waitingForAnEventFromYourApp")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checkResult === "received"
                    ? t("fullRoutinesSecrets.authenticationPassedNoRoutineRunOrTaskWasCreated")
                    : checkResult === "rejected"
                      ? t("fullRoutinesSecrets.goBackToConnectYourAppUpdateTheKey")
                      : t("fullRoutinesSecrets.waitingToVerifyDeliveryAndAuthenticationTheRoutineIs")}
                </p>
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">{t("fullRoutinesSecrets.troubleshootDelivery")}</summary>
              <div className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">{t("fullRoutinesSecrets.checkThatTheWebhookIsEnabledInYourSending")}</p>
                <CopyField label={t("fullRoutinesSecrets.webhookURL")} value={webhookUrl} />
              </div>
            </details>
          </div>
        )}
        {!schedule && draft.step === 2 && (
          <p className="text-xs text-muted-foreground">
            {routineActive
              ? t("fullRoutinesSecrets.finishSetupToEnableThisWebhookFutureEventsWill")
              : t("fullRoutinesSecrets.finishSetupToSaveThisWebhookTheRoutineIs")}
          </p>
        )}
        {schedule && draft.step === 2 && !routineActive && (
          <p className="text-sm text-muted-foreground">{t("fullRoutinesSecrets.theRoutineIsPausedEnableItsAutomaticTriggersWhen")}</p>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        )}
        <SetupWizardFooter onSaveExit={saveAndExit}>
          {draft.step > 0 && goBack}
          {draft.step === 0 ? (
            <Button disabled={draft.kind === "choose"} onClick={advance}>{t("fullRoutinesSecrets.continue")}</Button>
          ) : schedule ? (
            draft.step === 1 ? (
              <Button disabled={!draft.time} onClick={advance}>{t("fullRoutinesSecrets.reviewSchedule")}</Button>
            ) : (
              <Button onClick={() => void perform(() => onFinish(draft))}>{t("fullRoutinesSecrets.addSchedule")}</Button>
            )
          ) : draft.step === 1 ? (
            <Button onClick={advance}>{t("fullRoutinesSecrets.checkConnection")}</Button>
          ) : (
            <Button onClick={() => void perform(() => onFinish(draft))}>
              {checkResult === "received"
                ? t("fullRoutinesSecrets.finishSetup")
                : t("fullRoutinesSecrets.finishWithoutChecking")}
            </Button>
          )}
        </SetupWizardFooter>
      </fieldset>
    </div>
  );
}
