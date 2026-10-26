import { i18n } from "@/i18n";
import { afterEach, describe, expect, it } from "vitest";
import {
  aiConnectionProblem,
  aiConnectionDisplayLabel,
  aiMethodLabel,
  defaultAiConnectionName,
  bindingProblem,
  matchesAiRequirement,
  personalAiDefault,
  type AiConnectionSummary,
  type AiConnectionRequirement,
  type AiConnectionBinding,
} from "./model";

const requirement: AiConnectionRequirement = {
  companyId: "company",
  provider: "anthropic",
  method: "subscription",
};
const account: AiConnectionSummary = {
  ...requirement,
  method: "subscription",
  id: "connection",
  grantId: "grant",
  name: "Personal Claude",
  ownership: "personal",
  ownerUserId: "alice",
  status: "connected",
  isDefault: true,
};
const binding: AiConnectionBinding = {
  provider: "anthropic",
  method: "subscription",
  mode: "responsible_user",
};

afterEach(async () => { await i18n.changeLanguage("en"); });

describe("AI connection selection presentation", () => {
  it("scopes personal defaults to company, user and provider, independently of method", () => {
    for (const change of [
      { companyId: "other" },
      { provider: "openai" as const },
      { ownerUserId: "bob" },
      { ownership: "shared" as const },
    ]) {
      expect(
        personalAiDefault([{ ...account, ...change }], requirement, "alice"),
      ).toBeUndefined();
    }
    expect(personalAiDefault([account], requirement, "alice")).toBe(account);
    const apiDefault = { ...account, method: "api_key" as const };
    expect(personalAiDefault([apiDefault], requirement, "alice")).toBe(apiDefault);
    expect(bindingProblem(binding, requirement, [apiDefault], "alice", "agent")).toBeNull();
  });
  it("retains a revoked default instead of falling back to a healthy account", () => {
    const revoked = { ...account, status: "revoked" as const };
    const alternate = { ...account, id: "alternate", isDefault: false };
    expect(personalAiDefault([alternate, revoked], requirement, "alice")).toBe(
      revoked,
    );
    expect(
      bindingProblem(
        binding,
        requirement,
        [alternate, revoked],
        "alice",
        "agent",
      ),
    ).toContain("Revoked");
  });
  it("does not select another user’s account", () => {
    expect(
      bindingProblem(binding, requirement, [account], "bob", "agent"),
    ).toContain("No connection");
  });
  it("does not infer a default from the first compatible connection", () => {
    expect(
      personalAiDefault(
        [{ ...account, isDefault: false }],
        requirement,
        "alice",
      ),
    ).toBeUndefined();
  });
  it("rejects incompatible bindings without modifying the requirement", () => {
    const original = { ...requirement };
    expect(
      bindingProblem(
        { ...binding, provider: "openai" },
        requirement,
        [account],
        "alice",
        "agent",
      ),
    ).toContain("compatible");
    expect(requirement).toEqual(original);
    expect(
      matchesAiRequirement({ ...account, method: "api_key" }, requirement),
    ).toBe(false);
  });
  it("requires exact grant identity and human access for a legacy personal selection", () => {
    const delegated = {
      provider: "anthropic",
      method: "subscription",
      mode: "delegated",
      connectionId: account.id,
      grantId: account.grantId,
    } as const;
    expect(
      bindingProblem(delegated, requirement, [account], "bob", "agent"),
    ).toContain("not shared with you");
    expect(
      bindingProblem(
        delegated,
        requirement,
        [account],
        "alice",
        "agent",
      ),
    ).toBeNull();
    expect(
      bindingProblem(
        { ...delegated, grantId: "different" },
        requirement,
        [account],
        "alice",
        "agent",
      ),
    ).toContain("no longer available");
  });
  it("does not mistake a personal account for shared", () => {
    expect(
      bindingProblem(
        {
          ...binding,
          method: "subscription",
          mode: "shared",
          connectionId: account.id,
          grantId: account.grantId,
        },
        requirement,
        [account],
        "alice",
        "agent",
      ),
    ).toContain("company-shared");
  });
  it("localizes only owned binding failures on opt-in while retaining legacy mixed defaults and raw reasons", async () => {
    const fixed = { ...binding, mode: "shared", connectionId: account.id, grantId: account.grantId } as const;
    await i18n.changeLanguage("ru");
    const cases: [AiConnectionBinding, AiConnectionSummary[], string, string, string][] = [
      [{ ...binding, provider: "openai" }, [account], "alice", "Choose a connection compatible with this provider and sign-in method.", "Выберите подключение, совместимое с этим провайдером и способом входа."],
      [{ ...fixed, grantId: "other" }, [account], "alice", "This connection is no longer available for this agent. Choose another connection.", "Это подключение больше недоступно агенту. Выберите другое подключение."],
      [fixed, [account], "alice", "Choose a company-shared connection.", "Выберите общее подключение организации."],
      [{ ...fixed, mode: "delegated" }, [account], "bob", "This credential is not shared with you. Choose a connection you can use.", "У вас нет доступа к этим учётным данным. Выберите доступное вам подключение."],
    ];
    for (const [value, accounts, user, english, russian] of cases) {
      expect(bindingProblem(value, requirement, accounts, user, "agent")).toBe(english);
      expect(bindingProblem(value, requirement, accounts, user, "agent", i18n.getFixedT("ru"))).toBe(russian);
    }
    const unavailableReason = "Choose a company-shared connection.";
    expect(bindingProblem(binding, requirement, [{ ...account, unavailableReason }], "alice", "agent", i18n.getFixedT("ru"))).toBe(unavailableReason);
    const revoked = [{ ...account, status: "revoked" as const }];
    expect(bindingProblem(binding, requirement, revoked, "alice", "agent")).toBe(aiConnectionProblem(revoked[0]));
    expect(bindingProblem(binding, requirement, revoked, "alice", "agent", i18n.getFixedT("en"))).toBe(aiConnectionProblem(revoked[0]));
    expect(aiConnectionProblem(revoked[0])).not.toContain("Revoked");
    expect(defaultAiConnectionName("You", "openai", "api_key")).toBe("My OpenAI API account");
  });

  it("preserves server-projected eligibility denials", () => {
    expect(
      aiConnectionProblem({
        ...account,
        unavailableReason: "Not in the shared audience",
      }),
    ).toBe("Not in the shared audience");
  });
});

