// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { BoardClaimPage } from "./BoardClaim";

const mocks = vi.hoisted(() => ({ session: vi.fn(), status: vi.fn(), claim: vi.fn() }));
vi.mock("@/api/auth", () => ({ authApi: { getSession: mocks.session } }));
vi.mock("@/api/access", () => ({ accessApi: { getBoardClaimStatus: mocks.status, claimBoard: mocks.claim } }));
vi.mock("@/lib/router", () => ({
  useParams: () => ({ token: "token-123" }),
  useSearchParams: () => [new URLSearchParams({ code: "abc+/=" })],
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await i18n.changeLanguage("en");
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "operator-1" } });
  mocks.status.mockResolvedValue({ status: "available", requiresSignIn: false });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  await i18n.changeLanguage("en");
});
async function render() {
  await act(async () => root.render(<QueryClientProvider client={client}><BoardClaimPage /></QueryClientProvider>));
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.querySelector("h1")).not.toBeNull();
  });
}
async function language(locale: "en" | "ru") {
  await act(async () => { await i18n.changeLanguage(locale); });
}

describe("board claim localization", () => {
  it("requires an explicit claim and preserves the URL credentials across language changes", async () => {
    mocks.claim.mockImplementation(() => new Promise(() => {}));
    await render();
    await language("ru");
    expect(container.querySelector("h1")?.textContent).toBe("Получение прав владельца");
    await language("en");
    expect(mocks.session).toHaveBeenCalledTimes(1);
    expect(mocks.status).toHaveBeenCalledExactlyOnceWith("token-123", "abc+/=");
    expect(mocks.claim).not.toHaveBeenCalled();
    await act(async () => container.querySelector("button")!.click());
    expect(mocks.claim).toHaveBeenCalledExactlyOnceWith("token-123", "abc+/=");
    await language("ru");
    expect(container.querySelector("button")?.disabled).toBe(true);
    expect(mocks.claim).toHaveBeenCalledTimes(1);
  });

  it("keeps the encoded sign-in return URL when the user is signed out", async () => {
    mocks.session.mockResolvedValue(null);
    await render();
    const href = container.querySelector("a")!.getAttribute("href");
    expect(href).toBe(`/auth?next=${encodeURIComponent("/board-claim/token-123?code=abc%2B%2F%3D")}`);
    await language("ru");
    expect(container.querySelector("a")!.textContent).toBe("Войти / Создать учётную запись");
    expect(container.querySelector("a")!.getAttribute("href")).toBe(href);
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.status).toHaveBeenCalledTimes(1);
  });
});
