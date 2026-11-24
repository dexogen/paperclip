import { t as translateUi } from "@/i18n";
import type { TFunction } from "i18next";
import { useTranslation } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CornerDownRight,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type {
  IssueQueuedCommentEntry,
  IssueQueuedCommentQueue,
} from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { TaskChatComposerBar } from "./TaskChatComposerBar";
import {
  queuedMessageAutoSteerDeadline,
  queuedMessageAutoSteerEligible,
  queuedMessageAutoSteerKey,
} from "./queued-message-auto-steer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type QueueAction = "steer" | "interrupt" | "discard" | null;

type QueueAnnouncement = { kind: "autoSteer" } | { kind: "deferred" } | { kind: "moved"; position: number; total: number }
  | { kind: "action"; phase: "pending" | "done"; action: Exclude<QueueAction, null>; waitingForStop?: boolean };
type QueueError = "reorderConflict" | "reorderError" | "alreadySending" | "steerError"
  | "interruptError" | "sendError" | "revisionConflict" | "discardError";

function queueAnnouncementText(announcement: QueueAnnouncement | null, t: TFunction): string {
  if (!announcement) return "";
  if (announcement.kind === "autoSteer") return t("taskChatUi.queue.autoSteer");
  if (announcement.kind === "deferred") return t("taskChatUi.queue.stillQueued");
  if (announcement.kind === "moved") return t("taskChatUi.queue.moved", { position: announcement.position, total: announcement.total });
  if (announcement.phase === "pending") {
    if (announcement.action === "steer") return t("taskChatUi.queue.steering");
    if (announcement.action === "interrupt") return t("taskChatUi.queue.sending");
    return t("taskChatUi.queue.discarding");
  }
  if (announcement.action === "steer") return t("taskChatUi.queue.steered");
  if (announcement.action === "interrupt") return announcement.waitingForStop ? t("taskChatUi.queue.waitingForStop") : t("taskChatUi.queue.submitted");
  return t("taskChatUi.queue.discarded");
}

function queueErrorText(error: QueueError | null, t: TFunction): string | null {
  switch (error) {
    case "reorderConflict": return t("taskChatUi.queue.reorderConflict");
    case "reorderError": return t("taskChatUi.queue.reorderError");
    case "alreadySending": return t("taskChatUi.queue.alreadySending");
    case "steerError": return t("taskChatUi.queue.steerError");
    case "sendError": return t("taskChatUi.queue.sendError");
    case "interruptError": return t("taskChatUi.queue.interruptError");
    case "revisionConflict": return t("taskChatUi.queue.revisionConflict");
    case "discardError": return t("taskChatUi.queue.discardError");
    default: return null;
  }
}


export function reorderQueuedMessageEntries(
  entries: IssueQueuedCommentEntry[],
  activeId: string,
  overId: string,
) {
  if (entries.some((entry) => entry.source?.kind === "interaction")) return null;
  const from = entries.findIndex((entry) => entry.comment.id === activeId);
  const to = entries.findIndex((entry) => entry.comment.id === overId);
  if (from < 0 || to < 0 || from === to) return null;
  return arrayMove(entries, from, to).map((entry, position) => ({
    ...entry,
    position,
  }));
}

/**
 * People see one readable line. A saved card response also carries a typed
 * JSON receipt for the agent; it never reaches a label or a hover.
 */
export function queuedMessageLabel(entry: IssueQueuedCommentEntry): string {
  if (entry.source?.kind !== "interaction") return entry.comment.body;
  const summary = entry.source.summary?.trim();
  return summary || entry.comment.body.split("\n")[0] || "Saved response";
}

function queueActionErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const body = (error as { body?: unknown }).body;
  if (typeof body !== "object" || body === null) return null;
  const directCode = (body as { code?: unknown }).code;
  if (typeof directCode === "string") return directCode;
  const details = (body as { details?: unknown }).details;
  if (typeof details !== "object" || details === null) return null;
  const detailCode = (details as { code?: unknown }).code;
  return typeof detailCode === "string" ? detailCode : null;
}

