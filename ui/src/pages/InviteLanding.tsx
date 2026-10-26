import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT_ADAPTER_TYPES } from "@paperclipai/shared";
import type { AgentAdapterType, JoinRequest } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { CompanyPatternIcon } from "@/components/CompanyPatternIcon";
import { useCompany } from "@/context/CompanyContext";
import { Link, useNavigate, useParams } from "@/lib/router";
import { accessApi } from "../api/access";
import { authApi } from "../api/auth";
import { fetchCompanyListForCurrentAccount, useCompanyListQuery } from "../api/companies-query";
import { healthApi } from "../api/health";
import { getAdapterLabel } from "../adapters/adapter-display-registry";
import { clearPendingInviteToken, rememberPendingInviteToken } from "../lib/invite-memory";
import { queryKeys } from "../lib/queryKeys";
import { formatDate } from "../lib/utils";
import { Trans, useTranslation } from "@/i18n";
import type { TFunction } from "i18next";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type AuthMode = "sign_in" | "sign_up";
type InviteMessageKey =
  | "authGap.accountExists"
  | "authGap.credentialsMismatch"
  | "authGap.accountMayExist"
  | "authGap.authenticationFailed"
  | "authGap.inviteNotFound"
  | "authGap.checkingMembership"
  | "authGap.alreadyMember"
  | "authGap.acceptFailed"
  | "authGap.requiredFields";
type InviteMessage = { key: InviteMessageKey; values?: Record<string, string> } | { message: string };
type AuthFeedback = { tone: "error" | "info" } & InviteMessage;

class InviteLocalError extends Error {
  constructor(readonly key: InviteMessageKey) { super(key); }
}

function renderInviteMessage(message: InviteMessage, t: TFunction): string {
  if ("message" in message) return message.message;
  const values = message.values?.email === ""
    ? { ...message.values, email: t("authGap.thatEmail") }
    : message.values;
  return t(message.key, values);
}

// Agent-invite onboarding remains a legacy-adapter flow. Native runner setup
// belongs in authenticated agent configuration after an administrator enables
// the experimental flag.
const joinAdapterOptions: AgentAdapterType[] = AGENT_ADAPTER_TYPES.filter(
  (type) => type !== "paperclip_runner",
);
const ENABLED_INVITE_ADAPTERS = new Set([
  "claude_local",
  "codex_local",
  "gemini_local",
  "kimi_local",
  "opencode_local",
  "pi_local",
  "cursor",
]);

function readNestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" && current.trim().length > 0 ? current : null;
}

const fieldClassName =
  "w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500";
const panelClassName = "border border-zinc-800 bg-zinc-950/95 p-6";
const modeButtonBaseClassName =
  "flex-1 border px-3 py-2 text-sm transition-colors";

function formatHumanRole(role: string | null | undefined, t: TFunction) {
  if (!role) return null;
  switch (role) {
    case "viewer": return t("authGap.roleViewer");
    case "operator": return t("authGap.roleOperator");
    case "admin": return t("authGap.roleAdmin");
    case "owner": return t("authGap.roleOwner");
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.trim().length > 0 ? code : null;
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  const message = error.message.trim();
  return message.length > 0 ? message : null;
}

function mapInviteAuthFeedback(
  error: unknown,
  authMode: AuthMode,
  email: string,
): AuthFeedback {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error);
  const emailLabel = email.trim();

  if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return {
      tone: "info",
      key: "authGap.accountExists",
      values: { email: emailLabel },
    };
  }

  if (code === "INVALID_EMAIL_OR_PASSWORD") {
    return {
      tone: "error",
      key: "authGap.credentialsMismatch",
    };
  }

  if (authMode === "sign_in" && message === "Request failed: 401") {
    return {
      tone: "error",
      key: "authGap.credentialsMismatch",
    };
  }

  if (authMode === "sign_up" && message === "Request failed: 422") {
    return {
      tone: "info",
      key: "authGap.accountMayExist",
      values: { email: emailLabel },
    };
  }

  return {
    tone: "error",
    ...(message ? { message } : { key: "authGap.authenticationFailed" }),
  };
}

