import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanupComposerStopCompany } from "./composer-stop-cleanup.ts";

const companyId = "780e76d6-ac8e-49ec-984d-b5cc589d2fe2";
const agentId = "4a3c41ac-bd57-4886-ad2e-bfb870a0f959";
const runId = "7a36c564-a5f9-4269-949d-3f0f481558d7";
const otherId = "ab47f8cd-8ef9-4d29-b550-67412fb2a106";
const run = { id: runId, companyId, agentId, status: "running" };
const paused = { id: agentId, companyId, lifecycleState: "paused", lifecycleHolds: ["company_archived"], lifecycleError: null };

function fixture(overrides = {}) {
  const calls = [];
  const evidence = [];
  let snapshots = 0;
  const response = (body, status = 200) => ({ status, body });
  const input = {
    companyId,
    agentIds: [agentId],
    request: {
      async patch(url, options) {
        calls.push(["patch", url, options.data]);
        return response({ id: companyId, status: "archived" });
      },
      async get(url) {
        calls.push(["get", url]);
        if (url.endsWith("/live-runs")) return response(snapshots++ === 0 ? [run] : []);
        assert.equal(url, `/api/agents/${agentId}`);
        return response(paused);
      },
      async post(url) {
        calls.push(["post", url]);
        assert.equal(url, `/api/heartbeat-runs/${runId}/cancel`);
        return response({ ...run, status: "cancelled" });
      },
    },
    async json(value) {
      assert.equal(value.status, 200, `HTTP ${value.status}`);
      return value.body;
    },
    async poll(probe) { assert.equal(await probe(), true, "Fixture did not become quiescent"); },
    async restore() { calls.push(["restore"]); },
    async attach(value) { calls.push(["attach"]); evidence.push(value); },
    async removeMarker() { calls.push(["removeMarker"]); },
    ...overrides,
  };
  return { input, calls, evidence, response };
}

test("archives before cancelling the unrelated owned run, then proves public quiescence", async () => {
  const f = fixture();
  await cleanupComposerStopCompany(f.input);
  assert.deepEqual(f.calls.slice(0, 3), [
    ["patch", `/api/companies/${companyId}`, { status: "archived" }],
    ["get", `/api/companies/${companyId}/live-runs`],
    ["post", `/api/heartbeat-runs/${runId}/cancel`],
  ]);
  assert.deepEqual(f.calls.slice(-3), [["restore"], ["attach"], ["removeMarker"]]);
  assert.deepEqual(f.evidence, [{ companyId, status: "passed", liveRunIds: [], agents: [{
    id: agentId, lifecycleState: "paused", lifecycleHolds: ["company_archived"], lifecycleError: null,
  }], cancelledRunIds: [runId] }]);
});

for (const [name, invalid] of [
  ["another company", { ...run, companyId: otherId }],
  ["an unowned agent", { ...run, agentId: otherId }],
  ["a path-shaped run ID", { ...run, id: "../other-run" }],
  ["a duplicate run", run],
]) {
  test(`validates the entire snapshot before cancelling anything when it contains ${name}`, async () => {
    const f = fixture();
    f.input.request.get = async () => f.response([run, invalid]);
    await assert.rejects(cleanupComposerStopCompany(f.input));
    assert.equal(f.calls.some(([method]) => method === "post"), false);
    assert.deepEqual(f.calls.slice(-3), [["restore"], ["attach"], ["removeMarker"]]);
    assert.equal(f.evidence[0].status, "failed");
  });
}

for (const stage of ["patch", "get", "post"]) {
  test(`an HTTP failure during ${stage} is reported while restoration and marker cleanup still run`, async () => {
    const f = fixture();
    f.input.request[stage] = async () => f.response({ error: "fixture failure" }, 500);
    await assert.rejects(cleanupComposerStopCompany(f.input), /HTTP 500/);
    assert.deepEqual(f.calls.slice(-3), [["restore"], ["attach"], ["removeMarker"]]);
    assert.equal(f.evidence[0].status, "failed");
  });
}

