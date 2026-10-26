import { describe, expect, it } from "vitest";
import { describeRunRetryState, formatRetryReason } from "./runRetryState";
import { i18n } from "@/i18n";

describe("runRetryState", () => {
  it("localizes generated copy while retaining retry semantics and literal provider reasons", () => {
    const run = Object.freeze({ status: "failed", retryOfRunId: "run-raw", scheduledRetryAttempt: 2,
      scheduledRetryReason: "transient_failure", retryExhaustedReason: "<span>{{literal}}</span>" });
    const english = describeRunRetryState(run)!;
    const russian = describeRunRetryState(run, i18n.getFixedT("ru"))!;
    expect(russian.badgeLabel).toBe("Попытки исчерпаны");
    expect(russian.secondary).toBe("<span>{{literal}}</span> Требуется вмешательство оператора.");
    expect([russian.kind, russian.tone, russian.retryOfRunId]).toEqual([english.kind, english.tone, english.retryOfRunId]);
    expect(describeRunRetryState(run)).toEqual(english);
    const alreadyExplained = { ...run, retryExhaustedReason: "Manual intervention required: <raw>" };
    expect(describeRunRetryState(alreadyExplained, i18n.getFixedT("ru"))?.secondary).toBe(alreadyExplained.retryExhaustedReason);
  });
  it("formats internal retry reasons for operators", () => {
    expect(formatRetryReason("transient_failure")).toBe("Transient failure");
    expect(formatRetryReason("native_provider_overloaded")).toBe("Model at capacity");
    expect(formatRetryReason("issue_continuation_needed")).toBe("Continuation needed");
    expect(formatRetryReason("max_turns_continuation")).toBe("Max-turn continuation");
    expect(formatRetryReason("custom_reason")).toBe("custom reason");
  });

  it("describes scheduled retries", () => {
    expect(
      describeRunRetryState({
        status: "scheduled_retry",
        retryOfRunId: "run-1",
        scheduledRetryAttempt: 2,
        scheduledRetryReason: "transient_failure",
        scheduledRetryAt: "2026-04-18T20:15:00.000Z",
      }),
    ).toMatchObject({
      kind: "scheduled",
      badgeLabel: "Retry scheduled",
      detail: "Attempt 2 · Transient failure",
    });
  });

  it("describes max-turn continuation retries distinctly", () => {
    expect(
      describeRunRetryState({
        status: "scheduled_retry",
        retryOfRunId: "run-max-turns",
        scheduledRetryAttempt: 1,
        scheduledRetryReason: "max_turns_continuation",
        scheduledRetryAt: "2026-04-18T20:15:00.000Z",
      }),
    ).toMatchObject({
      kind: "scheduled",
      badgeLabel: "Continuation scheduled",
      detail: "Attempt 1 · Max-turn continuation",
    });
  });

  it("describes exhausted retries", () => {
    expect(
      describeRunRetryState({
        status: "failed",
        retryOfRunId: "run-1",
        scheduledRetryAttempt: 4,
        scheduledRetryReason: "transient_failure",
        retryExhaustedReason: "Bounded retry exhausted after 4 scheduled attempts; no further automatic retry will be queued",
      }),
    ).toMatchObject({
      kind: "exhausted",
      badgeLabel: "Retry exhausted",
      detail: "Attempt 4 · Transient failure · Automatic retries exhausted",
      secondary: "Bounded retry exhausted after 4 scheduled attempts; no further automatic retry will be queued Manual intervention required.",
    });
  });
});
