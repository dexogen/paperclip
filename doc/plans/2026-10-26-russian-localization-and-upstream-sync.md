---
id: paperclip-russian-localization-and-upstream-sync
type: decision
status: accepted
scope: paperclip
updated: 2026-10-26
source: "Repository inspection at 2a45fd95df352b1e9d20ab366181bc715a06fe35; GitHub repository and PR reads on 2026-10-26"
---

# Russian localization and upstream maintenance

The owner approved this design and requested implementation on 2026-10-26.
Foundation, detection, Russian translations, and upstream synchronization are in progress.
Deployment and automatic merge remain separate rollout decisions.

## Outcome and boundaries

Maintain a Russian edition of `dexogen/paperclip` that follows
`paperclipai/paperclip`, detects translation work when upstream changes, and keeps
the original application behavior. A successful update must preserve company
boundaries, permissions, approvals, task ownership, budgets, audit events, and data.

The initial product boundary is the web application: navigation, authentication,
onboarding, tasks, agents, projects, settings, dialogs, notifications, validation,
accessible names, and display formatting. Define the exact supported journeys in
the initial inventory and expand them until the agreed web UI scope is covered.
Include both active UI variants, including `.production.tsx` components.

User content, agent responses and instructions, skills, commands, paths, protocol
identifiers, provider diagnostics, and raw logs retain their original values.
CLI localization, third-party plugin interfaces, and generated prose are separate
scope decisions. Language selection must not alter execution or stored content.

## Observed starting point

- The fork and upstream `master` both resolved to
  `2a45fd95df352b1e9d20ab366181bc715a06fe35` during this inspection.
  The local checkout has only `origin`; no `upstream` remote is configured.
- GitHub reports that the fork has Issues disabled, auto-merge disabled, and an
  unprotected `master`. Actions activation, workflow permissions, and an installed
  automation App have not been checked or configured; verify them during setup.
- `ui/src/i18n/` already uses i18next and react-i18next. Forty locale files,
  including Russian, contain three messages each. The selected language is English.
- Translation calls currently cover only a small part of `App.tsx`.
  `app.cloudCreateUnavailable` is absent from the catalogs and uses `defaultValue`.
  The Russian seed still says "company" where English now says "organization".
- `locale-validation.ts` requires identical keys across every locale;
  `locales.ts` runs it at import time. Adding English/Russian keys alone can
  therefore prevent startup. The same literal parity rule cannot express different
  English and Russian plural categories correctly.
- Hardcoded text also appears in shared display labels, formatters, attributes,
  errors, and configuration objects. Catalog parity cannot measure UI coverage.

These are source and metadata findings, not a claim that the app or a proposed
translation has passed runtime testing.

## Reuse before authoring

