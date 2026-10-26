import { t } from "@/i18n";
import { AppDisplayError, appErrorDisplay, ownAppDisplayText, type AppDisplayText } from "@/pages/apps/app-display-text";

export const chatSetupErrorFallback =
  "Check the required values and provider access, then try again.";

function uriEncoded(value: string): string | null {
  try {
    return encodeURIComponent(value);
  } catch {
    // encodeURIComponent rejects malformed UTF-16 (for example, a lone
    // surrogate). The raw and JSON-escaped forms remain safe to redact.
    return null;
  }
}

export function sanitizedSetupErrorMessage(
  error: unknown,
  submittedValues: Record<string, string> | undefined,
): string {
  let message = error instanceof Error ? error.message.trim() : "";
  if (!message) return chatSetupErrorFallback;

  const submittedSecrets = Object.values(submittedValues ?? {})
    .flatMap((value) => {
      const trimmed = value.trim();
      return trimmed && trimmed !== value ? [value, trimmed] : [value];
    })
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  for (const secret of submittedSecrets) {
    const escapedSecret = JSON.stringify(secret).slice(1, -1);
    const candidates = new Set<string>([secret, escapedSecret]);
    const encodedSecret = uriEncoded(secret);
    if (encodedSecret) candidates.add(encodedSecret);
    for (const candidate of candidates) {
      message = message.replaceAll(candidate, "[redacted]");
    }
  }

  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 500) : chatSetupErrorFallback;
}

export function sanitizedSetupErrorDisplay(error: unknown, submittedValues: Record<string, string> | undefined): AppDisplayText {
  if (error instanceof AppDisplayError) return appErrorDisplay(error);
  return error instanceof Error && error.message.trim()
    ? sanitizedSetupErrorMessage(error, submittedValues)
    : ownAppDisplayText("fullApps.error_78996930d378");
}

const slackSetupDisplayKeys = {
  slack_managed_unavailable: "fullApps.slackError_slack_managed_unavailable",
  slack_manager_reauthorize: "fullApps.slackError_slack_manager_reauthorize",
  slack_approval_pending: "fullApps.slackError_slack_approval_pending",
  slack_approval_required: "fullApps.slackError_slack_approval_required",
  slack_approval_denied: "fullApps.slackError_slack_approval_denied",
  slack_configuration_token_invalid: "fullApps.slackError_slack_configuration_token_invalid",
  slack_manifest_invalid: "fullApps.slackError_slack_manifest_invalid",
  slack_manifest_update_pending: "fullApps.slackError_slack_manifest_update_pending",
  slack_setup_rate_limited: "fullApps.slackError_slack_setup_rate_limited",
  slack_setup_permission_denied: "fullApps.slackError_slack_setup_permission_denied",
  slack_creation_uncertain: "fullApps.slackError_slack_creation_uncertain",
  slack_install_declined: "fullApps.slackError_slack_install_declined",
  slack_install_expired: "fullApps.slackError_slack_install_expired",
  slack_install_failed: "fullApps.slackError_slack_install_failed",
  slack_install_identity_mismatch: "fullApps.slackError_slack_install_identity_mismatch",
  slack_install_scopes_missing: "fullApps.slackError_slack_install_scopes_missing",
  slack_bot_already_connected: "fullApps.slackError_slack_bot_already_connected",
  slack_install_token_invalid: "fullApps.slackError_slack_install_token_invalid",
  slack_configuration_incomplete: "fullApps.slackError_slack_configuration_incomplete",
  slack_install_account_missing: "fullApps.slackError_slack_install_account_missing",
  slack_install_account_conflict: "fullApps.slackError_slack_install_account_conflict",
} as const;

export function slackSetupErrorDisplay(code: string): string {
  return t(Object.hasOwn(slackSetupDisplayKeys, code) ? slackSetupDisplayKeys[code as keyof typeof slackSetupDisplayKeys] : "fullApps.slackErrorFallback");
}
