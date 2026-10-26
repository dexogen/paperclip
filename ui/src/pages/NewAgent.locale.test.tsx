// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { setLocale } from "@/i18n";
import {
  api, envApi, settings, secrets, state, managedApi, adapterApi,
  container, settle, click, fill, render, renderCurrentParams,
} from "./NewAgent.test-support";

beforeEach(async () => { await setLocale("en"); });
afterEach(async () => { await setLocale("en"); });

async function select(label: string, value: string) {
  const input = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
  expect(input).toBeTruthy();
  await act(async () => {
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settle();
  return input;
}

function calls() {
  return [api.create, api.update, api.hire, api.testEnvironment, api.adapterModels, envApi.probe,
    envApi.list, adapterApi.list, settings.get, settings.getGeneral, settings.getExperimental,
    secrets.create, managedApi.create, managedApi.list].map(mock => mock.mock.calls.length);
}

it("retains model, effort, computer, role and one setup identity through EN RU EN", async () => {
  const literalName = "You <b>& Atlas</b>";
  const machineName = "Local <b>& Машина</b>";
  envApi.list.mockResolvedValue([
    { id: "local-1", name: "Local", driver: "local", status: "active", config: {} },
    { id: "machine-2", name: machineName, driver: "ssh", status: "active", config: {} },
  ]);
  state.params = new URLSearchParams({ name: literalName, adapterType: "pi_local" });
  await renderCurrentParams();
  await fill("Model", "openai/model<&>");
  const effort = await select("Thinking effort", "high");
  const environment = await select("Environment", "machine-2");
  const model = container.querySelector<HTMLInputElement>('[aria-label="Model"]')!;
  model.focus();
  model.setSelectionRange(3, 8);
  const before = calls();
  const createPayload = structuredClone(api.create.mock.calls[0][1]);
  await act(async () => setLocale("ru"));
  await settle();
  expect(container.textContent).toContain("Настройте агента");
  expect(container.textContent).toContain(literalName);
  expect(container.textContent).toContain(machineName);
  expect(container.querySelector("b")).toBeNull();
  expect(container.querySelector('[aria-label="Уровень рассуждений"]')).toBe(effort);
  expect(effort.value).toBe("high");
  expect(effort.selectedOptions[0].textContent).toBe("Высокий");
  expect(container.querySelector('[aria-label="Среда выполнения"]')).toBe(environment);
  expect(environment.value).toBe("machine-2");
  expect(model.value).toBe("openai/model<&>");
  expect(document.activeElement).toBe(model);
  expect([model.selectionStart, model.selectionEnd]).toEqual([3, 8]);
  expect(calls()).toEqual(before);
  await act(async () => setLocale("en"));
  await settle();
  expect(document.activeElement).toBe(model);
  expect(calls()).toEqual(before);
  expect(api.create.mock.calls[0][1]).toEqual(createPayload);
  expect(createPayload.role).toBe("general");
  expect(createPayload.reportsTo).toBe("ceo");
  await click("Finish setup");
  expect(api.hire).toHaveBeenCalledTimes(1);
  const hired = api.hire.mock.calls[0][1];
  expect(hired).toEqual({
    setupAgentId: createPayload.setupId, name: literalName, appearance: createPayload.appearance,
    role: "general", reportsTo: "ceo", adapterType: "pi_local",
    adapterConfig: expect.objectContaining({ model: "openai/model<&>", thinking: "high" }),
    defaultEnvironmentId: "machine-2", runtimeConfig: createPayload.runtimeConfig, budgetMonthlyCents: 0,
  });
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(api.testEnvironment).not.toHaveBeenCalled();
  expect(envApi.probe).not.toHaveBeenCalled();
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain(`Назначить задачу агенту «${literalName}»`);
  expect(api.hire).toHaveBeenCalledTimes(1);
});

it("preserves a subscription login and pending connection save without another test or save", async () => {
  envApi.list.mockResolvedValue([{ id: "login-env", name: "Browser sign-in", status: "active", driver: "sandbox", config: { provider: "daytona" } }]);
  envApi.capabilities.mockResolvedValue({ sandboxProviders: { daytona: { supportsLoginPty: true } } });
  settings.get.mockResolvedValue({ defaultEnvironmentId: "login-env" });
  api.getAdapterAuthSignal.mockResolvedValue({ status: "missing" });
  await render("codex_local");
  await click("OpenAISubscription");
  const login = [...container.querySelectorAll("button")].find(button => button.textContent === "Complete subscription login")!;
  expect(login).toBeTruthy();
  login.focus();
  const before = calls();
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain("Подключите модель");
  expect(document.activeElement).toBe(login);
  await act(async () => setLocale("en"));
  expect(calls()).toEqual(before);
  let finish!: (value: object) => void;
  api.update.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await click("Complete subscription login");
  const update = api.update.mock.calls[0];
  expect(update).toEqual([api.create.mock.calls[0][1].setupId, expect.objectContaining({ runtimeConfig: expect.objectContaining({ aiConnection: { provider: "openai", method: "subscription", mode: "responsible_user" } }) }), "company-1"]);
  const afterSubmit = calls();
  await act(async () => setLocale("ru"));
  await act(async () => setLocale("en"));
  expect(calls()).toEqual(afterSubmit);
  expect(api.update).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ...api.create.mock.calls[0][1], ...update[1], id: update[0] }));
  await settle();
  expect(container.textContent).toContain("Configure your agent");
  expect(api.hire).not.toHaveBeenCalled();
  expect(api.testEnvironment).not.toHaveBeenCalled();
});

it("reformats only owned validation errors and retains raw provider failures without a retry", async () => {
  await render("cursor_cloud");
  await click("Run test");
  expect(container.textContent).toContain("Enter a GitHub repository URL.");
  const before = calls();
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain("Введите URL репозитория GitHub.");
  await act(async () => setLocale("en"));
  expect(calls()).toEqual(before);
  await fill("GitHub repository", "https://github.com/org/repo");
  await fill("CURSOR_API_KEY", "fixture-key");
  const raw = "Could not test the agent. <b>& provider</b>";
  api.testEnvironment.mockRejectedValueOnce(new Error(raw));
  await click("Run test");
  expect(api.testEnvironment).toHaveBeenCalledTimes(1);
  await act(async () => setLocale("ru"));
  expect(container.textContent).toContain(raw);
  expect(container.querySelector("b")).toBeNull();
  expect(api.testEnvironment).toHaveBeenCalledTimes(1);
  expect(api.hire).not.toHaveBeenCalled();
});
