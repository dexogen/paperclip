// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { AccessStepContent, connectionDefaultSummarySentence } from "@/features/connections/ConnectionSetupFlow";
import { AiProviderSetup } from "./AiProviderSetup";
import { aiConnectionsApi } from "@/api/ai-connections";
import { TooltipProvider } from "@/components/ui/tooltip";
import { aiProviderSetupPreset } from "@paperclipai/shared";
import type { AiConnectionCredentialStep } from "./AiConnectionCredentialStep";

let credentialProps: ComponentProps<typeof AiConnectionCredentialStep> | undefined;
vi.mock("@/api/ai-connections", () => ({ aiConnectionsApi: { create: vi.fn(async () => ({ connectionId: "connection", grantId: "grant" })), list: vi.fn(async () => ({ currentUserId: "owner", connections: [], canManageConnections: true })) } }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: vi.fn(async () => []) } }));
vi.mock("./AiConnectionCredentialStep", () => ({ AiConnectionCredentialStep: (props: ComponentProps<typeof AiConnectionCredentialStep>) => { credentialProps = props; return <div>Existing credential flow</div>; } }));

it("reconnects an older OpenRouter account without adding routing metadata", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  const root = createRoot(container);
  const onComplete = vi.fn();
  const account = { id: "connection", grantId: "grant", companyId: "company", provider: "openrouter", method: "api_key", name: "Existing OpenRouter", ownership: "personal", ownerUserId: "owner", isDefault: true, status: "needs_attention" } as const;
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><AiProviderSetup companyId="company" reconnect={account} onCancel={() => {}} onComplete={onComplete} /></QueryClientProvider>));
    expect(container.textContent).toContain("Existing credential flow");
    expect(credentialProps).toMatchObject({ connectionId: account.id, provider: "openrouter", initialMethod: "api_key", fixedMethod: true });
    credentialProps!.onComplete({ connectionId: account.id, grantId: account.grantId, method: "api_key" });
    expect(onComplete).toHaveBeenCalledWith({ provider: "openrouter", method: "api_key", mode: "delegated", connectionId: account.id, grantId: account.grantId });
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});

const providerSources = ["openrouter", "bedrock", "responses-api", "messages-api", "chat-completions-api", "local"];
it("shows advanced providers directly when entered from advanced connection mode", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: true, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], []);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><AiProviderSetup companyId="company" advancedOnly onCancel={() => {}} onComplete={() => {}} /></QueryClientProvider>));
    const choices = Array.from(container.querySelectorAll("button[aria-label]")).map(button => button.getAttribute("aria-label"));
    expect(choices).toEqual(["OpenRouter", "Amazon Bedrock", "Custom gateway", "Local endpoint"]);
    expect(container.querySelector("details")).toBeNull();
  } finally {
    await act(async () => root.unmount()); client.clear();
  }
});

it.each(providerSources)("opens %s directly with shared access folded under Advanced", async source => {
  const preset = aiProviderSetupPreset(source)!;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: true, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], [{ id: "agent", name: "Nova" }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onCancel = vi.fn();
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><TooltipProvider><AiProviderSetup companyId="company" initialProvider={preset.provider} initialProtocol={preset.protocol} providerLabel={preset.label} onCancel={onCancel} onComplete={() => {}} /></TooltipProvider></QueryClientProvider>));
    expect(container.textContent).not.toContain("Connect a model provider");
    expect(container.textContent).toContain("Connects for everyone in your organization, available to all agents.");
    expect(container.querySelector('[role="radio"]')).toBeNull();
    const change = Array.from(container.querySelectorAll('button')).find(b => b.textContent === "Change")!;
    expect(change.getAttribute("aria-expanded")).toBe("false");
    await act(async () => change.click());
    const radio = (text: string) => Array.from(container.querySelectorAll('[role="radio"]')).find(b => b.textContent?.includes(text)) as HTMLButtonElement;
    expect(radio("Any human in the organization").getAttribute("aria-checked")).toBe("true");
    expect(radio("Any agent").getAttribute("aria-checked")).toBe("true");
    await act(async () => radio("Just me").click());
    expect(container.textContent).toContain("Connects as you, available to all agents.");
    await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === "Back")!.click());
    expect(onCancel).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount()); container.remove(); client.clear();
  }
});

