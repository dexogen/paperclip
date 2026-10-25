import { describe, expect, it } from "vitest";
import { t } from ".";
import { createInstance } from "i18next";
import en from "./locales/en.json";
import { localeMessages } from "./locales";
import { validateLocaleMessages } from "./locale-validation";

describe("locale validation", () => {
  it("resolves English messages with key and default fallbacks", () => {
    expect(t("app.noCompanies.title")).toBe(en.app.noCompanies.title);
    expect(t("app.missing", { defaultValue: "Fallback" })).toBe("Fallback");
    expect(t("app.missing")).toBe("app.missing");
  });

  it("accepts registered locale files", () => {
    expect(Object.keys(localeMessages)).toContain("en");
    for (const [locale, messages] of Object.entries(localeMessages)) {
      expect(validateLocaleMessages(messages, en, { allowMissing: locale !== "en" && locale !== "ru", locale }), locale).toEqual([]);
    }
  });

  it("allows incomplete translations without weakening validation of provided messages", () => {
    const reference = { existing: "Hello {{name}}", newMessage: "New message" };
    expect(validateLocaleMessages({ existing: "Hello {{name}}" }, reference, { allowMissing: true })).toEqual([]);
    expect(validateLocaleMessages({ existing: "Hello" }, reference, { allowMissing: true })).toEqual([
      'existing interpolation placeholders must match English exactly: expected ["name"], received []',
    ]);
    expect(validateLocaleMessages({ unknown: "Unknown" }, reference, { allowMissing: true })).toContain("unknown is not defined in English");
    expect(validateLocaleMessages({ existing: 42 }, reference, { allowMissing: true })).toContain("existing must be a string");
  });

  it("rejects missing and extra nested keys", () => {
    expect(
      validateLocaleMessages({
        app: {
          noCompanies: {
            title: en.app.noCompanies.title,
            description: en.app.noCompanies.description,
            unexpected: "Unexpected",
          },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "app.noCompanies.newCompany is missing",
        "app.noCompanies.unexpected is not defined in English",
      ]),
    );
  });

  it("rejects non-string leaves", () => {
    expect(
      validateLocaleMessages({
        app: {
          noCompanies: {
            ...en.app.noCompanies,
            title: ["Create your first company"],
          },
        },
      }),
    ).toEqual(expect.arrayContaining(["app.noCompanies.title must be a string"]));
  });

  it("requires interpolation placeholders to match English", () => {
    const reference = {
      message: "Invite {{name}} to {{company}}",
    };

    expect(validateLocaleMessages({ message: "Invite {{name}}" }, reference)).toEqual([
      'message interpolation placeholders must match English exactly: expected ["company","name"], received ["name"]',
    ]);
  });

  it("rejects executable, raw HTML, and unexpected link payloads not present in English", () => {
    const reference = {
      script: "Create company",
      handler: "Create company",
      js: "Create company",
      data: "Create company",
      url: "Create company",
      html: "Create company",
    };

    expect(
      validateLocaleMessages(
        {
          script: "<script>alert(1)</script>",
          handler: '<span ONCLICK="alert(1)">Create</span>',
          js: "javascript:alert(1)",
          data: "data:text/html,hello",
          url: "https://example.test",
          html: "<strong>Create company</strong>",
        },
        reference,
      ),
    ).toEqual(
      expect.arrayContaining([
        "script contains disallowed <script",
        "handler contains disallowed event-handler attribute",
        "js contains disallowed javascript:",
        "data contains disallowed data:",
        "url contains disallowed unexpected URL",
        "html contains disallowed raw HTML tag",
      ]),
    );
  });

  it("caps localized string length relative to English", () => {
    expect(validateLocaleMessages({ message: "x".repeat(200) }, { message: "Short" })).toEqual([
      "message is too long: 200 characters exceeds 133",
    ]);
  });
});

const englishCount = { tasks_one: "{{count}} task", tasks_other: "{{count}} tasks" };
const russianCount = {
  tasks_one: "{{count}} задача", tasks_few: "{{count}} задачи",
  tasks_many: "{{count}} задач", tasks_other: "{{count}} задачи",
};

it("validates Russian plural families rather than exact English suffixes", () => {
  expect(validateLocaleMessages(russianCount, englishCount, { locale: "ru" })).toEqual([]);
  const { tasks_few: omitted, ...incomplete } = russianCount;
  expect(validateLocaleMessages(incomplete, englishCount, { locale: "ru" })).toContain("tasks_few is missing");
  expect(validateLocaleMessages(incomplete, englishCount, { locale: "ru", allowMissing: true })).toContain("tasks_few is missing");
  expect(validateLocaleMessages({}, englishCount, { locale: "ru", allowMissing: true })).toEqual([]);
});

it("checks parameters and unsafe payloads in additional Russian plural forms", () => {
  expect(validateLocaleMessages({ ...russianCount, tasks_few: "задачи" }, englishCount, { locale: "ru" }))
    .toContain('tasks_few interpolation placeholders must match English exactly: expected ["count"], received []');
  expect(validateLocaleMessages({ ...russianCount, tasks_many: "<script>{{count}}</script>" }, englishCount, { locale: "ru" }))
    .toContain("tasks_many contains disallowed <script");
});

it("rejects empty translations even in a partial catalog", () => {
  expect(validateLocaleMessages({ title: " " }, { title: "Title" }, { allowMissing: true }))
    .toContain("title must not be empty");
});

it("renders all Russian count categories and falls back to English for missing messages", async () => {
  const instance = createInstance();
  await instance.init({ lng: "ru", fallbackLng: "en", resources: {
    en: { translation: { ...englishCount, fallback: "English fallback" } },
    ru: { translation: russianCount },
  } });
  for (const [count, expected] of [[0, "0 задач"], [1, "1 задача"], [2, "2 задачи"], [5, "5 задач"],
    [11, "11 задач"], [21, "21 задача"], [22, "22 задачи"], [25, "25 задач"], [1.5, "1.5 задачи"]] as const) {
    expect(instance.t("tasks", { count })).toBe(expected);
  }
  expect(instance.t("fallback")).toBe("English fallback");
});

it("preserves named React markup placeholders", () => {
  const reference = { message: "Hello <strong>{{name}}</strong>" };
  expect(validateLocaleMessages({ message: "Здравствуйте, <strong>{{name}}</strong>" }, reference)).toEqual([]);
  expect(validateLocaleMessages({ message: "Здравствуйте, <iframe>{{name}}</iframe>" }, reference))
    .toContain("message markup placeholders must match English exactly");
});


it("prevents translated markup from overriding React component props or dropping closing tags", () => {
  const reference = { message: "Read <link>the guide</link>" };
  for (const message of [
    'Читайте <link href="//other.example">руководство</link>',
    'Читайте <link title="changed">руководство</link>',
    "Читайте <link>руководство<link>",
  ]) {
    expect(validateLocaleMessages({ message }, reference))
      .toContain("message markup placeholders must match English exactly");
  }
});


it("preserves native i18next formatter and escaping contracts", () => {
  const reference = { message: "{{amount, number(minimumFractionDigits: 2)}}", raw: "{{- name}}" };
  expect(validateLocaleMessages({ message: "{{ amount , number(minimumFractionDigits: 2) }}", raw: "{{-name}}" }, reference)).toEqual([]);
  for (const message of ["{{other, number(minimumFractionDigits: 2)}}", "{{amount, currency}}", "{{-amount, number(minimumFractionDigits: 2)}}"]) {
    expect(validateLocaleMessages({ ...reference, message }, reference).some(error => error.includes("interpolation placeholders must match"))).toBe(true);
  }
  expect(validateLocaleMessages({ message: "Continue {{}}" }, { message: "Continue" })[0])
    .toContain("interpolation placeholders must match English exactly");
  expect(validateLocaleMessages({ message: "{{-name}}" }, { message: "{{name}}" })[0])
    .toContain("interpolation placeholders must match English exactly");
});
