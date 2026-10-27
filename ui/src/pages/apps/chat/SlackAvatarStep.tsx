import { AppDisplayError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useId, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SlackAvatarProps {
  agentName: string;
  appName: string;
  avatarUrl: string;
}

/** Manual fallback shared by Slack onboarding and its Settings page. */
export function SlackAvatarContent({
  agentName,
  appName,
  avatarUrl,
  compact = false,
}: SlackAvatarProps & { compact?: boolean }) {
  useFullAppsTranslation();
  const id = useId();
  const filename = `${appName.replace(/[^a-zA-Z0-9_-]+/g, "-") || "agent"}-avatar.png`;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(avatarUrl);
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/png")
      )
        throw new AppDisplayError("fullApps.avatar_unavailable_cc96f4");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="space-y-8">
      <section
        aria-labelledby={`${id}-download`}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"
      >
        <img
          src={avatarUrl}
          width={512}
          height={512}
          alt={fullAppsT("fullApps.s_cliptoon_avatar_7788fc", { value1: agentName })}
          className="size-40 shrink-0 rounded-lg bg-muted object-contain"
        />
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 id={`${id}-download`} className="text-sm font-semibold">
              {compact
                ? fullAppsT("fullApps.download_your_agent_s_avatar_ce5bdd")
                : fullAppsT("fullApps.1_download_your_agent_s_avatar_fc5927")}
            </h2>
            <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.png_512_512_ready_for_slack_143925")}</p>
          </div>
          <Button variant="outline" asChild>
            <a
              href={avatarUrl}
              download={filename}
              aria-disabled={downloading}
              onClick={(event) => {
                event.preventDefault();
                void download();
              }}
            ><FullAppsTrans i18nKey="fullApps.download_avatar_dc4445" components={{ part1: <>{downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}</> }} /></a>
          </Button>
          {downloadError && (
            <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_download_the_avatar_try_downloading_it_agai_f77ab7")}</p>
          )}
        </div>
      </section>

      <details open={compact ? undefined : true} className="space-y-4">
        <summary
          className={
            compact
              ? "cursor-pointer text-sm underline underline-offset-4"
              : "hidden"
          }
        >{fullAppsT("fullApps.how_to_upload_in_slack_68a703")}</summary>
        <section aria-labelledby={`${id}-upload`} className="space-y-4">
          <div className="space-y-1">
            <h2 id={`${id}-upload`} className="text-sm font-semibold">
              {compact ? fullAppsT("fullApps.upload_it_in_slack_9ef6fd") : fullAppsT("fullApps.2_upload_it_in_slack_733c83")}
            </h2>
            <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.you_ll_upload_the_downloaded_image_directly_in_slack_19c451")}</p>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >{fullAppsT("fullApps.open_slack_app_settings_30cfde")}{" "}
                <ExternalLink className="inline size-3" />
              </a>{" "}{fullAppsT("fullApps.and_choose_566c1f")} <strong>{appName}</strong>.
            </li>
            <li><FullAppsTrans i18nKey="fullApps.choose_then_scroll_to_032211" components={{ part1: <strong>Basic Information</strong>, part2: <>{" "}</>, part3: <strong>Display Information</strong> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.under_click_the_app_icon_and_upload_115b04" components={{ part1: <strong>App icon &amp; Preview</strong>, part2: <>{" "}</>, part3: <span className="break-all font-mono text-xs">{filename}</span> }} /></li>
            <li><FullAppsTrans i18nKey="fullApps.confirm_the_crop_then_click_in_slack_1082c7" components={{ part1: <strong>Save Changes</strong> }} /></li>
          </ol>
        </section>
      </details>
    </div>
  );
}


export function SlackAvatarSettings(props: SlackAvatarProps) {
  useFullAppsTranslation();
  return (
    <section className="space-y-4" aria-label={fullAppsT("fullApps.slack_avatar_761226")}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{fullAppsT("fullApps.agent_avatar_fb65e8")}</h2>
        <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.use_s_avatar_so_your_team_recognizes_the_agent_bbeff6" components={{ part1: <>{props.agentName}</> }} /></p>
      </div>
      <SlackAvatarContent {...props} compact />
    </section>
  );
}
