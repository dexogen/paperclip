// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { CommandPalette } from "./CommandPalette";

const state = vi.hoisted(() => ({
  navigate: vi.fn(), openNewIssue: vi.fn(), openNewAgent: vi.fn(),
  issues: vi.fn(), agents: vi.fn(), projects: vi.fn(), labels: vi.fn(), session: vi.fn(), settings: vi.fn(),
  combined: false,
  location: { pathname: "/issues/PAP-1", search: "", hash: "" },
}));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-1" }) }));
vi.mock("../context/DialogContext", () => ({ useDialogActions: () => state }));
vi.mock("../context/SidebarContext", () => ({ useSidebar: () => ({ isMobile: false, setSidebarOpen: vi.fn() }) }));
vi.mock("@/hooks/useCombinedInboxTasksEnabled", () => ({ useCombinedInboxTasksEnabled: () => ({ enabled: state.combined }) }));
vi.mock("@/lib/router", () => ({ useNavigate: () => state.navigate, useLocation: () => state.location }));
vi.mock("../api/issues", () => ({ issuesApi: { list: state.issues, listLabels: state.labels } }));
vi.mock("../api/agents", () => ({ agentsApi: { list: state.agents } }));
vi.mock("../api/projects", () => ({ projectsApi: { list: state.projects } }));
vi.mock("../api/auth", () => ({ authApi: { getSession: state.session } }));
vi.mock("../api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: state.settings } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement, root: Root, queryClient: QueryClient;
async function tick() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
async function eventually(assertion: () => void) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { assertion(); return; } catch (error) { if (attempt === 29) throw error; }
    await tick();
  }
}
function input() { return document.querySelector<HTMLInputElement>('[cmdk-input]')!; }
function selectedValue() { return document.querySelector('[cmdk-item][aria-selected="true"]')?.getAttribute('data-value'); }
async function key(keyValue: string, modifiers: KeyboardEventInit = {}) {
  await act(async () => { input().dispatchEvent(new KeyboardEvent("keydown", { key: keyValue, bubbles: true, ...modifiers })); });
  await tick();
}
async function query(value: string) {
  await act(async () => {
    const target = input();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await tick();
}
async function open() {
  await act(async () => {
    root.render(<QueryClientProvider client={queryClient}><CommandPalette /></QueryClientProvider>);
  });
  await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })); });
  await eventually(() => expect(input()).not.toBeNull());
  await tick();
}
async function selectCommand(value: string) {
  await key("Home");
  for (let attempt = 0; attempt < 8 && selectedValue() !== value; attempt++) await key("ArrowDown");
  expect(selectedValue()).toBe(value);
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  state.combined = false;
  state.issues.mockResolvedValue([]); state.agents.mockResolvedValue([]); state.projects.mockResolvedValue([]); state.labels.mockResolvedValue([]);
  state.session.mockResolvedValue({ user: { id: "user-1" } });
  state.settings.mockResolvedValue({ enableExperimentalFileViewer: true });
  await i18n.changeLanguage("en");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear(); container.remove(); vi.unstubAllGlobals();
  await i18n.changeLanguage("en");
});

