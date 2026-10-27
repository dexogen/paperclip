import { slackRegistrationErrorMessage } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { AppDisplayError, appErrorDisplay, renderAppDisplayText } from "@/pages/apps/app-display-text";
import { afterEach, describe, expect, it } from "vitest";
import {
  chatSetupErrorFallback,
  sanitizedSetupErrorMessage,
  sanitizedSetupErrorDisplay,
  slackSetupErrorDisplay,
} from "./chat-setup-error";

describe("sanitizedSetupErrorMessage", () => {
  it("redacts raw, JSON-escaped, and URI-encoded submitted credentials", () => {
    const secret = 'token / "line\nnext"';
    const jsonEscapedSecret = JSON.stringify(secret).slice(1, -1);
    const uriEncodedSecret = encodeURIComponent(secret);

    expect(
      sanitizedSetupErrorMessage(
        new Error(
          `Provider rejected ${secret}; payload=${jsonEscapedSecret}; query=${uriEncodedSecret}`,
        ),
        { botToken: secret },
      ),
    ).toBe(
      "Provider rejected [redacted]; payload=[redacted]; query=[redacted]",
    );
  });

  it("uses actionable fallback copy when no error message is available", () => {
    expect(sanitizedSetupErrorMessage(undefined, undefined)).toBe(
      chatSetupErrorFallback,
    );
    expect(sanitizedSetupErrorMessage(new Error("   "), {})).toBe(
      chatSetupErrorFallback,
    );
  });

  it("redacts malformed UTF-16 credentials without throwing", () => {
    const malformedSecret = "\ud800";
    const escapedSecret = JSON.stringify(malformedSecret).slice(1, -1);

    expect(
      sanitizedSetupErrorMessage(
        new Error(`Provider rejected ${malformedSecret} (${escapedSecret})`),
        { botToken: malformedSecret },
      ),
    ).toBe("Provider rejected [redacted] ([redacted])");
  });
});


describe("owned connection error presentation", () => {
  afterEach(async () => { await i18n.changeLanguage("en"); });

  it("keeps English diagnostics and provider text while translating saved owned errors late", async () => {
    const cause = new AppDisplayError("fullApps.check_link_d388c7");
    const saved = appErrorDisplay(cause);
    const provider = sanitizedSetupErrorDisplay(new Error("Provider <literal> rejected private-value"), { key: "private-value" });
    const fallback = sanitizedSetupErrorDisplay(null, {});
    expect(cause.message).toBe("Check link");
    await i18n.changeLanguage("ru");
    expect(renderAppDisplayText(saved)).toBe("Проверить ссылку");
    expect(renderAppDisplayText(provider)).toBe("Provider <literal> rejected [redacted]");
    expect(renderAppDisplayText(fallback)).toBe("Проверьте обязательные значения и доступ к провайдеру, затем повторите попытку.");
    await i18n.changeLanguage("en");
    expect(renderAppDisplayText(saved)).toBe("Check link");
    expect(cause.message).toBe("Check link");
  });
});

it("preserves owned Slack diagnostic English and localizes known code display", async () => {
  try {
    await i18n.changeLanguage("en");
    for (const code of ["slack_managed_unavailable", "slack_manager_reauthorize", "slack_approval_pending", "slack_approval_required", "slack_approval_denied", "slack_configuration_token_invalid", "slack_manifest_invalid", "slack_manifest_update_pending", "slack_setup_rate_limited", "slack_setup_permission_denied", "slack_creation_uncertain", "slack_install_declined", "slack_install_expired", "slack_install_failed", "slack_install_identity_mismatch", "slack_install_scopes_missing", "slack_bot_already_connected", "slack_install_token_invalid", "slack_configuration_incomplete", "slack_install_account_missing", "slack_install_account_conflict"]) {
      expect(slackSetupErrorDisplay(code)).toBe(slackRegistrationErrorMessage(code));
    }
    await i18n.changeLanguage("ru");
    expect(slackSetupErrorDisplay("slack_manager_reauthorize")).toBe("Подключите рабочее пространство Slack повторно, чтобы продолжить настройку агента.");
    expect(slackSetupErrorDisplay("__proto__")).toBe("Не удалось завершить настройку Slack. Продолжите настройку и повторите попытку.");
  } finally {
    await i18n.changeLanguage("en");
  }
});
