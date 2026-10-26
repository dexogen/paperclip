import { existsSync, lstatSync, readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startRunnerApiTestServer } from "../../__tests__/helpers/runner-api-server.js";
import { createRunnerdCodexTransport, defaultCapabilityRunnerdBinary } from "../../vendor/paperclip-runner/index.js";
import { createAssignedMcpTools } from "./assigned-mcp-tools.js";
import { PaperclipRunnerToolAuthority } from "./paperclip-runner-tool-authority.js";
import { RUNNER_TOOL_RESULT_MAX_BYTES } from "./runner-tool-results.js";
import type { ToolGatewayService } from "../tool-gateway.js";

function fixtureProgress(stateDirectory: string, progressFile: string) {
  const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  const label = (value: unknown, allowed: readonly string[]) => typeof value === "string" && allowed.includes(value) ? value : "other";
  const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
  const read = (path: string, maximum: number) => {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum || stat.uid !== process.getuid?.()) throw new Error("Fixture diagnostic file is not owned or bounded");
    return readFileSync(path, "utf8");
  };
  const readState = (path: string) => { try { return object(JSON.parse(read(path, 16 * 1024 * 1024))); } catch { return {}; } };
  const core = readState(join(stateDirectory, "control-plane", "control-plane-state.json"));
  const runner = readState(join(stateDirectory, "runner", "runner-state.json"));
  const provider = readState(join(stateDirectory, "runner", "codex-provider-state.json"));
  const commands = ["run.prepare", "run.attach", "session.open", "turn.start", "semantic_tool.result", "turn.stop", "runner.suspend"];
  const statuses = ["pending", "completed", "failed", "rejected", "indeterminate"];
  const events = ["session.started", "session.ready", "turn.started", "turn.completed", "turn.failed", "item.completed", "semantic_tool.input", "process.exited", "diagnostic"];
  const lifecycle = ["new", "ready", "running", "active", "idle", "suspended", "closed", "failed", "recoverable_failure", "completed"];
  let stages: unknown[] = [];
  try { stages = read(progressFile, 16 * 1024).trim().split("\n").filter(Boolean).map(line => JSON.parse(line)); } catch { }
  return {
    stages: stages.slice(-32).map(value => { const stage = object(value); return {
      stage: label(stage.stage, ["received", "pages-verified", "inline-verified", "terminal-sent", "page-invalid", "pages-invalid", "inline-invalid"]),
      step: count(stage.step), at: count(stage.at),
    }; }),
    core: {
      available: Object.keys(core).length > 0,
      commands: list(core.commands).slice(-16).map(value => { const command = object(value); return {
        sequence: count(command.controllerSeq), type: label(command.type, commands), status: label(command.status, statuses),
        issuedAtMs: typeof command.issuedAt === "string" ? count(Date.parse(command.issuedAt)) : null,
        deliveries: count(object(core.commandDeliveryCounts)[String(command.commandId)]),
      }; }),
      events: list(core.committedEvents).slice(-16).map(value => { const event = object(value); return { sequence: count(event.sourceSeq), type: label(event.eventType, events) }; }),
      ackedSourceSeq: count(core.ackedSourceSeq), connectionCount: count(core.connectionCount), malformedFrames: count(core.malformedFrames),
      replayDeliveries: count(core.replayDeliveries), duplicateCommandResults: count(core.duplicateCommandResults),
    },
    runner: { available: Object.keys(runner).length > 0, lifecycle: label(runner.lifecycle, lifecycle),
      nextSourceSeq: count(runner.nextSourceSeq), ackedSourceSeq: count(runner.ackedSourceSeq), lastControllerCommandSeq: count(runner.lastControllerCommandSeq),
      outboxCount: list(runner.outbox).length, backpressure: runner.backpressure === true, recoverableFailure: runner.recoverableFailure != null },
    provider: { available: Object.keys(provider).length > 0, lifecycle: label(provider.lifecycle, lifecycle),
      pendingEvents: list(provider.pendingEvents).length, queuedEvents: list(provider.queuedEvents).length,
      completedTurnAuthoritative: provider.completedTurnAuthoritative === true, hasActiveTurn: typeof provider.activeProviderTurnId === "string" },
  };
}

