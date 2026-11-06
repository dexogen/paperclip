## Task Documents and Deliverables

Save a requested markdown task document with `PUT /api/issues/{issueId}/documents/{key}`. Use PUT for both creation and updates; POST is not supported here. The key can be `report`, `spec`, or another requested document key; this endpoint is not limited to `plan`. Include the usual bearer authorization and `X-Paperclip-Run-Id` headers.

For a new report, use:

```json
{"title":"Report","format":"markdown","body":"The completed report text","baseRevisionId":null}
```

If the task is accessible but `GET /api/issues/{issueId}/documents/report` returns `404 Document not found`, the document has not been created yet. Create it with PUT; that GET response does not mean document writes are unavailable. For an existing document, read its body and `latestRevisionId`, then send the revised body with `baseRevisionId` set to that revision. On `409`, fetch and reconcile the latest document before retrying.

Read the saved document back before marking the task done. A comment or local file does not satisfy a request for a task document. If the required document cannot be saved, report the failure and leave an appropriate blocked disposition instead of claiming the deliverable is complete.

## Planning (Required when planning requested)

If you're asked to make a plan, create or update the issue document with key `plan`. Do not append plans into the issue description anymore. If you're asked for plan revisions, update that same `plan` document. In both cases, leave a comment as you normally would and mention that you updated the plan document. Plans-as-issue-documents is the norm: don't make plans as files in the repo unless you're specifically asked.

When you mention a plan or another issue document in a comment, include a direct document link using the key:

- Plan: `/<prefix>/issues/<issue-identifier>#document-plan`
- Generic document: `/<prefix>/issues/<issue-identifier>#document-<document-key>`

If the issue identifier is available, prefer the document deep link over a plain issue link so the reader lands directly on the updated document.

If you're asked to make a plan, _do not mark the issue as done_. When the plan is ready for review, leave the issue in `in_review` and make the reviewer/decision path explicit. If the requester specifically asked to take the issue back, reassign it to that user; otherwise keep the assignee in place so the accepted confirmation can wake the right agent.

If the plan needs explicit approval before implementation, update the `plan` document, create a `request_confirmation` issue-thread interaction bound to the latest plan revision, then update the source issue to `in_review` with a comment that links the plan and names the pending confirmation. This is a deliberate waiting path, not an abandoned productive run. Wait for acceptance before creating implementation subtasks. See `references/api-reference.md` for the interaction payload.

When asked to convert a plan into executable Paperclip tasks — depth, assignment, dependencies, parallelization — use the companion skill `paperclip-converting-plans-to-tasks`.

Recommended API flow:

```bash
PUT /api/issues/{issueId}/documents/plan
{
  "title": "Plan",
  "format": "markdown",
  "body": "# Plan\n\n[your plan here]",
  "baseRevisionId": null
}
```

If `plan` already exists, first `GET /api/issues/{issueId}/documents/plan` and read its current body and `latestRevisionId`. Then send the revised body with `baseRevisionId` set to that returned `latestRevisionId`. The GET field is `latestRevisionId`; the PUT field is `baseRevisionId`. Omitting it on an update returns `409`. If the revision changed concurrently, fetch and reconcile the latest plan before trying again; never blindly overwrite it.

## Key Endpoints (Hot Routes)

| Action                                | Endpoint                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| My identity                           | `GET /api/agents/me`                                                                                                            |
| My compact inbox                      | `GET /api/agents/me/inbox-lite`                                                                                                 |
| My assignments                        | `GET /api/companies/:companyId/issues?assigneeAgentId=:id&status=todo,in_progress,in_review,blocked`                            |
| Checkout task                         | `POST /api/issues/:issueId/checkout`                                                                                            |
| Get task + ancestors                  | `GET /api/issues/:issueId`                                                                                                      |
| Compact heartbeat context             | `GET /api/issues/:issueId/heartbeat-context`                                                                                    |
| Issue activity and attribution        | `GET /api/issues/:issueId/activity`                                                                                             |
| Update task                           | `PATCH /api/issues/:issueId` (optional `comment` field)                                                                         |
| Get comments / delta / single         | `GET /api/issues/:issueId/comments[?after=:commentId&order=asc]` • `/comments/:commentId`                                       |
| Add comment                           | `POST /api/issues/:issueId/comments`                                                                                            |
| Issue-thread interactions             | `GET\|POST /api/issues/:issueId/interactions` • `POST /api/issues/:issueId/interactions/:interactionId/{accept,reject,respond,withdraw}` |
| Create subtask                        | `POST /api/companies/:companyId/issues`                                                                                         |
| Release task                          | `POST /api/issues/:issueId/release`                                                                                             |
| Search issues                         | `GET /api/companies/:companyId/issues?q=search+term`                                                                            |
| Issue documents (list/get/put)        | `GET\|PUT /api/issues/:issueId/documents[/:key]`                                                                                |
| Create approval                       | `POST /api/companies/:companyId/approvals`                                                                                      |
| Upload attachment (multipart, `file`) | `POST /api/companies/:companyId/issues/:issueId/attachments`                                                                    |
| List / get / delete attachment        | `GET /api/issues/:issueId/attachments` • `GET\|DELETE /api/attachments/:attachmentId[/content]`                                 |
| Execution workspace + runtime         | `GET /api/execution-workspaces/:id` • `POST …/runtime-services/:action`                                                         |
| Set agent instructions path           | `PATCH /api/agents/:agentId/instructions-path`                                                                                  |
| List agents                           | `GET /api/companies/:companyId/agents`                                                                                          |
| Secret proposals                      | `POST\|GET /api/agents/me/secret-proposals` • `DELETE /api/agents/me/secret-proposals/:id`                                  |
| Dashboard                             | `GET /api/companies/:companyId/dashboard`                                                                                       |

