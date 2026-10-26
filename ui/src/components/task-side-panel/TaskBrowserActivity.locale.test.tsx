// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskBrowser } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { TaskBrowserActivity } from "./TaskBrowserActivity";
let host: HTMLDivElement; let root: Root;
const browser: TaskBrowser = { id: "browser-1", sessionId: "session-1", issueId: "issue-1", status: "idle", runStatus: null, progress: null, costCents: 0, idleDeadline: null, expiresAt: null, error: null, createdAt: "2026-10-26T12:00:00Z" };
beforeEach(async () => { await i18n.changeLanguage("en"); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage("en"); });
describe("browser timeline labels", () => {
  it("localizes only generated labels and preserves the selected browser identity", async () => {
    const open = vi.fn();
    await act(async () => root.render(<TaskBrowserActivity browser={browser} label="Browser 2" labelDisplay={{ code: "browser.label", number: 2 }} onOpen={open} />));
    const button = host.querySelector("button")!;
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(host.textContent).toContain("Браузер 2"); expect(host.textContent).toContain("ожидает"); expect(button.textContent).toBe("Открыть браузер");
    expect(host.querySelector("button")).toBe(button); expect(open).not.toHaveBeenCalled();
    await act(async () => root.render(<TaskBrowserActivity browser={browser} label="Browser 2" onOpen={open} />));
    expect(host.textContent).toContain("Browser 2"); expect(host.textContent).not.toContain("Браузер 2");
    await act(async () => { button.click(); }); expect(open).toHaveBeenCalledExactlyOnceWith("browser-1");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(button.textContent).toBe("Open browser"); expect(host.querySelector("button")).toBe(button); expect(open).toHaveBeenCalledTimes(1);
  });
});
