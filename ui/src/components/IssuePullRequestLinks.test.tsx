// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { IssueWorkProduct } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { IssuePullRequestLinks } from "./IssuePullRequestLinks";
import type { ExternalObjectPillData } from "./ExternalObjectPill";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  await i18n.changeLanguage("en");
});
const saved = {
  id: "pr-1", type: "pull_request", title: "User title", url: "https://github.com/example/repo/pull/42",
  status: "ready_for_review", reviewState: "needs_board_review", metadata: {},
} as IssueWorkProduct;

describe("localized saved pull requests", () => {
  it("keeps terminal provider status authoritative through language and product-count changes", async () => {
    const provider: ExternalObjectPillData = {
      providerKey: "github", objectType: "pull_request", url: saved.url,
      statusCategory: "succeeded", statusLabel: "merged", liveness: "fresh",
    };
    container = document.createElement("div"); document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<IssuePullRequestLinks products={[saved]} externalObjects={[provider]} />));
    expect(container.textContent).not.toContain("Review requested");
    const link = container.querySelector("a");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.querySelector("a")).toBe(link);
    expect(link?.getAttribute("href")).toBe(saved.url);
    expect(container.textContent).toContain("merged");
    expect(container.textContent).not.toContain("Запрошена проверка");
    await act(async () => root!.render(<IssuePullRequestLinks products={[saved, { ...saved, id: "pr-2", url: null }]} externalObjects={[provider]} />));
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.textContent).toContain("Запрошена проверка");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Review requested");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
