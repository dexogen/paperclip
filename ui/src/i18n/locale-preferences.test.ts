// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { i18n, setLocale, LOCALE_STORAGE_KEY } from ".";
import { resolveInitialLocale, selectableLocale } from "./locale-preferences";

afterEach(async () => {
  vi.restoreAllMocks();
  await setLocale("en");
  window.localStorage.clear();
});

it("defaults the fork to Russian independently of browser language", () => {
  expect(resolveInitialLocale()).toBe("ru");
  expect(resolveInitialLocale({ getStoredLocale: () => null })).toBe("ru");
});

it("honors the saved preference before a deployment default", () => {
  expect(resolveInitialLocale({ defaultLocale: "ru", getStoredLocale: () => "en" })).toBe("en");
  expect(resolveInitialLocale({ defaultLocale: "en", getStoredLocale: () => "ru-RU" })).toBe("ru");
});

it("accepts an English deployment default and ignores unsupported locales", () => {
  expect(resolveInitialLocale({ defaultLocale: "en", getStoredLocale: () => "fr" })).toBe("en");
  expect(resolveInitialLocale({ defaultLocale: "invalid" })).toBe("ru");
  expect(selectableLocale("ru_RU")).toBe("ru");
  expect(selectableLocale("fr")).toBeUndefined();
});

it("uses the configured default when reading storage fails", () => {
  expect(resolveInitialLocale({ getStoredLocale: () => { throw new Error("blocked"); } })).toBe("ru");
});

it("persists a choice and updates document language without reload", async () => {
  await setLocale("ru");
  expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ru");
  expect(document.documentElement.lang).toBe("ru");
  expect(document.documentElement.dir).toBe("ltr");
  expect(resolveInitialLocale({ getStoredLocale: () => window.localStorage.getItem(LOCALE_STORAGE_KEY) })).toBe("ru");
});

it("does not expose an incomplete language through setLocale", async () => {
  await setLocale("en");
  await setLocale("fr");
  expect(i18n.language).toBe("en");
});

it("changes language even when saving the preference fails", async () => {
  await setLocale("en");
  vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  await setLocale("ru");
  expect(i18n.language).toBe("ru");
  expect(document.documentElement.lang).toBe("ru");
});
