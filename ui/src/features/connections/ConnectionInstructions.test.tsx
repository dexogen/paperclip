// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolConnection } from "@paperclipai/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { AgentConnectionInstructions, ConnectionInstructionsSettings } from "./ConnectionInstructions";

const api = vi.hoisted(() => ({ update: vi.fn(), profiles: vi.fn() }));
vi.mock("@/api/tools", () => ({ toolsApi: { updateConnection: api.update, getEffectiveProfilesForAgent: api.profiles } }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const template = { id: "custom.instructions", version: 3, text: "Default <strong>instructions</strong> /repo/проект" };
const saved = { enabled: true, text: "Saved <em>instructions</em>", template: { id: template.id, version: 2 } };
const connection = { id: "connection-1", name: "Agent instructions", agentInstructions: saved } as ToolConnection;

function button(text: string) {
  const match = [...host.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent === text);
  expect(match, text).toBeDefined();
  return match!;
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); }
async function language(lang: string) { await act(async () => { await i18n.changeLanguage(lang); }); }
async function render(node: ReactNode) {
  await act(async () => root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>));
}
async function edit(textarea: HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage("en");
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); client.clear(); host.remove(); await i18n.changeLanguage("en");
});

it("keeps a focused instruction draft and exact save receipt through locale changes", async () => {
  let rejectSave!: (cause: unknown) => void;
  api.update.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await render(<ConnectionInstructionsSettings connection={connection} provider="Provider <strong>raw</strong>" template={template} canConfigure />);
  await act(async () => button("Edit instructions").click());
  const textarea = host.querySelector<HTMLTextAreaElement>("textarea")!;
  const dirty = "Keep <strong>literal</strong> instructions /tmp/черновик";
  await edit(textarea, dirty);
  await act(async () => host.querySelector<HTMLButtonElement>('[role="switch"]')!.click());
  textarea.focus(); textarea.setSelectionRange(5, 13);
  await language("ru");
  expect(host.querySelector("h3")?.textContent).toBe("Инструкции для агентов");
  expect(host.textContent).toContain("Provider <strong>raw</strong>");
  expect(host.querySelector("strong")).toBeNull();
  expect(host.querySelector("textarea")).toBe(textarea);
  expect(document.activeElement).toBe(textarea);
  expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([5, 13]);
  expect(textarea.value).toBe(dirty);
  expect(host.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("false");
  await language("en");
  expect(host.querySelector("textarea")).toBe(textarea);
  expect(document.activeElement).toBe(textarea);
  expect(api.update).not.toHaveBeenCalled();
  await edit(textarea, "   ");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Enter instructions.");
  expect(button("Save instructions").disabled).toBe(true);
  await edit(textarea, dirty);
  await act(async () => button("Save instructions").click());
  await flush();
  expect(api.update).toHaveBeenCalledExactlyOnceWith("connection-1", { agentInstructions: { ...saved, enabled: false, text: dirty } });
  await language("ru");
  expect(button("Сохранение…").disabled).toBe(true);
  expect(textarea.disabled).toBe(true);
  await act(async () => { rejectSave(null); });
  await flush();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Не удалось сохранить инструкции. Попробуйте ещё раз.");
  expect(textarea.value).toBe(dirty);
  await language("en");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Couldn’t save instructions. Try again.");
  expect(api.update).toHaveBeenCalledTimes(1);
  api.update.mockRejectedValueOnce(new Error("Couldn’t save instructions. Try again."));
  await act(async () => button("Save instructions").click());
  await flush();
  await language("ru");
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Couldn’t save instructions. Try again.");
  expect(api.update).toHaveBeenCalledTimes(2);
  expect(api.update.mock.calls[1]).toEqual(api.update.mock.calls[0]);
  await act(async () => button("Восстановить исходные инструкции").click());
  expect(textarea.value).toBe(template.text);
  expect(host.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("false");
  api.update.mockResolvedValueOnce({});
  await act(async () => button("Сохранить инструкции").click());
  await flush();
  expect(api.update).toHaveBeenLastCalledWith("connection-1", { agentInstructions: { enabled: false, text: template.text, template: { id: template.id, version: 3 } } });
});

it("retains cleared settings and configuration permissions without writing on a language change", async () => {
  const cleared = { ...connection, agentInstructions: null } as ToolConnection;
  await render(<ConnectionInstructionsSettings connection={cleared} provider="Provider" template={template} canConfigure={false} />);
  await language("ru");
  const toggle = host.querySelector<HTMLButtonElement>('[role="switch"]')!;
  expect(toggle.disabled).toBe(true);
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(button("Изменить инструкции").disabled).toBe(true);
  expect(host.textContent).toContain(template.text);
  await language("en");
  expect(host.querySelector('[role="switch"]')).toBe(toggle);
  expect(button("Edit instructions").disabled).toBe(true);
  expect(api.update).not.toHaveBeenCalled();
});

it("localizes connection instructions after an explicit retry while retaining raw sources and access filtering", async () => {
  let rejectProfiles!: (cause: unknown) => void;
  api.profiles.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectProfiles = reject; }));
  await render(<AgentConnectionInstructions companyId="company-1" agentId="agent-1" />);
  expect(host.textContent).toContain("Loading connection instructions…");
  await language("ru");
  expect(host.textContent).toContain("Загрузка инструкций подключений…");
  await act(async () => rejectProfiles(new Error("Provider diagnostic")));
  await flush();
  expect(host.textContent).toContain("Не удалось загрузить инструкции подключений.");
  expect(host.textContent).not.toContain("Provider diagnostic");
  await language("en");
  expect(api.profiles).toHaveBeenCalledExactlyOnceWith("company-1", "agent-1");
  const source = { id: "literal-source", name: "From connections <strong>raw</strong>", enabled: true, status: "active", agentInstructions: { ...saved, enabled: false }, config: {} };
  api.profiles.mockResolvedValueOnce({ installedConnections: [source,
    { ...source, id: "disabled-source", name: "Hidden disabled", enabled: false },
    { ...source, id: "inactive-source", name: "Hidden inactive", status: "draft" },
    { ...source, id: "unconfigured-source", name: "Honcho", config: { sourceTemplateKey: "honcho", methodConfig: {} } },
  ] });
  await act(async () => button("Retry").click());
  await flush();
  const link = host.querySelector<HTMLAnchorElement>('a[href="/apps/literal-source/permissions"]')!;
  expect(link.textContent).toBe(source.name);
  expect(host.textContent).toContain(saved.text);
  expect(host.textContent).toContain("Complete this connection’s configuration before agents receive its instructions.");
  expect(host.textContent).not.toContain("Hidden disabled");
  expect(host.textContent).not.toContain("Hidden inactive");
  await language("ru");
  expect(host.querySelector("h3")?.textContent).toBe("Из подключений");
  expect(host.textContent).toContain("Эти инструкции отключены для данного подключения.");
  expect(host.textContent).toContain("Завершите настройку подключения, чтобы агенты получали его инструкции.");
  expect(host.querySelector('a[href="/apps/literal-source/permissions"]')).toBe(link);
  expect(host.querySelector("strong")).toBeNull();
  expect(host.textContent).toContain(saved.text);
  await language("en");
  expect(api.profiles).toHaveBeenCalledTimes(2);
  expect(api.update).not.toHaveBeenCalled();
});
