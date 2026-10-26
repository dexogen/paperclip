import { describe, expect, it } from "vitest";
import { executionWorkspaceCloseReadinessSchema } from "./index.js";

const legacy = {
  workspaceId: "2cf0e3a4-5d62-43e3-a3a3-67d3c87f59de", deliveryState: "unknown", state: "ready_with_warnings",
  blockingReasons: [], warnings: ["Provider <b>raw</b>", "The workspace has 2 untracked files."],
  linkedIssues: [], plannedActions: [{ kind: "archive_record", label: "Archive workspace record", description: "Original description", command: null }],
  isDestructiveCloseAllowed: true, isSharedWorkspace: false, isProjectPrimaryWorkspace: false,
  git: null, runtimeServices: [],
};

describe("workspace close response display contract", () => {
  it("keeps the legacy response valid and preserves optional additive descriptors", () => {
    expect(executionWorkspaceCloseReadinessSchema.parse(legacy)).toEqual(legacy);
    const response = {
      ...legacy,
      messageDescriptors: { blockingReasons: [], warnings: [{ index: 1, message: { code: "untracked_files", params: { count: 2 } } }] },
      plannedActions: [{ ...legacy.plannedActions[0], display: { code: "archive_record" } }],
    };
    expect(executionWorkspaceCloseReadinessSchema.parse(response)).toEqual(response);
    expect(response.warnings).toEqual(legacy.warnings);
  });

  it("rejects invalid indexes, nonnumeric counts and unknown owned codes", () => {
    for (const entry of [
      { index: -1, message: { code: "no_local_path" } },
      { index: 0.5, message: { code: "no_local_path" } },
      { index: 0, message: { code: "future_code" } },
      { index: 0, message: { code: "untracked_files", params: { count: "2" } } },
      { index: 0, message: { code: "git_status_failed", params: { path: "/tmp", error: null } } },
    ]) {
      expect(executionWorkspaceCloseReadinessSchema.safeParse({
        ...legacy, messageDescriptors: { blockingReasons: [], warnings: [entry] },
      }).success).toBe(false);
    }
  });

  it("preserves literal paths, nullable base refs and action parameters", () => {
    const response = {
      ...legacy,
      messageDescriptors: { blockingReasons: [], warnings: [
        { index: 0, message: { code: "git_status_failed", params: { path: "/tmp/<b>raw</b>", error: "provider raw" } } },
        { index: 1, message: { code: "ahead", params: { count: 21, baseRef: null } } },
      ] },
      plannedActions: [{ kind: "stop_runtime_services", label: "original", description: "original", command: null,
        display: { code: "stop_runtime_services", params: { count: 1, serviceName: "web <b>raw</b>" } } }],
    };
    expect(executionWorkspaceCloseReadinessSchema.parse(response)).toEqual(response);
  });
});
