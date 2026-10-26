import assert from "node:assert/strict";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_STATE_BYTES = 1024 * 1024;
const RUN_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function composerStopRunIdentity(runtimeRoot, codexHome, ownerUid = process.getuid?.()) {
  assert(Number.isInteger(ownerUid), "Composer Stop requires an observable Unix owner");
  for (const path of [runtimeRoot, codexHome]) {
    assert(typeof path === "string" && isAbsolute(path) && !path.includes("\0"), "Composer Stop requires absolute runtime paths");
    assert(resolve(path) === path, "Composer Stop requires canonical runtime paths");
  }
  const parts = relative(runtimeRoot, codexHome).split(sep);
  assert(parts.length === 2 && /^[a-zA-Z0-9_-]+$/.test(parts[0]) && parts[1] === "codex-home", "Composer Stop Codex home must belong to the owned runtime root");
  const sessionRoot = dirname(codexHome);
  const runnerDirectory = join(sessionRoot, "runner");
  for (const path of [runtimeRoot, sessionRoot, codexHome, runnerDirectory]) {
    const stat = lstatSync(path);
    assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === ownerUid, "Composer Stop runtime directory ownership mismatch");
    assert(realpathSync(path) === path, "Composer Stop runtime paths must not contain symlinks");
  }
  const statePath = join(runnerDirectory, "runner-state.json");
  const descriptor = openSync(statePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(descriptor);
    assert(stat.isFile() && stat.uid === ownerUid && stat.size > 0 && stat.size <= MAX_STATE_BYTES, "Composer Stop requires a bounded owned regular state file");
    assert(realpathSync(statePath) === statePath, "Composer Stop state must not be a symlink");
    const bytes = Buffer.alloc(stat.size + 1);
    let total = 0;
    while (total < bytes.length) {
      const count = readSync(descriptor, bytes, total, bytes.length - total, total);
      if (!count) break;
      total += count;
    }
    assert(total === stat.size, "Composer Stop state changed during reading");
    const state = JSON.parse(bytes.subarray(0, total).toString("utf8"));
    assert(state && typeof state === "object" && !Array.isArray(state) && state.schema === "paperclip.runner.durable.state.v1", "Composer Stop runtime state schema mismatch");
    assert(typeof state.runId === "string" && RUN_ID.test(state.runId), "Composer Stop held work requires a task run UUID");
    return state.runId;
  } finally {
    closeSync(descriptor);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert(process.argv.length === 3, "Composer Stop run identity expects one runtime root");
    process.stdout.write(composerStopRunIdentity(process.argv[2], process.env.CODEX_HOME));
  } catch {
    process.stderr.write("Composer Stop cannot bind held work to an owned durable run identity\n");
    process.exitCode = 2;
  }
}
