import { DEFAULT_UI_LOCALE, selectableLocales, type SelectableLocale } from "./locales";

export const LOCALE_STORAGE_KEY = "paperclip.locale";

export function selectableLocale(language: unknown): SelectableLocale | undefined {
  if (typeof language !== "string") return undefined;
  const normalized = language.trim().toLowerCase().replaceAll("_", "-");
  return selectableLocales.find((locale) => locale === normalized || normalized.startsWith(`${locale}-`));
}

export function resolveInitialLocale({
  defaultLocale,
  getStoredLocale,
}: {
  defaultLocale?: string;
  getStoredLocale?: () => string | null;
} = {}): SelectableLocale {
  try {
    const stored = selectableLocale(getStoredLocale?.());
    if (stored) return stored;
  } catch {
  }
  return selectableLocale(defaultLocale) ?? DEFAULT_UI_LOCALE;
}
