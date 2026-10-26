import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { SpekoPhoneLineForm } from "@/components/voice/SpekoPhoneLine";
import { SpekoIncomingCallCard } from "@/components/voice/SpekoIncomingCalls";
import { SpekoCallHistoryView, SpekoCallActivityItem, SpekoUnapprovedCallActivityItem } from "@/components/voice/SpekoCallHistory";
import { SpekoPhoneCallbackForm } from "@/components/voice/SpekoPhoneCallback";
import { SpekoProviderSetup } from "@/components/voice/SpekoProviderSetup";
import { VoiceControls } from "@/components/voice/VoiceControls";
import { VoiceTranscript } from "@/components/voice/VoiceTranscript";
import { AnimatedDialogContent } from "@/components/AnimatedDialogContent";
import { MuseConnectionDetails } from "@/components/MuseRunnerConnection";
import { ExternalAgentPresetPicker, DotConnectionChecks, MuseConnectionChecks } from "@/components/new-agent/ExternalAgentInviteContent";
import { AgentMailApiKeyField } from "@/features/connections/AgentMailApiKeyField";
import { TaskBrowserFooter } from "@/components/task-side-panel/TaskBrowserFooter";
import { TaskBrowserActivity } from "@/components/task-side-panel/TaskBrowserActivity";
import type { TaskBrowser } from "@paperclipai/shared";
import { DispositionRecoveryNotice } from "../components/DispositionRecoveryNotice";
import { CloudSignIn } from "../components/CloudSignIn";
import { CloudAccessError } from "../components/CloudAccessGate";
import { SetupPrompt } from "./apps/chat/SetupPrompt";
import { MediaArtifactCard } from "@/components/artifacts/MediaArtifactCard";

import { SkillSourceTree } from "./skills/SkillSourceTree";
import { SkillBinaryFile } from "../components/SkillBinaryFile";
import { WebhookUrlWarning } from "@/components/routine-triggers/WebhookUrlWarning";
import { SetupWizardNavigation, SetupWizardFooter } from "../components/SetupWizard";
import { RemoteMcpDesignExample } from "@/features/connections/remote-mcp/RemoteMcpDesignExample";
import { AgentConversationSidebar } from "@/components/AgentConversationSidebar";
import { AgentChatPicker } from "@/components/AgentChatPicker";
import { TaskChatProjectCreatedCard } from "@/components/task-chat/TaskChatProjectCreatedCard";
import { TextAttachmentPreview } from "@/components/task-side-panel/TaskAttachmentPanel";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { announcementPreview, announcementAnimationPreview, announcementAnimationPreviewSrc } from "@/lib/announcement-preview";
import { TaskDetailTasksPanel } from "@/components/task-detail/TaskDetailTasksPanel";
import { AiConnectionDesignExamples } from "@/components/ai-connections/AiConnectionDesignExamples";
import { SavedProviderKeySelect } from "../components/onboarding/SavedProviderKeySelect";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AgentCharacter } from "@/components/AgentCharacter";
import { AGENT_PALETTE_IDS, appearanceForPalette } from "@paperclipai/shared";
import { RepositoryEditor } from "@/components/RepositoryEditor";
import { TaskChatRunnerActivityGroup } from "@/components/task-chat/TaskChatRunnerActivityGroup";
import { TaskChatMarker } from "@/components/task-chat/TaskChatMarker";
import { TaskChatComposer } from "@/components/task-chat/TaskChatComposer";
import { ComposerAddMenu, ComposerModeChip } from "@/components/task-chat/ComposerAddMenu";
import type { IssueWorkMode } from "@paperclipai/shared";
import { TaskTreeControlDialog, TaskTreeControlMenuItems } from "@/components/TaskTreeControls";
import { useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Command as CommandIcon,
  DollarSign,
  Hexagon,
  History,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Mail,
  Plus,
  Search,
  Settings,
  Target,
  Trash2,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { InlineBanner } from "@/components/InlineBanner";
import { BuiltInLifecycleChip } from "@/components/BuiltInAgentBadges";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { AgentCapsule, AGENT_GRADIENT_COUNT } from "@/components/AgentCapsule";
import { AgentRunCard } from "@/components/ActiveAgentsPanel";
import { StatusBadge, IssueStatusBadge } from "@/components/StatusBadge";
import { StatusIcon } from "@/components/StatusIcon";
import { EnforcementBanner } from "@/components/EnforcementBanner";
import { ActionCard, ActionCardMobile, BindingsTable } from "@/components/actions/ActionCard";
import { PriorityIcon } from "@/components/PriorityIcon";
import { SHOW_TASK_PRIORITY_UI } from "@/lib/ui-flags";
import { agentStatusDot, agentStatusDotDefault } from "@/lib/status-colors";
import { EntityRow } from "@/components/EntityRow";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { FilterBar, type FilterValue } from "@/components/FilterBar";
import { InlineEditor } from "@/components/InlineEditor";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Identity } from "@/components/Identity";
import { AppLogo } from "@/pages/apps/AppLogo";
import { IssueReferencePill } from "@/components/IssueReferencePill";
import { LockedIssueChip } from "@/components/LockedIssueChip";
import { MembershipAction } from "@/components/MembershipAction";
import { IssueOutputSection } from "@/components/issue-output/IssueOutputSection";
import { EnvironmentVariablesEditor } from "@/components/environment-variables-editor";
import { IssueThreadInteractionCard } from "@/components/IssueThreadInteractionCard";
import {
  connectedConnectionIntentInteraction,
  issueThreadInteractionFixtureMeta,
  pendingConnectionIntentInteraction,
  retryConnectionIntentInteraction,
} from "@/fixtures/issueThreadInteractionFixtures";
import type { CompanySecret, EnvBinding, Issue } from "@paperclipai/shared";
import { CollectionToolbar } from "@/components/CollectionToolbar";
import { IssueRow } from "@/components/IssueRow";
import {
  EnvInputsList,
  ExternalSourcesList,
  RequiredSkillsList,
  StepSkillPlan,
  StepSourcePolicy,
  TeamCard,
  TeamHierarchyPreview,
  TeamRow,
} from "@/pages/TeamCatalog";
import {
  currentInstalledState,
  onboardingTeams,
  optionalTeam,
  outOfDateInstalledState,
  sampleSkillPreparations,
  sampleTeam,
  warnTeam,
} from "@/pages/TeamCatalog.fixtures";
import type { IssueWorkProduct } from "@paperclipai/shared";

/* ------------------------------------------------------------------ */
/*  Sample data for the Issue Output surface showcase                  */
/* ------------------------------------------------------------------ */

function sampleOutput(
  id: string,
  attachmentId: string,
  contentType: string,
  filename: string,
  opts: { byteSize: number; isPrimary?: boolean; createdAt: string },
): IssueWorkProduct {
  const contentPath = `/api/attachments/${attachmentId}/content`;
  return {
    id,
    companyId: "demo-company",
    projectId: null,
    issueId: "demo-issue",
    executionWorkspaceId: null,
    runtimeServiceId: null,
    type: "artifact",
    provider: "paperclip",
    externalId: null,
    title: filename,
    url: null,
    status: "active",
    reviewState: "none",
    isPrimary: Boolean(opts.isPrimary),
    healthStatus: "unknown",
    summary: null,
    createdByRunId: null,
    createdAt: new Date(opts.createdAt),
    updatedAt: new Date(opts.createdAt),
    metadata: {
      attachmentId,
      contentType,
      byteSize: opts.byteSize,
      contentPath,
      openPath: contentPath,
      downloadPath: `${contentPath}?download=1`,
      originalFilename: filename,
    },
  } as IssueWorkProduct;
}

const DESIGN_GUIDE_OUTPUTS: IssueWorkProduct[] = [
  sampleOutput("wp-vid", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "video/mp4", "q3-summary.mp4", {
    byteSize: 19_293_798,
    isPrimary: true,
    createdAt: "2026-05-30T12:00:00Z",
  }),
  sampleOutput("wp-pdf", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "application/pdf", "talking-points.pdf", {
    byteSize: 421_888,
    createdAt: "2026-05-30T11:52:00Z",
  }),
];

const DESIGN_GUIDE_DEGRADED_OUTPUTS: IssueWorkProduct[] = [
  {
    ...sampleOutput("wp-broken", "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "video/mp4", "corrupt-output.mp4", {
      byteSize: 0,
      isPrimary: true,
      createdAt: "2026-05-30T12:01:00Z",
    }),
    // Strip the path metadata so it fails the shared artifact schema.
    metadata: { attachmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", contentType: "video/mp4" },
  } as IssueWorkProduct,
];

const DESIGN_GUIDE_TASK = {
  id: "design-guide-task",
  identifier: "PAP-427",
  title: "Reconcile the navigation model across operator surfaces",
  status: "in_progress",
  priority: "medium",
  blockerAttention: false,
} as unknown as Issue;

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  useFullSharedTranslation();
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <Separator />
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{title}</h4>
      {children}
    </div>
  );
}

// Onboarding seam (design §6 + §12.5): the TeamCard tile in its "Pick a starter
// team" 3-col grid, with the first defaultInstall tile selected.
function TeamCardShowcase() {
  useFullSharedTranslation();
  const [selectedId, setSelectedId] = useState(onboardingTeams[0]?.id ?? null);
  return (
    <div className="grid max-w-2xl gap-4 md:grid-cols-2 lg:grid-cols-3">
      {onboardingTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          selected={team.id === selectedId}
          onSelect={() => setSelectedId(team.id)}
        />
      ))}
    </div>
  );
}

// Reusable environment-variables editor: one shared grid, in-field source
// switch, fuzzy secret picker, sensitive-value detection, inline health.
const DESIGN_GUIDE_SECRETS: CompanySecret[] = [
  {
    id: "dg-github",
    companyId: "dg",
    scope: "company",
    ownerUserId: null,
    userSecretDefinitionId: null,
    key: "github_token",
    name: "GITHUB_TOKEN",
    provider: "local_encrypted",
    status: "active",
    managedMode: "paperclip_managed",
    externalRef: null,
    providerConfigId: null,
    providerMetadata: null,
    latestVersion: 3,
    description: null,
    lastResolvedAt: null,
    lastRotatedAt: null,
    deletedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    updatedAt: new Date("2026-03-01T10:00:00.000Z"),
  },
  {
    id: "dg-db",
    companyId: "dg",
    scope: "company",
    ownerUserId: null,
    userSecretDefinitionId: null,
    key: "db_connection",
    name: "DB_CONNECTION",
    provider: "local_encrypted",
    status: "active",
    managedMode: "paperclip_managed",
    externalRef: null,
    providerConfigId: null,
    providerMetadata: null,
    latestVersion: 3,
    description: null,
    lastResolvedAt: null,
    lastRotatedAt: null,
    deletedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    updatedAt: new Date("2026-03-01T10:00:00.000Z"),
  },
];

