import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import type { ReactNode } from "react";
import type { ProviderFailure } from "@paperclipai/shared";
import { InlineBanner } from "./InlineBanner";

const labels: Record<ProviderFailure["category"], string> = {
  get rate_limit() { return translateUi("interfaceUpdates.rate_limit_reached_06946279"); }, get quota_exhausted() { return translateUi("interfaceUpdates.usage_allowance_exhausted_d88f7aff"); },
  get authentication() { return translateUi("interfaceUpdates.authentication_failed_93821eb7"); }, get permission() { return translateUi("interfaceUpdates.access_denied_cc11d415"); },
  get model_unavailable() { return translateUi("runUi.marker.modelUnavailable"); }, get invalid_request() { return translateUi("interfaceUpdates.request_rejected_21b36b60"); },
  get overloaded() { return translateUi("interfaceUpdates.provider_at_capacity_34bff80d"); }, get timeout() { return translateUi("interfaceUpdates.provider_timed_out_4ec65429"); }, get unknown() { return translateUi("runUi.activity.notice.failed"); },
};

export function ProviderFailureNotice({ failure, actions, children, className }: {
  failure: ProviderFailure; actions?: ReactNode; children?: ReactNode; className?: string;
}) {
  useUiTranslation();
  const provider = ({ anthropic: "Claude", openai: "OpenAI" } as Record<string, string>)[failure.provider] ?? failure.provider;
  return (
    <InlineBanner tone="danger" title={translateUi("interfaceUpdates.value_value_ca7577d5", { value1: (provider), value2: (labels[failure.category]) })} actions={actions} className={className}>
      <div className="flex flex-col gap-2">
        <p className="whitespace-pre-wrap break-words">{failure.message}</p>
        <p className="text-xs text-muted-foreground">
          {failure.phase === "startup" ? translateUi("interfaceUpdates.failed_before_work_started_a3e52b29") : translateUi("interfaceUpdates.failed_during_work_004bb0bd")}
          {failure.httpStatus ? translateUi("interfaceUpdates.http_value_fad7a765", { value1: (failure.httpStatus) }) : ""}
          {failure.providerCode ? translateUi("interfaceUpdates.value_25b1fe3f", { value1: (failure.providerCode) }) : ""}
        </p>
        {failure.requestId && <p className="font-mono text-xs text-muted-foreground">{translateUi("interfaceUpdates.request_3921a1e9")} {failure.requestId}</p>}
        {children}
      </div>
    </InlineBanner>
  );
}
