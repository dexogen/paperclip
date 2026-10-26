import { t as fullAppsT } from "@/i18n";
/** Presentation metadata only. Each provider will have its own catalog entry and connection. */
export type RemoteMcpProviderId = "zapier" | "arcade" | "composio" | "executor";

export interface RemoteMcpProvider {
  id: RemoteMcpProviderId;
  name: string;
  description: string;
  instructions: string[];
  setupUrl: string;
  dashboardUrl: string;
  defaultUrl: string;
  placeholder: string;
  urlHelp: string;
  authHelp: string;
  supportsBrowserAuth: boolean;
}

export const remoteMcpProviders: Record<RemoteMcpProviderId, RemoteMcpProvider> = {
  zapier: {
    id: "zapier", name: "Zapier", supportsBrowserAuth: false,
    get description() { return fullAppsT("fullApps.use_the_apps_and_actions_on_your_zapier_mcp_server_81a622"); },
    get instructions() { return [fullAppsT("fullApps.create_an_mcp_server_in_zapier_and_choose_other_as_t_f8dd03"), fullAppsT("fullApps.connect_your_apps_and_select_the_actions_to_expose_463fab"), fullAppsT("fullApps.open_connect_generate_a_token_and_copy_the_full_serv_0614c0")]; },
    setupUrl: "https://docs.zapier.com/mcp/get-started/connect/other",
    dashboardUrl: "https://mcp.zapier.com",
    defaultUrl: "", get placeholder() { return fullAppsT("fullApps.paste_the_full_url_from_zapier_2b71b0"); },
    get urlHelp() { return fullAppsT("fullApps.the_full_server_url_can_contain_a_secret_token_paste_da7245"); },
    get authHelp() { return fullAppsT("fullApps.for_a_separate_token_use_https_mcp_zapier_com_api_v1_8bf657"); },
  },
  arcade: {
    id: "arcade", name: "Arcade", supportsBrowserAuth: true,
    get description() { return fullAppsT("fullApps.use_the_tools_exposed_by_your_arcade_gateway_081210"); },
    get instructions() { return [fullAppsT("fullApps.create_a_gateway_in_arcade_and_select_its_tools_dae765"), fullAppsT("fullApps.choose_its_user_source_and_copy_the_gateway_url_3cae61"), fullAppsT("fullApps.paste_the_url_here_then_sign_in_when_prompted_165e25")]; },
    setupUrl: "https://docs.arcade.dev/en/operate/governance/mcp-gateways",
    dashboardUrl: "https://app.arcade.dev",
    defaultUrl: "", placeholder: "https://api.arcade.dev/mcp/your-gateway",
    get urlHelp() { return fullAppsT("fullApps.copy_the_mcp_gateway_url_from_arcade_app_authorizati_5de222"); },
    get authHelp() { return fullAppsT("fullApps.for_arcade_headers_use_an_api_key_as_the_bearer_toke_56863c"); },
  },
  composio: {
    id: "composio", name: "Composio", supportsBrowserAuth: true,
    get description() { return fullAppsT("fullApps.discover_and_use_your_apps_through_composio_connect_8b7285"); },
    get instructions() { return [fullAppsT("fullApps.connect_to_composio_and_sign_in_with_your_account_7010e8"), fullAppsT("fullApps.connect_underlying_apps_in_composio_when_prompted_20bbfc")]; },
    setupUrl: "https://docs.composio.dev/docs/composio-connect",
    dashboardUrl: "https://dashboard.composio.dev",
    defaultUrl: "https://connect.composio.dev/mcp", placeholder: "https://connect.composio.dev/mcp",
    get urlHelp() { return fullAppsT("fullApps.paste_the_mcp_url_from_your_existing_composio_sessio_6be76c"); },
    get authHelp() { return fullAppsT("fullApps.session_urls_and_headers_come_from_your_external_com_2b2155"); },
  },
  executor: {
    id: "executor", name: "Executor", supportsBrowserAuth: true,
    get description() { return fullAppsT("fullApps.run_tools_through_your_executor_workspace_b7bfda"); },
    get instructions() { return [fullAppsT("fullApps.connect_your_apps_and_configure_action_policies_in_e_5ba5fb"), fullAppsT("fullApps.open_integrations_and_copy_the_url_under_connect_an__0aaf55"), fullAppsT("fullApps.paste_it_here_and_sign_in_when_prompted_bd19ad")]; },
    setupUrl: "https://executor.sh/docs/mcp-proxy",
    dashboardUrl: "https://executor.sh",
    defaultUrl: "", get placeholder() { return fullAppsT("fullApps.paste_your_executor_workspace_mcp_url_aa2d8d"); },
    get urlHelp() { return fullAppsT("fullApps.use_the_hosted_workspace_url_or_a_self_hosted_http_e_71a97a"); },
    get authHelp() { return fullAppsT("fullApps.keep_any_options_in_the_copied_url_if_using_an_api_k_277fab"); },
  },
};