describe("real Cmdk localized keyboard commands", () => {
  it("finds a Russian command in English, preserves query and keyboard selection across EN/RU/EN, and executes it with Enter", async () => {
    await open();
    await query("создать задачу");
    await selectCommand("action:create-task");
    const originalInput = input();
    const beforeRequests = state.issues.mock.calls.length;
    for (const locale of ["ru", "en"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      await tick();
      expect(input()).toBe(originalInput);
      expect(input().value).toBe("создать задачу");
      expect(selectedValue()).toBe("action:create-task");
      expect(state.issues).toHaveBeenCalledTimes(beforeRequests);
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe(locale === "ru" ? "Палитра команд" : "Command Palette");
      expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent).toBe(locale === "ru" ? "Найдите команду для выполнения…" : "Search for a command to run...");
      expect(dialog.querySelector('[data-slot="dialog-close"]')?.textContent).toBe(locale === "ru" ? "Закрыть" : "Close");
    }
    await key("Enter");
    expect(state.openNewIssue).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("finds an English action in Russian and preserves raw agent names and unknown roles", async () => {
    state.agents.mockResolvedValue([{ id: "agent-1", name: "Literal <b> & Agent", role: "custom_role" }]);
    await i18n.changeLanguage("ru");
    await open();
    await eventually(() => expect(document.body.textContent).toContain("Literal <b> & Agent"));
    expect(document.body.textContent).toContain("custom_role");
    expect(document.querySelector('[cmdk-item] b')).toBeNull();
    await query("Create new agent");
    await selectCommand("action:create-agent");
    await key("Enter");
    expect(state.openNewAgent).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("finds an agent by its Russian role while preserving selection across EN→RU→EN", async () => {
    state.agents.mockResolvedValue([{ id: "agent-engineer", urlKey: "agent-engineer", name: "Literal Engineer <b>", role: "engineer" }]);
    await open();
    await query("инженер");
    await selectCommand("agent:agent-engineer");
    const originalInput = input();
    const requestCount = state.issues.mock.calls.length;
    for (const locale of ["ru", "en"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      await tick();
      expect(input()).toBe(originalInput);
      expect(input().value).toBe("инженер");
      expect(selectedValue()).toBe("agent:agent-engineer");
      const selected = document.querySelector('[cmdk-item][aria-selected="true"]')!;
      expect(selected.textContent).toContain(locale === "ru" ? "Инженер" : "Engineer");
      expect(selected.textContent).toContain("Literal Engineer <b>");
      expect(selected.querySelector("b")).toBeNull();
      expect(state.issues).toHaveBeenCalledTimes(requestCount);
    }
    await key("Enter");
    expect(state.navigate).toHaveBeenCalledWith("/agents/agent-engineer");
  });

  it("preserves promoted project relevance order in real Cmdk across locales", async () => {
    state.projects.mockResolvedValue([
      { id: "description", name: "tool", description: "auth" },
      { id: "prefix", name: "auth tool", description: null },
      { id: "exact", name: "auth", description: "tool" },
      { id: "substring", name: "tool auth", description: null },
    ]);
    await open();
    const order = () => Array.from(document.querySelectorAll('[data-testid="command-project-match"]')).map(item => item.getAttribute("data-value"));
    for (const term of ["auth", "tool", "auth"]) {
      await query(term);
      const expected = term === "auth"
        ? ["project:exact", "project:prefix", "project:substring", "project:description"]
        : ["project:description", "project:substring", "project:prefix", "project:exact"];
      await eventually(() => expect(order()).toEqual(expected));
      await selectCommand(expected[0]!);
      for (const locale of ["ru", "en"]) {
        await act(async () => { await i18n.changeLanguage(locale); });
        await tick();
        expect(order()).toEqual(expected);
        expect(selectedValue()).toBe(expected[0]);
        expect(input().value).toBe(term);
      }
    }
  });

  it.each([false, true])("uses the canonical Inbox target when combined=%s", async (combined) => {
    state.combined = combined;
    await i18n.changeLanguage("ru");
    await open();
    await query(combined ? "Моя работа" : "Входящие");
    await selectCommand("page:inbox");
    await key("Enter");
    expect(state.navigate).toHaveBeenCalledWith(combined ? "/issues?view=mine" : "/inbox");
  });

  it("keeps markup-shaped search queries literal through translated full-search captions", async () => {
    const term = 'Literal <strong>query</strong> & &amp; <query>name</query>';
    await open();
    await query(term);
    for (const locale of ["en", "ru", "en"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      await tick();
      const item = document.querySelector('[data-value^="__paperclip-search-all__"]')!;
      expect(item).not.toBeNull();
      expect(item.textContent).toContain(term);
      expect(item.querySelector("strong, query")).toBeNull();
      expect(input().value).toBe(term);
    }
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("keeps full-search canonical operator parsing on Ctrl+Enter", async () => {
    await i18n.changeLanguage("ru");
    await open();
    await query("ошибка status:todo");
    await key("Enter", { ctrlKey: true });
    expect(state.navigate).toHaveBeenCalledWith("/search?q=%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B0&status=todo");
  });
});
