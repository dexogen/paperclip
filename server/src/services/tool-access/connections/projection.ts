import { redactedVercelGrant } from "../vercel-credentials.js";
import { connectionPurposeTransportSchema } from "@paperclipai/shared";
import { connectionGrants, toolConnectionInstalls, toolConnections } from "@paperclipai/db";
import type { ToolConnection, ToolConnectionInstall } from "@paperclipai/shared";
import { isRetiredComposioConnection, RETIRED_COMPOSIO_MESSAGE } from "@paperclipai/shared";

/** A marker is valid only for the same owned GitHub health observation. */
export function githubHealthDisplay(row: Pick<typeof toolConnections.$inferSelect, "config" | "healthMessage" | "healthCheckedAt">): ToolConnection["healthMessageDisplay"] {
  const value = row.config && Object.hasOwn(row.config, "paperclipHealthDisplay") ? row.config.paperclipHealthDisplay : null;
  if (row.config?.sourceTemplateKey !== "github" || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const marker = value as Record<string, unknown>;
  if (!["source", "version", "code", "message", "checkedAt"].every(key => Object.hasOwn(marker, key)) ||
      marker.source !== "paperclip-github" || marker.version !== 1 || marker.message !== row.healthMessage ||
      !(row.healthCheckedAt instanceof Date) || marker.checkedAt !== row.healthCheckedAt.toISOString() ||
      (marker.code !== "installation_suspended" && marker.code !== "installation_required")) return undefined;
  return { source: "paperclip-github", version: 1, code: marker.code };
}

export function toConnection(row: typeof toolConnections.$inferSelect): ToolConnection {
  connectionPurposeTransportSchema.parse(row);
  const retired = isRetiredComposioConnection(row);
  return {
    id: row.id,
    companyId: row.companyId,
    applicationId: row.applicationId,
    name: row.name,
    uid: row.uid,
    connectionKind: row.connectionKind,
    connectionPurpose: row.connectionPurpose,
    ownership: row.ownership,
    transport: row.transport,
    authKind: row.authKind,
    credentialSource: row.credentialSource,
    externalCredential: row.externalCredential ?? null,
    credentialPolicy: row.credentialPolicy,
    status: row.status,
    enabled: row.enabled && !retired,
    agentInstructions: row.agentInstructions ?? null,
    config: row.config ?? {},
    transportConfig: row.transportConfig ?? {},
    credentialRefs: row.credentialRefs ?? [],
    credentialSecretRefs: row.credentialSecretRefs ?? [],
    healthStatus: retired ? "error" : row.healthStatus,
    healthMessage: retired ? RETIRED_COMPOSIO_MESSAGE : row.healthMessage,
    ...(!retired && githubHealthDisplay(row) ? { healthMessageDisplay: githubHealthDisplay(row) } : {}),
    healthCheckedAt: row.healthCheckedAt,
    lastHealthAt: row.lastHealthAt,
    lastCatalogRefreshAt: row.lastCatalogRefreshAt,
    lastError: row.lastError,
    createdByAgentId: row.createdByAgentId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toConnectionGrant(row: typeof connectionGrants.$inferSelect) {
  return {
    ...row,
    externalCredential: redactedVercelGrant(row.externalCredential),
  };
}

export function toConnectionInstall(
  row: typeof toolConnectionInstalls.$inferSelect,
): ToolConnectionInstall {
  return {
    id: row.id,
    companyId: row.companyId,
    connectionId: row.connectionId,
    targetType: row.targetType,
    targetId: row.targetId,
    createdByAgentId: row.createdByAgentId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}
