// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ResourceMemberships } from "@paperclipai/shared";
import { beforeEach, afterEach, it, vi, expect } from "vitest";
import { setLocale } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { useResourceMembershipMutation } from "./useResourceMemberships";
const api = vi.hoisted(() => ({
  updateProject: vi.fn(),
  updateAgent: vi.fn()
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("../api/resourceMemberships", () => ({
  resourceMembershipsApi: api
}));
vi.mock("../context/ToastContext", () => ({
  useToastActions: () => ({
    pushToast: toast
  })
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
      mutations: {
        retry: false
      },
      queries: {
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
it.each([[{
  state: "left" as const
}, "Не удалось покинуть «Raw <b>project</b>»."], [{
  state: "joined" as const
}, "Не удалось присоединиться к «Raw <b>project</b>»."], [{
  starred: true
}, "Не удалось добавить «Raw <b>project</b>» в избранное."], [{
  starred: false
}, "Не удалось убрать «Raw <b>project</b>» из избранного."]])("uses the locale at failure completion and restores the exact membership snapshot (%j)", async (change, title) => {
  let reject!: (error: Error) => void;
  api.updateProject.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => {
    reject = rejectPromise;
  }));
  const before: ResourceMemberships = {
    projectMemberships: {
      "p:raw": "joined"
    },
    agentMemberships: {},
    starredProjectIds: ["p:raw"],
    starredAgentIds: [],
    starredDocumentIds: [],
    projectStarredAt: {},
    agentStarredAt: {},
    documentStarredAt: {},
    updatedAt: null
  };
  const key = queryKeys.resourceMemberships.mine("company:raw");
  client.setQueryData(key, before);
  function Fixture() {
    const mutation = useResourceMembershipMutation("company:raw");
    return <button onClick={() => mutation.mutate({
      resourceType: "project",
      resourceId: "p:raw",
      resourceName: "Raw <b>project</b>",
      ...change
    })}>Change</button>;
  }
  await act(async () => root.render(<QueryClientProvider client={client}><Fixture /></QueryClientProvider>));
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(api.updateProject).toHaveBeenCalledExactlyOnceWith("company:raw", "p:raw", {
    state: "state" in change ? change.state : undefined,
    starred: "starred" in change ? change.starred : undefined
  });
  const pending = client.getQueryData(key);
  await act(async () => setLocale("ru"));
  expect(client.getQueryData(key)).toBe(pending);
  expect(toast).not.toHaveBeenCalled();
  await act(async () => reject(new Error("Try again.")));
  expect(client.getQueryData(key)).toEqual(before);
  expect(toast).toHaveBeenCalledExactlyOnceWith({
    title,
    body: "Try again.",
    tone: "error"
  });
  await act(async () => setLocale("en"));
  expect(toast).toHaveBeenCalledTimes(1);
  expect(api.updateProject).toHaveBeenCalledTimes(1);
  expect(api.updateAgent).not.toHaveBeenCalled();
});
