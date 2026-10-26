import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { translateMarkdownEditor } from "./markdown-editor-i18n";

describe("Markdown editor translations", () => {
  it("keeps a link destination literal inside the translated tooltip", () => {
    const url = "https://example.invalid/<strong>?query=$&";
    expect(translateMarkdownEditor(i18n.getFixedT("ru"), "linkPreview.open", "Open {{url}} in new window", { url }))
      .toBe(`Открыть ${url} в новом окне`);
    expect(translateMarkdownEditor(i18n.getFixedT("en"), "linkPreview.open", "Open {{url}} in new window", { url }))
      .toBe(`Open ${url} in new window`);
  });

  it("retains an unknown plugin message and literal interpolation values", () => {
    const name = "<strong> $& $$ $` ${value}";
    expect(translateMarkdownEditor(i18n.getFixedT("ru"), "futurePlugin.message", "Open {{name}} / {{name}}", { name }))
      .toBe(`Open ${name} / ${name}`);
  });
});
