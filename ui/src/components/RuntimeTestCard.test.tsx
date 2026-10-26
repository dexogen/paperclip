// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { expect, it, vi } from "vitest";
import { setLocale } from "@/i18n";
import { RuntimeTestCard } from "./RuntimeTestCard";

it("shows the installation repair directly on a missing runtime test", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const message = "The ACPX claude runtime is incomplete: required package @agentclientprotocol/claude-agent-acp is missing. Reinstall or rebuild Paperclip with its bundled provider dependencies, restart the server, then test the agent's runtime before retrying.";
  try {
    flushSync(() => root.render(<RuntimeTestCard state="fail" onTest={() => {}} result={{
      adapterType: "paperclip_runner", status: "fail", testedAt: "2026-10-11T11:19:14Z",
      checks: [{ code: "acpx_runtime_package_missing", level: "error", message }],
    }} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Runtime missing");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(container.textContent).not.toContain("Check your model and provider connection");
  } finally {
    flushSync(() => root.unmount());
  }
});


it("keeps result diagnostics, expanded details, and explicit test identity across locales", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onTest = vi.fn();
  const message = "Runtime missing <b>& literal</b>";
  const detail = "/host/Среда --model=provider/model";
  const result = {
    adapterType: "paperclip_runner", status: "fail" as const, testedAt: "2026-10-11T11:19:14Z",
    checks: [{ code: "acpx_runtime_package_missing", level: "error" as const, message, detail, hint: "Run test" }],
  };
  try {
    await act(async () => { await setLocale("en"); root.render(<RuntimeTestCard state="fail" onTest={onTest} result={result} />); });
    const details = container.querySelector("details")!;
    details.open = true;
    const button = container.querySelector("button")!;
    button.focus();
    await act(async () => setLocale("ru"));
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Проверка среды выполнения");
    expect(container.querySelector("h3")?.textContent).toBe("Среда выполнения не установлена");
    expect(button.textContent).toBe("Повторить проверку");
    expect(container.querySelector("details")).toBe(details);
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(container.textContent).toContain(message);
    expect(container.textContent).toContain(detail);
    expect(container.querySelector("b")).toBeNull();
    expect(onTest).not.toHaveBeenCalled();
    await act(async () => setLocale("en"));
    expect(button.textContent).toBe("Retry test");
    expect(document.activeElement).toBe(button);
    await act(async () => button.click());
    expect(onTest).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => { root.unmount(); await setLocale("en"); });
    container.remove();
  }
});
