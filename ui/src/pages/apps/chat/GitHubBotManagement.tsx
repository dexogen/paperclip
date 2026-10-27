import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  GitPullRequest,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  GitHubChatConfiguration,
  GitHubTaskReview,
} from "@paperclipai/shared";
import {
  githubChatApi,
  type GitHubConfigurationRecord,
} from "@/api/githubChat";
import {
  chatEndpointsApi,
  type ChatEndpoint,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/router";
import { formatDateTime } from "@/lib/utils";
import {
  GitHubAccessEditor,
  GitHubPolicyEditor,
  GitHubToggle,
} from "./GitHubBotConfiguration";
import { ChatExecutionDefaults } from "./ChatExecutionDefaults";

export function GitHubRepositoryAccess({
  endpointId,
  companyId,
  managementUrl,
  pending,
  onRefresh,
  onChange,
  onToggleAll,
}: {
  endpointId: string;
  companyId: string;
  managementUrl: string;
  pending: boolean;
  onRefresh: () => void;
  onChange: (id: string, enabled: boolean) => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  useFullAppsTranslation();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const list = useInfiniteQuery({
    queryKey: ["github-bot-repository-pages", endpointId, search],
    queryFn: ({ pageParam }) => githubChatApi.repositories(endpointId, { limit: 20, offset: pageParam, search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  const summary = list.data?.pages[0];
  const disableAll = (summary?.enabledCount ?? 0) > 0;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [search]);
  useEffect(() => {
    if (!list.hasNextPage || list.isFetching || list.isError || pending || !more.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void list.fetchNextPage({ cancelRefetch: false });
    }, { root: scroller.current });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [list.hasNextPage, list.isFetching, list.isError, list.fetchNextPage, pending]);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{fullAppsT("projectConfigUi.repos.title")}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={fullAppsT("fullApps.manage_repositories_7d701a")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={managementUrl} target="_blank" rel="noreferrer">{fullAppsT("fullApps.manage_on_github_03298b")}<ExternalLink className="size-4" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pending} onClick={onRefresh}>
              <RefreshCw className="size-4" />{fullAppsT("skillsGap.refreshRepositories")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.choose_where_the_bot_can_receive_messages_and_use_to_a03f23")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={fullAppsT("skillsGap.searchRepositories_22ea13")} placeholder={fullAppsT("skillsGap.searchRepositories_22ea13")} className="pl-9"
            value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button variant="outline" size="sm" disabled={pending || list.isFetching || !summary || !summary.totalCount || (!disableAll && !summary.availableCount)}
          aria-label={fullAppsT(disableAll ? "fullApps.disableRepositories" : "fullApps.enableRepositories")}
          onClick={() => onToggleAll(!disableAll)}>
          {disableAll ? fullAppsT("fullApps.disable_all_6cb227") : fullAppsT("fullApps.enable_all_06f08e")}
        </Button>
      </div>
      {summary && <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.repositoriesEnabledSummary", { enabled: summary.enabledCount, total: summary.totalCount })}</p>}
      {list.isError && <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_repositories_8d8aca")}<Button variant="link" size="sm" onClick={() => void list.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
      </p>}
      <div ref={scroller} role="region" aria-label={fullAppsT("projectConfigUi.repos.title")} tabIndex={0}
        className="max-h-96 overflow-y-auto overscroll-contain border-y border-border">
        <div className="divide-y divide-border">
        {rows.map((resource) => (
          <div key={resource.id} className="px-1 py-1">
            <GitHubToggle
              label={resource.label ?? resource.providerResourceId}
              checked={resource.enabled}
              disabled={
                pending ||
                (resource.availability !== "available" && !resource.enabled)
              }
              description={
                resource.availability === "available"
                  ? undefined
                  : fullAppsT("fullApps.unavailable_on_github_update_the_app_s_installation__8f5c76")
              }
              onChange={(enabled) => onChange(resource.id, enabled)}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{fullAppsT("fullApps.task_defaults_1aa47f")}</summary>
              <div className="pt-3">
                <ChatExecutionDefaults
                  companyId={companyId}
                  value={resource.executionDefaults}
                  resource
                  onSave={async (executionDefaults) => {
                    await chatEndpointsApi.updateResources(endpointId, [{ id: resource.id, executionDefaults }]);
                    await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpointId] });
                    await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpointId] });
                  }}
                />
              </div>
            </details>
          </div>
        ))}
        </div>
        {list.isPending ? <p role="status" className="py-4 text-sm text-muted-foreground">{fullAppsT("fullApps.loading_repositories_460ca9")}</p> : rows.length === 0 && !list.isError && (
          <p className="py-4 text-sm text-muted-foreground">
            {search ? fullAppsT("fullApps.no_repositories_match_your_search_454e42") : fullAppsT("fullApps.no_repositories_available_add_repository_access_on_g_376e51")}
          </p>
        )}
        {list.hasNextPage && <div ref={more} className="flex justify-center py-2">
          <Button variant="ghost" size="sm" disabled={pending || list.isFetching}
            onClick={() => void list.fetchNextPage({ cancelRefetch: false })}>
            {list.isFetchingNextPage ? fullAppsT("fullApps.loading_repositories_460ca9") : fullAppsT("fullApps.load_more_repositories_43a13f")}
          </Button>
        </div>}
      </div>
    </section>
  );
}

