import { t } from "@/i18n";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n";
import { auditSectionHref, type AuditSection } from "./audit/audit-navigation";

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
  | "run-detail";

export type AgentLocalDetailView = Exclude<AgentDetailView, "run-detail">;

export const AGENT_DETAIL_NAVIGATION: ReadonlyArray<{
  id: "agent" | "runtime" | "governance";
  label: string;
  items: ReadonlyArray<{ value: AgentLocalDetailView; label: string }>;
}> = [
  {
    id: "agent",
    get label() { return t("approvalsUi.agent"); },
    items: [
      { value: "overview", get label() { return t("costsUi.overview"); } },
      { value: "instructions", get label() { return t("agentDetailUi.nav.instructions"); } },
      { value: "skills", get label() { return t("sidebar.skills"); } },
    ],
  },
  {
    id: "runtime",
    get label() { return t("agentDetailUi.nav.groupRuntime"); },
    items: [
      { value: "runtime", get label() { return t("agentDetailUi.nav.runtime"); } },
      { value: "secrets", get label() { return t("settingsNav.secrets"); } },
      { value: "tools", get label() { return t("agentDetailUi.nav.tools"); } },
      { value: "channels", get label() { return t("agentChannelsUi.heading"); } },
    ],
  },
  {
    id: "governance",
    get label() { return t("agentDetailUi.nav.groupGovernance"); },
    items: [
      { value: "permissions", get label() { return t("agentDetailUi.nav.permissions"); } },
      { value: "api-keys", get label() { return t("agentDetailUi.nav.api-keys"); } },
      { value: "revisions", get label() { return t("agentDetailUi.nav.revisions"); } },
    ],
  },
] as const;

export function getAgentDetailNavigation(t: TFunction = i18n.getFixedT("en")) {
  const labels: Record<AgentLocalDetailView, string> = {
    "overview": t("agentDetailUi.nav.overview"),
    "instructions": t("agentDetailUi.nav.instructions"),
    "skills": t("agentDetailUi.nav.skills"),
    "runtime": t("agentDetailUi.nav.runtime"),
    "secrets": t("agentDetailUi.nav.secrets"),
    "tools": t("agentDetailUi.nav.tools"),
    "channels": t("agentDetailUi.nav.channels"),
    "permissions": t("agentDetailUi.nav.permissions"),
    "api-keys": t("agentDetailUi.nav.api-keys"),
    "revisions": t("agentDetailUi.nav.revisions"),
  };
  const sectionLabels = {
    agent: t("agentDetailUi.nav.groupAgent"),
    runtime: t("agentDetailUi.nav.groupRuntime"),
    governance: t("agentDetailUi.nav.groupGovernance"),
  };
  return AGENT_DETAIL_NAVIGATION.map(section => ({
    ...section,
    label: sectionLabels[section.id],
    items: section.items.map(item => ({ ...item, label: labels[item.value] })),
  }));
}

export function parseAgentDetailView(value: string | null): AgentLocalDetailView {
  if (value === "instructions" || value === "prompts") return "instructions";
  if (value === "skills") return "skills";
  if (value === "runtime" || value === "configure" || value === "configuration") return "runtime";
  if (value === "secrets") return "secrets";
  if (value === "tools") return "tools";
  if (value === "channels") return "channels";
  if (value === "permissions" || value === "trust") return "permissions";
  if (value === "api-keys" || value === "keys") return "api-keys";
  if (value === "revisions" || value === "history") return "revisions";
  return "overview";
}

export function agentDetailHref(agentRef: string, view: AgentLocalDetailView = "overview") {
  return `/agents/${agentRef}/${view}`;
}

export function agentLegacyAuditSection(value: string | null): AuditSection | null {
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
