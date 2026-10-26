import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
// token-extraction: allowlisted — intentional one-off decoration (DECISION-SHEET.md B1
// user ruling). The bg-[...gradient...] / shadow-[...] literals in this demo/UX-lab page
// are deliberate one-off decoration, reverted from --gradient-extract-*/--shadow-extract-*
// tokens; the file is on the check-token-gates allowlist in ui/src/index.css.
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyPatternIcon } from "@/components/CompanyPatternIcon";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Link2,
  Loader2,
  MailPlus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

const inviteRoleOptions = [
  {
    value: "viewer",
    get label() { return fullSharedT("authGap.roleViewer"); },
    get description() { return fullSharedT("fullShared.can_view_organization_work_and_follow_along_c0074e"); },
    gets: "View-only organization membership.",
  },
  {
    value: "operator",
    get label() { return fullSharedT("authGap.roleOperator"); },
    get description() { return fullSharedT("fullShared.can_edit_organization_work_and_invite_people_ae45d4"); },
    gets: "Full editing and audit access. Cannot approve join requests or manage member permissions.",
  },
  {
    value: "admin",
    get label() { return fullSharedT("authGap.roleAdmin"); },
    get description() { return fullSharedT("fullShared.recommended_for_operators_who_need_to_invite_people__508b27"); },
    gets: "Can create agents, invite users, assign tasks, and approve join requests.",
  },
  {
    value: "owner",
    get label() { return fullSharedT("fullShared.owner_4b1b8a"); },
    get description() { return fullSharedT("fullShared.full_organization_access_including_membership_manage_050eac"); },
    gets: "Everything in Admin, plus managing members.",
  },
] as const;

const inviteHistory = [
  {
    id: "invite-active",
    state: "Active",
    humanRole: "operator",
    invitedBy: "Board User 25",
    email: "board25@paperclip.local",
    createdAt: "Apr 25, 2026, 9:00 AM",
    action: "Revoke",
    relatedLabel: "Review request",
  },
  {
    id: "invite-accepted",
    state: "Accepted",
    humanRole: "viewer",
    invitedBy: "Board User 24",
    email: "board24@paperclip.local",
    createdAt: "Apr 24, 2026, 8:15 AM",
    action: "Inactive",
    relatedLabel: "—",
  },
  {
    id: "invite-revoked",
    state: "Revoked",
    humanRole: "admin",
    invitedBy: "Board User 20",
    email: "board20@paperclip.local",
    createdAt: "Apr 20, 2026, 2:45 PM",
    action: "Inactive",
    relatedLabel: "—",
  },
  {
    id: "invite-expired",
    state: "Expired",
    humanRole: "owner",
    invitedBy: "Board User 19",
    email: "board19@paperclip.local",
    createdAt: "Apr 19, 2026, 7:10 PM",
    action: "Inactive",
    relatedLabel: "—",
  },
] as const;

const fieldClassName =
  "w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500";
const panelClassName = "border border-zinc-800 bg-zinc-950/95 p-6";

