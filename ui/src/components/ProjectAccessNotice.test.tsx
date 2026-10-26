// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { ProjectAccessNotice } from "./ProjectAccessNotice";

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  act(() => { void i18n.changeLanguage("en"); });
});

it("preserves raw names, diagnostics state and action gates across locale changes", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onManage = vi.fn(), onRetry = vi.fn();
  const props = { agentName: "The agent", projectName: "<b>This project</b>", ready: false, canManage: false, canRetry: false, onManage, onRetry, error: new Error("<b>Access denied</b>") };
  act(() => root?.render(<ProjectAccessNotice {...props} />));
  const details = container.querySelector("details")!;
  details.open = true;
  const button = container.querySelector("button")!;
  button.focus();
  for (const locale of ["ru", "en"]) {
    act(() => { void i18n.changeLanguage(locale); });
    expect(container.querySelector("details")).toBe(details);
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(container.querySelector("h3")?.textContent).toContain("The agent");
    expect(container.textContent).toContain("<b>This project</b>");
    expect(container.textContent).toContain("<b>Access denied</b>");
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(onManage).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe(locale === "ru" ? "Доступ к проекту" : "Project access");
  }
  act(() => button.click());
  expect(onManage).toHaveBeenCalledExactlyOnceWith(expect.anything());
  act(() => root?.render(<ProjectAccessNotice {...props} ready />));
  expect(container.querySelector("button")).toBeNull();
  act(() => root?.render(<ProjectAccessNotice {...props} ready canRetry />));
  act(() => container.querySelector("button")!.click());
  expect(onRetry).toHaveBeenCalledTimes(1);
});
