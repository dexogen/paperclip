import { t as fullSharedTailT } from "@/i18n";
import { t as fullSharedT, i18n as fullSharedI18n, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { TaskVoiceLauncher } from "@/components/voice/TaskVoiceLauncher";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Paperclip, Radio } from "lucide-react";
import type {
  ChatPublicationState,
  ChatFileTransferPhase,
  IssueAttachment,
} from "@paperclipai/shared";
import {
  chatEndpointsApi,
  type ChatProvider,
  type ChatPublicationSummary,
  type ExternalChannelBindingSummary,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { useChatConnectorsEnabled, chatProviderVisible } from "@/hooks/useChatConnectorsEnabled";
import { issuesApi } from "@/api/issues";
import {
  boardSendDraftKey,
  clearBoardSendDraft,
  canDismissBoardSendBatch,
  readBoardSendDraft,
  readBoardSendRejection,
  writeBoardSendDraft,
  type BoardSendRejection,
  type RetainedBoardSend,
} from "./board-send-draft";

const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  agentmail: "AgentMail",
  "imessage-photon": "iMessage Photon",
};

type PublicationFeedback = {
  title: string;
  body: string;
  tone: "info" | "success" | "warn" | "error";
};

const publicationFeedback: Record<ChatPublicationState, PublicationFeedback> = {
  awaiting_consent: {
    get title() { return fullSharedT("fullShared.waiting_for_file_consent_569916"); },
    get body() { return fullSharedTailT("fullSharedTail.consentBody"); },
    tone: "info",
  },
  published: {
    get title() { return fullSharedT("fullShared.sent_to_channel_255e70"); },
    get body() { return fullSharedTailT("fullSharedTail.publishedBody"); },
    tone: "success",
  },
  pending: {
    get title() { return fullSharedT("fullShared.queued_for_channel_cf7ce8"); },
    get body() { return fullSharedTailT("fullSharedTail.pendingBody"); },
    tone: "info",
  },
  streaming: {
    get title() { return fullSharedT("fullShared.publishing_to_channel_c30305"); },
    get body() { return fullSharedTailT("fullSharedTail.streamingBody"); },
    tone: "info",
  },
  retry: {
    get title() { return fullSharedT("fullShared.delivery_retry_scheduled_d4db8f"); },
    get body() { return fullSharedTailT("fullSharedTail.retryBody"); },
    tone: "warn",
  },
  delivery_unknown: {
    get title() { return fullSharedT("fullShared.delivery_not_confirmed_521724"); },
    get body() { return fullSharedTailT("fullSharedTail.unknownDeliveryBody"); },
    tone: "warn",
  },
  failed: {
    get title() { return fullSharedT("fullShared.channel_delivery_failed_ce13a3"); },
    get body() { return fullSharedTailT("fullSharedTail.failedDeliveryBody"); },
    tone: "error",
  },
  cancelled: {
    get title() { return fullSharedT("fullShared.channel_delivery_cancelled_c918fc"); },
    get body() { return fullSharedTailT("fullSharedTail.cancelledDeliveryBody"); },
    tone: "info",
  },
};

const filePhaseLabels: Record<ChatFileTransferPhase, string> = {
  get consent_pending() { return fullSharedTailT("fullSharedTail.display_71fdd08da0b2"); },
  get consent_sending() { return fullSharedTailT("fullSharedTail.display_ab3e8e535b9d"); },
  get consent_unknown() { return fullSharedTailT("fullSharedTail.display_5aaa61e8e52c"); },
  get awaiting_consent() { return fullSharedTailT("fullSharedTail.display_e618056b0153"); },
  get upload_pending() { return fullSharedTailT("fullSharedTail.display_015bf2166aad"); },
  get uploading() { return fullSharedTailT("fullSharedTail.display_1fa531b892bb"); },
  get upload_unknown() { return fullSharedTailT("fullSharedTail.display_4fea38e8c8bc"); },
  get file_info_pending() { return fullSharedTailT("fullSharedTail.display_d82a29a76784"); },
  get file_info_sending() { return fullSharedTailT("fullSharedTail.display_2dddacbd2c8f"); },
  get file_info_unknown() { return fullSharedTailT("fullSharedTail.display_fcd355150de0"); },
  get delivered() { return fullSharedTailT("fullSharedTail.display_da548218bb0c"); },
  get declined() { return fullSharedTailT("fullSharedTail.display_e93e57c3cdd3"); },
  get expired() { return fullSharedTailT("fullSharedTail.display_634a32b529df"); },
  get cancelled() { return fullSharedTailT("fullSharedTail.display_6a97e3b560dd"); },
  get conflict() { return fullSharedTailT("fullSharedTail.display_e209e60fb35f"); },
};

