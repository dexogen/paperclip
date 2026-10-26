import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL: "http://[::1]:3217",
    browserName: "chromium",
    channel: "chromium",
    headless: true,
    serviceWorkers: "block",
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 360, height: 640 }, isMobile: true } },
  ],
  webServer: {
    cwd: path.resolve(import.meta.dirname, "../.."),
    command: "pnpm --filter @paperclipai/ui build && pnpm --filter @paperclipai/ui exec vite preview --host ::1 --port 3217 --strictPort",
    url: "http://[::1]:3217",
    env: { VITE_DEFAULT_LOCALE: "ru" },
    reuseExistingServer: false,
    timeout: 240_000,
  },
  outputDir: "./test-results",
  reporter: [["list"]],
});
