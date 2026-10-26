import { useTranslation } from "@/i18n";
import {
  CircleCheck,
  CircleAlert,
  Loader2,
  Play,
  ChevronRight,
} from "lucide-react";
import type { AdapterEnvironmentTestResult } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export type TestState = "idle" | "running" | "pass" | "fail";

export function RuntimeTestCard({
  state,
  result,
  error,
  onTest,
  disabled = false,
  variant = "connection",
  metadataOnly = false,
}: {
  state: TestState | "warn";
  result: AdapterEnvironmentTestResult | null;
  error?: string | null;
  onTest: () => void;
  disabled?: boolean;
  variant?: "connection" | "prerequisites";
  metadataOnly?: boolean;
}) {
  const { t } = useTranslation();
  const copy = {
    idle: {
      title: t("agentSetupUi.runtime.idleTitle"),
      description: t("agentSetupUi.runtime.idleDescription"),
      action: t("agentSetupUi.runtime.run"),
    },
    running: {
      title: t("agentSetupUi.runtime.runningTitle"),
      description: t("agentSetupUi.runtime.runningDescription"),
      action: t("agentSetupUi.runtime.testing"),
    },
    pass: {
      title: t("agentSetupUi.runtime.passTitle"),
      description: t("agentSetupUi.runtime.passDescription"),
      action: t("agentSetupUi.runtime.again"),
    },
    warn: {
      title: t("agentSetupUi.runtime.warnTitle"),
      description: t("agentSetupUi.runtime.warnDescription"),
      action: t("agentSetupUi.runtime.again"),
    },
    fail: {
      title: t("agentSetupUi.runtime.failTitle"),
      description: t("agentSetupUi.runtime.failDescription"),
      action: t("agentSetupUi.runtime.retry"),
    },
  } as const;

  const prerequisiteCopy = {
    idle: { title: t("agentSetupUi.runtime.prerequisitesIdle"), description: t("agentSetupUi.runtime.prerequisitesDescription"), action: t("agentSetupUi.runtime.checkSetup") },
    running: { title: t("agentSetupUi.runtime.prerequisitesRunning"), description: t("agentSetupUi.runtime.prerequisitesRunningDescription"), action: t("agentSetupUi.runtime.checking") },
    pass: { title: t("agentSetupUi.runtime.prerequisitesPass"), description: t("agentSetupUi.runtime.prerequisitesPassDescription"), action: t("agentSetupUi.runtime.checkAgain") },
    warn: { title: t("agentSetupUi.runtime.pairing"), description: t("agentSetupUi.runtime.pairingDescription"), action: t("agentSetupUi.runtime.checkAgain") },
    fail: { title: t("agentSetupUi.runtime.prerequisitesFail"), description: t("agentSetupUi.runtime.prerequisitesFailDescription"), action: t("agentSetupUi.runtime.retryCheck") },
  } as const;

  const missingRuntime = state === "fail"
    ? result?.checks.find(check => check.code === "acpx_runtime_package_missing")
    : undefined;
  const content = missingRuntime
    ? { ...copy.fail, title: t("agentSetupUi.runtime.missing"), description: missingRuntime.message }
    : (variant === "prerequisites" ? prerequisiteCopy : copy)[state];
  const description = metadataOnly && state === "idle"
    ? t("agentSetupUi.runtime.metadataIdle")
    : metadataOnly && state === "running"
      ? t("agentSetupUi.runtime.metadataRunning")
      : content.description;
  const Icon =
    state === "running"
      ? Loader2
      : state === "pass"
        ? CircleCheck
        : state === "fail" || state === "warn"
          ? CircleAlert
          : Play;
  return (
    <section
      aria-label={t("agentSetupUi.runtime.label")}
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex items-start gap-3 p-4 sm:items-center">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted",
            state === "pass"
              ? "text-green-600 dark:text-green-400"
              : state === "fail"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          <Icon
            className={cn(
              "size-4",
              state === "running" && "animate-spin motion-reduce:animate-none",
            )}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role={state === "fail" ? "alert" : "status"}
            aria-atomic="true"
            className="min-w-0 space-y-1"
          >
            <h3 className="text-sm font-medium">{content.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {state === "fail" && error ? error : description}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-center"
            disabled={disabled || state === "running"}
            onClick={onTest}
          >
            {content.action}
          </Button>
        </div>
      </div>
      {result && result.checks.length > 0 && (
        <details
          key={`${state}:${result.testedAt}`}
          className="group border-t border-border"
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              aria-hidden="true"
              className="size-3 transition-transform group-open:rotate-90"
            />
            {t("agentSetupUi.runtime.details")}
          </summary>
          <ul className="space-y-3 px-4 pb-4">
            {result.checks.map((check) => (
              <li
                key={check.code}
                className="flex gap-2 text-xs leading-relaxed"
              >
                {check.level === "error" || check.level === "warn" ? (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  />
                ) : (
                  <CircleCheck
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-foreground">{check.message}</p>
                  {check.detail && (
                    <p className="break-all text-muted-foreground">
                      {check.detail}
                    </p>
                  )}
                  {check.hint && (
                    <p className="text-muted-foreground">{check.hint}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
