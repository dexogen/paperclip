import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, Loader2, Lock, RefreshCw, TriangleAlert, UserRound } from "lucide-react";
import type {
  ConnectionAudienceMember,
  ConnectionGrant,
  ConnectionGrantsResponse,
  ToolConnectionCredentialPolicy,
} from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Identity } from "@/components/Identity";
import { GithubIcon } from "@/components/icons/github-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineBanner } from "@/components/InlineBanner";
import { MemberMultiSelect } from "@/components/MemberMultiSelect";
import { RadioCardGroup } from "@/components/ui/radio-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@/lib/router";
import { brandBanner, brandChipBadge } from "@/lib/status-colors";
import { agentUrl, cn } from "@/lib/utils";
import {
  audienceUserIds,
  grantAccountLabel,
  grantStatusLabel,
  grantStatusTone,
  memberLabel,
  organizationGrant,
  personalGrantFor,
  type GrantStatusTone,
} from "../connection-identity";

const STATUS_CHIP: Record<GrantStatusTone, string> = {
  connected: brandChipBadge.green,
  attention: brandChipBadge.amber,
  inactive: brandChipBadge.gray,
  missing: brandChipBadge.gray,
};

function StatusText({ status }: { status: ConnectionGrant["status"] | null }) {
  useFullAppsTranslation();
  const tone = grantStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_CHIP[tone],
      )}
    >
      {grantStatusLabel(status)}
    </span>
  );
}

/**
 * Fixed identity for the connection Setup tab.
 *
 * The chosen personal/organization type comes from the connection policy and
 * the alternative is not rendered after setup. Every action is rendered from
 * a server capability — a policy-forbidden action is absent rather than
 * disabled, so a viewer sees the same legible state with no controls at all.
 */
