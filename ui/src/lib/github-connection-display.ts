import type { TFunction } from "i18next";
import { getConnectableAppDefinition, type AppDefinition, type ConnectionMethodDef } from "@paperclipai/shared";
import { i18n } from "@/i18n";

const english: TFunction = i18n.getFixedT("en");
// The raw registry label differs from the existing visible "Your GitHub key" caption.
const REVIEWED_TOKEN_FIELD_LABEL = "GitHub token";

function ownsGitHubMethod(entry: AppDefinition, method: ConnectionMethodDef): boolean {
  return entry.slug === "github"
    && !entry.aiConnectionRouter
    && entry.methods.includes(method)
    && (entry === getConnectableAppDefinition("github")
      || (entry.displaySource?.registry === "paperclip-app-definitions" && entry.displaySource.version === 1));
}

export function githubConnectionMethodLabel(entry: AppDefinition, method: ConnectionMethodDef, t: TFunction): string | undefined {
  if (!ownsGitHubMethod(entry, method)) return method.label;
  switch (method.key) {
    case "managed": return method.label === english("githubSetupUi.registry.managed") ? t("githubSetupUi.registry.managed") : method.label;
    case "mcp-key": return method.label === english("githubSetupUi.registry.token") ? t("githubSetupUi.registry.token") : method.label;
    case "copilot-token": return method.label === english("githubSetupUi.registry.copilot") ? t("githubSetupUi.registry.copilot") : method.label;
    default: return method.label;
  }
}

export function githubConnectionFieldLabel(entry: AppDefinition, method: ConnectionMethodDef | null, fieldKey: string, t: TFunction): string | null {
  const field = method?.credentialFields?.find(candidate => candidate.key === fieldKey);
  if (!method || !field || !ownsGitHubMethod(entry, method)) return null;
  if (method.key !== "mcp-key" || fieldKey !== "authorization") return null;
  return field.label === REVIEWED_TOKEN_FIELD_LABEL ? t("githubSetupUi.registry.keyLabel") : field.label;
}

export function githubConnectionFieldHelp(entry: AppDefinition, method: ConnectionMethodDef | null, fieldKey: string, t: TFunction): string | undefined {
  const field = method?.credentialFields?.find(candidate => candidate.key === fieldKey);
  if (!method || !field || !ownsGitHubMethod(entry, method)) return field?.helperMd;
  return method.key === "mcp-key" && fieldKey === "authorization" && field.helperMd === english("githubSetupUi.registry.keyHelp")
    ? t("githubSetupUi.registry.keyHelp") : field.helperMd;
}
