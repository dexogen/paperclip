import { Trans, useTranslation } from "../i18n";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentPermissions, TrustPreset } from "@paperclipai/shared";
import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, CollapsibleSection } from "./agent-config-primitives";
import {
  buildPermissionsForTrustPreset,
  clearSingleLowTrustBoundaryTarget,
  getLowTrustBoundary,
  getSingleLowTrustBoundaryTarget,
  getTrustPreset,
  isCeLowTrustBoundaryEditable,
  lowTrustBoundaryHasScope,
  setSingleLowTrustBoundaryTarget,
  countBoundaryTargets,
  getTrustPresetDescriptions,
  getTrustPresetLabels,
  type LowTrustBoundaryTarget,
} from "../lib/trust-policy-ui";
import { cn } from "../lib/utils";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 text-right", value === "-" && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

export interface LowTrustBoundaryCandidate {
  id: string;
  label: string;
}

type LowTrustBoundaryTargetType = LowTrustBoundaryTarget["type"];

export function TrustPresetSection({
  permissions,
  onChange,
  disabled,
  companyId,
  projectCandidates = [],
  issueCandidates = [],
  candidatesLoading,
  allowSingleIssue = true,
  projectAccessEditor,
}: {
  permissions: Partial<AgentPermissions> | null | undefined;
  onChange: (permissions: Partial<AgentPermissions>) => void;
  disabled?: boolean;
  companyId?: string | null;
  projectCandidates?: LowTrustBoundaryCandidate[];
  issueCandidates?: LowTrustBoundaryCandidate[];
  candidatesLoading?: boolean;
  allowSingleIssue?: boolean;
  projectAccessEditor?: ReactNode;
}) {
  const { t } = useTranslation();
  const presetLabels = getTrustPresetLabels(t);
  const presetDescriptions = getTrustPresetDescriptions(t);
  const boundaryTargetLabels: Record<LowTrustBoundaryTargetType, string> = {
    project: t("agentAccessUi.trust.project"),
    root_issue: t("agentAccessUi.trust.rootIssue"),
    issue: t("agentAccessUi.trust.issue"),
  };
  const [policyOpen, setPolicyOpen] = useState(false);
  const preset = getTrustPreset(permissions);
  const boundary = getLowTrustBoundary(permissions);
  const boundaryTarget = getSingleLowTrustBoundaryTarget(boundary);
  const [targetType, setTargetType] = useState<LowTrustBoundaryTargetType>(boundaryTarget?.type ?? "project");
  const lowTrust = preset === "low_trust_review";
  const hasScope = lowTrustBoundaryHasScope(boundary);
  const boundaryEditable = isCeLowTrustBoundaryEditable(boundary);
  const policy = permissions?.authorizationPolicy ?? null;
  const managedPermissions = useMemo(
    () => buildPermissionsForTrustPreset(permissions, preset),
    [permissions, preset],
  );

  useEffect(() => {
    if (boundaryTarget) setTargetType(boundaryTarget.type);
  }, [boundaryTarget?.type]);

  function handlePresetChange(value: string) {
    const nextPreset: TrustPreset = value === "low_trust_review" ? "low_trust_review" : "standard";
    onChange(buildPermissionsForTrustPreset(permissions, nextPreset));
  }

  function handleBoundaryTargetChange(targetId: string) {
    if (!companyId || !targetId) return;
    onChange(setSingleLowTrustBoundaryTarget(permissions, companyId, { type: targetType, id: targetId }));
  }

  function handleClearBoundary() {
    onChange(clearSingleLowTrustBoundaryTarget(permissions));
  }

  const targetCandidates = targetType === "project" ? projectCandidates : issueCandidates;
  const boundaryValue = boundaryTarget?.type === targetType ? boundaryTarget.id : "";

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{t("agentAccessUi.trust.heading")}</h3>
      <div className="rounded-lg border border-border p-4 space-y-3">
        <Field label={t("agentAccessUi.trust.preset")} hint={t("agentAccessUi.trust.presetHint")}>
          <select
            className={inputClass}
            value={preset}
            onChange={(event) => handlePresetChange(event.target.value)}
            disabled={disabled}
          >
            <option value="standard">{presetLabels.standard}</option>
            <option value="low_trust_review">{presetLabels.low_trust_review}</option>
          </select>
        </Field>
        <p className="text-xs text-muted-foreground">{presetDescriptions[preset]}</p>

        {lowTrust ? (
          <div
            role={hasScope ? "status" : "alert"}
            aria-live="polite"
            className={cn(
              "rounded-md border px-3 py-2.5 text-sm flex gap-2",
              hasScope
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-100"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {hasScope ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="font-medium">
                  {hasScope ? t("agentAccessUi.trust.active") : t("agentAccessUi.trust.missing")}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {hasScope
                    ? t("agentAccessUi.trust.activeHint")
                    : t("agentAccessUi.trust.missingHint")}
                </p>
              </div>
              {projectAccessEditor && (boundary?.projectIds?.length ?? 0) > 0 ? null : boundaryEditable ? (
                <div className="rounded-md border border-border/70 bg-background/70 p-3 text-foreground space-y-3">
                  <div className="grid gap-3 sm:grid-cols-(--gtc-12)">
                    <Field label={t("agentAccessUi.trust.boundaryType")}>
                      <select
                        className={inputClass}
                        value={targetType}
                        onChange={(event) => setTargetType(event.target.value as LowTrustBoundaryTargetType)}
                        disabled={disabled}
                      >
                        <option value="project">{t("agentAccessUi.trust.project")}</option>
                        <option value="root_issue">{t("agentAccessUi.trust.rootIssue")}</option>
                        {allowSingleIssue && <option value="issue">{t("agentAccessUi.trust.issue")}</option>}
                      </select>
                    </Field>
                    <Field label={boundaryTargetLabels[targetType]}>
                      <select
                        className={inputClass}
                        value={boundaryValue}
                        onChange={(event) => handleBoundaryTargetChange(event.target.value)}
                        disabled={disabled || !companyId || candidatesLoading || targetCandidates.length === 0}
                      >
                        <option value="">
                          {candidatesLoading
                            ? t("agentAccessUi.trust.loading")
                            : targetCandidates.length === 0
                              ? targetType === "project" ? t("agentAccessUi.trust.noProjects") : t("agentAccessUi.trust.noIssues")
                              : t("agentAccessUi.trust.selectBoundary")}
                        </option>
                        {targetCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {t("agentAccessUi.trust.ceHint")}
                    </p>
                    {boundaryTarget ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={handleClearBoundary}
                        disabled={disabled}
                      >
                        {t("agentAccessUi.trust.clearBoundary")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-background/70 p-3 text-foreground">
                  <p className="text-sm font-medium">{t("agentAccessUi.trust.managed")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("agentAccessUi.trust.managedHint", { count: countBoundaryTargets(boundary) })}
                  </p>
                </div>
              )}
              {!projectAccessEditor && <p className="text-xs text-muted-foreground">
                <Trans i18nKey="agentAccessUi.trust.moreBoundaries" components={{
                  ee: <a className="underline underline-offset-2 hover:text-foreground" href="https://paperclip.ing/ee" target="_blank" rel="noreferrer" />,
                }} />
              </p>}
              <CollapsibleSection
                title={t("agentAccessUi.trust.viewPolicy")}
                open={policyOpen}
                onToggle={() => setPolicyOpen((open) => !open)}
              >
                <div className="divide-y divide-border/60 text-foreground">
                  <PolicyRow label={t("agentAccessUi.trust.policyPreset")} value={t("agentAccessUi.trust.policyPresetValue")} />
                  <PolicyRow label={t("agentAccessUi.trust.rawOutput")} value={t("agentAccessUi.trust.rawOutputValue")} />
                  <PolicyRow label={t("agentAccessUi.trust.projects")} value={boundary?.projectIds?.length ? t("agentAccessUi.trust.projectCount", { count: boundary.projectIds.length }) : "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.rootIssue")} value={boundary?.rootIssueId ? boundary.rootIssueId.slice(0, 8) : "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.explicitIssues")} value={boundary?.issueIds?.length ? t("agentAccessUi.trust.issueCount", { count: boundary.issueIds.length }) : "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.allowedAgents")} value={boundary?.allowedAgentIds?.length ? t("agentAccessUi.trust.agentCount", { count: boundary.allowedAgentIds.length }) : "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.allowedTools")} value={boundary?.allowedToolClasses?.join(" · ") || "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.allowedSecrets")} value={boundary?.allowedSecretBindingIds?.length ? t("agentAccessUi.trust.bindingCount", { count: boundary.allowedSecretBindingIds.length }) : "-"} />
                  <PolicyRow label={t("agentAccessUi.trust.promotionTarget")} value={boundary?.outputPromotionTarget?.issueId?.slice(0, 8) ?? "-"} />
                  <PolicyRow
                    label={t("agentAccessUi.trust.eeFields")}
                    value={Object.keys(policy ?? {}).some((key) => !["trustPreset", "reviewPreset", "trustBoundary"].includes(key))
                      ? t("agentAccessUi.trust.eeFieldsPreserved")
                      : "-"}
                  />
                </div>
              </CollapsibleSection>
            </div>
          </div>
        ) : null}

        {lowTrust && projectAccessEditor}

        {managedPermissions.authorizationPolicy?.reviewPreset ? null : (
          <p className="text-xs text-muted-foreground">
            {t("agentAccessUi.trust.advancedHint")}
          </p>
        )}
      </div>
    </div>
  );
}
