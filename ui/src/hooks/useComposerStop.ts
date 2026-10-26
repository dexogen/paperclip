import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { useRef, useState } from "react";

/** Keeps stop requests independent of draft submission and prevents double clicks. */
export function useComposerStop(onStop?: () => Promise<void>, pending = false, t: TFunction = i18n.getFixedT("en")) {
  const inFlight = useRef(false);
  const [stopping, setStopping] = useState(false);
  const [errorState, setError] = useState<{ message: string } | { fallback: true } | null>(null);
  const error = errorState ? "message" in errorState ? errorState.message : t("taskChatUi.composer.stopFailed") : null;

  async function stop() {
    if (!onStop || inFlight.current || pending) return;
    inFlight.current = true;
    setStopping(true);
    setError(null);
    try {
      await onStop();
    } catch (err) {
      setError(
        err instanceof Error ? { message: err.message } : { fallback: true },
      );
    } finally {
      inFlight.current = false;
      setStopping(false);
    }
  }

  return { stop, stopping: stopping || pending, error };
}
