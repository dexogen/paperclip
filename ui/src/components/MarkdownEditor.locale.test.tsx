// @vitest-environment jsdom

import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { MarkdownEditor, type MarkdownEditorRef } from "./MarkdownEditor";

vi.hoisted(() => {
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
  const original = window.CSSStyleSheet.prototype.insertRule;
  window.CSSStyleSheet.prototype.insertRule = function (rule, index) {
    return original.call(this, rule.startsWith("--sxs") ? ".sandpack-marker{}" : rule, index);
  };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect());
  vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([] as unknown as DOMRectList);
  await i18n.changeLanguage("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await i18n.changeLanguage("en");
  vi.restoreAllMocks();
});

describe("MarkdownEditor installed rich editor localization", () => {
  it("updates the active rich editor language while keeping its draft, DOM and selection", async () => {
    const onChange = vi.fn();
    const editorRef = createRef<MarkdownEditorRef>();
    function Harness() {
      const [draft, setDraft] = useState("Unsaved draft");
      return <MarkdownEditor ref={editorRef} value={draft} onChange={(next) => {
        onChange(next);
        setDraft(next);
      }} />;
    }
    await act(async () => root.render(<Harness />));
    const editable = container.querySelector<HTMLDivElement>('[contenteditable="true"]');
    expect(editable).not.toBeNull();
    expect(editable?.getAttribute("aria-label")).toBe("editable markdown");
    await act(async () => editorRef.current?.focus());
    await act(async () => editorRef.current?.insertMarkdown("Added draft"));
    expect(onChange).toHaveBeenCalled();
    expect(editable?.textContent).toContain("Added draft");
    const draft = editable?.textContent;
    const changes = onChange.mock.calls.length;
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const offset = selection?.anchorOffset;
    expect(anchor && editable?.contains(anchor)).toBe(true);

    await act(async () => i18n.changeLanguage("ru"));
    expect(editable?.getAttribute("aria-label")).toBe("Редактирование Markdown");
    expect(container.querySelector('[contenteditable="true"]')).toBe(editable);
    expect(editable?.textContent).toBe(draft);
    expect(window.getSelection()?.anchorNode).toBe(anchor);
    expect(window.getSelection()?.anchorOffset).toBe(offset);
    expect(onChange).toHaveBeenCalledTimes(changes);

    await act(async () => i18n.changeLanguage("en"));
    expect(editable?.getAttribute("aria-label")).toBe("editable markdown");
    expect(container.querySelector('[contenteditable="true"]')).toBe(editable);
    expect(editable?.textContent).toBe(draft);
    expect(onChange).toHaveBeenCalledTimes(changes);
  });
});