function EnvironmentVariablesEditorShowcase() {
  useFullSharedTranslation();
  const [env, setEnv] = useState<Record<string, EnvBinding>>({
    NODE_ENV: { type: "plain", value: "production" },
    GH_TOKEN: { type: "secret_ref", secretId: "dg-github", version: "latest" },
    DB_URL: { type: "secret_ref", secretId: "dg-db", version: 3 },
    STRIPE_API_KEY: { type: "plain", value: "demo-value-not-a-credential" },
  });
  return (
    <div className="max-w-(--sz-640px) rounded-md border border-border p-4">
      <EnvironmentVariablesEditor
        value={env}
        secrets={DESIGN_GUIDE_SECRETS}
        onChange={(next) => setEnv(next ?? {})}
        onCreateSecret={async (name) => ({
          ...DESIGN_GUIDE_SECRETS[0]!,
          id: `dg-${name}`,
          key: name,
          name: name.toUpperCase(),
          latestVersion: 1,
        })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color swatch                                                       */
/* ------------------------------------------------------------------ */

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  useFullSharedTranslation();
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded-md border border-border shrink-0"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <div>
        <p className="text-xs font-mono">{cssVar}</p>
        <p className="text-xs text-muted-foreground">{name}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function TaskExecutionControlsExample() {
  useFullSharedTranslation();
  const [running, setRunning] = useState(true);
  const [dialogMode, setDialogMode] = useState<"resume" | "cancel" | "restore" | null>(null);
  const [wake, setWake] = useState(true);
  return <div className="max-w-xl space-y-4">
    <div className="w-52 rounded-md border border-border p-1">
      <TaskTreeControlMenuItems scope="subtree" canPause={running} canResume={!running} canCancel canRestore={!running}
        onPause={() => setRunning(false)} onResume={() => setDialogMode("resume")}
        onCancel={() => setDialogMode("cancel")} onRestore={() => setDialogMode("restore")} />
    </div>
    <p className="text-sm text-muted-foreground">{running ? t("fullDiagnostics.runningTypeToSwitchStopToSend") : t("fullDiagnostics.pausedResumeFromTheMenu")}</p>
    <TaskChatProjectCreatedCard item={{ id: "design-project", kind: "project_created", projectId: "example-project", name: "Onboarding improvements", description: "Help new teams reach their first useful result.", timestamp: "2026-09-11T00:00:00Z", repositories: [{ id: "1", name: "paperclipai/paperclip", url: "https://github.com/paperclipai/paperclip" }] }} />
    {!running ? <TaskChatMarker item={{ id: "design-cancelled", kind: "marker", variant: "interrupted", tone: "neutral", label: fullSharedT("taskChatUi.classicDisplay.cancelled"), detail: "The run was cancelled before returning an answer.", collapsible: true }} /> : null}
    <TaskChatComposer pause={!running ? { scope: "subtree", onResume: () => setDialogMode("resume") } : null} onAdd={async () => {}} workMode="standard" stopScope="subtree" onStop={running ? async () => setRunning(false) : undefined} />
    <TaskTreeControlDialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) setDialogMode(null); }}
      mode={dialogMode ?? "cancel"} scope="subtree" affectedCount={3} affectedAgentCount={2} loading={false} pending={false} valid
      wakeAgents={wake} onWakeAgentsChange={setWake} onRetry={() => {}}
      onApply={() => { setRunning(dialogMode !== "cancel" && wake); setDialogMode(null); }} />
  </div>;
}

function TaskPendingInputExample() {
  useFullSharedTranslation();
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState(true);
  return <div className="max-w-xl">
    <TaskChatComposer
      onAdd={async () => {}}
      workMode="standard"
      takeover={pending && open ? {
        id: "design-question",
        label: fullSharedT("taskChatUi.interaction.question"),
        pendingCount: 1,
        content: <div className="space-y-3 text-sm">
          <p>Should the agent use the existing draft?</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPending(false)}>Use draft</Button>
            <Button size="sm" variant="outline" onClick={() => setPending(false)}>Start fresh</Button>
          </div>
        </div>,
        onDismiss: () => setOpen(false),
        onSkip: () => setPending(false),
      } : null}
      pendingTakeover={pending ? { count: 1, label: fullSharedT("taskChatUi.interaction.question"), onOpen: () => setOpen(true) } : null}
    />
  </div>;
}

function AgentChatPickerExample() {
  useFullSharedTranslation();
  const [state, setState] = useState<"closed" | "empty" | "loading" | "error">("closed");
  return <div className="flex flex-wrap gap-2">
    <Button variant="outline" onClick={() => setState("empty")}>{t("fullDiagnostics.emptyPicker")}</Button>
    <Button variant="outline" onClick={() => setState("loading")}>{t("fullDiagnostics.loadingPicker")}</Button>
    <Button variant="outline" onClick={() => setState("error")}>{t("fullDiagnostics.failedPicker")}</Button>
    <AgentChatPicker agents={[]} open={state !== "closed"} onOpenChange={(open) => { if (!open) setState("closed"); }} onSelect={() => {}}
      loading={state === "loading"} error={state === "error" ? new Error("Unavailable") : null} onRetry={() => setState("empty")} />
  </div>;
}

function ComposerActionsExample() {
  useFullSharedTranslation();
  const [mode, setMode] = useState<IssueWorkMode>("standard");
  return <div className="flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card p-3">
    <ComposerAddMenu mode={mode} onModeChange={setMode} onAttachFile={() => {}} onGoal={() => {}} />
    <ComposerModeChip mode={mode} onRemove={() => setMode("standard")} />
    <span className="ml-auto text-xs text-muted-foreground">{t("fullDiagnostics.plusMenuRemovableModeChip")}</span>
  </div>;
}

