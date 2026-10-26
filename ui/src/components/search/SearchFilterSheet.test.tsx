// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanySearchSort } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import type { SearchFilters } from "@/lib/search-filters";
import { SearchFilterSheet } from "./SearchFilterSheet";
import { SearchFilterBar, type SearchFilterDataProps } from "./SearchFilterBar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const data: SearchFilterDataProps = {
  currentUserId: "user-current",
  agents: [{ id: "agent-a", name: "Агент <b> & Agent" }],
  projects: [{ id: "project-a", name: "Проект / Project" }],
  labels: [{ id: "label-a", name: "Метка / Label", color: "var(--foreground)" }],
};

describe("search filters across locale changes", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onApply = vi.fn();
  const onDraftChange = vi.fn();
  const onSortChange = vi.fn();

  beforeEach(async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    await i18n.changeLanguage("en");
    onApply.mockReset();
    onDraftChange.mockReset();
    onSortChange.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
    vi.unstubAllGlobals();
  });

  function button(name: string): HTMLButtonElement {
    const found = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => (candidate.getAttribute("aria-label") ?? candidate.textContent ?? "").trim() === name);
    expect(found, `button ${name}`).toBeTruthy();
    return found!;
  }

  async function click(name: string) {
    await act(async () => button(name).click());
  }

  async function language(locale: string) {
    await act(async () => { await i18n.changeLanguage(locale); });
  }

  function Harness({ total = 5 }: { total?: number | null }) {
    const [open, setOpen] = useState(true);
    const [filters, setFilters] = useState<SearchFilters>({ status: ["todo"], projectId: "project-a" });
    const [sort, setSort] = useState<CompanySearchSort>("relevance");
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open filters fixture</button>
        <SearchFilterSheet
          open={open}
          onOpenChange={setOpen}
          filters={filters}
          onApply={(next) => { onApply(next); setFilters(next); }}
          onDraftChange={onDraftChange}
          previewTotal={total}
          data={data}
          sort={sort}
          onSortChange={(next) => { onSortChange(next); setSort(next); }}
        />
      </>
    );
  }

  it("retains an unapplied mobile draft through EN→RU→EN, cancels it, then applies canonical values", async () => {
    await act(async () => root.render(<Harness />));
    expect(button("Close")).toBeTruthy();
    await click("Blocked");
    const blocked = button("Blocked");
    const draftCalls = onDraftChange.mock.calls.length;
    expect(onDraftChange).toHaveBeenLastCalledWith({ status: ["todo", "blocked"], projectId: "project-a" });
    await language("ru");
    expect(button("Заблокировано")).toBe(blocked);
    expect(button("Заблокировано").getAttribute("aria-pressed")).toBe("true");
    expect(button("Закрыть")).toBeTruthy();
    expect(button("Показать 5 результатов")).toBeTruthy();
    expect(button("Агент <b> & Agent").querySelector("b")).toBeNull();
    expect(onDraftChange).toHaveBeenCalledTimes(draftCalls);
    expect(onApply).not.toHaveBeenCalled();
    await language("en");
    expect(button("Blocked")).toBe(blocked);
    expect(button("Close")).toBeTruthy();
    expect(onDraftChange).toHaveBeenCalledTimes(draftCalls);
    await click("Cancel");
    expect(onApply).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="search-filter-sheet"]')).toBeNull();
    await click("Open filters fixture");
    expect(button("Blocked").getAttribute("aria-pressed")).toBe("false");
    expect(button("Todo").getAttribute("aria-pressed")).toBe("true");
    await language("ru");
    await click("Заблокировано");
    await click("Я");
    await click("Показать 5 результатов");
    expect(onApply).toHaveBeenCalledExactlyOnceWith({ status: ["todo", "blocked"], projectId: "project-a", assigneeUserId: "user-current" });
    expect(document.querySelector('[data-testid="search-filter-sheet"]')).toBeNull();
  });

  it.each([
    [1, "Показать 1 результат"],
    [2, "Показать 2 результата"],
    [5, "Показать 5 результатов"],
    [21, "Показать 21 результат"],
  ])("uses the Russian result plural for %i", async (total, label) => {
    await language("ru");
    await act(async () => root.render(<Harness total={total as number} />));
    expect(button(label as string)).toBeTruthy();
    await click("Закрыть");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("keeps sort changes immediate and canonical while a cancelled filter draft remains unapplied", async () => {
    await act(async () => root.render(<Harness total={null} />));
    await language("ru");
    await click("Недавно обновлённые");
    expect(onSortChange).toHaveBeenCalledExactlyOnceWith("updated");
    await click("Отмена");
    expect(onApply).not.toHaveBeenCalled();
    await click("Open filters fixture");
    expect(button("Недавно обновлённые").getAttribute("aria-pressed")).toBe("true");
    expect(button("Показать результаты")).toBeTruthy();
  });

  it("preserves a desktop filter menu search and selection through locale changes", async () => {
    const changed = vi.fn();
    function Desktop() {
      const [filters, setFilters] = useState<SearchFilters>({ assigneeAgentId: "agent-a" });
      return <SearchFilterBar filters={filters} onChange={(next) => { changed(next); setFilters(next); }} sort="relevance" onSortChange={onSortChange} data={data} />;
    }
    await act(async () => root.render(<Desktop />));
    await click("Filter by Assignee");
    const input = document.querySelector<HTMLInputElement>('input[placeholder="Search assignees…"]')!;
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Agent");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await language("ru");
    expect(document.querySelector('input[placeholder="Поиск исполнителей…"]')).toBe(input);
    expect(input.value).toBe("Agent");
    expect(button("Агент <b> & Agent")).toBeTruthy();
    expect(changed).not.toHaveBeenCalled();
    await language("en");
    expect(document.querySelector('input[placeholder="Search assignees…"]')).toBe(input);
    expect(input.value).toBe("Agent");
    await click("Агент <b> & Agent");
    expect(changed).toHaveBeenCalledExactlyOnceWith({});
  });
});
