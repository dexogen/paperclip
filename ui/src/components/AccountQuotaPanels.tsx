import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { ProviderQuotaResult } from "@paperclipai/shared";
import { formatDateTime } from "../lib/utils";
import { QuotaBar } from "./QuotaBar";
import { quotaUnavailableMessage } from "../lib/quota-refresh";

export function AccountQuotaPanels({
  accounts,
  failed,
}: {
  accounts: ProviderQuotaResult[];
  failed?: boolean;
}) {
  useFullSharedTranslation();
  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <section
          className="space-y-2"
          key={account.accountKey ?? account.provider}
        >
          <p className="text-sm font-medium">
            {account.accountLabel ?? fullSharedT("fullShared.subscription_account_b9e6c3")}
          </p>
          {(failed || !account.ok) && (
            <p className="text-sm text-muted-foreground">
              {account.errorFamily === "credentials_unavailable"
                ? fullSharedT("fullShared.connect_or_reconnect_a_subscription_in_ai_connection_820f92")
                : quotaUnavailableMessage(account.windows.length > 0)}
            </p>
          )}
          {account.windows.map((window, index) => window.usedPercent == null ? (
            <div key={`${window.label}:${index}`} className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span>{window.label}</span>
                <span className="font-mono text-muted-foreground">{window.valueLabel ?? fullSharedT("fullShared.usage_not_reported_714f55")}</span>
              </div>
              {window.resetsAt && <p className="text-xs font-mono text-muted-foreground"><FullSharedTrans i18nKey="fullShared.resets_c1160f" components={{ part1: <>{formatDateTime(window.resetsAt)}</> }} /></p>}
            </div>
          ) : (
            <QuotaBar
              key={`${window.label}:${index}`}
              className="font-mono"
              label={window.label}
              percentUsed={window.usedPercent}
              leftLabel={
                window.valueLabel ??
                (window.usedPercent === null
                  ? "Usage not reported"
                  : `${window.usedPercent}% used`)
              }
              rightLabel={
                window.resetsAt
                  ? `Resets ${formatDateTime(window.resetsAt)}`
                  : undefined
              }
            />
          ))}
          {account.capturedAt && (
            <p className="text-xs font-mono text-muted-foreground"><FullSharedTrans i18nKey="fullShared.last_checked_ee5fba" components={{ part1: <>{formatDateTime(account.capturedAt)}</> }} /></p>
          )}
        </section>
      ))}
    </div>
  );
}
