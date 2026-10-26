// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { KeysTab } from "./AgentDetail";

const api = vi.hoisted(() => ({ listKeys: vi.fn(), createKey: vi.fn(), revokeKey: vi.fn() }));
const clipboard = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("../api/agents", () => ({ agentsApi: api }));
vi.mock("../lib/clipboard", () => ({ copyTextToClipboard: clipboard }));
vi.mock("../context/ToastContext", () => ({ useToastActions: () => ({ pushToast: toast }) }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(async () => {
  await setLocale("en");
  vi.clearAllMocks();
  api.listKeys.mockResolvedValue([{ id: "key:raw", name: "Default <b>raw</b>", createdAt: "2026-10-26T12:00:00Z", revokedAt: null }]);
  clipboard.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  await setLocale("en");
});

it("keeps a key draft, pending creation and secret receipt through locale changes without replaying actions", async () => {
  let finish!: (value: { token: string }) => void;
  api.createKey.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  api.revokeKey.mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => root.render(<QueryClientProvider client={client}><KeysTab agentId="agent:raw" companyId="company:raw" /></QueryClientProvider>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "  Default <i>draft</i>  ");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  input.focus();
  input.setSelectionRange(3, 8);
  const reads = api.listKeys.mock.calls.length;
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain("Создать ключ API");
  expect(container.querySelector("input")).toBe(input);
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([3, 8]);
  expect(api.listKeys).toHaveBeenCalledTimes(reads);
  expect(api.createKey).not.toHaveBeenCalled();
  expect(clipboard).not.toHaveBeenCalled();
  await act(async () => [...container.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Создать")!.click());
  expect(api.createKey).toHaveBeenCalledExactlyOnceWith("agent:raw", "Default <i>draft</i>", "company:raw");
  await act(async () => setLocale("en"));
  await act(async () => finish({ token: "fixture-token<&>" }));
  expect(container.querySelector("code")?.textContent).toBe("fixture-token<&>");
  await act(async () => container.querySelector<HTMLButtonElement>('[title="Hide"]')!.click());
  const hidden = container.querySelector("code")?.textContent;
  await act(async () => setLocale("ru"));
  expect(container.querySelector("code")?.textContent).toBe(hidden);
  expect(container.textContent).toContain("Default <b>raw</b>");
  expect(container.querySelector("b")).toBeNull();
  expect(clipboard).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('[title="Копировать"]')!.click());
  expect(clipboard).toHaveBeenCalledExactlyOnceWith("fixture-token<&>");
  await act(async () => [...container.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Отозвать")!.click());
  await act(async () => setLocale("en"));
  expect(api.revokeKey).toHaveBeenCalledExactlyOnceWith("agent:raw", "key:raw", "company:raw");
  expect(api.createKey).toHaveBeenCalledTimes(1);
  expect(clipboard).toHaveBeenCalledTimes(1);
});
