import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { composerStopProviderScript, composerStopWorkLog } from "./composer-stop-provider.ts";

const runId = "2465c359-877e-4da1-a5d1-387544586e89";
const resumedRunId = "a0e6b184-e28c-49b5-a72c-c8cfdd8905b7";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "composer-stop-provider-unit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const stateDirectory = join(root, "fixture's private directory");
  mkdirSync(stateDirectory);
  const paths = {
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
  const launch = (id = "") => spawnSync(command, ["app-server"], {
    encoding: "utf8", env: { PATH: process.env.PATH, PAPERCLIP_RUN_ID: id },
  });
  return { ...paths, launch };
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