export function GitHubBotManagement({
  endpoint,
  view,
}: {
  endpoint: ChatEndpoint;
  view: "settings" | "access";
}) {
  useFullAppsTranslation();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["github-bot-configuration", endpoint.id],
    queryFn: () => githubChatApi.configuration(endpoint.id),
  });
  const [draft, setDraft] = useState<GitHubConfigurationRecord | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [scoreText, setScoreText] = useState<string | null>(null);
  const [automaticMode, setAutomaticMode] = useState<"linked_authors" | "allowed_authors" | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AppDisplayText>("");
  const [error, setError] = useState<AppDisplayText | null>("");
  const record = draft ?? query.data;
  const currentScoreText = scoreText ?? String(record?.configuration.defaults.ratingThreshold ?? 5);
  const score = Number(currentScoreText);
  const scoreValid = record?.configuration.defaults.ratingThreshold === null ||
    (currentScoreText.trim() !== "" && Number.isInteger(score) && score >= 1 && score <= 5);
  const dirty = Boolean(
    draft &&
      JSON.stringify(draft.configuration) !==
        JSON.stringify(query.data?.configuration),
  );
  const edit = (configuration: GitHubChatConfiguration) => {
    if (record) {
      if (configuration.defaults.invocation !== "mentions_only")
        setAutomaticMode(configuration.defaults.invocation);
      else if (record.configuration.defaults.invocation !== "mentions_only")
        setAutomaticMode(record.configuration.defaults.invocation);
      setDraft({ ...record, configuration });
    }
    setNotice("");
  };
  const act = async (fn: () => Promise<unknown>) => {
    setPending(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? appErrorDisplay(e) : ownAppDisplayText("fullApps.could_not_save_changes_a1b18c"));
    } finally {
      setPending(false);
    }
  };
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_the_bot_configuration_520186")}{" "}
        <Button
          variant="link"
          onClick={() => {
            void query.refetch();
          }}
        >{fullAppsT("fullApps.try_again_d8b839")}</Button>
      </p>
    );
  if (!record)
    return (
      <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_configuration_bc8fd8")}</p>
    );
  const config = record.configuration;
  return (
    <section className="max-w-3xl space-y-8">
      <fieldset disabled={pending} className="min-w-0 space-y-8">
        {view === "access" ? (
          <>
            <GitHubRepositoryAccess
              endpointId={endpoint.id}
              companyId={endpoint.companyId}
              pending={pending}
              managementUrl={
                endpoint.setup?.github?.managementUrl ??
                endpoint.setup?.github?.installationUrl ??
                "https://github.com/settings/installations"
              }
              onRefresh={() =>
                void act(async () => {
                  await githubChatApi.refreshRepositories(endpoint.id);
                  await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                  await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
                  setNotice(
                    ownAppDisplayText("fullApps.repository_access_refreshed_new_repositories_stay_di_1b9f71"),
                  );
                })
              }
              onChange={(id, enabled) =>
                void act(async () => {
                  await chatEndpointsApi.updateResources(endpoint.id, [
                    { id, enabled },
                  ]);
                  await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                  await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
                })
              }
              onToggleAll={(enabled) => void act(async () => {
                await githubChatApi.toggleAllRepositories(endpoint.id, enabled);
                await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
              })}
            />
            <GitHubAccessEditor
              endpointId={endpoint.id}
              companyId={endpoint.companyId}
              configuration={config}
              onChange={edit}
            />
            {!config.toolsEnabled && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.this_saved_bot_has_github_tools_disabled_so_it_canno_31c25d")}</p>
                <Button
                  variant="outline"
                  onClick={() => edit({ ...config, toolsEnabled: true })}
                >{fullAppsT("fullApps.enable_bot_tools_713327")}</Button>
              </div>
            )}
            {endpoint.connectionId && (
              <Link
                className="text-xs text-muted-foreground underline underline-offset-4"
                to={`/apps/${endpoint.connectionId}`}
              >{fullAppsT("fullApps.manage_tool_permissions_cb2aaa")}</Link>
            )}
          </>
        ) : (
          <>
            <GitHubPolicyEditor key={editorVersion}
              readOnly={pending}
              scoreText={currentScoreText}
              onScoreTextChange={setScoreText}
              rememberedAutomaticMode={automaticMode ?? (config.defaults.invocation === "mentions_only" ? "linked_authors" : config.defaults.invocation)}
              accessHref={`/apps/chat/${endpoint.id}/access`}
              policy={config.defaults}
              onChange={(defaults) => edit({ ...config, defaults })}
            />
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {renderAppDisplayText(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {renderAppDisplayText(notice)}
        </p>
      )}
      {(dirty || !scoreValid) && (
        <div className="sticky bottom-(--tc-composer-bottom) z-10 flex items-center justify-between gap-3 border-t border-border bg-background py-4 md:bottom-0">
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraft(null);
              setScoreText(null);
              setAutomaticMode(null);
              setEditorVersion((value) => value + 1);
              setError("");
            }}
          >{fullAppsT("projectConfigUi.repos.discard")}</Button>
          <Button
            disabled={pending || !scoreValid}
            onClick={() =>
              void act(async () => {
                const saved = await githubChatApi.save(
                  endpoint.id,
                  record.revision,
                  config,
                );
                client.setQueryData(
                  ["github-bot-configuration", endpoint.id],
                  saved,
                );
                setDraft(null);
                setScoreText(null);
                setAutomaticMode(null);
                setNotice(ownAppDisplayText("fullApps.changes_saved_12b3f1"));
              })
            }
          >
            {pending ? fullAppsT("fullApps.saving_23e392") : fullAppsT("companySettings.saveChanges")}
          </Button>
        </div>
      )}
    </section>
  );
}

