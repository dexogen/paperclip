// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { setLocale } from "@/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AgentContextualSidebar } from "./AgentContextualSidebar";
import { queryKeys } from "@/lib/queryKeys";

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("./ContextualSidebarFrame", () => ({
  ContextualSidebarFrame: ({
    title,
    showHeader,
    className,
    children,
  }: {
    title: string;
    showHeader?: boolean;
    className?: string;
    children: React.ReactNode;
  }) => (
    <aside data-title={title} data-show-header={String(showHeader)} className={className}>
      {children}
    </aside>
  ),
}));

vi.mock("./SidebarNavItem", () => ({
  SidebarNavItem: ({ to, label }: { to: string; label: string }) => <a href={to}>{label}</a>,
}));

vi.mock("@/plugins/slots", () => ({ usePluginSlots: () => ({ slots: [{ pluginKey: "test.plugin", id: "insights", displayName: "Insights" }] }) }));

describe("AgentContextualSidebar", () => {
  it.each([
    { labels: undefined, en: "Secrets & variables", ru: "Секреты и переменные" },
    { labels: {}, en: "Secrets", ru: "Секреты" },
    { labels: { runtime: "Custom <runtime>" }, en: "Secrets", ru: "Секреты" },
  ])("preserves the omitted versus explicit partial labels contract ($en)", async ({ labels, en, ru }) => {
    const client = new QueryClient();
    const render = () => renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter>
      <AgentContextualSidebar agentRef="agent" agentId="id" agentName="Agent" labels={labels} />
    </MemoryRouter></QueryClientProvider>);
    try {
      await setLocale("en");
      expect(new DOMParser().parseFromString(render(), "text/html").querySelector('a[href="/agents/agent/secrets"]')?.textContent).toBe(en);
      await setLocale("ru");
      expect(new DOMParser().parseFromString(render(), "text/html").querySelector('a[href="/agents/agent/secrets"]')?.textContent).toBe(ru);
      if (labels?.runtime) expect(render()).toContain("Custom &lt;runtime&gt;");
    } finally { client.clear(); await setLocale("en"); }
  });

  it("keeps canonical navigation and raw contribution names across locale changes", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container); const client = new QueryClient();
    try {
      await act(async () => { await setLocale("en"); root.render(<QueryClientProvider client={client}><MemoryRouter>
        <AgentContextualSidebar agentRef="agent:raw" agentId="id:raw" agentName="Agent <raw>" labels={{ secrets: "Secrets <custom>" }} />
      </MemoryRouter></QueryClientProvider>); });
      const links = Array.from(container.querySelectorAll("a"));
      const hrefs = links.map(link => link.getAttribute("href"));
      links[0].focus();
      await act(async () => { await setLocale("ru"); });
      expect(container.textContent).toContain("Инструмент / среда запуска");
      expect(container.textContent).toContain("Secrets <custom>"); expect(container.textContent).toContain("Insights");
      expect(container.querySelector("nav")?.getAttribute("aria-label")).toContain("Agent <raw>");
      expect(Array.from(container.querySelectorAll("a"))).toEqual(links);
      expect(links.map(link => link.getAttribute("href"))).toEqual(hrefs);
      expect(document.activeElement).toBe(links[0]);
      await act(async () => { await setLocale("en"); });
      expect(container.textContent).toContain("Harness / Runtime");
      expect(links.map(link => link.getAttribute("href"))).toEqual(hrefs);
    } finally { await act(async () => { root.unmount(); await setLocale("en"); }); client.clear(); container.remove(); }
  });

  it.each([false, true])("keeps Channels available for default email regardless of the chat setting (%s)", (enabled) => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.instance.experimentalSettings, { enableChatConnectors: enabled });
    const markup = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter>
      <AgentContextualSidebar agentRef="agent" agentId="agent-1" agentName="Agent" />
    </MemoryRouter></QueryClientProvider>);
    expect(markup).toContain("Insights");
    expect(markup).toContain("plugin%3Atest.plugin%3Ainsights");
    expect(markup.includes('href="/agents/agent/channels"')).toBe(true);
    expect(markup).toContain('href="/agents/agent/tools"');
    client.clear();
  });
  it("renders local definition/runtime/governance links and scoped Audit links", () => {
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agents/codexcoder/runtime"]}>
          <AgentContextualSidebar agentRef="codexcoder" agentId="agent-1" agentName="Codex Coder" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Codex Coder");
    expect(markup).toContain('data-show-header="false"');
    expect(markup).toContain("border-r border-border bg-background");
    expect(markup).toContain('data-slot="contextual-sidebar-nav"');
    expect(markup).toContain('href="/agents/codexcoder/overview"');
    expect(markup).toContain('href="/agents/codexcoder/permissions"');
    expect(markup).toContain('href="/agents/codexcoder/api-keys"');
    expect(markup).toContain('href="/activity?mode=agents&amp;agentId=agent-1"');
    expect(markup).toContain('href="/activity/runs?agentId=agent-1"');
    expect(markup).toContain("Harness / Runtime");
    expect(markup).toContain("Permissions / Trust");
  });
});
