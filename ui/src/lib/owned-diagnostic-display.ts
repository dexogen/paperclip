import type { AdapterEnvironmentCheck } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { ApiError } from "@/api/client";
import { i18n } from "@/i18n";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Closed producer descriptors never authorize translating arbitrary provider text. */
export function formatOwnedDiagnostic(raw: string, descriptor: unknown, t: TFunction): string {
  const value = record(descriptor);
  if (!value || !["source", "version", "code"].every(key => Object.hasOwn(value, key)) || value.version !== 1) return raw;
  const en = i18n.getFixedT("en");
  const translate = (source: string, localized: string) => raw === source ? localized : raw;
  if (value.source === "paperclip-project-git") {
    switch (value.code) {
      case "credential_unavailable": return translate(en("ownedDiagnostic.projectGit.credential_unavailable"), t("ownedDiagnostic.projectGit.credential_unavailable"));
      case "project_not_found": return translate(en("ownedDiagnostic.projectGit.project_not_found"), t("ownedDiagnostic.projectGit.project_not_found"));
      case "own_authorization_required": return translate(en("ownedDiagnostic.projectGit.own_authorization_required"), t("ownedDiagnostic.projectGit.own_authorization_required"));
      case "host_operation_required": return translate(en("ownedDiagnostic.projectGit.host_operation_required"), t("ownedDiagnostic.projectGit.host_operation_required"));
      case "repository_required": return translate(en("ownedDiagnostic.projectGit.repository_required"), t("ownedDiagnostic.projectGit.repository_required"));
      case "foreground_identity_incomplete": return translate(en("ownedDiagnostic.projectGit.foreground_identity_incomplete"), t("ownedDiagnostic.projectGit.foreground_identity_incomplete"));
      case "active_run_unavailable": return translate(en("ownedDiagnostic.projectGit.active_run_unavailable"), t("ownedDiagnostic.projectGit.active_run_unavailable"));
      case "consent_required": return translate(en("ownedDiagnostic.projectGit.consent_required"), t("ownedDiagnostic.projectGit.consent_required"));
      case "authorization_unavailable": return translate(en("ownedDiagnostic.projectGit.authorization_unavailable"), t("ownedDiagnostic.projectGit.authorization_unavailable"));
      case "project_untrusted": return translate(en("ownedDiagnostic.projectGit.project_untrusted"), t("ownedDiagnostic.projectGit.project_untrusted"));
      case "repository_not_authorized": return translate(en("ownedDiagnostic.projectGit.repository_not_authorized"), t("ownedDiagnostic.projectGit.repository_not_authorized"));
      case "reconnect_required": return translate(en("ownedDiagnostic.projectGit.reconnect_required"), t("ownedDiagnostic.projectGit.reconnect_required"));
    }
  }
  if (value.source === "paperclip-github") {
    switch (value.code) {
      case "installation_suspended": return translate(en("ownedDiagnostic.github.installation_suspended"), t("ownedDiagnostic.github.installation_suspended"));
      case "installation_required": return translate(en("ownedDiagnostic.github.installation_required"), t("ownedDiagnostic.github.installation_required"));
    }
  }
  return raw;
}

export function formatOwnedApiError(error: Error, t: TFunction = i18n.t.bind(i18n)): string {
  if (!(error instanceof ApiError)) return error.message;
  const body = record(error.body);
  const details = body && Object.hasOwn(body, "details") ? record(body.details) : null;
  return formatOwnedDiagnostic(error.message, details && Object.hasOwn(details, "displayMessage") ? details.displayMessage : null, t);
}

/** Codex owns the retirement hint, but the native failure and raw detail remain provider data. */
export function formatCodexProbeField(check: AdapterEnvironmentCheck, field: "message" | "hint", t: TFunction): string | null | undefined {
  const raw = check[field];
  if (typeof raw !== "string" || !Object.hasOwn(check, "codexRetirement")) return raw;
  const metadata = record(check.codexRetirement);
  if (!metadata || !["source", "version", "model", "retiredOn", "replacement"].every(key => Object.hasOwn(metadata, key)) ||
      metadata.source !== "paperclip-codex" || metadata.version !== 1 ||
      typeof metadata.model !== "string" || typeof metadata.retiredOn !== "string" || typeof metadata.replacement !== "string") return raw;
  const reviewed: Record<string, { retiredOn: string; replacement: string }> = {
    "gpt-5.5": { retiredOn: "2026-10-14", replacement: "gpt-6.1-sol (gpt-6-luna on Free and Go plans)" },
    "gpt-5.4": { retiredOn: "2026-08-31", replacement: "gpt-6-sol" },
    "gpt-5.4-mini": { retiredOn: "2026-08-31", replacement: "gpt-6-luna" },
  };
  if (!Object.hasOwn(reviewed, metadata.model)) return raw;
  const known = reviewed[metadata.model]!;
  if (metadata.retiredOn !== known.retiredOn || metadata.replacement !== known.replacement) return raw;
  const en = i18n.getFixedT("en");
  if (field === "message") {
    return check.code === "codex_hello_probe_model_rejected" && raw === en("ownedDiagnostic.codex.rejected", { model: metadata.model })
      ? t("ownedDiagnostic.codex.rejected", { model: metadata.model }) : raw;
  }
  if (!["codex_hello_probe_model_rejected", "codex_hello_probe_failed", "codex_hello_probe_auth_required", "codex_hello_probe_timeout"].includes(check.code) ||
      raw !== en("ownedDiagnostic.codex.retired", { model: metadata.model, date: metadata.retiredOn, replacement: metadata.replacement })) return raw;
  return t("ownedDiagnostic.codex.retired", {
    model: metadata.model, date: metadata.retiredOn,
    replacement: metadata.model === "gpt-5.5" ? t("ownedDiagnostic.codex.solReplacement") : metadata.replacement,
  });
}
