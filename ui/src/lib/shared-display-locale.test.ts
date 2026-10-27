import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { fileKindForName } from "@/components/task-chat/task-chat-attachments";
import { buildTranscript, type RunLogChunk } from "@/adapters/transcript";
import { STATUS_CARD_LIFECYCLE_PRESENTATION } from "./status-card-state";
import { TRIMMED_OUTPUT_MARKER_TEXT, isTrimmedOutputMarkerChunk } from "./run-log-chunks";

afterEach(async () => { await i18n.changeLanguage("en"); });

describe("shared display locale boundaries", () => {
  it("resolves imported display maps on locale changes while keeping kind identifiers stable", async () => {
    const card = STATUS_CARD_LIFECYCLE_PRESENTATION.compiling;
    expect(card.label).toBe("Setting up");
    await i18n.changeLanguage("ru");
    expect(card.label).toBe("Настройка");
    expect(fileKindForName("notes.doc", i18n.getFixedT("ru")).label).toBe("Документ");
    expect(fileKindForName("notes.doc", i18n.getFixedT("en")).label).toBe("Doc");
    expect(fileKindForName("script.ts").label).toBe("Code");
    await i18n.changeLanguage("en");
    expect(card.label).toBe("Setting up");
  });

  it("translates only the synthetic trim marker and preserves identical provider output", async () => {
    const marker: RunLogChunk = { ts: "2026-10-26T12:00:00Z", stream: "system", chunk: TRIMMED_OUTPUT_MARKER_TEXT };
    const provider = { ...marker, seq: 3 };
    const source = [marker, provider];
    const before = structuredClone(source);
    await i18n.changeLanguage("ru");
    const entries = buildTranscript(source, () => []);
    expect(isTrimmedOutputMarkerChunk(marker)).toBe(true);
    expect(isTrimmedOutputMarkerChunk(provider)).toBe(false);
    expect(entries[0]).toMatchObject({ kind: "system", text: expect.stringMatching(/[А-Яа-я]/) });
    expect(entries[1]).toMatchObject({ kind: "system", text: TRIMMED_OUTPUT_MARKER_TEXT });
    expect(source).toEqual(before);
    await i18n.changeLanguage("en");
    expect(buildTranscript(source, () => [])[0]).toMatchObject({ text: TRIMMED_OUTPUT_MARKER_TEXT });
  });
});
