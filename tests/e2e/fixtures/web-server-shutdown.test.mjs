import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function identity(pid) {
  try {
    const proc = `/proc/${pid}`;
    const fields = fs.readFileSync(`${proc}/stat`, "utf8").split(/\) /).at(-1).split(" ");
    const uid = Number(fs.readFileSync(`${proc}/status`, "utf8").match(/^Uid:\s+(\d+)/m)?.[1]);
    return { pid, uid, parent: Number(fields[1]), state: fields[0], startTicks: fields[19] };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ESRCH") return null;
    throw error;
  }
}

function liveOwned(observed) {
  return [...observed.values()].flatMap((previous) => {
    const current = identity(previous.pid);
    if (!current || current.state === "Z") return [];
    assert.equal(current.uid, process.getuid());
    assert.equal(current.startTicks, previous.startTicks, "An observed PID was reused");
    return [current];
  });
}

function observeDescendants(observed) {
  const current = fs.readdirSync("/proc").filter((name) => /^\d+$/.test(name)).map(Number).map(identity)
    .filter((entry) => entry && entry.uid === process.getuid() && entry.state !== "Z");
  const parents = new Set(liveOwned(observed).map((entry) => entry.pid));
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of current) {
      if (parents.has(entry.parent) && !parents.has(entry.pid)) {
        observed.set(entry.pid, entry);
        parents.add(entry.pid);
        changed = true;
      }
    }
  }
}

async function stopOwned(observed) {
  for (const signal of ["SIGTERM", "SIGKILL"]) {
    observeDescendants(observed);
    for (const entry of liveOwned(observed).reverse()) {
      try { process.kill(entry.pid, signal); } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
    const deadline = Date.now() + 5_000;
    while (liveOwned(observed).length && Date.now() < deadline) {
      observeDescendants(observed);
      await delay(50);
    }
    if (!liveOwned(observed).length) return;
  }
  assert.deepEqual(liveOwned(observed), [], "Owned test processes did not stop");
}

async function availablePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function listens(port, signal) {
  return await new Promise((resolve, reject) => {
    const socket = net.connect({ port, host: "127.0.0.1", signal });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve(false);
      else reject(error);
    });
  });
}

