import { i18n, useTranslation } from "@/i18n";
import type { SecretAccessEvent } from "@paperclipai/shared";

/**
 * Delivery mode for an agent secret binding, derived from its `configPath`.
 *
 * The server (see `AGENT_ACCESS_CONFIG_PATH_PREFIX` in
 * `server/src/services/secrets.ts`) treats a binding's config path as the
 * source of truth for how a secret reaches the runtime:
 *  - `env.<KEY>`    — injected as an environment variable at run start.
 *  - `access.<ALIAS>` — fetched on demand via the run-bound agent API
 *                       (`GET /agents/me/secrets`), never written to the env.
 *  - anything else  — a generic adapter config path (rendered as "Config").
 */
export type SecretDeliveryMode = "env" | "api" | "config";

/** Prefix for env-var delivery config paths. Mirrors the server convention. */
export const ENV_CONFIG_PATH_PREFIX = "env.";
/** Prefix for API-access (no env var) delivery config paths. Mirrors the server's `AGENT_ACCESS_CONFIG_PATH_PREFIX`. */
export const AGENT_ACCESS_CONFIG_PATH_PREFIX = "access.";

/** Valid env-var name / access alias (matches the server's `ENV_KEY_RE`). */
export const SECRET_ALIAS_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function deliveryModeForConfigPath(configPath: string | null | undefined): SecretDeliveryMode {
  if (!configPath) return "config";
  if (configPath.startsWith(AGENT_ACCESS_CONFIG_PATH_PREFIX)) return "api";
  if (configPath.startsWith(ENV_CONFIG_PATH_PREFIX)) return "env";
  return "config";
}

/** Short human label for a delivery mode. */
export function deliveryModeLabel(mode: SecretDeliveryMode): string {
  switch (mode) {
    case "env":
      return i18n.t("fullRoutinesSecrets.envVar");
    case "api":
      return i18n.t("fullRoutinesSecrets.apiAccess");
    default:
      return i18n.t("fullRoutinesSecrets.config");
  }
}

/** One-line explanation of a delivery mode, for tooltips/hints. */
export function deliveryModeDescription(mode: SecretDeliveryMode): string {
  switch (mode) {
    case "env":
      return i18n.t("fullRoutinesSecrets.injectedAsAnEnvironmentVariableAtRunStart");
    case "api":
      return i18n.t("fullRoutinesSecrets.fetchedOnDemandViaTheRunBoundAgentAPI");
    default:
      return i18n.t("fullRoutinesSecrets.providedThroughAdapterConfiguration");
  }
}

/** The env KEY / access ALIAS carried by a config path (the part after the prefix). */
export function aliasFromConfigPath(configPath: string | null | undefined): string {
  if (!configPath) return "";
  if (configPath.startsWith(AGENT_ACCESS_CONFIG_PATH_PREFIX)) {
    return configPath.slice(AGENT_ACCESS_CONFIG_PATH_PREFIX.length);
  }
  if (configPath.startsWith(ENV_CONFIG_PATH_PREFIX)) {
    return configPath.slice(ENV_CONFIG_PATH_PREFIX.length);
  }
  return configPath;
}

/**
 * Human label for a secret access-event `consumerType`. Runtime consumers are
 * emitted as raw enum values (e.g. `agent_api`, `plugin_worker`) which read
 * poorly when merely capitalized; map the ones that need help explicitly.
 */
export function consumerTypeLabel(consumerType: SecretAccessEvent["consumerType"]): string {
  switch (consumerType) {
    case "agent": return i18n.t("fullRoutinesSecrets.consumerTypeAgent");
    case "project": return i18n.t("fullRoutinesSecrets.consumerTypeProject");
    case "environment": return i18n.t("fullRoutinesSecrets.consumerTypeEnvironment");
    case "routine": return i18n.t("fullRoutinesSecrets.consumerTypeRoutine");
    case "plugin": return i18n.t("fullRoutinesSecrets.consumerTypePlugin");
    case "issue": return i18n.t("fullRoutinesSecrets.consumerTypeIssue");
    case "run": return i18n.t("fullRoutinesSecrets.consumerTypeRun");
    case "system": return i18n.t("fullRoutinesSecrets.consumerTypeSystem");
    case "agent_api":
      return i18n.t("fullRoutinesSecrets.agentAPI");
    case "plugin_worker":
      return i18n.t("fullRoutinesSecrets.pluginWorker");
    case "tool_connection":
      return i18n.t("fullRoutinesSecrets.toolConnection");
    default: {
      const unknownType = String(consumerType);
      return unknownType.charAt(0).toUpperCase() + unknownType.slice(1);
    }
  }
}
