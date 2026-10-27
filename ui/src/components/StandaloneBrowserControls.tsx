import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, i18n as fullSharedI18n, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOptionalToastActions } from "../context/ToastContext";
import { CHROMELESS_DISPLAY_MODES, isChromelessDisplayMode } from "../lib/pwa-display-mode";
import { copyTextToClipboard } from "../lib/clipboard";

function ControlButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void | Promise<void>;
}) {
  useFullSharedTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={label}
          onClick={() => void onClick()}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function StandaloneBrowserControls({ mobile }: { mobile: boolean }) {
  useFullSharedTranslation();
  const [chromeless, setChromeless] = useState(() =>
    typeof window !== "undefined" && mobile ? isChromelessDisplayMode() : false,
  );
  const toastActions = useOptionalToastActions();

  useEffect(() => {
    if (!mobile || typeof window === "undefined") {
      setChromeless(false);
      return;
    }

    const update = () => setChromeless(isChromelessDisplayMode());

    update();
    if (typeof window.matchMedia !== "function") return;

    const mediaQueries = CHROMELESS_DISPLAY_MODES.map((mode) => window.matchMedia(`(display-mode: ${mode})`));
    if (mediaQueries.every((media) => typeof media.addEventListener === "function")) {
      mediaQueries.forEach((media) => media.addEventListener("change", update));
      return () => mediaQueries.forEach((media) => media.removeEventListener("change", update));
    }

    mediaQueries.forEach((media) => media.addListener(update));
    return () => mediaQueries.forEach((media) => media.removeListener(update));
  }, [mobile]);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title || "Paperclip", url });
        return;
      }
      await copyTextToClipboard(url);
      toastActions?.pushToast({ title: fullSharedT("skillsGap.linkCopied"), tone: "success" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toastActions?.pushToast({ title: fullSharedT("fullShared.share_failed_609fbf"), body: fullSharedTailT("fullSharedTail.display_2eca68636dab"), tone: "error" });
    }
  }, [fullSharedI18n.language, toastActions]);

  const openInBrowser = useCallback(() => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }, []);

  if (!mobile || !chromeless) return null;

  return (
    <div className="flex h-10 items-center justify-end gap-1 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <ControlButton label={fullSharedT("externalAgentUi.common.refresh")} onClick={refresh}>
        <RefreshCw className="h-4 w-4" />
      </ControlButton>
      <ControlButton label={fullSharedT("fullShared.share_29887a")} onClick={share}>
        <Share2 className="h-4 w-4" />
      </ControlButton>
      <ControlButton label={fullSharedT("fullShared.open_in_browser_32f8dc")} onClick={openInBrowser}>
        <ExternalLink className="h-4 w-4" />
      </ControlButton>
    </div>
  );
}