test("the shipped Playwright server shuts down its real PostgreSQL cluster", { timeout: 200_000 }, async (t) => {
  assert.equal(process.platform, "linux", "This real-process qualification requires Linux /proc");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pw-stop-"));
  fs.chmodSync(directory, 0o700);
  const port = await availablePort();
  const reportPath = path.join(directory, "playwright.private.json");
  const runtimePath = path.join(directory, "runtime.json");
  const logPath = path.join(directory, "playwright.private.log");
  const configPath = path.join(directory, "playwright.config.ts");
  const summary = { directory, status: "running", port, originalMarkersRemoved: false };
  const observed = new Map();
  let observer;
  let observerError;
  let child;
  let exit;
  let failure;
  const log = fs.openSync(logPath, "wx", 0o600);
  for (const name of ["home", "tmp"]) fs.mkdirSync(path.join(directory, name), { mode: 0o700 });
  fs.writeFileSync(path.join(directory, "package.json"), '{"type":"module"}\n', { mode: 0o600 });
  fs.writeFileSync(configPath, `import base from ${JSON.stringify(path.join(root, "tests/e2e/playwright.config.ts"))};
export default { ...base, testDir: ${JSON.stringify(directory)}, testMatch: "health.spec.ts", reporter: [["json", { outputFile: ${JSON.stringify(reportPath)} }]], outputDir: ${JSON.stringify(path.join(directory, "artifacts"))} };
`, { mode: 0o600 });
  fs.writeFileSync(path.join(directory, "health.spec.ts"), `import { test, expect } from ${JSON.stringify(fileURLToPath(import.meta.resolve("@playwright/test")))};
import fs from "node:fs";
import path from "node:path";
test("real isolated server health", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect((await response.json()).deploymentMode).toBe("local_trusted");
  const instance = path.dirname(process.env.PAPERCLIP_E2E_SERVER_CONFIG!);
  const runtime = JSON.parse(fs.readFileSync(path.join(instance, "runtime-info.json"), "utf8"));
  const dataDir = path.join(instance, "db");
  const marker = fs.readFileSync(path.join(dataDir, "postmaster.pid"), "utf8").split("\\n");
  expect(runtime.port).toBe(${port});
  expect(marker[1]).toBe(dataDir);
  const records = [runtime.pid, Number(marker[0])].map(pid => {
    const fields = fs.readFileSync(\`/proc/\${pid}/stat\`, "utf8").split(/\\) /).at(-1)!.split(" ");
    const uid = Number(fs.readFileSync(\`/proc/\${pid}/status\`, "utf8").match(/^Uid:\\s+(\\d+)/m)?.[1]);
    expect(uid).toBe(process.getuid!());
    return { pid, uid, startTicks: fields[19] };
  });
  fs.writeFileSync(${JSON.stringify(runtimePath)}, JSON.stringify({ instance, dataDir, postgresPort: Number(marker[3]), records }), { mode: 0o600 });
});
`, { mode: 0o600 });
  try {
    const allowed = ["PATH", "USER", "LOGNAME", "LANG", "LC_ALL", "TZ", "RUSTUP_HOME", "CARGO_HOME", "PNPM_HOME"];
    const env = Object.fromEntries(allowed.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
    Object.assign(env, {
      HOME: path.join(directory, "home"), TMPDIR: path.join(directory, "tmp"), CI: "true", NODE_ENV: "test",
      VITE_DEFAULT_LOCALE: "en", PAPERCLIP_E2E_PORT: String(port), NODE_OPTIONS: "--max-old-space-size=4096",
    });
    child = spawn(process.execPath, [require.resolve("@playwright/test/cli"), "test", "--config", configPath, "--workers=1"], {
      cwd: root, env, detached: true, stdio: ["ignore", log, log],
    });
    assert.ok(child.pid);
    const first = identity(child.pid);
    assert.ok(first);
    assert.equal(first.uid, process.getuid());
    observed.set(first.pid, first);
    exit = once(child, "exit");
    observer = setInterval(() => {
      try { observeDescendants(observed); } catch (error) { observerError ??= error; }
    }, 50);
    const [code, signal] = await Promise.race([
      exit,
      new Promise((_, reject) => t.signal.addEventListener("abort", () => reject(t.signal.reason), { once: true })),
    ]);
    summary.exitCode = code;
    summary.exitSignal = signal;
    assert.ifError(observerError);
    assert.equal(code, 0, `Playwright failed; private evidence: ${directory}`);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert.equal(report.stats.expected, 1);
    assert.equal(report.stats.unexpected + report.stats.flaky + report.stats.skipped, 0);
    assert.deepEqual(report.errors, []);
    const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
    assert.ok(runtime.instance.startsWith(path.join(directory, "tmp") + path.sep));
    for (const item of runtime.records) {
      const previous = observed.get(item.pid);
      assert.ok(previous, "Runtime PID was not observed as an owned descendant");
      assert.equal(previous.uid, item.uid);
      assert.equal(previous.startTicks, item.startTicks);
    }
    summary.runtime = runtime;
    summary.liveProcesses = liveOwned(observed);
    summary.appListener = await listens(port, t.signal);
    summary.postgresListener = await listens(runtime.postgresPort, t.signal);
    summary.postmasterMarkerExists = fs.existsSync(path.join(runtime.dataDir, "postmaster.pid"));
    const output = fs.readFileSync(logPath, "utf8");
    summary.orderedPostgresStopLogged = output.includes("Stopping embedded PostgreSQL");
    summary.postgresShutdownFailed = output.includes("Failed to stop embedded PostgreSQL cleanly");
    summary.postgresRecoveryStarted = output.includes("Embedded PostgreSQL exited unexpectedly; attempting recovery");
    assert.deepEqual(summary.liveProcesses, []);
    assert.equal(summary.appListener, false);
    assert.equal(summary.postgresListener, false);
    assert.equal(summary.postmasterMarkerExists, false, "Playwright killed PostgreSQL before its marker was removed");
    assert.equal(summary.orderedPostgresStopLogged, true, "The server did not reach ordered PostgreSQL shutdown");
    assert.equal(summary.postgresShutdownFailed, false);
    assert.equal(summary.postgresRecoveryStarted, false, "Group shutdown raced the PostgreSQL owner");
    summary.status = "passed";
  } catch (error) {
    failure = error;
    summary.status = "failed";
    summary.failureKind = error.name;
  } finally {
    clearInterval(observer);
    try {
      await stopOwned(observed);
      if (exit) await exit;
      summary.processCleanup = "passed";
    } catch (error) {
      summary.status = "failed";
      summary.processCleanup = "unconfirmed";
      failure = failure ? new AggregateError([failure, error], "Shutdown test and cleanup failed") : error;
    }
    fs.closeSync(log);
    fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
    t.diagnostic(`Private evidence: ${directory}`);
  }
  if (failure) throw failure;
});
