import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { composerStopProviderScript, composerStopWorkLog } from "./composer-stop-provider.ts";
import { composerStopRunIdentity } from "./composer-stop-run-identity.mjs";

const runId = "2465c359-877e-4da1-a5d1-387544586e89";
const resumedRunId = "a0e6b184-e28c-49b5-a72c-c8cfdd8905b7";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "composer-stop-provider-unit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const stateDirectory = join(root, "fixture's private directory");
  mkdirSync(stateDirectory);
  const runtimeRoot = join(root, "owned-runtime");
  const sessionRoot = join(runtimeRoot, "a".repeat(64));
  const codexHome = join(sessionRoot, "codex-home");
  const runnerDirectory = join(sessionRoot, "runner");
  mkdirSync(codexHome, { recursive: true, mode: 0o700 });
  mkdirSync(runnerDirectory, { mode: 0o700 });
  const stateFile = join(runnerDirectory, "runner-state.json");
  const paths = {
    nodeBinary: process.execPath,
    runIdentityScript: fileURLToPath(new URL("./composer-stop-run-identity.mjs", import.meta.url)),
    runtimeRoot,
    binary: join(stateDirectory, "fake-provider"),
    stateDirectory,
    holdFile: join(stateDirectory, "hold-work-turns"),
    setupLog: join(stateDirectory, "setup-calls.log"),
    workLogDirectory: join(stateDirectory, "work-calls"),
  };
  mkdirSync(paths.workLogDirectory);
  writeFileSync(paths.binary, `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(args[args.indexOf("--call-log") + 1], "turn/start\\n");
process.stdout.write(JSON.stringify(args));
`, { mode: 0o755 });
  const command = join(stateDirectory, "codex");
  writeFileSync(command, composerStopProviderScript(paths), { mode: 0o755 });
  const launch = (id = "") => {
    if (id) writeFileSync(stateFile, JSON.stringify({ schema: "paperclip.runner.durable.state.v1", runId: id, itemId: `item-${id}` }), { mode: 0o600 });
    else rmSync(stateFile, { force: true });
    return spawnSync(command, ["app-server"], {
      encoding: "utf8", env: { PATH: process.env.PATH, CODEX_HOME: codexHome },
    });
  };
  return { ...paths, launch, stateFile, codexHome, sessionRoot, runnerDirectory, command };
}

test("the mandatory setup hello can complete before work is held", (t) => {
  const f = fixture(t);
  for (let i = 0; i < 5; i++) {
    const result = f.launch(`run_lab_environment_probe_${i}`);
    assert.equal(result.status, 0, result.stderr);
    const args = JSON.parse(result.stdout);
    assert.equal(args.includes("--hold-turn"), false);
    assert.equal(args[args.indexOf("--call-log") + 1], f.setupLog);
    assert.equal(args.at(-1), "app-server");
  }
  assert.equal(readFileSync(f.setupLog, "utf8"), "turn/start\n".repeat(5));
  assert.deepEqual(readdirSync(f.workLogDirectory), []);
});

