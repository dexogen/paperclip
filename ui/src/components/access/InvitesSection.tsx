import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { accessApi } from "@/api/access";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";

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

const INVITE_HISTORY_PAGE_SIZE = 5;

function isInviteHistoryRow(value: unknown): value is Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number] {
  if (!value || typeof value !== "object") return false;
  return "id" in value && "state" in value && "createdAt" in value;
}

/** The Invites tab of the Members page (extracted from the former standalone Invites page). */
export function InvitesSection() {
  useFullSharedTranslation();
  const { selectedCompanyId } = useCompany();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [humanRole, setHumanRole] = useState<"owner" | "admin" | "operator" | "viewer">("operator");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteCopied, setLatestInviteCopied] = useState(false);
  const latestInviteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!latestInviteCopied) return;
    const timeout = window.setTimeout(() => {
      setLatestInviteCopied(false);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [latestInviteCopied]);

  function selectLatestInviteUrl() {
    latestInviteInputRef.current?.focus();
    latestInviteInputRef.current?.select();
  }

  async function copyText(text: string, unavailableBody: string, afterFallback?: () => void) {
    try {
      await copyTextToClipboard(text);
      return true;
    } catch {
      afterFallback?.();
    }
    pushToast({
      title: fullSharedT("fullShared.clipboard_unavailable_4ff69f"),
      body: unavailableBody,
      tone: "warn",
    });
    return false;
  }

  async function copyInviteUrl(url: string) {
    return copyText(url, "The invite URL is selected. Copy it manually from the field.", selectLatestInviteUrl);
  }

  const inviteHistoryQueryKey = queryKeys.access.invites(selectedCompanyId ?? "", "all", INVITE_HISTORY_PAGE_SIZE);
  const invitesQuery = useInfiniteQuery({
    queryKey: inviteHistoryQueryKey,
    queryFn: ({ pageParam }) =>
      accessApi.listInvites(selectedCompanyId!, {
        limit: INVITE_HISTORY_PAGE_SIZE,
        offset: pageParam,
      }),
    enabled: !!selectedCompanyId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const inviteHistory = useMemo(
    () =>
      invitesQuery.data?.pages.flatMap((page) =>
        Array.isArray(page?.invites) ? page.invites.filter(isInviteHistoryRow) : [],
      ) ?? [],
    [invitesQuery.data?.pages],
  );

  const createInviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, {
        allowedJoinTypes: "human",
        humanRole,
        agentMessage: null,
      }),
    onSuccess: async (invite) => {
      setLatestInviteUrl(invite.inviteUrl);
      setLatestInviteCopied(false);
      const copied = await copyText(invite.inviteUrl, fullSharedTailT("fullSharedTail.inviteCopyManually"));

      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({
        title: fullSharedT("fullShared.invite_created_eb00b1"),
        body: copied ? fullSharedTailT("fullSharedTail.inviteReadyCopied") : fullSharedTailT("fullSharedTail.inviteReady"),
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: fullSharedT("fullShared.failed_to_create_invite_23a0de"),
        body: error instanceof Error ? error.message : fullSharedTailT("fullSharedTail.unknownError"),
        tone: "error",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => accessApi.revokeInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({ title: fullSharedT("fullShared.invite_revoked_d8fb33"), tone: "success" });
    },
    onError: (error) => {
      pushToast({
        title: fullSharedT("fullShared.failed_to_revoke_invite_ac674f"),
        body: error instanceof Error ? error.message : fullSharedTailT("fullSharedTail.unknownError"),
        tone: "error",
      });
    },
  });

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{fullSharedT("fullShared.select_an_organization_to_manage_invites_462e18")}</div>;
  }

  if (invitesQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{fullSharedT("fullShared.loading_invites_5c525c")}</div>;
  }

  if (invitesQuery.error) {
    const message =
      invitesQuery.error instanceof ApiError && invitesQuery.error.status === 403
        ? fullSharedT("fullShared.you_do_not_have_permission_to_manage_organization_in_e61b97")
        : invitesQuery.error instanceof Error
          ? invitesQuery.error.message
          : fullSharedT("fullShared.failed_to_load_invites_d62fcf");
    return <div className="text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="max-w-6xl space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">{fullSharedT("fullShared.invite_people_to_request_access_to_this_organization_b8b297")}</p>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{fullSharedT("fullShared.invite_a_person_f76f96")}</h2>
          <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.generate_a_human_invite_link_and_choose_the_default__dd31c5")}</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{fullSharedT("fullShared.choose_a_role_a49c49")}</legend>
          <div className="rounded-xl border border-border">
            {inviteRoleOptions.map((option, index) => {
              const checked = humanRole === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 px-4 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={option.value}
                    checked={checked}
                    onChange={() => setHumanRole(option.value)}
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
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">{fullSharedT("fullShared.each_invite_link_is_single_use_human_invitees_get_th_879640")}</div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => createInviteMutation.mutate()} disabled={createInviteMutation.isPending}>
            {createInviteMutation.isPending ? fullSharedT("taskProperties.fields.creating") : fullSharedT("fullShared.create_invite_9f395b")}
          </Button>
          <span className="text-sm text-muted-foreground">{fullSharedT("fullShared.invite_history_below_keeps_the_audit_trail_030769")}</span>
        </div>

        {latestInviteUrl ? (
          <div className="space-y-3 rounded-lg border border-border px-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{fullSharedT("fullShared.latest_invite_link_ee47fa")}</div>
                {latestInviteCopied ? (
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    <Check className="h-3.5 w-3.5" />{fullSharedT("taskPanels.preview.copied")}</div>
                ) : null}
              </div>
              <div className="text-sm text-muted-foreground">{fullSharedT("fullShared.this_url_includes_the_current_paperclip_domain_retur_3bad03")}</div>
            </div>
            <label className="block space-y-1">
              <span className="sr-only">{fullSharedT("fullShared.latest_invite_url_35fbc9")}</span>
              <input
                ref={latestInviteInputRef}
                readOnly
                value={latestInviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="w-full rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none transition-colors selection:bg-primary selection:text-primary-foreground focus:border-ring"
                aria-label={fullSharedT("fullShared.latest_invite_url_35fbc9")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const copied = await copyInviteUrl(latestInviteUrl);
                  setLatestInviteCopied(copied);
                }}
              >
                <Copy className="h-4 w-4" />{fullSharedT("fullShared.copy_link_dbf362")}</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{fullSharedT("fullShared.invite_history_0269fe")}</h2>
            <p className="text-sm text-muted-foreground">{fullSharedT("fullShared.review_invite_status_audience_inviter_and_any_linked_bc3cae")}</p>
          </div>
          <Link to="/inbox/requests" className="text-sm underline underline-offset-4">{fullSharedT("fullShared.open_join_request_queue_3f3aa6")}</Link>
        </div>

        {inviteHistory.length === 0 ? (
          <div className="border-t border-border px-5 py-8 text-sm text-muted-foreground">{fullSharedT("fullShared.no_invites_have_been_created_for_this_organization_y_c20447")}</div>
        ) : (
          <div className="border-t border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("runUi.inspector.state")}</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">{fullSharedT("fullShared.for_ca15eb")}</th>
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
                          {formatInviteState(invite.state)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 align-top">{formatInviteAudience(invite)}</td>
                      <td className="px-5 py-3 align-top">
                        <div>{invite.invitedByUser?.name || invite.invitedByUser?.email || fullSharedT("fullShared.unknown_inviter_7cf15e")}</div>
                        {invite.invitedByUser?.email && invite.invitedByUser.name ? (
                          <div className="text-xs text-muted-foreground">{invite.invitedByUser.email}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 align-top text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {invite.relatedJoinRequestId ? (
                          <Link to="/inbox/requests" className="underline underline-offset-4">{fullSharedT("taskChatUi.interaction.reviewRequest")}</Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        {invite.state === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeMutation.mutate(invite.id)}
                            disabled={revokeMutation.isPending}
                          >{fullSharedT("taskProperties.share.revoke")}</Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{fullSharedT("fullShared.inactive_ac7c94")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invitesQuery.hasNextPage ? (
              <div className="flex justify-center border-t border-border px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invitesQuery.fetchNextPage()}
                  disabled={invitesQuery.isFetchingNextPage}
                >
                  {invitesQuery.isFetchingNextPage ? fullSharedT("fullShared.loading_more_964e5f") : fullSharedT("fullShared.view_more_267e55")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function formatInviteState(state: "active" | "accepted" | "expired" | "revoked") {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function formatInviteAudience(invite: Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number]) {
  if (invite.allowedJoinTypes === "agent") return "Agent";
  if (invite.allowedJoinTypes === "both") return invite.humanRole ? `Human or agent · ${invite.humanRole}` : "Human or agent";
  return invite.humanRole ?? "Human";
}
