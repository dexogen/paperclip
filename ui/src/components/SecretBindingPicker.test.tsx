// @vitest-environment jsdom

import { act } from "react";
import { setLocale } from "@/i18n";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SecretBindingPicker,
  SecretRefHintsContext,
  type SecretRefHintsContextValue,
} from "./SecretBindingPicker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockSecretsApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../api/secrets", () => ({
  secretsApi: mockSecretsApi,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

describe("SecretBindingPicker", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockSecretsApi.list.mockReset();
    mockSecretsApi.list.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container.remove();
    queryClient.clear();
  });

  async function render(context: SecretRefHintsContextValue | undefined) {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <QueryClientProvider client={queryClient}>
          <SecretRefHintsContext.Provider value={context}>
            <SecretBindingPicker
              value={{ secretId: "22222222-2222-2222-2222-222222222222" }}
              onChange={() => {}}
            />
          </SecretRefHintsContext.Provider>
        </QueryClientProvider>,
      );
    });
    // Let the secrets query settle so selectedMissing is based on real data.
    await act(async () => {
      await Promise.resolve();
    });
  }

  function readyContext(status: string): SecretRefHintsContextValue {
    return {
      status: "ready",
      hints: {
        "22222222-2222-2222-2222-222222222222": {
          name: "DAYTONA_API_KEY",
          status,
          companyId: "company-2",
          companyName: "Other Team",
        },
      },
    };
  }

  it("names an active cross-company secret and its owner instead of calling it missing", async () => {
    await render(readyContext("active"));

    expect(container.textContent).toContain("DAYTONA_API_KEY — Other Team");
    expect(container.textContent).toContain("Owned by the Other Team organization");
    expect(container.textContent).not.toContain("Missing secret");
    expect(container.querySelector("select")?.className).not.toContain("border-destructive");
  });

  it("reports a deleted hinted secret as deleted", async () => {
    await render(readyContext("deleted"));

    expect(container.textContent).toContain("DAYTONA_API_KEY — Other Team");
    expect(container.textContent).toContain("was deleted");
    expect(container.querySelector("select")?.className).toContain("border-destructive");
  });

  it("does not present a disabled cross-company secret as working", async () => {
    await render(readyContext("disabled"));

    expect(container.textContent).toContain("DAYTONA_API_KEY — Other Team");
    expect(container.textContent).toContain("This secret is disabled");
    expect(container.textContent).not.toContain("keeps working");
    expect(container.querySelector("select")?.className).toContain("border-destructive");
  });

  it("stays neutral while descriptors are loading", async () => {
    await render({ status: "loading", hints: {} });

    expect(container.textContent).toContain("Checking this secret reference");
    expect(container.textContent).not.toContain("Missing secret");
    expect(container.querySelector("select")?.className).not.toContain("border-destructive");
  });

  it("stays neutral when the descriptor lookup failed", async () => {
    await render({ status: "error", hints: {} });

    expect(container.textContent).toContain("Could not load this secret reference");
    expect(container.textContent).not.toContain("Missing secret");
    expect(container.querySelector("select")?.className).not.toContain("border-destructive");
  });

  it("treats an unknown id as missing once descriptors are ready", async () => {
    await render({ status: "ready", hints: {} });

    expect(container.textContent).toContain("Missing secret");
    expect(container.textContent).toContain("no longer available");
    expect(container.querySelector("select")?.className).toContain("border-destructive");
  });

  it("keeps the generic missing-secret treatment when no hint context exists", async () => {
    await render(undefined);

    expect(container.textContent).toContain("Missing secret");
    expect(container.textContent).toContain("no longer available");
    expect(container.querySelector("select")?.className).toContain("border-destructive");
  });

  it("retains dirty secret fields and one pending creation through locale changes", async () => {
    const change = vi.fn();
    let finish!: (value: { id: string }) => void;
    mockSecretsApi.create.mockReset().mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    try {
      await setLocale("en");
      await act(async () => {
        root = createRoot(container);
        root.render(<QueryClientProvider client={queryClient}><SecretBindingPicker value={null} onChange={change} /></QueryClientProvider>);
      });
      await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Create secret"]')!.click());
      const name = document.querySelector<HTMLInputElement>('#secret-name')!;
      const value = document.querySelector<HTMLTextAreaElement>('#secret-value')!;
      const description = document.querySelector<HTMLInputElement>('#secret-description')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "my_key");
        name.dispatchEvent(new Event("input", { bubbles: true }));
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(value, "literal<&>value");
        value.dispatchEvent(new Event("input", { bubbles: true }));
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(description, "Name <b>raw</b>");
        description.dispatchEvent(new Event("input", { bubbles: true }));
      });
      value.focus(); value.setSelectionRange(2, 6);
      await act(async () => setLocale("ru"));
      expect(document.querySelector('#secret-value')).toBe(value);
      expect(value.value).toBe("literal<&>value");
      expect(document.activeElement).toBe(value);
      expect([value.selectionStart, value.selectionEnd]).toEqual([2, 6]);
      expect(mockSecretsApi.create).not.toHaveBeenCalled();
      const submit = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === "Создать и привязать")!;
      await act(async () => submit.click());
      expect(mockSecretsApi.create).toHaveBeenCalledExactlyOnceWith("company-1", { name: "my_key", value: "literal<&>value", description: "Name <b>raw</b>" });
      await act(async () => setLocale("en"));
      await act(async () => setLocale("ru"));
      expect(mockSecretsApi.create).toHaveBeenCalledTimes(1);
      expect(change).not.toHaveBeenCalled();
      await act(async () => finish({ id: "server-secret" }));
      expect(change).toHaveBeenCalledExactlyOnceWith({ secretId: "server-secret", version: "latest" });
    } finally { await act(async () => setLocale("en")); }
  });

  it("keeps an unknown status that names an object property literal across locales", async () => {
    try {
      await render(readyContext("toString"));
      expect(container.textContent).toContain("This secret is toString;");
      await act(async () => setLocale("ru"));
      expect(container.textContent).toContain("Состояние секрета: toString.");
      expect(container.textContent).toContain("DAYTONA_API_KEY — Other Team");
      await act(async () => setLocale("en"));
      expect(container.textContent).toContain("This secret is toString;");
      expect(mockSecretsApi.list).toHaveBeenCalledTimes(1);
    } finally { await act(async () => setLocale("en")); }
  });

});