Full endpoint table (company imports/exports, OpenClaw invites, company skills, routines, etc.) lives in `references/api-reference.md`.

## Searching Issues

Use the `q` query parameter on the issues list endpoint to search across titles, identifiers, descriptions, and comments:

```
GET /api/companies/{companyId}/issues?q=dockerfile
```

Results are ranked by relevance: title matches first, then identifier, description, and comments. You can combine `q` with other filters (`status`, `assigneeAgentId`, `projectId`, `labelId`).

## Full Reference

For detailed API tables, JSON response schemas, worked examples (IC and Manager heartbeats), governance/approvals, cross-team delegation rules, error codes, issue lifecycle diagram, and the common mistakes table, read: `skills/paperclip/references/api-reference.md`

### Conversational confirmation answers

When the user answers a pending confirmation in a message, record the answer before acting. Read current cards and comments, then POST `/api/issues/{issueId}/interactions/{interactionId}/resolve-from-comment` with `commentId`, `decision: "accept" | "reject"`, and explicit `selectedOptionIds` for checkbox acceptance (native runners use `call_api`). Ambiguous replies among proposals require clarification. Revisions are not acceptance. Retry the same request after a lost response instead of leaving a pending card. Resolver permissions remain enforced; question forms and governed approvals use their existing controls. See the API reference for scope and retry rules.

In Agent Chat, a question is optional: if the user moves on to another topic, answer that message without requiring them to answer or resolve the earlier question. Leave its card unanswered so they can reopen it later. When a historical answer arrives, use its attached original question as context and continue from the current conversation. Unrelated messages are never approval.

**Connection access requests.**

Use the run-scoped `connections_search` and `connection_request` tools for app
setup. If a saved connection is not enabled for this agent or its tools are Off,
call `connection_request` with its service identifier, saved `connectionId`, and
exact indexed `toolNames`. This creates an embedded human **Grant access** card;
do not substitute an `ask_user_questions` permission checklist or ask the human
to edit settings manually. Yield while waiting. Acceptance resumes the task with
agent-scoped access; writes still require approval. A declined card is not consent
and a connected gateway does not prove the underlying app is authorized.

## Incidental feedback

The `complain` and `suggestion-box` skills are available alongside this skill.
Use them proactively when agent-work friction warrants a raw reaction or a useful
improvement. This is not a mandatory report. Their shared helper is
`scripts/submit-agent-commentary.mjs`, relative to this skill directory. Feedback
stays in this instance with agent/run/task attribution; submit silently once and
continue the primary task even if submission fails.

**External review handoffs.**

For a PR, put its link in the work product's top-level `url` field. If a human
must review or merge it before you can continue, name that action in a durable
human-only interaction with an appropriate continuation policy and leave the
task `in_review`. A `needs_board_review` work-product flag and a periodic monitor
do not create an interaction card. Keep any merge check bounded, record its
purpose in the monitor's `notes`, and verify the actual provider state when you
resume; a confirmation response is not proof of a merge. Update the existing PR
work product when the PR merges or closes instead of registering a duplicate.

The same rule applies to external release approval gates: link the exact run,
create a human-only confirmation asking whether the user approved it in the
provider, and keep the agent assigned with `continuationPolicy: "wake_assignee"`
so the answer resumes verification. A handoff comment asking the user to comment
back or reassign the task is not a confirmation card. The card records the user's
answer; verify the provider's gate and publish result before continuing.
