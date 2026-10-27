import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "../../../i18n/locales/en.json";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function displayCopy(sourceText: string): string {
  const messages = [...sourceText.matchAll(/["']([A-Za-z][\w-]*(?:\.[\w-]+)+)["']/g)]
    .map((match) => match[1]!.split(".").reduce<unknown>((value, key) =>
      value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, en))
    .filter((value): value is string => typeof value === "string");
  return [sourceText, ...messages].join("\n").replace(/\s+/g, " ");
}

describe("chat connector UI contract", () => {
  it("describes the close command as a conversation control rather than a task status change", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expect(displayCopy(setup)).toContain("Close the active chat conversation");
    expect(displayCopy(setup)).not.toContain("Close the active Paperclip task");
  });

  it("retries the selected failed run from every Board entry point", () => {
    for (const file of [
      "AgentDetail.tsx",
      "AgentDetail.production.tsx",
      "Inbox.tsx",
      "LegacyInbox.tsx",
    ]) {
      const page = source(`../../${file}`);
      expect(page).toMatch(
        /agentsApi\.retryFailedRun\(\s*run\.agentId,\s*run\.id,\s*run\.companyId,?\s*\)/,
      );
      expect(page).not.toContain('reason: "retry_failed_run"');
      expect(page).toContain("newRun.runId");
      expect(page).toContain("newRun.issueId");
    }
    const issue = source("../../IssueDetail.tsx");
    expect(issue).toMatch(
      /agentsApi\.retryFailedRun\(\s*failedRun\.agentId,\s*failedRun\.runId,\s*companyId/,
    );
    expect(issue).toContain('title: t("taskDetail.copy.retryQueued")');
    expect(en.taskDetail.copy.retryQueued).toBe("Retry queued");
    for (const file of ["Inbox.tsx", "LegacyInbox.tsx"]) {
      const page = source(`../../${file}`);
      expect(page).toMatch(
        /const retryRunMutation = useMutation\(\{[\s\S]*?onError: \(error\) => \{\s*pushToast\(\{\s*title: t\("inboxUi\.run\.retryFailed"\)/,
      );
    }
    expect(en.inboxUi.run.retryFailed).toBe("Run retry failed");
  });
  it("keeps the exact dual-purpose choice and immutable searchable agent selection", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expect(displayCopy(setup)).toContain("Chat with an agent");
    expect(displayCopy(setup)).toContain("Use this connection as an agent tool");
    expect(setup).toContain("<AgentSelect");
    expect(displayCopy(setup)).not.toContain("Change agent");
  });

  it("provides every settled detail tab and no detach control", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    for (const tab of ["settings", "access", "conversations", "activity"]) {
      expect(detail).toContain(`"${tab}"`);
    }
    expect(detail).not.toContain('"overview"');
    expect(detail.toLowerCase()).not.toContain("detach");
  });

  it("shows independent Slack callback surfaces and public URL drift", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    expect(displayCopy(detail)).toContain("Slack callback health");
    expect(displayCopy(detail)).toContain("Events API");
    expect(displayCopy(detail)).toContain("Interactivity");
    expect(displayCopy(detail)).toContain("Slash command");
    expect(detail).toContain("callbacksNeedUpdate");
    expect(displayCopy(detail)).toContain("Slack callback URLs need an update");
    expect(displayCopy(detail)).toContain("Not observed");
  });

  it("keeps provider capabilities automatic and settings focused on plausible reach", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    const setup = source("./ChatEndpointSetup.tsx");
    expect(displayCopy(detail)).toContain("Allow direct messages");
    expect(displayCopy(detail)).toContain("Allow group chats");
    expect(displayCopy(detail)).toContain("People without linked accounts can start isolated tasks");
    expect(displayCopy(detail)).toContain("Requests are refused when isolation is unavailable");
    expect(displayCopy(setup)).toContain("Link the account you’re testing");
    expect(displayCopy(setup)).toContain("Paperclip does not replay the refused request");
    expect(displayCopy(setup)).toContain("Review identity access");
    expect(setup).toContain("instanceSettingsApi.getExperimental()");
    expect(setup).toContain("chatEndpointsApi.listPrincipals(endpointId)");
    expect(setup).toContain("queryKeys.chatEndpoints.detail(next.id)");
    expect(setup).toContain('target="_blank" rel="noopener noreferrer"');
    expect(displayCopy(detail)).not.toContain("Enable streaming");
    expect(displayCopy(detail)).not.toContain("Delivery transport");
  });

  it("explains Discord's independent per-server direct-message restriction", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    expect(detail).toContain('endpoint.provider === "discord"');
    expect(displayCopy(detail)).toContain("People must also enable Direct Messages in their shared Discord server’s Privacy Settings.");
  });

  it("offers only real connection lifecycle actions", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    const settings = detail.slice(
      detail.indexOf("function Settings"),
      detail.indexOf("function SettingToggle"),
    );
    const activity = detail.slice(detail.indexOf("function Activity"));
    expect(detail).toContain('"pause" | "resume" | "remove"');
    expect(displayCopy(detail)).toContain("Remove this connection?");
    expect(detail).toContain("purpose=chat&resume=${endpoint.id}");
    expect(detail).toContain('? "" : "&reconnect=1"');
    expect(displayCopy(detail)).toContain("Finish setup");
    expect(displayCopy(detail)).toContain("Continue setup");
    expect(detail).toContain('endpoint.setup?.step !== "complete"');
    expect(displayCopy(detail)).toContain("Reconnect");
    expect(displayCopy(detail)).not.toContain("Change agent");
    for (const label of ["Pause", "Resume", "Reconnect", "Remove connection"]) {
      expect(displayCopy(activity)).toContain(label);
      // Guidance may name an action that lives on Activity; only controls
      // must stay out of the Settings surface.
      const settingsButtons = settings.match(/<Button\b[\s\S]*?<\/Button>/g) ?? [];
      expect(displayCopy(settingsButtons.join("\n"))).not.toContain(label);
    }
  });

  it("states the provider boundary for reconnect and removal", () => {
    const detail = source("./ChatEndpointDetail.tsx");
    const setup = source("./ChatEndpointSetup.tsx");
    for (const reconnectCopy of [
      "does not reinstall the app or change its workspace or channel membership",
      "does not reinstall the App or change repository access",
      "does not add or remove the bot from the server",
      "does not upload or reinstall the Teams app",
      "automatically refreshes its Paperclip webhook and command menu",
    ]) {
      expect(displayCopy(detail)).toContain(reconnectCopy);
      expect(displayCopy(setup)).toContain(reconnectCopy);
    }
    for (const removalCopy of [
      "It does not uninstall the Slack app",
      "It does not uninstall the GitHub App",
      "It does not uninstall the bot",
      "It does not uninstall the Teams app",
      "queues durable removal of its Telegram webhook and command menu",
      "After Telegram confirms that cleanup, Paperclip retires the saved token",
      "BotFather bot and its chat memberships remain",
    ]) {
      expect(displayCopy(detail)).toContain(removalCopy);
    }
  });

  it("uses only executable provider credential flows", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    for (const credential of [
      "botToken",
      "appId",
      "applicationId",
      "guildId",
      "clientId",
      "tenantId",
      "clientSecret",
    ]) {
      expect(setup).toContain(`\"${credential}\"`);
    }
    expect(setup).toContain("credentials.privateKey");
    expect(setup).toContain("credentials.signingSecret");
    expect(displayCopy(setup)).toContain("Create Slack app");
    expect(displayCopy(setup)).toContain("Create or connect a GitHub App");
    expect(displayCopy(setup)).toContain("create a single-tenant app registration");
    expect(displayCopy(setup)).toContain("Create a bot with BotFather");
    expect(displayCopy(setup)).toContain("Create one dedicated Discord application");
    expect(displayCopy(setup)).toContain("enable Message Content Intent");
    expect(displayCopy(setup)).toMatch(/Create\s+Public Threads/);
    expect(setup).toContain("permissions=309237763136&scope=bot");
    expect(setup).not.toContain("applications.commands");
    expect(displayCopy(setup)).toContain("Generate webhook secret");
    expect(displayCopy(setup)).toContain("will not show it again");
    expect(setup).toContain('params.get("reconnect") === "1"');
    expect(displayCopy(setup)).toContain("Leave the token blank to reuse the saved credential");
    expect(displayCopy(setup)).toContain("Leave credentials blank to reuse the saved values");
    expect(displayCopy(setup)).toContain("immediately invalidates GitHub webhook signatures");
    expect(setup).toContain("generatingSetupSecret ||\n            pending");
    expect(setup).not.toContain("/setprivacy");
    expect(setup).toContain("/task@bot_username");
    expect(displayCopy(setup)).toContain("registers its command menu automatically");
    expect(displayCopy(setup)).toContain("ordinary mentions are not delivered to bots");
    expect(displayCopy(setup)).toContain("Create Azure Bot");
    expect(displayCopy(setup)).toContain("Microsoft 365 work or school organization");
    expect(displayCopy(setup)).toContain("teams.live.com");
    expect(displayCopy(setup)).toContain("commercial cloud tenants only");
    expect(displayCopy(setup)).toContain("GCC High");
    expect(displayCopy(setup)).toContain("operated by 21Vianet");
    expect(displayCopy(setup)).toContain("Client secret value");
    expect(displayCopy(setup)).toContain("Microsoft portal field map");
    expect(displayCopy(setup)).toContain("Accounts in this organizational directory only (Single tenant)");
    expect(displayCopy(setup)).toContain("Use existing app registration");
    expect(displayCopy(setup)).toContain("Settings · Configuration");
    expect(displayCopy(setup)).toContain("Configure · App features · Bot");
    expect(displayCopy(setup)).toContain("Configure · Permissions");
    expect(displayCopy(setup)).toContain("Upload an app · Upload a custom app");
    expect(displayCopy(setup)).toContain("Copy manifest settings");
    expect(setup).toContain("disabled={!credentials.clientId?.trim()}");
    expect(displayCopy(setup)).toContain("Enter the Application / Client ID above before copying");
    expect(displayCopy(setup)).toContain("not a complete app package");
    expect(setup).toContain('scopes: ["personal", "team", "groupChat"]');
    expect(setup).toContain('scopes: ["personal", "groupChat"]');
    expect(setup).toContain('title: "/status"');
    expect(setup).toContain('title: "/new"');
    expect(setup).toContain('title: "/close"');
    expect(setup).not.toContain("supportsTargetedMessages");
    expect(setup).toContain("resourceSpecific");
    expect(setup).toContain("ChannelMessage.Read.Group");
    expect(setup).toContain("ChatMessage.Read.Chat");
    expect(displayCopy(setup)).toContain("not Microsoft Graph permissions in Entra");
    expect(displayCopy(setup)).toContain("does not use Teams single sign-on");
    expect(setup).toContain("webApplicationInfo");
    expect(setup).toContain('resource: "https://paperclip.ing"');
    expect(displayCopy(setup)).toContain("only associates the RSC");
    expect(displayCopy(setup)).toContain("you do not need to register an Entra");
    expect(displayCopy(setup)).toContain("receive every message");
    expect(displayCopy(setup)).toContain("One team install covers its standard");
    expect(displayCopy(setup)).toContain("Private and shared channels require");
    expect(setup).not.toContain(
      "does not require a <code>webApplicationInfo</code>",
    );
    expect(setup).not.toContain("api://paperclip-chat/");
    expect(displayCopy(setup)).toContain("not private channels");
    expect(displayCopy(setup)).toContain("native file receipt and consent-based sending");
    expect(setup).toContain("issue_comment");
    expect(setup).toContain("pull_request");
    expect(setup).toContain("pull_request_review_comment");
    expect(displayCopy(setup)).toContain("Enable SSL verification");
    expect(displayCopy(setup)).toContain("Only on this account");
    expect(setup).toContain('type="password"');
    expect(setup).not.toContain("WebkitTextSecurity");
    expect(displayCopy(setup)).toContain("Verify Slack connection");
    expect(setup).toContain("buildSlackAppManifest");
    expect(setup).toContain("defaultSlackAppConfiguration");
    expect(displayCopy(setup)).not.toContain("No credentials");
    expect(displayCopy(setup)).not.toContain("managed Microsoft app");
    expect(setup).toContain("slackSetupState({ endpoint, repairing");
    expect(source("./slack/setup-state.ts")).toContain("endpoint.providerAccountId && !repairing");
    expect(setup).not.toContain('field("webhookSecret"');
    expect(setup).not.toContain("@paperclipai/teams-connect");
    expect(displayCopy(setup)).not.toContain("Copy setup command");
    expect(displayCopy(setup)).not.toContain("Add {agentName} to Slack");
    expect(displayCopy(setup)).not.toContain("Create in GitHub");
  });

  it("keeps provider setup failures visible without rendering submitted credentials", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expect(setup).toContain("sanitizedSetupErrorMessage");
    expect(setup).toContain('role="alert"');
    expect(setup).toContain("onMutate: () => setSetupError(null)");
    expect(setup).not.toContain('title: "Connection failed"');
  });

  it("keeps GitHub setup on the shipped customer-owned App path", () => {
    const setup = source("./ChatEndpointSetup.tsx");
    expect(displayCopy(setup)).toContain("Generate webhook secret");
    expect(displayCopy(setup)).toContain("GitHub App ID");
    expect(displayCopy(setup)).toContain("Private key (PEM)");
    expect(displayCopy(setup)).toContain("Choose .pem file");
    expect(displayCopy(setup)).toContain("Choose GitHub App private key file");
    expect(setup).toContain("readGitHubPrivateKeyFile");
    expect(setup).toContain("privateKeyReadGuard.invalidate()");
    expect(setup).toContain("privateKeyFileLoading ||");
    expect(displayCopy(setup)).toContain("Show private key");
    expect(setup).toContain('type="password"');
    expect(setup).toContain('event.clipboardData.getData("text")');
    expect(setup).not.toContain("WebkitTextSecurity");
  });
});
