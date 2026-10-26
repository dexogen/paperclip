import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { InlineBanner } from "@/components/InlineBanner";
import { ConnectionChoiceList } from "../ConnectionChoiceList";

/** Shared presentation for account reuse, including the requested external app. */
export function RemoteMcpAccountChoice({
  providerName,
  upstreamServiceName,
  connections,
  pendingId,
  error,
  onSelect,
  onCancel,
  onConnectNew,
}: {
  providerName: string;
  upstreamServiceName?: string;
  connections: { id: string; name: string }[];
  pendingId?: string | null;
  error?: string | null;
  onSelect: (id: string) => void;
  onCancel?: () => void;
  onConnectNew: () => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">
          {upstreamServiceName
            ? fullAppsT("fullApps.connect_through_034a87", { value1: upstreamServiceName, value2: providerName })
            : fullAppsT("fullApps.connect_60c786", { value1: providerName })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{fullAppsT("fullApps.use_an_existing_connection_or_connect_a_new_account__a6155a")}</p>
      </div>
      {upstreamServiceName && (
        <InlineBanner compact><FullAppsTrans i18nKey="fullApps.is_an_external_service_that_handles_the_connection_a_8b8db5" components={{ part1: <>{providerName}</>, part2: <>{upstreamServiceName}</> }} /></InlineBanner>
      )}
      <ConnectionChoiceList
        choices={connections.map((connection) => ({
          ...connection,
          description: fullAppsT("fullApps.provider_account_available_a36141"),
        }))}
        pendingId={pendingId}
        onSelect={onSelect}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={Boolean(pendingId)}
          onClick={onCancel}
        >{fullAppsT("fullApps.cancel_19766e")}</Button>
        <Button disabled={Boolean(pendingId)} onClick={onConnectNew}>{fullAppsT("githubSetupUi.connectNew")}</Button>
      </div>
    </div>
  );
}
