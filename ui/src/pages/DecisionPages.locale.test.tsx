// @vitest-environment jsdom

import { act, useState, type AnchorHTMLAttributes, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent, AttentionItem } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { WhatNeedsMe } from "./WhatNeedsMe";
import { DecisionQueuePage } from "./DecisionQueuePage";
import { attentionApi } from "../api/attention";
import { decisionQueuesApi } from "../api/decisionQueues";
import { decisionsApi } from "../api/decisions";
import { issuesApi } from "../api/issues";
import { inboxDismissalsApi } from "../api/inboxDismissals";
import { pendingRequestConfirmationInteraction } from "../fixtures/issueThreadInteractionFixtures";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { ToastViewport } from "../components/ToastViewport";
import { TooltipProvider } from "../components/ui/tooltip";
import { ApiError } from "../api/client";
import { DecisionDateChips } from "../components/DecisionDateChips";
import { DecisionTriageStrip } from "../components/DecisionTriageStrip";
import { AgingItemRow } from "../components/DecisionShelf";
import { StalledReviewActions } from "../components/StalledReviewActions";
import { DecisionsToolbar } from "../components/DecisionsToolbar";
import { buildAttentionFilterOptions, defaultAttentionFilterState, type AttentionFilterState, type AttentionGroupBy, type AttentionSortOrder } from "../lib/attention";

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), setParams: vi.fn(), navigate: vi.fn(), breadcrumbs: vi.fn() }));
vi.mock("@/lib/router", () => ({
  useNavigate: () => nav.navigate, useSearchParams: () => [nav.params, nav.setParams], useParams: () => ({ key: "custom-key" }),
  useLocation: () => ({ pathname: "/decisions", search: "", hash: "" }),
  Link: ({ to, children, disableIssueQuicklook: _disable, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; disableIssueQuicklook?: boolean }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("../context/CompanyContext", async original => ({ ...await original<typeof import("../context/CompanyContext")>(), useCompany: () => ({ selectedCompanyId: "c1", selectedCompany: { id: "c1", issuePrefix: "PAP" } }) }));
vi.mock("../context/BreadcrumbContext", async original => ({ ...await original<typeof import("../context/BreadcrumbContext")>(), useBreadcrumbs: () => ({ setBreadcrumbs: nav.breadcrumbs }) }));
vi.mock("../api/attention", () => ({ attentionApi: { list: vi.fn() } }));
vi.mock("../api/agents", () => ({ agentsApi: { list: vi.fn(async () => []) } }));
vi.mock("../api/auth", () => ({ authApi: { getSession: vi.fn(async () => ({ user: { id: "user-test" } })) } }));
vi.mock("../api/decisions", () => ({ decisionsApi: { list: vi.fn(async () => []) } }));
vi.mock("../api/decisionQueues", () => ({ decisionQueuesApi: { list: vi.fn(), update: vi.fn(), removeItem: vi.fn(), updateTriage: vi.fn(), addItem: vi.fn(), create: vi.fn(), setKeep: vi.fn() } }));
vi.mock("../api/issues", () => ({ issuesApi: { listInteractions: vi.fn(), acceptInteraction: vi.fn(), rejectInteraction: vi.fn(), addComment: vi.fn(), decideStalledReview: vi.fn() } }));
vi.mock("../api/inboxDismissals", () => ({ inboxDismissalsApi: { list: vi.fn(async () => []), dismiss: vi.fn(async () => ({})), snooze: vi.fn(), restore: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let host: HTMLDivElement;
let client: QueryClient;
const createdAt = "2026-10-26T08:00:00Z";
const literal = '<b>План & {{literal}}</b>';
function fixture(): AttentionItem {
  return {
    id: "attention-1", companyId: "c1", sourceKind: "issue_thread_interaction",
    subject: { id: pendingRequestConfirmationInteraction.id, companyId: "c1", kind: "interaction", title: "Confirmation requested", identifier: null, status: "pending", href: "/issues/issue-1", metadata: { kind: "request_confirmation", issueId: "issue-1" }, display: { title: { code: "title.interaction.confirmation" } } },
    whyNow: "Confirmation requested on an issue thread.", display: { whyNow: { code: "why.interaction.confirmation" } },
    decisionVerbs: [{ id: "accept", label: "Confirm", description: null, display: { label: { code: "verb.confirm" } } }, { id: "reject", label: "Decline", description: null, display: { label: { code: "verb.decline" } } }],
    inlineResolvable: true, entryRule: "raw entry", exitRule: "raw exit", dedupKey: "same-source", dismissalKey: "attention:same-source", severity: "high", rank: 1,
    createdAt, updatedAt: createdAt, activityAt: createdAt, relatedIssue: null, project: null, workspace: null,
    expiresAt: null, ruleKey: null, originAgentName: null, queues: [{ key: "custom-key", title: "Plans <queue> {{raw}}" }], shelf: false, retentionDays: 30, keep: false,
    archivedAt: null, retentionVersion: 1, decideBy: null, decideByAttribution: null, snoozedUntil: null, detail: null, dismissal: null, trainingExampleId: null,
  };
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function language(locale: string) { await act(async () => { await i18n.changeLanguage(locale); }); }
function button(label: string, scope: ParentNode = document.body) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(entry => entry.textContent?.trim() === label || entry.getAttribute("aria-label") === label);
  expect(found, label).toBeTruthy(); return found!;
}
async function click(label: string, scope?: ParentNode) {
  await act(async () => {
    const target = button(label, scope);
    if (target.getAttribute("aria-haspopup") === "menu") target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false }));
    else target.click();
  });
}
async function input(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function render(element: ReactElement) {
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => { root!.render(<QueryClientProvider client={client}><ThemeProvider><TooltipProvider><ToastProvider>{element}<ToastViewport /></ToastProvider></TooltipProvider></ThemeProvider></QueryClientProvider>); });
  await settle(); await settle();
}
function expectNoWrites() {
  for (const fn of [issuesApi.acceptInteraction, issuesApi.rejectInteraction, issuesApi.addComment, inboxDismissalsApi.dismiss, inboxDismissalsApi.snooze, inboxDismissalsApi.restore,
    decisionQueuesApi.update, decisionQueuesApi.removeItem, decisionQueuesApi.updateTriage, decisionQueuesApi.addItem, decisionQueuesApi.create, decisionQueuesApi.setKeep]) expect(fn).not.toHaveBeenCalled();
}
beforeEach(async () => {
  vi.clearAllMocks(); localStorage.clear(); await i18n.changeLanguage("en");
  vi.mocked(attentionApi.list).mockResolvedValue({ companyId: "c1", generatedAt: "2026-10-26T09:00:00Z", items: [fixture()], totalCount: 1 } as never);
  vi.mocked(decisionQueuesApi.list).mockResolvedValue([{ key: "custom-key", title: "Plans <queue> {{raw}}", description: "Stored description <plain>", itemCount: 1, updatedAt: createdAt, seedRulesEnabled: true, seedRules: [{ description: "Stored rule text" }] }] as never);
  vi.mocked(issuesApi.listInteractions).mockResolvedValue([{ ...pendingRequestConfirmationInteraction, companyId: "c1", issueId: "issue-1", title: literal, payload: { ...pendingRequestConfirmationInteraction.payload, target: undefined, prompt: literal } }]);
  vi.mocked(issuesApi.rejectInteraction).mockRejectedValue(new ApiError("provider <denial> {{raw}}", 403, { code: "custom_provider_denial" }));
  vi.mocked(decisionQueuesApi.removeItem).mockResolvedValue(undefined as never);
});
afterEach(async () => {
  await act(async () => { root?.unmount(); }); root = undefined;
  client?.clear(); host?.remove(); localStorage.clear(); await i18n.changeLanguage("en");
});

describe("Decisions pages with real rows, triage and shared interaction form", () => {
  it("keeps a focused S3 revision draft and bilingual search through EN/RU/EN without fetching history or writing", async () => {
    await render(<WhatNeedsMe />);
    await click("Revise…");
    const note = host.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(note).toBeTruthy();
    await input(note, literal);
    await act(async () => { note.focus(); note.setSelectionRange(3, 9); });
    const reads = vi.mocked(attentionApi.list).mock.calls.length;
    const interactionReads = vi.mocked(issuesApi.listInteractions).mock.calls.length;
    const row = host.querySelector("[data-attention-row]");
    const storage = localStorage.getItem("paperclip:attention:group-by");
    for (const locale of ["ru", "en"]) {
      await language(locale);
      expect(host.querySelector("[data-attention-row]")).toBe(row);
      expect(host.querySelector("textarea")).toBe(note);
      expect(note.value).toBe(literal);
      expect(document.activeElement).toBe(note);
      expect([note.selectionStart, note.selectionEnd]).toEqual([3, 9]);
      expect(localStorage.getItem("paperclip:attention:group-by")).toBe(storage);
      expectNoWrites();
    }
    const search = host.querySelector<HTMLInputElement>('[aria-label="Search decisions"]')!;
    await input(search, "Требуется подтверждение");
    await language("ru");
    expect(search.value).toBe("Требуется подтверждение");
    expect(host.querySelector("textarea")).toBe(note);
    expect(host.querySelector("[data-attention-row]")).toBe(row);
    expect(host.textContent).toContain("Требуется подтверждение");
    expect(host.textContent).toContain("Plans <queue> {{raw}}");
    expect(host.querySelector("b")).toBeNull();
    expect(attentionApi.list).toHaveBeenCalledTimes(reads);
    expect(issuesApi.listInteractions).toHaveBeenCalledTimes(interactionReads);
    expect(decisionsApi.list).not.toHaveBeenCalled();
    expectNoWrites();
    await language("en");
    await click("Send revision"); await settle();
    expect(issuesApi.rejectInteraction).toHaveBeenCalledExactlyOnceWith("issue-1", pendingRequestConfirmationInteraction.id, literal);
    expect(host.textContent).toContain("provider <denial> {{raw}}");
    await language("ru"); await language("en");
    expect(issuesApi.rejectInteraction).toHaveBeenCalledTimes(1);
    expect(decisionsApi.list).not.toHaveBeenCalled();
  });

  it("localizes the dismissal toast from provenance and loads terminal history only after an explicit opening", async () => {
    await language("ru"); await render(<WhatNeedsMe />);
    expect(decisionsApi.list).not.toHaveBeenCalled();
    await click("Принятые решения"); await settle();
    expect(decisionsApi.list).toHaveBeenCalledExactlyOnceWith("c1", { status: "decided", limit: 51 });
    await language("en"); await language("ru");
    expect(decisionsApi.list).toHaveBeenCalledTimes(1);
    await act(async () => { document.activeElement instanceof HTMLElement && document.activeElement.blur(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true })); });
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true })); });
    await settle();
    expect(inboxDismissalsApi.dismiss).toHaveBeenCalledExactlyOnceWith("c1", "attention:same-source");
    expect(document.body.textContent).toContain("Решение скрыто");
    expect(document.body.textContent).toContain("Требуется подтверждение");
    expect(document.body.textContent).toContain("Отменить");
  });

  it("preserves a queue exclusion draft, raw queue/rule labels and canonical keys until one explicit exclusion", async () => {
    await render(<DecisionQueuePage />);
    expect(attentionApi.list).toHaveBeenCalledWith("c1", { queue: "custom-key", all: true });
    await click("Exclude");
    const note = document.querySelector<HTMLTextAreaElement>('[placeholder="Reason (optional)…"]')!;
    await input(note, literal);
    await act(async () => { note.focus(); note.setSelectionRange(2, 7); });
    const reads = vi.mocked(attentionApi.list).mock.calls.length;
    await language("ru");
    expect(document.querySelector('[placeholder="Причина (необязательно)…"]')).toBe(note);
    expect(note.value).toBe(literal); expect(document.activeElement).toBe(note);
    expect([note.selectionStart, note.selectionEnd]).toEqual([2, 7]);
    expect(host.textContent).toContain("Plans <queue> {{raw}}");
    expect(host.textContent).toContain("Stored description <plain>");
    expect(host.textContent).toContain("Stored rule text");
    expect(host.textContent).toContain("Автоматическое добавление включено");
    expect(attentionApi.list).toHaveBeenCalledTimes(reads); expectNoWrites();
    const popover = note.parentElement!;
    await act(async () => { button("Исключить", popover).click(); }); await settle();
    expect(decisionQueuesApi.removeItem).toHaveBeenCalledExactlyOnceWith("c1", "custom-key", "issue_thread_interaction", pendingRequestConfirmationInteraction.id, literal);
    expect(document.body.textContent).toContain("Убрано из очереди");
    expect(document.body.textContent).toContain("Требуется подтверждение");
    expect(decisionQueuesApi.update).not.toHaveBeenCalled();
  });
});

