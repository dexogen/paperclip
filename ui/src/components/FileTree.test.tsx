// @vitest-environment jsdom

import { act } from "react";
import { setLocale } from "@/i18n";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileTree, buildFileTree } from "./FileTree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("FileTree", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function row(path: string) {
    return container.querySelector(`[data-file-tree-path="${path}"]`) as HTMLDivElement | null;
  }

  it("updates default empty captions while preserving an explicit equal-English description", async () => {
    const callbacks = { onSelectFile: vi.fn(), onToggleDir: vi.fn() };
    try {
      await act(async () => { await setLocale("en"); root.render(<FileTree nodes={[]} selectedFile={null} expandedDirs={new Set()} {...callbacks} />); });
      const tree = container.querySelector('[role="tree"]');
      await act(async () => { await setLocale("ru"); });
      expect(container.querySelector('[role="tree"]')).toBe(tree);
      expect(container.textContent).toContain("Файлы появятся здесь, когда станут доступны.");
      await act(async () => root.render(<FileTree nodes={[]} selectedFile={null} expandedDirs={new Set()} {...callbacks}
        empty={{ title: "No files", description: "Files will appear here when they are available." }} />));
      expect(container.textContent).toContain("No files");
      expect(container.textContent).toContain("Files will appear here when they are available.");
      expect(callbacks.onSelectFile).not.toHaveBeenCalled(); expect(callbacks.onToggleDir).not.toHaveBeenCalled();
    } finally { await act(async () => { await setLocale("en"); }); }
  });

  it("keeps selected paths, checked rows and focus while captions change language", async () => {
    const onSelectFile = vi.fn();
    const onToggleDir = vi.fn();
    const onToggleCheck = vi.fn();
    const nodes = buildFileTree({ "docs/README <raw>.md": "", "docs/Other.md": "" });
    try {
      await act(async () => { await setLocale("en"); root.render(<FileTree nodes={nodes}
        selectedFile="docs/README <raw>.md" expandedDirs={new Set(["docs"])}
        checkedFiles={new Set(["docs/README <raw>.md"])} onSelectFile={onSelectFile}
        onToggleDir={onToggleDir} onToggleCheck={onToggleCheck} />); });
      const selected = row("docs/README <raw>.md")!;
      selected.focus();
      await act(async () => { await setLocale("ru"); });
      expect(row("docs/README <raw>.md")).toBe(selected);
      expect(selected.getAttribute("aria-selected")).toBe("true");
      expect(selected.getAttribute("aria-checked")).toBe("true");
      expect(document.activeElement).toBe(selected);
      expect(container.querySelector('[role="tree"]')?.getAttribute("aria-label")).toBe("Файлы");
      expect(container.textContent).toContain("README <raw>.md");
      expect(onSelectFile).not.toHaveBeenCalled(); expect(onToggleDir).not.toHaveBeenCalled(); expect(onToggleCheck).not.toHaveBeenCalled();
      await act(async () => { await setLocale("en"); selected.click(); });
      expect(onSelectFile).toHaveBeenCalledExactlyOnceWith("docs/README <raw>.md");
    } finally { await act(async () => { await setLocale("en"); }); }
  });

  it("selects file rows and expands directory rows", () => {
    const onSelectFile = vi.fn();
    const onToggleDir = vi.fn();
    const nodes = buildFileTree({
      "README.md": "",
      "docs/guide.md": "",
    });

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile="README.md"
          expandedDirs={new Set(["docs"])}
          onSelectFile={onSelectFile}
          onToggleDir={onToggleDir}
        />,
      );
    });

    expect(row("README.md")?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      row("docs/guide.md")?.click();
    });
    expect(onSelectFile).toHaveBeenCalledWith("docs/guide.md");

    act(() => {
      row("docs")?.click();
    });
    expect(onToggleDir).toHaveBeenCalledWith("docs");
  });

  it("marks partially selected directories as indeterminate", () => {
    const nodes = buildFileTree({
      "docs/a.md": "",
      "docs/b.md": "",
    });

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile={null}
          expandedDirs={new Set(["docs"])}
          checkedFiles={new Set(["docs/a.md"])}
          onSelectFile={() => {}}
          onToggleDir={() => {}}
          onToggleCheck={() => {}}
        />,
      );
    });

    const input = row("docs")?.querySelector("input[type='checkbox']") as HTMLInputElement | null;
    expect(input?.checked).toBe(false);
    expect(input?.indeterminate).toBe(true);
    expect(row("docs")?.getAttribute("aria-checked")).toBe("mixed");
  });

  it("renders file badges and host-only file extras", () => {
    const nodes = buildFileTree({
      "wiki/very-long-page-slug.md": "",
    });

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile={null}
          expandedDirs={new Set(["wiki"])}
          onSelectFile={() => {}}
          onToggleDir={() => {}}
          fileBadges={{
            "wiki/very-long-page-slug.md": {
              label: "fresh",
              status: "ok",
              tooltip: "Synced",
            },
          }}
          renderFileExtra={(node) => (
            node.kind === "file" ? <span data-testid="file-extra">{node.name.length} chars</span> : null
          )}
        />,
      );
    });

    expect(container.textContent).toContain("fresh");
    expect(container.querySelector("[title='Synced']")).not.toBeNull();
    expect(container.querySelector("[data-testid='file-extra']")?.textContent).toBe("22 chars");
  });

  it("wraps long labels by default and can opt back into truncation", () => {
    const nodes = buildFileTree({
      "wiki/extremely-long-page-slug-that-wraps-on-mobile.md": "",
    });

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile={null}
          expandedDirs={new Set(["wiki"])}
          onSelectFile={() => {}}
          onToggleDir={() => {}}
        />,
      );
    });

    expect(row("wiki/extremely-long-page-slug-that-wraps-on-mobile.md")?.innerHTML).toContain("break-all");

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile={null}
          expandedDirs={new Set(["wiki"])}
          onSelectFile={() => {}}
          onToggleDir={() => {}}
          wrapLabels={false}
        />,
      );
    });

    expect(row("wiki/extremely-long-page-slug-that-wraps-on-mobile.md")?.innerHTML).toContain("truncate");
  });

  it("supports tree keyboard expansion and checkbox toggling", () => {
    const onToggleDir = vi.fn();
    const onToggleCheck = vi.fn();
    const nodes = buildFileTree({
      "docs/a.md": "",
    });

    act(() => {
      root.render(
        <FileTree
          nodes={nodes}
          selectedFile={null}
          expandedDirs={new Set()}
          onSelectFile={() => {}}
          onToggleDir={onToggleDir}
          onToggleCheck={onToggleCheck}
        />,
      );
    });

    const docsRow = row("docs");
    act(() => {
      docsRow?.focus();
      docsRow?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(onToggleDir).toHaveBeenCalledWith("docs");

    act(() => {
      docsRow?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(onToggleCheck).toHaveBeenCalledWith("docs", "dir");
  });

  it("keeps hidden descendants in folder selection and restores a tab stop when filtering", () => {
    const nodes = buildFileTree({ "docs/a.md": "", "docs/b.md": "" });
    const props = { nodes, selectedFile: null, expandedDirs: new Set(["docs"]), checkedFiles: new Set(["docs/a.md"]), onSelectFile: () => {}, onToggleDir: () => {} };
    act(() => root.render(<FileTree {...props} />));
    act(() => row("docs/b.md")?.focus());
    act(() => root.render(<FileTree {...props} visiblePaths={new Set(["docs", "docs/a.md"])} renderLabel={node => <span>{node.name} description</span>} />));
    expect(row("docs/b.md")).toBeNull();
    expect(row("docs")?.getAttribute("aria-checked")).toBe("mixed");
    expect(row("docs")?.tabIndex).toBe(0);
    expect(row("docs/a.md")?.textContent).toContain("a.md description");
  });

  it("blocks mouse and keyboard changes while disabled", () => {
    const onToggleDir = vi.fn();
    const onToggleCheck = vi.fn();
    const onSelectFile = vi.fn();
    act(() => root.render(<FileTree nodes={buildFileTree({ "docs/a.md": "" })} selectedFile={null} expandedDirs={new Set(["docs"])} onToggleDir={onToggleDir} onToggleCheck={onToggleCheck} onSelectFile={onSelectFile} disabled />));
    act(() => {
      row("docs/a.md")?.click();
      row("docs")?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      container.querySelector<HTMLButtonElement>('[aria-label="Collapse docs"]')?.click();
    });
    expect(onToggleCheck).not.toHaveBeenCalled();
    expect(onSelectFile).not.toHaveBeenCalled();
    expect(onToggleDir).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.disabled).toBe(true);
  });
});
