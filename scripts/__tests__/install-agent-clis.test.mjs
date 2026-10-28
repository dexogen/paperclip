import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "../install-agent-clis.sh");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "paperclip-cli-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, "service home");
  const bin = join(root, "bin");
  const log = join(root, "calls.jsonl");
  mkdirSync(home);
  mkdirSync(bin);
  symlinkSync(process.execPath, join(bin, "node"));
  const executable = (name, body) => writeFileSync(join(bin, name), `#!${process.execPath}\n${body}`, { mode: 0o755 });
  executable("npm", `
    const fs = require('node:fs'), path = require('node:path');
    const args = process.argv.slice(2);
    fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify(['npm', ...args]) + '\\n');
    if (args[0] === 'config') { console.log(process.env.TEST_SCRIPT_POLICY || 'false'); process.exit(0); }
    if (args[0] === 'rebuild') process.exit(process.env.TEST_FAIL_REBUILD ? 19 : 0);
    if (args[0] === 'uninstall') {
      fs.rmSync(path.join(args[args.indexOf('--prefix') + 1], 'lib/node_modules/opencode-ai'), {recursive:true, force:true});
      process.exit(0);
    }
    const pkg = args[0] === 'view' ? args[1].replace(/@latest$/, '') : args.at(-1).replace(/@[^@]+$/, '');
    if (pkg === process.env.TEST_FAIL_PACKAGE) process.exit(17);
    if (args[0] === 'view') { console.log(process.env.TEST_LATEST || '9.8.7'); process.exit(0); }
    const commands = { '@anthropic-ai/claude-code':'claude', '@openai/codex':'codex', '@google/gemini-cli':'gemini', '@opencode/cli':'opencode', '@earendil-works/pi-coding-agent':'pi', '@moonshot-ai/kimi-code':'kimi' };
    const target = path.join(args[args.indexOf('--prefix') + 1], 'bin');
    const pkgDir = path.join(args[args.indexOf('--prefix') + 1], 'lib/node_modules', pkg);
    fs.mkdirSync(pkgDir, {recursive:true}); fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({name:pkg}));
    fs.mkdirSync(target, {recursive:true});
    fs.writeFileSync(path.join(target, commands[pkg]), '#!/bin/sh\\nprintf \\'%s\\\\n\\' \\'' + args.at(-1) + '\\'\\n', {mode:0o755});
  `);
  executable("curl", `
    const fs = require('node:fs');
    const args = process.argv.slice(2);
    fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify(['curl', ...args]) + '\\n');
    const output = args[args.indexOf('-o') + 1];
    if (process.env.TEST_FAIL_DOWNLOAD) { fs.writeFileSync(output, 'exit 0'); process.exit(22); }
    const tool = output.split('/').at(-1).replace('.sh', '');
    const command = tool === 'cursor' ? 'cursor-agent' : tool;
    const directory = tool === 'grok' ? '$HOME/.grok/bin' : '$HOME/.local/bin';
    fs.writeFileSync(output, '#!/bin/bash\\n' +
      'printf \\'%s\\\\n\\' "$*" > "$HOME/' + tool + '-args"\\n' +
      'mkdir -p "' + directory + '"\\n' +
      'printf \\'#!/bin/sh\\\\nprintf "' + tool + ' 9.8.7\\\\\\\\n"\\\\n\\' > "' + directory + '/' + command + '"\\n' +
      'chmod +x "' + directory + '/' + command + '"\\n');
  `);
  return {
    home, bin,
    calls: () => {
      try { return readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse); }
      catch (error) { if (error.code === "ENOENT") return []; throw error; }
    },
    run: (args = [], env = {}) => spawnSync("bash", [script, ...args], {
      encoding: "utf8", timeout: 20000,
      env: { ...process.env, HOME: home, PATH: `${bin}:/usr/local/bin:/usr/bin:/bin`, TEST_CALLS: log, ...env },
    }),
  };
}

