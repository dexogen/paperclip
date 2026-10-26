import { i18n } from "../i18n";
import { afterEach, describe, expect, it } from "vitest";
import {
  environmentDisplayLabel,
  environmentDriverLabel,
  filterManagedSandboxSelectableEnvironments,
  isPlatformManagedEnvironment,
} from "./managed-sandbox-environment";

describe("managed sandbox environment helpers", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });
  it("identifies platform-managed rows by the provisioner marker", () => {
    expect(isPlatformManagedEnvironment({ metadata: { managedByPaperclip: true } })).toBe(true);
    expect(isPlatformManagedEnvironment({ metadata: { managedByPaperclip: false } })).toBe(false);
    expect(isPlatformManagedEnvironment({ metadata: { source: "manual" } })).toBe(false);
    expect(isPlatformManagedEnvironment({ metadata: null })).toBe(false);
    expect(isPlatformManagedEnvironment(null)).toBe(false);
  });

  it("labels platform-managed rows by name alone and keeps the driver suffix elsewhere", async () => {
    await i18n.changeLanguage("ru");
    expect(
      environmentDisplayLabel({
        name: "Paperclip Computer",
        driver: "sandbox",
        metadata: { managedByPaperclip: true },
      }),
    ).toBe("Paperclip Computer");
    expect(
      environmentDisplayLabel({ name: "E2B", driver: "sandbox", metadata: null }),
    ).toBe("E2B · sandbox");
    expect(
      environmentDisplayLabel({ name: "Build box", driver: "ssh", metadata: {} }),
    ).toBe("Build box · ssh");
    const ru = i18n.getFixedT("ru");
    expect(environmentDisplayLabel({ name: "Local", driver: "sandbox", metadata: null }, ru)).toBe("Local · песочница");
    expect(environmentDisplayLabel({ name: "Local", driver: "sandbox", metadata: { managedByPaperclip: true } }, ru)).toBe("Local");
    expect(environmentDriverLabel("ssh", ru)).toBe("SSH");
    expect(environmentDriverLabel("toString", ru)).toBe("toString");
  });

  it("filters the local environment only under managed-sandbox-only", () => {
    const environments = [
      { driver: "local" as const },
      { driver: "sandbox" as const },
      { driver: "ssh" as const },
    ];
    expect(filterManagedSandboxSelectableEnvironments(environments, true)).toEqual([
      { driver: "sandbox" },
      { driver: "ssh" },
    ]);
    expect(filterManagedSandboxSelectableEnvironments(environments, false)).toEqual(environments);
  });
});
