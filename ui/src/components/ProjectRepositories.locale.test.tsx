// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project, ProjectWorkspace } from "@paperclipai/shared";
import { beforeEach, afterEach, it, vi, expect } from "vitest";
import { setLocale } from "@/i18n";
import { ProjectRepositories } from "./ProjectRepositories";
import { LegacyProjectRepository } from "./LegacyProjectRepository";
const api = vi.hoisted(() => ({
  repositoryOptions: vi.fn(),
  setRepositories: vi.fn(),
  removeWorkspace: vi.fn(),
  updateWorkspace: vi.fn()
}));
vi.mock("@/api/projects", () => ({
  projectsApi: api
}));
vi.mock("@/features/connections/ConnectionSetupFlow", () => ({
  ConnectionSetupFlow: () => null
}));
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
beforeEach(async () => {
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
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  await setLocale("en");
});
async function mount(node: React.ReactNode) {
  await act(async () => root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>));
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}
async function change(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", {
      bubbles: true
    }));
  });
}
it("retains a removed repository draft and pending save through language changes", async () => {
  const project = {
    id: "p",
    companyId: "company",
    urlKey: "alias",
    workspaces: [{
      id: "w",
      name: "Owner/Raw <b>repo</b>",
      repoUrl: "https://github.com/Owner/Raw",
      metadata: {
        githubRepositoryId: "repo:raw"
      }
    }]
  } as unknown as Project;
  api.repositoryOptions.mockResolvedValue({
    connectionCount: 1,
    failedConnectionCount: 0,
    repositories: []
  });
  api.setRepositories.mockImplementation(() => new Promise(() => {}));
  await mount(<ProjectRepositories project={project} />);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Remove Owner/Raw <b>repo</b>"]')!.click());
  const reads = api.repositoryOptions.mock.calls.length;
  await act(async () => setLocale("ru"));
  const save = [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === "Сохранить изменения")!;
  expect(save.disabled).toBe(false);
  expect(container.textContent).not.toContain("Owner/Raw");
  expect(api.setRepositories).not.toHaveBeenCalled();
  await act(async () => save.click());
  await act(async () => setLocale("en"));
  expect(api.setRepositories).toHaveBeenCalledExactlyOnceWith("p", []);
  expect(api.repositoryOptions).toHaveBeenCalledTimes(reads);
  expect(save.disabled).toBe(true);
});
it.each([null, "/raw/worktree"])("preserves legacy empty URL semantics with cwd=%s", async cwd => {
  const workspace = {
    id: "w:raw",
    projectId: "p:raw",
    companyId: "company:raw",
    repoUrl: "https://example.test/raw",
    cwd,
    remoteWorkspaceRef: null
  } as ProjectWorkspace;
  api.removeWorkspace.mockImplementation(() => new Promise(() => {}));
  api.updateWorkspace.mockImplementation(() => new Promise(() => {}));
  await mount(<LegacyProjectRepository workspace={workspace} projectRef="alias:raw" />);
  await act(async () => [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === "Edit")!.click());
  const input = container.querySelector<HTMLInputElement>('[aria-label="Existing repo URL"]')!;
  await change(input, "");
  input.focus();
  await act(async () => setLocale("ru"));
  expect(container.querySelector('[aria-label="Текущий URL репозитория"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("");
  expect(api.removeWorkspace).not.toHaveBeenCalled();
  expect(api.updateWorkspace).not.toHaveBeenCalled();
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", {
    bubbles: true,
    cancelable: true
  })));
  await act(async () => setLocale("en"));
  if (cwd) {
    expect(api.updateWorkspace).toHaveBeenCalledExactlyOnceWith("p:raw", "w:raw", {
      repoUrl: null
    });
    expect(api.removeWorkspace).not.toHaveBeenCalled();
  } else {
    expect(api.removeWorkspace).toHaveBeenCalledExactlyOnceWith("p:raw", "w:raw");
    expect(api.updateWorkspace).not.toHaveBeenCalled();
  }
});
