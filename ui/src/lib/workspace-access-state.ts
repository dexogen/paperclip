import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT } from "@/i18n";
import type {
  WorkspaceOperation,
  WorkspaceReadiness,
  WorkspaceReadinessState,
  WorkspaceRuntimeService,
} from "@paperclipai/shared";

/**
 * Derives the workspace access state the UI shows (PAP-17572).
 *
 * The board cannot read a cloned workspace's protected health directly, so state
 * comes from three server-side facts it *can* see: the live runtime rows, the
 * workspace operation log, and the readiness the control plane reported when it
 * last tried to mint a login handoff.
 *
 * Every state carries one concrete next action. The failure this replaces was a
 * generic "Load failed" (or worse, a green badge) that told an operator nothing
 * about whether to wait, start, repair, or read a log.
 */

export type WorkspaceAccessActionKind =
  | "open"
  | "start"
  | "repair"
  | "view_logs"
  /** Nothing to do but wait for a running operation. */
  | "wait";

export type WorkspaceAccessAction = {
  kind: WorkspaceAccessActionKind;
  label: string;
};

export type WorkspaceAccessNotice = {
  title: string;
  description: string;
  action: WorkspaceAccessAction;
};

export type WorkspaceAccessDisplayState = WorkspaceReadinessState | "stopped";

export type WorkspaceAccessState = {
  state: WorkspaceAccessDisplayState;
  title: string;
  description: string;
  action: WorkspaceAccessAction;
  /** True when a password-independent handoff is the expected way in. */
  handoffAvailable: boolean;
  /** A non-blocking historical failure that is still useful to inspect. */
  secondaryNotice?: WorkspaceAccessNotice;
};

/** What the control plane said the last time a handoff was requested. */
export type WorkspaceLoginHandoffFailureInfo = {
  reason: string;
  detail?: string | null;
  readiness?: WorkspaceReadiness | null;
};

function latestOperation(operations: WorkspaceOperation[], phase: WorkspaceOperation["phase"]) {
  return operations.find((operation) => operation.phase === phase) ?? null;
}

function describeSeedPhase(readiness: WorkspaceReadiness | null | undefined): string | null {
  if (!readiness?.failurePhase && !readiness?.seedPhase) return null;
  return readiness.failurePhase ?? readiness.seedPhase ?? null;
}

function timestampMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function failedRepairNotice(repair: WorkspaceOperation): WorkspaceAccessNotice {
  const phase = typeof repair.metadata?.repairPhase === "string" ? repair.metadata.repairPhase : null;
  return {
    title: fullSharedT("taskDetail.copy.repairFailed"),
    description: phase
      ? fullSharedT("fullShared.the_repair_stopped_during_the_pre_repair_backup_was__8f8545", { value1: phase })
      : fullSharedT("fullShared.the_repair_stopped_before_the_workspace_became_usabl_0f1157"),
    action: { kind: "view_logs", label: fullSharedT("fullShared.view_repair_log_bb0e22") },
  };
}

function failedProvisionNotice(provision: WorkspaceOperation): WorkspaceAccessNotice {
  const phase = typeof provision.metadata?.seedFailurePhase === "string"
    ? provision.metadata.seedFailurePhase
    : null;
  return {
    title: fullSharedT("fullShared.database_provisioning_failed_7774e3"),
    description: phase
      ? fullSharedT("fullShared.the_earlier_clone_attempt_failed_during_the_workspac_072cd0", { value1: phase })
      : fullSharedT("fullShared.an_earlier_clone_attempt_failed_but_the_workspace_la_704021"),
    action: { kind: "view_logs", label: fullSharedT("fullShared.view_provisioning_log_0b151b") },
  };
}

const HANDOFF_REASON_COPY: Record<string, string> = {
  get handoff_not_configured() { return fullSharedTailT("fullSharedTail.workspace_handoff_not_configured"); },
  get no_board_identity() { return fullSharedTailT("fullSharedTail.workspace_no_board_identity"); },
  get runtime_not_running() { return fullSharedTailT("fullSharedTail.workspace_runtime_not_running"); },
  get runtime_url_unusable() { return fullSharedTailT("fullSharedTail.workspace_runtime_url_unusable"); },
  get workspace_not_ready() { return fullSharedTailT("fullSharedTail.workspace_workspace_not_ready"); },
};

const READINESS_FAILURE_COPY: Record<string, string> = {
  get database_unreachable() { return fullSharedTailT("fullSharedTail.workspace_database_unreachable"); },
  get clone_data_missing() { return fullSharedTailT("fullSharedTail.workspace_clone_data_missing"); },
  get clone_data_unreadable() { return fullSharedTailT("fullSharedTail.workspace_clone_data_unreadable"); },
  get cloned_membership_missing() { return fullSharedTailT("fullSharedTail.workspace_cloned_membership_missing"); },
  get cloned_identity_unreadable() { return fullSharedTailT("fullSharedTail.workspace_cloned_identity_unreadable"); },
  get auth_handoff_not_configured() { return fullSharedTailT("fullSharedTail.workspace_auth_handoff_not_configured"); },
  get seed_manifest_unreadable() { return fullSharedTailT("fullSharedTail.workspace_seed_manifest_unreadable"); },
};

