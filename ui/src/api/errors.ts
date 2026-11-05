import { errorActionCopy } from "./error-action-copy";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
/**
 * Shared error classification and user-facing copy.
 *
 * Every surface that reacts to a failed request asks two questions: "is this a
 * blip that will fix itself?" and "what do I tell the user?". This module is
 * the single answer to both, so retry policy, the connectivity banner, toasts,
 * and inline errors agree with each other.
 *
 * Classification is structural on purpose: it reads `status`, `code`, `body`,
 * and `name` instead of importing `ApiError`/`ApiUnavailableError`, so the API
 * client can depend on this module without an import cycle, and errors thrown
 * by hand-rolled fetches (health, uploads) classify the same way.
 */

export type ErrorKind =
  | "transient"
  | "auth"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid"
  | "aborted"
  | "unknown";

export interface ErrorDescription {
  title: string;
  body: string;
  /** True when trying the same request again later can succeed. */
  retryable: boolean;
}

export interface DescribeErrorOptions {
  /** What the user was doing, as a verb phrase: "save the comment". */
  action?: string;
}

/** HTTP statuses that mean "the server or a proxy will likely recover". */
const TRANSIENT_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

/**
 * Error codes that mean "temporarily unavailable" regardless of the HTTP status
 * they arrive with. The Cloud gateway has sent `tenant_app_unavailable` with
 * non-5xx statuses, so these are matched by code, never by status alone.
 */
const TRANSIENT_CODES = new Set([
  "tenant_app_unavailable",
  "tenant_app_starting",
  // Plugin bridge (`PluginBridgeErrorCode`).
  "WORKER_UNAVAILABLE",
  "TIMEOUT",
]);

/** Transient errors that say "the whole server is unreachable", not one route. */
const CONNECTIVITY_STATUSES = new Set([502, 503, 504]);
const CONNECTIVITY_CODES = new Set(["tenant_app_unavailable", "tenant_app_starting"]);

// --- Copy table ---------------------------------------------------------------
//
// The only place user-facing error copy lives. Keys are server error codes (the
// raw `body.error`/`body.code`) or an `ErrorKind` fallback. Never return a raw
// code to the user: anything not in this table falls back to its kind's copy.

const UNAVAILABLE_BODY = "Paperclip is temporarily unavailable. Please try again in a moment.";

const CODE_COPY = (t: TFunction): Record<string, { title: string; body: string }> => ({
  tenant_app_unavailable: {
    get title() { return t("accessGate.reconnecting"); },
    get body() { return t("interfaceUpdates.paperclip_is_restarting_or_updating_please_try_aga_03614221"); },
  },
  tenant_app_starting: {
    get title() { return t("interfaceUpdates.paperclip_is_starting_1c437ed9"); },
    get body() { return t("interfaceUpdates.paperclip_is_starting_up_please_try_again_in_a_few_7be6b805"); },
  },
  WORKER_UNAVAILABLE: {
    get title() { return t("interfaceUpdates.plugin_unavailable_0f3f35c8"); },
    get body() { return t("interfaceUpdates.this_plugin_is_restarting_please_try_again_in_a_mo_6858a6a9"); },
  },
  TIMEOUT: {
    get title() { return t("interfaceUpdates.request_timed_out_7aa26ae7"); },
    get body() { return t("interfaceUpdates.this_took_too_long_to_respond_please_try_again_in__186202c2"); },
  },
  // Issue-thread interaction resolution (moved from lib/interaction-resolution-error.ts).
  interaction_audience_denied: {
    get title() { return t("interfaceUpdates.you_can_t_respond_to_this_card_0233eefc"); },
    get body() { return t("decisionForms.errors.audienceDenied"); },
  },
  interaction_forbidden: {
    get title() { return t("interfaceUpdates.you_can_t_respond_to_this_card_0233eefc"); },
    get body() { return t("decisionForms.errors.permissionDenied"); },
  },
  interaction_settled: {
    get title() { return t("interfaceUpdates.already_handled_5fdd085d"); },
    get body() { return t("decisionForms.errors.settled"); },
  },
  interaction_submit_failed: {
    get title() { return t("interfaceUpdates.couldn_t_submit_9488e0e9"); },
    get body() { return t("decisionForms.errors.submitFailed"); },
  },
});

