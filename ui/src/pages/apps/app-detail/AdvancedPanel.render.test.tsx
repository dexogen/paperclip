// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { act as reactAct } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppStoreDefinition, type ToolConnection } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { toolsApi } from "@/api/tools";
import { DangerZone, ReconnectCard } from "./AdvancedPanel";

const pushToast = vi.hoisted(() => vi.fn());
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ pushToast }) }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function act(callback: () => void) {
  flushSync(callback);
}

let container: HTMLDivElement | null = null;
let reconnectRoot: ReturnType<typeof createRoot> | null = null;
let queryClient: QueryClient | null = null;

afterEach(async () => {
  if (reconnectRoot) await reactAct(() => reconnectRoot!.unmount());
  reconnectRoot = null;
  queryClient?.clear();
  queryClient = null;
  await reactAct(() => i18n.changeLanguage("en"));
  vi.restoreAllMocks();
  pushToast.mockClear();
  container?.remove();
  container = null;
});

describe("ReconnectCard owned health messages", () => {
  const message = "The Paperclip GitHub installation is suspended. Unsuspend it on GitHub before refreshing access.";
  const descriptor = { source: "paperclip-github", version: 1, code: "installation_suspended" } as const;
  const connection: ToolConnection = {
    id: "github-1", uid: "github-1", companyId: "company-1", applicationId: "app-1", name: "GitHub", authKind: "oauth",
    connectionKind: "managed", connectionPurpose: "tool", ownership: "customer", transport: "rest_api",
    config: { sourceTemplateKey: "github" }, credentialSource: "paperclip_vault",
    credentialPolicy: "per_user", credentialRefs: [], credentialSecretRefs: [], transportConfig: {}, healthStatus: "error",
    healthMessage: message, healthMessageDisplay: descriptor, requiresReauthorization: true,
    healthCheckedAt: null, lastError: message, enabled: true, createdByAgentId: null, createdByUserId: "user-1",
    createdAt: new Date("2026-10-27T00:00:00Z"), updatedAt: new Date("2026-10-27T00:00:00Z"),
  };

  async function renderReconnect(current: ToolConnection, canReconnect = false) {
    if (!container) {
      container = document.createElement("div");
      document.body.appendChild(container);
      reconnectRoot = createRoot(container);
      queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    }
    await reactAct(() => reconnectRoot!.render(
      <QueryClientProvider client={queryClient!}>
        <ReconnectCard connection={current} galleryEntry={null} onReconnected={vi.fn()} canReconnect={canReconnect} />
      </QueryClientProvider>,
    ));
  }

  it("localizes the saved health observation in the reconnect branch and preserves unmarked text", async () => {
    await reactAct(() => i18n.changeLanguage("ru"));
    await renderReconnect(connection);
    expect(container!.textContent).toContain("приостановлена");
    expect(container!.textContent).not.toContain(message);

    await reactAct(() => i18n.changeLanguage("en"));
    expect(container!.textContent).toContain(message);
    await reactAct(() => i18n.changeLanguage("ru"));
    await renderReconnect({ ...connection, healthMessageDisplay: undefined });
    expect(container!.textContent).toContain(message);
  });

  it("localizes an unsuccessful reconnect response in the toast", async () => {
    await reactAct(() => i18n.changeLanguage("ru"));
    const reconnect = vi.spyOn(toolsApi, "reconnectConnection").mockResolvedValue({ connection } as Awaited<ReturnType<typeof toolsApi.reconnectConnection>>);
    await renderReconnect({ ...connection, authKind: "api_key" }, true);
    const input = container!.querySelector("input")!;
    await reactAct(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "test-key");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submit = Array.from(container!.querySelectorAll("button")).find(button => button.textContent === i18n.t("fullApps.check_reconnect_776e8c"))!;
    expect(submit.disabled).toBe(false);
    await reactAct(() => submit.click());
    await vi.waitFor(() => expect(reconnect).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({
      tone: "error", body: expect.stringContaining("приостановлена"),
    })));
  });
});

function renderDangerZone() {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<DangerZone appName="PostHog" removing={false} onRemove={vi.fn()} />));
  return container;
}

function expandDangerZone(node: HTMLDivElement) {
  const trigger = Array.from(node.querySelectorAll("button"))
    .find((button) => button.textContent?.includes("Danger zone"));
  expect(trigger).toBeTruthy();
  act(() => trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/**
 * Remove app deletes the operator's credentials and revokes agent access
 * (PAP-17119). The compact confirmation still names both effects before the
 * operator commits.
 */
describe("DangerZone", () => {
  it("keeps removal available without reconnecting an obsolete Anthropic method", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onRemove = vi.fn();
    act(() => root.render(
      <DangerZone
        appName="Anthropic"
        connection={{
          id: "obsolete-anthropic",
          uid: "obsolete-anthropic",
          companyId: "company-1",
          applicationId: "app-1",
          name: "Anthropic",
          connectionKind: "managed",
          connectionPurpose: "tool",
          ownership: "customer",
          transport: "rest_api",
          authKind: "api_key",
          credentialSource: "paperclip_vault",
          credentialPolicy: "shared",
          transportConfig: {},
          config: { sourceTemplateKey: "anthropic", connectionMethodKey: "api-key" },
          credentialSecretRefs: [],
          healthStatus: "error",
          healthCheckedAt: null,
          lastError: "This connection has no supported tool integration.",
          enabled: true,
          createdByAgentId: null,
          createdByUserId: "user-1",
          createdAt: new Date("2026-09-12T00:00:00Z"),
          updatedAt: new Date("2026-09-12T00:00:00Z"),
        }}
        galleryEntry={getAppStoreDefinition("anthropic")!}
        removing={false}
        onRemove={onRemove}
      />,
    ));
    expandDangerZone(container);
    const button = (label: string) => Array.from(container!.querySelectorAll("button"))
      .find((candidate) => candidate.textContent?.trim() === label);
    expect(button("Reconnect")).toBeUndefined();
    act(() => button("Remove app")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => button("Yes, remove it")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onRemove).toHaveBeenCalledOnce();
    act(() => root.unmount());
  });

  it("keeps dangerous actions folded by default", () => {
    const node = renderDangerZone();

    expect(node.textContent).toContain("Danger zone");
    expect(node.textContent).not.toContain("Remove app");
    expect(node.textContent).not.toContain("Deletes credentials");
  });

  it("promises credential deletion and re-authentication before the operator confirms", () => {
    const node = renderDangerZone();
    expandDangerZone(node);
    const text = node.textContent ?? "";

    expect(text).toContain("Deletes credentials for PostHog");
    expect(text).toContain("removes agent access");
    expect(text).toContain("requires a new sign-in or key");
  });

  it("keeps the warning visible in the confirming state", () => {
    const node = renderDangerZone();
    expandDangerZone(node);
    const trigger = Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Remove app");
    expect(trigger).toBeTruthy();

    act(() => trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const text = node.textContent ?? "";
    expect(text).toContain("Yes, remove it");
    expect(text).toContain("Deletes credentials for PostHog");
    expect(text).toContain("requires a new sign-in or key");
  });

});
