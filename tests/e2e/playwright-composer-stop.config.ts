import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import { composerStopProviderScript } from "./fixtures/composer-stop-provider";

// Opt-in native coverage uses real runnerd with the repo's deterministic Codex
// protocol fixture. Never let this suite fall through to a logged-in real Codex.
const fixture = process.env.PAPERCLIP_STOP_FAKE_CODEX;
const fixtureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "composer-stop-provider-"),
);
const logPath =
  process.env.PAPERCLIP_STOP_CODEX_LOG ??
  path.join(fixtureDir, "codex-calls.log");
process.env.PAPERCLIP_STOP_CODEX_LOG = logPath;
const holdFile = process.env.PAPERCLIP_STOP_HOLD_FILE ?? path.join(fixtureDir, "hold-work-turns");
const workLogDirectory = process.env.PAPERCLIP_STOP_WORK_LOG_DIR ?? path.join(fixtureDir, "work-calls");
process.env.PAPERCLIP_STOP_HOLD_FILE = holdFile;
process.env.PAPERCLIP_STOP_WORK_LOG_DIR = workLogDirectory;
if (fixture) {
  if (!path.isAbsolute(fixture) || !fs.existsSync(fixture))
    throw new Error(
      "PAPERCLIP_STOP_FAKE_CODEX must name the built fake-codex-app-server binary",
    );
  fs.mkdirSync(path.join(fixtureDir, "codex-home"));
  const providerScript = composerStopProviderScript({ binary: fixture, stateDirectory: fixtureDir, holdFile, setupLog: logPath, workLogDirectory });
  fs.mkdirSync(workLogDirectory, { recursive: true, mode: 0o700 });
  if (fs.existsSync(holdFile)) throw new Error("Composer Stop work marker already exists");
  fs.writeFileSync(
    path.join(fixtureDir, "codex"),
    providerScript,
    { mode: 0o755 },
  );
}
const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error("Composer Stop requires one isolated test server");
export default defineConfig({
  ...base,
  testMatch: "composer-stop.spec.ts",
  timeout: 90_000,
  webServer: {
    ...server,
    env: {
      ...server?.env,
      HEARTBEAT_SCHEDULER_INTERVAL_MS: "10000",
      PATH: `${fixtureDir}${path.delimiter}${process.env.PATH ?? ""}`,
      ...(fixture ? {
        // Provider selection prefers the installed dependency over PATH.
        // Scope this override and its empty credential home to the test server.
        PAPERCLIP_STOP_CODEX_COMMAND: path.join(fixtureDir, "codex"),
        CODEX_HOME: path.join(fixtureDir, "codex-home"),
        OPENAI_API_KEY: "composer-stop-fixture-key",
        NODE_OPTIONS: `${server?.env?.NODE_OPTIONS ?? ""} --import=${path.resolve(import.meta.dirname, "fixtures/composer-stop-codex-loader.mjs")}`,
      } : {}),
    },
  },
});
