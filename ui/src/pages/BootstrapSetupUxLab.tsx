import { t } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import type { ReactElement, ReactNode } from "react";
import { Loader2, ShieldCheck, Terminal, TriangleAlert } from "lucide-react";
import { BOOTSTRAP_FALLBACK_COMMAND } from "@/bootstrapSetup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LabFixtureKey =
  | "signed-out-private"
  | "signed-in-private"
  | "claiming"
  | "claim-error"
  | "claim-success"
  | "public-invite-only";

const FIXTURE_LABELS: Record<LabFixtureKey, string> = {
  get "signed-out-private"() { return t("fullDiagnostics.1AuthenticatedPrivateSignedOutBrowserClaim"); },
  get "signed-in-private"() { return t("fullDiagnostics.2AuthenticatedPrivateSignedInClaimCta"); },
  get claiming() { return t("fullDiagnostics.3AuthenticatedPrivateClaimInFlight"); },
  get "claim-error"() { return t("fullDiagnostics.4AuthenticatedPrivateClaimErrorEG"); },
  get "claim-success"() { return t("fullDiagnostics.5AuthenticatedPrivateClaimSucceededRedirectPending"); },
  get "public-invite-only"() { return t("fullDiagnostics.6AuthenticatedPublicInviteOnlyNoBrowser"); },
};

const FIXTURE_ORDER: LabFixtureKey[] = [
  "signed-out-private",
  "signed-in-private",
  "claiming",
  "claim-error",
  "claim-success",
  "public-invite-only",
];

function CliFallback({ hasActiveInvite }: { hasActiveInvite: boolean }) {
  useFullSharedTranslation();
  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Terminal className="size-4 text-muted-foreground" aria-hidden />
        <span>{fullSharedT("bootstrap.hostSetup")}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasActiveInvite
          ? t("fullDiagnostics.aBootstrapInviteIsAlreadyActiveCheck")
          : t("fullDiagnostics.runThisCommandOnTheHostThat")}
      </p>
      <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
{BOOTSTRAP_FALLBACK_COMMAND}
      </pre>
    </div>
  );
}

function StateChrome({ children }: { children: ReactNode }) {
  useFullSharedTranslation();
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="block p-6">{children}</Card>
    </div>
  );
}

function SignedOutPrivate() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <h1 className="text-xl font-semibold">{fullSharedT("bootstrap.finish")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{fullSharedT("bootstrap.signInFirst")}</p>
      <div className="mt-5">
        <Button asChild>
          <a href="/auth?next=/">{fullSharedT("bootstrap.signIn")}</a>
        </Button>
      </div>
      <CliFallback hasActiveInvite={false} />
    </StateChrome>
  );
}

function SignedInPrivate() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <h1 className="text-xl font-semibold">{fullSharedT("bootstrap.finish")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{fullSharedT("bootstrap.claimDescription")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button>{fullSharedT("bootstrap.claim")}</Button>
        <span className="text-sm text-muted-foreground">{t("fullDiagnostics.signedInAs")}{" "}<span className="font-medium text-foreground">jane@appliance.local</span>
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("fullDiagnostics.wrongAccount")}{" "}
        <a href="/auth?next=/" className="underline underline-offset-2">{t("fullDiagnostics.switchAccount")}</a>
        .
      </p>
      <CliFallback hasActiveInvite={false} />
    </StateChrome>
  );
}

function ClaimingPrivate() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <h1 className="text-xl font-semibold">{fullSharedT("bootstrap.finish")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{fullSharedT("bootstrap.claimDescription")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />{fullSharedT("boardClaim.claiming")}</Button>
        <span className="text-sm text-muted-foreground">{t("fullDiagnostics.signedInAs")}{" "}<span className="font-medium text-foreground">jane@appliance.local</span>
        </span>
      </div>
      <CliFallback hasActiveInvite={false} />
    </StateChrome>
  );
}

function ClaimErrorPrivate() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <h1 className="text-xl font-semibold">{fullSharedT("bootstrap.finish")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{fullSharedT("bootstrap.claimDescription")}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button>{fullSharedT("bootstrap.claim")}</Button>
        <span className="text-sm text-muted-foreground">{t("fullDiagnostics.signedInAs")}{" "}<span className="font-medium text-foreground">jane@appliance.local</span>
        </span>
      </div>
      <div
        role="alert"
        className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <TriangleAlert className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{fullSharedT("bootstrap.alreadyClaimed")}</p>
          <p className="mt-1 text-destructive/90">{t("fullDiagnostics.refreshToSignInOrAskThe")}{" "}
            <span className="font-mono">{t("fullDiagnostics.settingsAccess")}</span>.
          </p>
        </div>
      </div>
      <CliFallback hasActiveInvite={false} />
    </StateChrome>
  );
}

function ClaimSuccess() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{t("fullDiagnostics.youReTheInstanceAdmin")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("fullDiagnostics.setupIsCompleteTakingYouToOnboarding")}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">{t("fullDiagnostics.redirecting")}</span>
      </div>
      <div className="mt-5">
        <Button asChild variant="outline">
          <a href="/">{fullSharedT("bootstrap.continue")}</a>
        </Button>
      </div>
    </StateChrome>
  );
}

function PublicInviteOnly() {
  useFullSharedTranslation();
  return (
    <StateChrome>
      <h1 className="text-xl font-semibold">{fullSharedT("bootstrap.waitingAdmin")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("fullDiagnostics.thisInstanceRunsInInviteOnlyMode")}</p>
      <CliFallback hasActiveInvite />
      <p className="mt-4 text-xs text-muted-foreground">{t("fullDiagnostics.browserBasedClaimIsIntentionallyDisabledIn")}</p>
    </StateChrome>
  );
}

const FIXTURE_BODIES: Record<LabFixtureKey, ReactElement> = {
  "signed-out-private": <SignedOutPrivate />,
  "signed-in-private": <SignedInPrivate />,
  claiming: <ClaimingPrivate />,
  "claim-error": <ClaimErrorPrivate />,
  "claim-success": <ClaimSuccess />,
  "public-invite-only": <PublicInviteOnly />,
};

export function BootstrapSetupUxLab() {
  useFullSharedTranslation();
  return (
    <div className="bg-background min-h-screen pb-16">
      <header className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("fullDiagnostics.uxLab")}</p>
          <h1 className="mt-1 text-2xl font-semibold">{t("fullDiagnostics.bootstrapPendingSetupStates")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("fullDiagnostics.fixturesForTheBootstrapPendingScreenIn")}{" "}<span className="font-mono">CloudAccessGate</span>{t("fullDiagnostics.usedAsTheUxSpecFor")}{" "}
            <a className="underline underline-offset-2" href="/PAP/issues/PAP-10113">
              PAP-10113
            </a>{" "}{t("fullDiagnostics.andTheImplementationReferenceFor")}{" "}
            <a className="underline underline-offset-2" href="/PAP/issues/PAP-10114">
              PAP-10114
            </a>{t("fullDiagnostics.theBrowserClaimCtaOnlyAppearsWhen")}{" "}
            <span className="font-mono">deploymentMode === &quot;authenticated&quot;</span>{" "}{t("skillsGap.and")}{" "}
            <span className="font-mono">deploymentExposure === &quot;private&quot;</span>.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-12 px-6 pt-10">
        {FIXTURE_ORDER.map((key) => (
          <section key={key} aria-labelledby={`lab-${key}`}>
            <h2
              id={`lab-${key}`}
              className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {FIXTURE_LABELS[key]}
            </h2>
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-2">
              {FIXTURE_BODIES[key]}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
