// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { i18n } from "@/i18n";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { HeartbeatRun } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartCard, IssueStatusChart, PriorityChart, RunActivityChart, SuccessRateChart } from "./ActivityCharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  flushSync(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  await i18n.changeLanguage("en");
});

function render(ui: ReactNode) {
  flushSync(() => {
    root.render(ui);
  });
}

function createRun(overrides: Partial<HeartbeatRun> = {}): HeartbeatRun {
  return {
    id: "run-1",
    companyId: "company-1",
    agentId: "agent-1",
    issueId: null,
    responsibleUserId: null,
    invocationSource: "on_demand",
    triggerDetail: "manual",
    status: "succeeded",
    startedAt: new Date("2026-04-20T11:58:00.000Z"),
    finishedAt: new Date("2026-04-20T11:59:00.000Z"),
    error: null,
    wakeupRequestId: null,
    exitCode: 0,
    signal: null,
    usageJson: null,
    resultJson: null,
    sessionIdBefore: null,
    sessionIdAfter: null,
    logStore: null,
    logRef: null,
    logBytes: null,
    logSha256: null,
    logCompressed: false,
    lastOutputAt: null,
    lastOutputSeq: 0,
    lastOutputStream: null,
    lastOutputBytes: null,
    stdoutExcerpt: null,
    stderrExcerpt: null,
    errorCode: null,
    externalRunId: null,
    processPid: null,
    processGroupId: null,
    processStartedAt: null,
    retryOfRunId: null,
    processLossRetryCount: 0,
    scheduledRetryAt: null,
    scheduledRetryAttempt: 0,
    scheduledRetryReason: null,
    livenessState: null,
    livenessReason: null,
    continuationAttempt: 0,
    lastUsefulActionAt: null,
    nextAction: null,
    contextSnapshot: null,
    createdAt: new Date("2026-04-20T11:58:00.000Z"),
    updatedAt: new Date("2026-04-20T11:59:00.000Z"),
    ...overrides,
    scopeKind: overrides.scopeKind ?? "company",
  };
}

describe("ActivityCharts", () => {
  it("renders empty run charts when dashboard aggregate data is temporarily missing", () => {
    render(<RunActivityChart activity={undefined} />);
    expect(container.textContent).toContain("No runs yet");

    render(<SuccessRateChart activity={undefined} />);
    expect(container.textContent).toContain("No runs yet");
  });

  it("still aggregates raw agent runs for detail charts", () => {
    render(
      <RunActivityChart
        runs={[
          createRun({ id: "run-success", status: "succeeded" }),
          createRun({ id: "run-failed", status: "failed", errorCode: "provider_quota" }),
        ]}
      />,
    );

    expect(container.textContent).not.toContain("No runs yet");
    // Tooltip now carries the per-day breakdown (incl. failure error codes).
    const dayCell = container.querySelector("[title^='2026-04-20: 2 runs']");
    expect(dayCell).not.toBeNull();
    expect(dayCell?.getAttribute("title")).toContain("provider_quota: 1");
  });

  it("renders a distinct recovered segment and legend for recovered restart kills", () => {
    render(
      <RunActivityChart
        activity={[
          {
            date: "2026-04-20",
            succeeded: 3,
            failed: 1,
            recovered: 4,
            other: 0,
            total: 8,
            failedByErrorCode: { process_lost: 1 },
          },
        ]}
      />,
    );

    expect(container.textContent).toContain("Recovered");
    const dayCell = container.querySelector("[title*='recovered: 4']");
    expect(dayCell).not.toBeNull();
  });
  it("keeps chart buckets, geometry, raw diagnostics and legend nodes stable when the locale changes", async () => {
    const activity = [1, 2, 5, 21].map((total, index) => ({
      date: `2026-04-${17 + index}`, succeeded: 0, recovered: 0, failed: total, other: 0, total,
      failedByErrorCode: { "Failed <strong>raw</strong>": total },
    }));
    const input = structuredClone(activity);
    render(<ChartCard title="No runs yet" subtitle="Failed">
      <RunActivityChart activity={activity} />
      <SuccessRateChart activity={activity} />
      <PriorityChart issues={[{ priority: "high", createdAt: new Date("2026-04-20T23:59:00Z") }]} />
      <IssueStatusChart issues={[{ status: "in_review", createdAt: new Date("2026-04-20T23:59:00Z") }]} />
    </ChartCard>);
    const cells = [...container.querySelectorAll<HTMLElement>("[title]")];
    const geometry = cells.map(cell => cell.innerHTML);
    const legends = [...container.querySelectorAll("span")].filter(span => ["Succeeded", "Failed", "Other", "High", "In Review"].includes(span.textContent ?? ""));
    const englishTitles = cells.map(cell => cell.title);
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(container.textContent).toContain("Успешно");
    expect(container.textContent).toContain("Высокий");
    expect(container.textContent).toContain("На проверке");
    expect(container.querySelector("h3")?.textContent).toBe("No runs yet");
    expect(container.textContent).toContain("Failed");
    expect(cells.slice(0, 4).map(cell => cell.title.split("\n")[0])).toEqual([
      "2026-04-17: 1 запуск", "2026-04-18: 2 запуска", "2026-04-19: 5 запусков", "2026-04-20: 21 запуск",
    ]);
    expect(cells[0].title).toContain("Failed <strong>raw</strong>: 1");
    expect(container.querySelector("strong")).toBeNull();
    expect([...container.querySelectorAll("[title]")]).toEqual(cells);
    expect(cells.map(cell => cell.innerHTML)).toEqual(geometry);
    expect(legends.every(node => container.contains(node))).toBe(true);
    expect(activity).toEqual(input);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(cells.map(cell => cell.title)).toEqual(englishTitles);
    expect(legends.every(node => container.contains(node))).toBe(true);
  });

});
