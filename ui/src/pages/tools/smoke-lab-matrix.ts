import { t as fullAppsT } from "@/i18n";
import {
  SMOKE_RUN_STEP_PATHS,
  type SmokeRun,
  type SmokeRunStep,
  type SmokeRunStepPath,
  type SmokeRunStepStatus,
} from "@paperclipai/shared";

/**
 * Pure matrix/health helpers for the Smoke Lab tab (PAP-13347 / S2, plan §D3).
 * Kept free of React so the cell/health logic is unit-testable on its own.
 *
 * The integration matrix is the plan §3 table: rows are the seven paths
 * (P1–P7), columns are the PAP-12373 governed lifecycle. Each recorded step
 * carries a free-form `scenarioStep` string owned by the S4 catalog; we fold it
 * onto a canonical lifecycle stage by keyword so the matrix stays a stable
 * 7×8 grid no matter how S4 words its steps. Raw `scenarioStep` values are
 * always shown verbatim in the run drill-down, so nothing is hidden.
 */

export const SMOKE_PATH_LABELS: Record<SmokeRunStepPath, { title: string; detail: string }> = {
  P1: { get title() { return fullAppsT("fullApps.remote_http_oauth_d454ee"); }, get detail() { return fullAppsT("fullApps.http_mcp_fixture_behind_the_fake_oauth_provider_aa7e88"); } },
  P2: { get title() { return fullAppsT("fullApps.remote_http_api_key_8f973a"); }, get detail() { return fullAppsT("fullApps.http_mcp_fixture_with_a_static_bearer_key_920c34"); } },
  P3: { get title() { return fullAppsT("fullApps.local_stdio_template_6c513e"); }, get detail() { return fullAppsT("fullApps.stdio_fixture_via_the_runtime_supervisor_5fde46"); } },
  P4: { get title() { return fullAppsT("fullApps.plugin_integration_d16a5e"); }, get detail() { return fullAppsT("fullApps.plugin_provided_catalog_entry_install_flow_0c29bc"); } },
  P5: { get title() { return fullAppsT("fullApps.paste_a_config_import_6c5d14"); }, get detail() { return fullAppsT("fullApps.prosumer_import_via_advanced_setup_5d868f"); } },
  P6: { get title() { return fullAppsT("fullApps.token_broker_gateway_956ed6"); }, get detail() { return fullAppsT("fullApps.run_scoped_connection_token_ttl_scope_checks_1eb1ef"); } },
  P7: { get title() { return fullAppsT("fullApps.governance_surfaces_d4f862"); }, get detail() { return fullAppsT("fullApps.profiles_ask_first_rules_quarantine_3958b9"); } },
};

export interface LifecycleStage {
  key: string;
  label: string;
  /** Keywords (lowercased) that fold a `scenarioStep` onto this stage. */
  match: string[];
}

/** The PAP-12373 governed lifecycle, in order (plan §3). */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  { key: "connect", get label() { return fullAppsT("fullApps.connect_1a2303"); }, match: ["connect", "oauth", "login", "auth"] },
  { key: "discover", get label() { return fullAppsT("fullApps.discover_catalog_816990"); }, match: ["discover", "catalog", "list-tools"] },
  { key: "read", get label() { return fullAppsT("fullApps.allowed_read_c4e65f"); }, match: ["read", "allowed"] },
  { key: "write", get label() { return fullAppsT("fullApps.ask_first_write_5fe97d"); }, match: ["write", "approve", "ask-first", "askfirst", "review"] },
  { key: "deny", get label() { return fullAppsT("fullApps.denied_call_a60746"); }, match: ["deny", "denied", "block", "forbidden"] },
  { key: "quarantine", get label() { return fullAppsT("fullApps.schema_change_quarantine_679816"); }, match: ["quarantine", "schema"] },
  { key: "revoke", get label() { return fullAppsT("taskProperties.share.revoke"); }, match: ["revoke"] },
  { key: "audit", get label() { return fullAppsT("fullApps.audit_evidence_74dbcf"); }, match: ["audit", "activity", "evidence"] },
];

/** Fold a free-form scenario step onto a canonical lifecycle stage, or null. */
export function matchLifecycleStage(scenarioStep: string): string | null {
  const s = scenarioStep.toLowerCase();
  for (const stage of LIFECYCLE_STAGES) {
    if (stage.match.some((kw) => s.includes(kw))) return stage.key;
  }
  return null;
}

export type CellStatus = SmokeRunStepStatus | "not-run";

function stepTime(step: SmokeRunStep): number {
  const raw = step.updatedAt ?? step.createdAt;
  const t = new Date(raw as string | Date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Latest status per (path, stage) cell across the given steps. Later steps win
 * so a matrix always reflects the most recent attempt at each cell.
 */
export function buildSmokeMatrix(steps: SmokeRunStep[]): Map<string, { status: CellStatus; step: SmokeRunStep }> {
  const cells = new Map<string, { status: CellStatus; step: SmokeRunStep }>();
  const ordered = [...steps].sort((a, b) => stepTime(a) - stepTime(b));
  for (const step of ordered) {
    const stage = matchLifecycleStage(step.scenarioStep);
    if (!stage) continue;
    cells.set(`${step.path}::${stage}`, { status: step.status, step });
  }
  return cells;
}

export function cellKey(path: SmokeRunStepPath, stageKey: string): string {
  return `${path}::${stageKey}`;
}

export const SMOKE_PATHS = SMOKE_RUN_STEP_PATHS;

export type SmokeHealth = "green" | "amber" | "red" | "unknown";

/** Overall traffic-light for a run: red on any failure, amber if unfinished/empty. */
export function runHealth(run: SmokeRun | undefined, steps: SmokeRunStep[]): SmokeHealth {
  if (!run) return "unknown";
  if (run.status === "failed") return "red";
  if (steps.some((s) => s.status === "fail")) return "red";
  if (run.summary.partial === true) return "amber";
  if (run.status === "cancelled") return "amber";
  if (run.status === "running") return "amber";
  if (steps.length === 0) return "amber";
  return "green";
}

/** Paths with at least one failing step in the given run. */
export function failingPaths(steps: SmokeRunStep[]): SmokeRunStepPath[] {
  const failed = new Set<SmokeRunStepPath>();
  for (const step of steps) {
    if (step.status === "fail") failed.add(step.path);
  }
  return SMOKE_RUN_STEP_PATHS.filter((p) => failed.has(p));
}
