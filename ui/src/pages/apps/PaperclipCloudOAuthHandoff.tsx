import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigateTopLevel } from "@/lib/browserNavigation";
import {
  clearPendingCloudHandoff,
  prepareOAuthNavigation,
  readPendingCloudHandoff,
} from "@/lib/oauthHandoff";

export type ManagedOAuthHandoffPhase = "loading" | "reauthenticating" | "error";

export function ManagedOAuthHandoffState({
  phase,
  error,
  onRetry,
  onCancel,
}: {
  phase: ManagedOAuthHandoffPhase;
  error?: string | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  useFullAppsTranslation();
  const failed = phase === "error";
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex max-w-lg items-start gap-3">
        <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          {failed ? (
            <Link2 className="h-5 w-5 text-destructive" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">
            {failed ? fullAppsT("fullApps.sign_in_couldn_t_continue_a790c4") : fullAppsT("githubSetupUi.oauth.preparingTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {failed
              ? error ?? fullAppsT("fullApps.paperclip_couldn_t_prepare_the_provider_sign_in_try__4c14d5")
              : phase === "reauthenticating"
                ? fullAppsT("fullApps.your_paperclip_sign_in_is_being_refreshed_549710")
                : fullAppsT("fullApps.paperclip_is_opening_the_provider_securely_a6a543")}
          </p>
          {failed ? (
            <div className="mt-6 flex items-center gap-2">
              <Button type="button" onClick={onRetry}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
              <Button type="button" variant="ghost" onClick={onCancel}>{fullAppsT("fullApps.return_to_paperclip_7cb9e4")}</Button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** Fixed tenant landing used only after Paperclip Cloud refreshes login. */
export function PaperclipCloudOAuthHandoffPage() {
  useFullAppsTranslation();
  const [phase, setPhase] = useState<ManagedOAuthHandoffPhase>("loading");
  const [error, setError] = useState<AppDisplayText | null>(null);

  const resume = useCallback(async () => {
    const handoff = readPendingCloudHandoff();
    if (!handoff) {
      setPhase("error");
      setError(ownAppDisplayText("fullApps.this_sign_in_expired_return_to_paperclip_and_start_t_cc39fa"));
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      const target = await prepareOAuthNavigation({ authorizationUrl: "", handoff });
      if (target.kind === "reauthentication") {
        setPhase("error");
        setError(ownAppDisplayText("fullApps.paperclip_couldn_t_refresh_this_sign_in_try_again_to_9cc94d"));
        return;
      }
      clearPendingCloudHandoff();
      navigateTopLevel(target.url);
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? appErrorDisplay(caught) : ownAppDisplayText("fullApps.paperclip_couldn_t_prepare_secure_sign_in_6d9096"));
    }
  }, []);

  useEffect(() => {
    void resume();
  }, [resume]);

  return (
    <ManagedOAuthHandoffState
      phase={phase}
      error={renderAppDisplayText(error)}
      onRetry={() => void resume()}
      onCancel={() => {
        clearPendingCloudHandoff();
        navigateTopLevel("/");
      }}
    />
  );
}
