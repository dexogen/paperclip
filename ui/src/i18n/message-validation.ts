const MAX_STRING_LENGTH = 2_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatPath(path: string[]) {
  return path.length > 0 ? path.join(".") : "<root>";
}

function interpolationPlaceholders(value: string) {
  return Array.from(value.matchAll(/{{([\s\S]*?)}}/g), (match) => match[1]
    .trim().replace(/^-\s*/, "-").replace(/\s*,\s*/g, ",")).sort();
}

function hasRawHtml(value: string) {
  return /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^>]*)?>/.test(value);
}

function hasEventHandlerAttribute(value: string) {
  return /\son[A-Za-z]+\s*=/i.test(value);
}

function urlsIn(value: string) {
  return Array.from(value.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi), (match) => match[0]).sort();
}

function hasBlockedData(value: string, englishValue: string) {
  const checks: Array<[boolean, boolean, string]> = [
    [/<script\b/i.test(value), /<script\b/i.test(englishValue), "<script"],
    [hasEventHandlerAttribute(value), hasEventHandlerAttribute(englishValue), "event-handler attribute"],
    [/\bjavascript\s*:/i.test(value), /\bjavascript\s*:/i.test(englishValue), "javascript:"],
    [/\bdata\s*:/i.test(value), /\bdata\s*:/i.test(englishValue), "data:"],
    [hasRawHtml(value), hasRawHtml(englishValue), "raw HTML tag"],
  ];

  const blocked = checks
    .filter(([candidateHas, englishHas]) => candidateHas && !englishHas)
    .map(([, , blockedPayload]) => blockedPayload);

  const englishUrls = new Set(urlsIn(englishValue));
  const unexpectedUrl = urlsIn(value).find((url) => !englishUrls.has(url));
  if (unexpectedUrl) blocked.push("unexpected URL");

  return blocked;
}

function validateString(path: string[], candidateValue: string, englishValue: string, errors: string[]) {
  if (!candidateValue.trim()) {
    errors.push(`${formatPath(path)} must not be empty`);
  }
  const candidatePlaceholders = interpolationPlaceholders(candidateValue);
  const englishPlaceholders = interpolationPlaceholders(englishValue);
  if (JSON.stringify(candidatePlaceholders) !== JSON.stringify(englishPlaceholders)) {
    errors.push(
      `${formatPath(path)} interpolation placeholders must match English exactly: expected ${JSON.stringify(
        englishPlaceholders,
      )}, received ${JSON.stringify(candidatePlaceholders)}`,
    );
  }

  const markup = (value: string) => Array.from(
    value.matchAll(/<(\/?)([A-Za-z][A-Za-z0-9:-]*)\b([^>]*)>/g),
    (match) => `${match[1]}${match[2]}\u0000${match[3].trim()}`,
  ).sort();
  if (JSON.stringify(markup(candidateValue)) !== JSON.stringify(markup(englishValue))) {
    errors.push(`${formatPath(path)} markup placeholders must match English exactly`);
  }

  for (const blockedPayload of hasBlockedData(candidateValue, englishValue)) {
    errors.push(`${formatPath(path)} contains disallowed ${blockedPayload}`);
  }

  const relativeLimit = Math.max(englishValue.length * 4 + 64, englishValue.length + 128);
  const lengthLimit = Math.min(MAX_STRING_LENGTH, relativeLimit);
  if (candidateValue.length > lengthLimit) {
    errors.push(`${formatPath(path)} is too long: ${candidateValue.length} characters exceeds ${lengthLimit}`);
  }
}

export interface LocaleValidationOptions {
  allowMissing?: boolean;
  locale?: string;
}

const PLURAL_SUFFIX = /^(.*)_(zero|one|two|few|many|other)$/;

function pluralFamilies(reference: Record<string, unknown>) {
  const families = new Set<string>();
  for (const [key, value] of Object.entries(reference)) {
    const match = key.match(PLURAL_SUFFIX);
    if (match && typeof value === "string" && typeof reference[`${match[1]}_other`] === "string") {
      if (match[2] !== "other" || interpolationPlaceholders(value).some((parameter) => parameter.replace(/^-/, "").split(",")[0] === "count")) {
        families.add(match[1]);
      }
    }
  }
  return families;
}

function validateNode(
  path: string[], candidate: unknown, englishReference: unknown,
  errors: string[], options: LocaleValidationOptions,
) {
  if (typeof englishReference === "string") {
    if (typeof candidate !== "string") {
      errors.push(`${formatPath(path)} must be a string`);
      return;
    }
    validateString(path, candidate, englishReference, errors);
    return;
  }
  if (!isPlainObject(englishReference)) {
    errors.push(`${formatPath(path)} has unsupported English reference type`);
    return;
  }
  if (!isPlainObject(candidate)) {
    errors.push(`${formatPath(path)} must be an object`);
    return;
  }

  const families = pluralFamilies(englishReference);
  const categories = new Intl.PluralRules(options.locale ?? "en").resolvedOptions().pluralCategories;
  const expected = new Map<string, unknown>();
  for (const [key, value] of Object.entries(englishReference)) {
    const match = key.match(PLURAL_SUFFIX);
    if (!match || !families.has(match[1])) expected.set(key, value);
  }
  for (const family of families) {
    for (const category of categories) {
      const key = `${family}_${category}`;
      expected.set(key, englishReference[key] ?? englishReference[`${family}_other`]);
    }
    if (Object.hasOwn(englishReference, `${family}_zero`) || Object.hasOwn(candidate, `${family}_zero`)) {
      expected.set(`${family}_zero`, englishReference[`${family}_zero`] ?? englishReference[`${family}_other`]);
    }
  }

  for (const key of Object.keys(candidate).sort()) {
    if (!expected.has(key)) errors.push(`${formatPath([...path, key])} is not defined in English`);
  }
  for (const [key, reference] of expected) {
    if (!Object.hasOwn(candidate, key)) {
      const match = key.match(PLURAL_SUFFIX);
      const partialFamily = match && families.has(match[1])
        && Object.keys(candidate).some((candidateKey) => candidateKey.match(PLURAL_SUFFIX)?.[1] === match[1]);
      if (!options.allowMissing || partialFamily) errors.push(`${formatPath([...path, key])} is missing`);
      continue;
    }
    validateNode([...path, key], candidate[key], reference, errors, options);
  }
}

export function validateLocaleMessages(
  candidate: unknown, englishReference: unknown, options: LocaleValidationOptions = {},
) {
  const errors: string[] = [];
  try {
    validateNode([], candidate, englishReference, errors, options);
  } catch (error) {
    if (error instanceof RangeError) errors.push(`Invalid locale: ${options.locale}`);
    else throw error;
  }
  return errors;
}
