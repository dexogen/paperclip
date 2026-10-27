import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  SlackSearchStatus,
  SlackToolCapabilities,
} from "@paperclipai/shared";
import { slackToolsApi } from "@/api/slackTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SlackCapabilitiesView({
  capabilities,
  error,
}: {
  capabilities?: SlackToolCapabilities;
  error?: string;
}) {
  useFullAppsTranslation();
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.read_search_and_act_in_slack_some_actions_require_ap_b6aa05")}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!capabilities && !error && (
        <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.checking_slack_permissions_d85521")}</p>
      )}
      {capabilities && (
        <>
          {capabilities.missingScopes.length > 0 && (
            <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
              <p className="text-sm font-medium">{fullAppsT("fullApps.add_permissions_to_unlock_more_tools_a716eb")}</p>
              <p className="text-sm"><FullAppsTrans i18nKey="fullApps.your_existing_connection_still_works_in_choose_your__93fdf8" components={{ part1: <>{" "}</>, part2: <a
                  className="underline underline-offset-4"
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noreferrer"
                >{fullAppsT("fullApps.slack_app_settings_d811ef")}</a> }} /></p>
              <p className="text-xs font-mono break-words">
                {capabilities.missingScopes.join(", ")}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function SlackSearchView({
  status,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  status: SlackSearchStatus;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onConfigure: (input: {
    clientId: string;
    clientSecret: string;
  }) => Promise<void>;
}) {
  useFullAppsTranslation();
  const id = useId();
  const [clientId, setClientId] = useState(status.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppDisplayText | null>(null);
  const perform = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? appErrorDisplay(e) : ownAppDisplayText("fullApps.unable_to_update_slack_search_2986f9"),
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{fullAppsT("fullApps.your_slack_search_access_c49a01")}</h3>
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.optional_personal_authorization_enables_private_sear_5d5b66")}</p>
      {!status.nativeSearchAvailable && (
        <p role="status" className="text-sm text-muted-foreground">
          {status.limitation}
        </p>
      )}
      {status.connected ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{fullAppsT("fullApps.slack_search_connected_7ce799")}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void perform(onDisconnect)}
          >{fullAppsT("fullApps.disconnect_search_1ae291")}</Button>
        </div>
      ) : (
        <Button
          variant="outline"
          disabled={pending || !status.configured}
          onClick={() => void perform(onConnect)}
        >{fullAppsT("fullApps.connect_slack_search_e8b57c")}</Button>
      )}
      {!status.configured && (
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.a_connection_manager_needs_to_configure_your_slack_a_c83c40")}</p>
      )}
      {status.canConfigure && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{fullAppsT("fullApps.oauth_app_configuration_for_connection_managers_ee4c0f")}</summary>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                await onConfigure({ clientId, clientSecret });
                setClientSecret("");
              });
            }}
          >
            <p className="text-sm"><FullAppsTrans i18nKey="fullApps.in_slack_app_settings_add_this_redirect_url_under_oa_859f81" components={{ part1: <code>search:read.public</code>, part2: <>{" "}</>, part3: <code>search:read.private</code>, part4: <>{" "}</>, part5: <code>search:read.files</code> }} /></p>
            <p className="text-xs font-mono break-all">
              {status.redirectUri ?? fullAppsT("fullApps.configure_a_public_https_url_first_a5716c")}
            </p>
            <div className="space-y-2">
              <label htmlFor={`${id}-client`}>{fullAppsT("fullApps.client_id_8726db")}</label>
              <Input
                id={`${id}-client`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-secret`}>{fullAppsT("fullApps.client_secret_ae21cf")}</label>
              <Input
                id={`${id}-secret`}
                type="password"
                autoComplete="new-password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={pending || !clientId || !clientSecret}
              >{fullAppsT("fullApps.save_oauth_configuration_37b148")}</Button>
            </div>
          </form>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {renderAppDisplayText(error)}
        </p>
      )}
    </section>
  );
}
export function SlackToolsSettings({
  companyId,
  endpointId,
}: {
  companyId: string;
  endpointId: string;
}) {
  useFullAppsTranslation();
  const query = useQuery({
    queryKey: ["slack-capabilities", companyId, endpointId],
    queryFn: () => slackToolsApi.capabilities(companyId, endpointId),
    staleTime: 60_000,
  });
  return (
    <div className="space-y-3">
      <SlackCapabilitiesView
        capabilities={query.data}
        error={query.error?.message}
      />

    </div>
  );
}
export function SlackSearchAccess({
  companyId,
  endpointId,
}: {
  companyId: string;
  endpointId: string;
}) {
  useFullAppsTranslation();
  const query = useQuery({
    queryKey: ["slack-search", companyId, endpointId],
    queryFn: () => slackToolsApi.search(companyId, endpointId),
  });
  if (query.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {query.error.message}
      </p>
    );
  if (!query.data)
    return (
      <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_search_access_20c6a0")}</p>
    );
  return (
    <SlackSearchView
      status={query.data}
      onConnect={async () => {
        const result = await slackToolsApi.connect(companyId, endpointId);
        window.location.assign(result.url);
      }}
      onDisconnect={async () => {
        await slackToolsApi.disconnect(companyId, endpointId);
        await query.refetch();
      }}
      onConfigure={async (input) => {
        await slackToolsApi.configure(companyId, endpointId, input);
        await query.refetch();
      }}
    />
  );
}
