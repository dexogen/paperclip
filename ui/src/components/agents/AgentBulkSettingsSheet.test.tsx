// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storybookAgents } from "../../../storybook/fixtures/paperclipData";
import { TooltipProvider } from "../ui/tooltip";
import { AgentBulkSettingsSheet } from "./AgentBulkSettingsSheet";
import { i18n } from "@/i18n";

const api = vi.hoisted(() => ({ models: vi.fn(), accounts: vi.fn(), update: vi.fn(), get: vi.fn() }));
vi.mock("@/api/agents", () => ({ agentsApi: { adapterModels: api.models, updateRuntimeSettings: api.update, get: api.get } }));
vi.mock("@/api/ai-connections", () => ({ aiConnectionsApi: { list: api.accounts } }));

let root: Root;
let client: QueryClient;
const onClose = vi.fn();
const agent = (id: string, adapterType: Agent["adapterType"] = "hermes_local"): Agent => ({
  ...storybookAgents[0], id, name: id, companyId: "company-1", adapterType,
  adapterConfig: { model: "old-model" }, runtimeConfig: {},
});

async function render(agents: Agent[]) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<QueryClientProvider client={client}><TooltipProvider>
    <AgentBulkSettingsSheet companyId="company-1" agents={agents} totalSelected={agents.length} onClose={onClose} />
  </TooltipProvider></QueryClientProvider>));
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
}

function button(name: string) {
  const result = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find(el => el.getAttribute("aria-label") === name || el.textContent?.trim() === name);
  if (!result) throw new Error(`Missing button: ${name}`);
  return result;
}

