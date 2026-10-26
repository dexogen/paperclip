// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { ApprovalDetail } from "./ApprovalDetail";
import { Approvals } from "./Approvals";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), list: vi.fn(), comments: vi.fn(), issues: vi.fn(), agents: vi.fn(),
  approve: vi.fn(), reject: vi.fn(), revision: vi.fn(), resubmit: vi.fn(), addComment: vi.fn(), remove: vi.fn(),
  navigate: vi.fn(), breadcrumbs: vi.fn(), selectCompany: vi.fn(),
}));
vi.mock("../api/approvals", () => ({ approvalsApi: {
  get: mocks.get, list: mocks.list, listComments: mocks.comments, listIssues: mocks.issues,
  approve: mocks.approve, reject: mocks.reject, requestRevision: mocks.revision,
  resubmit: mocks.resubmit, addComment: mocks.addComment,
} }));
vi.mock("../api/agents", () => ({ agentsApi: { list: mocks.agents, remove: mocks.remove } }));
vi.mock("../context/SidebarContext", () => ({ useSidebar: () => ({ isMobile: false }) }));
vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "co-1", setSelectedCompanyId: mocks.selectCompany }) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: mocks.breadcrumbs }) }));
vi.mock("@/lib/router", () => ({
  useParams: () => ({ approvalId: "ap-1" }), useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: "/approvals/pending" }), useSearchParams: () => [new URLSearchParams()],
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("../components/MarkdownBody", () => ({ MarkdownBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/AgentIdentity", () => ({ AgentIdentity: ({ agent }: { agent: { name: string } }) => <span>{agent.name}</span> }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
const fixture = (overrides: Record<string, unknown> = {}) => ({
  id: "ap-1", companyId: "co-1", type: "request_board_approval", status: "pending",
  payload: { title: "Title <strong>literal</strong>", summary: "Custom summary" },
  requestedByAgentId: null, decisionNote: null, createdAt: "2026-10-25T12:00:00.000Z", ...overrides,
});
async function flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function mount(page: React.ReactNode) {
  await act(async () => { root.render(<QueryClientProvider client={client}>{page}</QueryClientProvider>); });
  await vi.waitFor(async () => { await flush(); expect(container.textContent).toContain("Title <strong>literal</strong>"); });
}
function button(label: string) {
  const result = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
  expect(result, label).toBeDefined();
  return result!;
}
async function click(label: string) { await act(async () => { button(label).click(); }); await flush(); }
async function locale(language: string) { await act(async () => { await i18n.changeLanguage(language); }); }
const writes = () => [mocks.approve, mocks.reject, mocks.revision, mocks.resubmit, mocks.addComment, mocks.remove].map((fn) => fn.mock.calls.length);
const reads = () => [mocks.get, mocks.list, mocks.comments, mocks.issues, mocks.agents].map((fn) => fn.mock.calls.length);

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
  mocks.get.mockResolvedValue(fixture()); mocks.list.mockResolvedValue([fixture()]);
  mocks.comments.mockResolvedValue([]); mocks.issues.mockResolvedValue([]); mocks.agents.mockResolvedValue([]);
  for (const fn of [mocks.approve, mocks.reject, mocks.revision, mocks.resubmit, mocks.addComment, mocks.remove]) fn.mockResolvedValue(fixture());
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => { root.unmount(); }); client.clear(); container.remove(); await i18n.changeLanguage("en"); vi.restoreAllMocks(); });

it("preserves a focused comment and raw payload across languages, then submits exactly once", async () => {
  await mount(<ApprovalDetail />);
  await click("See full request");
  const payloadNode = container.querySelector("pre")!;
  const input = container.querySelector("textarea")!;
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, "  Draft <strong>literal</strong>  ");
    input.dispatchEvent(new Event("input", { bubbles: true })); input.setSelectionRange(4, 8);
  });
  const queryCount = reads();
  await locale("ru");
  expect(input.placeholder).toBe("Добавить комментарий…");
  expect(container.querySelector("textarea")).toBe(input); expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([4, 8]);
  expect(input.value).toBe("  Draft <strong>literal</strong>  ");
  expect(container.querySelector("pre")).toBe(payloadNode);
  expect(payloadNode.textContent).toContain('"title": "Title <strong>literal</strong>"');
  expect(writes()).toEqual([0, 0, 0, 0, 0, 0]); expect(reads()).toEqual(queryCount);
  await locale("en"); await locale("ru");
  expect(reads()).toEqual(queryCount);
  await click("Отправить комментарий");
  expect(mocks.addComment).toHaveBeenCalledExactlyOnceWith("ap-1", "Draft <strong>literal</strong>");
  expect(input.value).toBe("");
});

