// @vitest-environment jsdom

import { i18n } from "@/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskChatProviderActivityItem } from "./task-chat-model";
import { TaskChatStatusNotice } from "./TaskChatStatusNotice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function notice(details: Record<string, string>, summary?: string): TaskChatProviderActivityItem {
  return {
    id: "notice", kind: "protocol", surface: "provider_activity", family: "provider_notice",
    eventType: "provider.notice.recorded", status: "informational", title: "Provider notice", summary,
    details: Object.entries(details).map(([label, value]) => ({ label, value })),
    steps: [], links: [], children: [],
  };
}

describe("TaskChatStatusNotice", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("labels a Codex retry by its error info and fades it once resolved", () => {
    const item = notice({ Severity: "warning", Category: "provider_retry", Recoverable: "true", Reason: "serverOverloaded" }, "High demand");
    act(() => root.render(<TaskChatStatusNotice item={item} />));
    expect(container.textContent).toContain("Retrying after overload");
    expect(container.textContent).toContain("High demand");
    act(() => root.render(<TaskChatStatusNotice item={item} resolved />));
    expect(container.textContent).toContain("Recovered after retry");
    expect(container.querySelector("[data-status-notice-resolved=true]")).not.toBeNull();
    act(() => root.render(<TaskChatStatusNotice item={{ ...item, status: "interrupted" }} />));
    expect(container.textContent).toContain("Retry stopped");
  });

  it("updates an expanded retry notice without replacing provider text or disclosure state", async () => {
    const raw = "Provider <literal> {{reason}}";
    const item = notice({ Category: "provider_retry", Reason: "serverOverloaded", Attempt: "2", "Max attempts": "5" }, raw);
    act(() => root.render(<TaskChatStatusNotice item={item} />));
    const button = container.querySelector("button")!;
    act(() => button.click());
    try {
      for (const [language, expected] of [["ru", "Повтор после перегрузки (попытка 2 из 5)"], ["en", "Retrying after overload (attempt 2 of 5)"]]) {
        await act(async () => { await i18n.changeLanguage(language); });
        expect(container.textContent).toContain(expected);
        expect(container.textContent).toContain(raw);
        expect(container.querySelector("button")).toBe(button);
        expect(button.getAttribute("aria-expanded")).toBe("true");
        expect(container.querySelector("literal")).toBeNull();
      }
    } finally { await act(async () => { await i18n.changeLanguage("en"); }); }
  });

  it("shows compaction phases and a model fallback target", () => {
    act(() => root.render(<TaskChatStatusNotice item={notice({ Severity: "info", Category: "context_compaction", Phase: "running" })} />));
    expect(container.textContent).toContain("Compacting context…");
    act(() => root.render(<TaskChatStatusNotice item={{ ...notice({ Severity: "info", Category: "context_compaction", Phase: "running" }), status: "interrupted" }} />));
    expect(container.textContent).toContain("Compaction stopped");
    expect(container.querySelector(".animate-spin")).toBeNull();
    act(() => root.render(<TaskChatStatusNotice item={notice({ Severity: "warning", Category: "model_fallback", "Fallback model": "claude-sonnet-5-5", Reason: "declined the request" })} />));
    expect(container.textContent).toContain("Fell back to claude-sonnet-5-5");
  });

  it("shows the full fallback explanation when the chip is expanded", () => {
    const full = "claude-opus-5-5 declined this request (cyber); retried with claude-sonnet-5-5. The session will continue on claude-sonnet-5-5.";
    act(() => root.render(<TaskChatStatusNotice item={notice({ Severity: "warning", Category: "model_fallback", "Fallback model": "claude-sonnet-5-5", Reason: "declined the request (cyber)" }, full)} />));
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    act(() => button!.click());
    expect(container.textContent).toContain(full);
  });

  it("does not treat a recoverable error notice from the live adapter as fatal", () => {
    act(() => root.render(<TaskChatStatusNotice item={notice({ Severity: "error", Category: "error", Recoverable: "Yes" }, "transient")} />));
    expect(container.querySelector("[role=alert]")).toBeNull();
  });

  it("renders a fatal provider error as an alert with the real message", () => {
    act(() => root.render(<TaskChatStatusNotice item={notice({ Severity: "error", Category: "error", Recoverable: "No", Reason: "usageLimitExceeded" }, "You've hit your usage limit.")} />));
    const alert = container.querySelector("[role=alert]");
    expect(alert?.textContent).toContain("Provider error");
    expect(alert?.textContent).toContain("You've hit your usage limit.");
    expect(alert?.textContent).toContain("usageLimitExceeded");
  });
});
