// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { Dialog, DialogContent } from "../ui/dialog";
import { ExternalAgentInviteContent } from "./ExternalAgentInviteContent";

let root: Root;
let host: HTMLDivElement;
const callbacks = { onSelect: vi.fn(), onBack: vi.fn(), onClose: vi.fn(), onCopied: vi.fn(), onRetry: vi.fn(), onNewPrompt: vi.fn() };
beforeEach(async () => {
  await i18n.changeLanguage("en"); vi.clearAllMocks();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage("en"); });

it("preserves canonical picker selection and explicit reason and organization provenance across locales", async () => {
  async function render(options: { duplicate?: boolean; fallback?: boolean; name?: string } = {}) {
    await act(async () => root.render(<Dialog open><DialogContent><ExternalAgentInviteContent
      {...callbacks} preset={null} prompt="literal prompt" companyName={options.name ?? "your organization"}
      companyNameIsFallback={options.fallback} grokDisabledReasonIsDuplicate={options.duplicate}
      dotDisabledReason="Loading instance settings…" grokDisabledReason="Loading instance settings…"
      connection={{ phase: "waiting" }} museEnabled /></DialogContent></Dialog>));
  }
  const reasons = () => [...document.querySelectorAll("p")].filter(p => p.textContent === "Loading instance settings…");
  await render();
  expect(reasons()).toHaveLength(1);
  const hermes = [...document.querySelectorAll("button")].find(button => button.textContent?.startsWith("Hermes"))!;
  hermes.focus();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(document.activeElement).toBe(hermes);
  expect(document.body.textContent).toContain("your organization");
  expect(document.body.textContent).not.toContain("ваша организация");
  expect(reasons()).toHaveLength(1);
  expect(callbacks.onSelect).not.toHaveBeenCalled();
  await act(async () => hermes.click());
  expect(callbacks.onSelect).toHaveBeenCalledExactlyOnceWith("hermes");
  await render({ duplicate: false, fallback: true });
  expect(reasons()).toHaveLength(2);
  expect(document.body.textContent).toContain("Пригласите знакомого вам агента в свою организацию.");
  await render({ duplicate: true, name: "You <strong>raw</strong>" });
  expect(reasons()).toHaveLength(1);
  expect(document.body.textContent).toContain("You <strong>raw</strong>");
  expect(document.querySelector('[role="dialog"] strong')).toBeNull();
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(document.activeElement).toBe(hermes);
  expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
  expect(callbacks.onCopied).not.toHaveBeenCalled();
  expect(callbacks.onRetry).not.toHaveBeenCalled();
});