function isBootstrapAcceptancePayload(payload: unknown) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "bootstrapAccepted" in (payload as Record<string, unknown>),
  );
}

function isApprovedHumanJoinPayload(payload: unknown, showsAgentForm: boolean) {
  if (!payload || typeof payload !== "object" || showsAgentForm) return false;
  const status = (payload as { status?: unknown }).status;
  return status === "approved";
}

type AwaitingJoinApprovalPanelProps = {
  companyDisplayName: string;
  companyLogoUrl: string | null;
  invitedByUserName: string | null;
  claimSecret?: string | null;
  claimApiKeyPath?: string | null;
  onboardingTextUrl?: string | null;
};

function InviteCompanyLogo({
  companyDisplayName,
  companyLogoUrl,
  className,
}: {
  companyDisplayName: string;
  companyLogoUrl: string | null;
  className?: string;
}) {
  return (
    <CompanyPatternIcon
      companyName={companyDisplayName}
      logoUrl={companyLogoUrl}
      logoFit="contain"
      className={className}
    />
  );
}

function AwaitingJoinApprovalPanel({
  companyDisplayName,
  companyLogoUrl,
  invitedByUserName,
  claimSecret = null,
  claimApiKeyPath = null,
  onboardingTextUrl = null,
}: AwaitingJoinApprovalPanelProps) {
  const { t } = useTranslation();
  const approverLabel = invitedByUserName ?? t("authGap.organizationAdmin");

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6" data-testid="invite-pending-approval">
        <div className="flex items-center gap-3">
          <InviteCompanyLogo
            companyDisplayName={companyDisplayName}
            companyLogoUrl={companyLogoUrl}
            className="h-12 w-12 border border-zinc-800 rounded-none"
          />
          <h1 className="text-lg font-semibold">{t("authGap.requestToJoin", { organization: companyDisplayName })}</h1>
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-400">
            {t("authGap.awaitingApproval", { approver: approverLabel })}
          </p>
          <div className="border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">{t("authGap.approvalPage")}</p>
            <p className="text-sm text-zinc-200">{t("authGap.settingsMembers")}</p>
          </div>
          <p className="text-sm text-zinc-400">
            <Trans i18nKey="authGap.askApprover" components={{ settings: <span className="text-zinc-200" /> }} />
          </p>
          <p className="text-xs text-zinc-500">
            {t("authGap.refreshAfterApproval")}
          </p>
        </div>
        {claimSecret && claimApiKeyPath ? (
          <div className="mt-4 space-y-1 border border-zinc-800 p-3 text-xs text-zinc-400">
            <div className="text-zinc-200">{t("authGap.claimSecret")}</div>
            <div className="font-mono break-all">{claimSecret}</div>
            <div className="font-mono break-all">POST {claimApiKeyPath}</div>
          </div>
        ) : null}
        {onboardingTextUrl ? (
          <div className="mt-4 text-xs text-zinc-400">
            {t("authGap.onboarding")}: <span className="font-mono break-all">{onboardingTextUrl}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InviteLandingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedCompanyId } = useCompany();
  const params = useParams();
  const token = (params.token ?? "").trim();
  const [authMode, setAuthMode] = useState<AuthMode>("sign_up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agentName, setAgentName] = useState("");
  const [adapterType, setAdapterType] = useState<AgentAdapterType>("claude_local");
  const [capabilities, setCapabilities] = useState("");
  const [result, setResult] = useState<{ kind: "bootstrap" | "join"; payload: unknown } | null>(null);
  const [error, setError] = useState<InviteMessage | null>(null);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);
  const [autoAcceptStarted, setAutoAcceptStarted] = useState(false);
  const authErrorId = "invite-auth-error";

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const inviteQuery = useQuery({
    queryKey: queryKeys.access.invite(token),
    queryFn: () => accessApi.getInvite(token),
    enabled: token.length > 0,
    retry: false,
  });

  // Whose list this is, is no longer this page's problem: the entry is keyed by
  // account, so another account's list is unreachable rather than merely
  // distrusted. What is left for the gate below is narrower and still real — do
  // we have an answer *yet*. Without it, a pending query reads as an empty list,
  // which reads as "not a member", which auto-accepts an invite the customer may
  // already hold.
  //
  // Hence `staleTime: 0` and a mount-scoped flag rather than `isSuccess`: a
  // cached list is the right account's now, but it can be thirty seconds old, and
  // acting on "not a member" is the direction that costs something.
  //
  // `local_trusted` has no accounts at all, so there is no identity to key on and
  // nothing to check the list against; the gate stays open.
  const companiesQuery = useCompanyListQuery({
    enabled: !!sessionQuery.data && !!inviteQuery.data?.companyId,
    staleTime: 0,
  });
  const membershipIsAccountScoped = healthQuery.data?.deploymentMode !== "local_trusted";
  // No `sessionQuery.data` term: the query only fetches while a session exists, so
  // the flag cannot be true without one, and if the session lapses the observer
  // re-keys to the anonymous entry and holds no data to leak.
  const membershipListIsCurrent = membershipIsAccountScoped
    ? companiesQuery.isFetchedAfterMount
    : true;
  const companyList = membershipListIsCurrent ? companiesQuery.data?.companies ?? [] : [];

  useEffect(() => {
    if (token) rememberPendingInviteToken(token);
  }, [token]);

  useEffect(() => {
    setAutoAcceptStarted(false);
  }, [token]);

  useEffect(() => {
    if (!membershipListIsCurrent) return;
    const list = companiesQuery.data?.companies;
    if (!list || !inviteQuery.data?.companyId) return;
    if (list.some((c) => c.id === inviteQuery.data!.companyId)) {
      clearPendingInviteToken(token);
    }
  }, [companiesQuery.data, inviteQuery.data, membershipListIsCurrent, token]);

  const invite = inviteQuery.data;
  const isCheckingExistingMembership =
    Boolean(sessionQuery.data) &&
    Boolean(invite?.companyId) &&
    !membershipListIsCurrent;
  const isCurrentMember =
    Boolean(invite?.companyId) &&
    companyList.some((company) => company.id === invite?.companyId);
  const companyName = invite?.companyName?.trim() || null;
  const companyDisplayName = companyName || t("authGap.organizationFallback");
  const companyLogoUrl = invite?.companyLogoUrl?.trim() || null;
  const invitedByUserName = invite?.invitedByUserName?.trim() || null;
  const inviteMessage = invite?.inviteMessage?.trim() || null;
  const requestedHumanRole = formatHumanRole(invite?.humanRole, t);
  const inviteJoinRequestStatus = invite?.joinRequestStatus ?? null;
  const inviteJoinRequestType = invite?.joinRequestType ?? null;
  const canCompleteAcceptedHumanInvite =
    inviteJoinRequestType === "human" &&
    (inviteJoinRequestStatus === "pending_approval" || inviteJoinRequestStatus === "approved");
  const requiresHumanAccount =
    healthQuery.data?.deploymentMode === "authenticated" &&
    !sessionQuery.data &&
    invite?.allowedJoinTypes !== "agent";
  const showsAgentForm = invite?.inviteType !== "bootstrap_ceo" && invite?.allowedJoinTypes === "agent";
  const shouldAutoAcceptHumanInvite =
    Boolean(sessionQuery.data) &&
    !showsAgentForm &&
    invite?.inviteType !== "bootstrap_ceo" &&
    (!inviteJoinRequestStatus || canCompleteAcceptedHumanInvite) &&
    !isCheckingExistingMembership &&
    !isCurrentMember &&
    !result &&
    error === null;
  const sessionLabel =
    sessionQuery.data?.user.name?.trim() ||
    sessionQuery.data?.user.email?.trim() ||
    t("authGap.accountFallback");

  const authCanSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    (authMode === "sign_in" || (name.trim().length > 0 && password.trim().length >= 8));

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!invite) throw new InviteLocalError("authGap.inviteNotFound");
      if (isCheckingExistingMembership) {
        throw new InviteLocalError("authGap.checkingMembership");
      }
      if (isCurrentMember) {
        throw new InviteLocalError("authGap.alreadyMember");
      }
      if (invite.inviteType === "bootstrap_ceo" || invite.allowedJoinTypes !== "agent") {
        return accessApi.acceptInvite(token, { requestType: "human" });
      }
      return accessApi.acceptInvite(token, {
        requestType: "agent",
        agentName: agentName.trim(),
        adapterType,
        capabilities: capabilities.trim() || null,
      });
    },
    onSuccess: async (payload) => {
      setError(null);
      clearPendingInviteToken(token);
      const asBootstrap = isBootstrapAcceptancePayload(payload);
      setResult({ kind: asBootstrap ? "bootstrap" : "join", payload });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.currentBoardAccess });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      if (invite?.companyId && isApprovedHumanJoinPayload(payload, showsAgentForm)) {
        setSelectedCompanyId(invite.companyId, { source: "manual" });
        navigate("/", { replace: true });
      }
    },
    onError: (err) => {
      setError(err instanceof InviteLocalError ? { key: err.key }
        : err instanceof Error ? { message: err.message } : { key: "authGap.acceptFailed" });
    },
  });

  useEffect(() => {
    if (!shouldAutoAcceptHumanInvite || autoAcceptStarted || acceptMutation.isPending) return;
    setAutoAcceptStarted(true);
    setError(null);
    acceptMutation.mutate();
  }, [acceptMutation, autoAcceptStarted, shouldAutoAcceptHumanInvite]);

  const authMutation = useMutation({
    mutationFn: async () => {
      if (authMode === "sign_in") {
        await authApi.signInEmail({ email: email.trim(), password });
        return;
      }
      await authApi.signUpEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    },
    onSuccess: async () => {
      setAuthFeedback(null);
      rememberPendingInviteToken(token);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.health });
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.currentBoardAccess });
      // Keyed to the account that just signed in — the helper resolves the
      // identity past the invalidation above rather than trusting the session
      // entry still sitting in the cache — and forced past whatever is cached
      // for it. This replaces the hand-rolled cancel-and-refetch this PR
      // originally carried, which #11488 made both unnecessary and weaker.
      const { companies: freshCompanies } = await fetchCompanyListForCurrentAccount(queryClient);

      if (invite?.companyId && freshCompanies.some((company) => company.id === invite.companyId)) {
        clearPendingInviteToken(token);
        setSelectedCompanyId(invite.companyId, { source: "manual" });
        navigate("/", { replace: true });
        return;
      }

      if (!invite || invite.inviteType !== "bootstrap_ceo") {
        return;
      }

      try {
        const payload = await acceptMutation.mutateAsync();
        if (isBootstrapAcceptancePayload(payload)) {
          navigate("/", { replace: true });
        }
      } catch {
        return;
      }
    },
    onError: (err) => {
      const nextFeedback = mapInviteAuthFeedback(err, authMode, email);
      if (getAuthErrorCode(err) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
        setAuthMode("sign_in");
        setPassword("");
      }
      setAuthFeedback(nextFeedback);
    },
  });

  const joinButtonLabel = useMemo(() => {
    if (!invite) return t("authGap.continue");
    if (isCurrentMember) return t("authGap.openOrganization");
    if (invite.inviteType === "bootstrap_ceo") return t("authGap.acceptInvite");
    if (showsAgentForm) return t("authGap.submitRequest");
    return sessionQuery.data ? t("authGap.acceptInvite") : t("authGap.continue");
  }, [invite, isCurrentMember, sessionQuery.data, showsAgentForm, t]);

  if (!token) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("authGap.invalidToken")}</div>;
  }

  if (inviteQuery.isLoading || healthQuery.isLoading || sessionQuery.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("authGap.loadingInvite")}</div>;
  }

  if (isCheckingExistingMembership) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("authGap.checkingAccess")}</div>;
  }

  if (inviteQuery.error || !invite) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="border border-border bg-card p-6" data-testid="invite-error">
          <h1 className="text-lg font-semibold">{t("authGap.inviteUnavailable")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("authGap.inviteUnavailableDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (
    inviteJoinRequestStatus === "approved" &&
    inviteJoinRequestType === "human" &&
    isCurrentMember
  ) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("authGap.openingOrganization")}</div>;
  }

  if (inviteJoinRequestStatus === "pending_approval" && !canCompleteAcceptedHumanInvite) {
    return (
      <AwaitingJoinApprovalPanel
        companyDisplayName={companyDisplayName}
        companyLogoUrl={companyLogoUrl}
        invitedByUserName={invitedByUserName}
      />
    );
  }

  if (inviteJoinRequestStatus && !canCompleteAcceptedHumanInvite) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="border border-border bg-card p-6" data-testid="invite-error">
          <h1 className="text-lg font-semibold">{t("authGap.inviteUnavailable")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteJoinRequestStatus === "rejected"
              ? t("authGap.joinRejected")
              : t("authGap.inviteUsed")}
          </p>
        </div>
      </div>
    );
  }

  if (result?.kind === "bootstrap") {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
        <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-lg font-semibold">{t("authGap.bootstrapComplete")}</h1>
          <div className="mt-4">
            <Button asChild className="rounded-none">
              <Link to="/">{t("authGap.openBoard")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result?.kind === "join") {
    const payload = result.payload as JoinRequest & {
      claimSecret?: string;
      claimApiKeyPath?: string;
      onboarding?: Record<string, unknown>;
    };
    const claimSecret = typeof payload.claimSecret === "string" ? payload.claimSecret : null;
    const claimApiKeyPath = typeof payload.claimApiKeyPath === "string" ? payload.claimApiKeyPath : null;
    const onboardingTextUrl = readNestedString(payload.onboarding, ["textInstructions", "url"]);
    const joinedNow = !showsAgentForm && payload.status === "approved";

    return (
      joinedNow ? (
        <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
          <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center gap-3">
              <InviteCompanyLogo
                companyDisplayName={companyDisplayName}
                companyLogoUrl={companyLogoUrl}
                className="h-12 w-12 border border-zinc-800 rounded-none"
              />
              <h1 className="text-lg font-semibold">{t("authGap.joinedOrganization")}</h1>
            </div>
            <div className="mt-4">
              <Button asChild className="w-full rounded-none">
                <Link to="/">{t("authGap.openBoard")}</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <AwaitingJoinApprovalPanel
          companyDisplayName={companyDisplayName}
          companyLogoUrl={companyLogoUrl}
          invitedByUserName={invitedByUserName}
          claimSecret={claimSecret}
          claimApiKeyPath={claimApiKeyPath}
          onboardingTextUrl={onboardingTextUrl}
        />
      )
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end"><div className="w-fit"><LocaleSwitcher /></div></div>
        <div className="grid gap-6 lg:grid-cols-(--gtc-36)">
          <section className={`${panelClassName} space-y-6`}>
            <div className="flex items-start gap-4">
              <InviteCompanyLogo
                companyDisplayName={companyDisplayName}
                companyLogoUrl={companyLogoUrl}
                className="h-16 w-16 rounded-none border border-zinc-800"
              />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">
                  {t("authGap.invitedToPaperclip")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold">
                  {invite.inviteType === "bootstrap_ceo" ? t("authGap.setup") : t("authGap.joinOrganization", { organization: companyDisplayName })}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                  {showsAgentForm
                    ? t("authGap.agentIntro")
                    : requiresHumanAccount
                      ? t("authGap.accountIntro")
                      : t("authGap.readyIntro")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{t("authGap.organization")}</div>
                <div className="mt-1 text-sm text-zinc-100">{companyDisplayName}</div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{t("authGap.invitedBy")}</div>
                <div className="mt-1 text-sm text-zinc-100">{invitedByUserName ?? t("authGap.board")}</div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{t("authGap.requestedAccess")}</div>
                <div className="mt-1 text-sm text-zinc-100">
                  {showsAgentForm ? t("authGap.agentJoinRequest") : requestedHumanRole ?? t("authGap.organizationAccess")}
                </div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-(--tracking-caps) text-zinc-500">{t("authGap.inviteExpires")}</div>
                <div className="mt-1 text-sm text-zinc-100">{formatDate(invite.expiresAt)}</div>
              </div>
            </div>

            {inviteMessage ? (
              <div className="border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-(--tracking-caps) text-amber-200/80">{t("authGap.inviterMessage")}</div>
                <p className="mt-2 text-sm leading-6 text-amber-50">{inviteMessage}</p>
              </div>
            ) : null}

            {sessionQuery.data ? (
              <div className="border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                <Trans i18nKey="authGap.signedInAs" values={{ account: sessionLabel }} components={{ account: <span className="font-medium" /> }} />
              </div>
            ) : null}
          </section>

          <section className={`${panelClassName} h-fit`}>
            {showsAgentForm ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("authGap.agentDetails")}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("authGap.agentApproval", { organization: companyDisplayName })}
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">{t("authGap.agentName")}</span>
                  <input
                    className={fieldClassName}
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">{t("authGap.adapterType")}</span>
                  <select
                    className={fieldClassName}
                    value={adapterType}
                    onChange={(event) => setAdapterType(event.target.value as AgentAdapterType)}
                  >
                    {joinAdapterOptions.map((type) => (
                      <option key={type} value={type} disabled={!ENABLED_INVITE_ADAPTERS.has(type)}>
                        {getAdapterLabel(type)}{!ENABLED_INVITE_ADAPTERS.has(type) ? t("authGap.comingSoon") : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">{t("authGap.capabilities")}</span>
                  <textarea
                    className={fieldClassName}
                    rows={4}
                    value={capabilities}
                    onChange={(event) => setCapabilities(event.target.value)}
                  />
                </label>
                {error ? <p className="text-xs text-red-400">{renderInviteMessage(error, t)}</p> : null}
                <Button
                  className="w-full rounded-none"
                  disabled={acceptMutation.isPending || agentName.trim().length === 0}
                  onClick={() => acceptMutation.mutate()}
                >
                  {acceptMutation.isPending ? t("authGap.working") : joinButtonLabel}
                </Button>
              </div>
            ) : requiresHumanAccount ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    {authMode === "sign_up" ? t("authGap.createYourAccount") : t("authGap.signInToContinue")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {authMode === "sign_up"
                      ? t("authGap.createAccountIntro", { organization: companyDisplayName })
                      : t("authGap.existingAccountIntro")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${modeButtonBaseClassName} ${
                      authMode === "sign_up"
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                    onClick={() => {
                      setAuthFeedback(null);
                      setAuthMode("sign_up");
                    }}
                  >
                    {t("authGap.createAccount")}
                  </button>
                  <button
                    type="button"
                    className={`${modeButtonBaseClassName} ${
                      authMode === "sign_in"
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                    onClick={() => {
                      setAuthFeedback(null);
                      setAuthMode("sign_in");
                    }}
                  >
                    {t("authGap.alreadyHaveAccount")}
                  </button>
                </div>

                <form
                  className="space-y-4"
                  method="post"
                  action={authMode === "sign_up" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email"}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (authMutation.isPending) return;
                    if (!authCanSubmit) {
                      setAuthFeedback({ tone: "error", key: "authGap.requiredFields" });
                      return;
                    }
                    authMutation.mutate();
                  }}
                  data-testid="invite-inline-auth"
                >
                  {authMode === "sign_up" ? (
                    <label className="block text-sm" htmlFor="invite-name">
                      <span className="mb-1 block text-zinc-400">{t("authGap.name")}</span>
                      <input
                        id="invite-name"
                        name="name"
                        className={fieldClassName}
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setAuthFeedback(null);
                        }}
                        autoComplete="name"
                        required
                        aria-required="true"
                        aria-invalid={authFeedback?.tone === "error" ? true : undefined}
                        aria-describedby={authFeedback ? authErrorId : undefined}
                        autoFocus
                      />
                    </label>
                  ) : null}
                  <label className="block text-sm" htmlFor="invite-email">
                    <span className="mb-1 block text-zinc-400">{t("authGap.email")}</span>
                    <input
                      id="invite-email"
                      name="email"
                      type="email"
                      className={fieldClassName}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setAuthFeedback(null);
                      }}
                      autoComplete="username"
                      required
                      aria-required="true"
                      aria-invalid={authFeedback?.tone === "error" ? true : undefined}
                      aria-describedby={authFeedback ? authErrorId : undefined}
                      autoFocus={authMode === "sign_in"}
                    />
                  </label>
                  <label className="block text-sm" htmlFor="invite-password">
                    <span className="mb-1 block text-zinc-400">{t("authGap.password")}</span>
                    <input
                      id="invite-password"
                      name="password"
                      type="password"
                      className={fieldClassName}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setAuthFeedback(null);
                      }}
                      autoComplete={authMode === "sign_in" ? "current-password" : "new-password"}
                      required
                      aria-required="true"
                      aria-invalid={authFeedback?.tone === "error" ? true : undefined}
                      aria-describedby={authFeedback ? authErrorId : undefined}
                    />
                  </label>
                  {authFeedback ? (
                    <p
                      id={authErrorId}
                      role="alert"
                      className={`text-xs ${
                        authFeedback.tone === "info" ? "text-amber-300" : "text-red-400"
                      }`}
                    >
                      {renderInviteMessage(authFeedback, t)}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full rounded-none"
                    disabled={authMutation.isPending}
                    aria-disabled={!authCanSubmit || authMutation.isPending}
                  >
                    {authMutation.isPending
                      ? t("authGap.working")
                      : authMode === "sign_in"
                        ? t("authGap.signInContinue")
                        : t("authGap.createContinue")}
                  </Button>
                </form>

                <p className="text-xs leading-5 text-zinc-500">
                  {authMode === "sign_up"
                    ? t("authGap.existingAccountHint")
                    : t("authGap.newAccountHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {isCurrentMember
                      ? t("authGap.alreadyInOrganization")
                      : shouldAutoAcceptHumanInvite
                      ? t("authGap.completingAccess")
                      : invite.inviteType === "bootstrap_ceo"
                        ? t("authGap.acceptBootstrap")
                        : t("authGap.acceptOrganization")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {shouldAutoAcceptHumanInvite
                      ? t("authGap.grantingAccess", { organization: companyDisplayName })
                      : isCurrentMember
                      ? t("authGap.accountBelongs", { organization: companyDisplayName })
                      : invite.inviteType === "bootstrap_ceo"
                        ? t("authGap.finishSetup")
                        : t("authGap.grantAccess", { organization: companyDisplayName })}
                  </p>
                </div>
                {error ? <p className="text-xs text-red-400">{renderInviteMessage(error, t)}</p> : null}
                {shouldAutoAcceptHumanInvite ? (
                  <div className="text-sm text-zinc-400">
                    {acceptMutation.isPending ? t("authGap.submittingRequest") : t("authGap.finishingSignIn")}
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-none"
                    disabled={acceptMutation.isPending}
                    onClick={() => {
                      if (isCurrentMember && invite.companyId) {
                        clearPendingInviteToken(token);
                        setSelectedCompanyId(invite.companyId, { source: "manual" });
                        navigate("/", { replace: true });
                        return;
                      }
                      acceptMutation.mutate();
                    }}
                  >
                    {acceptMutation.isPending ? t("authGap.working") : joinButtonLabel}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
