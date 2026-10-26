import en from "./locales/en.json";
import { validateLocaleMessages as validateMessages, type LocaleValidationOptions } from "./message-validation";

export type { LocaleValidationOptions } from "./message-validation";

export function validateLocaleMessages(
  candidate: unknown, englishReference: unknown = en, options: LocaleValidationOptions = {},
) {
  return validateMessages(candidate, englishReference, options);
}

export function assertValidLocaleMessages(
  candidate: unknown, englishReference: unknown = en, options: LocaleValidationOptions = {},
) {
  const errors = validateLocaleMessages(candidate, englishReference, options);
  if (errors.length > 0) throw new Error(`Invalid locale messages:\n${errors.join("\n")}`);
}