it("keeps a failed action while local fallback errors follow the language", async () => {
  mocks.revision.mockRejectedValue(null);
  await mount(<ApprovalDetail />);
  await click("Request revision"); expect(container.textContent).toContain("Revision request failed");
  const queryCount = reads(); await locale("ru");
  expect(container.textContent).toContain("Не удалось запросить доработку");
  expect(mocks.revision).toHaveBeenCalledExactlyOnceWith("ap-1"); expect(reads()).toEqual(queryCount);
  await locale("en"); expect(container.textContent).toContain("Revision request failed");
  expect(mocks.revision).toHaveBeenCalledTimes(1);
});

it("updates a card's relative creation time without remounting or refetching", async () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-25T12:05:00.000Z"));
  await mount(<Approvals />);
  const paragraph = [...container.querySelectorAll("p")].find((p) => p.textContent === "Approval request created 5m ago")!;
  expect(paragraph).toBeDefined();
  const queryCount = reads();
  await locale("ru");
  expect(paragraph.textContent).toBe("Запрос на согласование создан 5 мин назад");
  expect(container.contains(paragraph)).toBe(true);
  await locale("en");
  expect(paragraph.textContent).toBe("Approval request created 5m ago");
  expect(reads()).toEqual(queryCount);
  expect(writes()).toEqual([0, 0, 0, 0, 0, 0]);
});

it("preserves canonical list resolution payloads and raw API errors across languages", async () => {
  mocks.reject.mockRejectedValue(new Error("Provider <strong>denied</strong>"));
  await mount(<Approvals />); const queryCount = reads(); await locale("ru");
  expect(button("Одобрить")).toBeDefined(); expect(container.textContent).toContain("Согласование оператора");
  expect(reads()).toEqual(queryCount); expect(writes()).toEqual([0, 0, 0, 0, 0, 0]);
  await click("Отклонить"); expect(mocks.reject).toHaveBeenCalledExactlyOnceWith("ap-1");
  expect(container.textContent).toContain("Provider <strong>denied</strong>");
  expect(container.querySelector("strong")).toBeNull();
  await locale("en"); expect(container.textContent).toContain("Provider <strong>denied</strong>");
  expect(mocks.reject).toHaveBeenCalledTimes(1); await click("Approve");
  expect(mocks.approve).toHaveBeenCalledExactlyOnceWith("ap-1");
  expect(mocks.navigate).toHaveBeenCalledWith("/approvals/ap-1?resolved=approved");
});

it("retains the budget approval gate and canonical costs link in either language", async () => {
  mocks.get.mockResolvedValue(fixture({ type: "budget_override_required" }));
  await mount(<ApprovalDetail />); await locale("ru");
  expect(container.textContent).toContain("Настройте бюджет");
  expect(container.querySelector('a[href="/costs"]')?.textContent).toBe("/costs");
  expect([...container.querySelectorAll("button")].some((b) => b.textContent === "Одобрить")).toBe(false);
  expect([...container.querySelectorAll("button")].some((b) => b.textContent === "Отклонить")).toBe(false);
  await locale("en"); expect(container.textContent).toContain("Resolve this budget stop");
  expect(writes()).toEqual([0, 0, 0, 0, 0, 0]);
});

it("requires explicit destructive confirmation and keeps the linked agent ID", async () => {
  mocks.get.mockResolvedValue(fixture({ type: "hire_agent", status: "rejected", payload: { title: "Title <strong>literal</strong>", agentId: "agent-canonical" } }));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await mount(<ApprovalDetail />); await locale("ru");
  expect(confirm).not.toHaveBeenCalled();
  await click("Удалить неодобренного агента"); expect(mocks.remove).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenLastCalledWith("Удалить этого неодобренного агента? Это действие нельзя отменить.");
  confirm.mockReturnValue(true); await click("Удалить неодобренного агента");
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith("agent-canonical");
});
