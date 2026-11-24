import { afterEach, expect, it } from "vitest";
import { APP_DEFINITIONS, aiConnectionRouterAppDefinition, getConnectableAppDefinition } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { appDefinitionDescription, appAvailabilityReason, vercelConnectAvailabilityReason } from "./app-definition-display";

afterEach(async () => { await i18n.changeLanguage("en"); });

it("keeps bundled descriptions in English and translates each bundled manifest in Russian", async () => {
  await i18n.changeLanguage("en");
  for (const app of APP_DEFINITIONS) {
    expect(appDefinitionDescription(app), app.slug).toBe(app.description);
  }
  await i18n.changeLanguage("ru");
  for (const app of APP_DEFINITIONS) {
    const text = appDefinitionDescription(app);
    expect(text, app.slug).toMatch(/[А-Яа-я]/);
    if (app.description === `Connect ${app.name}'s provider-hosted MCP server.`) {
      expect(text, app.slug).toBe(`Подключите MCP-сервер, который предоставляет ${app.name}.`);
    }
  }
});

it("preserves unowned copy even when its slug and wording match a bundled manifest", async () => {
  await i18n.changeLanguage("ru");
  const vercel = getConnectableAppDefinition("vercel")!;
  expect(appDefinitionDescription({ ...vercel })).toBe(vercel.description);
  const owned = { ...vercel, displaySource: { registry: "paperclip-app-definitions", version: 1 } } as const;
  expect(appDefinitionDescription(owned)).toContain("переменные окружения");
  const description = "SRE previews: Vercel {{team}}.";
  expect(appDefinitionDescription({ ...owned, description })).toBe(description);
});

it("translates Paperclip availability notices and passes through unknown provider reasons", async () => {
  await i18n.changeLanguage("ru");
  const reason = "Ask your instance operator to enable AI connection routing.";
  const app = aiConnectionRouterAppDefinition("example.pool", { name: "Ops", description: "Team pool" }, { available: false, reason });
  expect(appAvailabilityReason(app)).toContain("включить маршрутизацию");
  expect(appAvailabilityReason({ ...app, aiConnectionRouter: undefined })).toBe(reason);
  expect(vercelConnectAvailabilityReason("Vercel Connect setup is disabled on this Paperclip instance.")).toContain("отключена настройка Vercel Connect");
  expect(vercelConnectAvailabilityReason("Cloud rotation in progress.")).toBe("Cloud rotation in progress.");
});
