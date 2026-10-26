import { hash } from "./source-audit.mjs";
import { validateLocaleMessages } from "../../ui/src/i18n/message-validation.ts";

export function flatten(value, prefix = "", output = {}) {
  if (typeof value === "string") {
    if (Object.hasOwn(output, prefix)) throw new Error(`Duplicate flattened message: ${prefix}`);
    output[prefix] = value;
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value).sort()) flatten(value[key], prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

const pluralSuffix = /^(.*)_(zero|one|two|few|many|other)$/;
export function messageFamilies(source) {
  const flat = flatten(source), result = new Map(), plural = new Set();
  for (const [key, text] of Object.entries(flat)) {
    const match = key.match(pluralSuffix);
    if (match && Object.hasOwn(flat, `${match[1]}_other`) && (match[2] !== "other" || /{{\s*-?\s*count(?:\s*,[^{}]*)?\s*}}/.test(text))) plural.add(match[1]);
  }
  for (const [key, text] of Object.entries(flat)) {
    const match = key.match(pluralSuffix);
    const id = match && plural.has(match[1]) ? match[1] : key;
    if (!result.has(id)) result.set(id, { id, plural: plural.has(id), messages: {} });
    result.get(id).messages[key] = text;
  }
  return result;
}

export function analyzeCatalog({ source, target, locale, references = [], dynamicManifests = [], reviewed = {} }) {
  const sourceFlat = flatten(source), targetFlat = flatten(target), families = messageFamilies(source);
  const knownKeys = new Set([...Object.keys(sourceFlat), ...families.keys()]);
  const allReferences = [...references, ...dynamicManifests.flatMap((manifest) => manifest.keys.map((key) => ({ key, file: manifest.file, owner: manifest.owner ?? "<dynamic manifest>" })))];
  // Index once: source families can number in the tens of thousands. Keep
  // insertion order so review hashes remain identical to the filtered arrays.
  const familyForKey = new Map();
  for (const family of families.values()) {
    for (const key of Object.keys(family.messages)) familyForKey.set(key, family);
  }
  const referencesByFamily = new Map();
  for (const reference of allReferences) {
    const family = families.get(reference.key) ?? familyForKey.get(reference.key);
    if (!family) continue;
    if (!referencesByFamily.has(family.id)) referencesByFamily.set(family.id, []);
    referencesByFamily.get(family.id).push(reference);
  }
  const translationsByFamily = new Map();
  for (const [key, value] of Object.entries(targetFlat)) {
    const base = key.match(pluralSuffix)?.[1];
    const family = base && families.get(base)?.plural ? families.get(base) : families.get(key);
    if (!family || family.plural && base !== family.id) continue;
    if (!translationsByFamily.has(family.id)) translationsByFamily.set(family.id, []);
    translationsByFamily.get(family.id).push([key, value]);
  }
  const missingKeys = allReferences.filter(({ key }) => !knownKeys.has(key));
  const invalid = [
    ...validateLocaleMessages(source, source, { locale: "en" }).map((message) => ({ locale: "en", message })),
    ...validateLocaleMessages(target, source, { locale }).map((message) => ({ locale, message })),
  ];
  for (const reference of allReferences) {
    if (!reference.parameters || !knownKeys.has(reference.key)) continue;
    const { provided, hasCount, dynamic } = reference.parameters;
    const family = families.get(reference.key);
    const messageId = family?.id ?? familyForKey.get(reference.key)?.id ?? reference.key;
    const texts = family ? Object.values(family.messages) : [sourceFlat[reference.key]];
    const required = new Set(texts.flatMap((text) => Array.from(
      text.matchAll(/{{\s*-?\s*([A-Za-z0-9_.-]+)(?:\s*,[^{}]*)?\s*}}/g), (match) => match[1],
    )));
    const location = `${reference.file}:${reference.line ?? "manifest"} (${reference.key})`;
    if (dynamic.length) {
      invalid.push({ locale: "source", key: messageId, message: `${location} has dynamic translation options requiring manual inspection and explicit named properties: ${dynamic.join(", ")}` });
    } else {
      for (const parameter of required) {
        if (!provided.includes(parameter) && !provided.includes(parameter.split(".")[0])) {
          invalid.push({ locale: "source", key: messageId, message: `${location} is missing interpolation parameter: ${parameter}` });
        }
      }
      if (family?.plural && !hasCount) invalid.push({ locale: "source", key: messageId, message: `${location} is missing plural selector: count` });
    }
  }
  const messages = [...families.values()].map((family) => {
    const translations = Object.fromEntries(translationsByFamily.get(family.id) ?? []);
    const familyReferences = referencesByFamily.get(family.id) ?? [];
    const contexts = [...new Set(familyReferences
      .map(({ file, owner }) => `${file}#${owner}`))].sort();
    const parameterContracts = [...new Set(familyReferences
      .filter(({ parameters }) => parameters)
      .map(({ file, owner, key, parameters }) => JSON.stringify({ file, owner, key, parameters })))].sort();
    const sourceHash = hash({ messages: family.messages, plural: family.plural, contexts, parameterContracts });
    const translationHash = hash(translations);
    const record = reviewed[family.id];
    const status = Object.keys(translations).length === 0 ? "missing"
      : !record ? "draft"
        : record.sourceHash !== sourceHash ? "stale-source"
          : record.translationHash !== translationHash ? "stale-translation" : "reviewed";
    return { key: family.id, plural: family.plural, source: family.messages, translation: translations,
      sourceHash, translationHash, contexts, status };
  });
  return { invalid, missingKeys, messages, obsoleteReviews: Object.keys(reviewed).filter((key) => !families.has(key)) };
}

export function compareCatalogs(previous, current) {
  const oldFlat = flatten(previous), newFlat = flatten(current);
  return [...new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])].sort()
    .filter((key) => oldFlat[key] !== newFlat[key])
    .map((key) => ({ key, kind: !Object.hasOwn(oldFlat, key) ? "added" : !Object.hasOwn(newFlat, key) ? "removed" : "changed",
      previous: oldFlat[key] ?? null, current: newFlat[key] ?? null }));
}