async function chooseModel(id: string, manual = false, whileEditing?: (input: HTMLInputElement) => Promise<void>) {
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Change default model"]')!.click());
  await act(async () => button("Model").click());
  if (manual) {
    const input = document.querySelector<HTMLInputElement>('input[placeholder^="Search models"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, id);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await whileEditing?.(input);
  }
  const option = [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
    .find(el => manual ? el.textContent?.includes("Use manual model") : el.textContent?.trim() === id);
  expect(option).toBeDefined();
  await act(async () => option!.click());
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.resetAllMocks();
  api.accounts.mockResolvedValue({ currentUserId: "board", canManageConnections: true, connections: [], pools: [] });
  api.models.mockResolvedValue([]);
});
afterEach(async () => {
  await act(async () => root?.unmount());
  client?.clear();
  document.body.innerHTML = "";
  await i18n.changeLanguage("en");
});

describe("bulk model editing", () => {
  it("saves a manual Hermes model when the local adapter has no catalog", async () => {
    const hermes = agent("Hermes");
    api.update.mockResolvedValue({ ...hermes, adapterConfig: { model: "provider/custom-model" } });
    await render([hermes]);
    await chooseModel("provider/custom-model", true, async input => {
      input.focus();
      input.setSelectionRange(2, 8);
      const calls = [api.models.mock.calls.length, api.accounts.mock.calls.length];
      for (const locale of ["ru", "en"]) {
        await act(async () => { await i18n.changeLanguage(locale); });
        expect(document.querySelector("input")).toBe(input);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe("provider/custom-model");
        expect([input.selectionStart, input.selectionEnd]).toEqual([2, 8]);
        expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(calls);
        expect(api.update).not.toHaveBeenCalled();
      }
    });
    await vi.waitFor(() => expect(button("Update 1 agent").disabled).toBe(false));
    await act(async () => button("Update 1 agent").click());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith(["Hermes"], true));
    expect(api.update).toHaveBeenCalledWith("Hermes", expect.objectContaining({ model: "provider/custom-model", harness: "hermes_local" }), "company-1");
  });

  it("does not offer manual entry for a restricted connection catalog", async () => {
    const codex = agent("Codex", "codex_local");
    codex.runtimeConfig = { aiConnection: { provider: "openai", method: "api_key", mode: "shared", connectionId: "10000000-0000-4000-8000-000000000001", grantId: "10000000-0000-4000-8000-000000000002" } };
    api.accounts.mockResolvedValue({ currentUserId: "board", connections: [{ id: "10000000-0000-4000-8000-000000000001", grantId: "10000000-0000-4000-8000-000000000002", routing: { kind: "gateway", protocol: "responses", models: [{ id: "allowed-model" }] } }] });
    await render([codex]);
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Change default model"]')!.click());
    await act(async () => button("Model").click());
    expect(document.querySelector('input[placeholder="Search models..."]')).not.toBeNull();
    expect(document.querySelector('input[placeholder*="type to create"]')).toBeNull();
  });

  it("retries only failed agents even when a saved agent's model probe becomes unavailable", async () => {
    const atlas = agent("Atlas", "paperclip_runner");
    const scout = agent("Scout", "paperclip_runner");
    atlas.adapterConfig = scout.adapterConfig = { provider: "acpx", acpxAgent: "copilot", model: "old-model" };
    let partialSave = false;
    let rejectScout!: (reason: unknown) => void;
    const scoutSave = new Promise<never>((_resolve, reject) => { rejectScout = reject; });
    api.models.mockImplementation(async (_company, _adapter, options) => {
      if (partialSave && options.agentId === "Atlas") throw new Error("Environment unavailable");
      return [{ id: "new-model", label: "new-model" }];
    });
    api.update.mockImplementation(async (id, patch) => {
      if (id === "Scout" && !partialSave) { partialSave = true; return scoutSave; }
      const original = id === "Atlas" ? atlas : scout;
      return { ...original, adapterConfig: { ...original.adapterConfig, model: patch.model } };
    });
    api.get.mockResolvedValue(scout);
    await render([atlas, scout]);
    await chooseModel("new-model");
    await act(async () => button("Update 2 agents").click());
    expect(api.update.mock.calls.map(([id]) => id)).toEqual(["Atlas", "Scout"]);
    const fieldset = document.querySelector("fieldset");
    const pendingCalls = [api.models.mock.calls.length, api.accounts.mock.calls.length];
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(button("Обновление…").disabled).toBe(true);
    expect(document.querySelector("fieldset")).toBe(fieldset);
    expect(fieldset?.disabled).toBe(true);
    expect(button("Отмена").disabled).toBe(true);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(button("Updating…").disabled).toBe(true);
    expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(pendingCalls);
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(api.get).not.toHaveBeenCalled();
    await act(async () => { rejectScout(new Error("Couldn’t save this agent. Try again.")); });
    await vi.waitFor(() => expect(button("Retry 1 agent")).toBeDefined());
    const failedCalls = [api.models.mock.calls.length, api.accounts.mock.calls.length];
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(button("Повторить для 1 агента")).toBeDefined();
    expect(document.body.textContent).toContain("Scout: Couldn’t save this agent. Try again.");
    expect(document.body.textContent).toContain("Обновлено: 1 · Не удалось сохранить: 1");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(failedCalls);
    expect(api.update).toHaveBeenCalledTimes(2);
    api.models.mockClear();
    await act(async () => { await client.invalidateQueries({ queryKey: ["bulk-agent-models"] }); });
    await vi.waitFor(() => expect(button("Retry 1 agent").disabled).toBe(false));
    expect(api.models.mock.calls.every(([, , options]) => options.agentId === "Scout")).toBe(true);
    expect(api.models).toHaveBeenCalled();
    await act(async () => button("Retry 1 agent").click());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith(["Atlas", "Scout"], true));
    expect(api.update.mock.calls.map(([id]) => id)).toEqual(["Atlas", "Scout", "Scout"]);
    expect(api.get).toHaveBeenCalledExactlyOnceWith("Scout", "company-1");
    for (const [, patch, companyId] of api.update.mock.calls) {
      expect(patch).toEqual({ harness: "copilot_runtime", model: "new-model", expected: { model: "old-model", aiConnection: null } });
      expect(companyId).toBe("company-1");
    }
  });

  it("keeps raw fallback-name collisions and reads back lost responses before retrying without duplicate writes", async () => {
    const local = agent("Local <strong>&");
    local.adapterConfig = {};
    const assigned = agent("Assigned");
    assigned.adapterConfig = { model: "Harness default" };
    const binding = { provider: "anthropic", method: "api_key", mode: "shared", connectionId: "10000000-0000-4000-8000-000000000001", grantId: "10000000-0000-4000-8000-000000000002" } as const;
    assigned.runtimeConfig = { aiConnection: binding };
    api.accounts.mockResolvedValue({ currentUserId: "board", canManageConnections: true, connections: [{ ...binding, id: binding.connectionId, companyId: "company-1", ownership: "shared", status: "connected", name: "Local credentials" }] });
    api.update.mockRejectedValue(undefined);
    api.get.mockImplementation(async id => {
      const original = id === local.id ? local : assigned;
      return { ...original, adapterConfig: { model: "provider/custom-model" } };
    });
    await render([local, assigned]);
    await act(async () => { await i18n.changeLanguage("ru"); });
    const sections = document.querySelectorAll("fieldset section");
    expect(sections[0].textContent).toContain("Local credentials · Оставить без изменений");
    expect(sections[1].textContent).toContain("Harness default · Оставить без изменений");
    expect(document.body.textContent).toContain("Local <strong>&");
    await act(async () => { await i18n.changeLanguage("en"); });
    await chooseModel("provider/custom-model", true);
    await vi.waitFor(() => expect(button("Update 2 agents").disabled).toBe(false));
    await act(async () => button("Update 2 agents").click());
    await vi.waitFor(() => expect(button("Retry 2 agents")).toBeDefined());
    expect(api.update.mock.calls).toEqual([
      [local.id, { harness: "hermes_local", model: "provider/custom-model", expected: { model: null, aiConnection: null } }, "company-1"],
      [assigned.id, { harness: "hermes_local", model: "provider/custom-model", expected: { model: "Harness default", aiConnection: binding } }, "company-1"],
    ]);
    const calls = [api.models.mock.calls.length, api.accounts.mock.calls.length];
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(document.body.textContent).toContain("Не удалось сохранить настройки этого агента. Повторите попытку.");
    expect(button("Повторить для 2 агентов")).toBeDefined();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(document.body.textContent).toContain("Couldn’t save this agent. Try again.");
    expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(calls);
    expect(api.get).not.toHaveBeenCalled();
    await act(async () => button("Retry 2 agents").click());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith([local.id, assigned.id], true));
    expect(api.get.mock.calls).toEqual([[local.id, "company-1"], [assigned.id, "company-1"]]);
    expect(api.update).toHaveBeenCalledTimes(2);
  });

  it("keeps a rejected pool selection reactive and sends the exact connection and model patch after explicit correction", async () => {
    const codex = agent("Codex", "codex_local");
    const nextBinding = { provider: "openai", method: "api_key", mode: "responsible_user" } as const;
    api.accounts.mockResolvedValue({ currentUserId: "board", canManageConnections: true,
      connections: [{ id: "10000000-0000-4000-8000-000000000001", grantId: "10000000-0000-4000-8000-000000000002", companyId: "company-1", provider: "openai", method: "api_key", ownership: "personal", ownerUserId: "board", isDefault: true, status: "connected", name: "Responsible user's default" }],
      pools: [{ id: "10000000-0000-4000-8000-000000000003", name: "Pool <raw>&", enabled: true, members: [{ binding: nextBinding, profile: {} }] }],
    });
    api.models.mockResolvedValue([{ id: "new-model", label: "new-model" }]);
    api.update.mockResolvedValue({ ...codex, adapterConfig: { model: "new-model" }, runtimeConfig: { aiConnection: nextBinding } });
    await render([codex]);
    await act(async () => button("Change connection").click());
    await vi.waitFor(() => expect(document.querySelector("select")).not.toBeNull());
    const select = document.querySelector("select")!;
    await act(async () => {
      select.value = "10000000-0000-4000-8000-000000000003";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Configure connection pools on each agent’s configuration page.");
    const calls = [api.models.mock.calls.length, api.accounts.mock.calls.length];
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(document.body.textContent).toContain("Настраивайте пулы подключений на странице настроек каждого агента.");
    expect(document.body.textContent).toContain("Pool <raw>&");
    expect(document.querySelector("select")).toBe(select);
    expect(button("Обновить 1 агента").disabled).toBe(true);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(calls);
    expect(api.update).not.toHaveBeenCalled();
    await act(async () => {
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await vi.waitFor(() => expect(client.isFetching()).toBe(0));
    await chooseModel("new-model");
    await vi.waitFor(() => expect(button("Update 1 agent").disabled).toBe(false));
    const beforeSave = [api.models.mock.calls.length, api.accounts.mock.calls.length];
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(button("Обновить 1 агента").disabled).toBe(false);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect([api.models.mock.calls.length, api.accounts.mock.calls.length]).toEqual(beforeSave);
    await act(async () => button("Update 1 agent").click());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith([codex.id], true));
    expect(api.update).toHaveBeenCalledExactlyOnceWith(codex.id, {
      harness: "codex_local", aiConnection: nextBinding, model: "new-model", expected: { model: "old-model", aiConnection: null },
    }, "company-1");
  });

  it("translates stored own load failures while keeping equal provider errors literal without refetching", async () => {
    api.accounts.mockImplementation(async (_company, id) => {
      if (id === "Own") throw undefined;
      throw new Error("Couldn’t load connections or models");
    });
    await render([agent("Own"), agent("Provider")]);
    const calls = api.accounts.mock.calls.length;
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(document.body.textContent).toContain("Own: Не удалось загрузить подключения или модели");
    expect(document.body.textContent).toContain("Provider: Couldn’t load connections or models");
    expect(button("Обновить 2 агентов").disabled).toBe(true);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(api.accounts).toHaveBeenCalledTimes(calls);
    expect(api.update).not.toHaveBeenCalled();
    api.accounts.mockResolvedValue({ currentUserId: "board", canManageConnections: true, connections: [] });
    await act(async () => button("Retry loading options").click());
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).toBeNull());
    expect(api.accounts).toHaveBeenCalledTimes(calls + 2);
  });

});
