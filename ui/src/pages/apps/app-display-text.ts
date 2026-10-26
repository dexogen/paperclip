import type { TOptions } from "i18next";
import { i18n, t } from "@/i18n";

type AppDisplayErrorKey =
  | "fullApps.assignmentFailed"
  | "fullApps.assignmentRollbackFailed"
  | "fullApps.avatar_unavailable_cc96f4"
  | "fullApps.check_link_d388c7"
  | "fullApps.cloud_enrollment_could_not_be_started_854e5b"
  | "fullApps.could_not_create_the_account_confirmation_try_again_571a4a"
  | "fullApps.enter_an_https_console_url_without_credentials_b8db48"
  | "fullApps.enter_both_a_name_and_value_for_each_header_6e1378"
  | "fullApps.error_81db729956a8"
  | "fullApps.error_909e61bc9b5d"
  | "fullApps.github_returned_an_invalid_registration_address_ccfe60"
  | "fullApps.message_b6fefe634f4b"
  | "fullApps.no_draft_to_finish_1591d8"
  | "fullApps.only_remote_http_drafts_can_be_checked_and_activated_d983b9"
  | "fullApps.open_the_confirmation_again_before_removing_this_poo_5cadcb"
  | "fullApps.paperclip_couldn_t_read_that_file_choose_the_pem_fil_f8fe49"
  | "fullApps.sign_in_again_to_connect_your_own_account_9aef4f"
  | "fullApps.sign_in_window_unavailable_342c7e"
  | "fullApps.slack_setup_is_still_loading_try_again_7c9ed0"
  | "fullApps.the_agent_s_ai_connection_changed_reload_the_task_an_8afd21"
  | "fullApps.this_connection_pool_is_no_longer_available_b9b364"
  | "fullApps.use_an_https_console_url_without_credentials_f9e019";

type AppDisplayKey = AppDisplayErrorKey
  | "agentConnectionUi.instructions.saveError"
  | "fullApps.changes_saved_12b3f1"
  | "fullApps.child_9cc6d48cfb"
  | "fullApps.could_not_connect_github_try_again_86544d"
  | "fullApps.could_not_connect_please_try_again_e249ad"
  | "fullApps.could_not_copy_the_link_open_account_linking_and_cop_e3f2cb"
  | "fullApps.could_not_copy_the_number_select_and_copy_it_manuall_89546d"
  | "fullApps.could_not_copy_the_number_select_it_in_the_instructi_9bb7a5"
  | "fullApps.could_not_read_this_file_try_again_or_paste_the_key__06b7e3"
  | "fullApps.could_not_reconnect_github_try_again_5007ed"
  | "fullApps.could_not_save_changes_a1b18c"
  | "fullApps.could_not_unlink_this_account_445e5a"
  | "fullApps.could_not_use_this_connection_038f9e"
  | "fullApps.couldn_t_check_composio_try_again_3d95bd"
  | "fullApps.couldn_t_configure_this_app_try_again_ee7cd5"
  | "fullApps.couldn_t_remove_this_access_grant_please_try_again_6baf4b"
  | "fullApps.couldn_t_save_task_defaults_try_again_590d88"
  | "fullApps.error_78996930d378"
  | "fullApps.lookup_failed_a8a25e"
  | "fullApps.number_copied_4bf3f0"
  | "fullApps.paperclip_couldn_t_open_sign_in_use_the_sign_in_link_6dde0a"
  | "fullApps.paperclip_couldn_t_prepare_secure_sign_in_6d9096"
  | "fullApps.paperclip_couldn_t_refresh_this_sign_in_try_again_to_9cc94d"
  | "fullApps.paperclip_couldn_t_start_secure_sign_in_try_again_479282"
  | "fullApps.paste_a_full_http_or_https_link_d53b41"
  | "fullApps.paste_a_google_sheets_link_3140b1"
  | "fullApps.paste_at_least_one_google_sheets_link_8b00cd"
  | "fullApps.repository_access_refreshed_new_repositories_stay_di_1b9f71"
  | "fullApps.saved_credentials_are_retained_when_these_fields_are_759176"
  | "fullApps.select_install_in_slack_to_open_the_installation_pag_bf4e4f"
  | "fullApps.select_install_in_slack_to_reopen_the_installation_p_9a9f82"
  | "fullApps.that_doesn_t_look_like_a_google_sheets_link_42b2bd"
  | "fullApps.thisInbox"
  | "fullApps.this_server_requires_oauth_client_details_from_its_p_b794cd"
  | "fullApps.this_sign_in_expired_return_to_paperclip_and_start_t_cc39fa"
  | "fullApps.unable_to_update_slack_search_2986f9"
  | "fullApps.we_couldn_t_save_that_audience_cc1aaa";

export type AppDisplayText = string | { readonly displayKey: AppDisplayKey; readonly displayValues?: TOptions };

export function ownAppDisplayText(displayKey: AppDisplayKey, displayValues?: TOptions): AppDisplayText {
  return { displayKey, displayValues };
}

export function renderAppDisplayText(value: AppDisplayText | null): string | null {
  return typeof value === "string" || value === null ? value : t(value.displayKey, value.displayValues);
}

export class AppDisplayError extends Error {
  constructor(readonly displayKey: AppDisplayErrorKey, readonly displayValues: TOptions = {}, options?: ErrorOptions) {
    super(i18n.getFixedT("en")(displayKey, displayValues), options);
  }
}

export function appErrorDisplay(error: Error): AppDisplayText {
  return error instanceof AppDisplayError ? ownAppDisplayText(error.displayKey, error.displayValues) : error.message;
}

export function renderAppError(error: Error): string {
  return error instanceof AppDisplayError ? t(error.displayKey, error.displayValues) : error.message;
}
