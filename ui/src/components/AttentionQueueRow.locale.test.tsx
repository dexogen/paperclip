// @vitest-environment jsdom

import { act as reactAct, type AnchorHTMLAttributes, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttentionItem } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { approvalsApi } from "../api/approvals";
import { issuesApi } from "../api/issues";
import { ApiError } from "../api/client";
import { ToastViewport } from "./ToastViewport";
import { ToastProvider } from "../context/ToastContext";
import { AttentionQueueRow } from "./AttentionQueueRow";

vi.mock("@/lib/router", () => ({ Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => <a href={to} {...props}>{children}</a> }));
vi.mock("../api/approvals", () => ({ approvalsApi: { approve: vi.fn(), reject: vi.fn(), requestRevision: vi.fn() } }));
vi.mock("../api/issues", () => ({ issuesApi: { acceptInteraction: vi.fn(), rejectInteraction: vi.fn() } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;
const clients: QueryClient[] = [];
afterEach(async () => {
  await reactAct(async () => { root?.unmount(); });
  root = null;
  container?.remove(); container = null;
  clients.splice(0).forEach(client => client.clear());
  await i18n.changeLanguage("en");
  vi.clearAllMocks();
});
function render(element: ReactElement) {
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  flushSync(() => root!.render(<ToastProvider><QueryClientProvider client={client}>{element}<ToastViewport /></QueryClientProvider></ToastProvider>));
  return container;
}

function buildItem(overrides: Partial<AttentionItem> = {}): AttentionItem {
  return {
    id: "a1",
    companyId: "c1",
    sourceKind: "approval",
    subject: {
      kind: "approval",
      id: "approval-1",
      companyId: "c1",
      title: "Hire agent: Research Analyst",
      identifier: null,
      status: "pending",
      href: "/PAP/approvals/approval-1",
      metadata: {},
    },
    whyNow: "Approval is pending a board decision.",
    decisionVerbs: [],
    inlineResolvable: true,
    entryRule: "",
    exitRule: "",
    dedupKey: "approval:approval-1",
    dismissalKey: "attention:approval:approval-1",
    severity: "high",
    rank: 0,
    activityAt: "2026-07-09T12:00:00Z",
    createdAt: "2026-07-09T12:00:00Z",
    updatedAt: "2026-07-09T12:00:00Z",
    relatedIssue: null,
    project: null,
    workspace: null,
    detail: null,
    dismissal: null,
    ...overrides,
    expiresAt: overrides.expiresAt ?? null,
    ruleKey: overrides.ruleKey ?? null,
    originAgentName: overrides.originAgentName ?? null,
    queues: overrides.queues ?? [],
    shelf: overrides.shelf ?? false,
    retentionDays: overrides.retentionDays ?? 30,
    keep: overrides.keep ?? false,
    archivedAt: overrides.archivedAt ?? null,
    retentionVersion: overrides.retentionVersion ?? 1,
    decideBy: overrides.decideBy ?? null,
    decideByAttribution: overrides.decideByAttribution ?? null,
    snoozedUntil: overrides.snoozedUntil ?? null,
    trainingExampleId: overrides.trainingExampleId ?? null,
  };
}

const noop = () => {};

describe("AttentionQueueRow locale preservation", () => {
  const confirmation = (id: string, translated: boolean): AttentionItem => buildItem({
    id, sourceKind: "issue_thread_interaction",
    subject: { ...buildItem().subject, id: `interaction-${id}`, kind: "interaction", title: "Confirmation requested", metadata: { kind: "request_confirmation", issueId: "issue-literal" }, ...(translated ? { display: { title: { code: "title.interaction.confirmation" as const } } } : {}) },
    whyNow: "raw <reason> {{literal}}",
    decisionVerbs: [
      { id: "accept", label: "Confirm", description: null, ...(translated ? { display: { label: { code: "verb.confirm" as const } } } : {}) },
      { id: "reject", label: "Decline", description: null, ...(translated ? { display: { label: { code: "verb.decline" as const } } } : {}) },
    ],
  });
  const locale = async (language: string) => { await reactAct(async () => { await i18n.changeLanguage(language); }); };

  it("preserves raw/custom text and semantic action order through EN/RU/EN, with one pending acceptance", async () => {
    let accept!: (value: never) => void;
    vi.mocked(issuesApi.acceptInteraction).mockImplementation(() => new Promise(resolve => { accept = resolve; }));
    const onOpen = vi.fn();
    const tagged = confirmation("tagged", true);
    const custom = confirmation("custom", false);
    const requestChanges = { ...confirmation("changes", false), decisionVerbs: [{ id: "reject", label: "Request changes", description: null }] };
    const before = structuredClone([tagged, custom, requestChanges]);
    render(<>{[tagged, custom, requestChanges].map(item => <AttentionQueueRow key={item.id} item={item} companyId="c1" expanded={false} onToggleExpand={onOpen} onDismiss={noop} />)}</>);
    const taggedRow = container!.querySelector('[data-attention-row-id="tagged"]')!;
    const actions = () => [...taggedRow.querySelectorAll<HTMLButtonElement>('[data-attention-actions] [aria-label] button')];
    const initial = actions();
    expect(initial.map(button => [button.textContent, button.dataset.variant])).toEqual([["Decline", "destructive"], ["Confirm", "default"]]);
    await locale("ru");
    expect(taggedRow.textContent).toContain("Требуется подтверждение");
    expect(taggedRow.textContent).toContain("raw <reason> {{literal}}");
    expect(actions().map(button => [button.textContent, button.dataset.variant])).toEqual([["Отклонить", "destructive"], ["Подтвердить", "default"]]);
    expect(actions()[1]).toBe(initial[1]);
    const customRow = container!.querySelector('[data-attention-row-id="custom"]')!;
    expect(customRow.textContent).toContain("Confirmation requested");
    expect(customRow.textContent).toContain("Confirm");
    const request = container!.querySelector<HTMLButtonElement>('[data-attention-row-id="changes"] [data-variant="outline"]')!;
    expect(request.textContent).toBe("Request changes");
    await reactAct(async () => { request.click(); });
    expect(onOpen).toHaveBeenCalledWith(requestChanges);
    expect(issuesApi.rejectInteraction).not.toHaveBeenCalled();
    await reactAct(async () => { actions()[1].click(); });
    expect(issuesApi.acceptInteraction).toHaveBeenCalledExactlyOnceWith("issue-literal", "interaction-tagged");
    await locale("en");
    expect(actions()[1]).toBe(initial[1]);
    expect(actions()[1].disabled).toBe(true);
    expect(actions().map(button => button.dataset.variant)).toEqual(["destructive", "default"]);
    expect(issuesApi.acceptInteraction).toHaveBeenCalledTimes(1);
    await reactAct(async () => { accept({} as never); });
    expect([tagged, custom, requestChanges]).toEqual(before);
  });

  it("retains an expanded approval note, focus and selection until one explicit save", async () => {
    vi.mocked(approvalsApi.approve).mockResolvedValue({} as never);
    render(<AttentionQueueRow item={buildItem({ decideBy: "today", decideByAttribution: { type: "user", userId: "u1", agentId: null, agentName: null, runId: null, responsibleUserId: null, updatedAt: "2026-07-09T12:00:00Z" } })} companyId="c1" expanded onToggleExpand={noop} onDismiss={noop} />);
    const input = container!.querySelector("textarea")!;
    const draft = '<b>План & {{literal}}</b>';
    await reactAct(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, draft);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus(); input.setSelectionRange(4, 9);
    });
    await locale("ru");
    expect(container!.querySelector("textarea")).toBe(input);
    expect(input.value).toBe(draft);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([4, 9]);
    expect(container!.textContent).toContain("срок задан вами");
    expect(approvalsApi.approve).not.toHaveBeenCalled();
    await locale("en");
    expect(input.value).toBe(draft);
    const approve = [...container!.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.trim() === "Approve")!;
    await reactAct(async () => { approve.click(); });
    expect(approvalsApi.approve).toHaveBeenCalledExactlyOnceWith("approval-1", draft);
  });

  it("keeps a denied compact action single-shot across locale changes", async () => {
    vi.mocked(issuesApi.acceptInteraction).mockRejectedValue(new ApiError("This issue-thread interaction is human-only", 403, { code: "interaction_human_only" }));
    await locale("ru");
    render(<AttentionQueueRow item={confirmation("denied", true)} companyId="c1" expanded={false} onToggleExpand={noop} onDismiss={noop} />);
    const button = [...container!.querySelectorAll<HTMLButtonElement>("button")].find(entry => entry.textContent === "Подтвердить")!;
    await reactAct(async () => { button.click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(issuesApi.acceptInteraction).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("Попробуйте ещё раз");
    await locale("en");
    await locale("ru");
    expect(issuesApi.acceptInteraction).toHaveBeenCalledTimes(1);
  });
});
