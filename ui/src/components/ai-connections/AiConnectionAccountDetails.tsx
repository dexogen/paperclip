import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import type { AiManagedConnectionSummary, ConnectionGrant } from "@paperclipai/shared";
import { aiConnectionsApi } from "@/api/ai-connections";
import { describeError } from "@/api/errors";
import { retryTransientOnly } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import { AI_PROVIDERS, aiMethodLabel } from "./model";

/** Provider profile loading is independent of account access and maintenance controls. */
export function AiConnectionAccountDetails({ account, grant }: {
  account: AiManagedConnectionSummary;
  grant: ConnectionGrant;
}) {
  useUiTranslation();
  const canLookUp = account.provider === "anthropic" && account.method === "subscription" && account.status === "connected";
  const identity = useQuery({
    queryKey: ["ai-account-identity", account.companyId, account.id, grant.id, grant.updatedAt],
    queryFn: ({ signal }) => aiConnectionsApi.accountIdentity(account.companyId, account.id, grant.id, { signal }),
    enabled: canLookUp,
    staleTime: 5 * 60_000,
    retry: retryTransientOnly(0),
  });
  const accountLabel = identity.data?.accountLabel ?? account.accountLabel;
  const message = identity.error ? describeError(identity.error).body : identity.data?.message;
  const retryable = identity.isError || identity.data?.status === "error";
  return (
    <section className="space-y-3" aria-label={translateUi("fullApps.child_3903f0e1ae")}>
      <h3 className="text-sm font-semibold">{translateUi("fullApps.child_3903f0e1ae")}</h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-muted-foreground">{AI_PROVIDERS[account.provider].name} {translateUi("interfaceUpdates.account_9af21132")}</dt>
        <dd className="break-words">{accountLabel ?? translateUi("fullApps.not_available_67a926")}</dd>
        {identity.data?.organizationLabel && <>
          <dt className="text-muted-foreground">{translateUi("authGap.organization")}</dt>
          <dd className="break-words">{identity.data.organizationLabel}</dd>
        </>}
        <dt className="text-muted-foreground">{translateUi("fullApps.sign_in_method_2bb30a")}</dt>
        <dd>{aiMethodLabel(account.provider, account.method)}</dd>
        <dt className="text-muted-foreground">{translateUi("settingsNav.access")}</dt>
        <dd>{account.ownership === "shared" ? translateUi("upstreamGap.connectionCompanyShared") : translateUi("interfaceUpdates.personalAccount", { owner: account.ownerName ?? translateUi("interfaceUpdates.accountOwner") })}</dd>
      </dl>
      {canLookUp && identity.isPending && <p role="status" className="text-xs text-muted-foreground">{translateUi("interfaceUpdates.checking_account_details_8d8f3dd1")}</p>}
      {message && <p role={retryable ? "alert" : undefined} className="text-xs text-muted-foreground">{message}</p>}
      {retryable && <Button variant="outline" size="sm" disabled={identity.isFetching} onClick={() => void identity.refetch()}>{translateUi("costsUi.retryAccountCheck")}</Button>}
    </section>
  );
}
