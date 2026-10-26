import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Mic, MicOff, Phone, PhoneOff, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const VOICE_CONTROL_STATES = ["idle", "connecting", "listening", "speaking", "working", "interrupted", "reconnecting", "ending", "ended", "failed", "cleanup_failed"] as const;
export type VoiceControlState = typeof VOICE_CONTROL_STATES[number];
const labels: Record<VoiceControlState, string> = {
  get idle() { return fullSharedTailT("fullSharedTail.display_7a799be12bbf"); }, get connecting() { return fullSharedTailT("fullSharedTail.display_54cf72a0ee8a"); }, get listening() { return fullSharedTailT("fullSharedTail.display_67fbda9b324a"); }, get speaking() { return fullSharedTailT("fullSharedTail.display_5353f137014d"); },
  get working() { return fullSharedTailT("fullSharedTail.display_0937c9b76760"); }, get interrupted() { return fullSharedTailT("fullSharedTail.display_cca402e77309"); }, get reconnecting() { return fullSharedTailT("fullSharedTail.display_ed787b232c79"); },
  get ending() { return fullSharedTailT("fullSharedTail.display_bd39e24f2467"); }, get ended() { return fullSharedTailT("fullSharedTail.display_105a6307a853"); }, get failed() { return fullSharedTailT("fullSharedTail.display_b4c628f6194e"); }, get cleanup_failed() { return fullSharedTailT("fullSharedTail.display_f25a38713d0e"); },
};
export interface VoiceControlsProps {
  state: VoiceControlState;
  agentName: string;
  muted?: boolean;
  busy?: boolean;
  playbackBlocked?: boolean;
  canRepeat?: boolean;
  onRepeat?: () => void;
  error?: string;
  announcement?: string;
  onStart: () => void;
  onMute: () => void;
  onEnd: () => void;
  onResumeAudio: () => void;
  className?: string;
}
export function VoiceControls({ state, agentName, muted = false, busy = false, playbackBlocked = false, canRepeat = false, onRepeat, error, announcement, onStart, onMute, onEnd, onResumeAudio, className }: VoiceControlsProps) {
  useFullSharedTranslation();
  const inactive = state === "idle" || state === "ended" || state === "failed";
  const connecting = state === "connecting" || state === "reconnecting";
  const startButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!inactive || !restoreFocus.current) return;
    restoreFocus.current = false;
    if (document.activeElement === document.body) startButton.current?.focus();
  }, [inactive]);
  return (
    <section aria-label={fullSharedT("fullShared.voice_conversation_with_0763d5", { value1: agentName })} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="break-words text-sm font-medium"><FullSharedTrans i18nKey="fullShared.talk_to_48db5f" components={{ part1: <>{agentName}</> }} /></h3>
        <p role="status" className="text-sm text-muted-foreground">{labels[state]}{muted && !inactive ? fullSharedTailT("fullSharedTail.muted") : ""}</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {inactive ? (
          <Button ref={startButton} size="sm" disabled={busy} onClick={onStart}><Phone aria-hidden="true" />{state === "failed" ? fullSharedT("fullShared.try_again_d8b839") : fullSharedT("fullShared.start_voice_21c7b3")}</Button>
        ) : (
          <>
            <Button size="sm" variant="outline" aria-pressed={muted} disabled={busy || connecting || state === "ending" || state === "cleanup_failed"} onClick={onMute}>
              {muted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}{muted ? fullSharedT("fullShared.unmute_ce4ee4") : fullSharedT("fullShared.mute_8dd685")}
            </Button>
            <Button size="sm" variant="outline" disabled={state === "ending"} onClick={() => { restoreFocus.current = true; onEnd(); }}><PhoneOff aria-hidden="true" />{state === "cleanup_failed" ? fullSharedT("fullShared.retry_ending_call_06ab01") : fullSharedT("fullShared.end_call_2fe13d")}</Button>
          </>
        )}
        {canRepeat && onRepeat && !inactive && <Button size="sm" variant="outline" disabled={busy || connecting || state === "ending" || state === "cleanup_failed"} onClick={onRepeat}><RotateCcw aria-hidden="true" />{fullSharedT("fullShared.repeat_answer_104ca3")}</Button>}
        {playbackBlocked && !inactive && <Button size="sm" variant="outline" onClick={onResumeAudio}><Volume2 aria-hidden="true" />{fullSharedT("fullShared.enable_audio_015a11")}</Button>}
      </div>
      {!inactive && <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.ending_the_call_keeps_your_task_running_speko_voice__ec6612")}</p>}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </section>
  );
}
