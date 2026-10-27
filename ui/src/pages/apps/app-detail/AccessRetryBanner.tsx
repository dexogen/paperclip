import { formatOwnedDiagnostic, formatOwnedApiError } from "@/lib/owned-diagnostic-display";
import { useTranslation } from "@/i18n";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";

/** GitHub page that resolves a failed Refresh access, such as Unsuspend. */
function githubAccessRecoveryUrl(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== "object") return null;
  const details = (error.body as { details?: { code?: unknown; managementUrl?: unknown } }).details;
  if (details?.code !== "github_installation_required" || typeof details.managementUrl !== "string") return null;
  try {
    const url = new URL(details.managementUrl);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "github.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * A connection that needs attention without a new login: its saved health
 * message, a link to the GitHub page that fixes the last failed refresh, and a
 * retry.
 */
export function AccessRetryBanner({ message, displayMessage, error, pending, onRetry }: {
  message: string | null | undefined;
  displayMessage?: unknown;
  error: unknown;
  pending: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const recoveryUrl = githubAccessRecoveryUrl(error);
  const ownedError = error instanceof ApiError && error.message === message ? formatOwnedApiError(error, t) : null;
  const display = message ? (ownedError ?? formatOwnedDiagnostic(message, displayMessage, t)) : null;
  return (
    <div role="status">
      <p>{display || t("fullApps.github_access_could_not_be_checked_try_again_688543")}</p>
      {recoveryUrl ? (
        <Button asChild variant="outline">
          <a href={recoveryUrl} target="_blank" rel="noreferrer">{t("fullApps.githubInstallationSettings")}</a>
        </Button>
      ) : null}
      <Button variant="outline" disabled={pending} onClick={onRetry}>
        {t("fullApps.retry_access_e52222")}
      </Button>
    </div>
  );
}
