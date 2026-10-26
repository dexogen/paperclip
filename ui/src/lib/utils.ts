import type { TFunction } from "i18next";
import { i18n, t } from "../i18n";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { deriveAgentUrlKey, deriveProjectUrlKey, normalizeProjectUrlKey, hasNonAsciiContent } from "@paperclipai/shared";
import type { BillingType, FinanceDirection, FinanceEventKind } from "@paperclipai/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Classes for a sidebar row label when the sidebar is collapsed to the icon rail
 * (PAP-10676). Unlike `sr-only` (which is `position: absolute` and therefore
 * removes the label from flow), this keeps the label in flow so it still
 * contributes its line-height to the row. That guarantees a row is the *exact*
 * same height collapsed as expanded, so the icons never shift vertically between
 * states. The label is clipped to zero visible width and rendered transparent,
 * but stays in the DOM and the a11y tree as the link's accessible name.
 */
export const SIDEBAR_RAIL_HIDDEN_LABEL =
  "block w-0 min-w-0 overflow-hidden whitespace-nowrap text-transparent select-none";

export function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function asFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function displayLocale(): string {
  return i18n.resolvedLanguage === "ru" ? "ru-RU" : "en-US";
}

export function formatCents(cents: number, currency = "USD"): string {
  // Older finance writes accepted arbitrary three-character codes. Keep those
  // amounts readable without passing an invalid currency to Intl.
  if (!/^[a-z]{3}$/i.test(currency)) {
    return `${currency} ${(cents / 100).toLocaleString(displayLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return (cents / 100).toLocaleString(displayLocale(), { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(displayLocale(), options);
}

/**
 * Format a project's budget for the projects list view (IA Phase 4 — PAP-60).
 * Monthly budgets render a `/mo` suffix; lifetime budgets show the bare amount.
 */
export function formatProjectBudget(budget: { amountCents: number; windowKind: string }): string {
  const amount = formatCents(budget.amountCents);
  return budget.windowKind === "calendar_month_utc" ? t("format.monthly", { amount }) : amount;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(displayLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(
  date: Date | string,
  options: { includeSeconds?: boolean; includeYear?: boolean } = {},
): string {
  return new Date(date).toLocaleString(displayLocale(), {
    month: "short",
    day: "numeric",
    ...(options.includeYear === false ? {} : { year: "numeric" as const }),
    hour: "numeric",
    minute: "2-digit",
    ...(options.includeSeconds ? { second: "2-digit" as const } : {}),
  });
}

export function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleString(displayLocale(), {
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return t("format.justNow");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return t("format.minutesAgo", { value: diffMin });
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return t("format.hoursAgo", { value: diffHr });
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return t("format.daysAgo", { value: diffDay });
  return formatDate(date);
}

export function formatTokens(n: number): string {
  if (i18n.resolvedLanguage === "ru") {
    return new Intl.NumberFormat("ru-RU", n >= 1_000 ? { notation: "compact", minimumFractionDigits: 1, maximumFractionDigits: 1 } : {}).format(n);
  }
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Humanize a millisecond duration into a compact `1h 2m`, `45m 12s`, `12s` string. */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return t("format.seconds", { value: 0 });
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return t("format.seconds", { value: totalSeconds });
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return [t("format.minutes", { value: minutes }), ...(seconds > 0 ? [t("format.seconds", { value: seconds })] : [])].join(" ");
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return [t("format.hours", { value: hours }), ...(remainingMinutes > 0 ? [t("format.minutes", { value: remainingMinutes })] : [])].join(" ");
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return [t("format.days", { value: days }), ...(remainingHours > 0 ? [t("format.hours", { value: remainingHours })] : [])].join(" ");
}

/** Map a raw provider slug to a display-friendly name. */
export function providerDisplayName(provider: string): string {
  const map: Record<string, string> = {
    anthropic: "Anthropic",
    aws_bedrock: "AWS Bedrock",
    openai: "OpenAI",
    openrouter: "OpenRouter",
    chatgpt: "ChatGPT",
    google: "Google",
    cursor: "Cursor",
    jetbrains: "JetBrains AI",
  };
  return map[provider.toLowerCase()] ?? provider;
}

export function billingTypeDisplayName(billingType: BillingType, t: TFunction = i18n.getFixedT("en")): string {
  const map: Record<BillingType, string> = {
    metered_api: t("costsUi.billingApi"),
    subscription_included: t("costsUi.billingSubscription"),
    subscription_overage: t("costsUi.billingOverage"),
    credits: t("costsUi.billingCredits"),
    fixed: t("costsUi.billingFixed"),
    unknown: t("costsUi.billingUnknown"),
  };
  return map[billingType];
}

export function quotaSourceDisplayName(source: string, t: TFunction = i18n.getFixedT("en")): string {
  const map: Record<string, string> = {
    "anthropic-oauth": "Anthropic OAuth",
    "claude-cli": "Claude CLI",
    "bedrock": "AWS Bedrock",
    "codex-rpc": t("costCardsUi.quota.codexServer"),
    "codex-wham": "ChatGPT WHAM",
  };
  return Object.hasOwn(map, source) ? map[source] : source;
}

function coerceBillingType(value: unknown): BillingType | null {
  if (
    value === "metered_api" ||
    value === "subscription_included" ||
    value === "subscription_overage" ||
    value === "credits" ||
    value === "fixed" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

function readRunCostUsd(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  for (const key of ["cacheAdjustedCostUsd", "costUsdExact", "costUsd", "cost_usd", "total_cost_usd"] as const) {
    const value = payload[key];
    if (key === "costUsdExact" && typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))) return Number(value);
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

/** Receipt-backed runs and legacy Claude/Gemini snapshots store uncached input
 * separately. OpenCode/Pi persist their provider-qualified model IDs and also
 * separate cache reads. Older Codex input already includes cached tokens.
 * Unknown legacy formats retain their input-plus-output interpretation. */
export function visibleRunTokenTotal(usage: Record<string, unknown> | null | undefined): number {
  const count = (...keys: string[]) => {
    for (const key of keys) {
      const value = usage?.[key];
      if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
    }
    return 0;
  };
  const input = count("inputTokens", "input_tokens");
  const output = count("outputTokens", "output_tokens");
  const cached = count("cachedInputTokens", "cached_input_tokens", "cache_read_input_tokens");
  const provider = typeof usage?.provider === "string" ? usage.provider : "";
  const model = typeof usage?.model === "string" ? usage.model : "";
  // Use the saved model convention, not the agent's current adapter: an agent
  // can change adapters after a historical run. Codex saves an unqualified ID.
  const qualifiedModel = provider !== "" && provider !== "unknown"
    && model.startsWith(`${provider}/`) && model.length > provider.length + 1;
  const inputExcludesCached = usage?.provider === "anthropic"
    || usage?.provider === "google"
    || qualifiedModel
    || (typeof usage?.accountingReceiptId === "string" && usage.accountingReceiptId.length > 0);
  return input + output + (inputExcludesCached ? cached : 0);
}

/** Muse exposes Paperclip bridge events, not raw private provider traffic. */
export function supportsRawProviderTrace(adapterType: string, adapterConfig: Record<string, unknown> | null | undefined): boolean {
  return adapterType !== "paperclip_runner" || adapterConfig?.provider !== "muse";
}

/** Persisted accounting facts belong to this run, even after its agent changes provider. */
export function hasUnavailableProviderAccounting(result: Record<string, unknown> | null | undefined): boolean {
  const accounting = asObject(result?.providerAccounting);
  return accounting.externallyBilled === true && accounting.usage === null && accounting.cost === null;
}

export function visibleRunCostUsd(
  usage: Record<string, unknown> | null,
  result: Record<string, unknown> | null = null,
): number {
  const billingType = coerceBillingType(usage?.billingType) ?? coerceBillingType(result?.billingType);
  if (billingType === "subscription_included") return 0;
  return readRunCostUsd(usage) ?? readRunCostUsd(result) ?? 0;
}

export function financeEventKindDisplayName(eventKind: FinanceEventKind, t: TFunction = i18n.getFixedT("en")): string {
  const map: Record<FinanceEventKind, string> = {
    inference_charge: t("costCardsUi.finance.kind.inference_charge"),
    platform_fee: t("costCardsUi.finance.kind.platform_fee"),
    credit_purchase: t("costCardsUi.finance.kind.credit_purchase"),
    credit_refund: t("costCardsUi.finance.kind.credit_refund"),
    credit_expiry: t("costCardsUi.finance.kind.credit_expiry"),
    byok_fee: t("costCardsUi.finance.kind.byok_fee"),
    gateway_overhead: t("costCardsUi.finance.kind.gateway_overhead"),
    log_storage_charge: t("costCardsUi.finance.kind.log_storage_charge"),
    logpush_charge: t("costCardsUi.finance.kind.logpush_charge"),
    provisioned_capacity_charge: t("costCardsUi.finance.kind.provisioned_capacity_charge"),
    training_charge: t("costCardsUi.finance.kind.training_charge"),
    custom_model_import_charge: t("costCardsUi.finance.kind.custom_model_import_charge"),
    custom_model_storage_charge: t("costCardsUi.finance.kind.custom_model_storage_charge"),
    manual_adjustment: t("costCardsUi.finance.kind.manual_adjustment"),
  };
  return map[eventKind];
}

export function financeDirectionDisplayName(direction: FinanceDirection, t: TFunction = i18n.getFixedT("en")): string {
  return direction === "credit" ? t("costCardsUi.finance.credit") : t("costCardsUi.finance.debit");
}

/** Build an issue URL using the human-readable identifier when available. */
export function issueUrl(issue: { id: string; identifier?: string | null }): string {
  return `/issues/${issue.identifier ?? issue.id}`;
}

/** Build an agent route URL using the short URL key when available. */
export function agentRouteRef(agent: { id: string; urlKey?: string | null; name?: string | null }): string {
  return agent.urlKey ?? deriveAgentUrlKey(agent.name, agent.id);
}

/** Build an agent URL using the short URL key when available. */
export function agentUrl(agent: { id: string; urlKey?: string | null; name?: string | null }): string {
  return `/agents/${agentRouteRef(agent)}`;
}

/** Build a project route reference, falling back to UUID when the derived key is ambiguous. */
export function projectRouteRef(project: { id: string; urlKey?: string | null; name?: string | null }): string {
  const key = project.urlKey ?? deriveProjectUrlKey(project.name, project.id);
  // Guard for rolling deploys or legacy data where the server returned a bare slug without UUID suffix.
  if (key === normalizeProjectUrlKey(project.name) && hasNonAsciiContent(project.name)) return project.id;
  return key;
}

/** Build a project URL using the short URL key when available. */
export function projectUrl(project: { id: string; urlKey?: string | null; name?: string | null }): string {
  return `/projects/${projectRouteRef(project)}`;
}

/** Build a project workspace URL scoped under its project. */
export function projectWorkspaceUrl(
  project: { id: string; urlKey?: string | null; name?: string | null },
  workspaceId: string,
): string {
  return `${projectUrl(project)}/workspaces/${workspaceId}`;
}

/** Preserve sub-cent inference charges instead of showing a misleading $0.00. */
export function formatDetailedCents(cents: string | number): string {
  return (Number(cents) / 100).toLocaleString(displayLocale(), { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 9 });
}
