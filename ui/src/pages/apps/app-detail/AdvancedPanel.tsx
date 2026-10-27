import { renderAppError } from "@/pages/apps/app-display-text";
import { formatOwnedDiagnostic } from "@/lib/owned-diagnostic-display";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Loader2, Lock } from "lucide-react";
import type {
  AppDefinition,
  ConnectionGrant,
  ToolConnection,
  ToolConnectionCredentialPolicy,
} from "@paperclipai/shared";
import { connectionCredentialConfigPath, credentialConfigPath, getAvailableConnectionMethod, humanizeConnectionDisplayName } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/context/ToastContext";
import { redactUrlSecrets } from "@/lib/redact-url-secrets";
import { navigateTopLevel } from "@/lib/browserNavigation";
import { prepareOAuthNavigation, savePendingCloudHandoff } from "@/lib/oauthHandoff";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/router";
import type { AppDetailSectionProps } from "./types";
import { RevokeGrantDialog } from "./IdentitiesSection";

export function AdvancedPanel({
  connection,
  appName,
  galleryEntry,
  removing,
  onRemove,
  onReplaced,
  canReplaceCredential = true,
  credentialUnavailableMessage = fullAppsT("fullApps.you_don_t_have_permission_to_replace_this_identity_s_8b6a0a"),
  appToggleDisabled,
  onToggleApp,
  identityGrant = null,
  identityCurrentUserId = null,
  identityProviderName,
  credentialPolicy,
  identityActionPending = false,
  onReconnectIdentity,
  onRevokeIdentity,
}: Pick<AppDetailSectionProps, "connection" | "appName" | "galleryEntry"> & {
  removing: boolean;
  onRemove: () => void;
  onReplaced: () => void;
  canReplaceCredential?: boolean;
  credentialUnavailableMessage?: string;
  appToggleDisabled: boolean;
  onToggleApp: () => void;
  identityGrant?: ConnectionGrant | null;
  identityCurrentUserId?: string | null;
  identityProviderName?: string;
  credentialPolicy?: ToolConnectionCredentialPolicy;
  identityActionPending?: boolean;
  onReconnectIdentity?: () => void;
  onRevokeIdentity?: (grant: ConnectionGrant) => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="space-y-4 border-t border-border pt-8">
      <TechnicalDetails connection={connection} />
      <DangerZone
        appName={appName}
        connection={connection}
        galleryEntry={galleryEntry}
        removing={removing}
        onRemove={onRemove}
        onReplaced={onReplaced}
        canReplaceCredential={canReplaceCredential}
        credentialUnavailableMessage={credentialUnavailableMessage}
        toggleDisabled={appToggleDisabled}
        onToggleConnection={onToggleApp}
        identityGrant={identityGrant}
        identityCurrentUserId={identityCurrentUserId}
        identityProviderName={identityProviderName ?? appName}
        credentialPolicy={credentialPolicy}
        identityActionPending={identityActionPending}
        onReconnectIdentity={onReconnectIdentity}
        onRevokeIdentity={onRevokeIdentity}
      />
    </div>
  );
}

function connectionMethodUnavailable(connection: ToolConnection, galleryEntry: AppDefinition | null): boolean {
  const methodKey = connection.config?.connectionMethodKey;
  return typeof methodKey === "string"
    && methodKey.length > 0
    && !!galleryEntry
    && Array.isArray(galleryEntry.methods)
    && !getAvailableConnectionMethod(galleryEntry, methodKey);
}

function KeySection({
  connection,
  galleryEntry,
  onReplaced,
  canReplace,
  unavailableMessage,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onReplaced: () => void;
  canReplace: boolean;
  unavailableMessage: string;
}) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium text-foreground">{fullAppsT("fullApps.reconnect_bf8a9e")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {canReplace ? fullAppsT("fullApps.replace_the_stored_credential_1282f3") : unavailableMessage}
            </p>
          </div>
        </div>
        {canReplace && !open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{fullAppsT("fullApps.reconnect_bf8a9e")}</Button>
        )}
      </div>
      {open && (
        <div className="pt-4">
          <ReconnectForm
            connection={connection}
            galleryEntry={galleryEntry}
            onCancel={() => setOpen(false)}
            onReconnected={() => {
              setOpen(false);
              onReplaced();
            }}
          />
        </div>
      )}
    </section>
  );
}

