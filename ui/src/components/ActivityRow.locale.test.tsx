// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ActivityEvent, Agent } from "@paperclipai/shared";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { ActivityRow } from "./ActivityRow";
import { ActivityList } from "./ActivityList";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, disableIssueQuicklook: _disable, ...props }: { to: string; children: ReactNode; disableIssueQuicklook?: boolean }) => <a href={to} {...props}>{children}</a>,
}));

let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  await i18n.changeLanguage("en");
  vi.restoreAllMocks();
});

it("keeps both activity layouts, reference links and focus through live locale changes", async () => {
  await i18n.changeLanguage("en");
  vi.spyOn(Date, "now").mockReturnValue(new Date("2026-10-26T12:00:00Z").getTime());
  const events: ActivityEvent[] = [
    { id: "event-one", companyId: "company-one", actorType: "user", actorId: "named-user", action: "issue.updated", entityType: "issue", entityId: "issue-one", agentId: null, runId: null, createdAt: new Date("2026-10-26T11:58:00Z"), details: { status: "in_review", externalConversationState: "waiting", _previous: { status: "in_progress" }, addedReferencedIssues: [{ id: "ref-added", identifier: "TASK-2", title: "<strong>raw & added</strong>" }], removedReferencedIssues: [{ id: "ref-removed", identifier: "TASK-3", title: "Removed references" }] } },
    { id: "event-two", companyId: "company-one", actorType: "system", actorId: "system", action: "issue.read_marked", entityType: "issue", entityId: "issue-two", agentId: null, runId: null, createdAt: new Date("2026-10-26T11:58:00Z"), details: null },
    { id: "event-three", companyId: "company-one", actorType: "agent", actorId: "named-agent", action: "future.action_name", entityType: "heartbeat_run", entityId: "run-id", agentId: "named-agent", runId: "run-id", createdAt: new Date("2026-10-26T11:58:00Z"), details: { agentId: "named-agent" } },
  ];
  const before = JSON.stringify(events);
  const directories = {
    agentMap: new Map([["named-agent", { id: "named-agent", name: "System" } as Agent]]),
    userProfileMap: new Map([["named-user", { label: "Board <b>raw & user</b>", image: null }]]),
    entityNameMap: new Map([["issue:issue-one", "TASK-1"], ["agent:named-agent", "System"]]),
    entityTitleMap: new Map([["issue:issue-one", "Task <em>literal</em>"]]),
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<>
    <section data-testid="default">{events.map(event => <ActivityRow key={event.id} event={event} {...directories} />)}</section>
    <section data-testid="refreshed"><ActivityList events={events} {...directories} /></section>
    <ActivityList label="Recent activity" events={[]} {...directories} />
  </>));
  const refreshed = host.querySelector('[data-testid="refreshed"]')!;
  const rows = [...refreshed.querySelectorAll('[data-slot="activity-row"]')];
  const reference = refreshed.querySelector<HTMLAnchorElement>('a[href="/issues/TASK-2"]')!;
  const removed = refreshed.querySelector('a[href="/issues/TASK-3"]');
  const links = [...host.querySelectorAll("a")];
  const hrefs = links.map(link => link.getAttribute("href"));
  expect(hrefs).toContain("/agents/named-agent/runs/run-id");
  expect(host.textContent).toContain("changed status from in progress to idle on");
  await act(async () => reference.focus());
  await act(async () => { await i18n.changeLanguage("ru"); });
  expect(refreshed.querySelector("ul")?.getAttribute("aria-label")).toBe("Последние действия");
  expect(host.querySelector('ul[aria-label="Recent activity"]')).not.toBeNull();
  for (const section of host.querySelectorAll("section")) {
    expect(section.textContent).toContain("изменил статус с «В работе» на «Ожидает» у");
    expect(section.textContent).toContain("Board <b>raw & user</b>");
    expect(section.textContent).toContain("Task <em>literal</em>");
    expect(section.textContent).toContain("Системный процесс прочитал");
    expect(section.textContent).toContain("future action name");
    expect(section.textContent).toContain("2 мин назад");
    expect(section.querySelector('[aria-label="Добавленные ссылки"]')).not.toBeNull();
    expect(section.querySelector('[aria-label="Удалённые ссылки"]')).not.toBeNull();
  }
  expect(host.querySelector("b, em, strong")).toBeNull();
  expect(reference.title).toBe("<strong>raw & added</strong>");
  expect(removed?.className).toContain("line-through");
  expect([...refreshed.querySelectorAll('[data-slot="activity-row"]')]).toEqual(rows);
  expect([...host.querySelectorAll("a")]).toEqual(links);
  expect(document.activeElement).toBe(reference);
  await act(async () => { await i18n.changeLanguage("en"); });
  expect(refreshed.querySelector("ul")?.getAttribute("aria-label")).toBe("Recent activity");
  expect([...host.querySelectorAll("a")]).toEqual(links);
  expect(links.map(link => link.getAttribute("href"))).toEqual(hrefs);
  expect(document.activeElement).toBe(reference);
  expect(JSON.stringify(events)).toBe(before);
});
