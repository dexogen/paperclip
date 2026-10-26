import { describe, expect, it } from "vitest";
import { credentialAccessNotice } from "./credential-access-notice";
import type { IssueChatLinkedRun } from "./issue-chat-messages";

const run: IssueChatLinkedRun = { runId: "denied", agentId: "codie", agentName: "Codie", status: "failed",
  createdAt: "2026-10-09T20:00:00Z", startedAt: null, responsibleUserId: "nicky",
  resultJson: { configurationIncomplete: { selectionFailure: "ai_connection_credential_not_shared",
    credentialAccess: { connectionName: "Dotta’s API Key" } } },
};
describe("credential access notice", () => {
  it("names the selected credential and addresses only the denied person as you", () => {
    expect(credentialAccessNotice(run, "nicky")).toMatchObject({ agentName: "Codie", credentialName: "Dotta’s API Key", deniedUser: "you" });
    expect(credentialAccessNotice(run, "dotta", new Map([["nicky", "Nicky"]]))?.deniedUser).toBe("Nicky");
    expect(credentialAccessNotice(run, undefined)?.deniedUser).toBe("the person this task runs for");
  });
  it("recognizes the fixed historical denial without guessing credential identity", () => {
    expect(credentialAccessNotice({ ...run, resultJson: null, error: "This credential is not shared with the responsible user" }, "nicky"))
      .toMatchObject({ deniedUser: "you", credentialName: undefined });
    expect(credentialAccessNotice({ ...run, error: "This credential is not shared with the responsible user",
      resultJson: { configurationIncomplete: { credentialAccess: { connectionName: "Dotta’s API Key" } } } }, "nicky"))
      .toMatchObject({ deniedUser: "you", credentialName: "Dotta’s API Key" });
  });
  it("does not relabel unrelated configuration failures or successful attempts", () => {
    expect(credentialAccessNotice({ ...run, status: "succeeded" }, "nicky")).toBeUndefined();
    expect(credentialAccessNotice({ ...run, resultJson: { configurationIncomplete: { selectionFailure: "ai_connection_unavailable" } } }, "nicky")).toBeUndefined();
    expect(credentialAccessNotice({ ...run, resultJson: null, error: "Provider returned a credential problem" }, "nicky")).toBeUndefined();
  });
  it("keeps a named you distinct from the current viewer and absent directory data", () => {
    expect(credentialAccessNotice({ ...run, agentName: "This agent" }, "another-user", new Map([["nicky", "you"]])))
      .toMatchObject({ agentName: "This agent", agentKind: "named", deniedUser: "you", deniedUserKind: "named" });
    expect(credentialAccessNotice(run, "nicky", new Map([["nicky", "you"]])))
      .toMatchObject({ deniedUser: "you", deniedUserKind: "viewer" });
    expect(credentialAccessNotice({ ...run, agentName: "" }, null))
      .toMatchObject({ agentName: "This agent", agentKind: "fallback", deniedUserKind: "unknown" });
  });
});