export function orderedGitHubReviews(reviews: GitHubTaskReview[]) {
  return [...reviews].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function gitHubReviewResultLabel(review: GitHubTaskReview) {
  const completed = review.state === "completed" && review.assessment?.complete;
  const conclusion = review.conclusion
    ? {
        success: fullAppsT("fullApps.caption_436fe71bb9"),
        failure: fullAppsT("fullApps.below_threshold_46ac57"),
        neutral: fullAppsT("fullApps.report_only_5d4974"),
        action_required: fullAppsT("fullApps.action_required_adf69e"),
      }[review.conclusion]
    : fullAppsT("fullApps.awaiting_check_a490fb");
  const state = {
    queued: fullAppsT("fullApps.caption_661ff40a07"),
    running: fullAppsT("fullApps.caption_f25c17d746"),
    completed: fullAppsT("fullApps.caption_75f33cdfc8"),
    incomplete: fullAppsT("fullApps.caption_75f33cdfc8"),
    error: fullAppsT("fullApps.review_failed_d42ffe"),
    superseded: fullAppsT("fullApps.caption_e5830d2654"),
    manual_required: fullAppsT("fullApps.action_required_adf69e"),
  }[review.state];
  return completed ? `${review.assessment!.score}/5 · ${conclusion}` : state;
}

function ReviewResult({ review }: { review: GitHubTaskReview }) {
  useFullAppsTranslation();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {gitHubReviewResultLabel(review)}
        </span>
        <span className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.commit_d844c3" components={{ part1: <code>{review.headSha.slice(0, 7)}</code>, part2: <>{" "}</>, part3: <>{formatDateTime(review.updatedAt)}</> }} /></span>
      </div>
      {review.assessment ? (
        <MarkdownBody className="text-sm">
          {review.assessment.summary}
        </MarkdownBody>
      ) : (
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.no_assessment_has_been_submitted_yet_8d5fdd")}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <Link
          className="underline underline-offset-4"
          to={`/issues/${review.issueId}`}
        >{fullAppsT("fullApps.paperclip_task_ff44b3")}</Link>
        {review.summaryUrl && (
          <a
            className="underline underline-offset-4"
            href={review.summaryUrl}
            target="_blank"
            rel="noreferrer"
          >{fullAppsT("fullApps.github_comment_d119f0")}</a>
        )}
        {review.checkUrl && (
          <a
            className="underline underline-offset-4"
            href={review.checkUrl}
            target="_blank"
            rel="noreferrer"
          >{fullAppsT("fullApps.check_9d6084")}</a>
        )}
      </div>
      <section className="space-y-4 text-sm" aria-label={fullAppsT("fullApps.review_evidence_5e068a")}>
        <div className="space-y-3">
          {review.runId && (
            <Link
              className="text-xs underline underline-offset-4"
              to={`/issues/${review.issueId}?runId=${review.runId}`}
            >{fullAppsT("fullApps.agent_run_5b89ba")}</Link>
          )}
          {review.assessment && (
            <>
              <h3 className="font-medium">{fullAppsT("fullApps.rationale_58f23b")}</h3>
              <MarkdownBody>{review.assessment.rationale}</MarkdownBody>
              {review.assessment.findings.length > 0 && (
                <section className="space-y-3">
                  <h3 className="font-medium">{fullAppsT("fullApps.findings_e171c2")}</h3>
                  {review.assessment.findings.map((finding) => (
                    <div
                      key={finding.key}
                      className="space-y-2 border-l border-border pl-4"
                    >
                      <p className="break-all font-mono text-xs">
                        {finding.path}:{finding.line} · {finding.severity}
                      </p>
                      <MarkdownBody>{finding.body}</MarkdownBody>
                    </div>
                  ))}
                </section>
              )}
              <h3 className="font-medium">{fullAppsT("fullApps.coverage_523487")}</h3>
              <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.files_reviewed_omitted_80d1e9" components={{ part1: <>{review.assessment.coverage.reviewedPaths.length}</>, part2: <>{review.assessment.coverage.omittedPaths.length}</> }} /></p>
              {review.assessment.coverage.limitations.map((limit, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  {limit}
                </p>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function GitHubReviewList({
  endpointId,
  reviews,
}: {
  endpointId: string;
  reviews: GitHubTaskReview[];
}) {
  useFullAppsTranslation();
  if (!reviews.length)
    return (
      <EmptyState
        icon={GitPullRequest}
        message={fullAppsT("fullApps.no_reviews_yet_8b670b")}
        description={fullAppsT("fullApps.mention_the_bot_on_a_pull_request_or_enable_automati_f1ea1d")}
      />
    );
  return (
    <ul
      aria-label={fullAppsT("fullApps.reviews_84cb78")}
      className="divide-y divide-border border-y border-border"
    >
      {orderedGitHubReviews(reviews).map((review) => (
        <li key={review.id}>
          <Link
            to={`/apps/chat/${endpointId}/reviews/${review.id}`}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm hover:bg-accent/50"
          >
            <div className="min-w-0 flex-1 basis-48 space-y-1">
              <p className="break-words font-medium">
                {review.event.title || fullAppsT("fullApps.pull_request_acad28", { value1: review.pullNumber })}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {review.repository} #{review.pullNumber} ·{" "}
                <code>{review.headSha.slice(0, 7)}</code>
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="font-medium">{gitHubReviewResultLabel(review)}</p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={review.createdAt}
              >
                {formatDateTime(review.createdAt)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GitHubReviewDetail({
  endpointId,
  review,
}: {
  endpointId: string;
  review: GitHubTaskReview;
}) {
  useFullAppsTranslation();
  return (
    <article className="max-w-3xl space-y-6">
      <Link
        className="text-sm text-muted-foreground hover:underline"
        to={`/apps/chat/${endpointId}/reviews`}
      >{fullAppsT("fullApps.all_reviews_e33611")}</Link>
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">
          {review.event.title || fullAppsT("fullApps.pull_request_acad28", { value1: review.pullNumber })}
        </h2>
        <a
          className="break-all text-sm text-muted-foreground hover:underline"
          href={`https://github.com/${review.repository}/pull/${review.pullNumber}`}
          target="_blank"
          rel="noreferrer"
        >
          {review.repository} #{review.pullNumber}
        </a>
      </header>
      <ReviewResult review={review} />
    </article>
  );
}

export function GitHubReviews({
  endpointId,
  reviewId,
}: {
  endpointId: string;
  reviewId?: string;
}) {
  useFullAppsTranslation();
  const query = useQuery({
    queryKey: ["github-bot-reviews", endpointId, reviewId ?? "list"],
    queryFn: async () => reviewId ? [await githubChatApi.review(endpointId, reviewId)] : githubChatApi.reviews(endpointId),
    refetchInterval: 5000,
  });
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {reviewId ? fullAppsT("fullApps.this_review_could_not_be_loaded_or_was_not_found_in__9241ed") : fullAppsT("fullApps.reviews_could_not_be_loaded_58b6d1")}{" "}
        <Button variant="link" onClick={() => void query.refetch()}>{fullAppsT("fullApps.try_again_d8b839")}</Button>
      </p>
    );
  if (query.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">{fullAppsT("fullApps.loading_reviews_510c76")}</p>
    );
  if (reviewId) {
    const review = query.data.find((review) => review.id === reviewId);
    return review ? (
      <GitHubReviewDetail endpointId={endpointId} review={review} />
    ) : (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-muted-foreground">{fullAppsT("fullApps.this_review_was_not_found_in_this_connection_835786")}</p>
        <Link
          to={`/apps/chat/${endpointId}/reviews`}
          className="text-sm underline"
        >{fullAppsT("fullApps.all_reviews_ab84bf")}</Link>
      </div>
    );
  }
  return <GitHubReviewList endpointId={endpointId} reviews={query.data} />;
}
