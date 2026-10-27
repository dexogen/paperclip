# Russian localization coverage

The Russian edition translates application-owned UI copy in both UI shells.
PR #31 extends the earlier invitation, onboarding, skills, artifacts and audit
work to the remaining settings, connections, tools, secrets, routines, shared
controls and diagnostic routes. The integrated upstream revision is recorded in
`upstream.json`.

This is a source coverage statement, not a claim that every possible runtime
state has been visited. The localization report, CI results and deployed build
identity are separate acceptance evidence. A valid catalog alone does not prove
that a screen is translated.

## Surface inventory

| Area | Included surfaces and behavior |
| --- | --- |
| Public access | Sign-in, first-administrator invitation, ordinary invitations, board claim, CLI authorization, validation and copy feedback |
| First use | Organization and agent setup, provider setup, rotating progress messages, first-task greeting and opening question |
| Shell and navigation | Both sidebar variants, contextual menus, search, command palette, notifications, announcements and empty states |
| Tasks and conversations | Inbox, task lists and rows, task details, filters, comments, attachments, recovery controls, run/transcript display, editor controls and voice controls |
| Agents and projects | Both agent lists and organization charts, agent configuration and lifecycle, provider connections, projects, repositories and workspaces |
| Artifacts and knowledge | Artifact browser and previews, both skills libraries, sources, studio, team catalog, organization import and export |
| Governance | Decisions, approvals, requests, activity/audit details, budgets, costs, subscriptions, member roles, trust and access controls |
| Apps and tools | App gallery, provider setup, chat/email/bot connectors, identity setup, gateways, profiles, permissions, action tests and policy feedback |
| Secrets | Organization and user secrets, folder paths, proposals, vault import, bindings, delivery labels and failure handling |
| Routines | Both routine variants, schedule editor, triggers, variables, history, revisions and run states |
| Other settings | User profile, execution environments, plugins, adapters, experimental settings, cases, status cards and built-in agents |
| Diagnostic UI | Reachable UX labs, design sandbox, task-chat lab and artifact directions, including example controls and accessible names |

## Translation boundaries

- Product names, CLI commands, paths, URLs, protocol identifiers, JSON/YAML keys
  and canonical enum values keep their exact spelling. Their surrounding help
  and action labels are translated.
- User names, task text, documents, prompts, provider diagnostics and agent output
  remain literal. Display helpers translate known application-owned messages;
  they do not rewrite arbitrary data that resembles an English UI sentence.
- Canonical transcript and tool models keep their existing English fallback
  contracts. Live renderers pass a translator. Synthetic trim markers are
  recognized by provenance before translation; an identical provider log line
  remains literal.
- Known first-party announcement and onboarding seed copy uses exact source and
  provenance checks. Changed or unknown external payloads are not guessed.
- Other languages may have incomplete catalogs. Russian requires full key and
  interpolation parity, including its own plural forms.

Whole messages carry names, counts and rich-text placeholders. Visible role,
state and delivery labels use their product context. Locale changes must preserve
form drafts, focus, text selection, pending uploads, query identity and mutation
counts. The glossary is in [GLOSSARY.md](GLOSSARY.md).

## Detection and review

The scanner covers `ui/src` and `packages/shared/src/constants.ts`. It checks
render sinks, display maps, copy arrays, accessible names, toast bodies and
translation call contracts. It excludes tests and Storybook stories, but does
not exclude whole production directories to hide remaining copy.

`exceptions.json` records exact findings and specific reasons for retained
technical data, canonical fallback models and localized composition. Changing
an excepted string creates a new finding. The migration baseline may only shrink;
new English UI text must be translated or explicitly classified. Review records
identify agent review as agent review.

Run `node scripts/localization/check.mjs --check` for current counts and contracts.
The report separates new findings, remaining baseline debt, invalid messages
and pending editorial fingerprints. These counts are not a percentage of screens.

## Acceptance evidence

The PR combines existing regression suites with targeted locale roundtrips for
connections, secrets, schedules, settings, task editing, transcripts and error
ownership. It also checks catalog parameters, plurals, exact technical payloads
and detector behavior. The required **Fork integration verified** gate runs the
build, typechecks, UI/CLI/shared/adapter/database tests, server partitions, token
gates and localization browser journeys on the submitted revision.

Deployment follows a successful CI result. Record the actual deployed commit and
public bootstrap/auth smoke result in the lab's service/runbook documentation.
Do not infer deployment from a merge, build, report or registry publication.
