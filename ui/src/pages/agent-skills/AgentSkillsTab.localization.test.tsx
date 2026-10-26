// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Agent, AgentSkillSnapshot, CompanySkillListItem, CompanySkillVersion } from "@paperclipai/shared";
import { agentsApi } from "../../api/agents";
import { companySkillsApi } from "../../api/companySkills";
import { instanceSettingsApi } from "../../api/instanceSettings";
import { TooltipProvider } from "../../components/ui/tooltip";
import { setLocale } from "../../i18n";
import { queryKeys } from "../../lib/queryKeys";
import { AgentSkillsTab } from "./AgentSkillsTab";

vi.mock("@/lib/router", () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));

const coreKey = "paperclipai/paperclip/paperclip";
const extraKey = "local/review";
const versionId = "22222222-2222-4222-8222-222222222222";
const rawName = "Release <b>raw</b> & Навык";
const agent = { id: "agent-1", urlKey: "agent-one", companyId: "company-1", adapterType: "codex_local", adapterConfig: {} } as Agent;
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let snapshot: AgentSkillSnapshot;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  await setLocale("en");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false }, mutations: { retry: false } } });
  snapshot = {
    adapterType: agent.adapterType, supported: true, mode: "ephemeral", desiredSkills: [coreKey],
    desiredSkillEntries: [{ key: coreKey, versionId: null }], warnings: [],
    entries: [{ key: "automatic", runtimeName: "Automatic <i>raw</i>", desired: true, managed: true, readOnly: true, state: "configured", detail: "Provider detail", originLabel: "Local folder", locationLabel: "/raw/location" }],
  };
  client.setQueryData(queryKeys.agents.skills(agent.id), snapshot);
  client.setQueryData(queryKeys.companySkills.list(agent.companyId), [
    { id: "skill-core", key: coreKey, name: rawName, categories: [], sourceBadge: "catalog", sourceType: "catalog", sourceLabel: null },
    { id: "skill-extra", key: extraKey, name: "Extra skill", categories: [], sourceBadge: "local", sourceType: "local_path", sourceLabel: "/hidden/path" },
  ] satisfies Partial<CompanySkillListItem>[]);
  client.setQueryData(queryKeys.instance.experimentalSettings, { enableBetaSkills: true });
  client.setQueryData(queryKeys.companySkills.versions(agent.companyId, "skill-core"), [{
    id: versionId, releaseId: "v7", releaseName: "Release <b>literal</b>", label: null, releasedAt: new Date(2026, 6, 21, 12),
  }] satisfies Partial<CompanySkillVersion>[]);
  vi.spyOn(agentsApi, "skills");
  vi.spyOn(companySkillsApi, "list");
  vi.spyOn(companySkillsApi, "versions");
  vi.spyOn(instanceSettingsApi, "getExperimental");
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await setLocale("en");
});

async function render(value = agent) {
  await act(async () => root.render(<QueryClientProvider client={client}><TooltipProvider><AgentSkillsTab agent={value} companyId={value.companyId} /></TooltipProvider></QueryClientProvider>));
}
async function changeLocale(locale: string) { await act(async () => setLocale(locale)); }
async function click(element: HTMLElement) { expect(element).toBeTruthy(); await act(async () => element.click()); }
async function wait(milliseconds = 30) { await act(async () => new Promise(resolve => setTimeout(resolve, milliseconds))); }
function toggle(name: string) { return container.querySelector<HTMLButtonElement>(`[role="switch"][aria-label="${name}"]`)!; }
function button(text: string) { return [...container.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent?.trim().startsWith(text))!; }
async function search(value: string) {
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}
function expectNoReads() {
  for (const spy of [agentsApi.skills, companySkillsApi.list, companySkillsApi.versions, instanceSettingsApi.getExperimental]) expect(spy).not.toHaveBeenCalled();
}

