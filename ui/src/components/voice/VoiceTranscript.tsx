import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { VoiceTranscriptEntry } from "@/lib/voice-transcript";

export interface VoiceTranscriptProps {
  entries: readonly VoiceTranscriptEntry[];
  agentName: string;
  unavailable?: boolean;
}

/** Announcements belong to the session controller, once per final segment. */
export function VoiceTranscript({ entries, agentName, unavailable = false }: VoiceTranscriptProps) {
  useFullSharedTranslation();
  if (unavailable) return <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.the_transcript_is_unavailable_your_task_history_is_s_257b5d")}</p>;
  if (!entries.length) return <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.your_conversation_will_appear_here_4ff74b")}</p>;
  return (
    <ol aria-label={fullSharedT("fullShared.conversation_transcript_12ed94")} aria-live="off" className="flex min-w-0 flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground break-words">
            {entry.source === "user" ? fullSharedT("taskDisplay.assignees.you") : entry.source === "application" ? "Paperclip" : agentName}
            {!entry.final && !entry.interrupted && <span>{fullSharedT("fullShared.speaking_ceee77")}</span>}
            {entry.interrupted && <span>{fullSharedT("fullShared.interrupted_4d1e56")}</span>}
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">{entry.text}</p>
        </li>
      ))}
    </ol>
  );
}
