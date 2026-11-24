/** Compact token count for context-window labels: 950, 1.2k, 258k, 1M. */
export function formatContextTokens(value: number, locale = "en"): string {
  if (locale === "ru" || locale === "ru-RU") {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: value < 1_000 || (value >= 10_000 && value < 1_000_000) ? 0 : 1,
    }).format(value);
  }
  if (value >= 1_000_000) return `${trimDecimal(value / 1_000_000)}M`;
  if (value >= 1_000) return value >= 10_000 ? `${Math.round(value / 1_000)}k` : `${trimDecimal(value / 1_000)}k`;
  return String(Math.round(value));
}

function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
