// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { OutputFeedbackButtons } from "./OutputFeedbackButtons";
import { OutputVideoPlayer } from "./issue-output/OutputVideoPlayer";
import { FoldCurtain } from "./FoldCurtain";
import { SourceTrustBadge } from "./SourceTrustBadge";
import { TooltipProvider } from "./ui/tooltip";
import { stateChipFor } from "./task-chat/RichWorkProductCard";
import { CsvPreview } from "./CsvPreview";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await i18n.changeLanguage("en");
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function button(text: string) {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(element => element.textContent === text);
  expect(found, text).toBeDefined();
  return found!;
}
it("retains feedback consent and the literal note while language changes do not submit votes", async () => {
  const onVote = vi.fn(async () => {});
  await act(async () => root.render(<OutputFeedbackButtons onVote={onVote} />));
  await act(async () => button("Needs work").click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(onVote).not.toHaveBeenCalled();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  expect(document.body.textContent).toContain("Эта оценка в любом случае сохраняется локально.");
  expect(onVote).not.toHaveBeenCalled();
  await act(async () => button("Не разрешать").click());
  expect(onVote).toHaveBeenCalledExactlyOnceWith("down", undefined);
  const note = host.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(note, "Literal <note> & отзыв");
    note.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(host.querySelector("textarea")).toBe(note);
  expect(note.value).toBe("Literal <note> & отзыв");
  expect(onVote).toHaveBeenCalledTimes(1);
  await act(async () => button("Save note").click());
  expect(onVote).toHaveBeenLastCalledWith("down", { reason: "Literal <note> & отзыв" });
});
it("keeps the video element and playback position while translating only its accessible label", async () => {
  await act(async () => root.render(<OutputVideoPlayer src="/api/attachments/video/content" title="Literal <video>.webm" />));
  const video = host.querySelector("video")!;
  video.currentTime = 25;
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.querySelector("video")).toBe(video);
  expect(video.currentTime).toBe(25);
  expect(video.getAttribute("aria-label")).toBe("Видеорезультат: Literal <video>.webm");
  expect(video.getAttribute("src")).toBe("/api/attachments/video/content");
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(video.getAttribute("aria-label")).toBe("Video output: Literal <video>.webm");
  expect(video.currentTime).toBe(25);
});
it("preserves an expanded curtain and custom labels across locale changes", async () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(800);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  await act(async () => root.render(<FoldCurtain collapsedHeight={100} activationBuffer={0}><p>Literal content</p></FoldCurtain>));
  const toggle = button("Show more");
  await act(async () => toggle.click());
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(button("Показать меньше")).toBe(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await act(async () => root.render(<FoldCurtain collapsedHeight={100} activationBuffer={0} lessLabel="Custom label"><p>Literal content</p></FoldCurtain>));
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(button("Custom label")).toBe(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
});
it("keeps low-trust gating unchanged while labels follow the selected language", async () => {
  const sourceTrust = { preset: "low_trust_review" as const, disposition: "quarantined" as const };
  await act(async () => root.render(<TooltipProvider><SourceTrustBadge sourceTrust={sourceTrust} artifactLabel="document" /></TooltipProvider>));
  expect(host.querySelector('[aria-label="Low-trust source"]')).not.toBeNull();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.querySelector('[aria-label="Источник с низким уровнем доверия"]')).not.toBeNull();
  expect(sourceTrust).toEqual({ preset: "low_trust_review", disposition: "quarantined" });
  await act(async () => root.render(<TooltipProvider><SourceTrustBadge sourceTrust={null} /></TooltipProvider>));
  expect(host.textContent).toBe("");
});
it("translates CSV counts and errors while preserving header cells and source text", async () => {
  const source = 'Literal <header>,колонка\n"<name> & data",value\nnext,last';
  await act(async () => root.render(<CsvPreview text={source} title="Raw <title>.csv" />));
  const table = host.querySelector("table");
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(host.querySelector("table")).toBe(table);
  expect(host.textContent).toContain("2 строки");
  expect(host.textContent).toContain("2 столбца");
  expect(host.textContent).toContain("Literal <header>");
  expect(host.textContent).toContain("<name> & data");
  expect(host.querySelector("name")).toBeNull();
  await act(async () => root.render(<CsvPreview text={'"unfinished'} title="Raw <title>.csv" />));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Поле в кавычках не завершено");
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("A quoted field is incomplete");
});

it("localizes status labels while retaining canonical branch selection and the English default", async () => {
  await i18n.changeLanguage("ru");
  expect(stateChipFor("pull_request", "merged", "none", i18n.getFixedT("ru"))).toEqual({ label: "Слит", tone: "success" });
  expect(stateChipFor("pull_request", "merged", "changes_requested", i18n.getFixedT("ru"))).toEqual({ label: "Запрошены изменения", tone: "failure" });
  expect(stateChipFor("runtime_service", "active", "none", i18n.getFixedT("ru"))).toEqual({ label: "Работает", tone: "progress" });
  expect(stateChipFor("pull_request", "merged", "none")).toEqual({ label: "Merged", tone: "success" });
  expect(stateChipFor("artifact", "external_custom_status", "none", i18n.getFixedT("ru"))).toBeNull();
});
