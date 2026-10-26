import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import {
  COMPANY_SEARCH_SORTS,
  type CompanySearchSort,
} from "@paperclipai/shared";
import type { ParsedSearchQuery } from "./search-query-parser";

/**
 * The issue-scoped filter model for /search. This is the SAME shape the query
 * parser (search-query-parser.ts) and the URL round-trip already use — we build
 * the P2 filter-bar UI directly on top of it rather than inventing a second
 * scheme. `sort` lives alongside the filters but is tracked separately (it is not
 * part of the parser's filter set).
 */
export type SearchFilters = ParsedSearchQuery["filters"];

export function searchSortLabel(value: CompanySearchSort, t: TFunction = i18n.getFixedT("en")): string {
  switch (value) {
    case "relevance": return t("searchUi.sort.relevance");
    case "updated": return t("searchUi.sort.updated");
    case "created": return t("searchUi.sort.created");
    case "priority": return t("searchUi.sort.priority");
  }
}

export const SORT_LABELS = Object.fromEntries(
  COMPANY_SEARCH_SORTS.map((value) => [value, searchSortLabel(value)]),
) as Record<CompanySearchSort, string>;

export function updatedWithinLabel(value: string, t: TFunction = i18n.getFixedT("en")): string {
  switch (value) {
    case "24h": return t("searchUi.filters.updated24h");
    case "7d": return t("searchUi.filters.updated7d");
    case "30d": return t("searchUi.filters.updated30d");
    case "90d": return t("searchUi.filters.updated90d");
    default: return t("searchUi.filters.updatedOther", { value });
  }
}

export const UPDATED_WITHIN_LABELS = Object.fromEntries(
  ["24h", "7d", "30d", "90d"].map((value) => [value, updatedWithinLabel(value)]),
);

const SORT_SET = new Set<string>(COMPANY_SEARCH_SORTS);

export function parseSearchSort(params: URLSearchParams): CompanySearchSort {
  const raw = params.get("sort");
  return raw && SORT_SET.has(raw) ? (raw as CompanySearchSort) : "relevance";
}

/** Count active filter *dimensions* (assignee counts once regardless of shape). */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.status?.length) count += 1;
  if (filters.priority?.length) count += 1;
  if (filters.assigneeAgentId !== undefined || filters.assigneeUserId) count += 1;
  if (filters.projectId) count += 1;
  if (filters.labelId) count += 1;
  if (filters.updatedWithin || filters.updatedAfter) count += 1;
  return count;
}

// ---------------------------------------------------------------------------
// Assignee: the UI treats assignee as a single choice, but the wire model splits
// it across assigneeAgentId (string | null) and assigneeUserId (string). These
// helpers translate between a single opaque token and that split representation.
//   "me"          → assigneeUserId = currentUserId
//   "none"        → assigneeAgentId = null (unassigned)
//   "agent:<id>"  → assigneeAgentId
//   "user:<id>"   → assigneeUserId
// ---------------------------------------------------------------------------

export function assigneeToken(filters: SearchFilters, currentUserId: string | null): string | undefined {
  if (filters.assigneeAgentId === null) return "none";
  if (typeof filters.assigneeAgentId === "string") return `agent:${filters.assigneeAgentId}`;
  if (filters.assigneeUserId) {
    return filters.assigneeUserId === currentUserId ? "me" : `user:${filters.assigneeUserId}`;
  }
  return undefined;
}

export function applyAssigneeToken(
  filters: SearchFilters,
  token: string | undefined,
  currentUserId: string | null,
): SearchFilters {
  const next: SearchFilters = { ...filters };
  delete next.assigneeAgentId;
  delete next.assigneeUserId;
  if (!token) return next;
  if (token === "none") {
    next.assigneeAgentId = null;
  } else if (token === "me") {
    if (currentUserId) next.assigneeUserId = currentUserId;
  } else if (token.startsWith("agent:")) {
    next.assigneeAgentId = token.slice("agent:".length);
  } else if (token.startsWith("user:")) {
    next.assigneeUserId = token.slice("user:".length);
  }
  return next;
}

export interface FilterChipLookups {
  agentName: (id: string) => string | undefined;
  userName: (id: string) => string | undefined;
  projectName: (id: string) => string | undefined;
  labelName: (id: string) => string | undefined;
  currentUserId: string | null;
}