export function IdentitiesSection({
  appName,
  credentialPolicy,
  ownerUserId,
  connectedUser,
  dedicatedAgent,
  grantsQuery,
  loading,
  error,
  onConnectAsMe,
  onConnectOrganization,
  onConnectAgent,
  onRefreshAccess,
  refreshAccessPending = false,
  onReplaceAudience,
  connectPending,
  audiencePending,
  audienceError,
  audienceGrantId,
  onOpenAudience,
  onCloseAudience,
}: {
  appName: string;
  credentialPolicy: ToolConnectionCredentialPolicy;
  ownerUserId: string | null;
  connectedUser: { label: string; image: string | null } | null;
  dedicatedAgent: { id: string; name: string; urlKey?: string | null } | null;
  grantsQuery: ConnectionGrantsResponse | undefined;
  loading: boolean;
  error: boolean;
  onConnectAsMe: () => void;
  onConnectOrganization: () => void;
  onConnectAgent: (agentId: string) => void;
  onRefreshAccess?: () => void;
  refreshAccessPending?: boolean;
  onReplaceAudience: (grant: ConnectionGrant, memberUserIds: string[]) => void;
  connectPending: boolean;
  audiencePending: boolean;
  audienceError: string | null;
  /**
   * The audience dialog is controlled by the page, not this section: a save that
   * the server rejects has to keep the dialog open with the selection intact,
   * which only the mutation's outcome knows.
   */
  audienceGrantId: string | null;
  onOpenAudience: (grantId: string) => void;
  onCloseAudience: () => void;
}) {
  useFullAppsTranslation();
  const grants = grantsQuery?.grants ?? [];
  const capabilities = grantsQuery?.capabilities;
  const currentUserId = grantsQuery?.currentUserId ?? null;
  const members = grantsQuery?.members ?? [];
  const orgGrant = useMemo(() => organizationGrant(grants), [grants]);
  const myGrant = useMemo(() => personalGrantFor(grants, currentUserId), [grants, currentUserId]);
  const personalGrant = useMemo(() => {
    const personalGrants = grants.filter((grant) => grant.kind === "user");
    return personalGrants.find((grant) => grant.subjectUserId === ownerUserId)
      ?? myGrant
      ?? personalGrants.find((grant) => grant.status === "active")
      ?? personalGrants[0]
      ?? null;
  }, [grants, myGrant, ownerUserId]);
  const agentGrant = useMemo(
    () => grants.find((grant) => grant.kind === "agent" && grant.subjectAgentId === dedicatedAgent?.id)
      ?? grants.find((grant) => grant.kind === "agent")
      ?? null,
    [dedicatedAgent?.id, grants],
  );
  const personalSubjectLabel = memberLabel(
    members,
    personalGrant?.subjectUserId ?? ownerUserId ?? currentUserId,
  );
  const usesPersonalIdentity = credentialPolicy === "per_user"
    || (credentialPolicy === "per_user_with_fallback" && Boolean(myGrant));
  const audienceGrant = audienceGrantId
    ? grants.find((grant) => grant.id === audienceGrantId) ?? null
    : null;

  if (loading) {
    return (
      <section className="space-y-5" aria-busy="true">
        <IdentitiesHeading />
        <Skeleton className="h-14 w-full" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <IdentitiesHeading />
        <InlineBanner tone="warning" compact>{fullAppsT("fullApps.we_couldn_t_load_who_this_connection_acts_as_reload__8d0b5a")}</InlineBanner>
      </section>
    );
  }

  if (credentialPolicy === "per_agent") {
    const github = agentGrant?.providerTenant?.github;
    return (
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-foreground">{fullAppsT("agentToolsUi.github.title")}</h2>
        <p className="text-sm text-muted-foreground">{fullAppsT("providerSetup.access.dedicatedExplanation")}</p>
        <IdentityRow
          title={github ? `@${github.login}` : fullAppsT("agentToolsUi.github.dedicated")}
          status={agentGrant?.status ?? null}
          detail={dedicatedAgent ? (
            <Link
              to={agentUrl(dedicatedAgent)}
              className="transition-colors hover:text-foreground hover:underline"
            ><FullAppsTrans i18nKey="fullApps.used_only_by_5310dd" components={{ part1: <>{dedicatedAgent.name}</> }} /></Link>
          ) : fullAppsT("fullApps.dedicated_to_one_agent_9c2614")}
          actions={!agentGrant && dedicatedAgent && capabilities?.canConfigure ? (
            <Button size="sm" disabled={connectPending} onClick={() => onConnectAgent(dedicatedAgent.id)}><FullAppsTrans i18nKey="fullApps.connect_dedicated_account_17866a" components={{ part1: <>{connectPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}</> }} /></Button>
          ) : null}
        />
        {github ? <GitHubConnectionSummary grant={agentGrant} onRefreshAccess={onRefreshAccess} refreshPending={refreshAccessPending} /> : null}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <IdentitiesHeading />

      <HumanAccessCards
        personal={usesPersonalIdentity}
        restricted={!usesPersonalIdentity && Boolean(orgGrant?.members?.length)}
        connectedName={usesPersonalIdentity ? personalSubjectLabel ?? connectedUser?.label ?? null : null}
        connectedImage={usesPersonalIdentity ? connectedUser?.image ?? null : null}
        status={(usesPersonalIdentity ? personalGrant : orgGrant)?.status ?? null}
        canEditAudience={orgGrant?.capabilities?.canEditAudience ?? false}
        onChooseAll={() => {
          if (orgGrant) onReplaceAudience(orgGrant, []);
        }}
        onChooseSelected={() => {
          if (orgGrant) onOpenAudience(orgGrant.id);
        }}
      />

      {(usesPersonalIdentity ? personalGrant : orgGrant)?.providerTenant?.github ? (
        <GitHubConnectionSummary
          grant={(usesPersonalIdentity ? personalGrant : orgGrant)!}
          onRefreshAccess={onRefreshAccess}
          refreshPending={refreshAccessPending}
        />
      ) : null}

      <div>
        {usesPersonalIdentity ? (
          personalGrant ? null : (
            <IdentityRow
              id="personal-identity"
              title={fullAppsT("fullApps.personal_account_96c55b")}
              status={null}
              detail={fullAppsT("fullApps.personal_identity_dfb320")}
              actions={capabilities?.canConnectAsCurrentUser ? (
                  <Button size="sm" disabled={connectPending} onClick={onConnectAsMe}><FullAppsTrans i18nKey="fullApps.connect_as_me_5331db" components={{ part1: <>{connectPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}</> }} /></Button>
                ) : null}
            />
          )
        ) : (
          orgGrant ? (
            orgGrant.capabilities?.canEditAudience ? (
              <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => onOpenAudience(orgGrant.id)}>{fullAppsT("projectConfigUi.access.manage")}</Button>
              </div>
            ) : null
          ) : (
            <IdentityRow
              title={fullAppsT("fullApps.organization_account_d20569")}
              status={null}
              detail={fullAppsT("fullApps.organization_identity_4f644c")}
              actions={capabilities?.canCreateOrganizationGrant ? (
                  <Button size="sm" disabled={connectPending} onClick={onConnectOrganization}>{fullAppsT("fullApps.connect_organization_identity_dfa1d1")}</Button>
                ) : null}
            />
          )
        )}
      </div>

      {audienceGrant ? (
        <AudienceDialog
          appName={appName}
          grant={audienceGrant}
          members={members}
          pending={audiencePending}
          error={audienceError}
          onCancel={onCloseAudience}
          onSave={(memberUserIds) => onReplaceAudience(audienceGrant, memberUserIds)}
        />
      ) : null}

    </section>
  );
}