it("keeps real toggle and release drafts, focus and exact pending writes through EN/RU/EN", async () => {
  const toggleSave = deferred<AgentSkillSnapshot>();
  const releaseSave = deferred<AgentSkillSnapshot>();
  const sync = vi.spyOn(agentsApi, "syncSkills").mockReturnValueOnce(toggleSave.promise).mockReturnValueOnce(releaseSave.promise);
  await render();
  await click(button("Automatic and detected skills"));
  expect(container.textContent).toContain("Automatic <i>raw</i>");
  await click(toggle("Enable Extra skill"));
  expect(sync).not.toHaveBeenCalled();
  const input = await search("skill");
  await wait(300);
  expect(sync).toHaveBeenCalledExactlyOnceWith(agent.id, [coreKey, extraKey], "replace", agent.companyId);
  await changeLocale("ru");
  expect(container.textContent).toContain("Сохранение…");
  expect(input.value).toBe("skill");
  expect(document.activeElement).toBe(input);
  expect(toggle("Отключить Extra skill").getAttribute("aria-checked")).toBe("true");
  await changeLocale("en");
  expect(container.textContent).toContain("Saving…");
  expect(document.activeElement).toBe(input);
  expect(sync).toHaveBeenCalledTimes(1);
  expectNoReads();
  const saved = { ...snapshot, desiredSkills: [coreKey, extraKey], desiredSkillEntries: [{ key: coreKey, versionId: null }, { key: extraKey, versionId: null }] };
  await act(async () => toggleSave.resolve(saved));
  await wait();
  await search("");
  expect(container.textContent).toContain("Automatic <i>raw</i>");
  const picker = container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  await act(async () => picker.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes("Release <b>literal</b>"))!;
  await click(option);
  expect(sync).toHaveBeenLastCalledWith(agent.id, [{ key: coreKey, versionId }, extraKey], "replace", agent.companyId);
  expect(sync).toHaveBeenCalledTimes(2);
  const focused = await search("");
  await changeLocale("ru");
  expect(container.querySelector('[role="combobox"]')).toBe(picker);
  expect(picker.disabled).toBe(true);
  expect(picker.textContent).toContain("Release <b>literal</b>");
  expect(picker.getAttribute("aria-label")).toBe("Выпуск навыка");
  expect(document.activeElement).toBe(focused);
  expect(container.textContent).toContain(rawName);
  expect(container.querySelector("b, i")).toBeNull();
  await changeLocale("en");
  await wait(300);
  expect(sync).toHaveBeenCalledTimes(2);
  expectNoReads();
  await act(async () => releaseSave.resolve({ ...saved, desiredSkillEntries: [{ key: coreKey, versionId }, { key: extraKey, versionId: null }] }));
  await wait();
  expect(container.textContent).toContain("Saved");
  expect(picker.disabled).toBe(false);
});

it("translates only the owned failure and never retries an unchanged failed selection", async () => {
  const pending = deferred<AgentSkillSnapshot>();
  const sync = vi.spyOn(agentsApi, "syncSkills").mockReturnValueOnce(pending.promise);
  await render();
  await click(toggle("Enable Extra skill"));
  await wait(300);
  await act(async () => pending.reject(null));
  await wait();
  expect(container.textContent).toContain("Failed to update skills");
  await changeLocale("ru");
  expect(container.textContent).toContain("Не удалось обновить навыки");
  expect(toggle("Отключить Extra skill").getAttribute("aria-checked")).toBe("true");
  await changeLocale("en");
  await wait(300);
  expect(sync).toHaveBeenCalledTimes(1);
  sync.mockRejectedValueOnce(new Error("Failed to update skills"));
  await click(toggle(`Disable ${rawName}`));
  await wait(300);
  await changeLocale("ru");
  expect(container.textContent).toContain("Failed to update skills");
  expect(sync).toHaveBeenCalledTimes(2);
});

it("preserves native legacy, beta and automatic read-only gates in Russian", async () => {
  const sync = vi.spyOn(agentsApi, "syncSkills").mockResolvedValue({ ...snapshot, desiredSkills: [], desiredSkillEntries: [] });
  client.setQueryData(queryKeys.agents.skills(agent.id), { ...snapshot, desiredSkills: [], desiredSkillEntries: [] });
  client.setQueryData(queryKeys.instance.experimentalSettings, { enableBetaSkills: false });
  await changeLocale("ru");
  await render({ ...agent, adapterType: "paperclip_runner" });
  expect(toggle(`Включить ${rawName}`).disabled).toBe(true);
  expect(container.querySelector('[role="combobox"]')).toBeNull();
  await click(button("Автоматические и обнаруженные навыки"));
  expect(container.querySelector('[aria-label="Только чтение"]')).not.toBeNull();
  expect(container.textContent).toContain("Local folder");
  expect(container.textContent).toContain("/raw/location");
  expect(sync).not.toHaveBeenCalled();
  await act(async () => client.setQueryData(queryKeys.agents.skills(agent.id), snapshot));
  await wait();
  expect(toggle(`Отключить ${rawName}`).disabled).toBe(false);
  await click(toggle(`Отключить ${rawName}`));
  await wait(300);
  expect(sync).toHaveBeenCalledExactlyOnceWith(agent.id, [], "replace", agent.companyId);
});

it("renders a missing skill key literally and removes only the chosen key", async () => {
  const missing = "missing <img src=x> & key";
  client.setQueryData(queryKeys.agents.skills(agent.id), { ...snapshot, desiredSkills: [coreKey, missing] });
  const sync = vi.spyOn(agentsApi, "syncSkills").mockResolvedValue(snapshot);
  await changeLocale("ru");
  await render();
  expect(container.textContent).toContain(`Навык ${missing} включён, но отсутствует в библиотеке организации.`);
  expect(container.querySelector("img")).toBeNull();
  await changeLocale("en");
  expect(container.textContent).toContain(`${missing} is enabled but missing from the organization library.`);
  expect(sync).not.toHaveBeenCalled();
  await click(button("Remove"));
  await wait(300);
  expect(sync).toHaveBeenCalledExactlyOnceWith(agent.id, [coreKey], "replace", agent.companyId);
});
