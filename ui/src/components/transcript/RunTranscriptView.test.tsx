// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { i18n } from "../../i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAcpxStdoutLine } from "@paperclipai/adapter-utils/acpx-engine/ui";
import { buildTranscript, type RunLogChunk, type TranscriptEntry } from "../../adapters";
import type { ToolRunDecision } from "@paperclipai/shared";
import { ThemeProvider } from "../../context/ThemeContext";
import { RunTranscriptView, keyTranscriptBlocks, normalizeTranscript } from "./RunTranscriptView";

describe("RunTranscriptView", () => {
  it("renders provider activity semantically without dumping the payload", () => {
    const html = renderToStaticMarkup(<RunTranscriptView entries={[{ kind: "provider_activity", ts: "2026-08-21T12:00:00.000Z", family: "plan", eventType: "plan.updated", status: "completed", title: "Plan", summary: "Plan completed", payload: { steps: [{ stepId: "s1", body: "Validate schemas", status: "completed" }], hiddenSecret: "must-not-render" } }]} />);
    expect(html).toContain("Plan");
    expect(html).toContain("Plan completed");
    expect(html).not.toContain("must-not-render");
  });
  it("folds repeated tool_call status updates for the same toolUseId into one block", () => {
    const entries: TranscriptEntry[] = [
      {
        kind: "tool_call",
        ts: "2026-03-12T00:00:00.000Z",
        name: "read",
        toolUseId: "tool-1",
        input: { text: "read README.md", status: "pending" },
      },
      {
        kind: "tool_call",
        ts: "2026-03-12T00:00:01.000Z",
        name: "read",
        toolUseId: "tool-1",
        input: { status: "in_progress" },
      },
      {
        kind: "tool_call",
        ts: "2026-03-12T00:00:02.000Z",
        name: "search",
        toolUseId: "tool-2",
        input: { text: "grep TODO", status: "pending" },
      },
      {
        kind: "tool_result",
        ts: "2026-03-12T00:00:03.000Z",
        toolUseId: "tool-1",
        toolName: "read",
        content: "ok",
        isError: false,
      },
    ];

    const blocks = normalizeTranscript(entries, false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "tool_group",
      items: [
        {
          name: "Read",
          status: "completed",
          result: "ok",
          // Later status updates merge into the original input instead of
          // spawning duplicate "Running" cards.
          input: { text: "read README.md", status: "in_progress" },
        },
        { name: "Search", status: "running" },
      ],
    });
  });

  it("renders a streamed acpx tool call as a single card once completed", () => {
    const ts = "2026-03-12T00:00:00.000Z";
    const jsonLines = [
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-1", status: "pending", text: "read README.md" },
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-1", status: "in_progress", text: "read README.md" },
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-1", status: "completed", text: "ok" },
    ];
    const chunks: RunLogChunk[] = [
      { ts, stream: "stdout", chunk: jsonLines.map((line) => JSON.stringify(line)).join("\n") + "\n" },
    ];

    const entries = buildTranscript(chunks, parseAcpxStdoutLine);
    const blocks = normalizeTranscript(entries, false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "tool_group",
      items: [{ name: "Read", status: "completed", result: "ok" }],
    });
  });

  it("renders streamed acpx tool calls with input payloads as readable status cards", () => {
    const ts = "2026-03-12T00:00:00.000Z";
    const jsonLines = [
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-2", status: "running", input: { file: "README.md" } },
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-2", status: "in_progress", text: "opening file", input: { line: 1 } },
      { type: "acpx.tool_call", name: "read", toolCallId: "tool-2", status: "completed", text: "ok" },
    ];
    const chunks: RunLogChunk[] = [
      { ts, stream: "stdout", chunk: jsonLines.map((line) => JSON.stringify(line)).join("\n") + "\n" },
    ];

    const entries = buildTranscript(chunks, parseAcpxStdoutLine);
    const blocks = normalizeTranscript(entries, false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "tool_group",
      items: [{ name: "Read", status: "completed", result: "ok" }],
    });
  });

  it("keeps running command stdout inside the command fold instead of a standalone stdout block", () => {
    const entries: TranscriptEntry[] = [
      {
        kind: "tool_call",
        ts: "2026-03-12T00:00:00.000Z",
        name: "command_execution",
        toolUseId: "cmd_1",
        input: { command: "ls -la" },
      },
      {
        kind: "stdout",
        ts: "2026-03-12T00:00:01.000Z",
        text: "file-a\nfile-b",
      },
    ];

    const blocks = normalizeTranscript(entries, false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "command_group",
      items: [{ result: "file-a\nfile-b", status: "running" }],
    });
  });

  it("renders assistant and thinking content as markdown in compact mode", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <RunTranscriptView
          density="compact"
          entries={[
            {
              kind: "assistant",
              ts: "2026-03-12T00:00:00.000Z",
              text: "Hello **world**",
            },
            {
              kind: "thinking",
              ts: "2026-03-12T00:00:01.000Z",
              text: "- first\n- second",
            },
          ]}
        />
      </ThemeProvider>,
    );

    expect(html).toContain("<strong>world</strong>");
    expect(html).toMatch(/<li[^>]*>first<\/li>/);
    expect(html).toMatch(/<li[^>]*>second<\/li>/);
  });

  it("hides saved-session resume skip stderr from nice mode normalization", () => {
    const entries: TranscriptEntry[] = [
      {
        kind: "stderr",
        ts: "2026-03-12T00:00:00.000Z",
        text: "[paperclip] Skipping saved session resume for task \"PAP-485\" because wake reason is issue_assigned.",
      },
      {
        kind: "assistant",
        ts: "2026-03-12T00:00:01.000Z",
        text: "Working on the task.",
      },
    ];

    const blocks = normalizeTranscript(entries, false);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "message",
      role: "assistant",
      text: "Working on the task.",
    });
  });

  it("renders successful result summaries as markdown in nice mode", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <RunTranscriptView
          density="compact"
          entries={[
            {
              kind: "result",
              ts: "2026-03-12T00:00:02.000Z",
              text: "## Summary\n\n- fixed deploy config\n- posted issue update",
              inputTokens: 10,
              outputTokens: 20,
              cachedTokens: 0,
              costUsd: 0,
              subtype: "success",
              isError: false,
              errors: [],
            },
          ]}
        />
      </ThemeProvider>,
    );

    expect(html).toContain("<h2>Summary</h2>");
    expect(html).toMatch(/<li[^>]*>fixed deploy config<\/li>/);
    expect(html).toMatch(/<li[^>]*>posted issue update<\/li>/);
    expect(html).not.toContain("result");
  });

  it("links tool rows to pending governed action decisions", () => {
    const invocationId = "11111111-1111-4111-8111-111111111111";
    const actionRequestId = "22222222-2222-4222-8222-222222222222";
    const decision: ToolRunDecision = {
      invocation: {
        id: invocationId,
        companyId: "company-1",
        idempotencyKey: null,
        actorType: "agent",
        actorId: "agent-1",
        agentId: "agent-1",
        issueId: "issue-1",
        runId: "run-1",
        applicationId: null,
        connectionId: null,
        catalogEntryId: null,
        toolName: "send_email",
        argumentsHash: "hash-1",
        argumentsSummary: { summary: "{\"to\":\"redacted\"}" },
        policyDecision: "require_approval",
        matchedPolicyIds: [],
        approvalState: "pending",
        status: "awaiting_approval",
        upstreamRequestId: null,
        resultHash: null,
        resultSummary: null,
        resultSizeBytes: null,
        resultArtifactId: null,
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
      actionRequest: {
        id: actionRequestId,
        companyId: "company-1",
        invocationId,
        issueId: "issue-1",
        interactionId: "33333333-3333-4333-8333-333333333333",
        approvalId: null,
        status: "pending",
        canonicalArgumentsHash: "hash-1",
        canonicalArgumentsSummary: { summary: "{\"to\":\"redacted\"}" },
        signedArguments: null,
        previewMarkdown: "Tool: `send_email`",
        requestedByAgentId: "agent-1",
        requestedByUserId: null,
        resolvedByAgentId: null,
        resolvedByUserId: null,
        decidedByAgentId: null,
        decidedByUserId: null,
        decidedAt: null,
        expiresAt: null,
        resolvedAt: null,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
      auditEvents: [],
      latestAuditEvent: null,
      decision: "require_approval",
      outcome: "pending",
      reasonCode: "requires_approval_policy",
      denialReason: null,
      pendingAction: {
        actionRequestId,
        issueId: "issue-1",
        interactionId: "33333333-3333-4333-8333-333333333333",
        approvalId: null,
        status: "pending",
        previewMarkdown: "Tool: `send_email`",
      },
    };

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <RunTranscriptView
          density="compact"
          entries={[
            {
              kind: "tool_call",
              ts: "2026-03-12T00:00:00.000Z",
              name: "send_email",
              invocationId,
              input: { to: "redacted@example.com" },
            },
          ]}
          toolDecisions={[decision]}
        />
      </ThemeProvider>,
    );

    expect(html).toContain("Needs approval");
    expect(html).toContain(`Action request ${actionRequestId.slice(0, 8)}`);
  });

  it("windows large raw transcripts instead of rendering every entry at once", () => {
    const entries: TranscriptEntry[] = Array.from({ length: 500 }, (_, index) => ({
      kind: "stdout",
      ts: `2026-03-12T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
      text: `line-${index}`,
    }));

    const html = renderToStaticMarkup(
      <ThemeProvider>
        <RunTranscriptView mode="raw" entries={entries} />
      </ThemeProvider>,
    );

    expect(html).toContain("line-0");
    expect(html).toContain("line-179");
    expect(html).not.toContain("line-250");
    expect(html).not.toContain("line-499");
  });

  it("keeps the streaming tail block's key stable as deltas merge in", () => {
    // A streaming assistant message accumulates deltas; each delta advances the
    // block's `ts`. The React key must stay anchored to the block's opening
    // timestamp so the tail does not unmount/remount (restarting its fade).
    const firstDelta: TranscriptEntry[] = [
      { kind: "assistant", ts: "2026-03-12T00:00:00.000Z", text: "Hel", delta: true },
    ];
    const withMoreDeltas: TranscriptEntry[] = [
      ...firstDelta,
      { kind: "assistant", ts: "2026-03-12T00:00:00.400Z", text: "lo the", delta: true },
      { kind: "assistant", ts: "2026-03-12T00:00:00.900Z", text: "re", delta: true },
    ];

    const keyOf = (entries: TranscriptEntry[]) => {
      const keyed = keyTranscriptBlocks(normalizeTranscript(entries, true));
      return keyed[keyed.length - 1]!.key;
    };

    // Same opening timestamp → identical key even though `ts` advanced.
    expect(keyOf(withMoreDeltas)).toBe(keyOf(firstDelta));
    // And that key is anchored to the opening ts, not the latest one.
    expect(keyOf(withMoreDeltas)).toContain("2026-03-12T00:00:00.000Z");
    expect(keyOf(withMoreDeltas)).not.toContain("2026-03-12T00:00:00.900Z");
  });

  it("assigns unique keys and does not remount earlier blocks when a new tail arrives", () => {
    const base: TranscriptEntry[] = [
      { kind: "assistant", ts: "2026-03-12T00:00:00.000Z", text: "first message", delta: true },
      { kind: "thinking", ts: "2026-03-12T00:00:01.000Z", text: "pondering", delta: true },
    ];
    const withNewTail: TranscriptEntry[] = [
      ...base,
      { kind: "assistant", ts: "2026-03-12T00:00:02.000Z", text: "second message", delta: true },
    ];

    const baseKeys = keyTranscriptBlocks(normalizeTranscript(base, true)).map((b) => b.key);
    const nextKeys = keyTranscriptBlocks(normalizeTranscript(withNewTail, true)).map((b) => b.key);

    // Keys are unique within a render.
    expect(new Set(nextKeys).size).toBe(nextKeys.length);
    // Existing blocks keep their identity when a new block appends after them.
    expect(nextKeys.slice(0, baseKeys.length)).toEqual(baseKeys);
  });
});


describe("RunTranscriptView locale preservation", () => {
  let root: Root | undefined;
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = undefined;
    container.remove();
    await i18n.changeLanguage("en");
    vi.unstubAllGlobals();
  });

  it("keeps expanded details, focused controls and literal provider data through EN/RU/EN", async () => {
    const entries: TranscriptEntry[] = [
      { kind: "stdout", ts: "2026-10-26T01:00:00Z", text: "<provider>Completed</provider>" },
      { kind: "tool_call", ts: "2026-10-26T01:00:01Z", name: "read", toolUseId: "opaque-tool-id", input: { path: "<workspace>/Completed.md" } },
      { kind: "tool_result", ts: "2026-10-26T01:00:02Z", toolUseId: "opaque-tool-id", content: "Waiting for result", isError: false },
      { kind: "provider_activity", ts: "2026-10-26T01:00:03Z", family: "plan", eventType: "plan.updated", status: "completed", title: "Completed", summary: "Plan completed", payload: { steps: [{ stepId: "s1", body: "<provider>Keep literal</provider>", status: "completed" }] } },
    ];
    const snapshot = JSON.stringify(entries);
    const normalized = JSON.stringify(normalizeTranscript(entries, false));
    const keys = keyTranscriptBlocks(normalizeTranscript(entries, false)).map(({ key }) => key);
    root = createRoot(container);
    await act(async () => root!.render(<ThemeProvider><RunTranscriptView entries={entries} collapseStdout /></ThemeProvider>));
    const stdoutToggle = container.querySelector<HTMLButtonElement>('button[aria-label="Expand stdout"]')!;
    const toolToggle = container.querySelector<HTMLButtonElement>('button[aria-label="Expand tool details"]')!;
    expect(stdoutToggle).not.toBeNull();
    expect(toolToggle).not.toBeNull();
    await act(async () => { stdoutToggle.click(); toolToggle.click(); });
    toolToggle.focus();
    expect(container.textContent).toContain("<workspace>/Completed.md");
    expect(container.textContent).toContain("Waiting for result");
    await act(async () => { await i18n.changeLanguage("ru"); });
    expect(toolToggle.getAttribute("aria-label")).toBe("Свернуть сведения об инструменте");
    expect(stdoutToggle.getAttribute("aria-label")).toBe("Свернуть stdout");
    expect(document.activeElement).toBe(toolToggle);
    expect(container.querySelector('button[aria-label="Свернуть сведения об инструменте"]')).toBe(toolToggle);
    expect(container.textContent).toContain("Входные данные");
    expect(container.textContent).toContain("<workspace>/Completed.md");
    expect(container.textContent).toContain("<provider>Completed</provider>");
    expect(container.textContent).toContain("Waiting for result");
    expect(container.querySelector('[data-provider-family="plan"] strong')?.textContent).toBe("Completed");
    expect(container.querySelector("provider")).toBeNull();
    expect(JSON.stringify(entries)).toBe(snapshot);
    expect(JSON.stringify(normalizeTranscript(entries, false))).toBe(normalized);
    expect(keyTranscriptBlocks(normalizeTranscript(entries, false)).map(({ key }) => key)).toEqual(keys);
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(toolToggle.getAttribute("aria-label")).toBe("Collapse tool details");
    expect(document.activeElement).toBe(toolToggle);
    expect(container.textContent).toContain("<workspace>/Completed.md");
  });

  it("translates only app-owned result fallbacks and keeps literal result content", async () => {
    await i18n.changeLanguage("ru");
    const base = { kind: "result" as const, ts: "2026-10-26T01:00:00Z", isError: false, errors: [], inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0, subtype: "success" };
    const html = renderToStaticMarkup(<ThemeProvider><RunTranscriptView entries={[
      { ...base, text: "" },
      { ...base, ts: "2026-10-26T01:00:01Z", text: "Completed" },
    ]} /></ThemeProvider>);
    expect(html).toContain("Завершено");
    expect(html).toContain("Completed");
  });

  it("preserves result markdown, canonical blocks and mounted content across EN/RU/EN", async () => {
    const entries: TranscriptEntry[] = [
      { kind: "init", ts: "init-time", model: "model_<raw>", sessionId: "session_<raw>" },
      { kind: "workspace_change", ts: "workspace-time", changeSetId: "change-opaque", revision: 1, source: "runner_verified", complete: true, files: [], totals: { files: 2, additions: 0, deletions: 0 }, patchArtifactRef: null },
      { kind: "result", ts: "result-time", text: "## Provider summary\n\n[Literal provider link](https://example.invalid/result)", inputTokens: 1000, outputTokens: 2000, cachedTokens: 0, costUsd: 0, subtype: "success", isError: false, errors: [] },
    ];
    const original = JSON.stringify(entries);
    const canonical = keyTranscriptBlocks(normalizeTranscript(entries, false));
    const raw = renderToStaticMarkup(<RunTranscriptView entries={entries} mode="raw" />);
    root = createRoot(container);
    await act(async () => root!.render(<ThemeProvider><RunTranscriptView entries={entries} /></ThemeProvider>));
    const heading = container.querySelector("h2")!;
    const link = container.querySelector<HTMLAnchorElement>('a[href="https://example.invalid/result"]')!;
    expect(heading?.textContent).toBe("Provider summary");
    expect(link?.textContent).toBe("Literal provider link");
    link.focus();
    for (const locale of ["ru", "en"]) {
      await act(async () => { await i18n.changeLanguage(locale); });
      expect(keyTranscriptBlocks(normalizeTranscript(entries, false))).toEqual(canonical);
      expect(renderToStaticMarkup(<RunTranscriptView entries={entries} mode="raw" />)).toBe(raw);
      expect(container.querySelector("h2")).toBe(heading);
      expect(container.querySelector('a[href="https://example.invalid/result"]')).toBe(link);
      expect(document.activeElement).toBe(link);
      expect(container.textContent).toContain(locale === "ru" ? "Изменены 2 файла" : "2 changed files");
      expect(container.textContent).toContain("model_<raw>");
      expect(container.textContent).toContain("session_<raw>");
      expect(JSON.stringify(entries)).toBe(original);
    }
  });

  it("preserves raw event content and keys across locale switches", async () => {
    const entries: TranscriptEntry[] = [
      { kind: "init", ts: "2026-10-26T01:00:00Z", model: "model_<raw>", sessionId: "session_opaque" },
      { kind: "tool_call", ts: "2026-10-26T01:00:01Z", name: "read", input: { path: "<workspace>/Completed.md" } },
    ];
    const english = renderToStaticMarkup(<RunTranscriptView entries={entries} mode="raw" />);
    await i18n.changeLanguage("ru");
    expect(renderToStaticMarkup(<RunTranscriptView entries={entries} mode="raw" />)).toBe(english);
  });
  it.each([
    [1, "1 строка журнала", "Изменён 1 файл"],
    [2, "2 строки журнала", "Изменены 2 файла"],
    [5, "5 строк журнала", "Изменено 5 файлов"],
    [21, "21 строка журнала", "Изменён 21 файл"],
  ])("renders Russian transcript quantities for %s without changing event keys", async (count, logLabel, workspaceLabel) => {
    const entries: TranscriptEntry[] = [
      ...Array.from({ length: count }, (_, index): TranscriptEntry => ({ kind: "stderr", ts: String(index), text: "literal provider log" })),
      { kind: "workspace_change", ts: "workspace-time", changeSetId: "change-opaque", revision: 1, source: "runner_verified", complete: true, files: [], totals: { files: count, additions: 0, deletions: 0 }, patchArtifactRef: null },
    ];
    const before = keyTranscriptBlocks(normalizeTranscript(entries, false));
    await i18n.changeLanguage("ru");
    const html = renderToStaticMarkup(<RunTranscriptView entries={entries} />);
    expect(html).toContain(logLabel);
    expect(html).toContain(workspaceLabel);
    expect(html).toContain("Проверено по рабочему пространству");
    expect(keyTranscriptBlocks(normalizeTranscript(entries, false))).toEqual(before);
  });

});
