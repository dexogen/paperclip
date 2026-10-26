import { describe, expect, it } from "vitest";
import { getConnectableAppDefinition, type AppDefinition, type ConnectionMethodDef } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { githubConnectionFieldHelp, githubConnectionFieldLabel, githubConnectionMethodLabel } from "./github-connection-display";

const github = getConnectableAppDefinition("github")!;
const en = i18n.getFixedT("en");
const ru = i18n.getFixedT("ru");
function published(): AppDefinition {
  return JSON.parse(JSON.stringify({ ...github, displaySource: { registry: "paperclip-app-definitions", version: 1 } }));
}

describe("GitHub registry display provenance", () => {
  it("detects upstream changes to the five reviewed canonical captions", () => {
    expect(github.methods.find(method => method.key === "managed")?.label).toBe(en("githubSetupUi.registry.managed"));
    expect(github.methods.find(method => method.key === "mcp-key")?.label).toBe(en("githubSetupUi.registry.token"));
    expect(github.methods.find(method => method.key === "copilot-token")?.label).toBe(en("githubSetupUi.registry.copilot"));
    const field = github.methods.find(method => method.key === "mcp-key")?.credentialFields?.find(candidate => candidate.key === "authorization");
    expect(field?.label).toBe("GitHub token");
    expect(field?.helperMd).toBe(en("githubSetupUi.registry.keyHelp"));
  });

  it("keeps changed trusted registry copy visible until its translation is reviewed", () => {
    const app = published();
    for (const method of app.methods) {
      method.label = `Updated <provider> ${method.key}`;
      expect(githubConnectionMethodLabel(app, method, ru)).toBe(method.label);
      expect(githubConnectionMethodLabel(app, method, en)).toBe(method.label);
    }
    const method = app.methods.find(candidate => candidate.key === "mcp-key")!;
    const field = method.credentialFields![0]!;
    field.label = "Updated <provider> credential label";
    expect(githubConnectionFieldLabel(app, method, "authorization", ru)).toBe(field.label);
    expect(githubConnectionFieldHelp(app, method, "authorization", ru)).toContain("Paperclip не может расширить права существующего ключа");
    field.helperMd = "Updated <provider> capability warning";
    expect(githubConnectionFieldHelp(app, method, "authorization", ru)).toBe(field.helperMd);
    expect(githubConnectionFieldHelp(app, method, "authorization", en)).toBe(field.helperMd);
    field.label = "GitHub token";
    expect(githubConnectionFieldLabel(app, method, "authorization", ru)).toBe("Ваш ключ GitHub");
    field.helperMd = undefined;
    expect(githubConnectionFieldHelp(app, method, "authorization", ru)).toBeUndefined();
  });
  it("translates serialized built-in captions while retaining English source and all protocol fields", () => {
    const app = published();
    const before = JSON.stringify(app);
    expect(app.methods.map(method => githubConnectionMethodLabel(app, method, en))).toEqual(app.methods.map(method => method.label));
    expect(app.methods.map(method => githubConnectionMethodLabel(app, method, ru))).toEqual([
      "Подключить GitHub", "Персональный токен доступа (дополнительно)", "Персональный токен доступа GitHub Copilot",
    ]);
    const method = app.methods.find(candidate => candidate.key === "mcp-key")!;
    expect(method.credentialFields?.map(field => field.key)).toEqual(["authorization"]);
    expect(githubConnectionFieldLabel(app, method, "authorization", en)).toBe("Your GitHub key");
    expect(githubConnectionFieldLabel(app, method, "authorization", ru)).toBe("Ваш ключ GitHub");
    expect(githubConnectionFieldHelp(app, method, "authorization", en)).toBe(method.credentialFields![0]!.helperMd);
    expect(githubConnectionFieldHelp(app, method, "authorization", ru)).toContain("Paperclip не может расширить права существующего ключа");
    expect(JSON.stringify(app)).toBe(before);
  });

  it("keeps custom definitions raw despite identical IDs and English copy", () => {
    const clone: AppDefinition = JSON.parse(JSON.stringify(github));
    for (const method of clone.methods) expect(githubConnectionMethodLabel(clone, method, ru)).toBe(method.label);
    const method = clone.methods.find(candidate => candidate.key === "mcp-key")!;
    expect(githubConnectionFieldLabel(clone, method, "authorization", ru)).toBeNull();
    expect(githubConnectionFieldHelp(clone, method, "authorization", ru)).toBe(method.credentialFields![0]!.helperMd);
    const canonical = github.methods.find(candidate => candidate.key === "managed")!;
    expect(githubConnectionMethodLabel(github, canonical, ru)).toBe("Подключить GitHub");
    expect(githubConnectionMethodLabel(github, { ...canonical }, ru)).toBe(canonical.label);
  });

  it("falls back for plugin entries, unknown registry versions, methods, and fields", () => {
    for (const change of [
      { displaySource: { registry: "paperclip-app-definitions", version: 2 } },
      { displaySource: { registry: "plugin-catalog", version: 1 } },
      { aiConnectionRouter: { pluginKey: "custom-router" } },
    ]) {
      const app = { ...published(), ...change } as AppDefinition;
      const method = app.methods[0]!;
      expect(githubConnectionMethodLabel(app, method, ru)).toBe(method.label);
    }
    const app = published();
    const method = { ...app.methods[0]!, key: "future-method", label: "<provider> unchanged" } satisfies ConnectionMethodDef;
    app.methods.push(method);
    expect(githubConnectionMethodLabel(app, method, ru)).toBe("<provider> unchanged");
    const token = app.methods.find(candidate => candidate.key === "mcp-key")!;
    token.credentialFields!.push({ key: "future-field", label: "Raw field", type: "text", helperMd: "Raw <provider> help" });
    expect(githubConnectionFieldLabel(app, token, "future-field", ru)).toBeNull();
    expect(githubConnectionFieldHelp(app, token, "future-field", ru)).toBe("Raw <provider> help");
    token.credentialFields = [];
    expect(githubConnectionFieldLabel(app, token, "authorization", ru)).toBeNull();
    expect(githubConnectionFieldHelp(app, token, "authorization", ru)).toBeUndefined();
  });
});