function LabSection({
  eyebrow,
  title,
  description,
  accentClassName,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accentClassName?: string;
  children: ReactNode;
}) {
  useFullSharedTranslation();
  return (
    <section
      className={cn(
        "rounded-(--rad-28) border border-border/70 bg-background/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5",
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

function StatusCard({
  icon,
  title,
  body,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone?: "default" | "warn" | "success" | "error";
}) {
  useFullSharedTranslation();
  const toneClassName = {
    default: "border-border/70 bg-background/85",
    warn: "border-amber-400/40 bg-amber-500/[0.08]",
    success: "border-emerald-400/40 bg-emerald-500/[0.08]",
    error: "border-rose-400/40 bg-rose-500/[0.08]",
  }[tone];

  return (
    <Card className={cn("rounded-(--rad-24) shadow-none", toneClassName)}>
      <CardHeader className="space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-current/10 bg-background/70 text-muted-foreground">
          {icon}
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">{body}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function InviteLandingShell({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  useFullSharedTranslation();
  return (
    <div className="overflow-hidden rounded-(--rad-28) border border-zinc-800 bg-zinc-950 shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
      <div className="grid gap-px bg-zinc-800 lg:grid-cols-(--gtc-37)">
        <section className={cn(panelClassName, "space-y-6 bg-zinc-950")}>{left}</section>
        <section className={cn(panelClassName, "h-full bg-zinc-950")}>{right}</section>
      </div>
    </div>
  );
}

function InviteSummaryPanel({
  title,
  description,
  inviteMessage,
  requestedAccess,
  signedInLabel,
}: {
  title: string;
  description: string;
  inviteMessage?: string;
  requestedAccess: string;
  signedInLabel?: string;
}) {
  useFullSharedTranslation();
  return (
    <>
      <div className="flex items-start gap-4">
        <CompanyPatternIcon
          companyName="Acme Robotics"
          logoUrl="/api/invites/pcp_invite_test/logo"
          className="h-16 w-16 rounded-none border border-zinc-800"
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{fullSharedT("authGap.invitedToPaperclip")}</p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-100">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetaCard label={fullSharedT("sidebar.organization")} value="Acme Robotics" />
        <MetaCard label={fullSharedT("authGap.invitedBy")} value="Board User" />
        <MetaCard label={fullSharedT("authGap.requestedAccess")} value={requestedAccess} />
        <MetaCard label={fullSharedT("authGap.inviteExpires")} value="Mar 7, 2027" />
      </div>

      {inviteMessage ? (
        <div className="border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="text-xs uppercase tracking-(--tracking-caps) text-amber-200/80">{fullSharedT("authGap.inviterMessage")}</div>
          <p className="mt-2 text-sm leading-6 text-amber-50">{inviteMessage}</p>
        </div>
      ) : null}

      {signedInLabel ? (
        <div className="border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">{t("fullDiagnostics.signedInAs")}{" "}<span className="font-medium">{signedInLabel}</span>.
        </div>
      ) : null}
    </>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  useFullSharedTranslation();
  return (
    <div className="border border-zinc-800 p-3">
      <div className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{label}</div>
      <div className="mt-1 text-sm text-zinc-100">{value}</div>
    </div>
  );
}

function InlineAuthPreview({
  mode,
  feedback,
  working,
}: {
  mode: "sign_up" | "sign_in";
  feedback?: { tone: "info" | "error"; text: string };
  working?: boolean;
}) {
  useFullSharedTranslation();
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">
          {mode === "sign_up" ? fullSharedT("authGap.createYourAccount") : fullSharedT("authGap.signInToContinue")}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "sign_up"
            ? t("fullDiagnostics.startWithAPaperclipAccountAfterThat")
            : fullSharedT("authGap.existingAccountIntro")}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            "flex-1 border px-3 py-2 text-sm transition-colors",
            mode === "sign_up"
              ? "border-zinc-100 bg-zinc-100 text-zinc-950"
              : "border-zinc-800 text-zinc-300 hover:border-zinc-600",
          )}
        >{fullSharedT("authGap.createAccount")}</button>
        <button
          type="button"
          className={cn(
            "flex-1 border px-3 py-2 text-sm transition-colors",
            mode === "sign_in"
              ? "border-zinc-100 bg-zinc-100 text-zinc-950"
              : "border-zinc-800 text-zinc-300 hover:border-zinc-600",
          )}
        >{fullSharedT("authGap.alreadyHaveAccount")}</button>
      </div>

      <form className="space-y-4">
        {mode === "sign_up" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">{fullSharedT("fullShared.name_dcd1d5")}</span>
            <input name="name" className={fieldClassName} defaultValue="Jane Example" readOnly />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">{fullSharedT("auth.email")}</span>
          <input name="email" type="email" className={fieldClassName} defaultValue="jane@example.com" readOnly />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">{fullSharedT("auth.password")}</span>
          <input name="password" type="password" className={fieldClassName} defaultValue="supersecret" readOnly />
        </label>
        {feedback ? (
          <p className={cn("text-xs", feedback.tone === "info" ? "text-amber-300" : "text-red-400")}>
            {feedback.text}
          </p>
        ) : null}
        <Button type="button" className="w-full rounded-none" disabled={working}>
          {working ? fullSharedT("taskChatUi.classicDisplay.workingWaiting") : mode === "sign_in" ? fullSharedT("authGap.signInContinue") : fullSharedT("authGap.createContinue")}
        </Button>
      </form>

      <p className="text-xs leading-5 text-zinc-500">
        {mode === "sign_up"
          ? fullSharedT("authGap.existingAccountHint")
          : fullSharedT("authGap.newAccountHint")}
      </p>
    </div>
  );
}

function AgentRequestPreview() {
  useFullSharedTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">{fullSharedT("authGap.agentDetails")}</h3>
        <p className="mt-1 text-sm text-zinc-400">{t("fullDiagnostics.thisInviteWillCreateAnApprovalRequest")}</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">{fullSharedT("onboarding.agent.name")}</span>
        <input className={fieldClassName} defaultValue="Acme Ops Agent" readOnly />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">{fullSharedT("authGap.adapterType")}</span>
        <select className={fieldClassName} defaultValue="codex_local" disabled>
          <option value="codex_local">Codex</option>
          <option value="claude_local">Claude Code</option>
          <option value="cursor">Cursor</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">{fullSharedT("approvalsUi.capabilities")}</span>
        <textarea
          className={fieldClassName}
          rows={4}
          defaultValue="Reviews invites, triages requests, and keeps the board queue moving."
          readOnly
        />
      </label>
      <Button type="button" className="w-full rounded-none">{fullSharedT("authGap.submitRequest")}</Button>
    </div>
  );
}

function AcceptInvitePreview({
  autoAccept,
  isCurrentMember,
  error,
}: {
  autoAccept?: boolean;
  isCurrentMember?: boolean;
  error?: string;
}) {
  useFullSharedTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">{fullSharedT("authGap.acceptOrganization")}</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {autoAccept
            ? t("fullDiagnostics.grantingYourAccessToAcmeRobotics")
            : isCurrentMember
              ? t("fullDiagnostics.thisAccountAlreadyBelongsToAcmeRobotics")
              : t("fullDiagnostics.thisWillGrantOrCompleteYourAccess")}
        </p>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {autoAccept ? (
        <div className="text-sm text-zinc-400">{fullSharedT("authGap.submittingRequest")}</div>
      ) : (
        <Button type="button" className="w-full rounded-none" disabled={isCurrentMember}>{fullSharedT("authGap.acceptInvite")}</Button>
      )}
    </div>
  );
}