describe("saved assigned results through actual PRP", () => {
  let server: Awaited<ReturnType<typeof startRunnerApiTestServer>>;
  const oldSecret = process.env.PAPERCLIP_AGENT_JWT_SECRET;
  beforeAll(async () => {
    process.env.PAPERCLIP_AGENT_JWT_SECRET = randomUUID();
    server = await startRunnerApiTestServer();
  }, 60_000);
  afterAll(async () => {
    await server?.close();
    if (oldSecret === undefined) delete process.env.PAPERCLIP_AGENT_JWT_SECRET;
    else process.env.PAPERCLIP_AGENT_JWT_SECRET = oldSecret;
  });

  it.skipIf(!process.env.PAPERCLIP_REQUIRE_RUNNER_API_INTEGRATION && !existsSync(defaultCapabilityRunnerdBinary()))("delivers escape-heavy 500 KB pages through actual PRP without truncation", async () => {
    const fixture = await server.fixture({ apiToolsEnabled: false });
    const original = { content: '🧭é"\\\n\u0000'.repeat(60_000), last: "complete-result" };
    const expected = JSON.stringify(original);
    const digest = createHash("sha256").update(expected).digest("hex");
    const inline = { content: "\\".repeat(200_000) };
    const inlineDigest = createHash("sha256").update(JSON.stringify(inline)).digest("hex");
    const executeTool = vi.fn(async (call: { parameters: Record<string, unknown> }) => ({
      status: "completed" as const, result: call.parameters.variant === "inline" ? inline : original,
    }));
    const assignedMcpTools = await createAssignedMcpTools({
      gatewayPublicId: "fixture", bearerToken: "fixture",
      gateway: {
        listToolsForNamedGateway: async () => [{ name: "app:read", displayName: "Read", description: "Fixture read",
          parametersSchema: { type: "object", properties: { variant: { type: "string", enum: ["large", "inline"] } } },
          pluginId: "fixture", providerType: "mcp_remote_http", risk: "read" }],
        executeTool,
      } as unknown as ToolGatewayService,
    });
    const authority = new PaperclipRunnerToolAuthority(server.db, { ...fixture.authority.binding, assignedMcpTools });
    const provider = join(server.root, "scripted-saved-result-provider.mjs");
    const progressFile = join(server.root, "scripted-saved-result-progress.jsonl");
    const stateDirectory = join(server.root, "scripted-saved-result-runner");
    await writeFile(provider, `#!${process.execPath}
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
const send = value => process.stdout.write(JSON.stringify(value)+'\\n');
let step=0, artifactId, restored='', inlinePending=false;
const mark = stage => appendFileSync(${JSON.stringify(progressFile)},JSON.stringify({stage,step,at:Date.now()})+'\\n',{mode:0o600});
const call = (tool,args) => { step++; send({id:'call-'+step,method:'item/tool/call',params:{threadId:'saved-thread',turnId:'saved-turn',itemId:'item-'+step,callId:'saved-call-'+step,tool,arguments:args}}); };
for await (const line of createInterface({input:process.stdin})) {
  const m=JSON.parse(line);
  if (!m.method) {
    if (String(m.id).startsWith('call-')) {
      mark('received');
      const envelope=JSON.parse(m.result.contentItems[0].text);
      const result=envelope.result ?? envelope;
      if (inlinePending) {
        if(result.artifact || createHash('sha256').update(JSON.stringify(result)).digest('hex')!=='${inlineDigest}') {mark('inline-invalid');throw new Error('Inline result was not delivered intact');}
        mark('inline-verified');
        send({method:'item/completed',params:{threadId:'saved-thread',turnId:'saved-turn',item:{id:'saved-answer',type:'agentMessage',text:'all-pages-verified'}}});
        send({method:'turn/completed',params:{turn:{id:'saved-turn',status:'completed'}}});
        mark('terminal-sent');
      }
      else if (step===1) { artifactId=result.artifact.artifactId; call('read_tool_result',{artifactId,offsetBytes:0}); }
      else {
        if(!result.ok || result.responseText.offsetBytes!==Buffer.byteLength(restored)) {mark('page-invalid');throw new Error('Invalid page receipt');}
        restored+=result.data;
        if(result.responseText.nextOffsetBytes!==null) call('read_tool_result',{artifactId,offsetBytes:result.responseText.nextOffsetBytes});
        else {
          if(createHash('sha256').update(restored).digest('hex')!=='${digest}') {mark('pages-invalid');throw new Error('Provider received incomplete JSON');}
          mark('pages-verified');
          inlinePending=true;
          call('${assignedMcpTools.definitions()[0]!.name}',{variant:'inline'});
        }
      }
    }
    continue;
  }
  if(m.method==='initialize') send({id:m.id,result:{userAgent:'scripted-saved-result-provider'}});
  else if(m.method==='thread/start') send({id:m.id,result:{thread:{id:'saved-thread',sessionId:'saved-session'}}});
  else if(m.method==='turn/start') {send({id:m.id,result:{turn:{id:'saved-turn',status:'inProgress'}}});send({method:'turn/started',params:{turn:{id:'saved-turn'}}});call('${assignedMcpTools.definitions()[0]!.name}',{variant:'large'});}
  else if(m.id!==undefined) send({id:m.id,result:{}});
}
`);
    await chmod(provider, 0o700);
    const runnerBinary = process.env.PAPERCLIP_PRP_TEST_RUNNER_BINARY ?? defaultCapabilityRunnerdBinary();
    console.info("PRP fixture runtime", JSON.stringify({ runnerBinary, node: process.version,
      runnerSha256: createHash("sha256").update(readFileSync(runnerBinary)).digest("hex"),
    }));
    const bundle = createRunnerdCodexTransport({
      runnerBinary, codexCommand: provider, codexArgs: [],
      stateDirectory, lifecyclePolicy: { mode: "per_turn", idleTimeoutMs: null },
      prpIdentity: { runnerInstanceId: "saved-test", environmentLeaseId: "saved-test-lease", runId: fixture.runId,
        normalizedSessionId: "saved-test-session", turnId: "saved-test-turn", itemId: "saved-test-item" },
    });
    const progressStartedAt = Date.now();
    const sizes: Array<{ result: number; wrapper: number; elapsedMs: number }> = [];
    bundle.transport.setServerRequestHandler(async request => {
      const params = request.params;
      const result = await authority.execute({ tool: String(params.tool), arguments: params.arguments, callId: String(params.callId) });
      const response = { success: true, contentItems: [{ type: "inputText", text: JSON.stringify(result) }] };
      sizes.push({ elapsedMs: Date.now() - progressStartedAt, result: Buffer.byteLength(JSON.stringify(result)), wrapper: Buffer.byteLength(JSON.stringify(response)) });
      return response;
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let verified = false;
    let waitPhaseStartedAt: number | null = null;
    const notifications: Array<{ method: string; type: unknown; status?: string; elapsedMs: number }> = [];
    try {
      await bundle.transport.request("initialize", {});
      await bundle.transport.request("thread/start", { cwd: fixture.workspace, dynamicTools: authority.definitions() });
      await bundle.transport.request("turn/start", { input: [{ type: "text", text: "Read every saved result page" }] });
      const waitStartedAt = Date.now();
      waitPhaseStartedAt = waitStartedAt;
      await Promise.race([
        (async () => { for await (const notification of bundle.transport.notifications()) {
          notifications.push({ elapsedMs: Date.now() - progressStartedAt, method: notification.method, type: (notification.params.item as { type?: string })?.type,
            status: (notification.params.turn as { status?: string })?.status });
          if (notification.method === "item/completed" && (notification.params.item as { text?: string })?.text === "all-pages-verified") verified = true;
          if (notification.method === "turn/completed") return;
        } })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Escaped pages did not reach the provider: " + JSON.stringify({
            elapsedMs: Date.now() - waitStartedAt,
            resultCount: sizes.length,
            lastResultBytes: sizes.at(-1)?.result ?? null,
            lastWrapperBytes: sizes.at(-1)?.wrapper ?? null,
            notificationCount: notifications.length,
            sawTurnStarted: notifications.some(({ method }) => method === "turn/started"),
            sawTurnCompleted: notifications.some(({ method }) => method === "turn/completed"),
            verified,
          }))), 15_000);
        }),
      ]);
      expect(verified, JSON.stringify({ sizes, notifications, diagnostics: bundle.evidence().diagnostics })).toBe(true);
      expect(executeTool.mock.calls.map(([call]) => call.parameters)).toEqual([{ variant: "large" }, { variant: "inline" }]);
      expect(sizes.every(size => size.result <= RUNNER_TOOL_RESULT_MAX_BYTES)).toBe(true);
      // The provider-facing text wrapper is decoded before the PRP command.
      // Its larger JSON encoding must not be mistaken for the command's size.
      expect(sizes.some(size => size.wrapper > 700_000)).toBe(true);
      expect(bundle.evidence().diagnostics).toContain("runnerd authenticated to the durable PRP control plane");
    } finally {
      clearTimeout(timer);
      console.info("PRP fixture progress", JSON.stringify({ verified,
        progressStartedAt, waitElapsedMs: waitPhaseStartedAt === null ? null : Date.now() - waitPhaseStartedAt,
        sizes: sizes.slice(-16),
        notifications: notifications.slice(-16).map(({ method, elapsedMs }) => ({
          method: ["thread/started", "turn/started", "item/started", "item/completed", "turn/completed", "error"].includes(method) ? method : "other", elapsedMs,
        })),
        ...fixtureProgress(stateDirectory, progressFile),
      }));
      await bundle.transport.close();
      const evidence = bundle.evidence();
      console.info("PRP fixture cleanup", JSON.stringify({ runnerExited: evidence.runnerExited, runnerExitCode: evidence.runnerExitCode }));
    }
  }, 30_000);
});
