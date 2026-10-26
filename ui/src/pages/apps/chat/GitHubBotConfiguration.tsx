import { ownAppDisplayText, renderAppDisplayText, type AppDisplayText, appErrorDisplay } from "@/pages/apps/app-display-text";
import { t as fullAppsT, Trans as FullAppsTrans, useTranslation as useFullAppsTranslation } from "@/i18n";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GITHUB_REVIEW_EVENTS,
  type GitHubChatConfiguration,
  type GitHubReviewPolicy,
  type GitHubAllowedPerson,
} from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { githubChatApi } from "@/api/githubChat";
import { useOptionalCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import {
  AtSign,
  Check,
  Copy,
  HelpCircle,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GitHubSettingsDisclosure } from "./GitHubSettingsDisclosure";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Label } from "@/components/ui/label";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Link } from "@/lib/router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const githubSelectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const eventLabels = {
  get opened() { return fullAppsT("fullApps.new_pull_request_263c79"); },
  get synchronize() { return fullAppsT("fullApps.updated_commits_30b313"); },
  get reopened() { return fullAppsT("fullApps.copy_53a4ae1c597a"); },
  get ready_for_review() { return fullAppsT("fullApps.ready_for_review_75c2a5"); },
  get mention() { return fullAppsT("fullApps.copy_d820d8de70e4"); },
  get comment() { return fullAppsT("fullApps.copy_f33a51e2f903"); },
};
function GitHubHelp({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  useFullAppsTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={fullAppsT("fullApps.about_fd0987", { value1: label })}
          className="inline-flex shrink-0 items-center text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          <HelpCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

export function GitHubToggle({
  label,
  description,
  help,
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  label: string;
  description?: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  useFullAppsTranslation();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="break-words text-sm font-medium">{label}</p>
          {help && <GitHubHelp label={label}>{help}</GitHubHelp>}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <ToggleSwitch
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
/** Keep separators while typing; the saved policy still contains normalized lists. */
function GitHubListInput({
  id,
  values,
  separator = "\n",
  onChange,
}: {
  id: string;
  values: string[];
  separator?: "\n" | ",";
  onChange: (values: string[]) => void;
}) {
  useFullAppsTranslation();
  const joiner = separator === "," ? ", " : "\n";
  const [text, setText] = useState(values.join(joiner));
  const parse = (value: string) =>
    value
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  useEffect(() => {
    setText((current) =>
      JSON.stringify(parse(current)) === JSON.stringify(values)
        ? current
        : values.join(joiner),
    );
  }, [values, separator]);
  const props = {
    id,
    value: text,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setText(event.target.value);
      onChange(parse(event.target.value));
    },
  };
  return separator === "\n" ? <Textarea {...props} /> : <Input {...props} />;
}

function GitHubPassingScore({
  value,
  onChange,
  onValidityChange,
  text: controlledText,
  onTextChange,
}: {
  text?: string;
  onTextChange?: (text: string) => void;
  value: GitHubReviewPolicy["ratingThreshold"];
  onChange: (value: GitHubReviewPolicy["ratingThreshold"]) => void;
  onValidityChange?: (valid: boolean) => void;
}) {
  useFullAppsTranslation();
  const id = useId();
  const [localText, setLocalText] = useState(String(value ?? 5));
  const text = controlledText ?? localText;
  const setText = onTextChange ?? setLocalText;
  const number = Number(text);
  const valid = value === null || (text.trim() !== "" && Number.isInteger(number) && number >= 1 && number <= 5);
  useEffect(() => setLocalText(String(value ?? 5)), [value]);
  useEffect(() => { onValidityChange?.(valid); }, [valid, onValidityChange]);
  return (
    <div className="space-y-3 py-3">
      <Label htmlFor={id}>{fullAppsT("fullApps.passing_score_6c4400")}</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Input id={id} type="number" min={1} max={5} step={1} required
            className="w-20" value={text} disabled={value === null}
            aria-invalid={!valid} aria-describedby={`${id}-help${valid ? "" : ` ${id}-error`}`}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              const score = Number(next);
              if (next.trim() && Number.isInteger(score) && score >= 1 && score <= 5)
                onChange(score as 1 | 2 | 3 | 4 | 5);
            }} />
          <span className="text-sm text-muted-foreground">{fullAppsT("fullApps.out_of_5_8b923a")}</span>
        </div>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox aria-label={fullAppsT("fullApps.report_only_5d4974")} checked={value === null}
            onCheckedChange={(checked) => { setText("5"); onChange(checked === true ? null : 5); }} />{fullAppsT("fullApps.report_only_5d4974")}</Label>
      </div>
      {!valid && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{fullAppsT("fullApps.enter_a_whole_number_from_1_to_5_dc643e")}</p>}
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {value === null
          ? fullAppsT("fullApps.publishes_a_neutral_check_without_a_score_requiremen_4fe594")
          : fullAppsT("fullApps.paperclip_passes_the_check_when_a_complete_review_of_48d100")}
      </p>
      <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.to_block_merging_require_the_check_from_this_app_in__9661e5" components={{ part1: <strong>Paperclip Review</strong>, part2: <>{" "}</>, part3: <a className="underline hover:text-foreground"
          href="https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository"
          target="_blank" rel="noreferrer">{fullAppsT("fullApps.configure_on_github_106d34")}</a> }} /></p>
    </div>
  );
}