describe("default AI account names", () => {
  it("uses provider and method labels with a personal fallback", () => {
    expect(defaultAiConnectionName("dotta", "anthropic", "api_key")).toBe("dotta's Claude API account");
    expect(defaultAiConnectionName("Dotta", "openai", "subscription")).toBe("Dotta's ChatGPT subscription account");
    expect(defaultAiConnectionName("You", "openai", "api_key")).toBe("My OpenAI API account");
    expect(defaultAiConnectionName(undefined, "openrouter", "api_key")).toBe("My OpenRouter API account");
  });
});


describe("localized account display labels", () => {
  it.each([
    ["anthropic", "subscription", "Claude subscription", "Подписка Claude"],
    ["openai", "subscription", "ChatGPT subscription", "Подписка ChatGPT"],
    ["xai", "subscription", "Grok subscription", "Подписка Grok"],
    ["google", "subscription", "Subscription unavailable", "Подписка недоступна"],
    ["github", "api_key", "Personal access token", "Персональный токен доступа"],
    ["openai", "api_key", "API key", "API-ключ"],
  ] as const)("localizes %s/%s display copy without changing provider identity", async (provider, method, english, russian) => {
    await i18n.changeLanguage("en");
    expect(aiMethodLabel(provider, method)).toBe(english);
    await i18n.changeLanguage("ru");
    expect(aiMethodLabel(provider, method)).toBe(russian);
    await i18n.changeLanguage("en");
    expect(aiMethodLabel(provider, method)).toBe(english);
  });

  it("preserves account and owner labels, preferring account identity over owner fallback", async () => {
    const shared: AiConnectionSummary = {
      ...account, name: "Release Engineering", provider: "openai", method: "api_key",
      ownership: "shared", accountLabel: "builds@example.test", ownerName: "Avery",
    };
    const original = { ...shared };
    await i18n.changeLanguage("ru");
    expect(aiConnectionDisplayLabel(shared)).toBe("Release Engineering · API-ключ · Общее для организации · builds@example.test");
    expect(aiConnectionDisplayLabel({ ...shared, accountLabel: "", ownership: "personal" })).toBe("Release Engineering · API-ключ · Личное · Avery");
    expect(aiConnectionDisplayLabel({ ...shared, accountLabel: undefined, ownerName: undefined })).toBe("Release Engineering · API-ключ · Общее для организации");
    expect(shared).toEqual(original);
    expect(defaultAiConnectionName("Dotta", "openai", "subscription")).toBe("Dotta's ChatGPT subscription account");
    await i18n.changeLanguage("en");
    expect(aiConnectionDisplayLabel(shared)).toBe("Release Engineering · API key · Company shared · builds@example.test");
  });
});