const KIND_COPY = (t: TFunction): Record<ErrorKind, { title: string; body: string }> => ({
  // Moved from `ApiUnavailableError` (api/response.ts).
  transient: { get title() { return t("interfaceUpdates.connection_interrupted_183383d6"); }, get body() { return t("interfaceUpdates.temporarilyUnavailable"); } },
  auth: { get title() { return t("interfaceUpdates.signed_out_80c6e7ca"); }, get body() { return t("interfaceUpdates.your_session_has_ended_sign_in_again_to_continue_ce00c98a"); } },
  forbidden: { get title() { return t("interfaceUpdates.not_allowed_f0406a0e"); }, get body() { return t("interfaceUpdates.you_don_t_have_permission_to_do_that_fa3365ec"); } },
  not_found: { get title() { return t("skillsGap.notFound"); }, get body() { return t("interfaceUpdates.this_item_doesn_t_exist_or_was_moved_9a15e2f0"); } },
  conflict: { get title() { return t("taskPanels.documents.outdated"); }, get body() { return t("interfaceUpdates.this_changed_since_you_loaded_it_refresh_and_try_a_d35eb124"); } },
  invalid: { get title() { return t("interfaceUpdates.check_your_input_29ea6afd"); }, get body() { return t("interfaceUpdates.some_details_aren_t_valid_review_them_and_try_agai_654c53b8"); } },
  aborted: { get title() { return t("interfaceUpdates.cancelled_d353a99e"); }, get body() { return t("interfaceUpdates.the_request_was_cancelled_cef71466"); } },
  unknown: { get title() { return t("interfaceUpdates.something_went_wrong_ab827e3f"); }, get body() { return t("interfaceUpdates.an_unexpected_error_occurred_please_try_again_e198269c"); } },
});

/** Copy for a specific code or kind, for callers that build their own messages. */
export function errorCopy(key: string, t: TFunction = i18n.t): { title: string; body: string } {
  const codes = CODE_COPY(t), kinds = KIND_COPY(t);
  return codes[key] ?? kinds[key as ErrorKind] ?? kinds.unknown;
}

// --- Field extraction -------------------------------------------------------------

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** The HTTP status an error carries, if any. */
export function errorStatus(err: unknown): number | null {
  const status = record(err)?.status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

/**
 * Every server-provided code on an error: `ApiError.code` (the raw
 * `body.error`), `body.code`, and `body.details.code`. Plugin bridge errors put
 * their code on `body.code`; HttpErrors put a machine code on `details.code`.
 */
export function errorCodes(err: unknown): string[] {
  const error = record(err);
  if (!error) return [];
  const body = record(error.body);
  const codes = [
    stringField(error.code),
    stringField(body?.error),
    stringField(body?.code),
    stringField(record(body?.details)?.code),
  ];
  return [...new Set(codes.filter((code): code is string => code !== null))];
}

/**
 * True for a machine code (`tenant_app_unavailable`, `WORKER_UNAVAILABLE`,
 * `TIMEOUT`) rather than a sentence a person wrote. Single readable words such
 * as "Forbidden" are not codes.
 */
export function isRawErrorCode(value: string): boolean {
  const text = value.trim();
  if (!text || /\s/.test(text)) return false;
  return Object.hasOwn(KIND_COPY(i18n.getFixedT("en")), text) || text === "unauthorized"
    || /^[A-Za-z0-9]+(?:[_.][A-Za-z0-9]+)+$/.test(text) || /^[A-Z][A-Z0-9_]{2,}$/.test(text);
}

/** A server message that is safe to show: not a raw code, not a generic status line. */
function readableServerMessage(err: unknown): string | null {
  const error = record(err);
  const candidates = [stringField(record(error?.body)?.message), stringField(record(error?.body)?.error)];
  if (err instanceof Error) candidates.push(stringField(err.message));
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isRawErrorCode(candidate)) continue;
    if (/^Request failed: \d+$/.test(candidate)) continue;
    if (candidate === UNAVAILABLE_BODY) continue;
    return candidate;
  }
  return null;
}

// --- Classification ---------------------------------------------------------------

function isAbortError(err: unknown): boolean {
  const name = record(err)?.name;
  return name === "AbortError" || name === "CancelledError";
}

