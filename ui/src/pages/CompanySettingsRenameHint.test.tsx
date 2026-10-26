// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { act } from "react";
import { setLocale } from "@/i18n";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/queryKeys";
import { CompanySettings } from "./CompanySettings";

const mockCompaniesApi = vi.hoisted(() => ({
  update: vi.fn(),
  archive: vi.fn(),
}));

const mockAssetsApi = vi.hoisted(() => ({
  uploadCompanyLogo: vi.fn(),
}));

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSetSelectedCompanyId = vi.hoisted(() => vi.fn());

const SELECTED_COMPANY = {
  id: "company-1",
  name: "Acme Robotics",
  description: null,
  status: "active",
  issuePrefix: "ACM",
  brandColor: null,
  logoUrl: null,
  attachmentMaxBytes: null,
  requireBoardApprovalForNewAgents: false,
  interactionResolverGovernance: {},
};

vi.mock("../api/companies", () => ({ companiesApi: mockCompaniesApi }));
vi.mock("../api/assets", () => ({ assetsApi: mockAssetsApi }));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [SELECTED_COMPANY],
    selectedCompany: SELECTED_COMPANY,
    selectedCompanyId: SELECTED_COMPANY.id,
    setSelectedCompanyId: mockSetSelectedCompanyId,
  }),
}));

vi.mock("../components/decision-models/DecisionModelSettings", () => ({
  DecisionModelSettingsSection: () => <div data-testid="decision-model-settings" />,
}));

// Both panels below the name field own their own queries and are not part of
// what this test covers.
vi.mock("../components/InteractionGovernancePanel", () => ({
  InteractionGovernancePanel: () => null,
  applyGovernanceChange: (governance: unknown) => governance,
}));

vi.mock("./InstanceGeneralSettings", () => ({
  InstanceGeneralSettings: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const CLOUD_HEALTH = {
  status: "ok" as const,
  cloud: {
    managed: true as const,
    managedBy: "paperclip-cloud" as const,
    stackSlug: "acme-labs",
    cloudBaseUrl: "https://cloud.example.test",
  },
};

const SELF_HOSTED_HEALTH = { status: "ok" as const, cloud: null };

const RENAME_HINT =
  "Renaming can change this company's task ID prefix. Existing task IDs are renumbered and old task links stop resolving.";

describe("CompanySettings rename hint", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await setLocale("en");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await setLocale("en");
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  function render(health: unknown, enableFastResponses = true) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // CloudAccessGate owns the health fetch in the app; seeding the cache is how
    // useCloudInstance sees a managed instance under test.
    queryClient.setQueryData(queryKeys.health, health);
    queryClient.setQueryData(queryKeys.instance.experimentalSettings, { enableFastResponses });
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <MemoryRouter>
              <CompanySettings />
            </MemoryRouter>
          </TooltipProvider>
        </QueryClientProvider>,
      );
    });
    return root;
  }

  function hintText() {
    return Array.from(container.querySelectorAll("p")).find(
      (element) => element.textContent?.trim() === RENAME_HINT,
    );
  }

  it.each([false, true])("keeps decision setup out of General regardless of the fast response flag (%s)", (enabled) => {
    const root = render(SELF_HOSTED_HEALTH, enabled);
    expect(container.querySelector("[data-testid=decision-model-settings]")).toBeNull();
    flushSync(() => root.unmount());
  });

  it("warns that a rename re-keys task IDs on a managed instance", () => {
    const root = render(CLOUD_HEALTH);
    expect(hintText()).toBeDefined();
    flushSync(() => root.unmount());
  });

  it("stays silent on a self-hosted instance, where a rename keeps the prefix", () => {
    const root = render(SELF_HOSTED_HEALTH);
    expect(hintText()).toBeUndefined();
    flushSync(() => root.unmount());
  });

  it("keeps organization drafts and API payloads unchanged while switching Russian and English", async () => {
    mockCompaniesApi.update.mockResolvedValue(SELECTED_COMPANY);
    const page = render(SELF_HOSTED_HEALTH);
    try {
      const [name, description] = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]'));
      await act(async () => {
        for (const [input, value] of [[name, "  Research & разработка  "], [description, "  User draft <keep>  "]] as const) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await setLocale("ru");
      });
      expect(container.querySelector("h1")?.textContent).toBe("Общие");
      expect(name.value).toBe("  Research & разработка  ");
      expect(description.value).toBe("  User draft <keep>  ");
      expect(description.placeholder).toBe("Описание организации (необязательно)");
      expect(mockCompaniesApi.update).not.toHaveBeenCalled();
      const save = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Сохранить изменения");
      expect(save).toBeDefined();
      await act(async () => save!.click());
      await vi.waitFor(() => expect(mockCompaniesApi.update).toHaveBeenCalledWith(SELECTED_COMPANY.id, {
        name: "Research & разработка",
        description: "User draft <keep>",
      }));
      await act(async () => setLocale("en"));
      expect(container.querySelector("h1")?.textContent).toBe("General");
      expect(name.value).toBe("  Research & разработка  ");
      expect(description.value).toBe("  User draft <keep>  ");
    } finally {
      await act(async () => page.unmount());
    }
  });

});