export function GitHubPolicyEditor({
  policy,
  onChange,
  accessHref,
  onValidityChange,
  scoreText,
  onScoreTextChange,
  rememberedAutomaticMode,
  readOnly = false,
}: {
  accessHref?: string;
  readOnly?: boolean;
  scoreText?: string;
  onScoreTextChange?: (text: string) => void;
  rememberedAutomaticMode?: "linked_authors" | "allowed_authors";
  policy: GitHubReviewPolicy;
  onChange: (policy: GitHubReviewPolicy) => void;
  onValidityChange?: (valid: boolean) => void;
}) {
  useFullAppsTranslation();
  const id = useId();
  const automaticMode = useRef<"linked_authors" | "allowed_authors">(
    "linked_authors",
  );
  if (policy.invocation !== "mentions_only")
    automaticMode.current = policy.invocation;
  const filterField = (
    key:
      | "includeAuthors"
      | "excludeAuthors"
      | "targetBranches"
      | "excludedBranches"
      | "requiredLabels"
      | "excludedLabels"
      | "ignoredPaths",
    label: string,
    help: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`${id}-github-${key}`}>{label}</Label>
      <GitHubListInput
        id={`${id}-github-${key}`}
        values={policy[key]}
        onChange={(values) => set(key, values)}
      />
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
  const [prompt, setPrompt] = useState<
    (typeof GITHUB_REVIEW_EVENTS)[number] | "issue_opened"
  >("opened");
  const set = <K extends keyof GitHubReviewPolicy>(
    key: K,
    value: GitHubReviewPolicy[K],
  ) => onChange({ ...policy, [key]: value });
  return (
    <div className="space-y-8">
      <section
        className="space-y-3"
        aria-labelledby={`${id}-github-instructions-heading`}
      >
        <h2
          id={`${id}-github-instructions-heading`}
          className="text-base font-semibold"
        >{fullAppsT("taskProperties.fields.instructions")}</h2>
        <MarkdownEditor
          readOnly={readOnly}
          ariaLabel={fullAppsT("fullApps.agent_instructions_dc390e")}
          contentClassName="min-h-32"
          value={policy.instructions}
          placeholder={fullAppsT("fullApps.what_should_this_agent_do_on_github_37c931")}
          onChange={(value) => set("instructions", value)}
        />
        <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.included_in_every_github_task_type_to_select_a_skill_5fd094")}</p>
        <GitHubSettingsDisclosure title={fullAppsT("fullApps.event_specific_instructions_ee76af")}>
          <div className="grid gap-3 pt-3">
            <Label htmlFor={`${id}-github-prompt-event`} className="sr-only">{fullAppsT("runUi.provider.detail.event")}</Label>
            <select
              id={`${id}-github-prompt-event`}
              className={githubSelectClass}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value as typeof prompt)}
            >
              {GITHUB_REVIEW_EVENTS.map((event) => (
                <option key={event} value={event}>
                  {eventLabels[event]}
                </option>
              ))}
              <option value="issue_opened">{fullAppsT("fullApps.new_issue_3484d1")}</option>
            </select>
            <MarkdownEditor
              key={prompt}
              readOnly={readOnly}
              ariaLabel={fullAppsT("fullApps.message_539acabd571a", { value1: prompt === "issue_opened" ? fullAppsT("fullApps.caption_3484d10f01") : eventLabels[prompt] })}
              contentClassName="min-h-32"
              value={
                prompt === "issue_opened"
                  ? (policy.issueOpenedInstructions ?? "")
                  : policy.prompts[prompt]
              }
              onChange={(value) =>
                prompt === "issue_opened"
                  ? set("issueOpenedInstructions", value)
                  : set("prompts", {
                      ...policy.prompts,
                      [prompt]: value,
                    })
              }
            />
            <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.added_to_the_main_instructions_for_this_event_type_t_df8dbb")}</p>
          </div>
        </GitHubSettingsDisclosure>
      </section>
      <section
        className="space-y-3"
        aria-labelledby={`${id}-github-triggers-heading`}
      >
        <h2
          id={`${id}-github-triggers-heading`}
          className="text-base font-semibold"
        >{fullAppsT("fullApps.when_to_run_650e50")}</h2>
        <div className="flex items-start gap-3 py-2">
          <AtSign className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{fullAppsT("fullApps.when_mentioned_f232a3")}</p>
            <p className="text-xs text-muted-foreground"><FullAppsTrans i18nKey="fullApps.authorized_people_can_always_mention_this_bot_1e6234" components={{ part1: <>{" "}</>, part2: <>{accessHref && (
                <Link className="underline underline-offset-4" to={accessHref}>{fullAppsT("fullApps.manage_people_in_access_92a6fb")}</Link>
              )}</> }} /></p>
          </div>
        </div>
        <GitHubToggle
          label={fullAppsT("fullApps.run_automatically_55fb9f")}
          description={fullAppsT("fullApps.start_work_without_a_mention_when_an_allowed_person__6da3bc")}
          checked={policy.invocation !== "mentions_only"}
          onChange={(enabled) =>
            set("invocation", enabled ? (rememberedAutomaticMode ?? automaticMode.current) : "mentions_only")
          }
        />
        {policy.invocation !== "mentions_only" && (
          <div className="space-y-4">
            <div
              className="grid gap-x-6 gap-y-3 sm:grid-cols-2"
              aria-label={fullAppsT("fullApps.automatic_events_cc4906")}
            >
              {GITHUB_REVIEW_EVENTS.slice(0, 4).map((event) => (
                <Label
                  key={event}
                  className="flex cursor-pointer items-center gap-3 text-sm font-normal"
                >
                  <Checkbox
                    checked={policy.events.includes(event)}
                    onCheckedChange={(enabled) =>
                      set(
                        "events",
                        enabled === true
                          ? [...new Set([...policy.events, event])]
                          : policy.events.filter((value) => value !== event),
                      )
                    }
                  />
                  {eventLabels[event]}
                </Label>
              ))}
              <Label className="flex cursor-pointer items-center gap-3 text-sm font-normal">
                <Checkbox
                  checked={policy.issueOpened === true}
                  onCheckedChange={(enabled) =>
                    set("issueOpened", enabled === true)
                  }
                />{fullAppsT("fullApps.new_issues_a6a0e0")}</Label>
            </div>
            <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.runs_for_authorized_authors_in_access_use_the_author_925509")}</p>
            <GitHubSettingsDisclosure title={fullAppsT("fullApps.automatic_review_filters_28f6dd")}>
              <div>
                <GitHubToggle
                  label={fullAppsT("fullApps.include_draft_prs_433fa0")}
                  checked={policy.reviewDrafts}
                  onChange={(value) => set("reviewDrafts", value)}
                />
                <GitHubToggle
                  label={fullAppsT("fullApps.include_bot_authors_1d3265")}
                  description={fullAppsT("fullApps.the_account_also_needs_a_sponsor_and_external_contri_488929")}
                  checked={policy.reviewBotAuthors}
                  onChange={(value) => set("reviewBotAuthors", value)}
                />
              </div>
              <GitHubSettingsDisclosure title={fullAppsT("fullApps.authors_2c00c9")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filterField(
                    "includeAuthors",
                    fullAppsT("fullApps.included_authors_9bdcd9"),
                    fullAppsT("fullApps.leave_empty_for_all_authorized_authors_one_username__0fe87a"),
                  )}
                  {filterField(
                    "excludeAuthors",
                    fullAppsT("fullApps.excluded_authors_c17489"),
                    fullAppsT("fullApps.one_username_or_glob_per_line_474974"),
                  )}
                </div>
              </GitHubSettingsDisclosure>
              <GitHubSettingsDisclosure title={fullAppsT("fullApps.branches_2eee03")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filterField(
                    "targetBranches",
                    fullAppsT("fullApps.target_branches_fc76f6"),
                    fullAppsT("fullApps.leave_empty_for_all_branches_supports_and_ec44fc"),
                  )}
                  {filterField(
                    "excludedBranches",
                    fullAppsT("fullApps.excluded_branches_aa4b92"),
                    fullAppsT("fullApps.supports_and_12fdca"),
                  )}
                </div>
              </GitHubSettingsDisclosure>
              <GitHubSettingsDisclosure title={fullAppsT("issueFilters.labels")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filterField(
                    "requiredLabels",
                    fullAppsT("fullApps.required_labels_72ca62"),
                    fullAppsT("fullApps.all_listed_labels_must_be_present_22e328"),
                  )}
                  {filterField(
                    "excludedLabels",
                    fullAppsT("fullApps.excluded_labels_2ca622"),
                    fullAppsT("fullApps.any_listed_label_prevents_automatic_review_213371"),
                  )}
                </div>
              </GitHubSettingsDisclosure>
              <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.reviews_requested_by_mention_bypass_these_scheduling_bae1a3")}</p>
            </GitHubSettingsDisclosure>
          </div>
        )}
      </section>
      <section
        className="space-y-3"
        aria-labelledby={`${id}-github-results-heading`}
      >
        <h2
          id={`${id}-github-results-heading`}
          className="text-base font-semibold"
        >{fullAppsT("fullApps.review_results_0bf454")}</h2>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <GitHubToggle
            label={fullAppsT("fullApps.post_a_review_summary_e98a8d")}
            checked={policy.publishSummary}
            onChange={(value) => set("publishSummary", value)}
          />
          <GitHubToggle
            label={fullAppsT("fullApps.post_inline_findings_b279f1")}
            checked={policy.publishInline}
            onChange={(value) => set("publishInline", value)}
          />
        </div>
        <GitHubPassingScore value={policy.ratingThreshold} text={scoreText} onTextChange={onScoreTextChange}
          onChange={(value) => set("ratingThreshold", value)} onValidityChange={onValidityChange} />
      </section>
      <div className="divide-y divide-border">
        <GitHubSettingsDisclosure title={fullAppsT("fullApps.ignored_files_0384b2")}>
          {filterField(
            "ignoredPaths",
            fullAppsT("fullApps.file_patterns_0245e0"),
            fullAppsT("fullApps.excluded_from_all_reviews_including_mentions_one_pat_c8eb40"),
          )}
        </GitHubSettingsDisclosure>
        <GitHubSettingsDisclosure title={fullAppsT("fullApps.inline_comment_options_1caeb6")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-github-categories`}>{fullAppsT("fullApps.finding_categories_6f31e9")}</Label>
              <GitHubListInput
                id={`${id}-github-categories`}
                values={policy.findingCategories}
                separator=","
                onChange={(values) => set("findingCategories", values)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-github-severity`}>{fullAppsT("fullApps.minimum_inline_severity_3680d1")}</Label>
              <select
                id={`${id}-github-severity`}
                className={githubSelectClass}
                value={policy.minimumCommentSeverity}
                onChange={(e) =>
                  set(
                    "minimumCommentSeverity",
                    e.target
                      .value as GitHubReviewPolicy["minimumCommentSeverity"],
                  )
                }
              >
                <option value="info">{fullAppsT("fullApps.info_170322")}</option>
                <option value="warning">{fullAppsT("runUi.protocol.warning")}</option>
                <option value="error">{fullAppsT("fullApps.error_54a0e8")}</option>
              </select>
              <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.hidden_findings_still_count_in_the_assessment_9ae76c")}</p>
            </div>
          </div>
        </GitHubSettingsDisclosure>
        <GitHubSettingsDisclosure title={fullAppsT("fullApps.approvals_and_change_requests_c107ba")}>
          <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.optional_formal_decisions_on_github_scores_comments__9b065b")}</p>
          <div>
            <GitHubToggle
              label={fullAppsT("fullApps.allow_approvals_95e18e")}
              help={fullAppsT("fullApps.lets_the_agent_submit_an_approve_review_on_github_af_2befcb")}
              checked={policy.allowApprove}
              onChange={(value) => set("allowApprove", value)}
            />
            <GitHubToggle
              label={fullAppsT("fullApps.allow_request_changes_dd7b04")}
              help={fullAppsT("fullApps.lets_the_agent_submit_a_request_changes_review_on_gi_66111e")}
              checked={policy.allowRequestChanges}
              onChange={(value) => set("allowRequestChanges", value)}
            />
          </div>
        </GitHubSettingsDisclosure>
      </div>
    </div>
  );
}

