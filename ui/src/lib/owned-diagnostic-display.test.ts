import { describe, expect, it } from "vitest";
import type { AdapterEnvironmentCheck } from "@paperclipai/shared";
import { ApiError } from "@/api/client";
import { i18n } from "@/i18n";
import { codexChatGptRetirementHint, codexChatGptRetirementForModel } from "../../../packages/adapters/codex-local/src/index";
import { formatCodexProbeField, formatOwnedApiError, formatOwnedDiagnostic } from "./owned-diagnostic-display";

const en = i18n.getFixedT("en");
const ru = i18n.getFixedT("ru");
const suspended = "The Paperclip GitHub installation is suspended. Unsuspend it on GitHub before refreshing access.";
const descriptor = { source: "paperclip-github", version: 1, code: "installation_suspended" };

describe("owned server diagnostics", () => {
  it("translates retained API failures using the current locale without rewriting their source", () => {
    const error = new ApiError(suspended, 422, { details: { displayMessage: descriptor } });
    expect(formatOwnedApiError(error, en)).toBe(suspended);
    expect(formatOwnedApiError(error, ru)).toContain("приостановлена");
    expect(formatOwnedApiError(error, en)).toBe(suspended);
    expect(error.message).toBe(suspended);
    expect(formatOwnedApiError(new Error(suspended), ru)).toBe(suspended);
    expect(formatOwnedApiError(new ApiError(suspended, 422, { details: { code: "github_installation_required" } }), ru)).toBe(suspended);
  });
  it("preserves provider content, unknown versions, inherited and mismatched descriptors", () => {
    for (const marker of [undefined, {}, Object.create(descriptor), { ...descriptor, version: 2 }, { ...descriptor, source: "provider" }, { ...descriptor, code: "toString" }]) {
      expect(formatOwnedDiagnostic(suspended, marker, ru)).toBe(suspended);
    }
    const raw = "Provider <b>new reason</b>";
    expect(formatOwnedDiagnostic(raw, descriptor, ru)).toBe(raw);
  });
  it("keeps consent errors separate from revocation and retains old servers' literal errors", () => {
    const raw = "Select your own active company-installed GitHub authorization";
    const error = new ApiError(raw, 403, { details: { displayMessage: { source: "paperclip-project-git", version: 1, code: "own_authorization_required" } } });
    expect(formatOwnedApiError(error, ru)).not.toBe(raw);
    expect(formatOwnedApiError(error, en)).toBe(raw);
    expect(formatOwnedApiError(new ApiError(raw, 403, {}), ru)).toBe(raw);
  });
});

describe("Codex retirement display", () => {
  const check: AdapterEnvironmentCheck = {
    code: "codex_hello_probe_model_rejected", level: "error",
    message: "The Codex backend rejected gpt-5.5 for this ChatGPT account.",
    hint: codexChatGptRetirementHint("gpt-5.5"), detail: 'Provider said <b>do not translate</b>',
    codexRetirement: { source: "paperclip-codex", version: 1, model: "gpt-5.5", retiredOn: "2026-10-14", replacement: "gpt-6.1-sol (gpt-6-luna on Free and Go plans)" },
  };
  it("localizes the owned hint with plan names and preserves provider/native failures", () => {
    expect(formatCodexProbeField(check, "hint", ru)).toContain("на тарифах Free и Go");
    expect(formatCodexProbeField(check, "hint", en)).toBe(check.hint);
    expect(formatCodexProbeField(check, "message", ru)).toContain("Сервер Codex отклонил модель gpt-5.5");
    const native = { ...check, code: "codex_hello_probe_failed", message: check.detail! };
    expect(formatCodexProbeField(native, "message", ru)).toBe(native.message);
    expect(formatCodexProbeField(native, "hint", ru)).toContain("API-ключ");
    expect(check.detail).toBe('Provider said <b>do not translate</b>');
  });
  it("detects source drift in every reviewed retirement hint", () => {
    for (const model of ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"]) {
      const current = { ...check, hint: codexChatGptRetirementHint(model), codexRetirement: {
        source: "paperclip-codex" as const, version: 1 as const, model, ...codexChatGptRetirementForModel(model)!,
      } };
      expect(formatCodexProbeField(current, "hint", ru)).not.toBe(current.hint);
      expect(formatCodexProbeField(current, "hint", en)).toBe(current.hint);
    }
  });
  it("does not translate untagged, changed, or future diagnostics by matching English text", () => {
    for (const altered of [
      { ...check, codexRetirement: undefined },
      { ...check, code: "plugin_result" },
      { ...check, codexRetirement: { ...check.codexRetirement!, model: "future-model" } },
      { ...check, codexRetirement: { ...check.codexRetirement!, retiredOn: "2026-12-01" } },
      { ...check, codexRetirement: Object.create(check.codexRetirement!) },
    ]) expect(formatCodexProbeField(altered, "hint", ru)).toBe(check.hint);
    expect(formatCodexProbeField({ ...check, hint: "Updated provider hint" }, "hint", ru)).toBe("Updated provider hint");
  });
});