export function useIssueChatBinding(companyId: string, issueId: string) {
  const { enabled, githubEnabled } = useChatConnectorsEnabled();
  const queryEnabled = (enabled || githubEnabled) && Boolean(companyId && issueId) && !issueId.startsWith("chat:");
  const query = useQuery({
    queryKey: ["issue-chat-binding", companyId, issueId],
    queryFn: () => chatEndpointsApi.getIssueBinding(issueId),
    enabled: queryEnabled,
  });
  return {
    binding: queryEnabled && chatProviderVisible(query.data?.provider, enabled, githubEnabled) ? (query.data ?? null) : null,
    isLoading: queryEnabled && query.isLoading,
  };
}

type ConnectedTaskProps = {
  className?: string;
  attachments?: IssueAttachment[];
  companyId: string;
  issueId: string;
  issueCacheRefs?: string[];
  assigneeAgentId?: string | null;
};

export function ExternallyConnectedTaskBanner(props: ConnectedTaskProps) {
  useFullSharedTranslation();
  const { binding } = useIssueChatBinding(props.companyId, props.issueId);
  return <>
    {binding && binding.provider !== "speko" && binding.provider !== "agentmail" && <ConnectedTaskComposer
      key={boardSendDraftKey(props.companyId, props.issueId, binding.endpointId, binding.conversationId)}
      {...props}
      binding={binding}
    />}
    <TaskVoiceLauncher companyId={props.companyId} issueId={props.issueId} agentId={props.assigneeAgentId} boundEndpointId={binding?.provider === "speko" ? binding.endpointId : undefined} />
  </>;
}

