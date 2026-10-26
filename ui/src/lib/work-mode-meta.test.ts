import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";

import { nextWorkMode, titleForPendingWorkMode, workModeMetaList } from "./work-mode-meta";

describe("work mode metadata", () => {
  it("orders issue work modes as auto, planning, then ask", () => {
    expect(workModeMetaList().map((mode) => mode.value)).toEqual(["standard", "planning", "ask"]);
    expect(workModeMetaList().map((mode) => mode.label)).toEqual(["Auto mode", "Plan mode", "Ask mode"]);
  });

  it("cycles issue work modes as auto, planning, ask, then auto", () => {
    expect(nextWorkMode("standard")).toBe("planning");
    expect(nextWorkMode("planning")).toBe("ask");
    expect(nextWorkMode("ask")).toBe("standard");
  });

  it("uses graduated tooltip copy", () => {
    expect(titleForPendingWorkMode("standard")).toBe("Auto mode for this submission. Click to change.");
    expect(titleForPendingWorkMode("planning")).toBe("Plan mode is on for this submission. Click to change.");
  });

  it("localizes display metadata without changing mode values or English callers", async () => {
    const previousLanguage = i18n.language;
    try {
      await i18n.changeLanguage("ru");
      const translated = workModeMetaList(i18n.getFixedT("ru"));
      expect(translated.map((mode) => mode.value)).toEqual(["standard", "planning", "ask"]);
      expect(translated.map((mode) => mode.label)).toEqual(["Автоматический режим", "Режим планирования", "Режим вопроса"]);
      expect(titleForPendingWorkMode("ask", i18n.getFixedT("ru"))).toContain("Ответственный ответит");
      expect(workModeMetaList().map((mode) => mode.label)).toEqual(["Auto mode", "Plan mode", "Ask mode"]);
      expect(titleForPendingWorkMode("standard")).toBe("Auto mode for this submission. Click to change.");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
