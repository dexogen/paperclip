// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import {
  getTrustPresetLabels,
  getTrustPresetDescriptions,
  TRUST_PRESET_LABELS,
  TRUST_PRESET_DESCRIPTIONS,
  buildPermissionsForTrustPreset,
  clearSingleLowTrustBoundaryTarget,
  getLowTrustBoundary,
  getSingleLowTrustBoundaryTarget,
  isCeLowTrustBoundaryEditable,
  setSingleLowTrustBoundaryTarget,
  summarizeLowTrustBoundaryTarget,
} from "./trust-policy-ui";

describe("trust-policy-ui low-trust boundary helpers", () => {
  it("drops hire authority when switching to the low-trust preset", () => {
    const demoted = buildPermissionsForTrustPreset(
      { canCreateAgents: true, canCreateSkills: true },
      "low_trust_review",
    );
    expect(demoted.canCreateAgents).toBe(false);
    expect(demoted.canCreateSkills).toBe(true);

    const restored = buildPermissionsForTrustPreset(demoted, "standard");
    expect(restored.canCreateAgents).toBe(false);
    expect(restored.trustPreset).toBe("standard");
  });

  it("clears containment across a JSON permissions patch when restoring standard trust", () => {
    const lowTrust = setSingleLowTrustBoundaryTarget(null, "company-1", { type: "root_issue", id: "issue-1" });
    const patch = JSON.parse(JSON.stringify(buildPermissionsForTrustPreset(lowTrust, "standard")));
    const persisted = { ...lowTrust, ...patch };
    expect(persisted.trustPreset).toBe("standard");
    expect(persisted.authorizationPolicy).toEqual({});
    expect(getLowTrustBoundary(persisted)).toBeNull();
  });

  it("writes one project boundary with mode and company id", () => {
    const permissions = setSingleLowTrustBoundaryTarget(null, "company-1", {
      type: "project",
      id: "project-1",
    });

    expect(permissions).toMatchObject({
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustPreset: "low_trust_review",
        reviewPreset: {
          id: "low_trust_review",
          version: 1,
          rawOutputDisposition: "quarantine",
        },
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          projectIds: ["project-1"],
        },
      },
    });
  });

  it("clears other scope fields while preserving non-scope policy fields", () => {
    const permissions = setSingleLowTrustBoundaryTarget(
      {
        trustPreset: "low_trust_review",
        authorizationPolicy: {
          customEeField: { mode: "preserved" },
          trustBoundary: {
            mode: "low_trust_review",
            companyId: "company-1",
            projectIds: ["project-1"],
            rootIssueId: "root-1",
            issueIds: ["issue-1"],
            allowedToolClasses: ["git.read"],
          },
        },
      },
      "company-2",
      { type: "issue", id: "issue-2" },
    );

    expect(permissions.authorizationPolicy).toMatchObject({
      customEeField: { mode: "preserved" },
      trustBoundary: {
        mode: "low_trust_review",
        companyId: "company-2",
        issueIds: ["issue-2"],
        allowedToolClasses: ["git.read"],
      },
    });
    expect(permissions.authorizationPolicy?.trustBoundary?.projectIds).toBeUndefined();
    expect(permissions.authorizationPolicy?.trustBoundary?.rootIssueId).toBeUndefined();
  });

  it("hydrates one existing root issue boundary", () => {
    const boundary = getLowTrustBoundary({
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          rootIssueId: "issue-root",
        },
      },
    });

    expect(getSingleLowTrustBoundaryTarget(boundary)).toEqual({ type: "root_issue", id: "issue-root" });
    expect(summarizeLowTrustBoundaryTarget(boundary)).toBe("Root issue issue-ro");
  });

  it("marks multi-boundary policies read-only for CE", () => {
    const boundary = {
      mode: "low_trust_review" as const,
      companyId: "company-1",
      projectIds: ["project-1", "project-2"],
    };

    expect(isCeLowTrustBoundaryEditable(boundary)).toBe(false);
    expect(getSingleLowTrustBoundaryTarget(boundary)).toBeNull();
    expect(summarizeLowTrustBoundaryTarget(boundary)).toBe("2 boundaries");
  });

  it("clears the CE boundary without removing non-scope fields", () => {
    const permissions = clearSingleLowTrustBoundaryTarget({
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          issueIds: ["issue-1"],
          allowedSecretBindingIds: ["binding-1"],
        },
      },
    });

    expect(permissions.authorizationPolicy?.trustBoundary).toEqual({
      mode: "low_trust_review",
      companyId: "company-1",
      allowedSecretBindingIds: ["binding-1"],
    });
  });
});


afterEach(async () => { await i18n.changeLanguage("en"); });

it("keeps legacy English labels under a Russian UI and localizes only requested presentation", async () => {
  const permissions = setSingleLowTrustBoundaryTarget(null, "company-1", { type: "project", id: "project-1" });
  const before = JSON.stringify(permissions);
  const labels = { ...TRUST_PRESET_LABELS };
  const descriptions = { ...TRUST_PRESET_DESCRIPTIONS };
  await i18n.changeLanguage("ru");
  expect(TRUST_PRESET_LABELS).toEqual({ standard: "Standard", low_trust_review: "Low-trust review" });
  expect(TRUST_PRESET_DESCRIPTIONS).toEqual(descriptions);
  expect(getTrustPresetLabels()).toEqual(TRUST_PRESET_LABELS);
  expect(getTrustPresetDescriptions()).toEqual(TRUST_PRESET_DESCRIPTIONS);
  expect(getTrustPresetLabels(i18n.getFixedT("ru"))).toEqual({ standard: "Стандартный", low_trust_review: "Проверка с ограниченным доверием" });
  expect(getTrustPresetDescriptions(i18n.getFixedT("ru")).low_trust_review).toContain("Доступ к API Paperclip сужен");
  expect(summarizeLowTrustBoundaryTarget(getLowTrustBoundary(permissions))).toBe("Project project-");
  expect(JSON.stringify(permissions)).toBe(before);
  await i18n.changeLanguage("en");
  expect(TRUST_PRESET_LABELS).toEqual(labels);
  expect(TRUST_PRESET_DESCRIPTIONS).toEqual(descriptions);
});