test("work is held only after the owned marker and evidence is bound to each run", (t) => {
  const f = fixture(t);
  writeFileSync(f.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
  for (const id of [runId, resumedRunId]) {
    const result = f.launch(id);
    assert.equal(result.status, 0, result.stderr);
    const args = JSON.parse(result.stdout);
    assert.equal(args.includes("--hold-turn"), true);
    assert.equal(args[args.indexOf("--call-log") + 1], composerStopWorkLog(f.workLogDirectory, id));
    assert.notEqual(args[args.indexOf("--call-log") + 1], f.setupLog);
    assert.equal(readFileSync(composerStopWorkLog(f.workLogDirectory, id), "utf8"), "turn/start\n");
  }
  assert.deepEqual(readdirSync(f.workLogDirectory).sort(), [`${runId}.log`, `${resumedRunId}.log`].sort());
});

test("setup or missing identities cannot count as a held work run", (t) => {
  const f = fixture(t);
  writeFileSync(f.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
  for (const id of ["", "run_lab_environment_probe", "../other-run"]) {
    const result = f.launch(id);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.throws(() => composerStopWorkLog(f.workLogDirectory, id), /task run UUID/);
  }
});

test("a different suite marker cannot change this fixture or its setup log", (t) => {
  const held = fixture(t);
  const untouched = fixture(t);
  writeFileSync(held.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
  const result = untouched.launch("run_lab_environment_probe");
  assert.equal(result.status, 0, result.stderr);
  const args = JSON.parse(result.stdout);
  assert.equal(args.includes("--hold-turn"), false);
  assert.equal(args[args.indexOf("--call-log") + 1], untouched.setupLog);
});


test("a forged inherited run ID cannot replace the durable task identity", (t) => {
  const f = fixture(t);
  f.launch(runId);
  writeFileSync(f.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
  const result = spawnSync(f.command, ["app-server"], {
    encoding: "utf8", env: { PATH: process.env.PATH, CODEX_HOME: f.codexHome, PAPERCLIP_RUN_ID: resumedRunId },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(f.workLogDirectory), [`${runId}.log`]);
  assert.equal(readFileSync(composerStopWorkLog(f.workLogDirectory, runId), "utf8"), "turn/start\n");
});

for (const [name, content] of [
  ["wrong schema", JSON.stringify({ schema: "other.schema", runId })],
  ["missing run", JSON.stringify({ schema: "paperclip.runner.durable.state.v1" })],
  ["setup identity", JSON.stringify({ schema: "paperclip.runner.durable.state.v1", runId: "run_lab_environment_probe" })],
  ["path-shaped identity", JSON.stringify({ schema: "paperclip.runner.durable.state.v1", runId: "../other-run" })],
  ["malformed JSON", "{"],
  ["empty state", ""],
  ["oversized state", " ".repeat(1024 * 1024 + 1)],
]) {
  test(`held work rejects ${name} without provider calls`, (t) => {
    const f = fixture(t);
    writeFileSync(f.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
    writeFileSync(f.stateFile, content, { mode: 0o600 });
    const result = spawnSync(f.command, ["app-server"], {
      encoding: "utf8", env: { PATH: process.env.PATH, CODEX_HOME: f.codexHome },
    });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "Composer Stop cannot bind held work to an owned durable run identity\n");
    assert.deepEqual(readdirSync(f.workLogDirectory), []);
  });
}

test("held work cannot use another disposable suite's durable state", (t) => {
  const f = fixture(t);
  const other = fixture(t);
  other.launch(runId);
  writeFileSync(f.holdFile, "hold\n", { flag: "wx", mode: 0o600 });
  const result = spawnSync(f.command, ["app-server"], {
    encoding: "utf8", env: { PATH: process.env.PATH, CODEX_HOME: other.codexHome },
  });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.deepEqual(readdirSync(f.workLogDirectory), []);
});

for (const target of ["runtimeRoot", "sessionRoot", "codexHome", "runnerDirectory", "stateFile"]) {
  test(`rejects a symlink at the ${target} boundary`, (t) => {
    const f = fixture(t);
    f.launch(runId);
    const path = f[target];
    const moved = `${path}-original`;
    renameSync(path, moved);
    symlinkSync(moved, path);
    assert.throws(() => composerStopRunIdentity(f.runtimeRoot, f.codexHome));
    assert.deepEqual(readdirSync(f.workLogDirectory), []);
  });
}

test("requires a regular file and the expected Unix owner", (t) => {
  const f = fixture(t);
  f.launch(runId);
  assert.throws(() => composerStopRunIdentity(f.runtimeRoot, f.codexHome, process.getuid() + 1), /ownership mismatch/);
  rmSync(f.stateFile);
  mkdirSync(f.stateFile);
  assert.throws(() => composerStopRunIdentity(f.runtimeRoot, f.codexHome), /regular state file/);
});
