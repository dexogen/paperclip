import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { StopVerificationError } from "@/lib/wait-for-stopped-runs";

/** Keeps stop requests independent of draft submission and prevents double clicks. */
export function useComposerStop(onStop?: () => Promise<void>, pending = false, confirmedStoppedRunIds?: ReadonlySet<string>, t: TFunction = i18n.getFixedT("en")) {
  const inFlight = useRef(false);
  const [stopping, setStopping] = useState(false);
  const [failure, setFailure] = useState<{ message?: string; fallback?: true; runIds?: readonly string[] } | null>(null);
  useEffect(() => {
    if (failure?.runIds?.length && failure.runIds.every((id) => confirmedStoppedRunIds?.has(id))) {
      // A queued effect from an older attempt must not clear a newer failure.
      setFailure((current) => current === failure ? null : current);
    }
  }, [failure, confirmedStoppedRunIds]);

  async function stop() {
    if (!onStop || inFlight.current || pending) return;
    inFlight.current = true;
    setStopping(true);
    setFailure(null);
    try {
      await onStop();
    } catch (err) {
      setFailure({ ...(err instanceof Error ? { message: err.message } : { fallback: true }),
        ...(err instanceof StopVerificationError ? { runIds: err.runIds } : {}) });
    } finally {
      inFlight.current = false;
      setStopping(false);
    }
  }

  return { stop, stopping: stopping || pending, error: failure ? failure.message ?? t("taskChatUi.composer.stopFailed") : null };
}
