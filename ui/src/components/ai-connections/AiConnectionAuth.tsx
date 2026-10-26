import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  OnboardingCardField,
  OnboardingLoginCodeRow,
  ProviderApiKeyCard,
  ProviderSubscriptionCard,
} from "@/components/AdapterLoginChrome";
import {
  AI_PROVIDERS,
  aiMethodLabel,
  type AiAuthMethod,
  type AiProvider,
} from "./model";

/** Redacted view of the existing login lifecycle, supplied by the host. */
export type AiAuthState =
  | { phase: "idle" | "starting" | "submitting" | "connected" | "cancelled" }
  | { phase: "waiting"; authorizationUrl: string; code?: string }
  | { phase: "error" | "expired" | "unsupported"; message: string };

export interface AiConnectionAuthProps {
  provider: AiProvider;
  method: AiAuthMethod;
  state: AiAuthState;
  onStart: () => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onDone: () => void;
}

/** No provider calls or polling here: live hosts keep the existing login controllers. */
export function AiConnectionAuth(props: AiConnectionAuthProps) {
  useFullSharedTranslation();
  // Remount private input state when the provider, method, or attempt changes phase.
  return (
    <AuthAttempt
      key={`${props.provider}:${props.method}:${props.state.phase}`}
      {...props}
    />
  );
}

function AuthAttempt({
  provider,
  method,
  state,
  onStart,
  onSubmit,
  onCancel,
  onDone,
}: AiConnectionAuthProps) {
  useFullSharedTranslation();
  const [value, setValue] = useState("");
  const info = AI_PROVIDERS[provider];
  const busy = state.phase === "starting" || state.phase === "submitting";
  const unsupported =
    state.phase === "unsupported" ||
    (method === "subscription" && !info.subscriptionName);
  const submit = () => {
    if (!value.trim() || busy) return;
    const submitted = value.trim();
    setValue("");
    onSubmit(submitted);
  };
  return (
    <section
      aria-label={fullSharedT("fullShared.connect_60c786", { value1: info.name })}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold"><FullSharedTrans i18nKey="fullShared.connect_ef0d09" components={{ part1: <>{info.name}</> }} /></h3>
        <p className="text-xs text-muted-foreground">
          {aiMethodLabel(provider, method)}
        </p>
      </div>
      {state.phase === "connected" ? (
        <>
          <p role="status" className="text-sm">{fullSharedT("fullShared.connected_this_account_is_saved_in_connections_and_c_95a419")}</p>
          <Button onClick={onDone}>{fullSharedT("providerSetup.credentials.useConnection")}</Button>
        </>
      ) : (
        <>
          {unsupported ? (
            <p role="status" className="text-sm text-muted-foreground">
              {state.phase === "unsupported"
                ? state.message
                : fullSharedT("fullShared.this_provider_does_not_offer_a_subscription_connecti_0c38d4")}
            </p>
          ) : (
            <>
              {(state.phase === "error" || state.phase === "expired") && (
                <p role="alert" className="text-sm text-destructive">
                  {state.message}
                </p>
              )}
              {state.phase === "cancelled" && (
                <p role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.sign_in_cancelled_no_connection_was_created_66a4f1")}</p>
              )}
              {method === "api_key" ? (
                <ProviderApiKeyCard
                  providerName={info.name}
                  value={value}
                  onChange={setValue}
                  onSubmit={submit}
                  placeholder={fullSharedT("onboarding.credentials.placeholder")}
                  disabled={busy}
                  autoFocus
                />
              ) : busy ? (
                <ProviderSubscriptionCard
                  providerName={info.name}
                  mode={
                    provider === "anthropic"
                      ? "submitted_code"
                      : "displayed_code"
                  }
                  loading
                >
                  <span />
                </ProviderSubscriptionCard>
              ) : state.phase === "waiting" ? (
                <ProviderSubscriptionCard
                  providerName={info.name}
                  authorizationUrl={state.authorizationUrl}
                  mode={
                    provider === "anthropic"
                      ? "submitted_code"
                      : "displayed_code"
                  }
                >
                  {provider === "anthropic" ? (
                    <OnboardingCardField
                      value={value}
                      onChange={setValue}
                      onSubmit={submit}
                    />
                  ) : (
                    <OnboardingLoginCodeRow code={state.code ?? ""} />
                  )}
                </ProviderSubscriptionCard>
              ) : (
                <p className="text-sm text-muted-foreground"><FullSharedTrans i18nKey="fullShared.sign_in_with_your_f87cc0" components={{ part1: <>{info.subscriptionName}</> }} /></p>
              )}
            </>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setValue("");
                onCancel();
              }}
            >{fullSharedT("fullShared.cancel_19766e")}</Button>
            {!unsupported &&
              (method === "api_key" ? (
                <Button disabled={busy || !value.trim()} onClick={submit}>
                  {busy ? fullSharedT("onboarding.progress.connecting") : fullSharedT("fullShared.connect_1a2303")}
                </Button>
              ) : state.phase === "waiting" ? (
                provider === "anthropic" ? (
                  <Button disabled={!value.trim()} onClick={submit}>{fullSharedT("providerSetup.login.submitCode")}</Button>
                ) : (
                  <span role="status" className="text-sm text-muted-foreground">{fullSharedT("fullShared.waiting_for_sign_in_20ff19")}</span>
                )
              ) : (
                <Button disabled={busy} onClick={onStart}>
                  {busy
                    ? fullSharedT("providerSetup.login.preparingEllipsis")
                    : state.phase === "idle"
                      ? fullSharedT("fullShared.sign_in_bfd402")
                      : fullSharedT("fullShared.try_again_d8b839")}
                </Button>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
