import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
// token-extraction: allowlisted — intentional one-off decoration (DECISION-SHEET.md B1
// user ruling). The bg-[...gradient...] / shadow-[...] literals in this demo/UX-lab page
// are deliberate one-off decoration, reverted from --gradient-extract-*/--shadow-extract-*
// tokens; the file is on the check-token-gates allowlist in ui/src/index.css.
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemNotice } from "@/components/SystemNotice";
import { systemNoticeFixtures } from "@/fixtures/systemNoticeFixtures";
import { cn } from "@/lib/utils";
import {
  CircleDashed,
  FlaskConical,
  Layers,
  ListChecks,
  Sparkles,
} from "lucide-react";

function LabSection({
  id,
  eyebrow,
  title,
  description,
  accentClassName,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  accentClassName?: string;
  children: ReactNode;
}) {
  useFullSharedTranslation();
  return (
    <section
      id={id}
      className={cn(
        "rounded-(--rad-28) border border-border/70 bg-background/85 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5",
        accentClassName,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FixtureFrame({ caption, children }: { caption: string; children: ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-eyebrow) text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" />
        {caption}
      </div>
      {children}
    </div>
  );
}

function MockUserBubble({
  authorName,
  body,
  alignEnd,
}: {
  authorName: string;
  body: string;
  alignEnd?: boolean;
}) {
  useFullSharedTranslation();
  return (
    <div className={cn("flex items-start gap-2.5", alignEnd && "justify-end")}>
      {!alignEnd ? (
        <Avatar size="sm" className="shrink-0">
          <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : null}
      <div className={cn("flex min-w-0 max-w-(--pct-85) flex-col", alignEnd && "items-end")}>
        <div
          className={cn(
            "mb-1 px-1 text-sm font-medium text-foreground",
            alignEnd ? "text-right" : "text-left",
          )}
        >
          {authorName}
        </div>
        <div className="min-w-0 max-w-full rounded-2xl bg-muted px-4 py-2.5 text-sm leading-6 text-foreground">
          {body}
        </div>
      </div>
      {alignEnd ? (
        <Avatar size="sm" className="shrink-0">
          <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function MockAgentBubble({ agentName, body }: { agentName: string; body: string }) {
  useFullSharedTranslation();
  return (
    <div className="flex items-start gap-2.5">
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>{agentName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 max-w-(--pct-85) flex-col">
        <div className="mb-1 px-1 text-sm font-medium text-foreground">{agentName}</div>
        <div className="min-w-0 max-w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm leading-6 text-foreground">
          {body}
        </div>
      </div>
    </div>
  );
}

const checklist = [
  "One container per system notice — no nested chat bubble",
  "Tone communicated by icon + label, never color alone",
  "Operational evidence hidden behind Details, expanded only on demand",
  "Issue, agent, and run metadata render as typed link rows, not raw markdown",
  "Hierarchy visibly distinct from user (right-aligned) and agent (left-aligned) bubbles",
];

export function SystemNoticeUxLab() {
  useFullSharedTranslation();
  const fixtureById = new Map(systemNoticeFixtures.map((f) => [f.id, f] as const));

  const warningCollapsed = fixtureById.get("warning-collapsed")!;
  const warningExpanded = fixtureById.get("warning-expanded")!;
  const dangerCollapsed = fixtureById.get("danger-collapsed")!;
  const dangerExpanded = fixtureById.get("danger-expanded")!;
  const neutralCollapsed = fixtureById.get("neutral-collapsed")!;
  const neutralExpanded = fixtureById.get("neutral-expanded")!;
  const warningNoDetails = fixtureById.get("warning-no-details")!;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-(--rad-32) border border-border/70 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),transparent_28%),linear-gradient(180deg,rgba(8,145,178,0.08),transparent_44%),var(--background)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-(--gtc-39)">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-3 py-1 text-(length:--text-nano) font-semibold uppercase tracking-(--tracking-caps) text-amber-700 dark:text-amber-300">
              <FlaskConical className="h-3.5 w-3.5" />{t("fullDiagnostics.systemNoticeLab")}</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("fullDiagnostics.firstClassSystemNoticeTreatment")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t("fullDiagnostics.replacesTheCurrentPatternWhereAPaperclip")}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">
                PAP-3525 plan
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">{t("fullDiagnostics.phase1Ux")}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">{t("fullDiagnostics.tonesWarningDangerNeutral")}</Badge>
            </div>
          </div>

          <aside className="border-t border-border/60 bg-background/70 p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center gap-2 text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">
              <ListChecks className="h-4 w-4 text-amber-700 dark:text-amber-300" />{t("fullDiagnostics.whatThisLabProves")}</div>
            <div className="space-y-3">
              {checklist.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 text-sm text-muted-foreground"
                >
                  {line}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <LabSection
        id="tones"
        eyebrow={t("fullDiagnostics.toneMatrix")}
        title={t("fullDiagnostics.threeTonesTwoStates")}
        description={t("fullDiagnostics.eachTonePairsAUniqueIconAnd")}
        accentClassName="bg-[linear-gradient(180deg,rgba(245,158,11,0.05),transparent_28%),var(--background)]"
      >
        <div className="space-y-5">
          <FixtureFrame caption={warningCollapsed.caption}>
            <SystemNotice {...warningCollapsed} />
          </FixtureFrame>
          <FixtureFrame caption={warningExpanded.caption}>
            <SystemNotice {...warningExpanded} />
          </FixtureFrame>
          <FixtureFrame caption={dangerCollapsed.caption}>
            <SystemNotice {...dangerCollapsed} />
          </FixtureFrame>
          <FixtureFrame caption={dangerExpanded.caption}>
            <SystemNotice {...dangerExpanded} />
          </FixtureFrame>
          <FixtureFrame caption={neutralCollapsed.caption}>
            <SystemNotice {...neutralCollapsed} />
          </FixtureFrame>
          <FixtureFrame caption={neutralExpanded.caption}>
            <SystemNotice {...neutralExpanded} />
          </FixtureFrame>
          <FixtureFrame caption={warningNoDetails.caption}>
            <SystemNotice {...warningNoDetails} />
          </FixtureFrame>
        </div>
      </LabSection>

      <LabSection
        id="hierarchy"
        eyebrow={t("fullDiagnostics.threadHierarchy")}
        title={t("fullDiagnostics.distinctFromUserAndAgentComments")}
        description={t("fullDiagnostics.sideBySideWithAdjacentCommentTypes")}
        accentClassName="bg-[linear-gradient(180deg,rgba(8,145,178,0.05),transparent_28%),var(--background)]"
      >
        <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
          <MockUserBubble
            authorName="Riley Board"
            body="Why does this issue keep waking back up without a clear next step?"
            alignEnd
          />
          <MockAgentBubble
            agentName="CodexCoder"
            body="The previous run completed without picking a disposition. I'll wait for the new system notice to surface so the recovery owner is unambiguous."
          />
          <SystemNotice
            tone="danger"
            label={fullSharedT("runUi.system.alert")}
            source={{ label: "Paperclip", href: "/PAP/agents" }}
            timestamp="2026-05-04T16:48:00.000Z"
            body="Paperclip could not resolve this issue's missing disposition automatically. The source assignment is unchanged and a board decision is required."
            metadata={[
              {
                title: fullSharedT("runUi.recovery.recoveryOwner"),
                rows: [
                  {
                    kind: "issue",
                    label: t("fullDiagnostics.recoveryIssue"),
                    identifier: "PAP-3440",
                    href: "/PAP/issues/PAP-3440",
                    title: t("fullDiagnostics.successfulRunHandoffMissingDisposition"),
                  },
                  {
                    kind: "agent",
                    label: fullSharedT("fullShared.owner_4b1b8a"),
                    name: "CTO",
                    href: "/PAP/agents/cto",
                  },
                ],
              },
              {
                title: t("fullDiagnostics.runEvidence"),
                rows: [
                  {
                    kind: "run",
                    label: fullSharedT("runUi.recovery.sourceRun"),
                    runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
                    href: "/PAP/agents/codexcoder/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
                    status: "succeeded",
                  },
                ],
              },
            ]}
          />
          <MockUserBubble
            authorName="Riley Board"
            body="Thanks — assigning the recovery owner now."
            alignEnd
          />
        </div>
      </LabSection>

      <div className="grid gap-5 xl:grid-cols-2">
        <LabSection
          eyebrow={t("fullDiagnostics.before")}
          title={t("fullDiagnostics.todaySNestedTreatment")}
          description={t("fullDiagnostics.theSameContentRenderedThroughTheExisting")}
          accentClassName="bg-[linear-gradient(180deg,rgba(244,63,94,0.05),transparent_28%),var(--background)]"
        >
          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex items-start gap-2.5">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback>YO</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 max-w-(--pct-85) flex-col">
                <div className="mb-1 px-1 text-sm font-medium text-foreground">{fullSharedT("taskDisplay.assignees.you")}</div>
                <div className="min-w-0 max-w-full rounded-2xl bg-muted px-4 py-2.5 text-sm leading-6 text-foreground">
                  <div className="rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-sm text-red-950 dark:text-red-100">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-1 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
                      <div className="min-w-0">
                        <p className="m-0 font-semibold">{t("fullDiagnostics.successfulRunHandoffMissing")}</p>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-(length:--text-compact) leading-5">
                          <li>{t("fullDiagnostics.sourceIssuePap3440")}</li>
                          <li>{t("fullDiagnostics.sourceRun9cdba892C7ca4d9386044843873b127c")}</li>
                          <li>{t("fullDiagnostics.recoveryRun61fdb79b80124676Ac712971830e126a")}</li>
                          <li>{t("fullDiagnostics.statusBeforeInProgress")}</li>
                          <li>{t("fullDiagnostics.normalizedCauseRunCompletedWithoutDisposition")}</li>
                          <li>{t("fullDiagnostics.recoveryOwnerCto")}</li>
                          <li>{t("fullDiagnostics.suggestedActionReassignToRecoveryAgent")}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="px-1 text-xs text-muted-foreground">{t("fullDiagnostics.authorReadsAs")}{" "}<span className="font-medium text-foreground">{t("runUi.author.you")}</span>{" "}{t("fullDiagnostics.evenThoughTheAuthorIsThePaperclip")}</p>
          </div>
        </LabSection>

        <LabSection
          eyebrow={t("fullDiagnostics.after")}
          title={t("fullDiagnostics.systemNoticeReplacement")}
          description={t("fullDiagnostics.oneContainerSystemAuthoredLabelHiddenDetails")}
          accentClassName="bg-[linear-gradient(180deg,rgba(16,185,129,0.05),transparent_28%),var(--background)]"
        >
          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
            <SystemNotice {...dangerCollapsed} />
            <p className="px-1 text-xs text-muted-foreground">{t("fullDiagnostics.sameContentTheVisibleBodyIsOne")}{" "}
              <span className="font-medium text-foreground">{t("fullDiagnostics.details")}</span>{" "}{t("fullDiagnostics.onlyWhenTheyNeedRunEvidenceTone")}</p>
          </div>
        </LabSection>
      </div>

      <Card className="gap-4 border-border/70 bg-background/85 py-0">
        <CardHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">
            <Layers className="h-4 w-4 text-amber-700 dark:text-amber-300" />{t("fullDiagnostics.implementationNotes")}</div>
          <CardTitle className="text-lg">{t("fullDiagnostics.handoffToEngineering")}</CardTitle>
          <CardDescription>{t("fullDiagnostics.whatThePhase4UiImplementationShould")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 pt-0 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <div className="mb-1 font-medium text-foreground">{t("fullDiagnostics.component")}</div>{t("fullDiagnostics.use")}{" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{`<SystemNotice />`}</code>{" "}{t("fullDiagnostics.fromModule")}{" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">@/components/SystemNotice</code>{t("fullDiagnostics.itAccepts")}{" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">tone</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">label</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">body</code>,{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">metadata</code>{t("fullPages.and")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">detailsDefaultOpen</code>.
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <div className="mb-1 font-medium text-foreground">{t("fullDiagnostics.routingInIssuechatthread")}</div>{t("fullDiagnostics.commentsWhere")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">authorType === &quot;system&quot;</code>{" "}{t("fullDiagnostics.or")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">presentation.kind === &quot;system_notice&quot;</code>{" "}{t("fullDiagnostics.shouldRenderAsASystemnoticeRowAt")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">IssueChatUserMessage</code>{" "}{t("fullDiagnostics.orAssistantBubble")}</div>
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <div className="mb-1 font-medium text-foreground">{t("fullDiagnostics.accessibility")}</div>{t("fullDiagnostics.theDetailsButtonHas")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">aria-expanded</code>{" "}{fullSharedT("skillsGap.and")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">aria-controls</code>{" "}{t("fullDiagnostics.wiredToThePanelIdTheContainer")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">role=&quot;status&quot;</code>{" "}{t("fullDiagnostics.andAn")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">aria-label</code>{" "}{t("fullDiagnostics.equalToTheVisibleToneLabelSo")}</div>
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
            <div className="mb-1 font-medium text-foreground">{t("fullDiagnostics.legacyFallback")}</div>{t("fullDiagnostics.existingCommentsWithout")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">presentation</code>{" "}{t("fullDiagnostics.keepRenderingThroughTheCurrent")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">SuccessfulRunHandoffCommentCallout</code>{" "}{t("fullDiagnostics.stringDetectorTheNewContractIsOpt")}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemNoticeUxLab;
