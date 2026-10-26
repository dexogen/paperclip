import { t as fullSharedTailT, Trans as FullSharedTailTrans, useTranslation as useFullSharedTailTranslation } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, TimerReset } from "lucide-react";
import { healthApi, type DevServerHealthStatus } from "../api/health";
import { Badge } from "@/components/ui/badge";

const RESTART_PENDING_RESET_MS = 30_000;

function formatRelativeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;

  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) return "just now";
  const deltaMinutes = Math.round(deltaMs / 60_000);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function describeReason(devServer: DevServerHealthStatus): string {
  if (devServer.reason === "backend_changes_and_pending_migrations") {
    return "backend files changed and migrations are pending";
  }
  if (devServer.reason === "pending_migrations") {
    return "pending migrations need a fresh boot";
  }
  return "backend files changed since this server booted";
}

export function DevRestartBanner({ devServer }: { devServer?: DevServerHealthStatus }) {
  useFullSharedTailTranslation();
  useFullSharedTranslation();
  const [restartPending, setRestartPending] = useState(false);
  useEffect(() => {
    if (!restartPending) return;
    const timeout = window.setTimeout(() => {
      setRestartPending(false);
    }, RESTART_PENDING_RESET_MS);
    return () => window.clearTimeout(timeout);
  }, [restartPending]);

  if (!devServer?.enabled || !devServer.restartRequired) return null;

  const currentDevServer = devServer;
  const changedAt = formatRelativeTimestamp(devServer.lastChangedAt);
  const sample = devServer.changedPathsSample.slice(0, 3);
  const activeRunLabel = fullSharedTailT("fullSharedTail.liveRuns", { count: devServer.activeRunCount });

  async function requestRestartNow() {
    const warning =
      currentDevServer.activeRunCount > 0
        ? `Restart Paperclip now? This may interrupt ${activeRunLabel}.`
        : "Restart Paperclip now?";
    if (!window.confirm(warning)) return;

    setRestartPending(true);
    try {
      await healthApi.requestDevServerRestart();
    } catch (error) {
      setRestartPending(false);
      window.alert(error instanceof Error ? error.message : fullSharedT("fullShared.failed_to_request_restart_807a9e"));
    }
  }

  return (
    <div className="border-b border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-col gap-3 px-3 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-(--tracking-caps)">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{fullSharedT("fullShared.restart_required_5e0716")}</span>
            {devServer.autoRestartEnabled ? (
              <Badge variant="ghost" className="bg-amber-900/10 text-(length:--text-nano) tracking-(--tracking-eyebrow) dark:bg-amber-100/10">{fullSharedT("fullShared.auto_restart_on_0bf77a")}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm">
            {describeReason(devServer)}
            {changedAt ? fullSharedT("fullShared.updated_4a05f3", { value1: changedAt }) : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-900/80 dark:text-amber-100/75">
            {sample.length > 0 ? (
              <span><FullSharedTrans i18nKey="fullShared.changed_721802" components={{ part1: <>{sample.join(", ")}</>, part2: <>{devServer.changedPathCount > sample.length ? fullSharedTailT("fullSharedTail.more_2c36e0", { value1: devServer.changedPathCount - sample.length }) : ""}</> }} /></span>
            ) : null}
            {devServer.pendingMigrations.length > 0 ? (
              <span><FullSharedTrans i18nKey="fullShared.pending_migrations_c8781d" components={{ part1: <>{devServer.pendingMigrations.slice(0, 2).join(", ")}</>, part2: <>{devServer.pendingMigrations.length > 2 ? fullSharedTailT("fullSharedTail.more_2c36e0", { value1: devServer.pendingMigrations.length - 2 }) : ""}</> }} /></span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium md:justify-end">
          {devServer.waitingForIdle ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <TimerReset className="h-3.5 w-3.5" />
              <span><FullSharedTrans i18nKey="fullShared.waiting_for_to_finish_7b15d9" components={{ part1: <>{activeRunLabel}</> }} /></span>
            </div>
          ) : devServer.autoRestartEnabled ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{fullSharedT("fullShared.auto_restart_will_trigger_when_the_instance_is_idle_f49f9a")}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <RotateCcw className="h-3.5 w-3.5" />
              <span><FullSharedTrans i18nKey="fullShared.restart_after_the_active_work_is_safe_to_interrupt_02ae43" components={{ part1: <code>pnpm dev:once</code> }} /></span>
            </div>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
            onClick={() => {
              void requestRestartNow();
            }}
            disabled={restartPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{restartPending ? fullSharedT("fullShared.restart_requested_8427d2") : fullSharedT("fullShared.restart_now_09af10")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
