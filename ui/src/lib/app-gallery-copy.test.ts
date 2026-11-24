import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import { appCopyFor, credentialFieldLabel } from "./app-gallery-copy";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("app gallery display copy", () => {
  it("updates retained curated and generic objects when the locale changes", async () => {
    await i18n.changeLanguage("en");
    const curated = appCopyFor("railway");
    const generic = appCopyFor("private-example");
    const english = { ...curated };
    expect(english.tagline).toBe("Inspect services, read logs, and manage deployments.");
    expect(generic.short).toBe("Give your agents access to this app.");

    await i18n.changeLanguage("ru");
    expect(curated.tagline).toContain("логи");
    expect(curated.short).toContain("Railway");
    expect(curated.short).not.toBe(english.short);
    expect(generic.tagline).toBe("Предоставьте агентам доступ к этому приложению.");

    await i18n.changeLanguage("en");
    expect({ ...curated }).toEqual(english);
    expect(generic.tagline).toBe("Give your agents access to this app.");
  });

  it("keeps provider names and readable Russian copy in the app picker", async () => {
    await i18n.changeLanguage("ru");
    expect(appCopyFor("airtable", "Подключите MCP-сервер, который предоставляет Airtable.").short)
      .toBe("Подключите сервис, который предоставляет Airtable.");
    expect(appCopyFor("executor", "Используйте ваше MCP-подключение Executor.").short)
      .toBe("Используйте ваше подключение Executor.");
  });

  it("localizes the owned credential label while preserving its app name", async () => {
    const name = "Private App {{region}}";
    await i18n.changeLanguage("ru");
    expect(credentialFieldLabel(name, "API token", 1)).toBe(`Ваш ключ для ${name}`);
    expect(credentialFieldLabel(name, "", 2)).toBe(`Ваш ключ для ${name}`);
    await i18n.changeLanguage("en");
    expect(credentialFieldLabel(name, "API token", 1)).toBe(`Your ${name} key`);
  });

  it("keeps unknown provider descriptions and explicit credential labels as data", async () => {
    await i18n.changeLanguage("ru");
    const description = "Read private ACME records.";
    expect(appCopyFor("private-example", description)).toEqual({ tagline: description, short: description });
    expect(credentialFieldLabel("ACME", "Workspace ID", 2)).toBe("Workspace ID");
    expect(credentialFieldLabel("ACME", "Paste your ACME token", 1)).toBe("Paste your ACME token");
  });
});
