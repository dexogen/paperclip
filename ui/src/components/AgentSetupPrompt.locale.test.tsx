// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { copyTextToClipboard } from "@/lib/clipboard";
import { AgentSetupPrompt } from "./AgentSetupPrompt";

vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: vi.fn() }));
let root: Root;
let host: HTMLDivElement;
const prompt = "Open https://paperclip.example/setup?code=literal-code\n<strong>untrusted prompt</strong>";
async function language(locale: string) { await act(async () => { await i18n.changeLanguage(locale); }); }
beforeEach(async () => {
  vi.resetAllMocks(); await i18n.changeLanguage("en");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage("en"); });

it("keeps an open clipboard attempt, literal overrides and selected prompt across language changes", async () => {
  let rejectCopy!: (cause: unknown) => void;
  vi.mocked(copyTextToClipboard).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectCopy = reject; }));
  const onCopied = vi.fn();
  await act(async () => root.render(<AgentSetupPrompt prompt={prompt} onCopied={onCopied} />));
  const trigger = host.querySelector<HTMLButtonElement>("button")!;
  await act(async () => trigger.click());
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  const preview = dialog.querySelector("pre")!;
  const copyButton = dialog.querySelector<HTMLButtonElement>(".agent-setup-copy")!;
  expect(copyTextToClipboard).toHaveBeenCalledExactlyOnceWith(prompt);
  expect(document.activeElement).toBe(copyButton);
  await language("ru");
  expect(trigger.getAttribute("aria-label")).toBe("Настроить с помощью агента");
  expect(copyButton.textContent).toBe("Копирование…");
  expect(document.activeElement).toBe(copyButton);
  expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  expect(dialog.querySelector("pre")).toBe(preview);
  expect(preview.textContent).toBe(prompt);
  expect(preview.querySelector("strong")).toBeNull();
  await act(async () => rejectCopy(new Error("Clipboard unavailable")));
  const fallback = dialog.querySelector<HTMLTextAreaElement>("textarea")!;
  expect(fallback.value).toBe(prompt);
  fallback.focus(); fallback.setSelectionRange(5, 17);
  await language("en");
  expect(dialog.querySelector("textarea")).toBe(fallback);
  expect(document.activeElement).toBe(fallback);
  expect([fallback.selectionStart, fallback.selectionEnd]).toEqual([5, 17]);
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("Could not copy automatically.");
  await act(async () => root.render(<AgentSetupPrompt prompt={prompt} onCopied={onCopied}
    title="Agent setup" label="Set up with an agent" description="Paste this into your agent to take care of setup."
    agent={{ name: "You <strong>raw</strong>", src: "/brands/codex-color.svg" }} />));
  await language("ru");
  expect(trigger.getAttribute("aria-label")).toBe("Set up with an agent");
  expect(dialog.querySelector("h2")?.textContent).toBe("Agent setup");
  expect(dialog.textContent).toContain("Paste this into your agent to take care of setup.");
  expect(dialog.textContent).toContain("You <strong>raw</strong>");
  expect(dialog.querySelector("strong")).toBeNull();
  expect(dialog.querySelector("textarea")).toBe(fallback);
  expect([fallback.selectionStart, fallback.selectionEnd]).toEqual([5, 17]);
  expect(copyTextToClipboard).toHaveBeenCalledTimes(1);
  expect(onCopied).not.toHaveBeenCalled();
  vi.mocked(copyTextToClipboard).mockResolvedValueOnce(undefined);
  await act(async () => copyButton.click());
  expect(copyTextToClipboard).toHaveBeenCalledTimes(2);
  expect(copyTextToClipboard).toHaveBeenLastCalledWith(prompt);
  expect(onCopied).toHaveBeenCalledTimes(1);
  expect(host.querySelector('[role="status"]')?.textContent).toContain("You <strong>raw</strong>");
});
