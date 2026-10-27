import { i18n } from "@/i18n";
import { afterEach, describe, expect, it } from "vitest";
import type { ToolProfileSummary } from "@paperclipai/shared";
import { allowsLabel, assignedLabel, STATUS_LABEL } from "./profile-summary";

function summary(partial: Partial<ToolProfileSummary>): ToolProfileSummary {
  return {
    accessMode: "selected",
    allowedToolCount: 0,
    allowedApplicationCount: 0,
    excludedToolCount: 0,
    totalToolCount: 0,
    assignmentCount: 0,
    appliesToAgentCount: 0,
    isCompanyDefault: false,
    ...partial,
  };
}

describe("allowsLabel", () => {
  it("renders tools and apps in selected mode", () => {
    expect(allowsLabel(summary({ allowedToolCount: 9, allowedApplicationCount: 3 }))).toBe("9 tools · 3 apps");
  });

  it("drops the app clause when no whole app is allowed", () => {
    expect(allowsLabel(summary({ allowedToolCount: 1 }))).toBe("1 tool");
  });

  it("renders 'All except N' in all_except mode", () => {
    expect(allowsLabel(summary({ accessMode: "all_except", excludedToolCount: 2 }))).toBe("All except 2 tools");
  });

  it("renders 'All tools' when nothing is excluded", () => {
    expect(allowsLabel(summary({ accessMode: "all_except", excludedToolCount: 0 }))).toBe("All tools");
  });
});

describe("assignedLabel", () => {
  it("prefers the company-default label", () => {
    expect(assignedLabel(summary({ isCompanyDefault: true, appliesToAgentCount: 4 }))).toEqual({
      text: "Organization default",
      unassigned: false,
    });
  });

  it("counts agents", () => {
    expect(assignedLabel(summary({ appliesToAgentCount: 2 }))).toEqual({ text: "2 agents", unassigned: false });
  });

  it("flags an unassigned profile as having no effect", () => {
    expect(assignedLabel(summary({}))).toEqual({ text: "Not assigned yet", unassigned: true });
  });
});

describe("STATUS_LABEL", () => {
  it("uses prosumer words", () => {
    expect(STATUS_LABEL.draft).toBe("Draft");
    expect(STATUS_LABEL.disabled).toBe("Off");
  });
});


describe("localized profile summaries", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });

  it("updates whole plural summaries without changing numeric source values", async () => {
    const value = summary({ allowedToolCount: 21, allowedApplicationCount: 5, appliesToAgentCount: 2 });
    const original = structuredClone(value);
    await i18n.changeLanguage("ru");
    expect(allowsLabel(value)).toBe("21 инструмент · 5 приложений");
    expect(assignedLabel(value).text).toBe("2 агента");
    expect(STATUS_LABEL.draft).toBe("Черновик");
    await i18n.changeLanguage("en");
    expect(allowsLabel(value)).toBe("21 tools · 5 apps");
    expect(assignedLabel(value).text).toBe("2 agents");
    expect(value).toEqual(original);
  });
});
