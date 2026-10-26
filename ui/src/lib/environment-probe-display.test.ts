import type { EnvironmentProbeResult } from "@paperclipai/shared";
import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import { formatEnvironmentProbeSummary } from "./environment-probe-display";

function response(summaryMessage: unknown, overrides: Partial<EnvironmentProbeResult> = {}): EnvironmentProbeResult {
  return { ok: true, driver: "sandbox", summary: "provider raw fallback", details: null, summaryMessage, ...overrides } as EnvironmentProbeResult;
}

describe("environment probe summary display", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });

  it("keeps the legacy default English and formats owned summaries with only literal parameters", async () => {
    await i18n.changeLanguage("ru");
    const provider = '<provider> {{name}} $t(common.cancel)';
    const result = response({ code: "sandbox_connected_named", params: {
      provider, sandboxName: "raw-name", lng: "en", defaultValue: "spoof", interpolation: { escapeValue: true },
    } });
    expect(formatEnvironmentProbeSummary(result)).toBe(`Connected to ${provider} sandbox raw-name.`);
    expect(formatEnvironmentProbeSummary(result, i18n.getFixedT("ru"))).toBe(`Установлено подключение к песочнице «raw-name» провайдера ${provider}.`);
    expect(result.summary).toBe("provider raw fallback");
    expect(formatEnvironmentProbeSummary(response({ code: "ssh_probe_failed", params: { username: "operator", host: "raw-host" } }, {
      ok: false, driver: "ssh",
    }), i18n.getFixedT("ru"))).toBe("Не удалось проверить SSH-подключение к operator@raw-host.");
  });

  it("preserves empty, English-equal and provider summaries without host provenance", () => {
    for (const summary of ["", " ", "Local environment is available on this Paperclip host.", "<provider> {{name}}"] as const) {
      const result: EnvironmentProbeResult = { ok: true, driver: "local", summary,
        details: { summaryMessage: { code: "local_available" }, metadata: { summaryMessage: { code: "local_available" } } } };
      expect(formatEnvironmentProbeSummary(result, i18n.getFixedT("ru"))).toBe(summary);
      const inherited = Object.assign(Object.create({ summaryMessage: { code: "local_available" } }), result);
      expect(formatEnvironmentProbeSummary(inherited, i18n.getFixedT("ru"))).toBe(summary);
    }
  });

  it("ignores malformed and inherited descriptors without rejecting the result", () => {
    for (const summaryMessage of [
      null, [], "sandbox_connected", { code: "toString" }, { code: "future_code" },
      Object.create({ code: "sandbox_connected", params: { provider: "raw" } }),
      { code: "sandbox_connected" }, { code: "sandbox_connected", params: [] },
      { code: "sandbox_connected", params: { provider: 1 } },
      { code: "sandbox_connected", params: Object.create({ provider: "raw" }) },
      Object.assign(Object.create({ params: { provider: "raw" } }), { code: "sandbox_connected" }),
      { code: "sandbox_connected_named", params: { provider: "raw" } },
    ]) {
      const result = response(summaryMessage, { summary: "" });
      expect(formatEnvironmentProbeSummary(result, i18n.getFixedT("ru"))).toBe("");
      expect(result.ok).toBe(true);
    }
  });

  it("requires descriptor status and driver to agree with the actual result", () => {
    for (const overrides of [{ ok: false }, { driver: "plugin" as const }]) {
      expect(formatEnvironmentProbeSummary(response({ code: "sandbox_connected", params: { provider: "raw" } }, overrides), i18n.getFixedT("ru")))
        .toBe("provider raw fallback");
    }
    expect(formatEnvironmentProbeSummary(response({ code: "local_available" }, { driver: "local", ok: false }), i18n.getFixedT("ru")))
      .toBe("provider raw fallback");
  });
});
