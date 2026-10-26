// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { CompanyProvider, useCompany } from "@/context/CompanyContext";
import { InstanceAccess } from "./InstanceAccess";
import { i18n } from "@/i18n";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), directory: vi.fn(), detachInflightList: vi.fn(), detachInflightDirectory: vi.fn(),
  getSession: vi.fn(), searchAdminUsers: vi.fn(), getUserCompanyAccess: vi.fn(),
  setUserCompanyAccess: vi.fn(), setBreadcrumbs: vi.fn(), pushToast: vi.fn(),
}));
vi.mock("@/api/companies", () => ({ companiesApi: mocks }));
vi.mock("@/api/auth", () => ({ authApi: mocks }));
vi.mock("@/api/access", () => ({ accessApi: mocks }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => mocks }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => mocks }));

const companyA = { id: "company-a", name: "Company A", issuePrefix: "CPA", status: "active" };
const companyB = { id: "company-b", name: "Company B", issuePrefix: "CPB", status: "active" };
const user = { id: "admin", name: "Admin", email: "admin@example.com", isInstanceAdmin: true, activeCompanyMembershipCount: 22 };
const membershipA = {
  id: "membership-a", companyId: companyA.id, companyName: companyA.name,
  status: "active", membershipRole: "owner", updatedAt: "2020-01-01T00:00:00Z",
};

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

function NavigationProbe() {
  const { companies } = useCompany();
  return <nav data-testid="navigation">{companies.map((company) => company.name).join(", ")}</nav>;
}

async function renderPage() {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <CompanyProvider><NavigationProbe /><InstanceAccess /></CompanyProvider>
      </QueryClientProvider>,
    );
  });
}

async function eventually(assertion: () => void) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    assertion();
  });
}

function button(text: string) {
  return [...container.querySelectorAll("button")].find((element) => element.textContent === text);
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  mocks.getSession.mockResolvedValue({ session: { id: "session-admin", userId: user.id }, user });
  mocks.list.mockResolvedValue([companyA]);
  mocks.directory.mockResolvedValue([companyA, companyB]);
  mocks.searchAdminUsers.mockResolvedValue([user]);
  mocks.getUserCompanyAccess.mockResolvedValue({ user, companyAccess: [membershipA] });
  mocks.setUserCompanyAccess.mockResolvedValue({});
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  await i18n.changeLanguage("en");
  client.clear();
  container.remove();
});

describe("InstanceAccess company directory", () => {
  it("lets admins grant access outside their navigation list and refreshes their own navigation", async () => {
    await renderPage();
    await eventually(() => {
      expect(button("Save organization access")).toBeDefined();
      expect(container.querySelector("nav")?.textContent).toBe("Company A");
    });
    const otherCompany = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Company B"));
    const checkbox = otherCompany?.querySelector<HTMLButtonElement>('[role="checkbox"]');
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    mocks.setUserCompanyAccess.mockImplementation(async () => {
      mocks.list.mockResolvedValue([companyA, companyB]);
      mocks.getUserCompanyAccess.mockResolvedValue({ user, companyAccess: [membershipA, {
        ...membershipA, id: "membership-b", companyId: companyB.id, companyName: companyB.name,
      }] });
      return {};
    });
    await act(async () => checkbox!.click());
    await act(async () => button("Save organization access")!.click());
    await eventually(() => {
      expect(mocks.setUserCompanyAccess).toHaveBeenCalledWith(user.id, [companyA.id, companyB.id]);
      expect(container.querySelector("nav")?.textContent).toBe("Company A, Company B");
    });
  });

  it("prevents editing an incomplete directory and lets the admin retry", async () => {
    mocks.directory.mockRejectedValue(new Error("Unavailable"));
    await renderPage();
    await eventually(() => {
      expect(container.textContent).toContain("Failed to load organizations.");
      expect(container.querySelector("nav")?.textContent).toBe("Company A");
    });
    expect(button("Save organization access")).toBeUndefined();
    expect(mocks.setUserCompanyAccess).not.toHaveBeenCalled();
    mocks.directory.mockResolvedValue([companyA, companyB]);
    await act(async () => button("Try again")!.click());
    await eventually(() => expect(button("Save organization access")).toBeDefined());
  });

  it("does not request the directory when instance administration is forbidden", async () => {
    mocks.searchAdminUsers.mockRejectedValue(new ApiError("Forbidden", 403, {}));
    await renderPage();
    await eventually(() => expect(container.textContent).toContain("Instance admin access is required"));
    expect(mocks.directory).not.toHaveBeenCalled();
  });

  it("keeps unsaved membership choices and API identifiers when switching Russian and English", async () => {
    await renderPage();
    await eventually(() => expect(button("Save organization access")).toBeDefined());
    const searchInput = container.querySelector<HTMLInputElement>("input")!;
    const otherCompany = [...container.querySelectorAll("label")].find((label) => label.textContent?.includes("Company B"));
    const checkbox = otherCompany!.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
    await act(async () => checkbox.click());
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    const directoryRequests = mocks.directory.mock.calls.length;
    const accessRequests = mocks.getUserCompanyAccess.mock.calls.length;

    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.querySelector("input")).toBe(searchInput);
    expect(searchInput.placeholder).toBe("Поиск по имени или электронной почте");
    expect(container.querySelector("h1")?.textContent).toBe("Доступ к экземпляру");
    expect(container.textContent).toContain("Активный доступ: 22 организации");
    expect(container.textContent).toContain("владелец • активен");
    expect(container.textContent).toContain(user.email);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(mocks.setBreadcrumbs).toHaveBeenLastCalledWith([
      { label: "Настройки", href: "/company/settings" },
      { label: "Настройки экземпляра", href: "/company/settings/instance/general" },
      { label: "Доступ" },
    ]);

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(button("Save organization access")).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(mocks.directory).toHaveBeenCalledTimes(directoryRequests);
    expect(mocks.getUserCompanyAccess).toHaveBeenCalledTimes(accessRequests);
    expect(mocks.setUserCompanyAccess).not.toHaveBeenCalled();

    await act(async () => { await i18n.changeLanguage("ru"); });
    await act(async () => button("Сохранить доступ к организациям")!.click());
    await eventually(() => {
      expect(mocks.setUserCompanyAccess).toHaveBeenCalledWith(user.id, [companyA.id, companyB.id]);
      expect(mocks.pushToast).toHaveBeenCalledWith({ title: "Доступ к организациям обновлён", tone: "success" });
    });
  });

  it("explains forbidden administration in Russian without requesting the organization directory", async () => {
    await i18n.changeLanguage("ru");
    mocks.searchAdminUsers.mockRejectedValue(new ApiError("Forbidden", 403, {}));
    await renderPage();
    await eventually(() => expect(container.textContent).toContain("Для управления пользователями нужны права администратора экземпляра."));
    expect(mocks.directory).not.toHaveBeenCalled();
    expect(mocks.setUserCompanyAccess).not.toHaveBeenCalled();
  });
});