describe("Decisions controls preserve drafts and canonical actions", () => {
  it("keeps an open filter selection and search input across locale switches", async () => {
    const changed = vi.fn();
    function Toolbar() {
      const [query, setQuery] = useState(literal);
      const [filters, setFilters] = useState<AttentionFilterState>(defaultAttentionFilterState);
      const [groupBy, setGroupBy] = useState<AttentionGroupBy>("none");
      const [sort, setSort] = useState<AttentionSortOrder>("newest");
      return <DecisionsToolbar query={query} onQueryChange={setQuery} visibleCount={21} filterOptions={buildAttentionFilterOptions([{ ...fixture(), project: { id: "project-original", name: literal, color: null, urlKey: "p1", icon: null } }])} filters={filters} onFiltersChange={next => { changed(next); setFilters(next); }} groupBy={groupBy} onGroupByChange={setGroupBy} sortOrder={sort} onSortOrderChange={setSort} />;
    }
    await render(<Toolbar />);
    const search = host.querySelector<HTMLInputElement>('[aria-label="Search decisions"]')!;
    await click("Filter");
    await click(literal);
    expect(changed).toHaveBeenCalledExactlyOnceWith({ ...defaultAttentionFilterState, projectIds: ["project-original"] });
    const option = button(literal);
    await language("ru");
    expect(button(literal)).toBe(option);
    expect(option.querySelector('[role="checkbox"]')?.getAttribute("data-state")).toBe("checked");
    expect(document.body.textContent).toContain("Рабочее пространство");
    expect(host.textContent).toContain("21 решение");
    expect(host.querySelector('[aria-label="Поиск решений"]')).toBe(search);
    expect(search.value).toBe(literal);
    await language("en");
    expect(changed).toHaveBeenCalledTimes(1);
    expectNoWrites();
  });

  it("keeps the custom date input and canonical date values while translating accessible labels", async () => {
    const changed = vi.fn();
    function Range() {
      const [custom, setCustom] = useState({ from: null as string | null, to: null as string | null });
      return <DecisionDateChips value="custom" custom={custom} onChange={(id, next) => { changed(id, next); setCustom(next); }} />;
    }
    await render(<Range />);
    const trigger = button("Custom");
    await click("Custom");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const from = document.querySelector<HTMLInputElement>('[aria-label="From"]')!;
    await input(from, "2026-10-24");
    await act(async () => { from.focus(); });
    await language("ru");
    expect(document.querySelector('[aria-label="С"]')).toBe(from);
    expect(from.value).toBe("2026-10-24"); expect(document.activeElement).toBe(from);
    expect(changed).toHaveBeenCalledExactlyOnceWith("custom", { from: "2026-10-24", to: null });
    await language("en");
    expect(changed).toHaveBeenCalledTimes(1); expectNoWrites();
  });

  it("retains a new queue draft and selection until explicit creation, then uses returned canonical key", async () => {
    vi.mocked(decisionQueuesApi.create).mockResolvedValue({ key: "server-key" } as never);
    vi.mocked(decisionQueuesApi.addItem).mockResolvedValue(undefined as never);
    await render(<DecisionTriageStrip item={fixture()} companyId="c1" />);
    await click("Queue"); await settle(); await click("New queue…");
    const name = document.querySelector<HTMLInputElement>('[placeholder="New queue name…"]')!;
    await input(name, "  Plans <queue> {{raw}}  ");
    await act(async () => { name.focus(); name.setSelectionRange(3, 9); });
    const reads = vi.mocked(decisionQueuesApi.list).mock.calls.length;
    await language("ru");
    expect(document.querySelector('[placeholder="Название новой очереди…"]')).toBe(name);
    expect(name.value).toBe("  Plans <queue> {{raw}}  ");
    expect(document.activeElement).toBe(name);
    expect([name.selectionStart, name.selectionEnd]).toEqual([3, 9]);
    expect(decisionQueuesApi.list).toHaveBeenCalledTimes(reads); expectNoWrites();
    await click("Создать"); await settle();
    expect(decisionQueuesApi.create).toHaveBeenCalledExactlyOnceWith("c1", { key: "plans-queue-raw", title: "Plans <queue> {{raw}}" });
    expect(decisionQueuesApi.addItem).toHaveBeenCalledExactlyOnceWith("c1", "server-key", "issue_thread_interaction", pendingRequestConfirmationInteraction.id);
  });

  it("keeps review-note validation and records one canonical action without a locale retry", async () => {
    vi.mocked(issuesApi.decideStalledReview).mockRejectedValue(new ApiError("literal <reason> {{raw}}", 403, null));
    await render(<StalledReviewActions issueId="review-task" companyId="c1" />);
    expect(button("Request changes").disabled).toBe(true);
    const note = host.querySelector("textarea")!;
    await input(note, literal);
    await act(async () => { note.focus(); note.setSelectionRange(2, 5); });
    await language("ru");
    expect(host.querySelector("textarea")).toBe(note); expect(note.value).toBe(literal);
    expect(document.activeElement).toBe(note); expect(button("Запросить изменения").disabled).toBe(false);
    expect(issuesApi.decideStalledReview).not.toHaveBeenCalled();
    await click("Запросить изменения"); await settle();
    expect(issuesApi.decideStalledReview).toHaveBeenCalledExactlyOnceWith("review-task", { action: "request_changes", note: literal });
    expect(document.body.textContent).toContain("Не удалось сохранить решение по проверке");
    expect(document.body.textContent).toContain("literal <reason> {{raw}}");
    await language("en"); await language("ru");
    expect(issuesApi.decideStalledReview).toHaveBeenCalledTimes(1);
  });

  it("localizes an aging row and its toast without changing the keep target", async () => {
    vi.mocked(decisionQueuesApi.setKeep).mockResolvedValue(undefined as never);
    const item = { ...fixture(), shelf: true };
    await render(<AgingItemRow item={item} companyId="c1" now={Date.parse(createdAt) + 21 * 86_400_000} agentMap={new Map()} agents={[]} currentUserId="user-test" expanded={false} onToggleExpand={vi.fn()} onDismiss={vi.fn()} onSnooze={vi.fn()} />);
    await language("ru");
    expect(host.textContent).toContain("Без активности 21 день");
    expectNoWrites();
    await click("Оставить на экране решений"); await settle();
    expect(decisionQueuesApi.setKeep).toHaveBeenCalledExactlyOnceWith("c1", "issue_thread_interaction", pendingRequestConfirmationInteraction.id, true);
    expect(document.body.textContent).toContain("Оставлено на экране решений");
    expect(document.body.textContent).toContain("Требуется подтверждение");
  });

  it("keeps the exact recommendation comment body when the action is taken in Russian", async () => {
    vi.mocked(issuesApi.addComment).mockResolvedValue({} as never);
    const agent = { id: "agent-exact", name: "Agent <literal>", status: "idle" } as Agent;
    const item = { ...fixture(), relatedIssue: { ...fixture().subject, id: "issue-1", kind: "issue" as const, identifier: "PAP-42", title: literal } };
    await render(<DecisionTriageStrip item={item} companyId="c1" agents={[agent]} />);
    await language("ru"); expectNoWrites();
    await click("Запросить рекомендацию у агента");
    const entry = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(node => node.textContent === agent.name)!;
    expect(entry).toBeTruthy(); await act(async () => { entry.click(); }); await settle();
    expect(issuesApi.addComment).toHaveBeenCalledExactlyOnceWith("issue-1", "[@Agent <literal>](agent://agent-exact) — could you look at this decision on PAP-42, prepare a recommendation, and re-surface it on the decisions desk? (routed from the desk)");
    expect(document.body.textContent).toContain("Рекомендация запрошена у агента: Agent <literal>");
  });
});
