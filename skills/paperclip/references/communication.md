## Critical Rules

- **Never retry a 409.** The task belongs to someone else.
- **Never look for unassigned work.** No assignments = exit.
- **Never self-assign from a mention.** A mention identifies relevant context; task work requires explicit assignment.
- **Honor "send it back to me" requests from board users.** If a board/user asks for review handoff (e.g. "let me review it", "assign it back to me"), reassign to them with `assigneeAgentId: null` and `assigneeUserId: "<requesting-user-id>"`, typically setting status to `in_review` instead of `done`. Resolve the user id from the triggering comment's `authorUserId` when available, else the issue's `createdByUserId` if it matches the requester context.
- **Start actionable work before planning-only closure.** Do concrete work in the same heartbeat unless the task asks for a plan or review only.
- **Leave a next action.** Every progress comment should make clear what is complete, what remains, and who owns the next step.
- **Prefer child issues over polling.** Create bounded child issues for long or parallel delegated work and rely on Paperclip wake events or comments for completion.
- **Preserve workspace continuity for follow-ups.** Child issues inherit execution workspace from `parentId` server-side. For non-child follow-ups on the same checkout/worktree, send `inheritExecutionWorkspaceFromIssueId` explicitly.
- **Never cancel cross-team tasks.** If you question the task, follow the requester-directed decision flow in [Receiving cross-team work](api-reference.md#receiving-cross-team-work). Keep the task assigned to yourself; do not automatically hand it to a manager.
- **Use first-class blockers** (`blockedByIssueIds`) rather than free-text "blocked by X" comments.
- **Say only what you actually scheduled.** Never tell a user a "watcher"/monitor will wake you unless you scheduled a real issue monitor (non-null `monitorNextCheckAt`), and never imply a live watcher on a task you mark `done` — see **Monitors and Watchers**.
- **On a blocked task with no new context, don't re-comment** — see the blocked-task dedup rule in Step 4.
- **@-mentions** are context links and never trigger heartbeats, assign work, or forward comments to another task. For machine-authored comments, resolve the target agent and use `[@Agent Name](agent://<agent-id>)`. To request work, assign a task or use an explicit review request.
- **Budget**: auto-paused at 100%. Above 80%, focus on critical tasks only.
- **Handle blockers directly.** Identify the exact missing capability or authority. Do not reassign blocked work or create a task for a manager or another agent merely because you are stuck. A title or reporting line does not grant access or authority. For a human-only action, use the connection/approval flow when available; otherwise save an interaction with `resolverPolicy: "human_only"` and `continuationPolicy: "wake_assignee"` on the current task, keep yourself assigned, and leave it `in_review`. Use the complete [human-input payload](heartbeat-procedure.md#asking-for-human-input). Verify the recipient's actual capability and permission before offering delegation as an option or creating a bounded task for them. Never delegate to bypass a permission denial; a human answer also does not grant a missing permission.
- **Keep scope decisions on the current task.** Save a human-input interaction with `resolverPolicy: "human_only"` and `continuationPolicy: "wake_assignee"`. Keep the task assigned to yourself and `in_review` while waiting. If the decision requires a particular person's answer, explicitly address that person; otherwise leave the recipient open to eligible humans. For an agent-directed question, set `addresseeAgentId` and omit `resolverPolicy`. Do not substitute a manager or invent an identity.
- **Hiring**: use the `paperclip-create-agent` skill for new agent creation workflows (links to reusable `AGENTS.md` templates like `Coder` and `QA`).

## Comment Style (Required)

When posting issue comments or writing issue descriptions, use concise markdown with:

- a short status line
- bullets for what changed / what is blocked
- links to related entities when available

**Ticket references are links (required):** If you mention another issue identifier such as `PAP-224`, `ZED-24`, or any `{PREFIX}-{NUMBER}` ticket id inside a comment body or issue description, wrap it in a Markdown link:

- `[PAP-224](/PAP/issues/PAP-224)`
- `[ZED-24](/ZED/issues/ZED-24)`

Never leave bare ticket ids in issue descriptions or comments when a clickable internal link can be provided.

**Company-prefixed URLs (required):** All internal links MUST include the company prefix. Derive the prefix from any issue identifier you have (e.g., `PAP-315` → prefix is `PAP`). Use this prefix in all UI links:

- Issues: `/<prefix>/issues/<issue-identifier>` (e.g., `/PAP/issues/PAP-224`)
- Issue comments: `/<prefix>/issues/<issue-identifier>#comment-<comment-id>` (deep link to a specific comment)
- Issue documents: `/<prefix>/issues/<issue-identifier>#document-<document-key>` (deep link to a specific document such as `plan`)
- Agents: `/<prefix>/agents/<agent-url-key>` (e.g., `/PAP/agents/claudecoder`)
- Projects: `/<prefix>/projects/<project-url-key>` (id fallback allowed)
- Approvals: `/<prefix>/approvals/<approval-id>`
- Runs: `/<prefix>/agents/<agent-url-key-or-id>/runs/<run-id>`

Do NOT use unprefixed paths like `/issues/PAP-123` or `/agents/cto` — always include the company prefix.

**Preserve markdown line breaks (required):** build multiline JSON bodies from heredoc/file input (via the helper in Step 8 or `jq -n --arg comment "$comment"`). Never manually compress markdown into a one-line JSON `comment` string unless you intentionally want a single paragraph.

Example:

```md
## Update

Submitted CTO hire request and linked it for board review.

- Approval: [ca6ba09d](/PAP/approvals/ca6ba09d-b558-4a53-a552-e7ef87e54a1b)
- Pending agent: [CTO draft](/PAP/agents/cto)
- Source issue: [PAP-142](/PAP/issues/PAP-142)
- Depends on: [PAP-224](/PAP/issues/PAP-224)
```
