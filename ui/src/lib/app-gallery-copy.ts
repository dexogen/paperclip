import { t } from "../i18n";

/**
 * Prosumer copy for the Apps surface (PAP-10856).
 *
 * The P1a gallery manifest carries developer-flavoured taglines and credential
 * labels (e.g. "Connect Zapier-hosted MCP actions", "Zapier MCP token"). Those
 * strings would fail the vocabulary gate from PAP-10827 — no "MCP", "server",
 * "profile", "policy", "gateway", or "transport" anywhere on this surface. So
 * the UI never renders the raw manifest copy directly: it looks up plain copy
 * here, and `sanitizeProsumerCopy` is a final backstop for any free-text we do
 * surface (app names, fallback taglines).
 */

/** Words that must never appear in prosumer-facing copy on the Apps surface. */
const BANNED_WORDS = [
  "mcp",
  "server",
  "profile",
  "policy",
  "gateway",
  "transport",
  "stdio",
  "endpoint",
];

const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.join("|")})s?\\b`, "gi");

/**
 * Strip banned vocabulary from a free-text string as a last-resort backstop.
 * Prefer curated copy below; this only protects against manifest text we can't
 * fully control (e.g. a newly added gallery app with no curated entry yet).
 */
export function sanitizeProsumerCopy(text: string): string {
  return text
    .replace(BANNED_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

export interface AppCopy {
  /** Two short lines for the gallery card (M2). */
  tagline: string;
  /** Single line for the connect step header (M3b). */
  short: string;
}

/**
 * Curated prosumer copy keyed by gallery key. Taken from the M-series wires
 * (https://happy-grove-jzyc.here.now/). Apps without an entry fall back to a
 * generic, gate-safe line.
 */
const APP_COPY: Record<string, AppCopy> = {
  zapier: {
    get tagline() { return t("fullGallery.apps.zapier.tagline"); },
    get short() { return t("fullGallery.apps.zapier.short"); },
  },
  github: {
    get tagline() { return t("fullGallery.apps.github.tagline"); },
    get short() { return t("fullGallery.apps.github.short"); },
  },
  slack: {
    get tagline() { return t("fullGallery.apps.slack.tagline"); },
    get short() { return t("fullGallery.apps.slack.short"); },
  },
  notion: {
    get tagline() { return t("fullGallery.apps.notion.tagline"); },
    get short() { return t("fullGallery.apps.notion.short"); },
  },
  railway: {
    get tagline() { return t("fullGallery.apps.railway.tagline"); },
    get short() { return t("fullGallery.apps.railway.short"); },
  },
  posthog: {
    get tagline() { return t("fullGallery.apps.posthog.tagline"); },
    get short() { return t("fullGallery.apps.posthog.short"); },
  },
  ditto: {
    get tagline() { return t("fullGallery.apps.ditto.tagline"); },
    get short() { return t("fullGallery.apps.ditto.short"); },
  },
  gauge: {
    get tagline() { return t("fullGallery.apps.gauge.tagline"); },
    get short() { return t("fullGallery.apps.gauge.short"); },
  },
  neon: {
    get tagline() { return t("fullGallery.apps.neon.tagline"); },
    get short() { return t("fullGallery.apps.neon.short"); },
  },
  superagent: {
    get tagline() { return t("fullGallery.apps.superagent.tagline"); },
    get short() { return t("fullGallery.apps.superagent.short"); },
  },
  linear: {
    get tagline() { return t("fullGallery.apps.linear.tagline"); },
    get short() { return t("fullGallery.apps.linear.short"); },
  },
  "google-sheets": {
    get tagline() { return t("fullGallery.apps.google-sheets.tagline"); },
    get short() { return t("fullGallery.apps.google-sheets.short"); },
  },
  gmail: {
    get tagline() { return t("fullGallery.apps.gmail.tagline"); },
    get short() { return t("fullGallery.apps.gmail.short"); },
  },
  "google-drive": {
    get tagline() { return t("fullGallery.apps.google-drive.tagline"); },
    get short() { return t("fullGallery.apps.google-drive.short"); },
  },
  "google-docs": {
    get tagline() { return t("fullGallery.apps.google-docs.tagline"); },
    get short() { return t("fullGallery.apps.google-docs.short"); },
  },
  "google-slides": {
    get tagline() { return t("fullGallery.apps.google-slides.tagline"); },
    get short() { return t("fullGallery.apps.google-slides.short"); },
  },
  "google-calendar": {
    get tagline() { return t("fullGallery.apps.google-calendar.tagline"); },
    get short() { return t("fullGallery.apps.google-calendar.short"); },
  },
  "google-chat": {
    get tagline() { return t("fullGallery.apps.google-chat.tagline"); },
    get short() { return t("fullGallery.apps.google-chat.short"); },
  },
  "google-people": {
    get tagline() { return t("fullGallery.apps.google-people.tagline"); },
    get short() { return t("fullGallery.apps.google-people.short"); },
  },
  "google-workspace-search": {
    get tagline() { return t("fullGallery.apps.google-workspace-search.tagline"); },
    get short() { return t("fullGallery.apps.google-workspace-search.short"); },
  },
  hubspot: {
    get tagline() { return t("fullGallery.apps.hubspot.tagline"); },
    get short() { return t("fullGallery.apps.hubspot.short"); },
  },
  intercom: {
    get tagline() { return t("fullGallery.apps.intercom.tagline"); },
    get short() { return t("fullGallery.apps.intercom.short"); },
  },
  figma: {
    get tagline() { return t("fullGallery.apps.figma.tagline"); },
    get short() { return t("fullGallery.apps.figma.short"); },
  },
  stripe: {
    get tagline() { return t("fullGallery.apps.stripe.tagline"); },
    get short() { return t("fullGallery.apps.stripe.short"); },
  },
  context7: {
    get tagline() { return t("fullGallery.apps.context7.tagline"); },
    get short() { return t("fullGallery.apps.context7.short"); },
  },
};

const GENERIC: AppCopy = {
  get tagline() { return t("fullGallery.generic"); },
  get short() { return t("fullGallery.generic"); },
};

/** Curated, gate-safe copy for a gallery app. */
export function appCopyFor(key: string, fallbackTagline?: string | null): AppCopy {
  const curated = APP_COPY[key];
  if (curated) return curated;
  if (fallbackTagline) {
    const cleaned = sanitizeProsumerCopy(fallbackTagline);
    if (cleaned) return { tagline: cleaned, short: cleaned };
  }
  return GENERIC;
}

/**
 * Label for a single credential field on the key-paste step (M3b). The raw
 * manifest label can contain banned vocab ("Zapier MCP token"), so for the
 * common single-field case we present "Your {App} key" per the wires; multi-
 * field apps fall back to a sanitized version of the manifest label.
 */
export function credentialFieldLabel(
  appName: string,
  rawLabel: string,
  fieldCount: number,
): string {
  if (/^Paste your\b/.test(rawLabel)) return sanitizeProsumerCopy(rawLabel);
  if (fieldCount <= 1) return t("fullGallery.credentialKey", { appName });
  const cleaned = sanitizeProsumerCopy(rawLabel);
  return cleaned || t("fullGallery.credentialKey", { appName });
}