function GitHubConnectionSummary({
  grant,
  onRefreshAccess,
  refreshPending,
}: {
  grant: ConnectionGrant;
  onRefreshAccess?: () => void;
  refreshPending: boolean;
}) {
  useFullAppsTranslation();
  const github = grant.providerTenant?.github;
  if (!github) return null;
  const configurationUrl = github.appSlug
    ? `https://github.com/apps/${encodeURIComponent(github.appSlug)}/installations/new`
    : /^https:\/\/github\.com\/apps\/[a-z0-9-]+\/installations\/new$/.test(github.installationUrl ?? "")
      ? github.installationUrl
      : null;
  const repositoryWarning = github.repositorySelection === "all"
    ? fullAppsT("fullApps.all_current_and_future_repositories_e52357")
    : github.repositorySelection === "mixed"
      ? fullAppsT("fullApps.mixed_access_scope_varies_by_installation_2a24b2")
      : null;
  const repositorySummary = github.repositorySelection === "none"
    ? fullAppsT("fullApps.no_repositories_selected_cfc956")
    : fullAppsT("fullApps.selectedRepositories", { count: github.repositoryCount });
  return (
    <div className="divide-y divide-border border-y border-border">
      <div className="py-3">
        <div className="text-sm font-medium text-foreground">{fullAppsT("fullApps.github_account_d686f8")}</div>
        <a className="text-sm text-muted-foreground hover:underline" href={`https://github.com/${encodeURIComponent(github.login)}`} target="_blank" rel="noreferrer">
          @{github.login}
        </a>
      </div>
      <div className="space-y-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{fullAppsT("projectConfigUi.repos.title")}</div>
            {repositoryWarning ? (
              <div
                role="note"
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                  brandBanner.warning,
                )}
              >
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {repositoryWarning}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{repositorySummary}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefreshAccess && configurationUrl ? (
              <Button size="icon-sm" variant="outline" aria-label={fullAppsT("fullApps.refresh_access_0df81b")} title={fullAppsT("fullApps.refresh_access_0df81b")} disabled={refreshPending} onClick={onRefreshAccess}>
                {refreshPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              </Button>
            ) : null}
            {configurationUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={configurationUrl} target="_blank" rel="noreferrer">{fullAppsT("fullApps.add_more_repos_on_github_c7c688")}</a>
              </Button>
            ) : onRefreshAccess ? (
              <Button size="sm" variant="outline" disabled={refreshPending} onClick={onRefreshAccess}><FullAppsTrans i18nKey="fullApps.load_github_configuration_2be0b6" components={{ part1: <>{refreshPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}</> }} /></Button>
            ) : null}
          </div>
        </div>
        {github.repositories ? (
          github.repositories.length ? <ul aria-label={fullAppsT("fullApps.accessible_github_repositories_8aec55")} tabIndex={0} className="max-h-(--sz-github-repository-list) space-y-2 overflow-y-auto text-sm">
            {github.repositories.map((repository) => (
              <li key={repository.id}>
                <a className="flex items-center gap-2 text-muted-foreground hover:underline" href={`https://github.com/${repository.fullName.split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noreferrer">
                  <GithubIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{repository.fullName}</span>
                  {repository.private === true ? <Lock className="h-3 w-3 shrink-0" role="img" aria-label={fullAppsT("projectConfigUi.repos.private")} /> : null}
                </a>
              </li>
            ))}
          </ul> : <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.no_accessible_repositories_ecffe2")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.refresh_access_to_load_the_current_repository_list_601183")}</p>
        )}
        {configurationUrl ? <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.missing_an_organization_or_repository_then_refresh_t_4f4af9" components={{ part1: <a href={configurationUrl} target="_blank" rel="noreferrer" className="text-foreground hover:underline">{fullAppsT("fullApps.configure_access_on_github_e9f56c")}</a> }} /></p> : null}
      </div>
    </div>
  );
}

function IdentitiesHeading() {
  useFullAppsTranslation();
  return <h2 className="text-sm font-semibold text-foreground">{fullAppsT("providerSetup.access.identityHeading")}</h2>;
}

function HumanAccessCards({
  personal,
  restricted,
  connectedName,
  connectedImage,
  status,
  canEditAudience,
  onChooseAll,
  onChooseSelected,
}: {
  personal: boolean;
  restricted: boolean;
  connectedName: string | null;
  connectedImage: string | null;
  status: ConnectionGrant["status"] | null;
  canEditAudience: boolean;
  onChooseAll: () => void;
  onChooseSelected: () => void;
}) {
  useFullAppsTranslation();
  return (
    <div className="space-y-3">
      <RadioCardGroup
        ariaLabel={fullAppsT("fullApps.which_humans_can_use_this_credential_e68f7a")}
        value={personal ? "personal" : restricted ? "selected" : "company"}
        className="sm:grid-cols-2"
        onValueChange={(next) => {
          if (!canEditAudience || personal) return;
          if (next === "company") onChooseAll();
          if (next === "selected") onChooseSelected();
        }}
        options={personal ? [
          {
            value: "personal",
            title: fullAppsT("providerSetup.access.justMe"),
            description: fullAppsT("fullApps.only_you_can_use_this_connection_7fb35f"),
            icon: <UserRound className="h-4 w-4" />,
          },
        ] : [
          {
            value: "selected",
            title: fullAppsT("fullApps.humans_i_pick_733eda"),
            description: fullAppsT("fullApps.only_selected_people_in_your_company_c4dd62"),
            icon: <UserRound className="h-4 w-4" />,
            disabled: !canEditAudience,
          },
          {
            value: "company",
            title: fullAppsT("fullApps.any_human_in_the_company_4b9236"),
            description: fullAppsT("fullApps.anyone_in_your_company_can_use_this_connection_066376"),
            icon: <Building2 className="h-4 w-4" />,
            disabled: !canEditAudience,
          },
        ]}
      />
      {connectedName && status !== null ? (
        <div className="flex flex-wrap items-center gap-2">
          <Identity name={connectedName} avatarUrl={connectedImage} />
          {status === "active" ? null : <StatusText status={status} />}
        </div>
      ) : null}
    </div>
  );
}

function IdentityRow({
  id,
  title,
  status,
  detail,
  actions,
}: {
  id?: string;
  title: string;
  status: ConnectionGrant["status"] | null;
  detail: ReactNode;
  actions: ReactNode;
}) {
  useFullAppsTranslation();
  return (
    <div id={id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {status === "active" ? null : <StatusText status={status} />}
        </div>
        {detail ? <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

/**
 * "Who can use this identity" (PAP-17835 Surface C). Scope is a two-option
 * radio: all organization members, persisted as no audience members, or a
 * selected set. The dialog stays open on a denial so the selection survives.
 */
export function AudienceDialog({
  appName,
  grant,
  members,
  pending,
  error,
  onCancel,
  onSave,
}: {
  appName: string;
  grant: ConnectionGrant;
  members: ConnectionAudienceMember[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (memberUserIds: string[]) => void;
}) {
  useFullAppsTranslation();
  const initialSelection = useMemo(() => audienceUserIds(grant), [grant]);
  const [scope, setScope] = useState<"all" | "selected">(initialSelection.size === 0 ? "all" : "selected");
  const [selected, setSelected] = useState<Set<string>>(initialSelection);

  useEffect(() => {
    setSelected(initialSelection);
    setScope(initialSelection.size === 0 ? "all" : "selected");
  }, [initialSelection]);

  const canSave = scope === "all" || selected.size > 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fullAppsT("fullApps.who_can_use_this_identity_c43b59")}</DialogTitle>
          <DialogDescription>
            {grantAccountLabel(grant)} · {appName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <RadioCardGroup
            ariaLabel={fullAppsT("fullApps.who_can_use_this_identity_c43b59")}
            value={scope}
            onValueChange={(next) => setScope(next as "all" | "selected")}
            options={[
              {
                value: "all",
                title: fullAppsT("fullApps.all_organization_members_eac089"),
                description: fullAppsT("fullApps.anyone_in_this_organization_can_have_work_use_this_i_eb1968"),
              },
              {
                value: "selected",
                title: fullAppsT("fullApps.selected_members_78a279"),
                description: fullAppsT("fullApps.only_the_people_you_choose_085cf1"),
              },
            ]}
          />

          {scope === "selected" ? (
            <MemberMultiSelect
              members={members.map((member) => ({
                userId: member.userId,
                name: member.name,
                email: member.email,
              }))}
              selectedUserIds={selected}
              onChange={setSelected}
              triggerLabel={selected.size === 0
                ? fullAppsT("fullApps.choose_people_4929aa")
                : fullAppsT("fullApps.selectedPeople", { count: selected.size })}
            />
          ) : null}

          <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.this_controls_whose_work_can_use_the_identity_it_doe_0f4980")}</p>

          {error ? (
            <InlineBanner tone="warning" compact>
              {error}
            </InlineBanner>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>{fullAppsT("fullApps.cancel_19766e")}</Button>
          <Button
            disabled={pending || !canSave}
            onClick={() => onSave(scope === "all" ? [] : [...selected])}
          ><FullAppsTrans i18nKey="fullApps.save_audience_ce59d6" components={{ part1: <>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}</> }} /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Revoke confirmation (PAP-17835 Surface D). Revoke breaks active and future
 * runs, so it is an `AlertDialog` and the destructive action is not the initial
 * focus. The row survives afterwards showing Revoked, which keeps the context
 * and the reconnect path.
 */
export function RevokeGrantDialog({
  grant,
  providerName,
  pending,
  isOwnIdentity,
  credentialPolicy,
  description,
  children,
  onCancel,
  onConfirm,
}: {
  grant: ConnectionGrant;
  providerName: string;
  pending: boolean;
  isOwnIdentity: boolean;
  credentialPolicy: ToolConnectionCredentialPolicy;
  description?: string;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useFullAppsTranslation();
  const personal = grant.kind === "user";
  const title = personal
    ? isOwnIdentity
      ? fullAppsT("fullApps.revoke_your_identity_94fe18", { value1: providerName })
      : fullAppsT("fullApps.revoke_this_identity_48d514", { value1: providerName })
    : fullAppsT("fullApps.revoke_the_organization_identity_2606ac");
  const body = personal
    ? isOwnIdentity
      ? fullAppsT("fullApps.agents_will_stop_acting_as_you_work_that_needs_this__a4695e")
      : fullAppsT("fullApps.agents_will_stop_acting_as_this_person_they_can_conn_3ae62a")
    : credentialPolicy === "per_user"
      ? fullAppsT("fullApps.installed_agents_lose_this_shared_identity_immediate_687d8a")
      : fullAppsT("fullApps.eligible_members_and_installed_agents_will_lose_this_c9379a");

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? body}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} autoFocus>{fullAppsT("fullApps.cancel_19766e")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >{fullAppsT("fullApps.revoke_identity_c85342")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
