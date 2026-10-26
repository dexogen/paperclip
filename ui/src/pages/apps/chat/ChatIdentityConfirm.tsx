import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { chatEndpointsApi, type ChatProvider } from "@/api/chatEndpoints";
import { healthApi } from "@/api/health";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { Navigate, useSearchParams } from "@/lib/router";

const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  agentmail: "AgentMail",
  "imessage-photon": "iMessage Photon",
};

export function ChatIdentityConfirm() {
  useFullAppsTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [confirmed, setConfirmed] = useState(false);
  const health = useQuery({ queryKey: queryKeys.health, queryFn: healthApi.get, retry: false });
  const local = health.data?.deploymentMode === "local_trusted";
  const session = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const preview = useQuery({
    queryKey: ["chat-identity-link-preview", token],
    queryFn: () => chatEndpointsApi.previewIdentityLink(token),
    enabled: token.length >= 32 && (local || Boolean(session.data)),
    refetchInterval: confirmed ? false : 3_000,
    retry: false,
  });
  const confirm = useMutation({
    mutationFn: () => chatEndpointsApi.confirmIdentityLink(token),
    onSuccess: () => setConfirmed(true),
  });

  const requestAccess = useMutation({
    mutationFn: () => chatEndpointsApi.requestIdentityAccess(token),
  });
  if (health.isError || (!local && session.isError)) return <main className="mx-auto max-w-lg px-6 py-12 text-sm text-destructive">{fullAppsT("fullApps.couldn_t_load_your_account_refresh_to_try_again_8f5cf3")}</main>;
  if (health.isSuccess && !local && session.isSuccess && !session.data) {
    return <Navigate to={`/auth?next=${encodeURIComponent(`/chat-identity/confirm?token=${token}`)}`} replace />;
  }
  if (token.length < 32 || (!confirmed && preview.isError)) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-6 py-12">
        <h1 className="text-xl font-bold">{fullAppsT("fullApps.this_identity_link_is_unavailable_4f7596")}</h1>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.the_link_is_invalid_expired_already_used_or_belongs__1278a4")}</p>
      </main>
    );
  }
  if (health.isPending || preview.isLoading || (!local && session.isLoading) || !preview.data) {
    return (
      <main className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />{fullAppsT("fullApps.checking_identity_link_b27af0")}</main>
    );
  }
  const identity = preview.data;
  const paperclipAccount = local ? fullAppsT("fullApps.local_board_fbc35f") :
    session.data?.user.name?.trim() ||
    session.data?.user.email?.trim() ||
    session.data?.user.id ||
    fullAppsT("fullApps.copy_6dd21c3bbb8c");
  if (confirmed) {
    return (
      <main className="mx-auto max-w-lg space-y-5 px-6 py-12">
        <CheckCircle2 className="h-8 w-8" />
        <div>
          <h1 className="text-xl font-bold">{fullAppsT("fullApps.identity_linked_ce7551")}</h1>
          <p className="mt-1 text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.future_messages_from_use_your_current_paperclip_perm_f4f133" components={{ part1: <>{identity.externalLabel}</>, part2: <>{identity.companyName}</> }} /></p>
        </div>
        {identity.provider === "slack" && <Button asChild><a href="https://app.slack.com/" target="_blank" rel="noopener noreferrer">{fullAppsT("fullApps.return_to_slack_b460e2")}</a></Button>}
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-12">
      <div>
        <p className="text-sm text-muted-foreground">{identity.companyName}</p>
        <h1 className="mt-1 text-xl font-bold">{fullAppsT("fullApps.link_your_external_identity_61da1f")}</h1>
      </div>
      <dl className="divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-sm text-muted-foreground">{fullAppsT("runUi.inspector.provider")}</dt>
          <dd className="text-sm font-medium">
            {providerNames[identity.provider]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-sm text-muted-foreground">{fullAppsT("fullApps.external_identity_22da53")}</dt>
          <dd className="text-right text-sm font-medium">
            {identity.externalLabel}
            {identity.externalDetail ? ` · ${identity.externalDetail}` : ""}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-sm text-muted-foreground">{fullAppsT("fullApps.paperclip_account_deb278")}</dt>
          <dd className="text-right text-sm font-medium">{paperclipAccount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-sm text-muted-foreground">{fullAppsT("taskProperties.fields.agent")}</dt>
          <dd className="text-sm font-medium">
            {identity.botLabel ?? fullAppsT("fullApps.paperclip_agent_b2cc8a")}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.confirm_only_if_this_is_your_identity_paperclip_will_a57a64" components={{ part1: <>{providerNames[identity.provider]}</>, part2: <>{" "}</> }} /></p>
      {confirm.isError && (
        <p className="text-sm text-destructive">{fullAppsT("fullApps.this_link_could_not_be_confirmed_it_may_have_expired_bdb905")}</p>
      )}
      {identity.canConfirm === false ? (
        <div className="space-y-3">
          <p className="text-sm"><FullAppsTrans i18nKey="fullApps.you_need_membership_in_before_linking_this_account_37a52f" components={{ part1: <>{identity.companyName}</> }} /></p>
          {requestAccess.isSuccess ? <p role="status" className="text-sm">{fullAppsT("fullApps.access_requested_an_admin_can_approve_it_in_papercli_817b77")}</p>
            : <Button disabled={requestAccess.isPending || !identity.selfService} onClick={() => requestAccess.mutate()}>{fullAppsT("fullApps.request_access_b06f16")}</Button>}
          {requestAccess.isError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_request_access_the_link_may_have_expired_se_c37a83")}</p>}
        </div>
      ) : <Button disabled={confirm.isPending} onClick={() => confirm.mutate()}><FullAppsTrans i18nKey="fullApps.confirm_identity_9288a6" components={{ part1: <>{confirm.isPending && <Loader2 className="h-4 w-4 animate-spin" />}</> }} /></Button>}
    </main>
  );
}