it("saves the default organization grant and all-agent installation from the direct connect screen", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: true, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], []);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><AiProviderSetup companyId="company" initialProvider="openrouter" onCancel={() => {}} onComplete={() => {}} /></QueryClientProvider>));
    const input = container.querySelector('input[aria-label="API key"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "fixture-key");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(aiConnectionsApi.create).toHaveBeenCalledWith("company", expect.objectContaining({ ownership: "shared", allAgents: true, agentIds: [], apiKey: "fixture-key", routing: expect.objectContaining({ kind: "openrouter" }) }));
  } finally {
    await act(async () => root.unmount()); client.clear();
  }
});


it("allows an ordinary member to save a personal gateway before the agent exists", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: false, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], []);
  const container = document.createElement("div");
  const root = createRoot(container);
  const onComplete = vi.fn();
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><AiProviderSetup companyId="company" initialProvider="openrouter" onCancel={() => {}} onComplete={onComplete} /></QueryClientProvider>));
    const input = container.querySelector('input[aria-label="API key"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "member-key");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const connect = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(connect.disabled).toBe(false);
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(aiConnectionsApi.create).toHaveBeenCalledWith("company", expect.objectContaining({ ownership: "personal", allAgents: false, agentIds: [], apiKey: "member-key" }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ mode: "delegated", connectionId: "connection", grantId: "grant" }));
  } finally {
    await act(async () => root.unmount()); client.clear();
  }
});


it.each(["google", "openai", "anthropic", "xai"] as const)("allows an ordinary member to connect a personal %s account before an agent exists", async provider => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: false, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], []);
  const container = document.createElement("div");
  const root = createRoot(container);
  credentialProps = undefined;
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><AiProviderSetup companyId="company" initialProvider={provider} onCancel={() => {}} onComplete={() => {}} /></QueryClientProvider>));
    expect(credentialProps).toMatchObject({ provider, ownership: "personal", allAgents: false, agentIds: [], disabled: false });
  } finally {
    await act(async () => root.unmount()); client.clear();
  }
});


it("preserves gateway drafts and access choices across English and Russian without saving until submit", async () => {
  await i18n.changeLanguage("en");
  vi.mocked(aiConnectionsApi.create).mockClear();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["ai-connections", "company", undefined], { canManageConnections: true, connections: [] });
  client.setQueryData(["agents", "company", "provider-access"], []);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<QueryClientProvider client={client}><TooltipProvider><AiProviderSetup companyId="company" initialProvider="gateway" onCancel={() => {}} onComplete={() => {}} /></TooltipProvider></QueryClientProvider>));
    const button = (text: string) => Array.from(container.querySelectorAll("button")).find(item => item.textContent === text)!;
    await act(async () => button("Change").click());
    await act(async () => (Array.from(container.querySelectorAll('[role="radio"]')).find(item => item.textContent?.includes("Just me")) as HTMLButtonElement).click());
    const url = container.querySelector('input[aria-label="Provider URL"]') as HTMLInputElement;
    const key = container.querySelector('input[aria-label="API key"]') as HTMLInputElement;
    const models = container.querySelector('input[aria-label="Model IDs"]') as HTMLInputElement;
    await act(async () => {
      for (const [input, value] of [[url, "https://gateway.example.test/v1"], [key, "draft-key-not-sent"], [models, "model/custom, alias-fast"]] as const) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Подключить: Собственный шлюз");
    expect(container.textContent).toContain("Подключение от вашего имени, доступно всем агентам.");
    expect(container.querySelector('input[aria-label="URL провайдера"]')).toBe(url);
    expect(container.querySelector('input[aria-label="API-ключ"]')).toBe(key);
    expect(url.value).toBe("https://gateway.example.test/v1");
    expect(key.value).toBe("draft-key-not-sent");
    expect(models.value).toBe("model/custom, alias-fast");
    expect((Array.from(container.querySelectorAll('[role="radio"]')).find(item => item.textContent?.includes("Только я")) as HTMLButtonElement).getAttribute("aria-checked")).toBe("true");
    expect(aiConnectionsApi.create).not.toHaveBeenCalled();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.querySelector('input[aria-label="API key"]')).toBe(key);
    expect(container.textContent).toContain("Connects as you, available to all agents.");
    await act(async () => { await i18n.changeLanguage("ru"); });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(aiConnectionsApi.create).toHaveBeenCalledExactlyOnceWith("company", expect.objectContaining({
      name: "My gateway.example.test", provider: "openai", method: "api_key", ownership: "personal", allAgents: true, agentIds: [], apiKey: "draft-key-not-sent",
      routing: { kind: "gateway", protocol: "responses", auth: "bearer", baseUrl: "https://gateway.example.test/v1", models: [{ id: "model/custom" }, { id: "alias-fast" }] },
    }));
  } finally {
    await act(async () => root.unmount());
    container.remove(); client.clear(); await i18n.changeLanguage("en");
  }
});

