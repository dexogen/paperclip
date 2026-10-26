// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { ProjectProperties } from "./ProjectProperties";
import { TooltipProvider } from "./ui/tooltip";

const company = vi.hoisted(() => ({ selectedCompanyId: null as string | null }));
const secrets = vi.hoisted(() => ({ list: vi.fn(), listUserSecretDefinitions: vi.fn(), create: vi.fn() }));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => company }));
vi.mock("../api/secrets", () => ({ secretsApi: secrets }));
vi.mock("../api/auth", () => ({ authApi: { getSession: vi.fn().mockResolvedValue(null) } }));
vi.mock("../api/access", () => ({ accessApi: { getCurrentBoardAccess: vi.fn().mockResolvedValue(null) } }));
vi.mock("../api/goals", () => ({ goalsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("../api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: vi.fn().mockResolvedValue({ enableManagedSandboxOnly: true }) } }));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const rawError = "Select an organization to create secrets";
const project = {
  id: "project:raw",
  companyId: "company:raw",
  name: "Project <b>literal</b>",
  status: "in_progress",
  visibility: "open",
  goalIds: [],
  goals: [],
  workspaces: [],
  updatedAt: "2026-10-26T12:00:00Z",
  env: { STRIPE_API_KEY: { type: "plain", value: "value<&>" } },
} as unknown as Project;

beforeEach(async () => {
  await setLocale("en");
  vi.clearAllMocks();
  company.selectedCompanyId = null;
  secrets.list.mockResolvedValue([]);
  secrets.listUserSecretDefinitions.mockResolvedValue([]);
  secrets.create.mockRejectedValue(new Error(rawError));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(queryKeys.health, { hiddenSettings: [] });
  client.setQueryData(queryKeys.instance.experimentalSettings, { enableManagedSandboxOnly: true });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  await setLocale("en");
});

it.each([true, false])("formats the project-owned secret error late and preserves the provider error (missing company=%s)", async missing => {
  company.selectedCompanyId = missing ? null : "company:raw";
  const update = vi.fn();
  await act(async () => root.render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ProjectProperties project={project} repositories={<div />} onFieldUpdate={update} getFieldSaveState={() => "idle"} onArchive={vi.fn()} />
      </TooltipProvider>
    </QueryClientProvider>,
  ));
  // The test exercises error ownership and locale changes after the form opens.
  // Settle its background query notifications before interacting with Radix's
  // focus-managed popover, so a query render cannot race the first click.
  await act(async () => {
    await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  });
  await act(async () => container.querySelector<HTMLButtonElement>('button[title^="This value looks sensitive"]')!.click());
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.trim() === "Store & bind")!.click());
  expect(document.body.textContent).toContain(rawError);
  if (missing) expect(secrets.create).not.toHaveBeenCalled();
  else expect(secrets.create).toHaveBeenCalledExactlyOnceWith("company:raw", { name: "stripe_api_key", value: "value<&>" });
  const name = document.querySelector<HTMLInputElement>('[aria-label="Secret name"]')!;
  name.focus();
  name.setSelectionRange(1, 5);
  await act(async () => setLocale("ru"));
  expect(document.body.textContent).toContain(missing ? "Выберите организацию, чтобы создавать секреты" : rawError);
  if (!missing) expect(document.body.textContent).not.toContain("Выберите организацию, чтобы создавать секреты");
  expect(document.querySelector('[aria-label="Имя секрета"]')).toBe(name);
  expect(document.activeElement).toBe(name);
  expect([name.selectionStart, name.selectionEnd]).toEqual([1, 5]);
  expect(document.querySelector<HTMLInputElement>('[aria-label="Значение секрета"]')?.value).toBe("value<&>");
  await act(async () => setLocale("en"));
  expect(document.body.textContent).toContain(rawError);
  expect(update).not.toHaveBeenCalled();
  expect(secrets.create).toHaveBeenCalledTimes(missing ? 0 : 1);
});
