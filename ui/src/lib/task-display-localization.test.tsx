// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { ExternalObjectSummary, IssueBlockerAttention } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, setLocale } from "@/i18n";
import { StatusIcon, getStatusIconLabel } from "@/components/StatusIcon";
import { IssueQuicklookCard } from "@/components/IssueLinkQuicklook";
import { ExternalObjectStatusSummary } from "@/components/ExternalObjectStatusSummary";
import { currentUserAssigneeOption, formatAssigneeUserLabel } from "./assignees";
import { externalObjectDisplayLabel, externalObjectDisplayStatusLabel } from "./external-objects";
import { formatMonitorEta, formatMonitorOffset } from "./issue-monitor";
import { recoveryChipLabel } from "./recovery-display";
import { formatRecoveryLineageSummary, formatRecoveryRetryOffset, readRecoveryRetryLineage } from "./recovery-lineage";
import { timeAgo } from "./timeAgo";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const NOW = Date.parse("2026-10-26T10:00:00Z");
const ru = i18n.getFixedT("ru");
let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(async () => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  await setLocale("en");
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.restoreAllMocks();
  await setLocale("en");
});

function mount(element: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(element));
  return container;
}

function lineage(offset: number) {
  return readRecoveryRetryLineage({
    wakePolicy: {
      type: "bounded_owner_disposition_repair",
      attempt: 2,
      maxAttempts: 5,
      retryAt: new Date(NOW + offset).toISOString(),
    },
  })!;
}

