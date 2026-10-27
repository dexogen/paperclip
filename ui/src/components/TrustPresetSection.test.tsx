// @vitest-environment jsdom
import { act } from "react";
import { i18n } from "../i18n";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentPermissions } from "@paperclipai/shared";
import { TrustPresetSection } from "./TrustPresetSection";
import { TooltipProvider } from "@/components/ui/tooltip";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderSection(permissions: Partial<AgentPermissions>, options: { disabled?: boolean; allowSingleIssue?: boolean } = {}, withProjectEditor = false) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const onChange = vi.fn();
  const createdRoot = createRoot(container);
  root = createdRoot;
  await act(async () => {
    createdRoot.render(
      <TooltipProvider>
        <TrustPresetSection
          projectAccessEditor={withProjectEditor ? <div>Allowed projects</div> : undefined}
          permissions={permissions}
          onChange={onChange}
          companyId="company-1"
          projectCandidates={[{ id: "project-1", label: "Paperclip App" }]}
          issueCandidates={[{ id: "issue-1", label: "PAP-1 · Review PR" }]}
          {...options}
        />
      </TooltipProvider>,
    );
  });
  return { onChange, text: () => container?.textContent ?? "" };
}

beforeEach(async () => { await i18n.changeLanguage("en"); });

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  container?.remove();
  root = null;
  container = null;
  await i18n.changeLanguage("en");
});

describe("TrustPresetSection", () => {
  it("hides the CE boundary editor under Standard", async () => {
    const view = await renderSection({ canCreateAgents: false, trustPreset: "standard" });

    expect(view.text()).toContain("Trust preset");
    expect(view.text()).not.toContain("Boundary type");
    expect(view.text()).not.toContain("Get Paperclip EE.");
  });

  it("shows a selectable CE boundary editor for low-trust review", async () => {
    const view = await renderSection({
      canCreateAgents: false,
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustPreset: "low_trust_review",
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          projectIds: ["project-1"],
        },
      },
    });

    expect(view.text()).toContain("Containment active");
    expect(view.text()).toContain("Boundary type");
    expect(view.text()).toContain("Paperclip App");
    expect(view.text()).toContain("Get Paperclip EE.");
    expect(view.text()).not.toContain("Managed by EE/API");
  });

  it("keeps the single-boundary controls when the allowed-project editor is present", async () => {
    const view = await renderSection({ trustPreset: "low_trust_review", authorizationPolicy: {
      trustPreset: "low_trust_review", trustBoundary: {
        mode: "low_trust_review", companyId: "company-1", projectIds: ["project-1"],
      },
    } }, {}, true);
    expect(view.text()).toContain("Allowed projects");
    expect(view.text()).toContain("Boundary type");
    const clear = [...container!.querySelectorAll("button")].find(button => button.textContent === "Clear boundary");
    expect(clear).toBeDefined();
    await act(async () => clear!.click());
    const changed = view.onChange.mock.calls[0][0];
    expect(changed.trustPreset).toBe("low_trust_review");
    expect(changed.authorizationPolicy.trustBoundary.projectIds).toBeUndefined();
  });

  it("renders multi-boundary policies as read-only", async () => {
    const view = await renderSection({
      canCreateAgents: false,
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustPreset: "low_trust_review",
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          projectIds: ["project-1", "project-2"],
        },
      },
    });

    expect(view.text()).toContain("Managed by EE/API");
    expect(view.text()).toContain("2 boundaries");
    expect(view.text()).not.toContain("Clear boundary");
  });
});


it("preserves an open policy and unsaved boundary type across EN/RU/EN without writing permissions", async () => {
  const view = await renderSection({
    canCreateAgents: false,
    trustPreset: "low_trust_review",
    authorizationPolicy: {
      trustBoundary: { mode: "low_trust_review", companyId: "company-1", projectIds: ["project-1"] },
    },
  });
  const selects = container!.querySelectorAll("select");
  const targetType = selects[1]!;
  await act(async () => {
    targetType.value = "root_issue";
    targetType.dispatchEvent(new Event("change", { bubbles: true }));
    [...container!.querySelectorAll("button")].find(button => button.textContent?.includes("View policy"))!.click();
  });
  expect(targetType.value).toBe("root_issue");
  expect(view.onChange).not.toHaveBeenCalled();
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(view.text()).toContain("Режим доверия");
  expect(view.text()).toContain("Тип границы");
  expect(view.text()).toContain("Разрешённые инструменты");
  expect(container!.querySelectorAll("select")[1]).toBe(targetType);
  expect(targetType.value).toBe("root_issue");
  expect(view.text()).toContain("PAP-1 · Review PR");
  expect(view.onChange).not.toHaveBeenCalled();
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(container!.querySelectorAll("select")[1]).toBe(targetType);
  expect(targetType.value).toBe("root_issue");
  const candidate = container!.querySelectorAll("select")[2]!;
  await act(async () => {
    candidate.value = "issue-1";
    candidate.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(view.onChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    authorizationPolicy: expect.objectContaining({
      trustBoundary: { mode: "low_trust_review", companyId: "company-1", rootIssueId: "issue-1" },
    }),
  }));
});


it("keeps disabled trust controls and the email single-issue restriction after a language change", async () => {
  const view = await renderSection({ trustPreset: "low_trust_review" }, { disabled: true, allowSingleIssue: false });
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(view.text()).toContain("Граница доступа не настроена");
  expect(container!.querySelector('option[value="issue"]')).toBeNull();
  expect([...container!.querySelectorAll("select")].every(select => select.disabled)).toBe(true);
  expect(view.onChange).not.toHaveBeenCalled();
});
