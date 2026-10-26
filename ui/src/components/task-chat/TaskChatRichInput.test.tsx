// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { TaskChatRichInput } from "./TaskChatRichInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/MarkdownEditor", async () => {
  const { forwardRef, useImperativeHandle, useRef } = await import("react");
  return {
    MarkdownEditor: forwardRef<
      { focus(): void; insertMarkdown(markdown: string): void },
      { value: string; onChange(value: string): void; readOnly?: boolean; placeholder?: string }
    >(({ value, onChange, readOnly, placeholder }, ref) => {
      const input = useRef<HTMLTextAreaElement>(null);
      useImperativeHandle(ref, () => ({
        focus: () => input.current?.focus(),
        insertMarkdown: (markdown) => onChange(value + markdown),
      }), [onChange, value]);
      return <textarea ref={input} value={value} readOnly={readOnly} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
    }),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("TaskChatRichInput locale and uploads", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => { root.unmount(); await i18n.changeLanguage("en"); }); container.remove(); });
  async function choose(file: File) {
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
  }

  it("preserves an in-flight attachment, text and focus through EN/RU/EN and inserts the exact Markdown once", async () => {
    const pending = deferred<string>();
    const upload = vi.fn(() => pending.promise);
    const change = vi.fn();
    const uploading = vi.fn();
    const file = new File(["image"], "чертёж [v1].png", { type: "image/png" });
    function Host() {
      const [value, setValue] = useState("Unsent **Markdown** <tag>literal</tag>");
      return <TaskChatRichInput value={value} onChange={(next) => { setValue(next); change(next); }} imageUploadHandler={upload} showImageAttachControls onUploadingChange={uploading} />;
    }
    await act(async () => { root.render(<Host />); });
    const text = container.querySelector("textarea")!;
    text.focus();
    await choose(file);
    expect(upload).toHaveBeenCalledExactlyOnceWith(file);
    expect(uploading.mock.calls).toEqual([[true]]);
    for (const language of ["ru", "en"] as const) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(container.querySelector("textarea")).toBe(text);
      expect(document.activeElement).toBe(text);
      expect(text.value).toBe("Unsent **Markdown** <tag>literal</tag>");
      expect(container.querySelector<HTMLButtonElement>("button")!.disabled).toBe(true);
      expect(container.querySelector<HTMLButtonElement>("button")!.textContent).toBe(language === "ru" ? "Прикрепить изображение" : "Attach image");
      expect(container.querySelector<HTMLInputElement>('input[type="file"]')!.getAttribute("aria-label")).toBe(language === "ru" ? "Прикрепить изображение" : "Attach image");
      expect(upload).toHaveBeenCalledTimes(1);
      expect(uploading.mock.calls).toEqual([[true]]);
      expect(change).not.toHaveBeenCalled();
    }
    await act(async () => { pending.resolve("https://files.example/image?version=1&raw=true"); });
    expect(uploading.mock.calls).toEqual([[true], [false]]);
    expect(change).toHaveBeenCalledExactlyOnceWith("Unsent **Markdown** <tag>literal</tag>\n\n![чертёж \\[v1\\].png](https://files.example/image?version=1&raw=true)\n\n");
    expect(container.querySelector<HTMLButtonElement>("button")!.disabled).toBe(false);
  });

  it.each([new Error("Provider <strong>upload</strong> failure"), "failed"])("retains upload errors across language changes without another upload", async (cause) => {
    const upload = vi.fn().mockRejectedValue(cause);
    const change = vi.fn();
    const uploading = vi.fn();
    await act(async () => { root.render(<TaskChatRichInput value="Literal draft" onChange={change} imageUploadHandler={upload} showImageAttachControls onUploadingChange={uploading} attachAriaLabel="Provider <tag>attach</tag>" />); });
    const file = new File(["image"], "file.png", { type: "image/png" });
    await choose(file);
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(cause instanceof Error ? cause.message : "The image could not be uploaded.");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(cause instanceof Error ? cause.message : "Не удалось загрузить изображение.");
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')!.getAttribute("aria-label")).toBe("Provider <tag>attach</tag>");
    expect(container.querySelector("textarea")!.value).toBe("Literal draft");
    expect(container.querySelector("strong,tag")).toBeNull();
    expect(upload).toHaveBeenCalledExactlyOnceWith(file);
    expect(uploading.mock.calls).toEqual([[true], [false]]);
    expect(change).not.toHaveBeenCalled();
  });
});
