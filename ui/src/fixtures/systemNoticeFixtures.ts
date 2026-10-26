import { t } from "@/i18n";
import { t as fullSharedT } from "@/i18n";
import type {
  SystemNoticeMetadataSection,
  SystemNoticeProps,
} from "../components/SystemNotice";

export type SystemNoticeFixture = {
  id: string;
  caption: string;
} & SystemNoticeProps;

const HANDOFF_METADATA: SystemNoticeMetadataSection[] = [
  {
    get title() { return fullSharedT("runUi.recovery.recoveryOwner"); },
    rows: [
      {
        kind: "issue",
        get label() { return t("fullDiagnostics.recoveryIssue"); },
        identifier: "PAP-3440",
        href: "/PAP/issues/PAP-3440",
        get title() { return t("fullDiagnostics.successfulRunHandoffMissingDisposition"); },
      },
      {
        kind: "agent",
        get label() { return fullSharedT("fullShared.owner_4b1b8a"); },
        name: "CTO",
        href: "/PAP/agents/cto",
      },
      {
        kind: "text",
        get label() { return t("fullDiagnostics.suggestedAction"); },
        value: "Reassign to a recovery agent and pick a disposition.",
      },
    ],
  },
  {
    get title() { return t("fullDiagnostics.runEvidence"); },
    rows: [
      {
        kind: "run",
        get label() { return fullSharedT("runUi.recovery.sourceRun"); },
        runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
        href: "/PAP/agents/codexcoder/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
        status: "succeeded",
      },
      {
        kind: "run",
        get label() { return t("fullDiagnostics.recoveryRun"); },
        runId: "61fdb79b-8012-4676-ac71-2971830e126a",
        href: "/PAP/agents/codexcoder/runs/61fdb79b-8012-4676-ac71-2971830e126a",
        status: "failed",
      },
      {
        kind: "text",
        get label() { return t("fullDiagnostics.normalizedCause"); },
        value: "Run completed without issuing a disposition for an in_progress task.",
      },
    ],
  },
];

const REQUIRED_METADATA: SystemNoticeMetadataSection[] = [
  {
    get title() { return t("fullDiagnostics.requiredAction"); },
    rows: [
      {
        kind: "issue",
        get label() { return t("fullDiagnostics.sourceIssue"); },
        identifier: "PAP-3440",
        href: "/PAP/issues/PAP-3440",
        get title() { return t("fullDiagnostics.successfulRunHandoffMissingDisposition"); },
      },
      {
        kind: "agent",
        get label() { return fullSharedT("taskViews.column_assignee"); },
        name: "CodexCoder",
        href: "/PAP/agents/codexcoder",
      },
      {
        kind: "text",
        get label() { return fullSharedT("taskViews.nextStep"); },
        value: "Pick done, blocked, or in_review and post a one-line rationale.",
      },
    ],
  },
  {
    get title() { return t("fullDiagnostics.runContext"); },
    rows: [
      {
        kind: "run",
        get label() { return t("fullDiagnostics.successfulRun"); },
        runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
        href: "/PAP/agents/codexcoder/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
        status: "succeeded",
      },
      {
        kind: "code",
        get label() { return t("fullDiagnostics.statusBefore"); },
        value: "in_progress",
      },
    ],
  },
];

const NEUTRAL_METADATA: SystemNoticeMetadataSection[] = [
  {
    rows: [
      {
        kind: "agent",
        get label() { return t("fullDiagnostics.reassignedTo"); },
        name: "ClaudeFixer",
        href: "/PAP/agents/claudefixer",
      },
      {
        kind: "agent",
        get label() { return fullSharedT("fullStaleReview.fromActor"); },
        name: "CodexCoder",
        href: "/PAP/agents/codexcoder",
      },
      {
        kind: "text",
        get label() { return fullSharedT("taskProperties.fields.reason"); },
        value: "Manual reassignment requested by Board.",
      },
    ],
  },
];

export const systemNoticeFixtures: readonly SystemNoticeFixture[] = [
  {
    id: "warning-collapsed",
    get caption() { return t("fullDiagnostics.warningCollapsedDefault"); },
    tone: "warning",
    get label() { return fullSharedT("runUi.system.warning"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:32:00.000Z",
    body: "Paperclip needs a disposition before this issue can continue.",
    metadata: REQUIRED_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "warning-expanded",
    get caption() { return t("fullDiagnostics.warningExpanded"); },
    tone: "warning",
    get label() { return fullSharedT("runUi.system.warning"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:32:00.000Z",
    body: "Paperclip needs a disposition before this issue can continue.",
    metadata: REQUIRED_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "danger-collapsed",
    get caption() { return t("fullDiagnostics.dangerCollapsedDefault"); },
    tone: "danger",
    get label() { return fullSharedT("runUi.system.alert"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:48:00.000Z",
    body: "Paperclip could not resolve this issue's missing disposition automatically. The source assignment is unchanged and a board decision is required.",
    metadata: HANDOFF_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "danger-expanded",
    get caption() { return t("fullDiagnostics.dangerExpanded"); },
    tone: "danger",
    get label() { return fullSharedT("runUi.system.alert"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:48:00.000Z",
    body: "Paperclip could not resolve this issue's missing disposition automatically. The source assignment is unchanged and a board decision is required.",
    metadata: HANDOFF_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "neutral-collapsed",
    get caption() { return t("fullDiagnostics.neutralCollapsedDefault"); },
    tone: "neutral",
    get label() { return fullSharedT("runUi.system.notice"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T15:10:00.000Z",
    body: "Reassigned to ClaudeFixer.",
    metadata: NEUTRAL_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "neutral-expanded",
    get caption() { return t("fullDiagnostics.neutralExpanded"); },
    tone: "neutral",
    get label() { return fullSharedT("runUi.system.notice"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T15:10:00.000Z",
    body: "Reassigned to ClaudeFixer.",
    metadata: NEUTRAL_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "warning-no-details",
    get caption() { return t("fullDiagnostics.warningNoMetadataDetailsAffordanceHidden"); },
    tone: "warning",
    get label() { return fullSharedT("runUi.system.warning"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T17:02:00.000Z",
    body: "This run paused while waiting on board approval.",
  },
];