export interface TaskChatQueuedMessagesProps {
  queue: IssueQueuedCommentQueue;
  onEdit: (commentId: string) => void;
  onReorder: (orderedCommentIds: string[], revision: string) => Promise<void>;
  onSteer: (commentId: string, revision: string) => Promise<void>;
  onInterrupt?: () => Promise<IssueQueuedCommentQueue | void>;
  onDiscard: (commentId: string, revision: string) => Promise<void>;
  /** The queued message open in the editor; its automatic send waits for the save. */
  editingCommentId?: string | null;
  /** Steer eligible queued messages automatically after this delay; null keeps every message queued. */
  autoSteerDelayMs?: number | null;
}

function SortableQueuedMessage({
  entry,
  queue,
  busy,
  queueMutationDisabled,
  action,
  autoSteerSecondsLeft,
  onEdit,
  onSteer,
  onInterrupt,
  onDiscard,
  onCancelAutoSteer,
}: {
  entry: IssueQueuedCommentEntry;
  queue: IssueQueuedCommentQueue;
  busy: boolean;
  queueMutationDisabled: boolean;
  action: QueueAction;
  /** Seconds until this message is steered automatically, or null when it waits in the queue. */
  autoSteerSecondsLeft: number | null;
  onEdit: () => void;
  onSteer: () => void;
  onInterrupt?: () => void;
  onDiscard: () => void;
  onCancelAutoSteer: () => void;
}) {
  const { t } = useTranslation();
  const immutableResponse = entry.source?.kind === "interaction";
  const label = queuedMessageLabel(entry);
  const sortable = useSortable({
    id: entry.comment.id,
    disabled: queueMutationDisabled || immutableResponse,
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const steerDisabled =
    queueMutationDisabled || queue.steeringDisposition !== "available";
  const steerTitle =
    queue.steeringDisposition === "unsupported"
      ? t("taskChatUi.queue.unsupported")
      : queue.steeringDisposition === "temporarily_unavailable"
        ? t("taskChatUi.queue.unavailable")
        : t("taskChatUi.queue.steerHint");

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "group flex h-11 min-w-0 items-center gap-1 border-b border-border/55 bg-card/95 px-2.5 text-sm last:border-b-0",
        sortable.isDragging &&
          "relative z-20 rounded-lg border border-border shadow-lg",
      )}
      data-testid={`task-chat-queued-message-${entry.comment.id}`}
    >
      <button
        type="button"
        ref={sortable.setActivatorNodeRef}
        {...sortable.attributes}
        {...sortable.listeners}
        disabled={queueMutationDisabled || immutableResponse}
        aria-label={t("taskChatUi.queue.reorderName", { body: label })}
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      <CornerDownRight
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate px-1" title={label}>
        {label}
      </span>

      {autoSteerSecondsLeft !== null ? (
        <span className="flex shrink-0 items-center gap-1" data-testid={`task-chat-queued-auto-steer-${entry.comment.id}`}>
          <span className="px-1 text-xs text-muted-foreground tabular-nums">
            {t("taskChatUi.queue.sendIn", { seconds: autoSteerSecondsLeft })}
          </span>
          <button
            type="button"
            onClick={onEdit}
            disabled={!entry.canEdit}
            title={t("taskChatUi.queue.editPending")}
            className="flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            data-testid={`task-chat-queued-auto-steer-edit-${entry.comment.id}`}
          >{t("taskProperties.fields.edit")}</button>
          <button
            type="button"
            onClick={onCancelAutoSteer}
            title={t("taskChatUi.queue.keepQueued")}
            className="flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            data-testid={`task-chat-queued-auto-steer-cancel-${entry.comment.id}`}
          >{t("companySettings.observability.cancel")}</button>
        </span>
      ) : (queue.targetRunId || queue.state === "deferred") && (!queue.targetRunId || queue.protocol === "legacy" || entry.source?.requiresFreshSession ||
        (queue.steeringDisposition !== "available" && onInterrupt) ? (
        <button
          type="button"
          onClick={onInterrupt}
          aria-label={!queue.targetRunId ? translateUi("interfaceUpdates.send_queued_messages_c5433dc3") : undefined}
          disabled={busy || !queue.queueId || !onInterrupt}
          title={queue.targetRunId ? t("taskChatUi.queue.interruptHint") : t("taskChatUi.queue.sendHint")}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          data-testid={`task-chat-queued-interrupt-${entry.comment.id}`}
        >
          {action === "interrupt" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
          )}
          {queue.targetRunId ? translateUi("taskChatUi.queue.interrupt") : translateUi("taskChatUi.classic.send")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSteer}
          disabled={steerDisabled}
          title={steerTitle}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          data-testid={`task-chat-queued-steer-${entry.comment.id}`}
        >
          {action === "steer" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
          )}
          {t("taskChatUi.queue.steer")}
        </button>
      ))}

      <button
        type="button"
        onClick={onDiscard}
        disabled={
          busy ||
          (!queue.queueId && !entry.comment.id.startsWith("optimistic-")) ||
          !entry.canDiscard
        }
        title={t("taskChatUi.queue.discard")}
        aria-label={t("taskChatUi.queue.discardName", { body: label })}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        data-testid={`task-chat-queued-discard-${entry.comment.id}`}
      >
        {action === "discard" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>

      {autoSteerSecondsLeft === null ? <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={queueMutationDisabled || immutableResponse}
            title={t("taskChatUi.queue.actions")}
            aria-label={t("taskChatUi.queue.actionsName", { body: label })}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem disabled={!entry.canEdit} onSelect={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden />
            {t("taskChatUi.queue.edit")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu> : null}
    </div>
  );
}

/** Compact production queue shown immediately above the default task composer. */
export function TaskChatQueuedMessages({
  queue,
  onEdit,
  onReorder,
  onSteer,
  onInterrupt,
  onDiscard,
  editingCommentId = null,
  autoSteerDelayMs = null,
}: TaskChatQueuedMessagesProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(queue.entries);
  // Automatic steering: Cancel keeps a message queued for this view; each
  // message revision gets at most one automatic attempt, so a failure falls
  // back to the ordinary queue instead of retrying in a loop.
  const [cancelledAutoSteer, setCancelledAutoSteer] = useState<ReadonlySet<string>>(() => new Set());
  const attemptedAutoSteer = useRef(new Set<string>());
  // Recomputes the deadlines after an attempt; the set itself is a ref.
  const [autoSteerAttempts, setAutoSteerAttempts] = useState(0);
  // First time this view offered each message revision for automatic steering.
  const firstEligibleAt = useRef(new Map<string, number>());
  const [now, setNow] = useState(() => Date.now());
  const latestQueue = useRef(queue);
  latestQueue.current = queue;
  const optimisticDeliveryIds = useRef(new Set<string>());
  const [pending, setPending] = useState<{
    commentId: string;
    action: Exclude<QueueAction, null>;
  } | null>(null);
  const [reordering, setReordering] = useState(false);
  const [announcement, setAnnouncement] = useState<QueueAnnouncement | null>(null);
  const [errorCode, setErrorCode] = useState<QueueError | null>(null);
  const visibleError = queueErrorText(errorCode, t);
  const [deferredStatus, setDeferredStatus] = useState<{ queueId: string | null; message: string | null } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    // Polling can return the old queue while delivery is still in flight.
    setEntries(queue.entries.filter(
      (entry) => !optimisticDeliveryIds.current.has(entry.comment.id),
    ));
  }, [queue.entries, queue.revision]);

  useEffect(() => {
    setDeferredStatus(current => {
      if (!current) return null;
      if (queue.state !== "deferred" || queue.queueId !== current.queueId || !queue.entries.length) return null;
      const message = queue.executionWait?.message ?? null;
      return current.message === message ? current : { ...current, message };
    });
  }, [queue.state, queue.queueId, queue.entries.length, queue.executionWait?.message]);

  const ids = useMemo(
    () => entries.map((entry) => entry.comment.id),
    [entries],
  );

  // Send decisions read the current queue snapshot, not the local copy that a
  // sync effect updates one render later: a saved edit must get its new
  // revision's full window, not the old revision's deadline.
  const autoSteerEntries = useMemo(
    () => queue.entries.filter((entry) => !optimisticDeliveryIds.current.has(entry.comment.id)),
    [queue.entries],
  );
  const autoSteerDeadlines = useMemo(() => {
    const deadlines = new Map<string, number>();
    if (autoSteerDelayMs === null) return deadlines;
    for (const entry of autoSteerEntries) {
      if (queuedMessageAutoSteerEligible({ queue, entry, cancelledIds: cancelledAutoSteer,
        attemptedKeys: attemptedAutoSteer.current, editingCommentId })) {
        const key = queuedMessageAutoSteerKey(entry);
        if (!firstEligibleAt.current.has(key)) firstEligibleAt.current.set(key, Date.now());
        deadlines.set(entry.comment.id, queuedMessageAutoSteerDeadline(entry, firstEligibleAt.current.get(key)!, autoSteerDelayMs));
      }
    }
    return deadlines;
  }, [autoSteerEntries, queue, cancelledAutoSteer, editingCommentId, autoSteerDelayMs, autoSteerAttempts]);

  // Announce a new countdown once; the ticking text itself is not a live region.
  const announcedCountdowns = useRef(new Set<string>());
  useEffect(() => {
    const fresh = [...autoSteerDeadlines.keys()].filter(id => !announcedCountdowns.current.has(id));
    for (const id of fresh) announcedCountdowns.current.add(id);
    if (fresh.length) setAnnouncement({ kind: "autoSteer" });
  }, [autoSteerDeadlines]);

  // Tick only while a countdown is visible.
  useEffect(() => {
    if (autoSteerDeadlines.size === 0) return;
    // A countdown that restarts after an edit must not read a clock that stopped while it paused.
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [autoSteerDeadlines.size]);

  useEffect(() => {
    if (pending || reordering) return;
    const due = autoSteerEntries.find(entry => {
      const deadline = autoSteerDeadlines.get(entry.comment.id);
      // The deadlines memo does not see these refs change; check them here.
      return deadline !== undefined && deadline <= now
        && !attemptedAutoSteer.current.has(queuedMessageAutoSteerKey(entry))
        && !optimisticDeliveryIds.current.has(entry.comment.id);
    });
    if (!due) return;
    attemptedAutoSteer.current.add(queuedMessageAutoSteerKey(due));
    setAutoSteerAttempts((count) => count + 1);
    void runRowAction(due.comment.id, "steer");
  });

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (
      !queue.queueId ||
      !over ||
      active.id === over.id ||
      reordering ||
      pending
    )
      return;
    const previous = entries;
    const next = reorderQueuedMessageEntries(
      entries,
      String(active.id),
      String(over.id),
    );
    if (!next) return;
    const orderedIds = next.map((entry) => entry.comment.id);
    const activeCommentId = String(active.id);
    const to = next.findIndex((entry) => entry.comment.id === activeCommentId);
    setEntries(next);
    setReordering(true);
    setErrorCode(null);
    setAnnouncement({ kind: "moved", position: to + 1, total: next.length });
    try {
      await onReorder(orderedIds, queue.revision);
    } catch (error) {
      setEntries(previous);
      setAnnouncement(null);
      setErrorCode(
        queueActionErrorCode(error) === "queued_comment_revision_conflict"
          ? "reorderConflict"
          : "reorderError",
      );
    } finally {
      setReordering(false);
    }
  }

  async function runRowAction(
    commentId: string,
    action: Exclude<QueueAction, null>,
  ) {
    const locallyDiscardable =
      action === "discard" && commentId.startsWith("optimistic-");
    if (
      pending ||
      reordering ||
      (!queue.queueId && action !== "interrupt" && !locallyDiscardable)
    ) {
      return;
    }
    const deliveredIds = action === "interrupt"
      ? entries.map((entry) => entry.comment.id)
      : action === "steer" ? [commentId] : [];
    for (const id of deliveredIds) optimisticDeliveryIds.current.add(id);
    if (deliveredIds.length) {
      setEntries((current) => current.filter(
        (entry) => !optimisticDeliveryIds.current.has(entry.comment.id),
      ));
    }
    setPending({ commentId, action });
    setErrorCode(null); setDeferredStatus(null);
    setAnnouncement({ kind: "action", phase: "pending", action });
    try {
      if (action === "steer") await onSteer(commentId, queue.revision);
      else if (action === "interrupt") {
        const updatedQueue = await onInterrupt?.();
        if (updatedQueue?.state === "deferred") {
          for (const entry of updatedQueue.entries) optimisticDeliveryIds.current.delete(entry.comment.id);
          setEntries(updatedQueue.entries.filter(entry => !optimisticDeliveryIds.current.has(entry.comment.id)));
          setDeferredStatus({ queueId: updatedQueue.queueId, message: updatedQueue.executionWait?.message ?? null });
          setAnnouncement({ kind: "deferred" });
          return;
        }
      }
      else await onDiscard(commentId, queue.revision);
      if (action === "discard") {
        setEntries((current) =>
          current.filter((entry) => entry.comment.id !== commentId),
        );
      }
      setAnnouncement({ kind: "action", phase: "done", action, waitingForStop: Boolean(queue.targetRunId) });
    } catch (error) {
      for (const id of deliveredIds) optimisticDeliveryIds.current.delete(id);
      if (deliveredIds.length) {
        setEntries(latestQueue.current.entries.filter(
          (entry) => !optimisticDeliveryIds.current.has(entry.comment.id),
        ));
      }
      setAnnouncement(null);
      const code = queueActionErrorCode(error);
      setErrorCode(
        code === "queued_comment_already_dispatching"
          ? "alreadySending"
          : action === "steer"
            ? "steerError"
            : action === "interrupt"
              ? queue.targetRunId ? "interruptError" : "sendError"
              : code === "queued_comment_revision_conflict"
                ? "revisionConflict"
                : "discardError",
      );
    } finally {
      setPending(null);
    }
  }

  if (entries.length === 0 && !visibleError && !deferredStatus) return null;

  return (
    <TaskChatComposerBar
      data-testid="task-chat-queued-messages"
      aria-label={t("taskChatUi.queue.label")}
    >
      <DndContext
        sensors={sensors}
        accessibility={{
          screenReaderInstructions: { draggable: t("taskChatUi.queue.dragInstructions") },
          announcements: {
            onDragStart: ({ active }) => t("taskChatUi.queue.dragStart", { position: ids.indexOf(String(active.id)) + 1 }),
            onDragOver: ({ over }) => over ? t("taskChatUi.queue.dragOver", { position: ids.indexOf(String(over.id)) + 1 }) : t("taskChatUi.queue.dragOutside"),
            onDragEnd: ({ over }) => over ? t("taskChatUi.queue.dragEnd", { position: ids.indexOf(String(over.id)) + 1 }) : t("taskChatUi.queue.dragOutside"),
            onDragCancel: () => t("taskChatUi.queue.dragCancel"),
          },
        }}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {/* Bounded so a long queue scrolls here instead of covering the conversation. */}
          <div
            className="max-h-(--tc-queued-list-max-h) overflow-y-auto overscroll-contain"
            data-testid="task-chat-queued-messages-list"
          >
          {entries.map((entry) => {
            const action =
              pending?.commentId === entry.comment.id ? pending.action : null;
            const busy = Boolean(pending || reordering);
            const queueMutationDisabled = Boolean(
              !queue.queueId || pending || reordering,
            );
            return (
              <SortableQueuedMessage
                key={entry.comment.id}
                entry={entry}
                queue={queue}
                busy={busy}
                queueMutationDisabled={queueMutationDisabled}
                action={action}
                autoSteerSecondsLeft={(() => {
                  const deadline = autoSteerDeadlines.get(entry.comment.id);
                  return deadline === undefined ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
                })()}
                onCancelAutoSteer={() => setCancelledAutoSteer(current => new Set(current).add(entry.comment.id))}
                onEdit={() => onEdit(entry.comment.id)}
                onSteer={() => void runRowAction(entry.comment.id, "steer")}
                onInterrupt={
                  onInterrupt
                    ? () => void runRowAction(entry.comment.id, "interrupt")
                    : undefined
                }
                onDiscard={() => void runRowAction(entry.comment.id, "discard")}
              />
            );
          })}
          </div>
        </SortableContext>
      </DndContext>
      {deferredStatus ? <p role="status" className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">{deferredStatus.message ?? t("taskChatUi.queue.stillQueued")}</p> : null}
      {visibleError ? (
        <div
          role="status"
          aria-live="polite"
          className="border-t border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive"
        >
          {visibleError}
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {queueAnnouncementText(announcement, t)}
      </div>
    </TaskChatComposerBar>
  );
}
