// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { i18n, setLocale } from "@/i18n";
import { AgentSetupError, formatAgentSetupError, SETUP_LOGIN_HINTS, setupEffortLabel, setupEfforts, setupLoginHint } from "./agent-setup-fields";

afterEach(async () => { await setLocale("en"); });

it("keeps canonical effort values and English helper defaults under Russian locale", async () => {
  const values = setupEfforts("pi_local");
  await setLocale("ru");
  expect(setupEfforts("pi_local")).toEqual(values);
  expect(setupEffortLabel("high")).toBe("high");
  expect(setupEffortLabel("high", i18n.getFixedT("ru"))).toBe("Высокий");
  expect(setupEffortLabel("future<&>", i18n.getFixedT("ru"))).toBe("future<&>");
  expect(setupLoginHint("cursor")).toBe(SETUP_LOGIN_HINTS.cursor);
  expect(setupLoginHint("cursor", i18n.getFixedT("ru"))).toContain("agent login");
  expect(setupLoginHint("unknown")).toBeUndefined();
});

it("formats closed app errors late while preserving ordinary Error messages and nested causes", async () => {
  const error = new AgentSetupError("credentialKey", "TOKEN<&>");
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe("Enter TOKEN<&> or select an organization secret.");
  expect(formatAgentSetupError(error, i18n.getFixedT("ru"))).toBe("Введите TOKEN<&> или выберите секрет организации.");
  const sameEnglish = new Error("Could not save agent setup.");
  expect(formatAgentSetupError(sameEnglish, i18n.getFixedT("ru"))).toBe(sameEnglish.message);
  const wrapper = new AgentSetupError("credentialCleanup", "", { cause: sameEnglish });
  expect(wrapper.cause).toBe(sameEnglish);
  expect(formatAgentSetupError(wrapper, i18n.getFixedT("ru"))).toBe("Could not save agent setup. Не удалось удалить неиспользуемые учётные данные настройки. Удалите их в разделе «Секреты» перед повторной попыткой.");
  const own = new AgentSetupError("credentialCleanup", "", { cause: new AgentSetupError("save") });
  await setLocale("ru");
  expect(formatAgentSetupError(own)).toBe("Could not save agent setup. Could not remove an unused setup credential. Remove it from Secrets before retrying.");
  expect(formatAgentSetupError(own, i18n.getFixedT("ru"))).toMatch(/^Не удалось сохранить настройки агента\./);
});

describe("model-specific setup efforts", () => {
  it("offers current Claude efforts without offering them on Haiku", () => {
    expect(setupEfforts("claude_local", "claude-fable-5-1")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-sonnet-5-5")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-opus-5-5")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("claude_local", "claude-haiku-4-5")).toEqual([]);
  });

  it("offers xhigh on Grok 4.7 and 4.6, with the lower limit on 4.5", () => {
    expect(setupEfforts("grok_local", "grok-4.7")).toEqual(["low", "medium", "high", "xhigh"]);
    expect(setupEfforts("grok_local", "grok-4.6")).toContain("xhigh");
    expect(setupEfforts("grok_local", "grok-4.5")).toEqual(["low", "medium", "high"]);
  });

  it("caps Luna at max while exposing ultra on Sol", () => {
    expect(setupEfforts("codex_local", "gpt-6-luna")).toEqual(["low", "medium", "high", "xhigh", "max"]);
    expect(setupEfforts("codex_local", "gpt-6-sol")).toContain("ultra");
  });
});
