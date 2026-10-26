// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IssueWorkProduct } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { RichWorkProductCard } from "./RichWorkProductCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
const title = '<b>Plan & {{literal}}</b>';
function workProduct(overrides: Partial<IssueWorkProduct> = {}): IssueWorkProduct {
  return {
    id: "work-product-1", companyId: "company-1", projectId: null, issueId: "issue-1",
    executionWorkspaceId: null, runtimeServiceId: null, type: "document", provider: "paperclip",
    externalId: "plan", title, url: null, status: "ready_for_review", reviewState: "none",
    isPrimary: true, healthStatus: "healthy", summary: "Raw <summary> {{value}}",
    metadata: { revision: 21 }, createdByRunId: null,
    createdAt: new Date("2026-10-26T08:00:00Z"), updatedAt: new Date("2026-10-26T08:00:00Z"), ...overrides,
  };
}
beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => { root.unmount(); }); host.remove(); await i18n.changeLanguage("en");
});
describe("localized task resources", () => {
  it("renders the real document revision in both languages without changing its content or link", async () => {
    const item = workProduct(); const original = structuredClone(item);
    await act(async () => { root.render(<RichWorkProductCard workProduct={item} href="#document-plan" />); });
    const card = host.querySelector("article"); const link = host.querySelector("a");
    expect(card?.textContent).toContain("Document · rev 21");
    expect(link?.getAttribute("aria-label")).toBe(`Open document: ${title}`);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(card?.textContent).toContain("Документ · ред. 21");
    expect(link?.getAttribute("aria-label")).toBe(`Открыть документ: ${title}`);
    expect(host.querySelector("article")).toBe(card); expect(host.querySelector("a")).toBe(link);
    expect(link?.getAttribute("href")).toBe("#document-plan");
    expect(card?.textContent).toContain(title); expect(card?.textContent).toContain(item.summary);
    expect(host.querySelector("b, summary")).toBeNull(); expect(item).toEqual(original);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(card?.textContent).toContain("Document · rev 21");
    expect(host.querySelector("a")).toBe(link);
  });

  it("keeps an expanded resource open while translating canonical status and preserving custom status", async () => {
    const item = workProduct();
    await act(async () => { root.render(<RichWorkProductCard workProduct={item} href={null} />); });
    const button = host.querySelector<HTMLButtonElement>("button")!;
    await act(async () => { button.click(); });
    expect(host.textContent).toContain("paperclip · ready for review · Updated");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(button.getAttribute("aria-expanded")).toBe("true"); expect(host.querySelector("button")).toBe(button);
    expect(host.textContent).toContain("paperclip · Готово к проверке · Обновлено:");
    expect(host.textContent).toContain(item.summary); expect(item.status).toBe("ready_for_review");
    const custom = "provider_<status>_{{raw}}";
    await act(async () => { root.render(<RichWorkProductCard workProduct={{ ...item, status: custom }} href={null} />); });
    expect(host.textContent).toContain("provider <status> {{raw}}"); expect(host.querySelector("status")).toBeNull();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(host.textContent).toContain("provider <status> {{raw}}"); expect(host.querySelector("button")).toBe(button);
  });

});