function InviteResultPreview({
  title,
  description,
  claimSecret,
  onboardingTextUrl,
  joinedNow = false,
}: {
  title: string;
  description: string;
  claimSecret?: string;
  onboardingTextUrl?: string;
  joinedNow?: boolean;
}) {
  useFullSharedTranslation();
  return (
    <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
      <div className="flex items-center gap-3">
        <CompanyPatternIcon
          companyName="Acme Robotics"
          logoUrl="/api/invites/pcp_invite_test/logo"
          className="h-12 w-12 rounded-none border border-zinc-800"
        />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-zinc-400">{description}</p>
        {joinedNow ? (
          <Button type="button" className="w-full rounded-none">{fullSharedT("boardClaim.open")}</Button>
        ) : (
          <>
            <div className="border border-zinc-800 p-3">
              <p className="mb-1 text-xs text-zinc-500">{fullSharedT("authGap.approvalPage")}</p>
              <a className="text-sm text-zinc-200 underline underline-offset-2" href="/company/settings/members">{fullSharedT("authGap.settingsMembers")}</a>
            </div>
            <p className="text-xs text-zinc-500">{fullSharedT("authGap.refreshAfterApproval")}</p>
          </>
        )}
        {claimSecret ? (
          <div className="space-y-1 border border-zinc-800 p-3 text-xs text-zinc-400">
            <div className="text-zinc-200">{fullSharedT("authGap.claimSecret")}</div>
            <div className="font-mono break-all">{claimSecret}</div>
            <div className="font-mono break-all">POST /api/agents/claim-api-key</div>
          </div>
        ) : null}
        {onboardingTextUrl ? (
          <div className="text-xs text-zinc-400">{t("fullDiagnostics.onboarding")}{" "}<span className="font-mono break-all">{onboardingTextUrl}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AuthScreenPreview({ mode, error }: { mode: "sign_in" | "sign_up"; error?: string }) {
  useFullSharedTranslation();
  return (
    <div className="overflow-hidden rounded-(--rad-28) border border-border/70 bg-background shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="grid gap-px bg-border/60 md:grid-cols-2">
        <div className="flex min-h-(--sz-420px) flex-col justify-center bg-background px-8 py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Paperclip</span>
            </div>
            <h3 className="text-xl font-semibold">
              {mode === "sign_in" ? fullSharedT("auth.signInHeading") : fullSharedT("auth.signUpHeading")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "sign_in"
                ? fullSharedT("auth.signInDescription")
                : fullSharedT("auth.signUpDescription")}
            </p>
            <div className="mt-6 space-y-4">
              {mode === "sign_up" ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{fullSharedT("fullShared.name_dcd1d5")}</span>
                  <input
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                    defaultValue="Jane Example"
                    readOnly
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{fullSharedT("auth.email")}</span>
                <input
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  defaultValue="jane@example.com"
                  readOnly
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{fullSharedT("auth.password")}</span>
                <input
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  defaultValue="supersecret"
                  readOnly
                />
              </label>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <Button type="button" className="w-full">
                {mode === "sign_in" ? fullSharedT("auth.signIn") : fullSharedT("auth.createAccount")}
              </Button>
            </div>
            <div className="mt-5 text-sm text-muted-foreground">
              {mode === "sign_in" ? fullSharedT("auth.needAccount") : fullSharedT("auth.haveAccount")}{" "}
              <span className="font-medium text-foreground underline underline-offset-2">
                {mode === "sign_in" ? fullSharedT("auth.createOne") : fullSharedT("fullShared.sign_in_bfd402")}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden min-h-(--sz-420px) items-center justify-center bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.18),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,1))] px-8 py-10 md:flex">
          <div className="max-w-sm space-y-4 text-zinc-200">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps) text-cyan-200">{t("fullDiagnostics.authPreview")}</div>
            <div className="text-2xl font-semibold">{t("fullDiagnostics.sideBySideSignupStylingReview")}</div>
            <p className="text-sm leading-6 text-zinc-400">{t("fullDiagnostics.thisFrameMirrorsTheProductionAuthSurface")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyInvitesPreview() {
  useFullSharedTranslation();
  return (
    <div className="grid gap-5 xl:grid-cols-(--gtc-38)">
      <Card className="rounded-(--rad-28) shadow-none">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MailPlus className="h-4 w-4" />{t("fullDiagnostics.organizationInvites")}</div>
          <div>
            <CardTitle>{fullSharedT("fullShared.create_invite_9f395b")}</CardTitle>
            <CardDescription className="mt-2">{fullSharedT("fullShared.generate_a_human_invite_link_and_choose_the_default__dd31c5")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{fullSharedT("fullShared.choose_a_role_a49c49")}</legend>
            <div className="rounded-2xl border border-border">
              {inviteRoleOptions.map((option, index) => (
                <label
                  key={option.value}
                  className={cn("flex cursor-default gap-3 px-4 py-4", index > 0 && "border-t border-border")}
                >
                  <input
                    type="radio"
                    readOnly
                    checked={option.value === "operator"}
                    className="mt-1 h-4 w-4 border-border text-foreground"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{option.label}</span>
                      {option.value === "operator" ? (
                        <Badge variant="outline" className="border-border text-muted-foreground">{fullSharedT("providerSetup.model.default")}</Badge>
                      ) : null}
                    </span>
                    <span className="block max-w-2xl text-sm text-muted-foreground">{option.description}</span>
                    <span className="block text-sm text-foreground">{option.gets}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">{fullSharedT("fullShared.each_invite_link_is_single_use_human_invitees_get_th_879640")}</div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button">{fullSharedT("fullShared.create_invite_9f395b")}</Button>
            <span className="text-sm text-muted-foreground">{fullSharedT("fullShared.invite_history_below_keeps_the_audit_trail_030769")}</span>
          </div>

          <div className="space-y-3 rounded-2xl border border-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{fullSharedT("fullShared.latest_invite_link_ee47fa")}</div>
                <div className="text-sm text-muted-foreground">{fullSharedT("fullShared.this_url_includes_the_current_paperclip_domain_retur_3bad03")}</div>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <Check className="h-3.5 w-3.5" />{fullSharedT("taskPanels.preview.copied")}</div>
            </div>
            <button
              type="button"
              className="w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-left text-sm break-all"
            >
              https://paperclip.local/invite/new-token
            </button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline">
                <ExternalLink className="h-4 w-4" />{t("fullDiagnostics.openInvite")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-(--rad-28) shadow-none">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{fullSharedT("fullShared.invite_history_0269fe")}</CardTitle>
              <CardDescription className="mt-2">{t("fullDiagnostics.reviewInviteStatusRoleInviterAndAny")}</CardDescription>
            </div>
            <a href="/inbox/requests" className="text-sm underline underline-offset-4">{fullSharedT("fullShared.open_join_request_queue_3f3aa6")}</a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("runUi.inspector.state")}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("approvalsUi.role")}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("authGap.invitedBy")}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("fullShared.created_d70b9e")}</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("decisionsUi.source.join")}</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">{fullSharedT("runUi.inspector.action")}</th>
                </tr>
              </thead>
              <tbody>
                {inviteHistory.map((invite) => (
                  <tr key={invite.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 align-top">
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {invite.state}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 align-top">{invite.humanRole}</td>
                    <td className="px-5 py-3 align-top">
                      <div>{invite.invitedBy}</div>
                      <div className="text-xs text-muted-foreground">{invite.email}</div>
                    </td>
                    <td className="px-5 py-3 align-top text-muted-foreground">{invite.createdAt}</td>
                    <td className="px-5 py-3 align-top">
                      {invite.relatedLabel === "Review request" ? (
                        <a href="/inbox/requests" className="underline underline-offset-4">
                          {invite.relatedLabel}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{invite.relatedLabel}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      {invite.action === "Revoke" ? (
                        <Button type="button" size="sm" variant="outline">{fullSharedT("taskProperties.share.revoke")}</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.inactive_ac7c94")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <div className="text-sm font-medium">{t("fullDiagnostics.emptyHistoryState")}</div>
              <div className="mt-2 text-sm text-muted-foreground">{fullSharedT("fullShared.no_invites_have_been_created_for_this_organization_y_c20447")}</div>
            </div>
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/[0.07] p-4">
              <div className="text-sm font-medium text-foreground">{t("fullDiagnostics.permissionError")}</div>
              <div className="mt-2 text-sm text-muted-foreground">{fullSharedT("fullShared.you_do_not_have_permission_to_manage_organization_in_e61b97")}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InviteUxLab() {
  useFullSharedTranslation();
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-(--rad-32) border border-border/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.10),transparent_28%),linear-gradient(180deg,rgba(245,158,11,0.10),transparent_44%),var(--background)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-(--gtc-39)">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1 text-(length:--text-nano) font-semibold uppercase tracking-(--tracking-caps) text-cyan-700 dark:text-cyan-300">
              <FlaskConical className="h-3.5 w-3.5" />{t("fullDiagnostics.inviteUxLab")}</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("fullDiagnostics.inviteAndSignupUxReviewSurface")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{t("fullDiagnostics.thisPageCollectsTheCurrentInviteLanding")}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">
                /tests/ux/invites
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">{t("fullDiagnostics.signupInviteStates")}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-(length:--text-nano) uppercase tracking-(--tracking-caps)">{t("fullDiagnostics.fixtureBackedPreview")}</Badge>
            </div>
          </div>

          <aside className="border-t border-border/60 bg-background/70 p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 text-(length:--text-micro) font-semibold uppercase tracking-(--tracking-caps) text-muted-foreground">{t("fullDiagnostics.coveredStates")}</div>
            <div className="space-y-3">
              {[
                t("fullDiagnostics.inviteStates"),
                t("fullDiagnostics.authVariants"),
                t("fullDiagnostics.acceptTransitions"),
                t("fullDiagnostics.resultStatesDescription"),
                t("fullDiagnostics.orgInviteStates"),
              ].map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 text-sm text-muted-foreground"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <LabSection
        eyebrow={t("fullDiagnostics.topLevelStates")}
        title={t("fullDiagnostics.landingStateCoverage")}
        description={t("fullDiagnostics.smallCardsForTheFastReturnInvite")}
        accentClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.05),transparent_30%),var(--background)]"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            icon={<Loader2 className="h-4 w-4 animate-spin" />}
            title={t("fullDiagnostics.loadingInvite")}
            body={t("fullDiagnostics.loadingInviteDescription")}
          />
          <StatusCard
            icon={<Clock3 className="h-4 w-4" />}
            title={t("fullDiagnostics.checkingYourAccess")}
            body={t("fullDiagnostics.checkingAccessDescription")}
          />
          <StatusCard
            icon={<KeyRound className="h-4 w-4" />}
            title={t("fullDiagnostics.invalidInviteToken")}
            body={t("fullDiagnostics.missingTokenDescription")}
            tone="error"
          />
          <StatusCard
            icon={<Link2 className="h-4 w-4" />}
            title={fullSharedT("authGap.inviteUnavailable")}
            body={t("fullDiagnostics.unavailableInviteDescription")}
            tone="warn"
          />
          <StatusCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title={fullSharedT("authGap.bootstrapComplete")}
            body={t("fullDiagnostics.bootstrapResultDescription")}
            tone="success"
          />
          <StatusCard
            icon={<ArrowRight className="h-4 w-4" />}
            title={t("fullDiagnostics.autoAcceptInProgress")}
            body={t("fullDiagnostics.autoAcceptDescription")}
          />
          <StatusCard
            icon={<Users className="h-4 w-4" />}
            title={t("fullDiagnostics.alreadyAMember")}
            body={t("fullDiagnostics.alreadyMemberDescription")}
          />
          <StatusCard
            icon={<UserPlus className="h-4 w-4" />}
            title={t("fullDiagnostics.inviteResultSurfaces")}
            body={t("fullDiagnostics.resultVariantsDescription")}
            tone="success"
          />
        </div>
      </LabSection>

      <LabSection
        eyebrow={t("fullDiagnostics.inviteLanding")}
        title={t("fullDiagnostics.splitScreenInviteFlows")}
        description={t("fullDiagnostics.theseFramesMirrorTheProductionInviteSurface")}
        accentClassName="bg-[linear-gradient(180deg,rgba(234,179,8,0.06),transparent_28%),var(--background)]"
      >
        <div className="space-y-5">
          <InviteLandingShell
            left={
              <InviteSummaryPanel
                title={t("fullDiagnostics.joinAcmeRobotics")}
                description={fullSharedT("authGap.accountIntro")}
                inviteMessage="Welcome aboard."
                requestedAccess="Operator"
              />
            }
            right={<InlineAuthPreview mode="sign_up" />}
          />

          <InviteLandingShell
            left={
              <InviteSummaryPanel
                title={t("fullDiagnostics.joinAcmeRobotics")}
                description={fullSharedT("authGap.accountIntro")}
                inviteMessage="Welcome aboard."
                requestedAccess="Operator"
              />
            }
            right={
              <InlineAuthPreview
                mode="sign_in"
                feedback={{
                  tone: "info",
                  text: t("fullDiagnostics.anAccountAlreadyExistsForJaneExample"),
                }}
              />
            }
          />

          <InviteLandingShell
            left={
              <InviteSummaryPanel
                title={t("fullDiagnostics.joinAcmeRobotics")}
                description={fullSharedT("authGap.readyIntro")}
                inviteMessage="Welcome aboard."
                requestedAccess="Operator"
                signedInLabel="Jane Example"
              />
            }
            right={<AcceptInvitePreview autoAccept />}
          />

          <InviteLandingShell
            left={
              <InviteSummaryPanel
                title={t("fullDiagnostics.joinAcmeRobotics")}
                description={fullSharedT("authGap.agentIntro")}
                requestedAccess="Agent join request"
              />
            }
            right={<AgentRequestPreview />}
          />

          <InviteLandingShell
            left={
              <InviteSummaryPanel
                title={t("fullDiagnostics.joinAcmeRobotics")}
                description={fullSharedT("authGap.readyIntro")}
                requestedAccess="Operator"
                signedInLabel="Jane Example"
              />
            }
            right={<AcceptInvitePreview error="This account already belongs to the organization." isCurrentMember />}
          />
        </div>
      </LabSection>

      <LabSection
        eyebrow={t("fullDiagnostics.resultStates")}
        title={t("fullDiagnostics.approvalAndCompletionScreens")}
        description={t("fullDiagnostics.theseAreThePostSubmitStatesReturned")}
        accentClassName="bg-[linear-gradient(180deg,rgba(16,185,129,0.06),transparent_30%),var(--background)]"
      >
        <div className="grid gap-5 xl:grid-cols-3">
          <InviteResultPreview
            title={t("fullDiagnostics.requestToJoinAcmeRobotics")}
            description={t("fullDiagnostics.boardUserMustApproveYourRequestTo")}
            claimSecret="pcp_claim_secret_demo"
            onboardingTextUrl="/api/invites/pcp_invite_test/onboarding.txt"
          />
          <InviteResultPreview
            title={fullSharedT("authGap.joinedOrganization")}
            description={t("fullDiagnostics.yourAccountAlreadyMatchedTheApprovedInvite")}
            joinedNow
          />
          <InviteResultPreview
            title={t("fullDiagnostics.requestToJoinAcmeRobotics")}
            description={t("fullDiagnostics.askThemToVisitSettingsMembersTo")}
          />
        </div>
      </LabSection>

      <LabSection
        eyebrow={t("fullDiagnostics.standaloneAuth")}
        title={t("fullDiagnostics.authPageStates")}
        description={t("fullDiagnostics.theGeneralAuthPageUsesADifferent")}
        accentClassName="bg-[linear-gradient(180deg,rgba(168,85,247,0.06),transparent_28%),var(--background)]"
      >
        <div className="space-y-5">
          <AuthScreenPreview mode="sign_in" error="Invalid email or password" />
          <AuthScreenPreview mode="sign_up" />
        </div>
      </LabSection>

      <LabSection
        eyebrow={t("fullDiagnostics.settingsHeading")}
        title={t("fullDiagnostics.organizationInviteManagement")}
        description={t("fullDiagnostics.thisSectionCapturesTheBoardSideInvite")}
        accentClassName="bg-[linear-gradient(180deg,rgba(244,114,182,0.06),transparent_28%),var(--background)]"
      >
        <CompanyInvitesPreview />
      </LabSection>
    </div>
  );
}
