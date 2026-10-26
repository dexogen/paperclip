import { AppDisplayError } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { healthApi } from "@/api/health";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { queryKeys } from "@/lib/queryKeys";

export function SlackIdentityStep({ endpointId, command, testStartedAt, onConnected, onSaveExit }: {
  endpointId: string;
  command: string;
  testStartedAt?: string | null;
  onConnected: () => void;
  onSaveExit: () => void;
}) {
  useFullAppsTranslation();
  const client = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const session = useQuery({ queryKey: queryKeys.auth.session, queryFn: authApi.getSession, retry: false });
  const health = useQuery({ queryKey: queryKeys.health, queryFn: healthApi.get });
  const identities = useQuery({
    queryKey: queryKeys.chatEndpoints.principals(endpointId),
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
    refetchInterval: 1_500,
  });
  const local = health.data?.deploymentMode === "local_trusted";
  const userId = local ? "local-board" : session.data?.user.id;
  const userLabel = local ? fullAppsT("fullApps.local_board_fbc35f") : session.data?.user.name || session.data?.user.email;
  const candidates = (identities.data ?? []).filter((identity) => identity.lastConnectAt &&
    (!testStartedAt || Date.parse(identity.lastConnectAt) >= Date.parse(testStartedAt)));
  const linkedToMe = candidates.some((identity) => identity.status === "linked" && identity.paperclipUserId === userId);
  const connectCommand = `${command} connect`;
  const link = useMutation({
    mutationFn: async (principalId: string) => {
      const { confirmationUrl } = await chatEndpointsApi.createLinkIntent(endpointId, principalId);
      const token = new URL(confirmationUrl, window.location.origin).searchParams.get("token");
      if (!token) throw new AppDisplayError("fullApps.could_not_create_the_account_confirmation_try_again_571a4a");
      await chatEndpointsApi.confirmIdentityLink(token);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.chatEndpoints.principals(endpointId) }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{fullAppsT("fullApps.connect_your_slack_account_afd67d")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fullAppsT("fullApps.send_this_command_in_slack_so_we_can_identify_your_a_9520c9")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <code className="text-sm">{connectCommand}</code>
        <Button variant="ghost" size="sm" onClick={() => {
          void copyTextToClipboard(connectCommand).then(() => { setCopied(true); setCopyError(false); }, () => setCopyError(true));
        }}><Copy className="size-4" />{copied ? fullAppsT("taskPanels.preview.copied") : fullAppsT("fullApps.copy_command_9a01fe")}</Button>
      </div>
      {copyError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_copy_the_command_select_and_copy_it_above_e3ad57")}</p>}
      <p className="text-sm">
        <a href="https://app.slack.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{fullAppsT("fullApps.open_slack_4ddf02")}<ExternalLink className="inline size-3" /></a>{fullAppsT("fullApps.send_the_command_in_your_workspace_then_return_here_60046b")}</p>
      {identities.isError ? (
        <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_check_for_your_slack_account_we_ll_keep_try_a06f0b")}</p>
      ) : candidates.length === 0 ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{fullAppsT("fullApps.waiting_for_your_connect_command_beec86")}</p>
      ) : (
        <div className={`space-y-3 rounded-lg border p-4 ${linkedToMe
          ? "border-(--status-task-done)/30 bg-(--status-task-done)/10"
          : "border-(--status-task-todo)/30 bg-(--status-task-todo)/10"}`}>
          <p className="text-sm"><FullAppsTrans i18nKey="fullApps.choose_your_slack_account_below_to_link_it_to_only_c_fde9f8" components={{ part1: <strong>{userLabel ?? fullAppsT("fullApps.your_paperclip_account_3dc488")}</strong> }} /></p>
          {candidates.map((identity) => {
            const mine = identity.status === "linked" && identity.paperclipUserId === userId;
            return (
              <div key={identity.principalId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{identity.externalLabel}</p>
                  <p className="text-xs text-muted-foreground">{identity.externalDetail}</p>
                </div>
                {mine ? <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-(--status-task-done)" />{fullAppsT("fullApps.linked_to_you_a48569")}</p>
                  : identity.status === "linked" ? <p className="text-sm text-muted-foreground"><FullAppsTrans i18nKey="fullApps.linked_to_edb81b" components={{ part1: <>{identity.paperclipUserLabel ?? fullAppsT("fullApps.another_paperclip_account_823087")}</> }} /></p>
                  : <Button variant="outline" disabled={!userId || link.isPending} onClick={() => link.mutate(identity.principalId)} aria-label={fullAppsT("fullApps.link_to_my_paperclip_account_71814d", { value1: identity.externalLabel })}><FullAppsTrans i18nKey="fullApps.this_is_my_slack_account_169052" components={{ part1: <>{link.isPending && link.variables === identity.principalId && <Loader2 className="size-4 animate-spin" />}</> }} /></Button>}
              </div>
            );
          })}
        </div>
      )}
      {!userId && !session.isPending && !health.isPending && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.sign_in_to_paperclip_to_link_your_slack_account_refr_2de043")}</p>}
      {link.isError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.couldn_t_link_your_account_check_that_you_are_a_memb_cc619f")}</p>}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" className="text-muted-foreground" onClick={onSaveExit}>{fullAppsT("agentSetupUi.setup.saveExit")}</Button>
        {linkedToMe && <Button onClick={onConnected}>{fullAppsT("fullApps.continue_to_message_test_4e1133")}</Button>}
      </div>
    </div>
  );
}