describe("localized task display boundaries", () => {
  it.each([
    [0, "0 активных подзадач"], [1, "1 активную подзадачу"],
    [2, "2 активные подзадачи"], [5, "5 активных подзадач"],
    [11, "11 активных подзадач"], [21, "21 активную подзадачу"],
    [22, "22 активные подзадачи"], [25, "25 активных подзадач"],
    [1.5, "1.5 активной подзадачи"],
  ])("inflects covered sub-task count %s without changing the blocker state", (count, phrase) => {
    const attention: IssueBlockerAttention = {
      state: "covered", reason: "active_child", unresolvedBlockerCount: count,
      coveredBlockerCount: count, attentionBlockerCount: 0, stalledBlockerCount: 0,
      sampleBlockerIdentifier: null, sampleStalledBlockerIdentifier: null,
    };
    expect(getStatusIconLabel("blocked", null, attention, ru)).toBe(`Заблокировано · ожидает ${phrase}`);
    expect(attention.state).toBe("covered");
  });

  it("distinguishes dependencies already covered by active work from waiting sub-tasks", () => {
    const attention: IssueBlockerAttention = {
      state: "covered", reason: "active_dependency", unresolvedBlockerCount: 1,
      coveredBlockerCount: 1, attentionBlockerCount: 0, stalledBlockerCount: 0,
      sampleBlockerIdentifier: "DEP-1", sampleStalledBlockerIdentifier: null,
    };
    expect(getStatusIconLabel("blocked", null, attention, ru)).toBe("Заблокировано · зависимость DEP-1 в работе");
    expect(getStatusIconLabel("blocked", null, { ...attention, sampleBlockerIdentifier: null }, ru)).toBe("Заблокировано · 1 зависимость в работе");
    expect(getStatusIconLabel("blocked", null, { ...attention, coveredBlockerCount: 5 }, ru)).toBe("Заблокировано · 5 зависимостей в работе");
    expect(getStatusIconLabel("blocked", null, attention)).toBe("Blocked · covered by active dependency DEP-1");
  });

  it("keeps future, due and missed retries distinct without comparing translated labels", async () => {
    await setLocale("ru");
    expect(formatMonitorEta(new Date(NOW + 180_000), new Date(NOW), ru)).toBe("через 3 мин");
    expect(formatMonitorOffset(new Date(NOW), ru)).toBe("сейчас");
    expect(formatMonitorEta(new Date(NOW - 180_000), new Date(NOW), ru)).toBe("просрочено на 3 мин");
    const future = lineage(180_000);
    const due = lineage(0);
    const missed = lineage(-180_000);
    expect(formatRecoveryLineageSummary(future, ru)).toBe("Попытка 2 из 5 · следующая попытка через 3 мин");
    expect(formatRecoveryLineageSummary(due, ru)).toBe("Попытка 2 из 5 · следующая попытка сейчас");
    expect(formatRecoveryLineageSummary(missed, ru)).toBe("Попытка 2 из 5 · повторная попытка пропущена 3 мин назад");
    expect([future.hasDurablePath, due.hasDurablePath, missed.hasDurablePath]).toEqual([true, true, false]);
    expect(recoveryChipLabel("in_progress", "missing_disposition", future, ru)).toBe("Восстановление выполняется · 2/5");
    expect(formatRecoveryRetryOffset(due)).toBe("now");
    expect(formatRecoveryLineageSummary(future)).toBe("Attempt 2 of 5 · next try in 3m");
  });

  it("preserves user data and untranslated caller contracts", async () => {
    await setLocale("ru");
    const userLabels = new Map([["other", "<strong>Имя</strong> & EN"]]);
    expect(formatAssigneeUserLabel("other", "self", userLabels, ru)).toBe("<strong>Имя</strong> & EN");
    expect(formatAssigneeUserLabel("self", "self", null, ru)).toBe("Вы");
    expect(formatAssigneeUserLabel("self", "self")).toBe("You");
    expect(currentUserAssigneeOption("self", ru)[0]).toMatchObject({ id: "user:self", label: "Я" });
    expect(timeAgo(new Date(NOW - 120_000), ru)).toBe("2 мин назад");
    expect(timeAgo(new Date(NOW - 120_000))).toBe("2m ago");
    expect(externalObjectDisplayStatusLabel({ providerKey: "github", objectType: "pull_request", statusCategory: "failed", liveness: "fresh", statusLabel: "Provider <status>" }, ru)).toBe("Provider <status>");
    expect(externalObjectDisplayLabel("github", "pull_request", "#42", ru)).toBe("#42");
  });

  it("keeps an open status picker and dispatches only the selected canonical status", async () => {
    const changes = vi.fn();
    const view = mount(<StatusIcon status="todo" showLabel onChange={changes} />);
    const trigger = view.querySelector("button")!;
    act(() => trigger.click());
    await act(async () => setLocale("ru"));
    expect(view.querySelector("button")).toBe(trigger);
    expect(trigger.getAttribute("aria-label")).toBe("Изменить статус (сейчас: К выполнению)");
    const option = document.querySelector('[role="img"][aria-label="В работе"]')?.closest("button");
    expect(option).toBeInstanceOf(HTMLButtonElement);
    expect(changes).not.toHaveBeenCalled();
    act(() => option?.click());
    expect(changes.mock.calls).toEqual([["in_progress"]]);
  });

  it("updates a mounted quicklook and external summary while preserving literal titles", async () => {
    const summary: ExternalObjectSummary = {
      total: 1, byStatusCategory: { failed: 1 }, byLiveness: { stale: 1 },
      highestSeverity: "danger", staleCount: 1, authRequiredCount: 0, unreachableCount: 0,
      objects: [{ id: "external-1", providerKey: "github", objectType: "pull_request", displayTitle: null,
        statusCategory: "failed", statusTone: "danger", liveness: "stale", isTerminal: false }],
    };
    const view = mount(<MemoryRouter><IssueQuicklookCard issue={{ id: "task-1", identifier: "TASK-1", title: "<strong>Задача</strong> & EN", status: "in_review", priority: "medium", updatedAt: new Date(NOW - 120_000) }} linkTo="/issues/task-1" /><ExternalObjectStatusSummary summary={summary} /></MemoryRouter>);
    const link = view.querySelector("a")!;
    await act(async () => setLocale("ru"));
    expect(view.querySelector("a")).toBe(link);
    expect(link.textContent).toBe("<strong>Задача</strong> & EN");
    expect(link.querySelector("strong")).toBeNull();
    expect(view.textContent).toContain("2 мин назад");
    expect(view.querySelector('[role="img"][aria-label="На проверке"]')).not.toBeNull();
    expect(view.querySelector('[data-external-status="failed"]')?.getAttribute("aria-label")).toBe("Внешние объекты: ошибка: 1, Устарело: 1, Всего: 1");
    await act(async () => setLocale("en"));
    expect(view.textContent).toContain("2m ago");
    expect(view.querySelector('[data-external-status="failed"]')?.getAttribute("aria-label")).toBe("External objects: 1 failed, 1 stale, 1 total");
  });
});
