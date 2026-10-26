import { i18n } from "@/i18n";

// Display adapters only: callers retain canonical IDs in values and mutations.
export function routineRunStatusLabel(value: string): string {
  switch (value) {
    case "received": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelReceived");
    case "coalesced": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelCoalesced");
    case "skipped": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelSkipped");
    case "issue_created": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelIssueCreated");
    case "completed": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelCompleted");
    case "failed": return i18n.t("fullRoutinesSecrets.routineRunStatusLabelFailed");
    default: return value;
  }
}

export function routineTriggerKindLabel(value: string): string {
  switch (value) {
    case "schedule": return i18n.t("fullRoutinesSecrets.routineTriggerKindLabelSchedule");
    case "webhook": return i18n.t("fullRoutinesSecrets.routineTriggerKindLabelWebhook");
    case "api": return i18n.t("fullRoutinesSecrets.routineTriggerKindLabelApi");
    case "manual": return i18n.t("fullRoutinesSecrets.routineTriggerKindLabelManual");
    default: return value;
  }
}

export function routinePolicyLabel(value: string): string {
  switch (value) {
    case "coalesce_if_active": return i18n.t("fullRoutinesSecrets.routinePolicyLabelCoalesceIfActive");
    case "always_enqueue": return i18n.t("fullRoutinesSecrets.routinePolicyLabelAlwaysEnqueue");
    case "skip_if_active": return i18n.t("fullRoutinesSecrets.routinePolicyLabelSkipIfActive");
    case "skip_missed": return i18n.t("fullRoutinesSecrets.routinePolicyLabelSkipMissed");
    case "enqueue_missed_with_cap": return i18n.t("fullRoutinesSecrets.routinePolicyLabelEnqueueMissedWithCap");
    case "always": return i18n.t("fullRoutinesSecrets.routinePolicyLabelAlways");
    case "require_external_activity": return i18n.t("fullRoutinesSecrets.routinePolicyLabelRequireExternalActivity");
    case "company": return i18n.t("fullRoutinesSecrets.routinePolicyLabelCompany");
    case "project": return i18n.t("fullRoutinesSecrets.routinePolicyLabelProject");
    default: return value;
  }
}

export function routineVariableTypeLabel(value: string): string {
  switch (value) {
    case "text": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelText");
    case "textarea": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelTextarea");
    case "number": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelNumber");
    case "boolean": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelBoolean");
    case "select": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelSelect");
    case "date": return i18n.t("fullRoutinesSecrets.routineVariableTypeLabelDate");
    default: return value;
  }
}

export function routineSigningModeLabel(value: string): string {
  switch (value) {
    case "bearer": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelBearer");
    case "app_webhook": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelAppWebhook");
    case "hmac_sha256": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelHmacSha256");
    case "github_hmac": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelGithubHmac");
    case "fireflies_hmac": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelFirefliesHmac");
    case "none": return i18n.t("fullRoutinesSecrets.routineSigningModeLabelNone");
    default: return value;
  }
}

export function secretStateLabel(value: string): string {
  switch (value) {
    case "active": return i18n.t("fullRoutinesSecrets.secretStateLabelActive");
    case "disabled": return i18n.t("fullRoutinesSecrets.secretStateLabelDisabled");
    case "archived": return i18n.t("fullRoutinesSecrets.secretStateLabelArchived");
    case "deleted": return i18n.t("fullRoutinesSecrets.secretStateLabelDeleted");
    default: return value;
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export function routineWeekdayLabel(value: string): string {
  const day = WEEKDAYS.indexOf(value as typeof WEEKDAYS[number]);
  if (day < 0) return value;
  return new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + day)));
}

export function secretAccessOutcomeLabel(value: string): string {
  switch (value) {
    case "success": return i18n.t("fullRoutinesSecrets.accessOutcomeSuccess");
    case "failure": return i18n.t("fullRoutinesSecrets.accessOutcomeFailure");
    case "missing": return i18n.t("fullRoutinesSecrets.accessOutcomeMissing");
    case "inactive": return i18n.t("fullRoutinesSecrets.accessOutcomeInactive");
    case "not_allowed": return i18n.t("fullRoutinesSecrets.accessOutcomeNot_allowed");
    case "optional_omitted": return i18n.t("fullRoutinesSecrets.accessOutcomeOptional_omitted");
    case "provider_error": return i18n.t("fullRoutinesSecrets.accessOutcomeProvider_error");
    default: return value;
  }
}