function ConnectedTaskComposer({
  className,
  attachments = [],
  companyId,
  issueId,
  issueCacheRefs,
  binding,
}: ConnectedTaskProps & { binding: ExternalChannelBindingSummary }) {
  useFullSharedTranslation();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>(
    [],
  );
  const [publication, setPublication] = useState<ChatPublicationSummary | null>(
    null,
  );
  const idempotencyKey = useRef<string | null>(null);
  const retainedSend = useRef<RetainedBoardSend | null>(null);
  const retainedScopeKey = useRef<string | null>(null);
  const [unconfirmedRequest, setUnconfirmedRequest] = useState(false);
  const [rejection, setRejection] = useState<BoardSendRejection | null>(null);
  const [excludedAttachmentIds, setExcludedAttachmentIds] = useState<string[]>(
    [],
  );
  const [selectionNotice, setSelectionNotice] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadInFlight = useRef(false);
  const mounted = useRef(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<
    IssueAttachment[]
  >([]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const storageKey = binding
    ? boardSendDraftKey(
        companyId,
        issueId,
        binding.endpointId,
        binding.conversationId,
      )
    : null;
  const loadedStorageKey = useRef<string | null>(null);
  useEffect(() => {
    if (!storageKey || loadedStorageKey.current === storageKey) return;
    loadedStorageKey.current = storageKey;
    try {
      const saved = readBoardSendDraft(storageKey);
      retainedScopeKey.current = storageKey;
      retainedSend.current = saved;
      idempotencyKey.current = saved?.idempotencyKey ?? null;
      setBody(saved?.body ?? "");
      setSelectedAttachmentIds(saved?.attachmentIds ?? []);
      setPublication(saved?.publication ?? null);
      setUnconfirmedRequest(
        Boolean(saved && !saved.publication && !saved.rejection),
      );
      setRejection(saved?.rejection ?? null);
      setComposing(Boolean(saved));
      setStorageError(null);
    } catch {
      setStorageError(
        "Saved delivery identity could not be read. Check Activity and restore browser storage before starting another send.",
      );
      setComposing(true);
    }
  }, [storageKey]);
  const deliveryScopeReady = Boolean(
    storageKey &&
    loadedStorageKey.current === storageKey &&
    retainedScopeKey.current === storageKey,
  );
  const invalidateTask = useCallback(() => {
    for (const ref of new Set([issueId, ...(issueCacheRefs ?? [])])) {
      for (const queryKey of [
        queryKeys.issues.comments(ref),
        queryKeys.issues.attachments(ref),
        queryKeys.issues.detail(ref),
        queryKeys.issues.activity(ref),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [issueId, issueCacheRefs, queryClient]);
  const finishPublication = useCallback(() => {
    if (storageKey) {
      try {
        clearBoardSendDraft(storageKey);
      } catch {
        /* The retained anchor remains safe to recheck after reload. */
      }
    }
    retainedSend.current = null;
    setUnconfirmedRequest(false);
    setRejection(null);
    setSelectionNotice(false);
    setPublication(null);
    idempotencyKey.current = null;
    setBody("");
    setSelectedAttachmentIds([]);
    setUploadedAttachments([]);
    setUploadError(null);
    setComposing(false);
    invalidateTask();
    pushToast(publicationFeedback.published);
  }, [fullSharedI18n.language, invalidateTask, pushToast, storageKey]);
  // Keep the first returned ID as the anchor. A batch's blocking row may
  // change as text and files finish; no read is allowed to submit another send.
  const publicationStatus = useQuery({
    queryKey: [
      "chat-publication-batch",
      companyId,
      binding?.endpointId,
      binding?.conversationId,
      publication?.id,
    ],
    queryFn: () =>
      chatEndpointsApi.getPublicationBatchStatus(
        binding!.endpointId,
        binding!.conversationId,
        publication!.id,
      ),
    enabled: deliveryScopeReady && Boolean(publication),
    staleTime: 0,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  useEffect(() => {
    const batch = publicationStatus.data;
    if (
      publication &&
      batch &&
      batch.total > 0 &&
      batch.published === batch.total &&
      batch.publication.state === "published"
    ) {
      finishPublication();
    }
  }, [publication, publicationStatus.data, finishPublication]);
  const publish = useMutation({
    mutationFn: (input: {
      attachmentIds: string[];
      body: string;
      idempotencyKey: string;
      endpointId: string;
      conversationId: string;
    }) =>
      chatEndpointsApi.publishBoardMessage(
        input.endpointId,
        input.conversationId,
        input.body,
        input.idempotencyKey,
        input.attachmentIds,
      ),
    onSuccess: (result) => {
      invalidateTask();
      const feedback = publicationFeedback[result.state];
      setPublication(result.state === "published" ? null : result);
      if (result.state === "published") {
        finishPublication();
        return;
      }
      setUnconfirmedRequest(false);
      if (storageKey && retainedSend.current) {
        retainedSend.current = {
          ...retainedSend.current,
          publication: {
            id: result.id,
            state: result.state,
            attempts: result.attempts,
          },
        };
        try {
          writeBoardSendDraft(storageKey, retainedSend.current);
        } catch {
          // The pre-POST payload/key is already persisted. It remains a safe,
          // explicit same-request retry when the publication ID cannot be saved.
        }
      }
      pushToast({
        ...feedback,
        action: {
          label: fullSharedT("fullShared.view_activity_4bf3f8"),
          href: `/apps/chat/${binding!.endpointId}/activity`,
        },
      });
    },
    onError: (error, request) => {
      const rejected = readBoardSendRejection(error, request);
      if (rejected && retainedSend.current && storageKey) {
        const saved = { ...retainedSend.current, rejection: rejected };
        try {
          // Keep the negative receipt through reload before offering a new key.
          writeBoardSendDraft(storageKey, saved);
        } catch {
          setStorageError(
            "The rejected send could not be saved. Restore browser storage, then retry this same request to recover its receipt.",
          );
          return;
        }
        retainedSend.current = saved;
        setRejection(rejected);
        setUnconfirmedRequest(false);
        invalidateTask();
        pushToast({
          title: fullSharedT("fullShared.update_was_not_sent_313813"),
          body: fullSharedTailT("fullSharedTail.fileAlreadyAttached"),
          tone: "error",
        });
        return;
      }
      pushToast({
        title: fullSharedT("fullShared.couldn_t_confirm_channel_delivery_c3e051"),
        body:
          error instanceof Error
            ? fullSharedTailT("fullSharedTail.retryAfterError", { error: error.message })
            : fullSharedTailT("fullSharedTail.retainedDraftRetry"),
        tone: "error",
      });
    },
  });
  const uploadDisabled = Boolean(
    retainedSend.current ||
    publication ||
    publish.isPending ||
    publish.isError ||
    unconfirmedRequest ||
    storageError ||
    !deliveryScopeReady ||
    uploading,
  );
  async function uploadFile(file: File) {
    if (uploadDisabled || uploadInFlight.current || retainedSend.current)
      return;
    uploadInFlight.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const attachment = await issuesApi.uploadAttachment(
        companyId,
        issueId,
        file,
      );
      if (!mounted.current) return;
      setUploadedAttachments((current) => [...current, attachment]);
      setSelectedAttachmentIds((current) => [...current, attachment.id]);
      idempotencyKey.current = null;
    } catch (error) {
      if (mounted.current) {
        setUploadError(
          `${error instanceof Error ? error.message : "Upload could not be confirmed."} No channel message was sent. Check task files before retrying the upload.`,
        );
      }
    } finally {
      uploadInFlight.current = false;
      if (mounted.current) setUploading(false);
      // An interrupted response may still have stored the file on this task.
      invalidateTask();
    }
  }
  // Keep newly uploaded files usable before the task refetch completes. Once
  // present, server metadata wins (especially a file bound to a sent comment).
  const taskAttachments = [
    ...new Map(
      [...uploadedAttachments, ...attachments].map((attachment) => [
        attachment.id,
        attachment,
      ]),
    ).values(),
  ];
  useEffect(() => {
    // Metadata may arrive after this file was selected but before Send. Never
    // silently keep a now-hidden selection, and never rewrite a retained send.
    if (retainedSend.current) return;
    const newlyBound = attachments
      .filter((file) => file.issueCommentId !== null)
      .map((file) => file.id);
    if (!selectedAttachmentIds.some((id) => newlyBound.includes(id))) return;
    setSelectedAttachmentIds((current) =>
      current.filter((id) => !newlyBound.includes(id)),
    );
    setSelectionNotice(true);
    idempotencyKey.current = null;
  }, [attachments, selectedAttachmentIds]);
  const showingRetainedFiles = Boolean(retainedSend.current);
  // Comment binding removes files from new-send eligibility, not from the
  // immutable receipt for the current send. Saved names survive reload while
  // task metadata is loading (or a selected attachment has since been removed).
  const visibleAttachments = retainedSend.current
    ? retainedSend.current.attachmentIds.map((id) => ({
        id,
        originalFilename:
          retainedSend.current?.attachmentNames?.find((file) => file.id === id)
            ?.name ??
          taskAttachments.find((attachment) => attachment.id === id)
            ?.originalFilename ??
          "Selected task file (details unavailable)",
      }))
    : taskAttachments.filter(
        (attachment) =>
          attachment.issueCommentId === null &&
          !excludedAttachmentIds.includes(attachment.id),
      );
  const currentPublication = publicationStatus.data?.publication ?? publication;
  const batch = publicationStatus.data;
  const dismissible =
    !publicationStatus.isError &&
    !publicationStatus.isFetching &&
    canDismissBoardSendBatch(batch);
  const mixedTerminal =
    canDismissBoardSendBatch(batch) && batch!.published < batch!.total;
  const currentFeedback = mixedTerminal
    ? {
        title: fullSharedT("fullShared.delivery_settled_with_mixed_outcomes_308794"),
        body: fullSharedTailT("fullSharedTail.partiallyDelivered"),
        tone: "info" as const,
      }
    : currentPublication?.state === "cancelled" &&
        (batch?.awaitingConsent ?? 0) > 0
      ? {
          title: fullSharedT("fullShared.waiting_for_remaining_file_consent_15cf54"),
          body: fullSharedTailT("fullSharedTail.awaitingRemainingConsent"),
          tone: "info" as const,
        }
      : currentPublication
        ? publicationFeedback[currentPublication.state]
        : null;
  const activityPath = `/apps/chat/${binding.endpointId}/activity`;
  return (
    <section
      aria-label={fullSharedT("fullShared.external_conversation_051d5b")}
      className={cn("task-context-notice space-y-3", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <Radio className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium"><FullSharedTrans i18nKey="fullShared.connected_to_c891dc" components={{ part1: <>{providerNames[binding.provider]}</> }} /></p>
            <p className="truncate text-xs text-muted-foreground">
              {binding.externalLabel} · {binding.provider === "slack"
                ? fullSharedT("fullShared.messages_you_send_here_and_agent_replies_are_also_po_900b0c")
                : fullSharedT("fullShared.agent_assignment_is_fixed_for_this_external_task_740997")}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {binding.externalUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={binding.externalUrl} target="_blank" rel="noreferrer">
                {fullSharedTailT("fullSharedTail.openProvider", { provider: providerNames[binding.provider] })} <ExternalLink />
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setComposing((value) => !value)}
          >{fullSharedT("fullShared.send_to_channel_dface7")}</Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/apps/chat/${binding.endpointId}/conversations`}>{fullSharedT("providerSetup.select.connection")}</Link>
          </Button>
        </div>
      </div>
      {composing && (
        <div className="space-y-2 border-t border-border pt-3">
          <label
            className="text-xs font-medium"
            htmlFor="external-board-update"
          >{fullSharedT("fullShared.board_update_6e1dcf")}</label>
          <Textarea
            id="external-board-update"
            value={body}
            disabled={
              Boolean(publication) ||
              Boolean(rejection) ||
              publish.isError ||
              unconfirmedRequest ||
              Boolean(storageError) ||
              !deliveryScopeReady
            }
            onChange={(event) => {
              setBody(event.target.value);
              idempotencyKey.current = null;
              publish.reset();
            }}
            placeholder={fullSharedT("fullShared.write_only_what_should_be_visible_in_the_provider_co_c5a8ff")}
          />
          {selectedAttachmentIds.length > 0 && !body.trim() && (
            <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.add_a_message_to_send_with_your_files_680f3a")}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              aria-label={fullSharedT("fullShared.attach_file_to_channel_update_59a735")}
              disabled={uploadDisabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadDisabled}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip />
              {uploading ? fullSharedT("taskPanels.upload.uploading") : fullSharedT("fullShared.attach_file_87fbe4")}
            </Button>
            <p className="text-xs text-muted-foreground">{fullSharedT("fullShared.files_stay_on_this_task_until_you_send_them_to_the_c_c68a82")}</p>
          </div>
          {uploadError && (
            <p role="alert" className="text-xs text-destructive">
              {uploadError}
            </p>
          )}
          {selectionNotice && (
            <p role="status" className="text-xs text-muted-foreground">{fullSharedT("fullShared.a_file_already_attached_to_another_comment_was_remov_157172")}</p>
          )}
          {visibleAttachments.length > 0 && (
            <fieldset
              className="space-y-2 rounded-md border border-border bg-background p-3"
              disabled={
                showingRetainedFiles ||
                Boolean(publication) ||
                publish.isError ||
                unconfirmedRequest ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
            >
              <legend className="px-1 text-xs font-medium">
                {showingRetainedFiles
                  ? fullSharedT("fullShared.files_in_this_send_7674c3")
                  : fullSharedT("fullShared.include_task_files_47c29c")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {binding.provider === "github"
                  ? fullSharedT("fullShared.github_apps_cannot_upload_file_bytes_in_comments_che_82e71c")
                  : binding.provider === "microsoft-teams" &&
                      !showingRetainedFiles
                    ? fullSharedT("fullShared.in_personal_teams_chats_recipients_accept_each_file__53b1a2")
                    : showingRetainedFiles
                      ? fullSharedT("fullShared.these_are_the_files_selected_for_this_send_selection_3b09f2")
                      : fullSharedT("fullShared.only_checked_files_will_be_published_to_the_external_53a7b5")}
              </p>
              <div className="space-y-2">
                {visibleAttachments.map((attachment) => {
                  const label =
                    attachment.originalFilename ?? fullSharedT("fullShared.unnamed_attachment_a90dd5");
                  return (
                    <label
                      className="flex items-center gap-2 text-xs"
                      key={attachment.id}
                    >
                      <Checkbox
                        disabled={showingRetainedFiles}
                        checked={selectedAttachmentIds.includes(attachment.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAttachmentIds((current) =>
                            checked === true
                              ? [...current, attachment.id]
                              : current.filter((id) => id !== attachment.id),
                          );
                          idempotencyKey.current = null;
                          publish.reset();
                        }}
                      />
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {storageError && (
            <p role="alert" className="text-xs text-destructive">
              {storageError}
            </p>
          )}
          {rejection && (
            <div
              role="alert"
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">{fullSharedT("fullShared.update_was_not_sent_313813")}</p>
              <p className="text-muted-foreground">{fullSharedT("fullShared.a_selected_file_already_belongs_to_another_comment_t_c22adf")}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(storageError)}
                onClick={() => {
                  if (!storageKey || !retainedSend.current?.rejection) return;
                  try {
                    clearBoardSendDraft(storageKey);
                  } catch {
                    setStorageError(
                      "Saved rejection could not be cleared. Restore browser storage before editing this send.",
                    );
                    return;
                  }
                  const invalidIds =
                    retainedSend.current.rejection.attachmentIds;
                  setExcludedAttachmentIds((current) => [
                    ...new Set([...current, ...invalidIds]),
                  ]);
                  setSelectedAttachmentIds((current) =>
                    current.filter((id) => !invalidIds.includes(id)),
                  );
                  setUploadedAttachments((current) =>
                    current.filter((file) => !invalidIds.includes(file.id)),
                  );
                  retainedSend.current = null;
                  idempotencyKey.current = null;
                  setRejection(null);
                  setUnconfirmedRequest(false);
                  setSelectionNotice(true);
                  publish.reset();
                }}
              >{fullSharedT("fullShared.edit_rejected_send_c342fb")}</Button>
            </div>
          )}
          {!rejection &&
            (publish.isError || unconfirmedRequest) &&
            !publish.isPending &&
            !publication && (
              <div
                role="alert"
                className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
              >
                <p className="font-medium">{fullSharedT("fullShared.delivery_result_not_confirmed_68d563")}</p>
                <p className="text-muted-foreground">{fullSharedT("fullShared.your_exact_draft_and_request_identity_are_kept_retry_876c54")}</p>
                <Link
                  className="inline-block font-medium underline underline-offset-4"
                  to={activityPath}
                >{fullSharedT("fullShared.open_activity_b2a977")}</Link>
              </div>
            )}
          {publication && currentPublication && currentFeedback && (
            <div
              role={
                currentPublication.state === "failed" ||
                currentPublication.state === "delivery_unknown"
                  ? "alert"
                  : "status"
              }
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">{currentFeedback.title}</p>
              <p className="text-muted-foreground">{currentFeedback.body}</p>
              {batch && (
                <p className="text-muted-foreground">
                  {batch.declined !== undefined &&
                  batch.expired !== undefined &&
                  batch.cancelled !== undefined &&
                  batch.awaitingConsent !== undefined
                    ? [
                        fullSharedTailT("fullSharedTail.publicationCount_published", { count: batch.published }),
                        ...(batch.awaitingConsent
                          ? [fullSharedTailT("fullSharedTail.publicationCount_awaitingConsent", { count: batch.awaitingConsent })]
                          : []),
                        ...(batch.declined
                          ? [fullSharedTailT("fullSharedTail.publicationCount_declined", { count: batch.declined })]
                          : []),
                        ...(batch.expired ? [fullSharedTailT("fullSharedTail.publicationCount_expired", { count: batch.expired })] : []),
                        ...(batch.cancelled
                          ? [fullSharedTailT("fullSharedTail.publicationCount_cancelled", { count: batch.cancelled })]
                          : []),
                      ].join(" · ")
                    : fullSharedT("fullShared.of_parts_published_4ee4fe", { value1: batch.published, value2: batch.total })}
                </p>
              )}
              {batch?.parts?.some((part) => part.fileTransfer) && (
                <ul
                  className="space-y-1 text-muted-foreground"
                  aria-label={fullSharedT("fullShared.file_delivery_outcomes_e0229a")}
                >
                  {batch.parts
                    .filter((part) => part.fileTransfer)
                    .map((part) => (
                      <li key={part.id}>
                        {part.fileTransfer!.filename} —{" "}
                        {filePhaseLabels[part.fileTransfer!.phase]}
                      </li>
                    ))}
                </ul>
              )}
              {publicationStatus.isError && (
                <p role="alert" className="text-muted-foreground">{fullSharedT("fullShared.delivery_status_could_not_be_refreshed_your_draft_is_2c58b8")}</p>
              )}
              {currentPublication.redactedError && (
                <p className="text-muted-foreground"><FullSharedTrans i18nKey="fullShared.provider_detail_55e4e6" components={{ part1: <>{currentPublication.redactedError}</> }} /></p>
              )}
              <Link
                className="inline-block font-medium underline underline-offset-4"
                to={activityPath}
              >{fullSharedT("fullShared.open_activity_b2a977")}</Link>
              {dismissible && (
                <Button
                  className="ml-3"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (storageKey) {
                      try {
                        clearBoardSendDraft(storageKey);
                      } catch {
                        setStorageError(
                          "Saved delivery identity could not be cleared. Restore browser storage before starting another send.",
                        );
                        return;
                      }
                    }
                    setStorageError(null);
                    retainedSend.current = null;
                    setUnconfirmedRequest(false);
                    setPublication(null);
                    setBody("");
                    setSelectedAttachmentIds([]);
                    setUploadedAttachments([]);
                    setUploadError(null);
                    idempotencyKey.current = null;
                    publish.reset();
                  }}
                >{fullSharedT("fullShared.dismiss_delivery_receipt_e6d60f")}</Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {binding.provider === "slack"
                ? fullSharedT("fullShared.your_message_is_posted_to_slack_with_your_name_and_s_fe11e3")
                : fullSharedT("fullShared.ordinary_board_comments_remain_paperclip_only_9add38")}
            </p>
            <Button
              size="sm"
              disabled={
                !body.trim() ||
                publish.isPending ||
                uploading ||
                Boolean(publication) ||
                Boolean(rejection) ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
              onClick={() => {
                if (
                  uploadInFlight.current ||
                  !storageKey ||
                  loadedStorageKey.current !== storageKey ||
                  retainedScopeKey.current !== storageKey
                )
                  return;
                idempotencyKey.current ??= crypto.randomUUID();
                const input = retainedSend.current ?? {
                  attachmentIds: selectedAttachmentIds,
                  attachmentNames: selectedAttachmentIds.map((id) => ({
                    id,
                    name:
                      taskAttachments.find((attachment) => attachment.id === id)
                        ?.originalFilename ?? "Unnamed attachment",
                  })),
                  body: body.trim(),
                  idempotencyKey: idempotencyKey.current,
                  publication: null,
                };
                try {
                  if (!storageKey) throw new Error("Missing delivery scope");
                  writeBoardSendDraft(storageKey, input);
                } catch {
                  setStorageError(
                    "Browser storage could not preserve this delivery identity. No update was sent. Restore browser storage, then reload to try again.",
                  );
                  return;
                }
                retainedSend.current = input;
                setUnconfirmedRequest(true);
                publish.mutate({
                  ...input,
                  endpointId: binding.endpointId,
                  conversationId: binding.conversationId,
                });
              }}
            >
              {publish.isPending
                ? fullSharedT("fullShared.sending_b8ed52")
                : !rejection && (publish.isError || unconfirmedRequest)
                  ? fullSharedT("fullShared.retry_safely_aea735")
                  : fullSharedT("fullShared.send_to_channel_dface7")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
