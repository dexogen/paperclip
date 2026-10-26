// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { beforeEach, afterEach, it, vi, expect } from "vitest";
import { setLocale } from "@/i18n";
import { ProjectAccessMembers } from "./ProjectAccessMembers";
const api = vi.hoisted(() => ({
  listAccessMembers: vi.fn(),
  addAccessMember: vi.fn(),
  removeAccessMember: vi.fn()
}));
const directory = vi.hoisted(() => vi.fn());
const agents = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/api/projects", () => ({
  projectsApi: api
}));
vi.mock("@/api/access", () => ({
  accessApi: {
    listUserDirectory: directory
  }
}));
vi.mock("@/api/agents", () => ({
  agentsApi: {
    list: agents
  }
}));
vi.mock("@/context/ToastContext", () => ({
  useToastActions: () => ({
    pushToast: toast
  })
}));
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const project = {
  id: "p:raw",
  companyId: "company:raw",
  personalOwnerUserId: "owner",
  privacyOwnerUserId: null
} as Project;
beforeEach(async () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  await setLocale("en");
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity
      },
      mutations: {
        retry: false
      }
    }
  });
  api.listAccessMembers.mockResolvedValue([{
    id: "member:owner",
    subjectType: "user",
    subjectId: "owner",
    subjectDisplayName: "Owner <b>raw</b>"
  }, {
    id: "member:other",
    subjectType: "user",
    subjectId: "other",
    subjectDisplayName: "Person <i>raw</i>"
  }]);
  directory.mockResolvedValue({
    users: [{
      user: {
        id: "unknown:1",
        name: null,
        email: null,
        image: null
      }
    }, {
      user: {
        id: "named:1",
        name: "Unknown user",
        email: "raw@example.test",
        image: null
      }
    }]
  });
  agents.mockResolvedValue([]);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
  await setLocale("en");
});
async function mount(canManage = true) {
  await act(async () => root.render(<QueryClientProvider client={client}><ProjectAccessMembers project={project} canManage={canManage} /></QueryClientProvider>));
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}
it("keeps a Russian fallback search across locales and submits the same subject ID once", async () => {
  api.addAccessMember.mockImplementation(() => new Promise(() => {}));
  await mount();
  expect(document.querySelector('[aria-label="Remove Owner <b>raw</b>"]')).toBeNull();
  const trigger = document.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
  if (trigger.getAttribute("aria-expanded") !== "true") await act(async () => trigger.click());
  const search = document.querySelector<HTMLInputElement>('[placeholder="Search people and agents"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "Неизвестный");
    search.dispatchEvent(new Event("input", {
      bubbles: true
    }));
  });
  const reads = [api.listAccessMembers.mock.calls.length, directory.mock.calls.length, agents.mock.calls.length];
  const matches = [...document.querySelectorAll('[role="option"]')].filter(o => o.getAttribute("data-disabled") !== "true");
  expect(matches).toHaveLength(1);
  expect(matches[0].textContent).toContain("Unknown user");
  await act(async () => setLocale("ru"));
  expect(document.querySelector('[placeholder="Поиск пользователей и агентов"]')).toBe(search);
  expect(search.value).toBe("Неизвестный");
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(o => o.textContent?.includes("Неизвестный пользователь"))!;
  expect(option).toBeDefined();
  await act(async () => option.click());
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === "Добавить")!.click());
  await act(async () => setLocale("en"));
  expect(api.addAccessMember).toHaveBeenCalledExactlyOnceWith("p:raw", {
    subjectType: "user",
    subjectId: "unknown:1"
  }, "company:raw");
  expect([api.listAccessMembers.mock.calls.length, directory.mock.calls.length, agents.mock.calls.length]).toEqual(reads);
  expect(document.body.textContent).toContain("Owner <b>raw</b>");
  expect(document.querySelector("b")).toBeNull();
});
it("keeps owner and read-only removal guards while translating the dialog", async () => {
  await mount(false);
  const remove = document.querySelector<HTMLButtonElement>('[aria-label="Remove Person <i>raw</i>"]')!;
  expect(remove.disabled).toBe(true);
  await act(async () => setLocale("ru"));
  expect(document.querySelector('[aria-label="Удалить Person <i>raw</i>"]')).toBe(remove);
  expect(remove.disabled).toBe(true);
  expect(document.querySelector('[aria-label="Удалить Owner <b>raw</b>"]')).toBeNull();
  expect(document.body.textContent).toContain("Доступ к закрытому проекту");
  expect(api.addAccessMember).not.toHaveBeenCalled();
  expect(api.removeAccessMember).not.toHaveBeenCalled();
});
