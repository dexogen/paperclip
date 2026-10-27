import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, selectableLocales } from "./locales";
import { LOCALE_STORAGE_KEY, resolveInitialLocale, selectableLocale } from "./locale-preferences";

export { LOCALE_STORAGE_KEY } from "./locale-preferences";

function initialLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return resolveInitialLocale({
    defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE,
    getStoredLocale: () => window.localStorage.getItem(LOCALE_STORAGE_KEY),
  });
}

function syncDocumentLocale(locale: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = i18n.dir(locale);
}

i18n.on("languageChanged", syncDocumentLocale);

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...selectableLocales],
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  returnEmptyString: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export async function setLocale(locale: string): Promise<void> {
  const selected = selectableLocale(locale);
  if (!selected) return;
  await i18n.changeLanguage(selected);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, selected);
  } catch {
  }
}

export { Trans } from "./trans";
export const useTranslation = useReactI18nextTranslation;
export { i18n };