Review [PR #17546](https://github.com/paperclipai/paperclip/pull/17546) first as a
foundation candidate. It is open and unmerged, touches 19 files, and proposes a
persistent locale choice, language controls, and incremental Russian coverage.
Its existing-i18next approach and partial-locale validation are relevant; plural
families and compatibility with the selected integration revision need further work.

[PR #14715](https://github.com/paperclipai/paperclip/pull/14715) isolates the
partial-locale validator change. It is also open and unmerged.
[PR #12989](https://github.com/paperclipai/paperclip/pull/12989) contains broad
English/Russian localization and auditing tools, but changes 956 files against an
older base. Review useful translations and tools as inputs rather than applying
the whole patch without reconciling current behavior.

[Paperclip Localizations](https://github.com/DrMaks22/paperclip-localizations)
publishes version-specific patches. Its README currently associates localization
`v2026.10.13.1` with upstream `v2026.1012.0` at `bba6a45`; it does not establish
compatibility with current `master`. Preserve upstream licenses and author credits
for any reused work. Other authors' test reports are not our verification evidence.

## Localization design

Keep `ui/src/i18n/` as the owner and retain the existing library and catalogs.
Use stable semantic keys and whole messages with named parameters. Functional
namespaces may become useful as catalogs grow; a second namespace solely to bypass
the current validator would create unnecessary parallel contracts.

English remains the canonical source. Validate supplied translations for structure,
types, placeholders, unexpected markup/URLs, and existing content limits. Permit
partial catalogs to fall back to English, without copying English placeholders into
all other languages. Check completeness separately for the supported Russian scope.
Do not advertise forty fully translated languages merely because their files exist.

Make validation aware of message families and locale plural rules. English usually
has `one/other`; Russian requires `one/few/many/other`. Compare each family's
parameter contract rather than requiring identical suffix keys across languages.
Treat blank translations as missing unless an explicit reviewed exception permits
them. Missing English keys must fail even when `defaultValue` masks them at runtime.

For each later language, add a catalog with its BCP 47 language tag and validate
that locale's plural forms and formatting. Use the same source-change and review
checks as Russian, allowing a partial rollout with English fallback. Add the locale
to the explicit selectable-language registry only after its declared scope passes
editorial and UI review; a catalog file alone does not enable a language.

Expose English/Russian choice in an existing account/settings surface and at sign-in.
Proposed fork behavior: an explicit saved preference wins; otherwise start in Russian.
Persist locally initially, document that this is a browser preference, and handle
unavailable storage. Account-wide synchronization can be a later product change.
Update document language and direction. Resolve labels during rendering so changing
language updates open screens without remounting forms or losing drafts.

Use locale-aware `Intl` formatting for numbers, dates, relative time, and plural
selection. Preserve the actual currency and time zone: Russian does not imply RUB
or a move to Moscow time. Translate shared enum labels in the UI while keeping
machine values unchanged. Translate recognized API errors through existing stable
codes and parameters; add missing structured codes in bounded follow-ups, preserving
raw diagnostics when no reliable mapping exists. Avoid English-message replacement.

## Translation quality

Create a small Russian glossary and editorial guide before bulk work. Distinguish
organization, project, task, run, approval, and connection consistently. Choose terms
from the actual product behavior, with examples for ambiguous words. Preserve brand
names and technical identifiers; do not force a translation where the product uses
an identifier. Use natural Russian actions, clear errors, and consistent punctuation.

Translate by complete user journeys, reviewing text in its rendered context. Optional
machine-generated drafts can accelerate work, but a draft does not become reviewed
merely because it parses or passes tests. Record the actual reviewer or review process;
do not label an agent review as human review. The initial supported release needs
editorial acceptance as well as technical verification.

## Detecting upstream translation work

Run two complementary checks, both before merging upstream and against the final
candidate tree. Compare the last accepted upstream SHA with the new pinned SHA even
if Git cannot merge them: this still identifies changed original English literals.
The candidate-tree check catches untranslated code introduced by conflict resolution.

| Check | Detects | Required handling |
| --- | --- | --- |
| Catalog references | Added, removed, unknown, or missing keys, including masked defaults | Correct catalogs/references; report removals |
| Source contract | Changed English text, context, parameters, or plural families | Mark affected translations as needing review |
| Translation contract | Missing forms, parameters, empty values, invalid content | Block the supported release |
| Source audit | New hardcoded JSX text, visible attributes, labels, toasts, dialogs, templates, and imported display metadata | Externalize or classify an explicit exception |
| Dynamic sources | New computed keys or runtime-provided display sources | Require a bounded key manifest or manual classification |

Keep a small review sidecar keyed by locale and semantic message ID. Approval binds
both the source contract fingerprint and translation fingerprint; editing either
invalidates the approval. Include context and interpolation/plural contracts in the
source fingerprint. Renames are removal plus addition unless an explicit mapping
preserves identity; similarity can suggest reuse but must not approve it.

During gradual migration, record a baseline of existing hardcoded-text debt with
stable identities and explicit exceptions. Block new debt and shrink the baseline
as journeys migrate. Neither a sync run nor a generated translation may update the
baseline or reviewed fingerprints merely to make checks pass.

Use an AST-aware audit rather than grep alone. Cover known render sources and report
its limits: static analysis cannot prove every arbitrary runtime string is translated.
Report catalog coverage, audited-source coverage, and verified journeys separately.
Publish Markdown and JSON reports as workflow artifacts and update one PR comment.
Include file locations, old/new source, Russian text, category, and the action needed.
Unchanged repeated runs should not create comments or notifications.

## Git and workflow process

Keep the fork's `master` as its maintained version and default branch. Configure a
read-only `upstream` remote. Track upstream `master` for integration, pinning a SHA
for each attempt. A build from that branch is an integration/canary build, not an
upstream stable release. A stable release channel needs its own pinned upstream tag
and acceptance policy; it must never relabel an arbitrary master build as stable.

Use normal merges preserving upstream ancestry, including merge commits when the
sync PR lands. Do not squash upstream syncs or regularly rebase the maintained branch.
Keep one open `codex/upstream-sync` PR per chosen channel, serialize updates, and
preserve manual translation/conflict-resolution edits. Do not reset an existing
integration branch over another contributor's work.

Advance `lastAcceptedUpstreamSha` only after an accepted merge, never on discovery
or a failed attempt. Once editorial correction or review starts, freeze the PR's
upstream SHA and collect newer upstream commits in the next batch. Refreshing the
current report remains idempotent; continuous upstream activity must not invalidate
an editor's work or prevent an update from finishing review.

| Proposed workflow | Trigger | Result |
| --- | --- | --- |
| `upstream-sync.yml` | Daily schedule and manual dispatch | Pin upstream SHA, audit delta, merge into the candidate, create/update one PR and report |
| `localization-check.yml` | Relevant PR updates and explicit invocation | Validate translation state, audit new source text, run required checks on the candidate SHA |
| `fork-build.yml` | Accepted verified integration | Build the fork's production image with immutable provenance |

A merge conflict leaves the maintained branch unchanged and produces a specific
conflict report. Do not automatically choose `ours` or `theirs`. Keep the report
available as a workflow artifact/summary even when no merge commit can be produced;
update the existing PR if present. Issues can be enabled later if a dedicated
maintenance tracker is desired.

Start with automatic preparation and reviewed merging. After dry-run acceptance,
allow automatic merging only for conflict-free updates with no outstanding translation
delta and all required checks passing for the current candidate. New or changed copy
requires editorial disposition. Workflow, release, permission, and other designated
sensitive changes remain reviewable. Automatic deployment is a separate decision.

## Fork-specific CI setup

Inherited CI is not ready to use unchanged. `pr.yml` calls an upstream reusable
workflow at mutable `@master`; routing also references the original repository.
The upstream lockfile policy rejects ordinary PRs containing `pnpm-lock.yaml`, which
would reject normal sync updates. Other workflows depend on upstream bot credentials,
publish destinations, source downloads, or CODEOWNERS.

Create a small fork-owned CI entry point using hosted runners and the existing test
commands. Define an explicit policy for genuine upstream lockfile updates. Guard
upstream-only publication/deployment/bot workflows by owner and review newly introduced
workflows on every sync. Keep required checks and protection rules aligned with the
fork's actual CI; a skipped or never-started check is not successful verification.
An always-running integration summary gate must report the final required status,
even when individual lanes are intentionally skipped by selective routing. Avoid
workflow-level path filters that leave a required check missing or pending.

Prefer a GitHub App restricted to this fork for bot PR creation and updates. Assign
only the permissions required for contents, PRs, and workflow-file updates; separate
code-test jobs from credentialed publishing jobs. GitHub documents that `GITHUB_TOKEN`
pushes do not trigger another workflow, while certain PR events can require approval.
An App token avoids this obstacle to unattended PR checks; explicit dispatch is an
alternative only with checks reliably bound to the candidate SHA. See
[workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Scheduled workflows must exist on the default branch, Actions needs enabling in a
new fork, and public schedules can be disabled after 60 days of inactivity. Account
for those conditions and manual recovery in the runbook; do not promise exact-time
execution. See [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## Verification and delivery

Start each implementation slice with targeted checks. Before integration handoff,
run `pnpm -r typecheck`, `pnpm test:run`, and `pnpm build`; run
`pnpm check:token-gates` for UI changes. Preserve failures and report unavailable
checks explicitly. Localization must retain existing English behavior and invariants.

Add focused Russian/English browser journeys for the agreed scope, narrow layouts,
accessibility names, reload persistence, and EN/RU/EN switching with unsaved drafts.
Exercise Russian counts `0, 1, 2, 5, 11, 21, 22, 25, 1.5`, formatting, errors, and
English fallback. Use pseudo-localization to expose truncation and unexternalized text.
Prove the detector with deliberate new literals, changed English, missing plural
forms, placeholder mismatches, stale review records, and merge-conflict simulations.

Build Docker target `production` from the fork into `ghcr.io/dexogen/paperclip`.
Record upstream SHA, fork SHA, translation revision, and image digest in release
metadata, retaining the last accepted image. Do not republish the whole upstream npm
release system merely to ship UI translations. Image rollback alone is insufficient
after incompatible database migrations; deployment needs a tested data/backup plan.

## Proposed implementation sequence and acceptance

1. Review reuse candidates, inventory render sources and journeys, agree terminology.
2. Add locale selection, partial-locale/plural validation, and drift checks before bulk work.
3. Translate complete journeys, with editorial and UI verification for each slice.
4. Configure fork CI and run sync in preparation-only mode, including failure cases.
5. After acceptance, enable the agreed auto-merge/build policy and maintain the glossary.

Release acceptance requires zero missing, stale, or unreviewed Russian messages in
the declared scope; no new unexplained hardcoded UI text; reviewed exceptions; passing
required checks; and preserved actions, drafts, permissions, and canonical data.
Any remaining untranslated surface must be named rather than hidden in a percentage.
## Implementation checkpoint (2026-10-26)

The implementation uses a dedicated `codex/russian-localization` worktree. The main
checkout remains on `master`. An `upstream` fetch remote now exists with pushing
blocked. Upstream PR #17546 was reviewed at its recorded head: 54 successful checks
and two skipped checks; those results are provenance, not proof of this adaptation.
The author is credited in the UI localization guide and the adaptation commit.

The current slice adds English/Russian selection, plural and message validation,
a static source detector, 414 reviewed-message fingerprints (435 Russian string
forms), and an explicit initial inventory of 20,857 source candidates that remain
migration debt. These are occurrences, not unique untranslated messages. It localizes self-hosted sign-in, main navigation,
organization selection, agent lists, task creation copy, profile preferences, project
browsing, shared status labels, and the modern task list/filter controls. It retains
raw server/provider diagnostics and user-entered content.

Remaining work includes onboarding, full task/agent/project detail screens, most
organization settings and connections, and older/alternative task renderers
(`LegacyIssuesList`, `IssueColumns`, `KanbanBoard`, `IssueFilterPanel`). Shared child
components can still display English. This checkpoint is an integration preview;
it does not meet the final full-web-UI release acceptance above. The source baseline
is migration debt, never a translated-coverage percentage.

Three workflows prepare reviewed upstream merges, verify source and translations,
and publish immutable integration images from verified master commits. They preserve
upstream ancestry and edited sync branches. They do not merge or deploy automatically.
Local regression fixtures exercise conflicts, guard failures, and exact-SHA checks.
The first hosted sync and image publication still require default-branch integration.

GitHub metadata was checked: Actions is enabled and allows actions; its default
workflow token is read-only and Actions PR creation/approval is disabled. No installed
sync App or GHCR publication has been demonstrated. The activation and recovery steps
are in [the fork runbook](../localization/UPSTREAM.md).

Full workspace `pnpm -r typecheck` and `pnpm build` passed. Targeted UI tests,
33 detector/sync regression tests, token gates, and map checks passed. The standard
Chromium journey passed on desktop and mobile; four additional repeated runs
confirmed the WSL headless environment correction. These browser tests use API
fixtures and do not certify full-stack authentication.

The implementation is published in [draft PR #1](https://github.com/dexogen/paperclip/pull/1).
Its verification record tracks the exact commit, full-suite outcome, and remaining
failures. The hosted inventory contains 1,156 general server suites, 162 serialized
suites, and 20 workspace projects. Local attempts superseded for resource limits
are not passes; hosted verification must cover every partition before acceptance.

The full local attempt exposed an existing CompanySettings test helper that did not
wait for React transitions. The same three assertions failed with the original
revision. Replacing the helper with React's `act` made all four tests pass without
changing their assertions or product behavior. A separate original server test
depends on Git's exact non-repository error text; WSL filesystem boundaries change
that text. A focused environment control passed with
`GIT_DISCOVERY_ACROSS_FILESYSTEM=1`, without source changes. Keep the original
failures and timing-sensitive test results in the PR's verification record.

The inherited `commitperclip PR Review` workflow is temporarily disabled in the
fork. Its initial `pull_request_target` run used the unguarded default branch and
failed because Dependency Review was unavailable. Re-enable it after the owner
guard reaches `master`; the fork's own verification remains enabled.

The next translation slice should close an entire remaining user journey, prune
resolved baseline entries, review changed message fingerprints, and add appropriate
Russian/English UI evidence. Automated synchronization prepares that review work;
it must never certify its own new translations.
