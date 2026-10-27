import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { ChatEndpoint } from "@/api/chatEndpoints";
import { AgentAvatarDownload } from "@/components/AgentAvatarDownload";
import { GitHubSettingsDisclosure } from "./GitHubSettingsDisclosure";
import { CopyText } from "@/components/CopyText";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export function gitHubBotMention(endpoint: Pick<ChatEndpoint, "botUsername">) {
  const slug = endpoint.botUsername?.replace(/^@/, "").replace(/\[bot\]$/, "");
  return slug ? `@${slug}` : null;
}

export function gitHubAppSettingsUrl(endpoint: ChatEndpoint) {
  const github = endpoint.setup?.github;
  const slug = gitHubBotMention(endpoint)?.slice(1);
  if (!slug) return "https://github.com/settings/apps";
  if (github?.appOwnerType === "organization" && github.appOwnerLogin)
    return `https://github.com/organizations/${encodeURIComponent(github.appOwnerLogin)}/settings/apps/${encodeURIComponent(slug)}`;
  if (github?.appOwnerType === "personal")
    return `https://github.com/settings/apps/${encodeURIComponent(slug)}`;
  // Legacy manual connections may not record ownership type. Never assume it.
  return "https://github.com/settings/apps";
}

export function GitHubBotMention({ endpoint }: { endpoint: ChatEndpoint }) {
  useFullAppsTranslation();
  const mention = gitHubBotMention(endpoint);
  return mention ? (
    <CopyText
      text={mention}
      ariaLabel={fullAppsT("fullApps.copy_82f925a4e05e")}
      title={fullAppsT("fullApps.copy_github_mention_82f925")}
      className="break-all font-mono text-xs"
    >
      {mention}
    </CopyText>
  ) : null;
}

/** Optional provider-owned branding, shared by completion and management. */
export function GitHubAppBranding({
  endpoint,
  avatarUrl,
}: {
  endpoint: ChatEndpoint;
  avatarUrl?: string;
}) {
  useFullAppsTranslation();
  return (
    <GitHubSettingsDisclosure title={fullAppsT("fullApps.github_app_name_and_logo_b8dc68")}>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.change_the_name_or_upload_a_logo_in_the_app_s_displa_9b0ba1")}</p>
        <div className="flex flex-wrap items-center gap-3">
          {avatarUrl && (
            <>
              <img
                src={avatarUrl}
                alt={fullAppsT("fullApps.s_avatar_for_download_ec9de2", { value1: endpoint.assignedAgentName })}
                className="size-12 shrink-0 object-contain"
              />
              <AgentAvatarDownload
                avatarUrl={avatarUrl}
                name={endpoint.botLabel ?? endpoint.assignedAgentName}
              />
            </>
          )}
          <Button variant="outline" asChild>
            <a
              href={gitHubAppSettingsUrl(endpoint)}
              target="_blank"
              rel="noreferrer"
              aria-label={fullAppsT("fullApps.edit_app_name_and_logo_on_github_a2f0e5")}
            >{fullAppsT("fullApps.edit_on_github_8dbf35")}<ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.renaming_also_changes_its_mention_c236bc")}{" "}
          <Link
            className="underline underline-offset-4"
            to={`/apps/chat/connect?provider=github&resume=${endpoint.id}&reconnect=1`}
          >{fullAppsT("fullApps.reconnect_afterward_d13ca0")}</Link>{" "}{fullAppsT("fullApps.to_update_it_here_1bc5e0")}</p>
      </div>
    </GitHubSettingsDisclosure>
  );
}

/** Provider-owned branding actions live beside the App identity, not among review rules. */
export function GitHubAppIdentityActions({
  endpoint,
  avatarUrl,
}: {
  endpoint: ChatEndpoint;
  avatarUrl?: string;
}) {
  useFullAppsTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1">
      {avatarUrl && (
        <AgentAvatarDownload
          avatarUrl={avatarUrl}
          name={endpoint.botLabel ?? endpoint.assignedAgentName}
          iconOnly
        />
      )}
      <Button variant="ghost" size="sm" asChild>
        <a
          href={gitHubAppSettingsUrl(endpoint)}
          target="_blank"
          rel="noreferrer"
          aria-label={fullAppsT("fullApps.edit_app_name_and_logo_on_github_a2f0e5")}
          title={fullAppsT("fullApps.change_the_app_name_or_upload_its_logo_on_github_fcf24c")}
        >{fullAppsT("fullApps.edit_app_90fedb")}<ExternalLink className="size-3.5" />
        </a>
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <Link
          to={`/apps/chat/connect?provider=github&resume=${endpoint.id}&reconnect=1`}
          aria-label={fullAppsT("fullApps.refresh_github_app_identity_3538e9")}
          title={fullAppsT("fullApps.reconnect_after_renaming_the_app_to_refresh_its_ment_1f7827")}
        >
          <RefreshCw className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