export function GitHubAccessEditor({
  endpointId,
  companyId,
  configuration,
  onChange,
}: {
  endpointId: string;
  companyId: string;
  configuration: GitHubChatConfiguration;
  onChange: (configuration: GitHubChatConfiguration) => void;
}) {
  useFullAppsTranslation();
  const company = useOptionalCompany()?.companies.find((item) => item.id === companyId);
  const accountLink = useRef<HTMLAnchorElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dialog, setDialog] = useState<"member" | "guest" | null>(null);
  const members = useQuery({
    queryKey: ["github-members", companyId],
    queryFn: () => accessApi.listMembers(companyId),
  });
  const links = useQuery({
    queryKey: ["github-linked-members", endpointId],
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
  });
  const [login, setLogin] = useState("");
  const [sponsor, setSponsor] = useState(configuration.responsibleUserId);
  const [candidate, setCandidate] = useState<{
    githubUserId: string;
    login: string;
  } | null>(null);
  const [error, setError] = useState<AppDisplayText | null>("");
  const [lookupError, setLookupError] = useState<AppDisplayText | null>("");
  const [busy, setBusy] = useState(false);
  const activeMembers = (members.data?.members ?? []).filter(
    (member) =>
      member.status === "active" && member.membershipRole !== "viewer",
  );
  const linkedAccounts = (links.data ?? []).filter(
    (link) => link.status === "linked",
  );
  const responsible = activeMembers.find(
    (member) => member.principalId === configuration.responsibleUserId,
  );
  const memberName = (userId: string) =>
    activeMembers.find((member) => member.principalId === userId)?.user?.name ??
    userId;
  const automatic = configuration.defaults.invocation !== "mentions_only";
  const guestsAutomatic =
    configuration.defaults.invocation === "allowed_authors";
  const guests = configuration.people.filter(
    (person) => person.kind === "guest",
  );
  // Preserve configured members whose identity link was revoked; show why they cannot run.
  const memberRows = [
    ...configuration.people.filter((person) => person.kind === "member"),
    ...linkedAccounts
      .filter(
        (link) =>
          link.githubUserId &&
          link.paperclipUserId &&
          !configuration.people.some(
            (person) => person.githubUserId === link.githubUserId,
          ),
      )
      .map((link): GitHubAllowedPerson => ({
        kind: "member",
        userId: link.paperclipUserId!,
        githubUserId: link.githubUserId!,
        login: link.githubLogin ?? link.externalLabel,
      })),
  ];
  const updatePerson = (person: GitHubAllowedPerson) =>
    onChange({
      ...configuration,
      people: configuration.people.some(
        (p) => p.githubUserId === person.githubUserId,
      )
        ? configuration.people.map((p) =>
            p.githubUserId === person.githubUserId ? person : p,
          )
        : [...configuration.people, person],
    });
  const removePerson = (person: GitHubAllowedPerson) =>
    onChange({
      ...configuration,
      people: configuration.people.filter(
        (p) => p.githubUserId !== person.githubUserId,
      ),
    });
  const unlink = async (principalId: string) => {
    setBusy(true);
    setError("");
    try {
      await chatEndpointsApi.revokeLink(endpointId, principalId);
      await links.refetch();
    } catch (e) {
      setError(
        e instanceof Error ? appErrorDisplay(e) : ownAppDisplayText("fullApps.could_not_unlink_this_account_445e5a"),
      );
    } finally {
      setBusy(false);
    }
  };
  const peopleRows = (people: GitHubAllowedPerson[]) => (
    <div className="divide-y divide-border">
      {people.map((person) => {
        const identity = linkedAccounts.find(
          (link) => link.githubUserId === person.githubUserId,
        );
        const linked = person.kind === "guest" || Boolean(identity);
        const explicit = configuration.people.some(
          (p) => p.githubUserId === person.githubUserId,
        );
        const mentions =
          person.kind === "guest" ||
          configuration.memberAccess === "all_linked" ||
          explicit;
        const removable = explicit && (person.kind === "guest" || configuration.memberAccess === "selected");
        return (
          <div
            key={person.githubUserId}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4"
          >
            <div className="min-w-0 flex-1 basis-32">
              <p className="break-words text-sm font-medium">@{person.login}</p>
              <p className="text-xs text-muted-foreground">
                {person.kind === "guest"
                  ? fullAppsT("fullApps.sponsored_by_e2be39", { value1: memberName(person.sponsorUserId) })
                  : (identity?.paperclipUserLabel ?? fullAppsT("fullApps.company_member_a0b293"))}
              </p>
              {!linked && (
                <p className="mt-1 text-xs text-destructive">{fullAppsT("fullApps.github_account_needs_linking_441afd")}</p>
              )}
            </div>
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{fullAppsT("fullApps.mentions_6f32e6")}</span>
                {person.kind === "guest" ||
                configuration.memberAccess === "all_linked" ? (
                  <span
                    className="flex h-5 items-center gap-1 text-xs"
                    aria-label={fullAppsT("fullApps.mentions_for_b665bc", { value1: linked ? "allowed" : "unavailable", value2: person.login })}
                  >
                    {linked && (
                      <Check className="size-3.5 text-muted-foreground" />
                    )}
                    {linked ? fullAppsT("fullApps.allowed_1bb201") : fullAppsT("fullApps.unlinked_1e690b")}
                  </span>
                ) : (
                  <ToggleSwitch
                    aria-label={fullAppsT("fullApps.allow_mentions_from_f85e99", { value1: person.login })}
                    checked={mentions}
                    disabled={!linked}
                    onCheckedChange={(enabled) =>
                      enabled ? updatePerson(person) : removePerson(person)
                    }
                  />
                )}
              </div>
              {(identity || removable) && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={fullAppsT("fullApps.manage_4b15c9", { value1: person.login })}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {removable && (
                    <DropdownMenuItem onClick={() => removePerson(person)}>{fullAppsT("fullApps.remove_access_bb349b")}</DropdownMenuItem>
                  )}
                  {identity && (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => void unlink(identity.principalId)}
                    >{fullAppsT("fullApps.unlink_github_account_2e1ae0")}</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <section className="space-y-6" aria-label={fullAppsT("taskProperties.share.people")}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{fullAppsT("taskProperties.share.people")}</h2>
        <p className="text-sm text-muted-foreground">{fullAppsT("fullApps.choose_who_can_mention_this_bot_and_whose_activity_c_42e101")}</p>
      </div>
      <section className="space-y-2" aria-label={fullAppsT("fullApps.company_members_630613")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{fullAppsT("fullApps.company_members_630613")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDialog("member");
              setLinkCopied(false);
              setError("");
            }}
          >
            <Plus className="size-4" />{fullAppsT("fullApps.link_a_member_b5c8d1")}</Button>
        </div>
        <GitHubToggle
          label={fullAppsT("fullApps.allow_mentions_from_all_linked_members_d89b20")}
          description={
            configuration.memberAccess === "all_linked"
              ? fullAppsT("fullApps.includes_members_from_who_link_their_github_account__5ed45e", { value1: company?.name ?? fullAppsT("fullApps.copy_2a63de74eed7") })
              : fullAppsT("fullApps.only_members_you_enable_below_can_mention_this_bot_606a19")
          }
          checked={configuration.memberAccess === "all_linked"}
          onChange={(enabled) =>
            onChange({
              ...configuration,
              memberAccess: enabled ? "all_linked" : "selected",
            })
          }
        />
        {peopleRows(memberRows)}
        {links.isPending && (
          <p role="status" className="py-4 text-sm text-muted-foreground">{fullAppsT("fullApps.loading_linked_accounts_851574")}</p>
        )}
        {!links.isPending && !links.isError && memberRows.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">{fullAppsT("fullApps.no_members_linked_yet_link_an_account_to_get_started_27d267")}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {automatic ? (
            <>{fullAppsT("fullApps.automatic_runs_use_the_events_and_author_filters_in_892655")}{" "}
              <Link
                className="underline underline-offset-4"
                to={`/apps/chat/${endpointId}/settings`}
              >{fullAppsT("companySwitcher.settings")}</Link>
              .
            </>
          ) : (
            <>{fullAppsT("fullApps.automatic_runs_are_off_in_9106d5")}{" "}
              <Link
                className="underline underline-offset-4"
                to={`/apps/chat/${endpointId}/settings`}
              >{fullAppsT("companySwitcher.settings")}</Link>{fullAppsT("fullApps.authorized_mentions_still_work_2ad622")}</>
          )}
        </p>
      </section>
      <section
        className="space-y-2 border-t border-border pt-6"
        aria-label={fullAppsT("fullApps.external_contributors_7697aa")}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{fullAppsT("fullApps.external_contributors_7697aa")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDialog("guest");
              setLookupError("");
            }}
          >
            <Plus className="size-4" />{fullAppsT("fullApps.add_external_contributor_855674")}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.allow_specific_github_users_with_a_member_as_their_s_296b5f")}</p>
        {peopleRows(guests)}
        {guests.length > 0 && (
          <GitHubToggle
            label={fullAppsT("fullApps.allow_automatic_runs_for_external_contributors_9c5e69")}
            description={
              automatic
                ? fullAppsT("fullApps.authorized_contributors_can_trigger_the_events_and_a_241b15")
                : fullAppsT("fullApps.turn_on_automatic_runs_in_settings_first_mentions_re_b3e410")
            }
            checked={guestsAutomatic}
            disabled={!automatic}
            onChange={(enabled) =>
              onChange({
                ...configuration,
                defaults: {
                  ...configuration.defaults,
                  invocation: enabled ? "allowed_authors" : "linked_authors",
                },
              })
            }
          />
        )}
      </section>
      <GitHubSettingsDisclosure title={fullAppsT("fullApps.automatic_task_responsibility_619eaf")}>
        <div className="space-y-2">
          {activeMembers.length === 1 && responsible ? (
            <p className="text-sm"><FullAppsTrans i18nKey="fullApps.responsible_member_a88be8" components={{ part1: <>{memberName(configuration.responsibleUserId)}</> }} /></p>
          ) : (
            <>
              <Label htmlFor="github-responsible">{fullAppsT("fullApps.responsible_member_b61ca7")}</Label>
              <select
                id="github-responsible"
                className={githubSelectClass}
                value={configuration.responsibleUserId}
                onChange={(e) =>
                  onChange({
                    ...configuration,
                    responsibleUserId: e.target.value,
                  })
                }
              >
                {!responsible && (
                  <option value={configuration.responsibleUserId}>
                    {configuration.responsibleUserId || fullAppsT("fullApps.select_a_member_185e2c")}
                  </option>
                )}
                {activeMembers.map((member) => (
                  <option key={member.principalId} value={member.principalId}>
                    {member.user?.name ??
                      member.user?.email ??
                      member.principalId}
                  </option>
                ))}
              </select>
            </>
          )}
          <p className="text-xs text-muted-foreground">{fullAppsT("fullApps.the_member_accountable_for_automatically_created_pap_18b431")}</p>
        </div>
      </GitHubSettingsDisclosure>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {renderAppDisplayText(error)}
        </p>
      )}
      {(members.error || links.error) && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-destructive">{fullAppsT("fullApps.could_not_load_members_or_linked_accounts_a7ea33")}</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              void members.refetch();
              void links.refetch();
            }}
          >{fullAppsT("fullApps.try_again_d8b839")}</Button>
        </div>
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "member"
                ? fullAppsT("fullApps.link_a_company_member_07f42f")
                : fullAppsT("fullApps.add_external_contributor_855674")}
            </DialogTitle>
            <DialogDescription>
              {dialog === "member"
                ? fullAppsT("fullApps.each_member_confirms_their_own_github_identity_share_76883b")
                : fullAppsT("fullApps.allow_a_github_user_to_mention_this_bot_a_company_me_cea354")}
            </DialogDescription>
          </DialogHeader>
          {dialog === "member" ? (
            <>
              <Button
                variant="outline"
                aria-label={fullAppsT("fullApps.copy_account_linking_url_948db1")}
                onClick={() => {
                  if (accountLink.current)
                    void copyTextToClipboard(accountLink.current.href).then(
                      () => setLinkCopied(true),
                      () =>
                        setError(
                          ownAppDisplayText("fullApps.could_not_copy_the_link_open_account_linking_and_cop_e3f2cb"),
                        ),
                    );
                }}
              >
                <Copy className="size-4" />
                {linkCopied ? fullAppsT("taskPanels.preview.copied") : fullAppsT("fullApps.copy_invitation_link_641dce")}
              </Button>
              <Link
                ref={accountLink}
                to={`/apps/chat/connect?provider=github&resume=${endpointId}&stage=identity`}
                className="text-sm underline underline-offset-4"
              >{fullAppsT("fullApps.link_your_account_645783")}</Link>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {renderAppDisplayText(error)}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="github-guest-login">{fullAppsT("fullApps.github_username_64477e")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="github-guest-login"
                    value={login}
                    placeholder="octocat"
                    disabled={busy}
                    onChange={(e) => {
                      setLogin(e.target.value);
                      setCandidate(null);
                      setLookupError("");
                    }}
                  />
                  <Button
                    variant="outline"
                    disabled={busy || !login.trim()}
                    onClick={async () => {
                      setBusy(true);
                      setLookupError("");
                      setCandidate(null);
                      try {
                        setCandidate(
                          await githubChatApi.lookup(endpointId, login),
                        );
                      } catch (e) {
                        setLookupError(
                          e instanceof Error ? appErrorDisplay(e) : ownAppDisplayText("fullApps.lookup_failed_a8a25e"),
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? fullAppsT("fullApps.looking_up_a84f10") : fullAppsT("fullApps.look_up_504101")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-guest-sponsor">{fullAppsT("fullApps.sponsor_fd6e87")}</Label>
                <select
                  id="github-guest-sponsor"
                  className={githubSelectClass}
                  value={sponsor}
                  onChange={(e) => setSponsor(e.target.value)}
                >
                  {!activeMembers.some(
                    (member) => member.principalId === sponsor,
                  ) && <option value={sponsor}>{fullAppsT("fullApps.select_a_member_185e2c")}</option>}
                  {activeMembers.map((member) => (
                    <option key={member.principalId} value={member.principalId}>
                      {member.user?.name ?? member.principalId}
                    </option>
                  ))}
                </select>
              </div>
              {candidate && (
                <p role="status" className="text-sm">
                  {configuration.people.some(
                    (p) => p.githubUserId === candidate.githubUserId,
                  ) ||
                  linkedAccounts.some(
                    (link) => link.githubUserId === candidate.githubUserId,
                  )
                    ? fullAppsT("fullApps.is_already_listed_in_people_8aaaa1", { value1: candidate.login })
                    : fullAppsT("fullApps.found_they_will_be_able_to_mention_the_bot_after_you_1a3ab3", { value1: candidate.login })}
                </p>
              )}
              {lookupError && (
                <p role="alert" className="text-sm text-destructive">
                  {renderAppDisplayText(lookupError)}
                </p>
              )}
              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button variant="ghost" onClick={() => setDialog(null)}>{fullAppsT("fullApps.cancel_19766e")}</Button>
                <Button
                  disabled={
                    !candidate ||
                    !activeMembers.some(
                      (member) => member.principalId === sponsor,
                    ) ||
                    configuration.people.some(
                      (p) => p.githubUserId === candidate.githubUserId,
                    ) ||
                    linkedAccounts.some(
                      (link) => link.githubUserId === candidate.githubUserId,
                    )
                  }
                  onClick={() => {
                    if (candidate) {
                      updatePerson({
                        ...candidate,
                        kind: "guest",
                        sponsorUserId: sponsor,
                        permissionProfile: "restricted",
                      });
                      setDialog(null);
                      setCandidate(null);
                      setLogin("");
                    }
                  }}
                >{fullAppsT("fullApps.add_contributor_59d72a")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