export function DesignGuide() {
  useFullSharedTranslation();
  const [agentmailDemoKey, setAgentmailDemoKey] = useState("");
  const [wizardStep, setWizardStep] = useState(0);
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [selectValue, setSelectValue] = useState("in_progress");
  const [menuChecked, setMenuChecked] = useState(true);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [inlineText, setInlineText] = useState("Click to edit this text");
  const [inlineTitle, setInlineTitle] = useState("Editable Title");
  const [inlineDesc, setInlineDesc] = useState(
    "This is an editable description. Click to edit it — the textarea auto-sizes to fit the content without layout shift."
  );
  const [filters, setFilters] = useState<FilterValue[]>([
    { key: "status", label: fullSharedT("sidebar.status"), value: "Active" },
    // PAP-411: priority filter demo row suppressed while SHOW_TASK_PRIORITY_UI is off.
    ...(SHOW_TASK_PRIORITY_UI
      ? [{ key: "priority", label: fullSharedT("fullShared.priority_d60dbb"), value: "High" } as FilterValue]
      : []),
  ]);
  const [allowExternal, setAllowExternal] = useState(false);
  const [allowUnpinned, setAllowUnpinned] = useState(false);
  const [allowLocalPath, setAllowLocalPath] = useState(false);

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold">{t("fullDiagnostics.designGuide")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("fullDiagnostics.everyComponentStyleAndPatternUsedAcross")}</p>
      </div>

      {/* ============================================================ */}
      {/*  COVERAGE                                                     */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.componentCoverage")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.thisPageShouldBeUpdatedWhenNew")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <SubSection title={t("fullDiagnostics.uiPrimitives")}>
            <div className="flex flex-wrap gap-2">
              {[
                "avatar", "badge", "breadcrumb", "button", "card", "checkbox", "collapsible",
                "command", "dialog", "dropdown-menu", "input", "label", "popover", "resizable-panels",
                "scroll-area", "select", "separator", "sheet", "skeleton", "tabs", "textarea", "tooltip",
              ].map((name) => (
                <Badge key={name} variant="outline" className="font-mono text-(length:--text-nano)">
                  {name}
                </Badge>
              ))}
            </div>
          </SubSection>
          <SubSection title={t("fullDiagnostics.appComponents")}>
            <div className="flex flex-wrap gap-2">
              {[
                "StatusBadge", "StatusIcon", "PriorityIcon", "EntityRow", "EmptyState", "MetricCard",
                "FilterBar", "InlineEditor", "PageSkeleton", "Identity", "CommentThread", "MarkdownEditor",
                "PropertiesPanel", "Sidebar", "CommandPalette", "EnvironmentVariablesEditor",
                "InlineBanner", "BuiltInAgentGate", "BuiltInLifecycleChip", "CollectionToolbar",
                "IssueRow", "ContextualSidebarFrame",
              ].map((name) => (
                <Badge key={name} variant="ghost" className="font-mono text-(length:--text-nano)">
                  {name}
                </Badge>
              ))}
            </div>
          </SubSection>
        </div>
      </Section>

      <Section title={t("fullDiagnostics.announcements")}>
        <div className="grid gap-4 md:grid-cols-2">
          <AnnouncementCard announcement={announcementAnimationPreview} imageSrc="/announcement-preview.svg" animationSrc={announcementAnimationPreviewSrc} onDismiss={() => {}} />
          <AnnouncementCard announcement={announcementPreview} imageSrc="/announcement-preview.svg" onDismiss={() => {}} />
          <AnnouncementCard announcement={{ ...announcementPreview, image: undefined, secondaryLink: undefined }} onDismiss={() => {}} />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.taskExecutionControls")}>
        <TaskExecutionControlsExample />
      </Section>

      <Section title={t("fullDiagnostics.composerActions")}>
        <ComposerActionsExample />
      </Section>

      <Section title={t("fullDiagnostics.taskCollection")}>
        <p className="max-w-prose text-sm text-muted-foreground">{t("fullDiagnostics.collectiontoolbarOwnsSharedGeometryWhileEachPage")}</p>
        <CollectionToolbar
          context={<span className="text-sm font-medium">{fullSharedT("fullShared.recent_tasks_7b940d")}</span>}
          search={<Input aria-label={t("fullDiagnostics.searchTaskCollectionExample")} placeholder={fullSharedT("tasks.searchPlaceholder")} />}
          controls={<Button variant="outline" size="sm">{fullSharedT("issueFilters.filter")}</Button>}
          actions={<Button size="sm">{fullSharedT("newIssue.newTask")}</Button>}
          feedback={<span className="text-xs text-muted-foreground">{t("fullDiagnostics.1TaskUpdatedNewestFirst")}</span>}
        />
        <div className="overflow-hidden rounded-lg border border-border">
          <IssueRow
            issue={DESIGN_GUIDE_TASK}
            presentation="task"
            unreadState="visible"
            metadata={<span className="text-xs text-muted-foreground">{t("fullDiagnostics.updated12mAgo")}</span>}
            actions={<Button variant="ghost" size="xs">{fullSharedT("fullShared.more_d47d7c")}</Button>}
          />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.themeToggle")}>
        <SubSection title={t("fullDiagnostics.variants")}>
          <div className="flex max-w-sm flex-col items-start gap-3">
            <ThemeToggle />
            <ThemeToggle variant="menu-action" />
            <ThemeToggle variant="compact-menu-action" />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  COLORS                                                       */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.colors")}>
        <SubSection title={t("fullDiagnostics.core")}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Swatch name="Background" cssVar="--background" />
            <Swatch name="Foreground" cssVar="--foreground" />
            <Swatch name="Card" cssVar="--card" />
            <Swatch name="Primary" cssVar="--primary" />
            <Swatch name="Primary foreground" cssVar="--primary-foreground" />
            <Swatch name="Secondary" cssVar="--secondary" />
            <Swatch name="Muted" cssVar="--muted" />
            <Swatch name="Muted foreground" cssVar="--muted-foreground" />
            <Swatch name="Accent" cssVar="--accent" />
            <Swatch name="Destructive" cssVar="--destructive" />
            <Swatch name="Border" cssVar="--border" />
            <Swatch name="Ring" cssVar="--ring" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.sidebar")}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Swatch name="Sidebar" cssVar="--sidebar" />
            <Swatch name="Sidebar border" cssVar="--sidebar-border" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.chart")}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Swatch name="Chart 1" cssVar="--chart-1" />
            <Swatch name="Chart 2" cssVar="--chart-2" />
            <Swatch name="Chart 3" cssVar="--chart-3" />
            <Swatch name="Chart 4" cssVar="--chart-4" />
            <Swatch name="Chart 5" cssVar="--chart-5" />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  TYPOGRAPHY                                                   */}
      {/* ============================================================ */}
      <Section title={fullSharedT("runUi.phase.runner")}>
        <TaskChatRunnerActivityGroup item={{ id: "design-runner-activity", kind: "activity_phase", active: true, summary: "", interstitial: { id: "design-runner-commentary", kind: "message", author: "agent", text: "I’ll inspect the activity feed and check the layout.", interstitial: true }, items: [
          { id: "design-runner-read", kind: "tool", name: "read", target: "TaskChatRunnerTurn.tsx", status: "completed", detail: "Found the activity groups." },
          { id: "design-runner-check", kind: "tool", name: "exec_command", target: "pnpm check:token-gates", status: "in_progress" },
        ] }} />
        <TaskChatRunnerActivityGroup item={{ id: "design-runner-completed", kind: "activity_phase", active: false, summary: "", items: [
          { id: "design-completed-read", kind: "tool", name: "read", target: "TaskChatRunnerTurn.tsx", status: "completed", detail: "Read the activity groups." },
          { id: "design-completed-check", kind: "tool", name: "exec_command", target: "pnpm check:token-gates", status: "failed", detail: "A token check needs another pass." },
        ] }} />
      </Section>

      <Section title={t("fullDiagnostics.typography")}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">{t("fullDiagnostics.pageTitleTextXlFontBold")}</h2>
          <h2 className="text-lg font-semibold">{t("fullDiagnostics.sectionTitleTextLgFontSemibold")}</h2>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("fullDiagnostics.sectionHeadingTextSmFontSemiboldUppercase")}</h3>
          <p className="text-sm font-medium">{t("fullDiagnostics.cardTitleTextSmFontMedium")}</p>
          <p className="text-sm font-semibold">{t("fullDiagnostics.cardTitleAltTextSmFontSemibold")}</p>
          <p className="text-sm">{t("fullDiagnostics.bodyTextTextSm")}</p>
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.mutedDescriptionTextSmTextMutedForeground")}</p>
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.tinyLabelTextXsTextMutedForeground")}</p>
          <p className="text-sm font-mono text-muted-foreground">{t("fullDiagnostics.monoIdentifierTextSmFontMonoText")}</p>
          <p className="text-2xl font-bold">{t("fullDiagnostics.largeStatText2xlFontBold")}</p>
          <p className="font-mono text-xs">{t("fullDiagnostics.logCodeTextFontMonoTextXs")}</p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SPACING & RADIUS                                             */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.radius")}>
        <div className="flex items-end gap-4 flex-wrap">
          {[
            ["sm", "var(--radius-sm)"],
            ["md", "var(--radius-md)"],
            ["lg", "var(--radius-lg)"],
            ["xl", "var(--radius-xl)"],
            ["full", "9999px"],
          ].map(([label, radius]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className="h-12 w-12 bg-primary"
                style={{ borderRadius: radius }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  BUTTONS                                                      */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.buttons")}>
        <SubSection title={t("fullDiagnostics.variants")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="default">{fullSharedT("providerSetup.model.default")}</Button>
            <Button variant="secondary">{t("fullDiagnostics.secondary")}</Button>
            <Button variant="outline">{t("fullDiagnostics.outline")}</Button>
            <Button variant="ghost">{t("fullDiagnostics.ghost")}</Button>
            <Button variant="destructive">{fullSharedT("decisionForms.decision.destructive")}</Button>
            <Button variant="link">{t("fullDiagnostics.link")}</Button>
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.sizes")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="xs">{t("fullDiagnostics.extraSmall")}</Button>
            <Button size="sm">{t("fullDiagnostics.small")}</Button>
            <Button size="default">{fullSharedT("providerSetup.model.default")}</Button>
            <Button size="lg">{t("fullDiagnostics.large")}</Button>
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.iconButtons")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon-xs"><Search /></Button>
            <Button variant="ghost" size="icon-sm"><Search /></Button>
            <Button variant="outline" size="icon"><Search /></Button>
            <Button variant="outline" size="icon-lg"><Search /></Button>
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.withIcons")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button><Plus />{" "}{t("fullDiagnostics.newIssue")}</Button>
            <Button variant="outline"><Upload />{fullSharedT("taskDetail.copy.upload")}</Button>
            <Button variant="destructive"><Trash2 />{fullSharedT("taskPanels.delete")}</Button>
            <Button size="sm"><Plus />{fullSharedT("taskProperties.share.add")}</Button>
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.states")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button disabled>{t("fullDiagnostics.disabled")}</Button>
            <Button variant="outline" disabled>{t("fullDiagnostics.disabledOutline")}</Button>
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  BADGES                                                       */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.badges")}>
        <SubSection title={t("fullDiagnostics.variants")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">{fullSharedT("providerSetup.model.default")}</Badge>
            <Badge variant="secondary">{t("fullDiagnostics.secondary")}</Badge>
            <Badge variant="outline">{t("fullDiagnostics.outline")}</Badge>
            <Badge variant="destructive">{fullSharedT("decisionForms.decision.destructive")}</Badge>
            <Badge variant="ghost">{t("fullDiagnostics.ghost")}</Badge>
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  STATUS BADGES & ICONS                                        */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.statusSystem")}>
        <SubSection title={t("fullDiagnostics.statusbadgeAllStatuses")}>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              "active", "running", "paused", "idle", "archived", "planned",
              "achieved", "completed", "failed", "timed_out", "succeeded", "error",
              "pending_approval", "backlog", "todo", "in_progress", "in_review", "blocked",
              "done", "terminated", "cancelled", "pending", "revision_requested",
              "approved", "rejected",
            ].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.issuestatusbadgeBrandChipGlyphPap75")}>
          <div className="flex items-center gap-2 flex-wrap">
            {["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"].map(
              (s) => (
                <IssueStatusBadge key={s} status={s} />
              )
            )}
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.idleSlackConversation")}>
          <StatusIcon status="in_review" externalConversationState="waiting" showLabel />
          <IssueStatusBadge status="in_review" externalConversationState="waiting" />
        </SubSection>
        <SubSection title={t("fullDiagnostics.statusiconInteractive")}>
          <div className="flex items-center gap-3 flex-wrap">
            {["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"].map(
              (s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <StatusIcon status={s} />
                  <span className="text-xs text-muted-foreground">{s}</span>
                </div>
              )
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <StatusIcon status={status} onChange={setStatus} />
            <span className="text-sm">{t("fullDiagnostics.clickTheIconToChangeStatusCurrent")}{" "}{status})</span>
          </div>
        </SubSection>

        {/* PAP-411: PriorityIcon showcase gated behind SHOW_TASK_PRIORITY_UI per board decision. */}
        {SHOW_TASK_PRIORITY_UI && (
        <SubSection title={t("fullDiagnostics.priorityiconInteractive")}>
          <div className="flex items-center gap-3 flex-wrap">
            {["critical", "high", "medium", "low"].map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <PriorityIcon priority={p} />
                <span className="text-xs text-muted-foreground">{p}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <PriorityIcon priority={priority} onChange={setPriority} />
            <span className="text-sm">{t("fullDiagnostics.clickTheIconToChangeCurrent")}{" "}{priority})</span>
          </div>
        </SubSection>
        )}

        <SubSection title={t("fullDiagnostics.agentStatusDots")}>
          <div className="flex items-center gap-4 flex-wrap">
            {(["running", "active", "paused", "error", "archived"] as const).map((label) => (
              <div key={label} className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`inline-flex h-full w-full rounded-full ${agentStatusDot[label] ?? agentStatusDotDefault}`} />
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.runInvocationBadges")}>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              ["timer", "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"],
              ["assignment", "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"],
              ["on_demand", "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"],
              ["automation", "bg-muted text-muted-foreground"],
            ].map(([label, cls]) => (
              <Badge variant="ghost" key={label} className={`px-1.5 text-(length:--text-nano) ${cls}`}>
                {label}
              </Badge>
            ))}
          </div>
        </SubSection>

        <SubSection title="IssueReferencePill">
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.usedWhereverATaskIsReferencedIn")}{" "}<code className="font-mono">{t("fullPages.changeStatus")}</code>{" "}{t("fullDiagnostics.toShowTheTargetIssueSState")}{" "}<code className="font-mono">variant="property"</code>{" "}{t("fullDiagnostics.forCompactBadgesWithDirectNavigationPass")}{" "}<code className="font-mono">onRemove</code>{" "}{t("fullDiagnostics.forASeparateBlockerRemovalControlWith")}{" "}<code className="font-mono">strikethrough</code>{" "}{t("fullDiagnostics.forRemovedContexts")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <IssueReferencePill issue={{ id: "demo-1", identifier: "PAP-123", title: t("fullDiagnostics.identifierOnlyNoStatusYet") }} />
            <IssueReferencePill issue={{ id: "demo-2", identifier: "PAP-456", title: t("fullDiagnostics.withInProgressStatus"), status: "in_progress" }} />
            <IssueReferencePill issue={{ id: "demo-3", identifier: "PAP-789", title: t("fullDiagnostics.doneStatus"), status: "done" }} />
            <IssueReferencePill issue={{ id: "demo-4", identifier: "PAP-101", title: t("fullDiagnostics.blockedStatus"), status: "blocked" }} />
            <IssueReferencePill onRemove={() => window.alert(t("fullDiagnostics.blockerRemoved"))} issue={{ id: "demo-blocker", identifier: "PAP-303", title: t("fullDiagnostics.hoverOrFocusToRemoveBlocker"), status: "in_review" }} />
            <IssueReferencePill strikethrough issue={{ id: "demo-5", identifier: "PAP-202", title: t("fullDiagnostics.removedStrikethrough"), status: "todo" }} />
          </div>
        </SubSection>

        <SubSection title="LockedIssueChip">
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.existenceOnlyReferenceToAPrivateTask")}{" "}
            <strong>{t("fullDiagnostics.noTitleNeverALink")}</strong>{t("fullDiagnostics.fallsBackToPrivateWhenEvenThe")}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <LockedIssueChip identifier="PAP-1234" />
            <LockedIssueChip identifier={null} />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  AGENT CAPSULE                                                */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.agentCapsule")}>
        <p className="text-sm text-muted-foreground max-w-prose">{t("fullDiagnostics.theBrandCapsuleIsTheAgentMotif")}<code className="font-mono">--agent-Na</code> →{" "}
          <code className="font-mono">--agent-Nb</code>); <code className="font-mono">prefers-reduced-motion</code>{" "}{t("fullDiagnostics.skipsTheLiquidRiseAndPulsesAnd")}</p>
        <SubSection title={t("fullDiagnostics.states")}>
          <div className="flex items-end gap-10">
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="slot" />
              <span className="text-xs text-muted-foreground">{t("fullDiagnostics.slot")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="configured" />
              <span className="text-xs text-muted-foreground">{t("fullDiagnostics.configured")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" gradient={5} />
              <span className="text-xs text-muted-foreground">{t("fullDiagnostics.online")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" gradient={5} glow="blue" />
              <span className="text-xs text-muted-foreground">{t("fullDiagnostics.onlineBlueGlow")}</span>
            </div>
          </div>
        </SubSection>
        <SubSection title={t("fullDiagnostics.sizes")}>
          <div className="flex items-end gap-8">
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" size="sm" gradient={1} />
              <span className="text-xs text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" size="md" gradient={4} />
              <span className="text-xs text-muted-foreground">md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" size="lg" gradient={8} />
              <span className="text-xs text-muted-foreground">lg</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AgentCapsule state="online" size={{ width: 28, height: 96 }} gradient={6} />
              <span className="text-xs text-muted-foreground">{t("fullDiagnostics.customPx")}</span>
            </div>
          </div>
        </SubSection>
        <SubSection title={t("fullDiagnostics.gradients")}>
          <div className="flex items-end gap-3 flex-wrap">
            {Array.from({ length: AGENT_GRADIENT_COUNT }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <AgentCapsule state="online" size="sm" gradient={i + 1} />
                <span className="text-(length:--text-nano) font-mono text-muted-foreground">{i + 1}</span>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  FORM ELEMENTS                                                */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.formElements")}>
        <div className="grid gap-6 md:grid-cols-2">
          <SubSection title={fullSharedT("fullShared.input_36ecb4")}>
            <Input placeholder={t("fullDiagnostics.defaultInput")} />
            <Input placeholder={t("fullDiagnostics.disabledInput")} disabled className="mt-2" />
          </SubSection>

          <SubSection title={t("fullDiagnostics.textarea")}>
            <Textarea placeholder={t("fullDiagnostics.writeSomething")} />
          </SubSection>

          <SubSection title={t("fullDiagnostics.checkboxLabel")}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="check1" defaultChecked />
                <Label htmlFor="check1">{t("fullDiagnostics.checkedItem")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="check2" />
                <Label htmlFor="check2">{t("fullDiagnostics.uncheckedItem")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="check3" disabled />
                <Label htmlFor="check3">{t("fullDiagnostics.disabledItem")}</Label>
              </div>
            </div>
          </SubSection>

          <SubSection title={t("fullDiagnostics.inlineEditor")}>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fullDiagnostics.titleSingleLine")}</p>
                <InlineEditor
                  value={inlineTitle}
                  onSave={setInlineTitle}
                  as="h2"
                  className="text-xl font-bold"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fullDiagnostics.bodyTextSingleLine")}</p>
                <InlineEditor
                  value={inlineText}
                  onSave={setInlineText}
                  as="p"
                  className="text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fullDiagnostics.descriptionMultilineAutoSizing")}</p>
                <InlineEditor
                  value={inlineDesc}
                  onSave={setInlineDesc}
                  as="p"
                  className="text-sm text-muted-foreground"
                  placeholder={fullSharedT("taskDetail.copy.addDescription")}
                  multiline
                />
              </div>
            </div>
          </SubSection>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SELECT                                                       */}
      {/* ============================================================ */}
      <Section title={fullSharedT("skillsGap.select_859822")}>
        <p className="mb-4 text-sm text-muted-foreground">{t("fullDiagnostics.nativeSingleValueDropdownsShareAnInset")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <SubSection title={t("fullDiagnostics.defaultSize")}>
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fullDiagnostics.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">{fullSharedT("taskViews.backlog")}</SelectItem>
                <SelectItem value="todo">{t("fullDiagnostics.todo")}</SelectItem>
                <SelectItem value="in_progress">{fullSharedT("liveDashboardUi.chart.in_progress")}</SelectItem>
                <SelectItem value="in_review">{fullSharedT("liveDashboardUi.chart.in_review")}</SelectItem>
                <SelectItem value="done">{fullSharedT("fullShared.done_11a676")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("fullDiagnostics.currentValue")}{" "}{selectValue}</p>
          </SubSection>
          <SubSection title={t("fullDiagnostics.smallTrigger")}>
            <Select defaultValue="high">
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">{fullSharedT("decisionsUi.severity.critical")}</SelectItem>
                <SelectItem value="high">{fullSharedT("fullShared.high_c4ebc6")}</SelectItem>
                <SelectItem value="medium">{fullSharedT("fullShared.medium_8e588c")}</SelectItem>
                <SelectItem value="low">{fullSharedT("fullShared.low_f793de")}</SelectItem>
              </SelectContent>
            </Select>
          </SubSection>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  DROPDOWN MENU                                                */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.dropdownMenu")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">{t("fullDiagnostics.quickActions")}<ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <Check className="h-4 w-4" />{t("fullDiagnostics.markAsDone")}<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BookOpen className="h-4 w-4" />{t("fullDiagnostics.openDocs")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={menuChecked}
              onCheckedChange={(value) => setMenuChecked(value === true)}
            >{t("fullDiagnostics.watchIssue")}</DropdownMenuCheckboxItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 className="h-4 w-4" />{t("fullDiagnostics.deleteIssue")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      {/* ============================================================ */}
      {/*  POPOVER                                                      */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.popover")}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">{t("fullDiagnostics.openPopover")}</Button>
          </PopoverTrigger>
          <PopoverContent className="space-y-2">
            <p className="text-sm font-medium">{t("fullDiagnostics.agentHeartbeat")}</p>
            <p className="text-xs text-muted-foreground">{t("fullDiagnostics.lastRunSucceeded24sAgoNextTimer")}</p>
            <Button size="xs">{t("fullDiagnostics.wakeNow")}</Button>
          </PopoverContent>
        </Popover>
      </Section>

      {/* ============================================================ */}
      {/*  COLLAPSIBLE                                                  */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.collapsible")}>
        <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              {collapsibleOpen ? t("agentDetailUi.keys.hide") : t("agentDetailUi.keys.show")}{" "}{t("fullDiagnostics.advancedFilters")}</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="rounded-md border border-border p-3">
            <div className="space-y-2">
              <Label htmlFor="owner-filter">{fullSharedT("fullShared.owner_4b1b8a")}</Label>
              <Input id="owner-filter" placeholder={t("fullDiagnostics.filterByAgentName")} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      {/* ============================================================ */}
      {/*  SHEET                                                        */}
      {/* ============================================================ */}
      <Section title={fullSharedT("taskChatUi.attachment.sheet")}>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">{t("fullDiagnostics.openSidePanel")}</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{t("fullDiagnostics.issueProperties")}</SheetTitle>
              <SheetDescription>{t("fullDiagnostics.editMetadataWithoutLeavingTheCurrentPage")}</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-1">
                <Label htmlFor="sheet-title">{fullSharedT("fullShared.title_7e8cd2")}</Label>
                <Input id="sheet-title" defaultValue="Improve onboarding docs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sheet-description">{fullSharedT("companySettings.description")}</Label>
                <Textarea id="sheet-description" defaultValue="Capture setup pitfalls and screenshots." />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline">{fullSharedT("fullShared.cancel_19766e")}</Button>
              <Button>{fullSharedT("inboxPolicy.save")}</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Section>

      {/* ============================================================ */}
      {/*  SCROLL AREA                                                  */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.scrollArea")}>
        <ScrollArea className="h-36 rounded-md border border-border">
          <div className="space-y-2 p-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border p-2 text-sm">{t("fullDiagnostics.heartbeatRun")}{i + 1}{t("fullDiagnostics.completedSuccessfully")}</div>
            ))}
          </div>
        </ScrollArea>
      </Section>

      {/* ============================================================ */}
      {/*  COMMAND                                                      */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.commandCmdk")}>
        <div className="rounded-md border border-border">
          <Command>
            <CommandInput placeholder={t("fullDiagnostics.typeACommandOrSearch")} />
            <CommandList>
              <CommandEmpty>{fullSharedT("searchUi.palette.noResults")}</CommandEmpty>
              <CommandGroup heading="Pages">
                <CommandItem>
                  <LayoutDashboard className="h-4 w-4" />{fullSharedT("sidebar.dashboard")}</CommandItem>
                <CommandItem>
                  <CircleDot className="h-4 w-4" />{t("fullDiagnostics.issues")}</CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem>
                  <CommandIcon className="h-4 w-4" />{t("fullDiagnostics.openCommandPalette")}</CommandItem>
                <CommandItem>
                  <Plus className="h-4 w-4" />{t("fullDiagnostics.createNewIssue")}</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  BREADCRUMB                                                   */}
      {/* ============================================================ */}
      <Section title={t("fullRoutinesSecrets.breadcrumb")}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{fullSharedT("sidebar.projects")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{t("fullDiagnostics.paperclipApp")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("fullDiagnostics.issueList")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      {/* ============================================================ */}
      {/*  CARDS                                                        */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.cards")}>
        <SubSection title={t("fullDiagnostics.dashboardAgentRuns")}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {["running", "queued", "succeeded", "failed", "timed_out", "cancelled", "interrupted"].map((status) => (
              <AgentRunCard
                key={status}
                companyId="design-guide"
                run={{
                  id: `design-guide-${status}`, agentId: "design-guide-agent", agentName: "CodexCoder",
                  status, adapterType: "codex_local", invocationSource: "on_demand", triggerDetail: "manual",
                  startedAt: null, finishedAt: null, createdAt: "2026-09-11T12:00:00Z", issueId: "design-guide-task",
                }}
                issue={{ identifier: "PAP-559", title: "Recreate this wireframe on pages Paperclip", status: status === "succeeded" ? "done" : "in_progress" }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.theDashboardAndLiveRunsPageUse")}</p>
        </SubSection>
        <SubSection title={t("fullDiagnostics.standardCard")}>
          <Card>
            <CardHeader>
              <CardTitle>{t("fullDiagnostics.cardTitle")}</CardTitle>
              <CardDescription>{t("fullDiagnostics.cardDescriptionWithSupportingText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{t("fullDiagnostics.cardContentGoesHereThisIsThe")}</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">{fullSharedT("runUi.inspector.action")}</Button>
              <Button variant="outline" size="sm">{fullSharedT("fullShared.cancel_19766e")}</Button>
            </CardFooter>
          </Card>
        </SubSection>

        <SubSection title={t("fullDiagnostics.metricCards")}>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={Bot} value={12} label={t("fullDiagnostics.activeAgents")} description={t("fullDiagnostics.3ThisWeek")} />
            <MetricCard icon={CircleDot} value={48} label={t("fullDiagnostics.openIssues")} />
            <MetricCard icon={DollarSign} value="$1,234" label={t("fullDiagnostics.monthlyCost")} description={t("fullDiagnostics.underBudget")} />
            <MetricCard icon={Zap} value="99.9%" label={t("fullPages.uptime")} />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  TABS                                                         */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.tabs")}>
        <SubSection title={t("fullDiagnostics.defaultPillVariant")}>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{fullSharedT("runUi.inspector.overview")}</TabsTrigger>
              <TabsTrigger value="runs">{fullSharedT("agentDetailUi.nav.auditRuns")}</TabsTrigger>
              <TabsTrigger value="config">{t("fullRoutinesSecrets.config")}</TabsTrigger>
              <TabsTrigger value="costs">{fullSharedT("sidebar.costs")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.overviewTabContent")}</p>
            </TabsContent>
            <TabsContent value="runs">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.runsTabContent")}</p>
            </TabsContent>
            <TabsContent value="config">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.configTabContent")}</p>
            </TabsContent>
            <TabsContent value="costs">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.costsTabContent")}</p>
            </TabsContent>
          </Tabs>
        </SubSection>

        <SubSection title={t("fullDiagnostics.lineVariant")}>
          <Tabs defaultValue="summary">
            <TabsList variant="line">
              <TabsTrigger value="summary">{fullSharedT("approvalsUi.summary")}</TabsTrigger>
              <TabsTrigger value="details">{t("fullDiagnostics.details")}</TabsTrigger>
              <TabsTrigger value="comments">{fullSharedT("searchUi.scope.comments")}</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.summaryContentWithUnderlineTabs")}</p>
            </TabsContent>
            <TabsContent value="details">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.detailsContent")}</p>
            </TabsContent>
            <TabsContent value="comments">
              <p className="text-sm text-muted-foreground py-4">{t("fullDiagnostics.commentsContent")}</p>
            </TabsContent>
          </Tabs>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  ENTITY ROWS                                                  */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.entityRows")}>
        <div className="border border-border rounded-md">
          <EntityRow
            leading={
              <>
                <StatusIcon status="in_progress" />
                {/* PAP-411: PriorityIcon hidden behind SHOW_TASK_PRIORITY_UI. */}
                {SHOW_TASK_PRIORITY_UI && <PriorityIcon priority="high" />}
              </>
            }
            identifier="PAP-001"
            title="Implement authentication flow"
            subtitle={t("fullDiagnostics.responsibleExample")}
            trailing={<IssueStatusBadge status="in_progress" />}
            onClick={() => {}}
          />
          <EntityRow
            leading={
              <>
                <StatusIcon status="done" />
                {SHOW_TASK_PRIORITY_UI && <PriorityIcon priority="medium" />}
              </>
            }
            identifier="PAP-002"
            title="Set up CI/CD pipeline"
            subtitle={t("fullDiagnostics.completedExample")}
            trailing={<IssueStatusBadge status="done" />}
            onClick={() => {}}
          />
          <EntityRow
            leading={
              <>
                <StatusIcon status="todo" />
                {SHOW_TASK_PRIORITY_UI && <PriorityIcon priority="low" />}
              </>
            }
            identifier="PAP-003"
            title="Write API documentation"
            trailing={<IssueStatusBadge status="todo" />}
            onClick={() => {}}
          />
          <EntityRow
            leading={
              <>
                <StatusIcon status="blocked" />
                {SHOW_TASK_PRIORITY_UI && <PriorityIcon priority="critical" />}
              </>
            }
            identifier="PAP-004"
            title="Deploy to production"
            subtitle={t("fullDiagnostics.blockedExample")}
            trailing={<IssueStatusBadge status="blocked" />}
            selected
          />
        </div>
        <SubSection title={t("fullDiagnostics.membershipAction")}>
          <div className="border border-border rounded-md">
            <EntityRow
              title={t("fullDiagnostics.joinedResource")}
              subtitle={t("fullDiagnostics.rowActionHint")}
              className="group"
              trailing={
                <MembershipAction
                  state="joined"
                  resourceName="Joined resource"
                  onJoin={() => {}}
                  onLeave={() => {}}
                />
              }
            />
            <EntityRow
              title={t("fullDiagnostics.leftResource")}
              subtitle={t("fullDiagnostics.dimmedActionHint")}
              className="group text-foreground/55"
              trailing={
                <MembershipAction
                  state="left"
                  resourceName="Left resource"
                  onJoin={() => {}}
                  onLeave={() => {}}
                />
              }
            />
            <EntityRow
              title={t("fullDiagnostics.leavingResource")}
              subtitle={t("fullDiagnostics.pendingActionHint")}
              className="group text-foreground/55"
              trailing={
                <MembershipAction
                  state="left"
                  pending
                  pendingState="left"
                  resourceName="Leaving resource"
                  onJoin={() => {}}
                  onLeave={() => {}}
                />
              }
            />
            <EntityRow
              title={t("fullDiagnostics.joiningResource")}
              subtitle={t("fullDiagnostics.optimisticActionHint")}
              className="group"
              trailing={
                <MembershipAction
                  state="joined"
                  pending
                  pendingState="joined"
                  resourceName="Joining resource"
                  onJoin={() => {}}
                  onLeave={() => {}}
                />
              }
            />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  FILTER BAR                                                   */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.filterBar")}>
        <FilterBar
          filters={filters}
          onRemove={(key) => setFilters((f) => f.filter((x) => x.key !== key))}
          onClear={() => setFilters([])}
        />
        {filters.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters([
                { key: "status", label: fullSharedT("sidebar.status"), value: "Active" },
                // PAP-411: priority filter demo row suppressed while SHOW_TASK_PRIORITY_UI is off.
                ...(SHOW_TASK_PRIORITY_UI
                  ? [{ key: "priority", label: fullSharedT("fullShared.priority_d60dbb"), value: "High" } as FilterValue]
                  : []),
              ])
            }
          >{t("fullPages.resetFilters")}</Button>
        )}
      </Section>

      {/* ============================================================ */}
      {/*  AVATARS                                                      */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.avatars")}>
        <SubSection title={t("fullDiagnostics.sizes")}>
          <div className="flex items-center gap-3">
            <Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>DF</AvatarFallback></Avatar>
            <Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>
          </div>
        </SubSection>

        <SubSection title={fullSharedT("tasks.group")}>
          <AvatarGroup>
            <Avatar><AvatarFallback>A1</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>A2</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>A3</AvatarFallback></Avatar>
            <AvatarGroupCount>+5</AvatarGroupCount>
          </AvatarGroup>
        </SubSection>
      </Section>

      <Section title={t("fullDiagnostics.appLogos")}>
        <SubSection title={t("fullDiagnostics.officialMarksAndRuntimeFallback")}>
          <div className="flex items-center gap-3">
            <AppLogo
              name="Notion"
              logoUrl="/brands/apps/notion.svg"
              darkLogoUrl="/brands/apps/notion-dark.svg"
              size={36}
            />
            <AppLogo name="Jira" logoUrl="/brands/apps/jira.svg" darkLogoUrl="/brands/apps/jira-dark.svg" size={44} />
            <AppLogo name="Fallback" logoUrl="/brands/apps/does-not-exist.svg" size={36} />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  IDENTITY                                                     */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.agentPersonas")}>
        <SubSection title={t("fullDiagnostics.stablePaletteIdentities")}>
          <div className="flex flex-wrap gap-3">{AGENT_PALETTE_IDS.map(palette => <AgentAvatar key={palette} appearance={appearanceForPalette(palette)} size={48} label={palette} />)}</div>
        </SubSection>
        <SubSection title={t("fullDiagnostics.onboardingAndLiveCharacter")}>
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.placeOneLiveCharacterBesideTheAgent")}</p>
          <div className="flex gap-4"><AgentCharacter muted state="sleepy" motion="still" size={128} /><AgentCharacter size={128} /></div>
        </SubSection>
      </Section>
      <Section title={t("fullDiagnostics.humanIdentity")}>
        <SubSection title={t("fullDiagnostics.sizes")}>
          <div className="flex items-center gap-6">
            <Identity name="Alex Morgan" size="sm" />
            <Identity name="Alex Morgan" />
            <Identity name="Alex Morgan" size="lg" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.initialsDerivation")}>
          <div className="flex flex-col gap-2">
            <Identity name="Casey Jordan" size="sm" />
            <Identity name="Alpha" size="sm" />
            <Identity name="Quinn Lee" size="sm" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.customInitials")}>
          <Identity name="Backend Service" initials="BS" size="sm" />
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  TOOLTIPS                                                     */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.tooltips")}>
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">{t("fullDiagnostics.hoverMe")}</Button>
            </TooltipTrigger>
            <TooltipContent>{t("fullDiagnostics.thisIsATooltip")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm"><Settings /></Button>
            </TooltipTrigger>
            <TooltipContent>{fullSharedT("companySwitcher.settings")}</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  DIALOG                                                       */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.dialog")}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">{t("fullDiagnostics.openDialog")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("fullDiagnostics.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("fullDiagnostics.thisIsASampleDialogShowingThe")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{fullSharedT("fullShared.name_dcd1d5")}</Label>
                <Input placeholder={t("fullDiagnostics.enterAName")} className="mt-1.5" />
              </div>
              <div>
                <Label>{fullSharedT("companySettings.description")}</Label>
                <Textarea placeholder={t("fullDiagnostics.describe")} className="mt-1.5" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">{fullSharedT("fullShared.cancel_19766e")}</Button>
              <Button>{fullSharedT("inboxPolicy.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      {/* ============================================================ */}
      {/*  EMPTY STATE                                                  */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.emptyState")}>
        <div className="border border-border rounded-md">
          <EmptyState
            icon={Inbox}
            message={t("fullDiagnostics.noItemsToShowCreateYourFirst")}
            action="Create Item"
            onAction={() => {}}
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  PROGRESS BARS                                                */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.progressBarsBudget")}>
        <div className="space-y-3">
          {[
            { label: t("fullDiagnostics.underBudget40"), pct: 40, color: "bg-green-400" },
            { label: t("fullDiagnostics.warning75"), pct: 75, color: "bg-yellow-400" },
            { label: t("fullDiagnostics.overBudget95"), pct: 95, color: "bg-red-400" },
          ].map(({ label, pct, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-mono">{pct}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-(--tp-width-background-color) duration-150 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  LOG VIEWER                                                   */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.logViewer")}>
        <div className="bg-neutral-950 rounded-lg p-3 font-mono text-xs max-h-80 overflow-y-auto">
          <div className="text-foreground">[12:00:01] INFO  Agent started successfully</div>
          <div className="text-foreground">[12:00:02] INFO  Processing task PAP-001</div>
          <div className="text-yellow-400">[12:00:05] WARN  Rate limit approaching (80%)</div>
          <div className="text-foreground">[12:00:08] INFO  Task PAP-001 completed</div>
          <div className="text-red-400">[12:00:12] ERROR Connection timeout to upstream service</div>
          <div className="text-blue-300">[12:00:12] SYS   Retrying connection in 5s...</div>
          <div className="text-foreground">[12:00:17] INFO  Reconnected successfully</div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 animate-pulse" />
              <span className="inline-flex h-full w-full rounded-full bg-blue-500" />
            </span>
            <span className="text-blue-600 dark:text-blue-400">{t("fullDiagnostics.live")}</span>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  PROPERTY ROW PATTERN                                         */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.propertyRowPattern")}>
        <div className="border border-border rounded-md p-4 space-y-1 max-w-sm">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{fullSharedT("sidebar.status")}</span>
            <StatusBadge status="active" />
          </div>
          {/* PAP-411: priority metadata row hidden behind SHOW_TASK_PRIORITY_UI. */}
          {SHOW_TASK_PRIORITY_UI && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.priority_d60dbb")}</span>
              <PriorityIcon priority="high" />
            </div>
          )}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{fullSharedT("taskViews.column_assignee")}</span>
            <div className="flex items-center gap-1.5">
              <Avatar size="sm"><AvatarFallback>A</AvatarFallback></Avatar>
              <span className="text-xs">Agent Alpha</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.created_d70b9e")}</span>
            <span className="text-xs">Jan 15, 2025</span>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  NAVIGATION PATTERNS                                          */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.navigationPatterns")}>
        <SubSection title={t("fullDiagnostics.independentMcpConnections")}>
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.zapierArcadeComposioAndExecutorEachOwn")}</p>
          <RemoteMcpDesignExample />
        </SubSection>
        <SubSection title={t("fullDiagnostics.setupWizard")}>
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.sharedByConnectionSetupAndTriggerPreviews")}</p>
          <div className="max-w-sm space-y-6">
            <SetupWizardNavigation inline labels={["Choose trigger", "Configure", "Review"]} step={wizardStep} availableStep={2} onSelect={setWizardStep} />
            <SetupWizardFooter onSaveExit={() => setWizardStep(0)}><Button onClick={() => setWizardStep((wizardStep + 1) % 3)}>{fullSharedT("onboarding.actions.continue")}</Button></SetupWizardFooter>
          </div>
        </SubSection>
        <SubSection title={t("fullDiagnostics.agentChatPicker")}>
          <AgentChatPickerExample />
          <SubSection title={t("fullDiagnostics.agentConversationSidebar")}>
            <div className="flex flex-wrap gap-4">
              <div className="h-96 w-60"><AgentConversationSidebar agents={[]} onSelect={() => {}} onBrowse={() => {}} /></div>
              <div className="h-96 w-60"><AgentConversationSidebar agents={[]} loading /></div>
              <div className="h-96 w-60"><AgentConversationSidebar agents={[]} error={new Error("Unavailable")} onRetry={() => {}} /></div>
            </div>
          </SubSection>
        </SubSection>
        <SubSection title={t("fullDiagnostics.sidebarNavItems")}>
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.layoutAcceptsSidebarsectionsToComposeAdditionalSidebarsection")}</p>
          <Card className="block w-60 p-3 space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-accent-foreground">
              <LayoutDashboard className="h-4 w-4" />{fullSharedT("sidebar.dashboard")}</div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground cursor-pointer">
              <CircleDot className="h-4 w-4" />{t("fullDiagnostics.issues")}<Badge variant="ghost" className="ml-auto bg-primary text-primary-foreground px-1.5">
                12
              </Badge>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground cursor-pointer">
              <Bot className="h-4 w-4" />{fullSharedT("sidebar.agents")}</div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground cursor-pointer">
              <Hexagon className="h-4 w-4" />{fullSharedT("sidebar.projects")}</div>
          </Card>
        </SubSection>

        <SubSection title={t("fullDiagnostics.viewToggle")}>
          <div className="flex items-center border border-border rounded-md w-fit">
            <button className="px-3 py-1.5 text-xs font-medium bg-accent text-foreground rounded-l-md">
              <ListTodo className="h-3.5 w-3.5 inline mr-1" />{t("fullDiagnostics.list")}</button>
            <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 rounded-r-md">
              <Target className="h-3.5 w-3.5 inline mr-1" />{fullSharedT("sidebar.org")}</button>
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  GROUPED LIST (Issues pattern)                                */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.groupedListIssuesPattern")}>
        <div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-t-md">
            <StatusIcon status="in_progress" />
            <span className="text-sm font-medium">{fullSharedT("liveDashboardUi.chart.in_progress")}</span>
            <span className="text-xs text-muted-foreground ml-1">2</span>
          </div>
          <div className="border border-border rounded-b-md">
            {/* PAP-411: leading PriorityIcon hidden behind SHOW_TASK_PRIORITY_UI. */}
            <EntityRow
              leading={SHOW_TASK_PRIORITY_UI ? <PriorityIcon priority="high" /> : undefined}
              identifier="PAP-101"
              title="Build agent heartbeat system"
              onClick={() => {}}
            />
            <EntityRow
              leading={SHOW_TASK_PRIORITY_UI ? <PriorityIcon priority="medium" /> : undefined}
              identifier="PAP-102"
              title="Add cost tracking dashboard"
              onClick={() => {}}
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  COMMENT THREAD PATTERN                                       */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.commentThreadPattern")}>
        <div className="space-y-3 max-w-2xl">
          <h3 className="text-sm font-semibold">{t("fullDiagnostics.comments2")}</h3>
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{fullSharedT("taskProperties.fields.agent")}</span>
                <span className="text-xs text-muted-foreground">Jan 15, 2025</span>
              </div>
              <p className="text-sm">Started working on the authentication module. Will need API keys configured.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">{t("fullPages.human")}</span>
                <span className="text-xs text-muted-foreground">Jan 16, 2025</span>
              </div>
              <p className="text-sm">API keys have been added to the vault. Please proceed.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Textarea placeholder={fullSharedT("fullShared.leave_a_comment_4dff58")} rows={3} />
            <Button size="sm">{fullSharedT("searchUi.result.comment")}</Button>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  COST TABLE PATTERN                                           */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.costTablePattern")}>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-accent/20">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{fullSharedT("onboarding.model.label")}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t("fullPages.tokens")}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t("fullDiagnostics.cost")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-3 py-2">claude-sonnet-4-20250514</td>
                <td className="px-3 py-2 font-mono">1.2M</td>
                <td className="px-3 py-2 font-mono">$18.00</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2">claude-haiku-4-20250506</td>
                <td className="px-3 py-2 font-mono">500k</td>
                <td className="px-3 py-2 font-mono">$1.25</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">{t("fullDiagnostics.total")}</td>
                <td className="px-3 py-2 font-mono">1.7M</td>
                <td className="px-3 py-2 font-mono font-medium">$19.25</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SKELETONS                                                    */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.skeletons")}>
        <SubSection title={t("fullDiagnostics.individual")}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-20 w-full" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.pageSkeletonList")}>
          <div className="border border-border rounded-md p-4">
            <PageSkeleton variant="list" />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.pageSkeletonDetail")}>
          <div className="border border-border rounded-md p-4">
            <PageSkeleton variant="detail" />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  SEPARATOR                                                    */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.separator")}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("fullDiagnostics.horizontal")}</p>
          <Separator />
          <div className="flex items-center gap-4 h-8">
            <span className="text-sm">{t("fullDiagnostics.left")}</span>
            <Separator orientation="vertical" />
            <span className="text-sm">{t("fullDiagnostics.right")}</span>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ICON REFERENCE                                               */}
      {/* ============================================================ */}
      {/*  TEAM CATALOG                                                 */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.teamCatalog")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.componentsFromTheTeamCatalogBrowseInstall")}<code className="font-mono text-xs">/teams-catalog</code>{t("fullDiagnostics.fixturesAreSharedWithTheStorybookStories")}</p>

        <SubSection title={t("fullDiagnostics.teamrowBrowseList")}>
          <div className="w-(--sz-28rem) rounded-md border border-border">
            <div className="px-3 py-2 text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">{t("fullDiagnostics.bundled1")}</div>
            <TeamRow team={sampleTeam} selected onSelect={() => {}} />
            <div className="px-3 py-2 text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">{t("fullDiagnostics.optional2")}</div>
            <TeamRow team={optionalTeam} selected={false} onSelect={() => {}} />
            <div className="px-3 py-2 text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">{t("fullDiagnostics.installed2")}</div>
            <TeamRow team={sampleTeam} selected={false} onSelect={() => {}} installed={outOfDateInstalledState} />
            <TeamRow team={warnTeam} selected={false} onSelect={() => {}} installed={currentInstalledState} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.installedTeamsCollapseUnder")}{" "}<code className="font-mono">{t("fullDiagnostics.installedN")}</code>{t("fullDiagnostics.anOutOfDateInstallServer")}{" "}<code className="font-mono">originHash</code>{" "}{t("fullDiagnostics.catalog")}{" "}<code className="font-mono">contentHash</code>{t("fullDiagnostics.showsTheAmber")}{" "}<code className="font-mono">↑</code>{" "}{t("fullDiagnostics.badgePap10256")}</p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.teamcardOnboardingGrid")}>
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.squareTileForTheOnboardingPickA")}{" "}
            <code className="font-mono">ring-2 ring-ring</code>{t("fullDiagnostics.drivesThe")}{" "}
            <code className="font-mono">useInstallTeamCatalogEntry</code>{" "}{t("fullDiagnostics.simplifiedFlow")}</p>
          <TeamCardShowcase />
        </SubSection>

        <SubSection title="TeamHierarchyPreview">
          <div className="max-w-md">
            <TeamHierarchyPreview team={sampleTeam} />
          </div>
        </SubSection>

        <SubSection title="RequiredSkillsList">
          <div className="max-w-xl">
            <RequiredSkillsList skills={sampleTeam.requiredSkills} />
          </div>
        </SubSection>

        <SubSection title="EnvInputsList">
          <div className="max-w-xl">
            <EnvInputsList inputs={sampleTeam.envInputs} />
          </div>
        </SubSection>

        <SubSection title="ExternalSourcesList">
          <div className="max-w-xl">
            <ExternalSourcesList sources={sampleTeam.sourceRefs} />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.sourcePolicyStepStepsourcepolicy")}>
          <div className="max-w-xl rounded-md border border-border p-4">
            <StepSourcePolicy
              team={warnTeam}
              allowExternalSources={allowExternal}
              allowUnpinnedOptionalSources={allowUnpinned}
              allowLocalPathSources={allowLocalPath}
              onChange={(key, value) => {
                if (key === "external") setAllowExternal(value);
                if (key === "unpinned") setAllowUnpinned(value);
                if (key === "localPath") setAllowLocalPath(value);
              }}
            />
          </div>
        </SubSection>

        <SubSection title={t("fullDiagnostics.skillPlanStepStepskillplan")}>
          <div className="max-w-xl rounded-md border border-border p-4">
            <StepSkillPlan team={sampleTeam} preparations={sampleSkillPreparations} />
          </div>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.commonIconsLucide")}>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {[
            ["Inbox", Inbox],
            ["ListTodo", ListTodo],
            ["CircleDot", CircleDot],
            ["Hexagon", Hexagon],
            ["Target", Target],
            ["LayoutDashboard", LayoutDashboard],
            ["Bot", Bot],
            ["DollarSign", DollarSign],
            ["History", History],
            ["Search", Search],
            ["Plus", Plus],
            ["Trash2", Trash2],
            ["Settings", Settings],
            ["User", User],
            ["Mail", Mail],
            ["Upload", Upload],
            ["Zap", Zap],
          ].map(([name, Icon]) => {
            const LucideIcon = Icon as React.FC<{ className?: string }>;
            return (
              <div key={name as string} className="flex flex-col items-center gap-1.5 p-2">
                <LucideIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-(length:--text-nano) text-muted-foreground font-mono">{name as string}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  KEYBOARD SHORTCUTS                                           */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.keyboardShortcuts")}>
        <div className="border border-border rounded-md divide-y divide-border text-sm">
          {[
            ["Cmd+K / Ctrl+K", t("fullDiagnostics.shortcutPalette")],
            ["C", t("fullDiagnostics.shortcutIssue")],
            ["[", t("fullDiagnostics.shortcutSidebar")],
            ["]", t("fullDiagnostics.shortcutProperties")],

            ["Cmd+Enter / Ctrl+Enter", t("fullDiagnostics.shortcutComment")],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between px-4 py-2">
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("fullDiagnostics.issueOutputSurface")}>
        <SubSection title={t("fullDiagnostics.multipleOutputsPrimaryVideoAlsoProduced")}>
          <IssueOutputSection workProducts={DESIGN_GUIDE_OUTPUTS} />
        </SubSection>
        <SubSection title={t("fullDiagnostics.degradedOutputInvalidFailedAttachmentMetadata")}>
          <IssueOutputSection workProducts={DESIGN_GUIDE_DEGRADED_OUTPUTS} />
        </SubSection>
        <SubSection title={t("fullDiagnostics.emptyState_41dac3")}>
          <p className="text-xs text-muted-foreground">{t("fullDiagnostics.whenAnIssueHasProducedNoArtifact")}</p>
        </SubSection>
      </Section>

      {/* ============================================================ */}
      {/*  TOOLS & ACCESS (PAP-10389)                                   */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.toolsAccess")}>
        <SubSection title={t("fullDiagnostics.enforcementbannerDefaultDeniedDetected")}>
          <div className="space-y-3">
            <EnforcementBanner companyId="" forceVariant="default" recentDenialCount={0} />
            <EnforcementBanner companyId="" forceVariant="denied-detected" recentDenialCount={3} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.persistentAtTheTopOfTheTools")}{" "}<code>denied-detected</code>{" "}{t("fullDiagnostics.whenGovernedToolCallsWereDeniedOr")}</p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.enforcementbannerPresentationalTonesInfoWarningError")}>
          <div className="space-y-3">
            <EnforcementBanner
              tone="info"
              title={t("fullDiagnostics.effectiveAccessServerResolved")}
              body={t("fullDiagnostics.gatewayBoundary")}
            />
            <EnforcementBanner
              tone="warning"
              title={t("fullDiagnostics.localStdioIsLocalCodeExecutionNot")}
              body={t("fullDiagnostics.localStdioWarning")}
            />
            <EnforcementBanner
              tone="error"
              title={t("fullDiagnostics.runtimeFailedClosed")}
              body={t("fullDiagnostics.supervisorRestart")}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.staticGovernanceCopyWithAToneUsed")}{" "}<code>title</code>/<code>body</code>{" "}{t("fullDiagnostics.andAnOptional")}{" "}
            <code>icon</code>.
          </p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.actionApprovalCardPendingStaleSurfaces11")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <ActionCard
              toolName="slack.post_message"
              risk="medium"
              isWrite
              binding={{
                application: "Slack",
                manifestVersion: "2.4.1",
                connection: "https://slack.com/api · acme-workspace",
                catalogSha256: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                payloadSha256: "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
              }}
              input={{ channel: "#launch", text: "Deploy v2 is live 🎉", unfurl_links: false }}
              reason="This tool can write to your workspace, so a human signs off before the agent posts."
              policyNumber={7}
              expiresInLabel="expires in 23h 51m"
            />
            <ActionCard
              variant="stale"
              toolName="slack.post_message"
              risk="medium"
              isWrite
              binding={{
                application: "Slack",
                manifestVersion: "2.4.1",
                connection: "https://slack.com/api · acme-workspace",
                catalogSha256: "sha256:7d793037a0760186574b0282f2f435e7a4b1b2b0b822cd15d6c15b0f00a0e3f1",
                previousCatalogSha256: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                payloadSha256: "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
              }}
              input={{ channel: "#launch", text: "Deploy v2 is live 🎉", unfurl_links: false }}
              reason="This tool can write to your workspace, so a human signs off before the agent posts."
              policyNumber={7}
              expiresInLabel="expires in 18h 02m"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.signedPayloadSha256ExpirySurfaceOnEvery")}{" "}
            <code>stale</code>{" "}{t("fullDiagnostics.variantTintsTheBorderAmberBannersThe")}{" "}<code>{t("fullDiagnostics.approve")}</code>{" "}{t("fullDiagnostics.disabledUntilTheRequestIsReIssued")}</p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.actionApprovalCardMobile390844Surface")}>
          <div className="w-(--sz-390px) max-w-full rounded-xl border border-border bg-background p-3">
            <ActionCardMobile
              toolName="slack.post_message"
              risk="medium"
              isWrite
              binding={{
                application: "Slack",
                manifestVersion: "2.4.1",
                connection: "https://slack.com/api · acme-workspace",
                catalogSha256: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                payloadSha256: "sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
              }}
              input={{ channel: "#launch", text: "Deploy v2 is live 🎉" }}
              reason="This tool can write to your workspace, so a human signs off before the agent posts."
              policyNumber={7}
              expiresInLabel="expires in 23h 51m"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.identicalContentTheThreeButtonsStackFull")}</p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.bindingstableReusedInTheAuditRowDrilldown")}>
          <BindingsTable
            rows={[
              { label: fullSharedT("fullShared.application_e7ad52"), value: "Slack · manifest v2.4.1" },
              { label: fullSharedT("providerSetup.select.connection"), value: "https://slack.com/api · acme-workspace", mono: true },
              { label: fullSharedT("agentSkillsUi.source.catalog"), value: "sha256:9f86d081…f00a08", mono: true },
              { label: fullSharedT("fullShared.payload_997333"), value: "sha256:2c26b46b…66e7ae", mono: true },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.twoColumnKeyValueBlockWithMono")}{" "}<code>ActionCard</code>{" "}{t("fullDiagnostics.andIsReusedStandaloneInTheAudit")}</p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.toolAccessStatusKeysStatusbadge")}>
          <div className="flex flex-wrap items-center gap-2">
            {[
              "allowed", "denied", "block", "require-approval", "redacted", "rate-limit",
              "deferred", "hidden", "quarantined", "healthy", "degraded", "runtime-error", "unchecked",
            ].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fullDiagnostics.policyDecisionsConnectionRuntimeHealthAndCatalog")}{" "}
            <code>StatusBadge</code>{" "}{t("fullDiagnostics.keysDefinedIn")}{" "}<code>lib/status-colors</code>.
          </p>
        </SubSection>

        <SubSection title={t("fullDiagnostics.emptystateCanonicalWithDescriptionAction")}>
          <EmptyState
            icon={Inbox}
            message={t("fullDiagnostics.noConnectionsYet")}
            description={t("fullDiagnostics.addAConnectionToAnApplicationTo")}
            action="New connection"
            onAction={() => {}}
          />
        </SubSection>
      </Section>

      <Section title={t("fullDiagnostics.githubSkillSources")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.theSharedFiletreeExplorerLayoutPutsDisclosure")}</p>
        <SkillSourceTreeShowcase />
        <SkillBinaryFile file={{ skillId: "example", path: "assets/example.bin", kind: "asset", content: "AAECAw==", encoding: "base64", language: null, markdown: false, editable: false }} />
      </Section>

      <Section title={t("fullDiagnostics.sourceRepositories")}>
        <SubSection title={t("fullDiagnostics.emptyAndDisconnected")}>
          <RepositoryEditor selected={[]} onChange={() => {}} state="disconnected" onConnect={() => {}} onRetry={() => {}} />
        </SubSection>
        <SubSection title={t("fullDiagnostics.selectedAndSearchable")}>
          <RepositoryEditor selected={[{ id: "1", fullName: "paperclipai/paperclip", url: "https://github.com/paperclipai/paperclip", connections: ["Your GitHub"] }]}
            available={[{ id: "2", fullName: "paperclipai/docs", url: "https://github.com/paperclipai/docs", connections: ["Company GitHub"] }]}
            onChange={() => {}} onConnect={() => {}} onRetry={() => {}} />
        </SubSection>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.loadingErrorsEmptySearchMobileAndShort")}</p>
      </Section>

      <Section title={t("fullDiagnostics.environmentVariablesEditor")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.reusableEnvVarEditorAgentsProjectsEnvironments")}{" "}<span className="font-mono">Product/Environment Variables Editor</span>{" "}{t("fullDiagnostics.storiesForAll10States")}</p>
        <EnvironmentVariablesEditorShowcase />
      </Section>

      <Section title={t("fullDiagnostics.tasksCreatedFromATask")}>
        <SubSection title={t("fullDiagnostics.subtasksAndCreatedWorkAreIndependent")}>
          <div className="max-w-xl">
            <TaskDetailTasksPanel
              subtasks={[DESIGN_GUIDE_TASK]}
              createdTasks={[
                { ...DESIGN_GUIDE_TASK, projectId: "design-board", project: { id: "design-board", name: "Board UI" } as Issue["project"] },
                { ...DESIGN_GUIDE_TASK, id: "design-followup", identifier: "PAP-428", title: "Write release notes", status: "todo", projectId: null },
              ]}
              projects={[]}
            />
          </div>
        </SubSection>
        <SubSection title={t("fullDiagnostics.emptyLoadingAndFailed")}>
          <TaskDetailTasksPanel subtasks={[]} createdTasks={[]} projects={[]} />
          <TaskDetailTasksPanel subtasks={[]} createdTasks={[]} projects={[]} isLoading />
          <TaskDetailTasksPanel subtasks={[]} createdTasks={[]} projects={[]} hasError onRetry={() => {}} />
        </SubSection>
      </Section>

      <Section title={t("fullDiagnostics.dispositionRecoveryNotice")}>
        <SubSection title={t("fullDiagnostics.needsAttentionWithInspectableDetails")}>
          <DispositionRecoveryNotice snapshot={{ kind: "disposition_repair_escalated", actionId: "design-recovery", attemptCount: 2, maxAttempts: 2, reason: "unchanged_source_state_exhausted", assigneeAgentId: null }} defaultExpanded />
        </SubSection>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.storybookSRecoveryNoticeStoriesShowThe")}</p>
      </Section>

      <Section title={t("fullDiagnostics.pendingTaskInputAboveComposer")}>
        <p className="mb-3 text-sm text-muted-foreground">{t("fullDiagnostics.aDecisionCardSitsAboveTheOrdinary")}</p>
        <TaskPendingInputExample />
      </Section>

      <Section title={t("fullDiagnostics.executionRecovery")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.recoveryRunsInTheBackgroundTaskLists")}</p>
      </Section>

      <Section title={t("fullDiagnostics.cloudSignInUnavailable")}>
        <CloudSignIn cloud={{ managed: true, managedBy: "paperclip-cloud", cloudBaseUrl: null, stackSlug: null }} returnTo="/" />
      </Section>

      <Section title={t("fullDiagnostics.savedProviderApiKeys")}>
        <SavedProviderKeySelect options={[{ id: "example", label: t("fullDiagnostics.claudeApiKeyYourKey"), binding: { type: "user_secret_ref", key: "ANTHROPIC_API_KEY", version: "latest" } }]} value="example" onChange={() => {}} loading={false} error={false} />
        <SavedProviderKeySelect options={[]} value="" onChange={() => {}} loading error={false} />
        <SavedProviderKeySelect options={[]} value="" onChange={() => {}} loading={false} error />
      </Section>

      <Section title={t("fullDiagnostics.voiceConversations")}>
        <div className="flex flex-col gap-6">
          <VoiceControls state="working" agentName="Company Phone Agent" onStart={() => {}} onMute={() => {}} onEnd={() => {}} onResumeAudio={() => {}} />
          <VoiceControls state="failed" agentName="Company Phone Agent" error="Microphone access was denied. Allow access in your browser, then try again." onStart={() => {}} onMute={() => {}} onEnd={() => {}} onResumeAudio={() => {}} />
          <VoiceTranscript agentName="Company Phone Agent" entries={[
            { id: "ack", source: "agent", text: "I’m checking that now.", final: true },
            { id: "followup", source: "user", text: "Include the revised delivery address too.", final: true },
          ]} />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.spekoProviderSetup")}>
        <SpekoPhoneCallbackForm onSave={() => {}} />
        <SpekoCallHistoryView onRetry={() => {}} />
        <div className="divide-y divide-border border-y border-border">
          <SpekoCallActivityItem presentation="activity" entry={{session: {id: "demo-call", companyId: "demo", endpointId: "demo", issueId: "demo-task", assignedAgentId: "demo-agent", state: "ended", mode: "browser", generation: 1, callerAuthority: "member", replyCursor: 0, createdAt: "2026-10-07T17:00:00Z", expiresAt: "2026-10-07T17:10:00Z", endedAt: "2026-10-07T17:02:00Z", errorCode: null}, report: {status: "pending", costMicroUsd: null, durationSeconds: null, updatedAt: null, transcript: []}}} />
          <SpekoUnapprovedCallActivityItem presentation="activity" call={{id: "demo-missed", state: "expired", createdAt: "2026-10-07T17:00:00Z", updatedAt: "2026-10-07T17:02:00Z"}} />
        </div>
        <SpekoPhoneLineForm onRefresh={() => {}} onSave={() => {}} />
        <SpekoIncomingCallCard call={{id: "demo", state: "awaiting_approval", approvalCode: "123456", createdAt: "2026-10-07T17:00:00Z", expiresAt: "2026-10-07T17:02:00Z", sessionId: null}} onDecide={() => {}} />
        <SpekoProviderSetup agentName="Company Phone Agent" callbackUrl="https://paperclip.example/api/voice-webhooks/example/tools" credentials={{}} onChange={() => {}} onConnect={() => {}} />
      </Section>

      <Section title={t("fullDiagnostics.externalAgentInvitation")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.matchTheHarnessPickerWithProviderCards")}</p>
        <ExternalAgentPresetPicker onSelect={() => {}} />
        <DotConnectionChecks state={{ phase: "testing" }} />
        <ExternalAgentPresetPicker museEnabled onSelect={() => {}} />
        <MuseConnectionChecks state={{ paired: true, receiverDetected: true, backgroundReplyVerified: false, ready: false }} />
        <MuseConnectionChecks state={{ paired: true, receiverDetected: true, backgroundReplyVerified: true, ready: false, problem: "agent_unavailable" }} />
        <MuseConnectionChecks state={{ paired: true, receiverDetected: true, backgroundReplyVerified: true, ready: true }} />
        <MuseConnectionDetails connection={{ enabled: false, publicOrigin: null, agentStatus: "idle", agentLifecycleState: "ready", canConfigureConnection: true, binding: null, usage: null, cost: null }} onTest={() => {}} onRepair={() => {}} onPause={() => {}} onDisconnect={() => {}} onRefresh={() => {}} onAttest={() => {}} />
        <Dialog><DialogTrigger asChild><Button variant="outline">{t("fullDiagnostics.previewInvitationModal")}</Button></DialogTrigger>
          <AnimatedDialogContent><div className="space-y-4 p-6"><DialogTitle>{fullSharedT("agentSetupUi.basics.invite")}</DialogTitle><DialogDescription>{t("fullDiagnostics.chooseAnAgentYouAlreadyUse")}</DialogDescription><ExternalAgentPresetPicker onSelect={() => {}} /></div></AnimatedDialogContent>
        </Dialog>
      </Section>

      <Section title={t("fullDiagnostics.browserSetupPrompt")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.useAgentsetuppromptForPromptsHandedToAn")}</p>
        <SetupPrompt prompt="Design guide example. This is a preview, not a real provider setup request." />
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.forANamedRecipientPassTheOptional")}</p>
        <SetupPrompt prompt="Design guide example for Dot. No live pairing code." label={fullSharedT("externalAgentUi.common.copySetup")} title={fullSharedT("externalAgentUi.dot.title")} agent={{ name: "Dot", src: "/brands/adapters/openai-dot.svg" }} />
      </Section>

      <Section title={t("fullDiagnostics.connectionIntent")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.theTaskCardIsTheDialogHost")}</p>
        <div className="grid gap-4 xl:grid-cols-3">
          <IssueThreadInteractionCard
            interaction={pendingConnectionIntentInteraction}
            currentUserId={issueThreadInteractionFixtureMeta.currentUserId}
          />
          <IssueThreadInteractionCard
            interaction={retryConnectionIntentInteraction}
            currentUserId={issueThreadInteractionFixtureMeta.currentUserId}
          />
          <IssueThreadInteractionCard
            interaction={connectedConnectionIntentInteraction}
            currentUserId={issueThreadInteractionFixtureMeta.currentUserId}
          />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.agentmailApiKey")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.agentmailSetupHasTwoStepsPickAn")}</p>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.previewOnlyThisFieldDoesNotSave")}</p>
        <div className="max-w-md">
          <AgentMailApiKeyField value={agentmailDemoKey} onChange={setAgentmailDemoKey} />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.resizablePanels")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.designSystemWrapperOver")}{" "}<span className="font-mono">react-resizable-panels</span>{" "}{t("fullDiagnostics.skillStudioD2DragAHandleTo")}<span className="font-mono">minSize="240px"</span>{t("fullDiagnostics.constraintsAndTheMiddlePanelIsCollapsible")}</p>
        <div className="h-48 max-w-2xl overflow-hidden rounded-md border border-border">
          <ResizablePanelGroup>
            <ResizablePanel id="a" minSize="120px" className="bg-muted/30">
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("fullDiagnostics.panelA")}</div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="b" minSize="120px" collapsible collapsedSize="40px" className="bg-muted/10">
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("fullDiagnostics.panelBCollapsible")}</div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="c" minSize="120px" className="bg-muted/30">
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("fullDiagnostics.panelC")}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  INLINE BANNER + BUILT-IN AGENTS                              */}
      {/* ============================================================ */}
      <Section title={t("fullDiagnostics.webhookUrlWarnings")}>
        <div className="space-y-3">
          {["http://localhost:3100", "https://paperclip.internal", "https://paperclip.example-tailnet.ts.net", "http://paperclip.example.com", "not-a-url"].map((url) => <WebhookUrlWarning key={url} url={url} />)}
        </div>
      </Section>

      <Section title={t("fullDiagnostics.inlineBanner")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.tokenBackedFullWidthNotice")}<span className="font-mono">brandBanner</span>{" "}{t("fullDiagnostics.tonesUse")}{" "}
          <span className="font-mono">info</span>{" "}{t("fullDiagnostics.forProvenanceContextAnd")}{" "}
          <span className="font-mono">warning</span>{" "}{t("fullDiagnostics.forPausedAttentionSupportsAnOptionalBold")}{" "}
          <span className="font-mono">bg-yellow-*</span>/<span className="font-mono">bg-blue-*</span>{" "}{t("fullDiagnostics.banners")}</p>
        <div className="space-y-3">
          <InlineBanner
            tone="info"
            title={fullSharedT("agentDetailUi.header.builtIn")}
            actions={<Button variant="outline" size="sm">{fullSharedT("agentDetailUi.header.reset")}</Button>}
          >{t("fullPages.shipsWithPaperclipAndPowers")}{" "}<strong>{t("agentDetailUi.header.featureBriefs")}</strong>{t("fullDiagnostics.itCanBePausedButNotDeleted")}</InlineBanner>
          <InlineBanner
            tone="warning"
            title={t("fullDiagnostics.briefsIsPaused")}
            actions={
              <>
                <Button variant="ghost" size="sm">{fullSharedT("fullShared.view_agent_7ce783")}</Button>
                <Button size="sm">{fullSharedT("fullShared.resume_agent_0bb60c")}</Button>
              </>
            }
          >{t("fullDiagnostics.itsBuiltInAgentWasPaused2")}</InlineBanner>
          <InlineBanner
            tone="danger"
            title={t("fullDiagnostics.summaryGenerationFailed")}
            actions={<Button size="sm">{fullSharedT("newIssue.retry")}</Button>}
          >{t("fullDiagnostics.theLinkedIssueReachedATerminalState")}</InlineBanner>
          <InlineBanner tone="info" compact>{t("fullDiagnostics.compactVariantForEmbeddingInsideDialogsAnd")}</InlineBanner>
        </div>
      </Section>

      <Section title={t("fullDiagnostics.textAttachmentTabs")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.uploadedTextOpensInANamedTask")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <TextAttachmentPreview title="README.md" text={"# Project notes\n\nReview the **original** file."} markdown downloadUrl="data:text/markdown,%23%20Project%20notes" />
          <TextAttachmentPreview title="notes.txt" text="Plain text stays literal: <example>" markdown={false} downloadUrl="data:text/plain,Plain%20text" />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.connectionRecovery")}>
        <SubSection title={t("fullDiagnostics.waitingForServer")}>
          <CloudAccessError temporary retrying={false} onRetry={() => undefined} />
        </SubSection>
        <SubSection title={t("fullDiagnostics.checkingConnection")}>
          <CloudAccessError temporary retrying onRetry={() => undefined} />
        </SubSection>
        <SubSection title={t("fullDiagnostics.accessCheckFailed")}>
          <CloudAccessError temporary={false} retrying={false} onRetry={() => undefined} />
        </SubSection>
      </Section>

      <Section title={t("fullDiagnostics.browserSessionFooter")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.fitToPaneFollowsTheVisiblePanel")}</p>
        {(["running", "idle", "closing-soon", "closed"] as const).map((state) => (
          <SubSection key={state} title={state === "closing-soon" ? t("fullDiagnostics.closingSoon") : state}>
            <TaskBrowserFooter
              browser={{
                id: "design-browser", sessionId: "design-session", issueId: "design-task",
                status: state === "closing-soon" ? "idle" : state,
                runStatus: "completed", progress: null, error: null, costCents: 15,
                idleDeadline: new Date(state === "closing-soon" ? 282000 : 600000).toISOString(),
                expiresAt: null, createdAt: new Date(0).toISOString(),
              } satisfies TaskBrowser}
              now={0}
              onControl={() => {}}
              onReconnect={() => {}}
              onResize={() => {}}
            />
          </SubSection>
        ))}
      </Section>

      <Section title={t("fullDiagnostics.browserActivityInTheTaskFeed")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.eachBrowserAppearsOnceAtItsOpening")}</p>
        {(["starting", "running", "idle", "closed", "failed"] as const).map((status) => (
          <SubSection key={status} title={status}>
            <TaskBrowserActivity browser={{
              id: `design-${status}`, sessionId: `design-${status}`, issueId: "design-task", status,
              runStatus: "completed", progress: null, error: null, costCents: 0,
              idleDeadline: null, expiresAt: null, createdAt: new Date(0).toISOString(),
            }} onOpen={() => {}} />
          </SubSection>
        ))}
      </Section>

      <Section title={t("fullDiagnostics.mediaArtifacts")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.imagesAndVideosUseGalleryTilesThe")}</p>
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <MediaArtifactCard id="design-image" title={t("fullDiagnostics.launchArtwork")} contentPath="/announcement-preview.svg" contentType="image/svg+xml" originalFilename="launch.svg" detail="Image" />
          <MediaArtifactCard id="design-video" title={fullSharedT("taskPanels.viewer.videoUnavailable")} contentPath="" contentType="video/mp4" originalFilename="preview.mp4" detail="Video" />
        </div>
      </Section>

      <Section title={t("fullDiagnostics.aiConnections")}>
        <AiConnectionDesignExamples />
      </Section>

      <Section title={t("fullDiagnostics.builtInAgentLifecycleChips")}>
        <p className="text-sm text-muted-foreground">{t("fullDiagnostics.aDerivedLifecycleChipAmberForAttention")}{" "}
          <span className="font-mono">needs_setup</span> / <span className="font-mono">pending_approval</span>.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <BuiltInLifecycleChip status="needs_setup" />
          <BuiltInLifecycleChip status="pending_approval" />
          <BuiltInLifecycleChip status="needs_setup" compact />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-mono">&lt;BuiltInAgentGate agentKey&gt;</span>{" "}{t("fullDiagnostics.composes")}{" "}
          <span className="font-mono">PageSkeleton</span> + <span className="font-mono">EmptyState</span>{" "}
          + <span className="font-mono">InlineBanner</span>{" "}{t("fullDiagnostics.toRenderTheLoadingSetupPendingApproval")}</p>
      </Section>
    </div>
  );
}

function SkillSourceTreeShowcase() {
  useFullSharedTranslation();
  const candidates = [
    { path: ".agents/review/SKILL.md", name: "Review", description: "Review changes before release.", error: null, inspection: { requirements: null, references: [], warnings: [], files: [
      { path: "SKILL.md", kind: "skill", sizeBytes: 120, encoding: "utf8" as const, executable: false },
      { path: "scripts/check.sh", kind: "script", sizeBytes: 45, encoding: "utf8" as const, executable: true },
    ] } },
    { path: ".agents/review/nested/SKILL.md", name: "Nested skill", description: "An independently selected package.", error: null, note: "New skill" },
    { path: "broken/SKILL.md", name: "Needs attention", description: null, error: "Missing required description." },
  ];
  const [selected, setSelected] = useState(new Set(candidates.map(skill => skill.path)));
  const [excluded, setExcluded] = useState<string[]>([]);
  return <SkillSourceTree candidates={candidates} selected={selected} excludedFolders={excluded} onChange={(paths, folders) => { setSelected(paths); setExcluded(folders); }} />;
}