export interface FilterChip {
  id: string;
  label: string;
  remove: (filters: SearchFilters) => SearchFilters;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function searchFilterValueLabel(value: string, t: TFunction = i18n.getFixedT("en")): string {
  let label: string;
  switch (value) {
    case "backlog": label = t("statuses.backlog"); break;
    case "todo": label = t("statuses.todo"); break;
    case "in_progress": label = t("statuses.in_progress"); break;
    case "in_review": label = t("statuses.in_review"); break;
    case "blocked": label = t("statuses.blocked"); break;
    case "done": label = t("statuses.done"); break;
    case "cancelled": label = t("statuses.cancelled"); break;
    case "critical": label = t("statuses.critical"); break;
    case "high": label = t("statuses.high"); break;
    case "medium": label = t("statuses.medium"); break;
    case "low": label = t("statuses.low"); break;
    default: return humanize(value);
  }
  return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

function assigneeChipLabel(filters: SearchFilters, lookups: FilterChipLookups, t: TFunction): string {
  if (filters.assigneeAgentId === null) return t("searchUi.filters.unassigned");
  if (typeof filters.assigneeAgentId === "string") {
    return lookups.agentName(filters.assigneeAgentId) ?? t("searchUi.filters.agent");
  }
  if (filters.assigneeUserId) {
    if (filters.assigneeUserId === lookups.currentUserId) return t("searchUi.filters.me");
    return lookups.userName(filters.assigneeUserId) ?? t("searchUi.filters.user");
  }
  return t("searchUi.filters.assignee");
}

/** Removable chip descriptors for the active-filter row. */
export function buildFilterChips(filters: SearchFilters, lookups: FilterChipLookups, t: TFunction = i18n.getFixedT("en")): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const status of filters.status ?? []) {
    chips.push({
      id: `status:${status}`,
      label: t("searchUi.filters.chipStatus", { value: searchFilterValueLabel(status, t) }),
      remove: (current) => {
        const next = { ...current };
        const remaining = (current.status ?? []).filter((value) => value !== status);
        if (remaining.length > 0) next.status = remaining;
        else delete next.status;
        return next;
      },
    });
  }
  // PAP-411: priority controls are hidden from the UI, but the priority filter
  // DSL (`priority:high`) stays functional at the data layer per board decision.
  // A priority filter can therefore still enter the query via URL round-trip or
  // typed DSL, so we always render a removable chip for it — otherwise a restored
  // priority filter would silently narrow results with no way to see or clear it.
  for (const priority of filters.priority ?? []) {
    chips.push({
      id: `priority:${priority}`,
      label: t("searchUi.filters.chipPriority", { value: searchFilterValueLabel(priority, t) }),
      remove: (current) => {
        const next = { ...current };
        const remaining = (current.priority ?? []).filter((value) => value !== priority);
        if (remaining.length > 0) next.priority = remaining;
        else delete next.priority;
        return next;
      },
    });
  }
  if (filters.assigneeAgentId !== undefined || filters.assigneeUserId) {
    chips.push({
      id: "assignee",
      label: t("searchUi.filters.chipAssignee", { value: assigneeChipLabel(filters, lookups, t) }),
      remove: (current) => {
        const next = { ...current };
        delete next.assigneeAgentId;
        delete next.assigneeUserId;
        return next;
      },
    });
  }
  if (filters.projectId) {
    chips.push({
      id: "project",
      label: t("searchUi.filters.chipProject", { value: lookups.projectName(filters.projectId) ?? t("searchUi.filters.project") }),
      remove: (current) => {
        const next = { ...current };
        delete next.projectId;
        return next;
      },
    });
  }
  if (filters.labelId) {
    chips.push({
      id: "label",
      label: t("searchUi.filters.chipLabel", { value: lookups.labelName(filters.labelId) ?? t("searchUi.filters.label") }),
      remove: (current) => {
        const next = { ...current };
        delete next.labelId;
        return next;
      },
    });
  }
  if (filters.updatedWithin) {
    chips.push({
      id: "updated",
      label: t("searchUi.filters.chipUpdated", { value: updatedWithinLabel(filters.updatedWithin, t) }),
      remove: (current) => {
        const next = { ...current };
        delete next.updatedWithin;
        delete next.updatedAfter;
        return next;
      },
    });
  }
  return chips;
}

/** Human label for a backend zero-results loosen suggestion. */
export function describeLoosenSuggestion(filterKey: string, values: string[], lookups: FilterChipLookups, t: TFunction = i18n.getFixedT("en")): string {
  switch (filterKey) {
    case "status":
      return t("searchUi.filters.chipStatus", { value: values.map((value) => searchFilterValueLabel(value, t)).join(", ") });
    case "priority":
      return t("searchUi.filters.chipPriority", { value: values.map((value) => searchFilterValueLabel(value, t)).join(", ") });
    case "assigneeAgentId":
      return t("searchUi.filters.chipAssignee", { value: values.map((id) => lookups.agentName(id) ?? t("searchUi.filters.agent")).join(", ") });
    case "assigneeUserId":
      return t("searchUi.filters.chipAssignee", { value: values.map((id) => (id === lookups.currentUserId ? t("searchUi.filters.me") : lookups.userName(id) ?? t("searchUi.filters.user"))).join(", ") });
    case "projectId":
      return t("searchUi.filters.chipProject", { value: values.map((id) => lookups.projectName(id) ?? t("searchUi.filters.project")).join(", ") });
    case "labelId":
      return t("searchUi.filters.chipLabel", { value: values.map((id) => lookups.labelName(id) ?? t("searchUi.filters.label")).join(", ") });
    case "updatedWithin":
    case "updatedAfter":
      return t("searchUi.recoverySuggestions.updatedWindow");
    default:
      return humanize(filterKey);
  }
}

/** Clear the filter dimension a loosen suggestion refers to. */
export function clearFilterDimension(filters: SearchFilters, filterKey: string): SearchFilters {
  const next: SearchFilters = { ...filters };
  switch (filterKey) {
    case "status":
      delete next.status;
      break;
    case "priority":
      delete next.priority;
      break;
    case "assigneeAgentId":
    case "assigneeUserId":
      delete next.assigneeAgentId;
      delete next.assigneeUserId;
      break;
    case "projectId":
      delete next.projectId;
      break;
    case "labelId":
      delete next.labelId;
      break;
    case "updatedWithin":
    case "updatedAfter":
      delete next.updatedWithin;
      delete next.updatedAfter;
      break;
    default:
      break;
  }
  return next;
}