test("a cancel response cannot claim a different run or agent", async () => {
  for (const invalid of [{ ...run, id: otherId }, { ...run, companyId: otherId }, { ...run, agentId: otherId }]) {
    const f = fixture();
    f.input.request.post = async () => f.response(invalid);
    await assert.rejects(cleanupComposerStopCompany(f.input));
    assert.deepEqual(f.evidence[0].cancelledRunIds, []);
  }
});

test("empty live-runs alone cannot replace paused, archived-held, error-free agent evidence", async () => {
  const f = fixture();
  let agent = { ...paused, lifecycleState: "pausing" };
  const originalGet = f.input.request.get;
  f.input.request.get = async url => url.endsWith(`/agents/${agentId}`) ? f.response(agent) : originalGet(url);
  f.input.poll = async probe => {
    for (const incomplete of [
      { ...paused, lifecycleState: "pausing" },
      { ...paused, lifecycleHolds: [] },
      { ...paused, lifecycleError: "stop pending" },
    ]) {
      agent = incomplete;
      assert.equal(await probe(), false);
    }
    agent = paused;
    assert.equal(await probe(), true);
  };
  await cleanupComposerStopCompany(f.input);
  assert.equal(f.evidence[0].status, "passed");
});

test("paused agents cannot hide a still-live owned run", async () => {
  const f = fixture();
  f.input.request.get = async url => f.response(url.endsWith("/live-runs") ? [run] : paused);
  await assert.rejects(cleanupComposerStopCompany(f.input), /did not become quiescent/);
  assert.equal(f.evidence[0].status, "failed");
});

test("agent readback must retain the exact owned identity", async () => {
  for (const invalid of [{ ...paused, id: otherId }, { ...paused, companyId: otherId }]) {
    const f = fixture();
    const originalGet = f.input.request.get;
    f.input.request.get = async url => url.endsWith(`/agents/${agentId}`) ? f.response(invalid) : originalGet(url);
    await assert.rejects(cleanupComposerStopCompany(f.input));
    assert.equal(f.evidence[0].status, "failed");
  }
});

test("partial setup without agents still archives and restores the owned company", async () => {
  const f = fixture({ agentIds: [] });
  f.input.request.get = async url => {
    assert.equal(url, `/api/companies/${companyId}/live-runs`);
    return f.response([]);
  };
  await cleanupComposerStopCompany(f.input);
  assert.equal(f.calls.some(([method]) => method === "post"), false);
  assert.deepEqual(f.evidence[0].agents, []);
});

test("a test failure is rethrown unchanged after successful cleanup", async () => {
  const original = new Error("original Stop assertion");
  const f = fixture({ failure: { error: original } });
  await assert.rejects(cleanupComposerStopCompany(f.input), error => error === original);
  assert.equal(f.evidence[0].status, "passed");
});

test("cleanup failures cannot mask the original test error or prevent later cleanup stages", async () => {
  const original = new Error("original Stop assertion");
  const pending = new Error("quiescence not reached");
  const restore = new Error("restore failed");
  const attach = new Error("attachment failed");
  const marker = new Error("marker removal failed");
  const f = fixture({ failure: { error: original } });
  f.input.poll = async () => { throw pending; };
  f.input.restore = async () => { f.calls.push(["restore"]); throw restore; };
  f.input.attach = async () => { f.calls.push(["attach"]); throw attach; };
  f.input.removeMarker = async () => { f.calls.push(["removeMarker"]); throw marker; };
  await assert.rejects(cleanupComposerStopCompany(f.input), error => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [original, pending, restore, attach, marker]);
    assert.equal(error.cause, original);
    for (const failure of error.errors) assert.ok(error.message.includes(failure.message));
    return true;
  });
  assert.deepEqual(f.calls.slice(-3), [["restore"], ["attach"], ["removeMarker"]]);
});
