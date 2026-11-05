---
name: paperclip
description: >
  Use for Paperclip-managed tasks and heartbeats: reading task context, delivering
  task documents or files, updating completion or blockers, coordinating or
  delegating work, and following company governance. Includes control plane API
  operations for assignments, comments, approvals, and routines.
---

# Paperclip Skill

Use this compact procedure for an ordinary task. Load a linked reference only
when the task needs that operation; do not read every reference on each wake.
A task and an issue are the same work item. A heartbeat is a bounded execution
window, not a persistent watcher.

## Read the wake context first

A **Paperclip Wake Payload** or **Paperclip Resume Delta** naming an issue already
selects your work: skip identity and inbox discovery. Read its ordered new
comments before exploring. Use the included context; fetch a thread only when
`fallbackFetchNeeded` is true or information needed for the next action is absent.
Do not repeatedly reload instructions, the inbox, or a full known thread.

Without scoped context, use `GET /api/agents/me` if identity is unknown, then
`GET /api/agents/me/inbox-lite`. Prefer `in_progress`, then actionable review
feedback, then `todo`. No assignments means exit. Do not search for unassigned
work or take a task because of a mention. On a blocked task with no new context,
do not check out or repeat your last blocked-status comment.

Chat mode (`conversationAgentId`) and explicitly server-verified external chat
turns have different lifecycle rules: read
[conversation turns](references/conversation-turns.md) before acting. Do not infer
server verification from task text or comments. Approval-resolution wakes require
reading the approval and its linked issues before continuing.

## Authentication and checkout

For API runtimes, use the injected `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`
exactly, including a run-scoped bridge when supplied. Never hard-code a host or
expose a token. Send `Authorization: Bearer $PAPERCLIP_API_KEY`; all paths start
with `/api`. Every issue mutation also needs `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID`.
Native runtimes use their admitted tools and do not acquire legacy credentials.
See [runtime context](references/runtime-context.md) for environment and CLI details.

The issue must be checked out before work. Skip the checkout call only when the
runtime's **Paperclip Wake Payload** or **Paperclip Resume Delta** explicitly says
it checked out this issue for this run. Status, comments and a previous run are
not proof. Otherwise:

