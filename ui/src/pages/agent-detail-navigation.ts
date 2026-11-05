import { t } from "@/i18n";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { auditSectionHref, type AuditSection } from "./audit/audit-navigation";

export type AgentAuditView = Extract<AuditSection, "activity" | "runs" | "costs" | "budgets">;

export type AgentDetailView =
  | "overview"
  | "instructions"
  | "skills"
  | "runtime"
  | "secrets"
  | "tools"
  | "channels"
  | "permissions"
  | "api-keys"
  | "revisions"
  | "advanced"
  | AgentAuditView
  | "run-detail";

export type AgentLocalDetailView = Exclude<AgentDetailView, "run-detail">;

export function agentDetailViewLabel(view: AgentLocalDetailView, translate: TFunction = i18n.getFixedT(i18n.resolvedLanguage ?? "en")): string {
  switch (view) {
    case "overview": return translate("agentDetailUi.nav.overview");
    case "instructions": return translate("agentDetailUi.nav.identity");
    case "runtime": return translate("agentDetailUi.nav.runtime");
    case "secrets": return translate("agentDetailUi.nav.secretsVariables");
    case "permissions": return translate("agentDetailUi.nav.permissions");
    case "advanced": return translate("agentDetailUi.nav.advanced");
    case "activity": return translate("agentDetailUi.nav.activity");
    case "runs": return translate("agentDetailUi.nav.runs");
    case "costs": return translate("agentDetailUi.nav.costs");
    case "budgets": return translate("agentDetailUi.nav.budgets");
    case "skills": return translate("agentDetailUi.nav.skills");
    case "tools": return translate("agentDetailUi.nav.tools");
    case "channels": return translate("agentDetailUi.nav.channels");
    case "api-keys": return translate("agentDetailUi.nav.api-keys");
    case "revisions": return translate("agentDetailUi.nav.history");
    default: return translate("agentDetailUi.nav.overview");
  }
}

export const AGENT_DETAIL_NAVIGATION: ReadonlyArray<{
  id: "agent" | "audit";
  label: string;
  items: ReadonlyArray<{ value: AgentLocalDetailView; label: string }>;
}> = [
  {
    id: "agent",
    get label() { return t("agentDetailUi.nav.groupAgent"); },
    items: [
      { value: "overview", get label() { return agentDetailViewLabel("overview"); } },
      { value: "instructions", get label() { return agentDetailViewLabel("instructions"); } },
      { value: "runtime", get label() { return agentDetailViewLabel("runtime"); } },
      { value: "secrets", get label() { return agentDetailViewLabel("secrets"); } },
      { value: "permissions", get label() { return agentDetailViewLabel("permissions"); } },
      { value: "advanced", get label() { return agentDetailViewLabel("advanced"); } },
    ],
  },
  {
    id: "audit",
    get label() { return t("agentDetailUi.nav.groupAudit"); },
    items: [
      { value: "activity", get label() { return agentDetailViewLabel("activity"); } },
      { value: "runs", get label() { return agentDetailViewLabel("runs"); } },
      { value: "costs", get label() { return agentDetailViewLabel("costs"); } },
      { value: "budgets", get label() { return agentDetailViewLabel("budgets"); } },
    ],
  },
 ];

export function getAgentDetailNavigation(translate: TFunction = i18n.getFixedT("en")) {
  return AGENT_DETAIL_NAVIGATION.map(section => ({
    ...section,
    label: section.id === "agent" ? translate("agentDetailUi.nav.groupAgent") : translate("agentDetailUi.nav.groupAudit"),
    items: section.items.map(item => ({ ...item, label: agentDetailViewLabel(item.value, translate) })),
  }));
}

export const AGENT_AUDIT_VIEWS: ReadonlySet<AgentLocalDetailView> = new Set(["activity", "runs", "costs", "budgets"]);

export function isAgentAuditView(view: AgentDetailView): view is AgentAuditView {
  return AGENT_AUDIT_VIEWS.has(view as AgentLocalDetailView);
}

export function parseAgentDetailView(value: string | null): AgentLocalDetailView {
  if (value === "identity" || value === "instructions" || value === "prompts") return "instructions";
  if (value === "skills") return "skills";
  if (value === "runtime" || value === "configure" || value === "configuration") return "runtime";
  if (value === "secrets") return "secrets";
  if (value === "tools") return "tools";
  if (value === "channels") return "channels";
  if (value === "permissions" || value === "trust") return "permissions";
  if (value === "api-keys" || value === "keys") return "api-keys";
  if (value === "revisions" || value === "history") return "revisions";
  if (value === "advanced") return "advanced";
  const audit = agentLegacyAuditSection(value);
  if (audit) return audit;
  return "overview";
}

export function agentDetailSegment(view: AgentLocalDetailView): string {
  return view === "instructions" ? "identity" : view;
}

export function agentDetailHref(agentRef: string, view: AgentLocalDetailView = "overview") {
  return `/agents/${agentRef}/${agentDetailSegment(view)}`;
}

export function agentLegacyAuditSection(value: string | null): AgentAuditView | null {
  if (value === "runs") return "runs";
  if (value === "audit" || value === "activity") return "activity";
  if (value === "cost" || value === "costs") return "costs";
  if (value === "budget" || value === "budgets") return "budgets";
  return null;
}

export function agentScopedAuditHref(agentId: string, section: AuditSection) {
  return auditSectionHref(section, {
    mode: section === "activity" ? "agents" : undefined,
    agentId,
  });
}