it("describes selected agent access using Russian plural forms and preserves English scope", async () => {
  const scope = { grantKind: "user", authKind: "api_key", installChoice: "specific" } as const;
  try {
    await i18n.changeLanguage("ru");
    expect(connectionDefaultSummarySentence({ ...scope, installCount: 0 })).toBe("Подключение от вашего имени, агенты пока не выбраны.");
    for (const [count, ending] of [[1, "выбранному агенту"], [2, "выбранным агентам"], [5, "выбранным агентам"], [11, "выбранным агентам"], [21, "выбранному агенту"], [22, "выбранным агентам"], [25, "выбранным агентам"], [1.5, "выбранного агента"]] as const) {
      expect(connectionDefaultSummarySentence({ ...scope, installCount: count })).toBe(`Подключение от вашего имени, доступно ${count} ${ending}.`);
    }
    expect(connectionDefaultSummarySentence({ ...scope, installCount: 2, preserveAgentAccess: true })).toBe("Подключение от вашего имени, доступ агентов остаётся прежним.");
    await i18n.changeLanguage("en");
    expect(connectionDefaultSummarySentence({ ...scope, installCount: 1 })).toBe("Connects as you, available to 1 selected agent.");
    expect(connectionDefaultSummarySentence({ ...scope, installCount: 2 })).toBe("Connects as you, available to 2 selected agents.");
  } finally { await i18n.changeLanguage("en"); }
});


it("keeps a locked agent name literal across languages without changing granted access", async () => {
  const name = 'Agent <strong>literal</strong> & "<agent>"';
  const ids = new Set(["locked-agent"]);
  const setGrantKind = vi.fn(), setInstallChoice = vi.fn(), setInstallAgentIds = vi.fn(), onContinue = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<TooltipProvider><AccessStepContent agents={[{ id: "locked-agent", name }]} lockedAgentId="locked-agent" authKind="api_key" grantKind="user" grantKinds={["user"]} setGrantKind={setGrantKind} installChoice="specific" setInstallChoice={setInstallChoice} installAgentIds={ids} setInstallAgentIds={setInstallAgentIds} submitLabel="Continue" onBack={() => {}} onContinue={onContinue} /></TooltipProvider>));
    for (const language of ["ru", "en", "ru"] as const) {
      await act(async () => { await i18n.changeLanguage(language); });
      const agent = container.querySelector("span.font-medium.text-foreground")!;
      expect(agent.textContent).toBe(name);
      expect(agent.childElementCount).toBe(0);
      expect(container.textContent).toContain(language === "ru" ? "Текущий доступ к подключению остаётся без изменений." : "Existing connection access is left unchanged.");
      expect(setGrantKind).not.toHaveBeenCalled();
      expect(setInstallChoice).not.toHaveBeenCalled();
      expect(setInstallAgentIds).not.toHaveBeenCalled();
      expect(onContinue).not.toHaveBeenCalled();
      expect([...ids]).toEqual(["locked-agent"]);
    }
    await act(async () => Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Continue")!.click());
    expect(onContinue).toHaveBeenCalledTimes(1);
  } finally { await act(async () => root.unmount()); await i18n.changeLanguage("en"); }
});