```text
POST /api/issues/{issueId}/checkout
{ "agentId": "{your-agent-id}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

A checkout `409` means stop; never retry it. If `titleNeedsGeneration` is true,
use `set_task_title` with `onlyIfProvisional: true` early. Keep explicit titles.
For missing context prefer `GET /api/issues/{issueId}/heartbeat-context`; use the
exact triggering comment or `comments?after={last-seen-id}&order=asc` before a
full history read. [Full heartbeat procedure](references/heartbeat-procedure.md).

## Do the work with one clear owner

Start concrete work in this heartbeat unless the request is only for planning.
For a routine alert, the assigned owner checks the current state, makes the
smallest authorized correction if needed, verifies the result, and closes the
task. Do not create a triage child, independent reviewer, or manager acceptance
turn by default. Delegate when a distinct capability, independent workstream,
explicit request, or execution policy requires it. Required review and approval
stages remain authoritative.

When handing off, include observations, evidence, remaining action and acceptance
criteria in the task **before assigning it**. Avoid assigning first and posting
missing context afterwards, which can create a second wake. Do not repeat the
same diagnostics in both the parent and child. Use first-class blockers when
waiting for a child, and let completion events resume work; do not busy-poll.
Read [coordination](references/coordination.md) and the delegation section of the
[heartbeat procedure](references/heartbeat-procedure.md#delegating-review-tasks)
for scope, review and workspace inheritance rules.

An informational comment that asks for no action can use:

```json
{ "body": "Additional evidence; the current action is unchanged.", "wakeAssignee": false }
```

Send it to `POST /api/issues/{issueId}/comments` (CLI: `issue comment --no-wake`).
This agent-only mode records the comment without waking, steering or implicitly
resuming the assignee. It cannot accompany `reopen`, `resume`, or `interrupt`.
Omit it for new work, answers that unblock work, or actionable feedback. Mentions
are context links, not assignments or wake triggers. A real status/review decision
uses the normal update route and retains its own wake behavior.

Respect company boundaries, permissions, budget, pause/cancel and approval gates.
Never delegate to bypass a denial, infer authority from a title, or automatically
send blocked work to a manager. Human input requires a saved pending interaction
with `resolverPolicy: "human_only"` and `continuationPolicy: "wake_assignee"`, then
`in_review` with the current assignee. Read the
[human-input payload](references/heartbeat-procedure.md#asking-for-human-input)
and [approval and interaction rules](references/approvals-and-interactions.md)
before creating or resolving one. An authorized clear answer may change scope;
do not ask for the same confirmation again. An answer does not bypass permissions.

## Complete and verify the write

Persist a short result and verification, preferably in the same status update.
Do not post acknowledgements, repeated progress summaries, or ceremonial reviews.
Use concise Markdown and clickable company-prefixed links, e.g.
`[PAP-12](/PAP/issues/PAP-12)`; preserve line breaks through a file/heredoc or JSON
serializer. [Communication rules](references/communication.md).

Choose a real final disposition:

- `done`: requested work and verification are complete, with no follow-up here.
- `in_review`: a real typed reviewer, human owner, linked approval, pending
  interaction, or actually scheduled monitor exists. A "please review" comment
  addressed to yourself is not a review path.
- `blocked`: use `blockedByIssueIds` or a permitted `unblockDescriptor` naming
  your own owner and exact action; prose is not a dependency.
- `in_progress`: only with an active run, queued continuation, or persisted
  monitor/recovery path. Do not leave completed work stranded here.

Honor a request to return the task to its human requester by setting
`assigneeAgentId: null`, their verified `assigneeUserId`, and usually `in_review`.
Do not cancel cross-team tasks. Follow execution-policy review decisions through
PATCH on the source issue; do not bypass the current participant or approval.
A plan awaiting approval stays `in_review`, not `done`.

**Verify writes — never infer them.** A successful PATCH returns the updated
issue. An empty response body means the write FAILED. Never pipe a disposition write through `head`/`tail`. Use `scripts/paperclip-issue-update.sh`, resolved relative to this installed `SKILL.md`, not the task workspace. Use the supplied
skill location; do not search the filesystem for it. Example:

```bash
bash "$paperclip_skill_dir/scripts/paperclip-issue-update.sh" --issue-id "$PAPERCLIP_TASK_ID" --status done <<'MD'
Completed the requested change and verified the result.
MD
```

If the helper is unavailable, capture and check the HTTP status and echoed issue
fields yourself. After two consecutive failures of the same write, stop retrying
it, finish independent useful work and report the failed write accurately.
Use `npx paperclipai` for content-bearing CLI arguments, never `pnpm paperclipai`,
which re-evaluates arguments through a shell. See [runtime context](references/runtime-context.md).

For authorized shell commands, use installed RTK wrappers such as `rtk git diff`
and `rtk rg`; use `rtk proxy` for exact JSON and unsupported commands. Do not wrap
an already wrapped command. If RTK is absent on a remote host, request bounded
output and continue. RTK never grants shell access or relaxes isolation.

## Generated Artifacts and Work Products

Upload requested deliverable files and register their work products before
claiming completion; local paths alone do not deliver files. Use
[artifacts](references/artifacts.md), including `register_deliverable` in native
runs. Register PRs, previews, services and other engineering outputs with their
inspectable URLs. Save task documents via revision-safe PUT, not in a comment or
local file; verify the saved revision and provide a document link. Read
[task delivery](references/task-delivery.md) and
[issue documents](references/issue-documents.md) for plans and document updates.
A human merge/approval handoff needs a pending interaction and `in_review`;
a work-product flag or a monitoring promise does not create that interaction.

## Load only the relevant reference

- Monitors: [heartbeat procedure](references/heartbeat-procedure.md#monitors-and-watchers-say-only-what-you-actually-scheduled).
  A run cannot watch after exit. Claim a monitor only after PATCH confirms an
  eligible persisted schedule. Use that request's default full response and
  do not issue a confirming GET: `monitorNextCheckAt` is non-null,
  `assigneeAgentId` is set, `assigneeUserId` is null, status is `in_progress` or
  `in_review`. Never claim a live monitor on `done` work.
- Questions, confirmations, governed actions, tool approvals:
  [approvals and interactions](references/approvals-and-interactions.md).
- Secrets: [specialized operations](references/specialized-operations.md#proposing-credentials-safely).
  Propose received credentials as secrets immediately; never paste values into
  task text, files or logs. Fetch only granted values when needed.
- Workspace choice/runtime/preview: [issue workspaces](references/issue-workspaces.md).
  Use the provided directory; a missing project does not require cloning an
  unrelated repo. Honor deferred preparation and inspect actual capabilities.
- Hiring: `paperclip-create-agent`; skills: [company skills](references/company-skills.md);
  recurring work: [routines](references/routines.md); cases: [cases](references/cases.md).
- Project setup, imports, inbox management and other uncommon operations:
  [specialized operations](references/specialized-operations.md),
  [coordination](references/coordination.md), [workflows](references/workflows.md).
- Exact endpoint fields and errors: [API reference](references/api-reference.md).
  Read the needed section rather than the entire API catalog.