test("dry run validates and describes all tools without writes or downloads", (t) => {
  const f = fixture(t);
  const result = f.run(["--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/Verify:/g) || []).length, 9);
  assert.match(result.stdout, /@earendil-works\/pi-coding-agent@latest/);
  assert.deepEqual(f.calls(), []);
  assert.deepEqual(readdirSync(f.home), []);
});

test("all tools install, report versions and pass a subsequent check", (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal((result.stdout.match(/OK /g) || []).length, 9);
  const calls = f.calls();
  assert.equal(calls.filter((c) => c[0] === "npm" && c[1] === "install").length, 6);
  assert.equal(calls.filter((c) => c[0] === "curl").length, 3);
  for (const call of calls.filter((c) => c[0] === "npm" && c[1] !== "config")) {
    assert.ok(call.includes("https://registry.npmjs.org"));
  }
  for (const call of calls.filter((c) => c[1] === "install")) {
    assert.ok(call.includes("--strict-allow-scripts"));
    assert.ok(call.includes("--ignore-scripts=false"));
    assert.ok(call.includes("--dangerously-allow-all-scripts=false"));
    assert.ok(call.some((arg) => arg.startsWith("--allow-scripts=")));
  }
  assert.ok(calls.some((c) => c.includes("--allow-scripts=@moonshot-ai/kimi-code,node-pty")));
  assert.match(readFileSync(join(f.home, "hermes-args"), "utf8"), /--channel stable --non-interactive --skip-browser --skip-computer-use/);
  const checked = f.run(["--check"]);
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.equal(f.calls().length, calls.length, "check must not install or download");
});

test("rerunning queries latest again and replaces the selected version", (t) => {
  const f = fixture(t);
  assert.equal(f.run(["--tools", "codex"]).status, 0);
  const updated = f.run(["--tools", "codex"], { TEST_LATEST: "10.0.0" });
  assert.equal(updated.status, 0, updated.stdout + updated.stderr);
  assert.match(updated.stdout, /OK codex: @openai\/codex@10.0.0/);
  assert.equal(f.calls().filter((c) => c[1] === "view").length, 2);
  assert.equal(f.calls().filter((c) => c[1] === "rebuild").length, 1);
});

test("failed repair of previously skipped install scripts fails despite a working version command", (t) => {
  const f = fixture(t);
  assert.equal(f.run(["--tools", "kimi"]).status, 0);
  const repaired = f.run(["--tools", "kimi"], { TEST_FAIL_REBUILD: "1" });
  assert.equal(repaired.status, 1);
  assert.doesNotMatch(repaired.stdout, /OK kimi:/);
  const rebuild = f.calls().find((c) => c[1] === "rebuild");
  assert.equal(rebuild.at(-1), "node-pty");
  assert.ok(rebuild.includes("--allow-scripts=@moonshot-ai/kimi-code,node-pty"));
});

test("OpenCode migrates the managed V1 npm package to the current V2 distribution", (t) => {
  const f = fixture(t);
  const previous = join(f.home, ".local/lib/node_modules/opencode-ai");
  mkdirSync(previous, { recursive: true });
  writeFileSync(join(previous, "package.json"), '{"name":"opencode-ai"}');
  const result = f.run(["--tools", "opencode"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(f.calls().some((c) => c[1] === "uninstall" && c.at(-1) === "opencode-ai"));
  assert.match(result.stdout, /OK opencode: @opencode\/cli@9.8.7/);
});

test("older npm can install without unsupported script-policy flags", (t) => {
  const f = fixture(t);
  const result = f.run(["--tools", "codex"], { TEST_SCRIPT_POLICY: "undefined" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(f.calls().filter((c) => c[1] === "install").every((c) => !c.includes("--strict-allow-scripts")));
});

test("one failed tool does not stop other installs and never reports overall success", (t) => {
  const f = fixture(t);
  const result = f.run(["--tools", "codex,pi"], { TEST_FAIL_PACKAGE: "@openai/codex" });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /OK pi:/);
  assert.match(result.stderr, /1 tools failed/);
  assert.doesNotMatch(result.stdout, /All selected CLI tools installed/);
});

test("check rejects an unrelated binary on PATH and a broken owned binary", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.bin, "codex"), "#!/bin/sh\necho unrelated-old-cli\n", { mode: 0o755 });
  const missing = f.run(["--check", "--tools", "codex"]);
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /MISSING codex/);
  mkdirSync(join(f.home, ".local/bin"), { recursive: true });
  writeFileSync(join(f.home, ".local/bin/codex"), "#!/bin/sh\nexit 7\n", { mode: 0o755 });
  const broken = f.run(["--check", "--tools", "codex"]);
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /FAILED codex: exit 7/);
});

test("download failure cannot execute partial installer content", (t) => {
  const f = fixture(t);
  const result = f.run(["--tools", "cursor"], { TEST_FAIL_DOWNLOAD: "1" });
  assert.equal(result.status, 1);
  assert.deepEqual(readdirSync(f.home), [".local"]);
});

test("rejects malformed selections and non-stable registry versions before install", (t) => {
  const f = fixture(t);
  for (const args of [
    ["--tools", "codex,typo"], ["--tools", "codex,"], ["--tools", "codex,codex"],
    ["--prefix", "relative"], ["--prefix"], ["--check", "--dry-run"],
  ]) assert.notEqual(f.run(args).status, 0, args.join(" "));
  assert.deepEqual(f.calls(), []);
  const malformed = f.run(["--tools", "codex"], { TEST_LATEST: "1.0.0-preview.1" });
  assert.equal(malformed.status, 1);
  assert.equal(f.calls().filter((c) => c[1] === "install").length, 0);
});
