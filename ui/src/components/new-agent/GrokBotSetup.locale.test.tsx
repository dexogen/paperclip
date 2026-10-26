// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { Dialog, DialogContent } from "../ui/dialog";
import { GrokBotSetup } from "./GrokBotSetup";
import { GrokBotConnection } from "../GrokBotConnection";

const api = vi.hoisted(() => ({ resume: vi.fn(), connection: vi.fn(), create: vi.fn(), pair: vi.fn(), configure: vi.fn(), verify: vi.fn(), retry: vi.fn(), disconnect: vi.fn(), stop: vi.fn(), recover: vi.fn() }));
vi.mock("@/api/grokBot", () => ({ grokBotApi: api }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: async () => [{ id: "manager-id", name: "You <strong>raw</strong>", status: "idle" }] } }));
let root: Root;
let host: HTMLDivElement;
let cache: QueryClient;
const language = async (locale: string) => act(async () => { await i18n.changeLanguage(locale); });
const flush = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
const button = (text: string) => [...document.querySelectorAll("button")].find(node => node.textContent === text)!;
function field(label: string) {
  const wrapper = [...document.querySelectorAll("label")].find(node => node.querySelector("span")?.textContent === label)!;
  expect(wrapper, label).toBeTruthy();
  return wrapper.querySelector<HTMLInputElement | HTMLSelectElement>("input,select")!;
}
async function setField(label: string, value: string) {
  const input = field(label);
  await act(async () => {
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
  return input;
}
async function render(child: ReactNode) { await act(async () => root.render(<QueryClientProvider client={cache}>{child}</QueryClientProvider>)); await flush(); }
beforeEach(async () => {
  await i18n.changeLanguage("en"); vi.clearAllMocks(); Object.values(api).forEach(mock => mock.mockReset());
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); cache.clear(); host.remove(); await i18n.changeLanguage("en"); });

it("retains dirty identity, role and stable wizard steps through locale changes and one pending create", async () => {
  api.resume.mockResolvedValue(null);
  api.connection.mockResolvedValue({ enabled: false, canConfigureConnection: false, binding: null });
  let resolveCreate!: (value: unknown) => void;
  api.create.mockImplementation(() => new Promise(resolve => { resolveCreate = resolve; }));
  const name = "Operator <strong>literal</strong>", botName = "Night <strong>Shift</strong>";
  await render(<Dialog open><DialogContent><GrokBotSetup companyId="company-id" companyName="your organization" onBack={vi.fn()} onClose={vi.fn()} /></DialogContent></Dialog>);
  await setField("Paperclip name", name);
  const bot = await setField("Bot name in Grok", botName) as HTMLInputElement;
  await setField("Role", "researcher"); await setField("Manager", "manager-id");
  const steps = [...document.querySelectorAll("ol li")];
  bot.focus(); bot.setSelectionRange(3, 9);
  await language("ru");
  expect(field("Имя в Paperclip").value).toBe(name);
  expect(field("Имя бота в Grok")).toBe(bot);
  expect(document.activeElement).toBe(bot);
  expect([bot.selectionStart, bot.selectionEnd]).toEqual([3, 9]);
  expect(field("Роль").value).toBe("researcher");
  expect(field("Руководитель").value).toBe("manager-id");
  expect(document.body.textContent).toContain("your organization");
  expect(document.body.textContent).toContain("You <strong>raw</strong>");
  expect(document.querySelector('[role="dialog"] strong')).toBeNull();
  expect([...document.querySelectorAll("ol li")]).toEqual(steps);
  expect(api.create).not.toHaveBeenCalled(); expect(api.pair).not.toHaveBeenCalled();
  await language("en");
  await act(async () => button("Continue").click());
  const expected = { name, botName, role: "researcher", reportsTo: "manager-id" };
  expect(api.create).toHaveBeenCalledExactlyOnceWith("company-id", expected);
  await language("ru");
  expect(field("Имя бота в Grok")).toBe(bot);
  expect(bot.value).toBe(botName);
  expect(button("Сохранение…").disabled).toBe(true);
  expect([...document.querySelectorAll("ol li")]).toEqual(steps);
  expect(api.create).toHaveBeenCalledTimes(1);
  await act(async () => resolveCreate({ agent: { id: "created-agent", status: "idle", ...expected }, approvalId: null, binding: null }));
  await flush();
  expect(document.querySelector('ol li[aria-current="step"]')).toBe(steps[1]);
  expect(api.connection).toHaveBeenCalledWith("company-id", "created-agent", expect.any(AbortSignal));
  expect(api.pair).not.toHaveBeenCalled();
});

it("retains pending routine credentials and raw failure through locales without another write", async () => {
  const binding = { id: "binding-id", connected: true, status: "connected", routine: { configured: false, verified: false, revision: 7, botName: "Night Shift", lastExchange: null } };
  const connection = { enabled: true, canConfigureConnection: true, resourceUrl: "https://paperclip.example/mcp/runner", binding };
  api.connection.mockResolvedValue(connection);
  let rejectConfigure!: (error: unknown) => void;
  api.configure.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectConfigure = reject; }));
  await render(<GrokBotConnection companyId="company-id" agentId="agent-id" />);
  await setField("Bot name in Grok", "Your Bot <raw>");
  await setField("Webhook URL", "https://grok.example/hook/private-value");
  const secret = await setField("Webhook key", "test-private-key") as HTMLInputElement;
  secret.focus(); secret.setSelectionRange(2, 8);
  const reads = api.connection.mock.calls.length;
  await language("ru");
  expect(field("Ключ вебхука")).toBe(secret);
  expect(secret.type).toBe("password"); expect(secret.value).toBe("test-private-key");
  expect(document.activeElement).toBe(secret);
  expect([secret.selectionStart, secret.selectionEnd]).toEqual([2, 8]);
  expect(button("Сохранить регулярное задание").disabled).toBe(false);
  expect(api.configure).not.toHaveBeenCalled(); expect(api.connection).toHaveBeenCalledTimes(reads);
  await language("en"); await act(async () => button("Save routine").click());
  const expected = { bindingId: "binding-id", expectedRevision: 7, botName: "Your Bot <raw>", webhookUrl: "https://grok.example/hook/private-value", webhookKey: "test-private-key" };
  expect(api.configure).toHaveBeenCalledExactlyOnceWith("company-id", "agent-id", expected);
  await language("ru");
  expect(field("Ключ вебхука")).toBe(secret);
  expect(secret.value).toBe("test-private-key");
  expect(button("Сохранить регулярное задание").disabled).toBe(true);
  await act(async () => rejectConfigure(new Error("Save routine <strong>raw failure</strong>"))); await flush();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Save routine <strong>raw failure</strong>");
  expect(host.querySelector('[role="alert"] strong')).toBeNull();
  expect(secret.value).toBe("test-private-key");
  expect(api.configure).toHaveBeenCalledTimes(1); expect(api.connection).toHaveBeenCalledTimes(reads);
  await language("en");
  api.configure.mockImplementationOnce(async () => { api.connection.mockResolvedValue({ ...connection, binding: { ...binding, routine: { ...binding.routine, configured: true, revision: 8 } } }); });
  await act(async () => button("Save routine").click()); await flush();
  expect(api.configure).toHaveBeenCalledTimes(2);
  expect(api.configure).toHaveBeenLastCalledWith("company-id", "agent-id", expected);
  expect(host.contains(secret)).toBe(false);
  expect(host.textContent).not.toContain("test-private-key");
});
