import { t as fullSharedTailT, Trans as FullSharedTailTrans, useTranslation as useFullSharedTailTranslation } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { AppLogo } from "@/pages/apps/AppLogo";
import { ConnectionChoiceList } from "@/features/connections/ConnectionChoiceList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AI_PROVIDERS,
  aiConnectionProblem,
  aiMethodLabel,
  bindingProblem,
  matchesAiRequirement,
  personalAiDefault,
  type AiConnectionBinding,
  type AiConnectionRequirement,
  type AiConnectionSummary,
} from "./model";

export interface AiConnectionPickerProps {
  requirement: AiConnectionRequirement;
  connections: AiConnectionSummary[];
  value?: AiConnectionBinding;
  currentUserId: string;
  agentId: string;
  agentName: string;
  loading?: boolean;
  error?: string;
  readOnly?: boolean;
  onChange: (binding: AiConnectionBinding) => void;
  onConnect: () => void;
  onReconnect?: () => void;
  onRetry?: () => void;
}

export function AiConnectionPicker({
  requirement,
  connections,
  value,
  currentUserId,
  agentId,
  loading,
  error,
  readOnly,
  onChange,
  onConnect,
  onReconnect,
  onRetry,
}: AiConnectionPickerProps) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const compatible = connections.filter((connection) =>
    matchesAiRequirement(connection, requirement),
  );
  const personalDefault = personalAiDefault(
    connections,
    requirement,
    currentUserId,
  );
  const problem = value ? bindingProblem(
    value,
    requirement,
    connections,
    currentUserId,
    agentId,
  ) : undefined;
  const select = (
    mode: "shared",
    connection: AiConnectionSummary,
  ) =>
    onChange({
      provider: requirement.provider,
      method: connection.method,
      mode,
      connectionId: connection.id,
      grantId: connection.grantId,
    });
  return (
    <section className="flex flex-col gap-4" aria-label={fullSharedT("providerSetup.accounts.aiConnection")}>
      <div className="flex items-center gap-3">
        <AppLogo
          name={AI_PROVIDERS[requirement.provider].name}
          brandKey={requirement.provider}
          logoUrl={AI_PROVIDERS[requirement.provider].logo}
          darkLogoUrl={requirement.provider === "xai" ? "/brands/adapters/grok-dark.svg" : undefined}
          size={32}
        />
        <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-semibold">{fullSharedT("providerSetup.accounts.aiConnection")}</h3>
        <p className="text-xs text-muted-foreground">
          {AI_PROVIDERS[requirement.provider].name}
          {value && value.mode !== "responsible_user" && ` · ${aiMethodLabel(value.provider, value.method)}`}
        </p>
        </div>
      </div>
      {loading ? (
        <div role="status" aria-label={fullSharedT("fullShared.loading_ai_connections_b38add")}>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>{fullSharedT("providerSetup.select.retry")}</Button>
          )}
        </div>
      ) : (
        <>
          <ConnectionChoiceList
            disabled={readOnly}
            selectedId={value?.mode === "responsible_user" ? "responsible_user" : value?.connectionId}
            choices={[
              { id: "responsible_user", name: fullSharedTailT("fullSharedTail.responsibleConnection"), description: <>
                <span className="block"><FullSharedTrans i18nKey="fullShared.for_you_1701c9" components={{ part1: <>{personalDefault?.name ?? fullSharedTailT("fullSharedTail.not_connected_0303e1")}</> }} /></span>
                <span className="block"><FullSharedTrans i18nKey="fullShared.other_users_tasks_use_their_own_connection_91152e" components={{ part1: <>{AI_PROVIDERS[requirement.provider].name}</> }} /></span>
              </> },
              ...compatible.filter((connection) => connection.ownership === "shared").map((connection) => ({
                id: connection.id, name: connection.name,
                disabled: Boolean(aiConnectionProblem(connection)),
                description: <>{fullSharedTailT("fullSharedTail.sharedConnectionMethod", { method: aiMethodLabel(connection.provider, connection.method) })}{connection.accountLabel ? ` · ${connection.accountLabel}` : ""}{aiConnectionProblem(connection) ? ` · ${aiConnectionProblem(connection)}` : ""}</>,
              })),
            ]}
            onSelect={(id) => {
              if (id === "responsible_user") onChange({provider: requirement.provider, method: personalDefault?.method ?? requirement.method ?? ((requirement.provider === "openrouter" || requirement.provider === "github") ? "api_key" : "subscription"), mode: "responsible_user"});
              else { const connection = compatible.find((item) => item.id === id)!; select("shared", connection); }
            }}
          />
          {problem && (
            <p role="status" className="text-sm text-destructive">
              {problem}
            </p>
          )}
          {!readOnly && (
            <div className="flex justify-end gap-2">
              {onReconnect && <Button type="button" variant="outline" onClick={onReconnect}>{fullSharedT("fullShared.reconnect_account_8e44ff")}</Button>}
              <Button
                type="button"
                variant="outline"
                onClick={onConnect}
              >{fullSharedT("fullShared.connect_another_account_261b28")}</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
