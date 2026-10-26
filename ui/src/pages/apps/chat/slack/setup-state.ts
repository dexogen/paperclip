import { t as fullAppsT } from "@/i18n";
import type { ChatEndpoint } from "@/api/chatEndpoints";
import { isProvisionedSlackSetup } from "@paperclipai/shared";
export { isProvisionedSlackSetup };
export function slackSetupNavigation(method: string | undefined, availableStage = 1) {
  const managed = method === "managed";
  return {
    labels: managed ? [fullAppsT("fullApps.choose_agent_f7c0bf"), fullAppsT("fullApps.connect_1a2303")] : isProvisionedSlackSetup(method)
      ? [fullAppsT("fullApps.choose_agent_f7c0bf"), fullAppsT("fullApps.app_configuration_access_token_c6fb13"), fullAppsT("fullApps.install_slack_app_8c9397"), fullAppsT("fullApps.child_56e541ad86")]
      : [fullAppsT("fullApps.choose_agent_f7c0bf"), fullAppsT("fullApps.create_slack_app_7e043d"), fullAppsT("fullApps.child_36230477dc"), fullAppsT("fullApps.verify_slack_connection_f64c0a"), fullAppsT("fullApps.connect_your_slack_account_afd67d"), fullAppsT("fullApps.child_fe69511137")],
    toVisible: (step: number) => managed ? Math.min(step, 1) : step,
    toStage: (step: number) => managed && step === 1 ? availableStage : step,
  };
}

/** Logical stages stay compatible with existing draft URLs; navigation is derived here. */
export function slackSetupState(input: { endpoint: ChatEndpoint | null; repairing: boolean; credentialsReady: boolean; identityReady: boolean; defaultMethod?: string }) {
  const { endpoint, repairing, credentialsReady, identityReady } = input;
  const method = endpoint ? endpoint.setup?.slackSetupMethod : input.defaultMethod ?? "managed";
  const provisioned = isProvisionedSlackSetup(method);
  const complete = provisioned && (endpoint?.setup?.step === "test" || endpoint?.setup?.step === "complete");
  const finalStage = provisioned ? 3 : 5;
  const availableStage = !endpoint ? 0
    : provisioned && endpoint.setup?.slackRegistration?.status === "configured" && endpoint.setup.slackAccount?.status !== "linked" && endpoint.setup.step !== "complete" ? 2
    : !repairing && (endpoint.setup?.step === "test" || endpoint.setup?.step === "complete")
      ? endpoint.setup.step !== "complete" && !provisioned && !identityReady ? 4 : finalStage
    : provisioned && endpoint.setup?.slackRegistration?.status === "credentials_saved" ? 2
    : endpoint.providerAccountId && !repairing ? 3
    : credentialsReady || repairing || method === "existing" || provisioned && endpoint.setup?.slackRegistration?.appId ? 2 : 1;
  return { ...slackSetupNavigation(method, availableStage), provisioned, complete, finalStage, availableStage };
}
