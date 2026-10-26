import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import type { CloudInstanceHealthStatus } from "@/api/health";
import { cloudStackEntryUrl } from "@/lib/cloudLinks";
import { beginCloudSignIn, clearCloudSignInAttempt } from "@/lib/cloud-sign-in";
import { PaperclipLoading } from "@/components/AnimatedPaperclipIcon";
import { Button } from "@/components/ui/button";

export function CloudSignIn({ cloud, returnTo }: { cloud: CloudInstanceHealthStatus; returnTo: string }) {
  useFullSharedTranslation();
  const entryUrl = cloudStackEntryUrl(cloud.cloudBaseUrl, cloud.stackSlug, returnTo);
  const started = useRef(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!entryUrl || started.current) return;
    started.current = true;
    setBlocked(!beginCloudSignIn(entryUrl));
  }, [entryUrl]);

  if (entryUrl && !blocked) return <PaperclipLoading />;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">{fullSharedT("fullShared.sign_in_to_paperclip_cloud_64837f")}</h1>
      <p role="alert" className="text-sm text-muted-foreground">
        {entryUrl
          ? fullSharedT("fullShared.we_couldn_t_restore_your_session_continue_to_papercl_9c9ff4")
          : fullSharedT("fullShared.cloud_sign_in_is_unavailable_for_this_workspace_plea_7fcc00")}
      </p>
      {entryUrl && (
        <Button asChild>
          <a href={entryUrl} onClick={clearCloudSignInAttempt}>{fullSharedT("fullShared.continue_to_paperclip_cloud_1e94a7")}</a>
        </Button>
      )}
    </div>
  );
}
