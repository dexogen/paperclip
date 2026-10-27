import { i18n, useTranslation } from "@/i18n";
import { InlineBanner } from "@/components/InlineBanner";
import { webhookUrlWarningReason } from "@/lib/webhook-url-warning";

const warnings = {
  loopback: {
    get title() { return i18n.t("fullRoutinesSecrets.otherAppsCanTReachThisLocalhostURL"); },
    get message() { return i18n.t("fullRoutinesSecrets.thisAddressPointsBackToTheMachineSendingThe"); },
  },
  private: {
    get title() { return i18n.t("fullRoutinesSecrets.thisWebhookURLAppearsToBePrivate"); },
    get message() { return i18n.t("fullRoutinesSecrets.onlySendersWithAccessToThisNetworkCanReach"); },
  },
  tailscale: {
    get title() { return i18n.t("fullRoutinesSecrets.thisTailscaleURLMayNotBePublic"); },
    get message() { return i18n.t("fullRoutinesSecrets.tailscaleServeIsPrivateToYourTailnetEvenWith"); },
  },
  https: {
    get title() { return i18n.t("fullRoutinesSecrets.useHTTPSForWebhooksFromOtherApps"); },
    get message() { return i18n.t("fullRoutinesSecrets.thisURLUsesHTTPManyAppsRequireHTTPSAnd"); },
  },
  invalid: {
    get title() { return i18n.t("fullRoutinesSecrets.checkTheWebhookURL"); },
    get message() { return i18n.t("fullRoutinesSecrets.thisIsNotAValidHTTPOrHTTPSURL"); },
  },
};

export function WebhookUrlWarning({ url }: { url: string }) {
  const { t } = useTranslation();
  const reason = webhookUrlWarningReason(url);
  if (!reason) return null;
  const warning = warnings[reason];
  return <InlineBanner tone="warning" title={warning.title}>
    <div className="space-y-2">
      <p>{warning.message}</p>
      <p>{t("fullRoutinesSecrets.youCanContinueForLocalOrPrivateNetworkUse")}</p>
      <a className="underline underline-offset-4" href="https://docs.paperclip.ing/reference/deploy/https/" target="_blank" rel="noopener noreferrer">{t("fullRoutinesSecrets.learnHowToSetUpHTTPSAndPublicAccess")}</a>
    </div>
  </InlineBanner>;
}
