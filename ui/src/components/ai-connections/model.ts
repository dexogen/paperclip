import { i18n, t } from "@/i18n";
import type { TFunction } from "i18next";
/** Redacted presentation contracts shared with the production API. */
import type { AiProvider, AiAuthMethod, AiManagedConnectionSummary, AiConnectionBinding } from "@paperclipai/shared";
export type { AiProvider, AiAuthMethod, AiConnectionBinding } from "@paperclipai/shared";
export type AiConnectionStatus = AiManagedConnectionSummary["status"];

export const AI_PROVIDERS: Record<
  AiProvider,
  { name: string; subscriptionName?: string; logo?: string }
> = {
  github: { name: "GitHub Copilot", logo: "/brands/apps/github.svg" },
  google: { name: "Google", logo: "/brands/apps/google.svg" },
  anthropic: {
    name: "Claude",
    subscriptionName: "Claude subscription",
    logo: "/brands/claude-color.svg",
  },
  openai: {
    name: "OpenAI",
    subscriptionName: "ChatGPT subscription",
    logo: "/brands/codex-color.svg",
  },
  openrouter: { name: "OpenRouter", logo: "/brands/apps/openrouter.svg" },
  xai: {
    name: "Grok",
    subscriptionName: "Grok subscription",
    logo: "/brands/adapters/grok.svg",
  },
};

export type AiConnectionSummary = Omit<AiManagedConnectionSummary, "isDefault"> & { isDefault?: boolean };

export interface AiConnectionRequirement {
  companyId: string;
  provider: AiProvider;
  method?: AiAuthMethod;
}

export const AI_CONNECTION_STATUS: Record<AiConnectionStatus, string> = {
  connected: "Connected",
  needs_attention: "Needs attention",
  expired: "Expired",
  revoked: "Revoked",
};

export function defaultAiConnectionName(ownerName: string | undefined, provider: AiProvider, method: AiAuthMethod) {
  const owner = ownerName?.trim();
  const prefix = owner && owner !== "You" ? `${owner}'s` : "My";
  const providerName = method === "subscription"
    ? AI_PROVIDERS[provider].subscriptionName ?? AI_PROVIDERS[provider].name
    : `${AI_PROVIDERS[provider].name} API`;
  return `${prefix} ${providerName} account`;
}

export function aiMethodLabel(provider: AiProvider, method: AiAuthMethod) {
  if (method === "subscription") {
    switch (provider) {
      case "anthropic": return t("upstreamGap.claudeSubscription");
      case "openai": return t("upstreamGap.chatGptSubscription");
      case "xai": return t("upstreamGap.grokSubscription");
      default: return t("upstreamGap.subscriptionUnavailable");
    }
  }
  return provider === "github"
    ? t("upstreamGap.personalAccessToken")
    : t("providerSetup.credentials.apiKey");
}

export function aiConnectionDisplayLabel(connection: AiConnectionSummary) {
  const personal = connection.ownership === "personal";
  return [
    connection.name,
    aiMethodLabel(connection.provider, connection.method),
    personal ? t("upstreamGap.connectionPersonal") : t("upstreamGap.connectionCompanyShared"),
    connection.accountLabel || connection.ownerName,
  ].filter(Boolean).join(" · ");
}

export function matchesAiRequirement(
  connection: AiConnectionSummary,
  requirement: AiConnectionRequirement,
) {
  return (
    connection.companyId === requirement.companyId &&
    connection.provider === requirement.provider &&
    (requirement.method === undefined || connection.method === requirement.method)
  );
}

export function personalAiDefault(
  connections: AiConnectionSummary[],
  requirement: AiConnectionRequirement,
  userId: string,
) {
  // Never choose another account because the declared default is unhealthy.
  return connections.find(
    (connection) =>
      matchesAiRequirement(connection, { ...requirement, method: undefined }) &&
      connection.ownership === "personal" &&
      connection.ownerUserId === userId &&
      connection.isDefault,
  );
}

export function aiConnectionProblem(connection?: AiConnectionSummary) {
  if (!connection)
    return t("providerSetup.select.noneSelected");
  return (
    connection.unavailableReason ??
    (connection.status === "connected"
      ? null
      : connection.status === "needs_attention"
        ? t("providerSetup.select.needsAttention")
        : connection.status === "expired"
          ? t("providerSetup.select.expired")
          : t("providerSetup.select.revoked"))
  );
}

export function bindingProblem(
  binding: AiConnectionBinding,
  requirement: AiConnectionRequirement,
  connections: AiConnectionSummary[],
  userId: string,
  _agentId: string,
  t: TFunction = i18n.getFixedT("en"),
) {
  if (
    binding.provider !== requirement.provider ||
    (binding.mode !== "responsible_user" && requirement.method !== undefined && binding.method !== requirement.method)
  )
    return t("agentBulkUi.binding.compatible");
  if (binding.mode === "responsible_user")
    return aiConnectionProblem(
      personalAiDefault(connections, requirement, userId),
    );
  const connection = connections.find(
    (item) =>
      item.id === binding.connectionId &&
      item.grantId === binding.grantId &&
      item.method === binding.method &&
      matchesAiRequirement(item, requirement),
  );
  if (!connection)
    return t("agentBulkUi.binding.missing");
  if (binding.mode === "shared" && connection.ownership !== "shared")
    return t("agentBulkUi.binding.shared");
  if (
    binding.mode === "delegated" &&
    (connection.ownership !== "personal" ||
      connection.ownerUserId !== userId)
  )
    return t("agentBulkUi.binding.delegated");
  return aiConnectionProblem(connection);
}
