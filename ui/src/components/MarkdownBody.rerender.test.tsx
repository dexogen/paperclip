// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { act } from "react";
import { i18n } from "@/i18n";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { MarkdownBody } from "./MarkdownBody";

vi.mock("@/lib/router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: { children: React.ReactNode; to: string } & React.ComponentProps<"a">) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock("../api/issues", () => ({
  issuesApi: {
    get: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) {
    flushSync(() => root?.unmount());
  }
  root = null;
  container?.remove();
  container = null;
});

const SAMPLE = "Some text\n\n```ts\nconst answer = 42;\n```\n\nAnd a [link](https://example.com).";

function tree(children: string, queryClient: QueryClient, resolveLinkHref?: (href: string) => string | null) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MarkdownBody resolveLinkHref={resolveLinkHref}>{children}</MarkdownBody>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("MarkdownBody re-render stability (PAP-10767)", () => {
  it("changes control language without losing code, wrapping, table scroll or selection", async () => {
    const previousLanguage = i18n.language;
    await act(async () => { await i18n.changeLanguage("en"); });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const source = `${SAMPLE}\n\n| Название | Значение |\n| --- | --- |\n| Пользователь | Исходные данные |`;
    try {
      await act(async () => { root?.render(tree(source, queryClient)); });
      const pre = container.querySelector("pre")!;
      const code = pre.querySelector("code")!;
      const table = container.querySelector<HTMLElement>(".paperclip-markdown-table-scroll")!;
      const wrap = container.querySelector<HTMLButtonElement>(".paperclip-markdown-codeblock-wrap")!;
      const text = container.querySelector("p")!.firstChild!;
      expect(table.getAttribute("aria-label")).toBe("Scrollable table");
      table.scrollLeft = 61;
      await act(async () => { wrap.click(); });
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, "Some text".length);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      await act(async () => { await i18n.changeLanguage("ru"); });
      expect(container.querySelector("pre")).toBe(pre);
      expect(container.querySelector("pre code")).toBe(code);
      expect(code.textContent).toBe("const answer = 42;\n");
      expect(container.querySelector(".paperclip-markdown-table-scroll")).toBe(table);
      expect(table.scrollLeft).toBe(61);
      expect(table.getAttribute("aria-label")).toBe("Таблица с прокруткой");
      expect(wrap.getAttribute("aria-label")).toBe("Отключить перенос строк");
      expect(wrap.getAttribute("aria-pressed")).toBe("true");
      expect(window.getSelection()?.toString()).toBe("Some text");
      expect(container.textContent).toContain("Исходные данные");
      await act(async () => { await i18n.changeLanguage("en"); });
      expect(container.querySelector("pre")).toBe(pre);
      expect(wrap.getAttribute("aria-label")).toBe("Unwrap lines");
      expect(table.scrollLeft).toBe(61);
    } finally {
      await act(async () => { await i18n.changeLanguage(previousLanguage); });
    }
  });

  it("uses the current file resolver when the same viewer opens another file", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const instructions = "Read the [checklist](./checklist.md).";

    flushSync(() => root?.render(tree(instructions, queryClient, () => "/skills/review/files/first/checklist.md")));
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/skills/review/files/first/checklist.md");

    flushSync(() => root?.render(tree(instructions, queryClient, () => "/skills/review/files/second/checklist.md")));
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/skills/review/files/second/checklist.md");

    flushSync(() => root?.render(tree(instructions, queryClient, () => null)));
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("Read the checklist.");
  });

  it("preserves rendered DOM nodes across a parent re-render with unchanged props", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    flushSync(() => root?.render(tree(SAMPLE, queryClient)));

    const preBefore = container.querySelector("pre");
    const codeBefore = container.querySelector("pre code");
    const anchorBefore = container.querySelector("a");
    expect(preBefore).not.toBeNull();
    expect(codeBefore).not.toBeNull();
    expect(anchorBefore).not.toBeNull();

    // Re-render the identical tree. Before the memoization fix, MarkdownBody
    // rebuilt its react-markdown `components` map on every render, giving each
    // custom element (pre/code/a/...) a brand-new component *type* — which made
    // React unmount and remount the whole subtree, discarding scroll position
    // and text selection and producing the visible flashing in the file viewer.
    flushSync(() => root?.render(tree(SAMPLE, queryClient)));

    const preAfter = container.querySelector("pre");
    const codeAfter = container.querySelector("pre code");
    const anchorAfter = container.querySelector("a");

    // Same DOM node instances ⇒ React updated in place rather than remounting.
    expect(preAfter).toBe(preBefore);
    expect(codeAfter).toBe(codeBefore);
    expect(anchorAfter).toBe(anchorBefore);
  });

  it("preserves text selection across a parent re-render with unchanged props", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    flushSync(() => root?.render(tree(SAMPLE, queryClient)));

    const paragraph = container.querySelector("p");
    const textNode = paragraph?.firstChild;
    expect(textNode?.nodeType).toBe(Node.TEXT_NODE);

    const range = document.createRange();
    range.setStart(textNode!, 0);
    range.setEnd(textNode!, "Some text".length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(selection?.toString()).toBe("Some text");

    flushSync(() => root?.render(tree(SAMPLE, queryClient)));

    expect(window.getSelection()?.toString()).toBe("Some text");
  });
});