/**
 * Human cause for a readiness rejection, preferring the specific recorded phase
 * over a generic sentence so the copy names what to fix.
 */
export function describeWorkspaceReadinessCause(
  failure: WorkspaceLoginHandoffFailureInfo | null | undefined,
): string | null {
  if (!failure) return null;
  const phase = describeSeedPhase(failure.readiness);
  if (phase && READINESS_FAILURE_COPY[phase]) return READINESS_FAILURE_COPY[phase];
  if (phase) return fullSharedTailT("fullSharedTail.lastPhase", { phase });
  if (failure.detail && READINESS_FAILURE_COPY[failure.detail]) return READINESS_FAILURE_COPY[failure.detail];
  return HANDOFF_REASON_COPY[failure.reason] ?? null;
}

export function resolveWorkspaceAccessState(input: {
  runtimeServices: WorkspaceRuntimeService[] | null | undefined;
  operations: WorkspaceOperation[] | null | undefined;
  handoffFailure?: WorkspaceLoginHandoffFailureInfo | null;
}): WorkspaceAccessState {
  const operations = input.operations ?? [];
  const runtimeServices = input.runtimeServices ?? [];
  const repair = latestOperation(operations, "workspace_repair");
  const provision =
    latestOperation(operations, "workspace_seed")
    ?? latestOperation(operations, "workspace_runtime_provision")
    ?? latestOperation(operations, "workspace_provision");
  const failure = input.handoffFailure ?? null;
  const cause = describeWorkspaceReadinessCause(failure);
  const handoffAvailable = failure?.reason !== "handoff_not_configured" && failure?.reason !== "no_board_identity";
  const servingService = runtimeServices.find(
    (service) => service.status === "running" && service.healthStatus === "healthy" && service.url,
  );
  const startingService = runtimeServices.find(
    (service) => service.status === "provisioning" || service.status === "starting",
  );
  const repairFinishedAt = timestampMs(repair?.finishedAt);
  const servingServiceStartedAt = timestampMs(servingService?.startedAt);
  const provisionFinishedAt = timestampMs(provision?.finishedAt);
  const readinessConfirmsServing = Boolean(servingService && failure?.readiness?.state === "ready");
  const runtimeStartedAfterRepair = repairFinishedAt !== null
    && servingServiceStartedAt !== null
    && repairFinishedAt < servingServiceStartedAt;
  const repairFailureWasSuperseded = repair?.status === "failed" && Boolean(
    servingService
    && (readinessConfirmsServing || runtimeStartedAfterRepair),
  );
  const successfulRepairFinishedAt = repair?.status === "succeeded"
    ? timestampMs(repair.finishedAt)
    : null;
  // A failed seed is historical once the workspace is demonstrably serving,
  // or once a later repair has replaced and revalidated that database.
  const provisionFailureWasSuperseded = provision?.status === "failed" && Boolean(
    servingService
    || (
      provisionFinishedAt !== null
      && successfulRepairFinishedAt !== null
      && provisionFinishedAt < successfulRepairFinishedAt
    ),
  );
  const secondaryNotice = repair?.status === "failed" && repairFailureWasSuperseded
    ? failedRepairNotice(repair)
    : provision?.status === "failed" && provisionFailureWasSuperseded
      ? failedProvisionNotice(provision)
      : undefined;

  // A live repair outranks everything: it is already changing the answer.
  if (repair?.status === "running") {
    const phase = typeof repair.metadata?.repairPhase === "string" ? repair.metadata.repairPhase : null;
    return {
      state: "repairing",
      title: fullSharedT("fullShared.repairing_workspace_database_a27574"),
      description: phase
        ? fullSharedT("fullShared.only_the_isolated_database_is_replaced_the_git_workt_16b832", { value1: phase })
        : fullSharedT("fullShared.only_the_isolated_database_is_replaced_the_git_workt_f9d0a2"),
      action: { kind: "wait", label: fullSharedT("fullShared.repair_in_progress_4b2595") },
      handoffAvailable,
    };
  }
  if (repair?.status === "failed" && !repairFailureWasSuperseded) {
    const notice = failedRepairNotice(repair);
    return {
      state: "failed",
      ...notice,
      handoffAvailable,
    };
  }

  if (provision?.status === "running") {
    return {
      state: "provisioning",
      title: fullSharedT("fullShared.provisioning_database_1eb904"),
      description: fullSharedT("fullShared.restoring_the_isolated_database_clone_for_this_works_c34f6e"),
      action: { kind: "wait", label: fullSharedT("fullShared.provisioning_c2b1b8") },
      handoffAvailable,
    };
  }
  if (provision?.status === "failed" && !provisionFailureWasSuperseded) {
    const seedPhase = typeof provision.metadata?.seedFailurePhase === "string"
      ? provision.metadata.seedFailurePhase
      : null;
    return {
      state: "failed",
      title: fullSharedT("fullShared.database_provisioning_failed_7774e3"),
      description: seedPhase
        ? fullSharedT("fullShared.the_clone_failed_during_repairing_replaces_only_the__88e6ef", { value1: seedPhase })
        : fullSharedT("fullShared.the_clone_did_not_finish_so_this_workspace_has_no_us_82d05f"),
      action: { kind: "repair", label: fullSharedT("runUi.recovery.repairTitle") },
      handoffAvailable,
    };
  }

  // Readiness the control plane actually observed beats anything inferred from
  // runtime rows, because it is the only signal that looked inside the clone.
  const staleNotReadyFailure = failure?.reason === "workspace_not_ready" && readinessConfirmsServing;
  if (failure && !staleNotReadyFailure) {
    if (failure.reason === "runtime_not_running" && !servingService && !startingService) {
      return {
        state: "stopped",
        title: fullSharedT("fullShared.workspace_is_not_running_992fec"),
        description: fullSharedT("fullShared.start_the_workspace_runtime_to_publish_its_board_904641"),
        action: { kind: "start", label: fullSharedT("fullShared.start_workspace_0e6b0b") },
        handoffAvailable,
      };
    }
    if (failure.reason === "workspace_not_ready" || failure.reason === "runtime_url_unusable") {
      const readinessState = failure.readiness?.state;
      const validating = readinessState === "validating" || readinessState === "provisioning";
      return {
        state: validating ? "validating" : "degraded",
        title: validating ? fullSharedT("fullShared.validating_clone_d86d50") : fullSharedT("fullShared.workspace_is_degraded_f238ba"),
        description: [
          cause ?? fullSharedT("fullShared.the_workspace_is_serving_but_its_clone_did_not_pass__835a6b"),
          validating ? fullSharedT("fullShared.paperclip_is_still_confirming_the_clone_540116") : fullSharedT("fullShared.one_bounded_repair_replaces_the_isolated_database_5ccf3f"),
        ].join(" "),
        action: validating
          ? { kind: "wait", label: fullSharedT("fullShared.validating_5a1a16") }
          : { kind: "repair", label: fullSharedT("runUi.recovery.repairTitle") },
        handoffAvailable,
      };
    }
    if (!handoffAvailable) {
      return {
        state: servingService ? "ready" : "degraded",
        title: servingService ? fullSharedT("fullShared.ready_snapshot_local_sign_in_3eea98") : fullSharedT("fullShared.workspace_is_degraded_f238ba"),
        description: cause ?? fullSharedT("fullShared.opening_the_board_will_ask_for_the_credentials_captu_f2195e"),
        action: servingService
          ? { kind: "open", label: fullSharedT("fullShared.open_workspace_b3e34b") }
          : { kind: "start", label: fullSharedT("fullShared.start_workspace_0e6b0b") },
        handoffAvailable: false,
        secondaryNotice,
      };
    }
  }

  if (startingService) {
    return {
      state: "provisioning",
      title: fullSharedT("fullShared.workspace_is_starting_456567"),
      description: fullSharedT("fullShared.paperclip_is_starting_the_workspace_runtime_and_wait_eef837"),
      action: { kind: "wait", label: fullSharedT("fullShared.starting_workspace_7212fa") },
      handoffAvailable,
    };
  }

  if (servingService) {
    return {
      state: "ready",
      title: fullSharedT("instanceGeneral.ready"),
      description: fullSharedT("fullShared.opening_the_workspace_signs_you_in_to_the_cloned_boa_b73224"),
      action: { kind: "open", label: fullSharedT("fullShared.open_workspace_b3e34b") },
      handoffAvailable,
      secondaryNotice,
    };
  }

  const unhealthyService = runtimeServices.find(
    (service) => service.status === "running" && service.healthStatus !== "healthy",
  );
  if (unhealthyService) {
    return {
      state: "degraded",
      title: fullSharedT("fullShared.workspace_is_degraded_f238ba"),
      description: cause
        ?? fullSharedT("fullShared.the_runtime_is_up_but_did_not_report_a_usable_databa_059c98"),
      action: { kind: "repair", label: fullSharedT("runUi.recovery.repairTitle") },
      handoffAvailable,
    };
  }

  return {
    state: "stopped",
    title: fullSharedT("fullShared.workspace_is_not_running_992fec"),
    description: fullSharedT("fullShared.start_the_workspace_runtime_to_publish_its_board_904641"),
    action: { kind: "start", label: fullSharedT("fullShared.start_workspace_0e6b0b") },
    handoffAvailable,
  };
}
