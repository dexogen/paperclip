// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { AgentProjectAccessSettings } from "./AgentProjectAccessSettings";

const mocks = vi.hoisted(() => ({ access: vi.fn(), projects: vi.fn(), save: vi.fn(), search: "" }));
vi.mock("../api/agents", () => ({ agentsApi: { projectAccess: mocks.access, addProjectAccess: mocks.save } }));
vi.mock("../api/projects", () => ({ projectsApi: { list: mocks.projects } }));
vi.mock("../lib/router", () => ({
  useSearchParams: () => [new URLSearchParams(mocks.search)],
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
const agent = { id: "agent-1", companyId: "company-1", name: "Save project access <raw>", urlKey: "agent-url" };
const taskId = "11111111-1111-4111-8111-111111111111";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.resetAllMocks();
  mocks.search = `fromTask=${taskId}`;
  mocks.access.mockResolvedValue({ projectIds: ["existing"], canManage: true });
  mocks.projects.mockResolvedValue([{ id: "existing", name: "Existing" }, { id: "new", name: "Unavailable project" }]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  await i18n.changeLanguage("en");
});

async function mount(expected = "Allowed projects") {
  await act(async () => root.render(<QueryClientProvider client={client}><AgentProjectAccessSettings agent={agent} /></QueryClientProvider>));
  await vi.waitFor(() => expect(container.textContent).toContain(expected));
}
function button(text: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent === text);
  expect(found, text).toBeDefined();
  return found!;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function chooseProject() {
  await click("Add project");
  const existing = document.querySelector<HTMLButtonElement>('[role="checkbox"][aria-label="Existing"]')!;
  expect(existing.disabled).toBe(true);
  const checkbox = document.querySelector<HTMLButtonElement>('[role="checkbox"][aria-label="Unavailable project"]')!;
  await act(async () => checkbox.click());
  await click("Done");
}

it("preserves the pending project grant and raw names across EN/RU/EN without another request", async () => {
  let resolve!: (value: unknown) => void;
  mocks.save.mockReturnValue(new Promise(done => { resolve = done; }));
  await mount();
  await chooseProject();
  expect(mocks.save).not.toHaveBeenCalled();
  await click("Save project access");
  const save = button("Saving access…");
  expect(save.disabled).toBe(true);
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith("agent-1", ["new"]);
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(container.textContent).toContain("Сохранение доступа…");
  expect(button("Сохранение доступа…")).toBe(save);
  expect(container.textContent).toContain(agent.name);
  expect(container.textContent).toContain("Unavailable project");
  expect(container.querySelector(`a[href="/issues/${taskId}"]`)).not.toBeNull();
  await act(async () => save.click());
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(button("Saving access…")).toBe(save);
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.access).toHaveBeenCalledTimes(1);
  expect(mocks.projects).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ projectIds: ["existing", "new"], canManage: true }));
  await vi.waitFor(() => expect(container.textContent).toContain("Project access saved. Return to your task to retry."));
  expect(button("Save project access").disabled).toBe(true);
});


it.each([false, true])("keeps a failed selection and distinguishes raw error text from an own fallback (%s)", async (rawError) => {
  const message = "Couldn’t save project access.";
  mocks.save.mockRejectedValueOnce(rawError ? new Error(message) : { status: "unavailable" });
  await mount();
  await chooseProject();
  await click("Save project access");
  await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain(message));
  await act(async () => { await i18n.changeLanguage("ru"); });
  const alert = container.querySelector('[role="alert"]')!;
  expect(alert.textContent).toContain("Ваш выбор сохранён.");
  expect(alert.textContent?.includes(message)).toBe(rawError);
  expect(container.textContent).toContain("Unavailable project");
  expect(button("Повторить сохранение").disabled).toBe(false);
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith("agent-1", ["new"]);
  mocks.save.mockResolvedValueOnce({ projectIds: ["existing", "new"], canManage: true });
  await click("Повторить сохранение");
  await vi.waitFor(() => expect(container.querySelector('[role="status"]')?.textContent).toContain("Доступ к проектам сохранён"));
  expect(mocks.save.mock.calls).toEqual([["agent-1", ["new"]], ["agent-1", ["new"]]]);
});

it("keeps the open search, focus and selected project across languages and cancels without a write", async () => {
  await mount();
  await click("Add project");
  const search = document.querySelector<HTMLInputElement>('input[aria-label="Search projects"]')!;
  await act(async () => {
    search.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "Unavailable");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(document.querySelector('[role="checkbox"][aria-label="Existing"]')).toBeNull();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(document.querySelector('input[aria-label="Поиск проектов"]')).toBe(search);
  expect(document.activeElement).toBe(search);
  expect(search.value).toBe("Unavailable");
  const checkbox = document.querySelector<HTMLButtonElement>('[role="checkbox"][aria-label="Unavailable project"]')!;
  await act(async () => checkbox.click());
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(checkbox.getAttribute("data-state")).toBe("checked");
  expect(search.value).toBe("Unavailable");
  await click("Done");
  await click("Cancel");
  expect(container.textContent).not.toContain("To add");
  expect(button("Save project access").disabled).toBe(true);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.access).toHaveBeenCalledTimes(1);
  expect(mocks.projects).toHaveBeenCalledTimes(1);
});

it("keeps read-only grants and translates only missing-project fallback, with no invalid return link", async () => {
  mocks.access.mockResolvedValue({ projectIds: ["new", "missing"], canManage: false });
  mocks.search = "fromTask=not-a-uuid";
  await mount();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(container.textContent).toContain("Unavailable project");
  expect(container.textContent).toContain("Недоступный проект");
  expect(container.textContent).toContain("пользователь с правом управления агентами");
  expect(container.querySelector("button")).toBeNull();
  expect(container.querySelector("a")).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("translates a failed load without retrying until the user requests it", async () => {
  mocks.access.mockRejectedValueOnce(new Error("provider error"));
  await mount("Couldn’t load project access.");
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(container.textContent).toContain("Не удалось загрузить доступ к проектам.");
  expect(mocks.access).toHaveBeenCalledTimes(1);
  expect(mocks.projects).toHaveBeenCalledTimes(1);
  await click("Повторить попытку");
  await vi.waitFor(() => expect(container.textContent).toContain("Разрешённые проекты"));
  expect(mocks.access).toHaveBeenCalledTimes(2);
  expect(mocks.projects).toHaveBeenCalledTimes(2);
  expect(mocks.save).not.toHaveBeenCalled();
});