export function ReconnectCard({
  connection,
  galleryEntry,
  onReconnected,
  onReconnect,
  canReconnect = true,
  reconnectUnavailableMessage,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onReconnected: () => void;
  onReconnect?: () => void;
  canReconnect?: boolean;
  reconnectUnavailableMessage?: string;
}) {
  const { t } = useFullAppsTranslation();
  const { pushToast } = useToast();
  const reconnectOAuth = useMutation({
    // Reconnect is not a new identity choice. Personal-only connections must
    // put the replacement token back on the signed-in user's existing grant;
    // shared and legacy fallback connections keep using the organization slot.
    mutationFn: () => connection.credentialPolicy === "per_user"
      ? toolsApi.startOAuth(connection.id, { asCurrentUser: true })
      : toolsApi.startOAuth(connection.id),
    onSuccess: async (start) => {
      try {
        const target = await prepareOAuthNavigation(start);
        if (target.kind === "reauthentication" && start.handoff) {
          savePendingCloudHandoff(start.handoff.session);
        }
        navigateTopLevel(target.url);
      } catch (error) {
        pushToast({
          title: fullAppsT("fullApps.couldn_t_start_sign_in_33d85f"),
          body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.please_try_again_eea4fb"),
          tone: "error",
        });
      }
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.couldn_t_start_sign_in_33d85f"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.please_try_again_eea4fb"),
        tone: "error",
      }),
  });
  const verifyVercel = useMutation({
    mutationFn: () => toolsApi.checkConnectionHealth(connection.id),
    onSuccess: () => {
      pushToast({
        title: fullAppsT("fullApps.vercel_credential_verified_48706c"),
        body: fullAppsT("fullApps.message_01350d2e8435", { value1: humanizeConnectionDisplayName(connection) }),
        tone: "success",
      });
      onReconnected();
    },
    onError: (error) => pushToast({
      title: fullAppsT("fullApps.credential_still_needs_attention_cf7423"),
      body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.review_the_connector_in_vercel_connect_and_try_again_102132"),
      tone: "error",
    }),
  });
  const oauth = connection.authKind === "oauth";
  const managedByVercel = connection.credentialSource === "vercel_connect";
  const methodUnavailable = connectionMethodUnavailable(connection, galleryEntry);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {methodUnavailable ? fullAppsT("fullApps.connection_no_longer_supported_0d0dbd") : oauth ? fullAppsT("fullApps.reconnect_required_06b42a") : fullAppsT("fullApps.this_app_needs_reconnecting_a05cc2")}
        </h2>
        <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
          {methodUnavailable
            ? fullAppsT("fullApps.add_a_supported_connection_from_connectors_then_remo_103fb6")
            : formatOwnedDiagnostic(connection.healthMessage ?? "", connection.healthMessageDisplay, t).trim() || (oauth
            ? fullAppsT("fullApps.authorization_expired_or_was_revoked_sign_in_again_t_52f871")
            : fullAppsT("fullApps.the_key_stopped_working_paste_a_new_one_to_get_it_ba_912825"))}
        </p>
      </div>
      <div className="shrink-0">
        {!canReconnect ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {reconnectUnavailableMessage ?? fullAppsT("fullApps.you_don_t_have_permission_to_reconnect_this_identity_b611d4")}
          </p>
        ) : methodUnavailable ? (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/apps/connect?source=${encodeURIComponent(galleryEntry!.slug)}`}>{fullAppsT("fullApps.add_supported_connection_fa8386")}</Link>
          </Button>
        ) : onReconnect ? (
          <Button size="sm" variant="outline" onClick={onReconnect}>{fullAppsT("fullApps.reconnect_bf8a9e")}</Button>
        ) : managedByVercel && !oauth ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <a href="https://vercel.com/connect" target="_blank" rel="noreferrer">{fullAppsT("fullApps.manage_in_vercel_b2088a")}<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={verifyVercel.isPending}
              onClick={() => verifyVercel.mutate()}
            ><FullAppsTrans i18nKey="fullApps.check_again_7ab4d6" components={{ part1: <>{verifyVercel.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}</> }} /></Button>
          </div>
        ) : oauth ? (
          <Button
            type="button"
            size="sm"
            disabled={reconnectOAuth.isPending}
            onClick={() => reconnectOAuth.mutate()}
          >
            {reconnectOAuth.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {reconnectOAuth.isPending ? fullAppsT("fullApps.opening_sign_in_530dc0") : fullAppsT("fullApps.reconnect_bf8a9e")}
          </Button>
        ) : (
          <ReconnectForm connection={connection} galleryEntry={galleryEntry} onReconnected={onReconnected} />
        )}
      </div>
    </div>
  );
}

function ReconnectForm({
  connection,
  galleryEntry,
  onCancel,
  onReconnected,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onCancel?: () => void;
  onReconnected: () => void;
}) {
  const { t } = useFullAppsTranslation();
  const { pushToast } = useToast();
  const methodKey = typeof connection.config?.connectionMethodKey === "string"
    ? connection.config.connectionMethodKey
    : null;
  const method = galleryEntry && Array.isArray(galleryEntry.methods)
    ? getAvailableConnectionMethod(galleryEntry, methodKey)
    : null;
  const galleryFields = (method?.credentialFields ?? []).map((field) => ({
    ...field,
    configPath: credentialConfigPath(field, method),
    helpUrl: method?.consoleLinks?.keys ?? method?.consoleLinks?.docs ?? "",
  }));
  const fields = galleryFields.length > 0 ? galleryFields : (connection.credentialRefs ?? [])
    .filter((ref) => ref.placement === "header" || ref.placement === "url")
    .map((ref) => ({
      configPath: connectionCredentialConfigPath(ref),
      label: ref.placement === "url" ? fullAppsT("fullApps.mcp_server_url_4f5aff") : ref.prefix === "Bearer " ? fullAppsT("fullApps.app_key_e9ba76") : ref.key ?? ref.name,
      helpUrl: "",
      required: true,
    }));
  const [values, setValues] = useState<Record<string, string>>({});
  const [single, setSingle] = useState("");
  const usesFields = fields.length > 0;

  const reconnect = useMutation({
    mutationFn: () => {
      const credentialValues = usesFields
        ? values
        : { "credentials.authorization": single.trim() };
      return toolsApi.reconnectConnection(connection.id, credentialValues);
    },
    onSuccess: (result) => {
      const healthy =
        result.connection.healthStatus === "ok" || result.connection.healthStatus === "healthy" || result.connection.healthStatus === "unknown";
      if (healthy) {
        pushToast({
          title: fullAppsT("fullApps.reconnected_20a447"),
          body: fullAppsT("fullApps.message_01350d2e8435", { value1: humanizeConnectionDisplayName(connection) }),
          tone: "success",
        });
        onReconnected();
      } else {
        pushToast({
          title: fullAppsT("fullApps.still_not_working_46d820"),
          body: formatOwnedDiagnostic(result.connection.healthMessage ?? "", result.connection.healthMessageDisplay, t).trim() || fullAppsT("fullApps.that_key_didn_t_check_out_try_another_1fb0c9"),
          tone: "error",
        });
      }
    },
    onError: (error) =>
      pushToast({
        title: fullAppsT("fullApps.that_key_didn_t_work_5bf9a8"),
        body: error instanceof Error ? renderAppError(error) : fullAppsT("fullApps.check_the_key_and_try_again_7e751a"),
        tone: "error",
      }),
  });

  const filled = usesFields
    ? fields.every((f) => f.required === false || (values[f.configPath]?.trim().length ?? 0) > 0)
    : single.trim().length > 0;

  if (connection.credentialSource === "vercel_connect") {
    return (
      <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.credentials_for_this_connection_are_managed_in_verce_7352a3")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {usesFields ? (
        fields.map((field) => (
          <div key={field.configPath}>
            <label className="text-xs font-medium text-foreground">{field.label}</label>
            <Input
              type="password"
              aria-label={field.label}
              autoComplete="off"
              value={values[field.configPath] ?? ""}
              onChange={(e) => setValues({ ...values, [field.configPath]: e.target.value })}
              placeholder="****************"
              className="mt-1 h-10 font-mono"
            />
            {field.helpUrl && (
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-2"
              >{fullAppsT("githubSetupUi.key.where")}<ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        ))
      ) : (
        <Input
          type="password"
          aria-label={fullAppsT("fullApps.app_key_e9ba76")}
          autoComplete="off"
          value={single}
          onChange={(e) => setSingle(e.target.value)}
          placeholder={fullAppsT("fullApps.paste_your_new_key_0dbd3b")}
          className="h-10 font-mono"
        />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!filled || reconnect.isPending} onClick={() => reconnect.mutate()}>
          {reconnect.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {reconnect.isPending ? fullAppsT("fullApps.checking_2e5f79") : fullAppsT("fullApps.check_reconnect_776e8c")}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={reconnect.isPending}>{fullAppsT("fullApps.cancel_19766e")}</Button>
        )}
      </div>
    </div>
  );
}

function TechnicalDetails({ connection }: { connection: ToolConnection }) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-3 py-1 text-left">
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{fullAppsT("fullApps.connection_details_51bfff")}</span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="mt-4 grid gap-2 pb-2 text-xs sm:grid-cols-(--gtc-59)">
            <dt className="text-muted-foreground">{fullAppsT("fullApps.address_56ef8f")}</dt>
            <dd className="break-all font-mono text-foreground">{connectionAddress(connection)}</dd>
            <dt className="text-muted-foreground">{fullAppsT("inboxUi.groupType")}</dt>
            <dd className="text-foreground">{connectionTransportLabel(connection.transport)}</dd>
          </dl>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function DangerZone({
  appName,
  connection,
  galleryEntry = null,
  removing,
  onRemove,
  onReplaced,
  canReplaceCredential = true,
  credentialUnavailableMessage = fullAppsT("fullApps.you_don_t_have_permission_to_replace_this_identity_s_8b6a0a"),
  toggleDisabled = false,
  onToggleConnection,
  identityGrant = null,
  identityCurrentUserId = null,
  identityProviderName = appName,
  credentialPolicy,
  identityActionPending = false,
  onReconnectIdentity,
  onRevokeIdentity,
}: {
  appName: string;
  connection?: ToolConnection;
  galleryEntry?: AppDefinition | null;
  removing: boolean;
  onRemove: () => void;
  onReplaced?: () => void;
  canReplaceCredential?: boolean;
  credentialUnavailableMessage?: string;
  toggleDisabled?: boolean;
  onToggleConnection?: () => void;
  identityGrant?: ConnectionGrant | null;
  identityCurrentUserId?: string | null;
  identityProviderName?: string;
  credentialPolicy?: ToolConnectionCredentialPolicy;
  identityActionPending?: boolean;
  onReconnectIdentity?: () => void;
  onRevokeIdentity?: (grant: ConnectionGrant) => void;
}) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ConnectionGrant | null>(null);
  const paused = connection
    ? connection.enabled === false || connection.status === "disabled"
    : false;
  const methodUnavailable = connection ? connectionMethodUnavailable(connection, galleryEntry) : false;

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setConfirming(false);
      }}
      asChild
    >
      <section>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 py-1 text-left"
          >
            <span className="min-w-0 flex-1 text-sm font-medium text-destructive">{fullAppsT("skillsGap.dangerZone")}</span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 divide-y divide-border border-t border-border">
            {connection && onToggleConnection ? (
              <div className="flex items-center justify-between gap-4 py-4">
                <h2 className="text-sm font-medium text-foreground">{fullAppsT("fullApps.pause_connection_722c18")}</h2>
                <ToggleSwitch
                  aria-label={fullAppsT("fullApps.pause_connection_722c18")}
                  checked={paused}
                  disabled={toggleDisabled}
                  onCheckedChange={onToggleConnection}
                  size="lg"
                />
              </div>
            ) : null}

            {connection && !methodUnavailable && connection.authKind !== "oauth" ? (
              <div className="py-4">
                <KeySection
                  connection={connection}
                  galleryEntry={galleryEntry}
                  onReplaced={onReplaced ?? (() => undefined)}
                  canReplace={canReplaceCredential}
                  unavailableMessage={credentialUnavailableMessage}
                />
              </div>
            ) : null}

            {connection?.authKind === "oauth" && !methodUnavailable && (onReconnectIdentity || !canReplaceCredential) ? (
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{fullAppsT("fullApps.reconnect_bf8a9e")}</p>
                  <p className="text-xs text-muted-foreground">
                    {canReplaceCredential
                      ? fullAppsT("fullApps.sign_in_to_again_50a8a2", { value1: identityProviderName })
                      : credentialUnavailableMessage}
                  </p>
                </div>
                {canReplaceCredential && onReconnectIdentity ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={identityActionPending}
                    onClick={onReconnectIdentity}
                  ><FullAppsTrans i18nKey="fullApps.reconnect_28b1d8" components={{ part1: <>{identityActionPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}</> }} /></Button>
                ) : null}
              </div>
            ) : null}

            {identityGrant?.capabilities?.canRevoke
              && identityGrant.status !== "revoked"
              && onRevokeIdentity ? (
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fullAppsT("fullApps.revoke_identity_c85342")}</p>
                    <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.disconnect_the_identity_currently_used_by_this_app_fa1ff4")}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRevokeTarget(identityGrant)}
                  >{fullAppsT("taskProperties.share.revoke")}</Button>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{fullAppsT("fullApps.remove_this_app_83be39")}</p>
                <p className="text-xs text-muted-foreground">
                  {fullAppsT("fullApps.deletes_credentials_for_and_removes_agent_access_rec_6516ea", { value1: appName })}
                </p>
              </div>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={removing}>{fullAppsT("fullApps.cancel_19766e")}</Button>
                  <Button variant="destructive" size="sm" onClick={onRemove} disabled={removing}><FullAppsTrans i18nKey="fullApps.yes_remove_it_5c78a2" components={{ part1: <>{removing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}</> }} /></Button>
                </div>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>{fullAppsT("fullApps.remove_app_2ce428")}</Button>
              )}
            </div>
          </div>
        </CollapsibleContent>

        {revokeTarget && credentialPolicy ? (
          <RevokeGrantDialog
            grant={revokeTarget}
            providerName={identityProviderName}
            pending={identityActionPending}
            credentialPolicy={credentialPolicy}
            isOwnIdentity={revokeTarget.kind === "user" && revokeTarget.subjectUserId === identityCurrentUserId}
            onCancel={() => setRevokeTarget(null)}
            onConfirm={() => {
              onRevokeIdentity?.(revokeTarget);
              setRevokeTarget(null);
            }}
          />
        ) : null}
      </section>
    </Collapsible>
  );
}

export function connectionAddress(connection: ToolConnection): string {
  const config = connection.config ?? connection.transportConfig ?? {};
  const value = config.url ?? config.endpoint ?? config.remoteUrl;
  if (typeof value === "string" && value.trim().length > 0) return redactUrlSecrets(value);
  if (connection.transport === "local_stdio") return fullAppsT("fullApps.local_command_9b0898");
  return fullAppsT("fullApps.not_set_4895f7");
}

export function connectionTransportLabel(transport: ToolConnection["transport"]): string {
  if (transport === "mcp_remote") return fullAppsT("fullApps.remote_http_3dd421");
  if (transport === "local_stdio") return fullAppsT("fullApps.local_command_9b0898");
  return fullAppsT("fullApps.caption_b764cdc0ea");
}