function isNetworkTypeError(err: unknown): boolean {
  // Fetch uses different network-failure messages across browsers. Do not
  // classify arbitrary TypeErrors (programming bugs) as outages.
  return err instanceof TypeError && /fetch|network|load failed/i.test(err.message);
}

function isApiUnavailableError(err: unknown): boolean {
  return record(err)?.name === "ApiUnavailableError";
}

export function classifyError(err: unknown): ErrorKind {
  if (err === null || err === undefined) return "unknown";
  if (isAbortError(err)) return "aborted";
  if (isApiUnavailableError(err) || isNetworkTypeError(err)) return "transient";
  if (errorCodes(err).some((code) => TRANSIENT_CODES.has(code))) return "transient";

  const status = errorStatus(err);
  if (status === null) return "unknown";
  if (TRANSIENT_STATUSES.has(status)) return "transient";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404 || status === 410) return "not_found";
  if (status === 409 || status === 412) return "conflict";
  if (status >= 400 && status < 500) return "invalid";
  return "unknown";
}

export function isTransientError(err: unknown): boolean {
  return classifyError(err) === "transient";
}

/**
 * A transient error that means the server as a whole is unreachable (network
 * drop, proxy 5xx, gateway "app unavailable"), as opposed to one route being
 * busy (429, a plugin worker restarting). Only these move the app-wide
 * connectivity state; per-route blips are left to query retry.
 */
export function isConnectivityError(err: unknown): boolean {
  if (isApiUnavailableError(err) || isNetworkTypeError(err)) return true;
  if (errorCodes(err).some((code) => CONNECTIVITY_CODES.has(code))) return true;
  const status = errorStatus(err);
  if (status === null || !CONNECTIVITY_STATUSES.has(status)) return false;
  // A plugin worker 503 is one route, not the server.
  return !errorCodes(err).some((code) => TRANSIENT_CODES.has(code) && !CONNECTIVITY_CODES.has(code));
}

/** HTTP 4xx other than the transient ones; retrying the same request cannot help. */
export function isClientError(err: unknown): boolean {
  const kind = classifyError(err);
  return kind === "auth" || kind === "forbidden" || kind === "not_found" || kind === "conflict" || kind === "invalid";
}

// --- Retry-After --------------------------------------------------------------------

const MAX_RETRY_AFTER_MS = 5 * 60_000;

/** Parse an HTTP `Retry-After` value (delta-seconds or HTTP-date) into milliseconds. */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null;
  const text = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    return Math.min(Math.round(Number(text) * 1000), MAX_RETRY_AFTER_MS);
  }
  const date = Date.parse(text);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(0, date - now), MAX_RETRY_AFTER_MS);
}

/** The server-requested delay carried by an error, if any. */
export function errorRetryAfterMs(err: unknown): number | null {
  const value = record(err)?.retryAfterMs;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

// --- Copy -----------------------------------------------------------------------------

/**
 * User-facing copy for any error. Never returns a raw `snake_case` code:
 * known codes use the table above, readable server messages pass through for
 * client errors, and everything else uses the copy for its kind.
 */
export function describeError(err: unknown, options: DescribeErrorOptions = {}, t: TFunction = i18n.t): ErrorDescription {
  const kind = classifyError(err);
  const retryable = kind === "transient" || kind === "unknown";
  const codes = CODE_COPY(t);
  const coded = errorCodes(err).map((code) => Object.hasOwn(codes, code) ? codes[code] : undefined).find(Boolean);
  const fallback = KIND_COPY(t)[kind];

  let body: string;
  if (coded) body = coded.body;
  else if (kind === "transient" || kind === "aborted") body = fallback.body;
  else body = readableServerMessage(err) ?? fallback.body;

  const title = options.action && kind !== "transient"
    ? t("interfaceUpdates.couldn_t_value_de6573d0", { value1: errorActionCopy(options.action, t) })
    : (coded?.title ?? fallback.title);
  return { title, body, retryable };
}

/**
 * The `message` for an `ApiError` built from an HTTP response: the server's own
 * text when it is readable, otherwise copy from the table. Keeps raw codes out
 * of every `{error.message}` render and `toast(err.message)` call.
 */
export function apiErrorMessage(status: number, body: unknown): string {
  const raw = stringField(record(body)?.error);
  if (raw && !isRawErrorCode(raw)) return raw;
  return describeError({ status, body, code: raw }).body;
}
