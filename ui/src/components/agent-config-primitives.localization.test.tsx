// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "@paperclipai/shared";
import { i18n, setLocale } from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAgentConfigHelp, help, agentConfigRoleLabel } from "./agent-config-primitives";
import { ReportsToPicker } from "./ReportsToPicker";
import { ClaudeLocalAdvancedFields } from "../adapters/claude-local/config-fields";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
beforeEach(async () => { await setLocale("en"); container = document.createElement("div"); document.body.appendChild(container); });
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; container.remove(); await setLocale("en"); });
async function mount(node: React.ReactNode) {
  root = createRoot(container);
  await act(async () => root!.render(<TooltipProvider>{node}</TooltipProvider>));
}

describe("agent configuration locale boundaries", () => {
  it("keeps legacy help fixed English and translates template guidance without expanding its examples", async () => {
    const englishHelp = { ...help };
    await setLocale("ru");
    expect(help).toEqual(englishHelp);
    expect(help.title).toBe("Job title shown in the org chart.");
    expect(getAgentConfigHelp()).toEqual(help);
    const localized = getAgentConfigHelp(i18n.getFixedT("ru"));
    expect(localized.name).toBe("Отображаемое имя агента.");
    expect(localized.title).toBe("Должность в организационной структуре.");
    expect(localized.promptTemplate).toContain("{{ agent.name }}");
    expect(localized.workspaceBranchTemplate).toContain("{{issue.identifier}}");
    expect(localized.workspaceBranchTemplate).toContain("{{workspace.repoRef}}");
    expect(agentConfigRoleLabel("engineer")).toBe("Engineer");
    expect(agentConfigRoleLabel("engineer", i18n.getFixedT("ru"))).toBe("Инженер");
    expect(agentConfigRoleLabel("toString", i18n.getFixedT("ru"))).toBe("toString");
    expect(agentConfigRoleLabel("Engineer", i18n.getFixedT("ru"))).toBe("Engineer");
    await setLocale("en");
    expect(help).toEqual(englishHelp);
  });

  it("keeps the open manager picker and literal names while selecting the same canonical ID", async () => {
    const onChange = vi.fn();
    const rawName = "No manager <strong>literal</strong>";
    const agents = [
      { id: "manager-1", name: rawName, role: "engineer", status: "idle" },
      { id: "manager-2", name: "Other", role: "toString", status: "idle" },
    ] as Agent[];
    function Fixture() {
      const [value, setValue] = useState<string | null>(null);
      return <ReportsToPicker agents={agents} value={value} onChange={id => { onChange(id); setValue(id); }} />;
    }
    await mount(<Fixture />);
    const trigger = container.querySelector<HTMLButtonElement>("button")!;
    await act(async () => trigger.click());
    await act(async () => { await setLocale("ru"); });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.textContent).toContain("Без руководителя");
    expect(document.body.textContent).toContain(rawName);
    expect(document.body.textContent).toContain("Инженер");
    expect(document.body.textContent).toContain("toString");
    expect(document.body.querySelector("strong")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    const choice = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes(rawName))!;
    await act(async () => choice.click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith("manager-1");
    expect(trigger.textContent).toContain(`Руководитель: ${rawName}`);
    await act(async () => { await setLocale("en"); });
    expect(container.querySelector("button")).toBe(trigger);
    expect(trigger.textContent).toContain(`Reports to ${rawName}`);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps a dirty Claude ACP command and focus across locales without writing configuration again", async () => {
    const mark = vi.fn();
    await mount(<ClaudeLocalAdvancedFields mode="edit" isCreate={false} adapterType="claude_local"
      values={null} set={null} config={{ engine: "acp", agentCommand: "/raw/claude-agent-acp", mode: "persistent", nonInteractivePermissions: "deny" }}
      eff={(_group, _field, original) => original} mark={mark} models={[]} />);
    const input = container.querySelector<HTMLInputElement>('[placeholder="claude-agent-acp"]')!;
    input.focus();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "/custom/claude");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    input.setSelectionRange(2, 5);
    expect(mark).toHaveBeenCalledExactlyOnceWith("adapterConfig", "agentCommand", "/custom/claude");
    for (const locale of ["ru", "en"] as const) {
      await act(async () => { await setLocale(locale); });
      expect(container.textContent).toContain(locale === "ru" ? "Команда сервера ACP" : "ACP server command");
      expect(container.querySelector('[placeholder="claude-agent-acp"]')).toBe(input);
      expect(document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
      expect(input.value).toBe("/custom/claude");
      expect(mark).toHaveBeenCalledTimes(1);
      expect([...container.querySelectorAll("select")].map(select => select.value)).toEqual(["acp", "persistent", "deny"]);
    }
  });
});
