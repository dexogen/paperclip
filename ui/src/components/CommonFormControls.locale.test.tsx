// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { CopyText } from "./CopyText";
import { PageTabBar } from "./PageTabBar";
import { PathInstructionsModal } from "./PathInstructionsModal";
import { SearchableSelect } from "./SearchableSelect";

const copy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: copy }));
vi.mock("../context/SidebarContext", () => ({ useSidebar: () => ({ isMobile: true }) }));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  await setLocale("en");
  copy.mockReset().mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await setLocale("en");
});

it("updates copy receipts without repeating clipboard writes and preserves custom captions", async () => {
  await act(async () => root.render(<CopyText text="/tmp/You <b>& файл</b>" />));
  const button = container.querySelector("button")!;
  button.focus();
  await act(async () => button.click());
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied!");
  await act(async () => setLocale("ru"));
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Скопировано!");
  expect(document.activeElement).toBe(button);
  expect(copy).toHaveBeenCalledExactlyOnceWith("/tmp/You <b>& файл</b>");
  await act(async () => setLocale("en"));
  copy.mockRejectedValueOnce(new Error("provider raw"));
  await act(async () => button.click());
  await act(async () => setLocale("ru"));
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Не удалось скопировать");
  expect(copy).toHaveBeenCalledTimes(2);
  await act(async () => root.render(<CopyText text="literal" copiedLabel="Copied!" />));
  await act(async () => button.click());
  expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied!");
});

it("keeps selected mobile tab and canonical value while changing its accessible label", async () => {
  const changed = vi.fn();
  await act(async () => root.render(<PageTabBar items={[{ value: "settings", label: "User <b>caption</b>" }]} value="settings" onValueChange={changed} />));
  const select = container.querySelector("select")!;
  select.focus();
  await act(async () => setLocale("ru"));
  expect(select.getAttribute("aria-label")).toBe("Раздел страницы");
  expect(select.value).toBe("settings");
  expect(select.textContent).toBe("User <b>caption</b>");
  expect(document.activeElement).toBe(select);
  expect(changed).not.toHaveBeenCalled();
  await act(async () => setLocale("en"));
  expect(container.querySelector("select")).toBe(select);
});

it("keeps the selected path platform and its focused control across language changes", async () => {
  const change = vi.fn();
  await act(async () => root.render(<PathInstructionsModal open onOpenChange={change} />));
  const windows = [...document.querySelectorAll("button")].find(button => button.textContent === "Windows")!;
  await act(async () => windows.click());
  windows.focus();
  await act(async () => setLocale("ru"));
  expect(document.body.textContent).toContain("Как получить полный путь");
  expect(document.body.textContent).toContain("Откройте Проводник");
  expect(document.body.textContent).toContain("/Users/you/project");
  expect(document.activeElement).toBe(windows);
  expect(change).not.toHaveBeenCalled();
  await act(async () => setLocale("en"));
  expect(document.body.textContent).toContain("Open File Explorer");
});

it("retains a selector query and literal option while translating only absent defaults", async () => {
  const changed = vi.fn();
  const groups = [{ id: "raw", label: "Search...", options: [{ key: "a", value: "id/a", label: "Alpha <b>&</b>" }] }];
  await act(async () => root.render(<SearchableSelect groups={groups} value="" onValueChange={changed} placeholder="Custom" disablePortal />));
  const button = container.querySelector<HTMLElement>('[role="combobox"]')!;
  await act(async () => button.focus());
  const search = container.querySelector<HTMLInputElement>('input[placeholder="Search..."]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "Alpha");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  search.setSelectionRange(1, 3);
  await act(async () => setLocale("ru"));
  expect(search.placeholder).toBe("Поиск…");
  expect(search.value).toBe("Alpha");
  expect(container.querySelector("input")).toBe(search);
  expect(container.textContent).toContain("Alpha <b>&</b>");
  expect(container.textContent).toContain("Search...");
  expect(changed).not.toHaveBeenCalled();
  await act(async () => setLocale("en"));
  const option = container.querySelector<HTMLElement>('[cmdk-item]')!;
  await act(async () => option.click());
  expect(changed).toHaveBeenCalledExactlyOnceWith("id/a", groups[0].options[0]);
});
