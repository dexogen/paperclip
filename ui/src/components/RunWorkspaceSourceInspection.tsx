import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import { useMutation } from "@tanstack/react-query";
import { ENVIRONMENT_LEASE_POLICIES, WORKSPACE_SOURCE_VERIFICATION_REASONS } from "@paperclipai/shared";
import { issuesApi } from "../api/issues";
import { Button } from "./ui/button";
import { formatDateTime } from "../lib/utils";
import { WorkspaceExportRecovery } from "./WorkspaceExportRecovery";

function recordedFailure(evidence: Record<string, unknown>): string {
  const recovery = evidence.systemRecovery;
  if (!recovery || typeof recovery !== "object" || !("failure" in recovery)) return "No recorded system recovery failure.";
  const failure = recovery.failure;
  if (!failure || typeof failure !== "object" || !("code" in failure) || typeof failure.code !== "string")
    return "No recorded system recovery failure.";
  const detail = "sourceVerification" in failure ? failure.sourceVerification : null;
  if (!detail || typeof detail !== "object" || !("reason" in detail) || typeof detail.reason !== "string" ||
    !(WORKSPACE_SOURCE_VERIFICATION_REASONS as readonly string[]).includes(detail.reason)) return failure.code;
  const policy = "observedLeasePolicy" in detail ? detail.observedLeasePolicy : null;
  const allowedPolicy = typeof policy === "string" &&
    (policy === "unrecognized" || (ENVIRONMENT_LEASE_POLICIES as readonly string[]).includes(policy));
  return [failure.code, detail.reason, ...(allowedPolicy ? [`lease policy ${policy}`] : [])].join(" · ");
}

export function RunWorkspaceSourceInspection({ issueId, runId, companyId }: { issueId: string; runId: string; companyId: string }) {
  useUiTranslation();
  const listing = useMutation({ mutationFn: () => issuesApi.recoveryActions(issueId, { runId }) });
  const inspection = useMutation({ mutationFn: (actionId: string) => issuesApi.recoveryActions(issueId, { runId, actionId }) });
  const pending = listing.isPending || inspection.isPending;
  const error = listing.error ?? inspection.error;
  const current = inspection.data?.sourceInspection;
  return (
    <div className="space-y-2" data-testid="run-workspace-source-inspection">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => { inspection.reset(); listing.mutate(); }}>
        {pending ? translateUi("interfaceUpdates.inspecting_recovery_d0e50e17") : translateUi("interfaceUpdates.inspect_recovery_dec40ea6")}
      </Button>
      {error ? <p role="alert" className="text-xs text-destructive">
        {error instanceof Error ? error.message : translateUi("interfaceUpdates.recovery_inspection_failed_try_inspecting_again_5a03f7e0")}
      </p> : null}
      {listing.data?.actions.length === 0 ? <p className="text-xs text-muted-foreground">{translateUi("interfaceUpdates.no_recorded_recovery_action_for_this_run_4de95c98")}</p> : null}
      {listing.data?.actions.map(action => (
        <div key={action.id} className="space-y-2 text-xs">
          <p>{translateUi("interfaceUpdates.recorded_failure_7431650b")} <code className="font-mono">{recordedFailure(action.evidence)}</code></p>
          <p className="font-mono text-muted-foreground">{action.id} · {action.status}</p>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => inspection.mutate(action.id)}>
            {translateUi("interfaceUpdates.inspect_current_source_c9d0068f")}
          </Button>
          {action.evidence.runId === runId ? <WorkspaceExportRecovery action={action}
            issueId={issueId} companyId={companyId} showStatus={false} /> : null}
        </div>
      ))}
      {current ? <div className="space-y-2 text-xs" role="status">
        <p className="font-medium">{translateUi("interfaceUpdates.current_recorded_source_identity_3e500d99")}</p>
        <p className="font-mono text-muted-foreground">{translateUi("runUi.inspector.action")} {current.actionId}</p>
        <p className="text-muted-foreground">{translateUi("interfaceUpdates.this_read_only_observation_checks_recorded_identit_652889e2")}</p>
        {current.status === "verified" ? <p>{translateUi("interfaceUpdates.recorded_source_identity_verified_0db2db4d")}</p>
          : current.status === "not_inspected" ? <p>{translateUi("interfaceUpdates.source_not_inspected_this_record_exceeds_the_inspe_f5ae2713")}</p>
          : <p>{translateUi("interfaceUpdates.blocked_3e75b484")} <code className="font-mono">{current.sourceVerification?.reason ?? current.failureCode}</code>
            {current.sourceVerification?.observedLeasePolicy ? <> {translateUi("interfaceUpdates.lease_policy_30e31761")} <code className="font-mono">{current.sourceVerification.observedLeasePolicy}</code></> : null}</p>}
        <p className="font-mono text-muted-foreground">{translateUi("projectConfigUi.budget.observed")} {formatDateTime(current.observedAt)}</p>
      </div> : null}
    </div>
  );
}
