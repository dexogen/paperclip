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

The implementation is published as a draft stack:
[foundation #1](https://github.com/dexogen/paperclip/pull/1),
[upstream integration #2](https://github.com/dexogen/paperclip/pull/2),
[setup and administration #3](https://github.com/dexogen/paperclip/pull/3),
[Russian README #4](https://github.com/dexogen/paperclip/pull/4),
[task collections #5](https://github.com/dexogen/paperclip/pull/5),
[Cyrillic search #6](https://github.com/dexogen/paperclip/pull/6),
[task details #7](https://github.com/dexogen/paperclip/pull/7),
[task panels #8](https://github.com/dexogen/paperclip/pull/8),
[upstream refresh #9](https://github.com/dexogen/paperclip/pull/9),
[search controls #10](https://github.com/dexogen/paperclip/pull/10),
[Inbox #11](https://github.com/dexogen/paperclip/pull/11),
[shared decision forms #12](https://github.com/dexogen/paperclip/pull/12),
[Decisions and approvals #13](https://github.com/dexogen/paperclip/pull/13), and
[latest upstream #14](https://github.com/dexogen/paperclip/pull/14).
The canonical checkout remains on `master`. Upstream fetching is configured with
pushing blocked. Ordinary merges preserve upstream ancestry through
`1fbbef45a8d399771add7a27a04b12f3a20e264c`; recheck upstream before deployment.

PR #17546 was reviewed at its recorded head and credited in the localization guide.
Its successful checks are provenance, not verification of this adaptation. The
foundation retains i18next, adds persistent English/Russian selection and plural
validation, and detects source/catalog drift. The fork starts in Russian unless
the browser has an explicit preference. Language changes retain drafts and stored
canonical values; technical commands, user content, and provider diagnostics stay
verbatim.

The current combined catalog has 3,427 reviewed semantic families, 3,536 English
forms, and 3,754 Russian forms. Review records identify agent review; no human editorial
approval is claimed. The original 20,857 source occurrences have shrunk to 18,112.
That baseline is migration debt, never a translated-coverage percentage. Strict
candidate checks and the latest upstream delta have no actionable findings.

Supported surfaces include navigation, organization selection, self-hosted sign-in,
first-administrator bootstrap, active onboarding/provider controls, organization
settings, instance general/access settings, and both active task-list/board
renderers with their shared status, recovery, and preview controls. The Russian
README includes reciprocal English/Russian flag links and a source quickstart that
selects this preview. See the [UI localization guide](../../ui/src/i18n/README.md)
for exact surface boundaries.

Full task/agent/project detail screens, complete routine host pages,
remaining agent configuration/settings, dashboards, and most Connections remain
outside the completed translation scope. The design-sandbox-only refreshed filter
panel is also untranslated. This preview does not meet the full-web-UI release
acceptance above. Continue with complete journeys and prune only resolved baseline
entries; synchronization must never approve its own new translations.

### Verification evidence and outstanding work

The full Linux run at `c5c8d13ae6685452e9db05637f90034daf5dde1e` completed every
server partition and all 20 workspace projects, including supplements after a
workspace fail-fast. It recorded 43,464 passed, 27 failed, and 109 skipped tests.
All 9,183 UI and 537 CLI tests passed. The failed full run remains preserved.
Twenty-three failures required `jq`; two exposed Git diagnostic recognition, one
exposed inherited session-class redaction, and one depended on Bash SSH startup.

After the prerequisite and source/test corrections, a clean Linux checkout at
`367a9985debfc603670b3a2eda0d0056af4e647f` passed frozen installation, full Russian
default build, full workspace typecheck, native fixture preparation, all eight
affected server files (817 tests), and the complete OpenCode runtime-config file
(19 tests). Git authority and secret-redaction guards remain enforced; no Git
discovery override or timeout relaxation was used. Earlier hosted failures and
superseded local attempts remain in the PR verification records.

Real Chromium journeys against fresh embedded databases passed Russian default,
RU/EN draft preservation, explicit organization creation, and mobile layout in
`local_trusted` mode. A separate authenticated/private journey at `367a998` passed
UI registration, a non-admin session, explicit first-admin claim, reload, and
sign-in from a fresh browser context; anonymous identity requests remained 401.
Its first attempt failed because the temporary verifier expected a field omitted
from anonymous health. The failed attempt was retained and the verifier corrected
against the existing public/session contracts. Owned servers, listeners, and
databases stopped after the journeys. These are source-checkout proofs, not HTTPS,
external identity-provider, agent/model execution, image, or production acceptance.

The task-collection source and latest upstream changes are frozen for Linux
verification at `0ab7ec7693c62de927b22d3710943372d375242a`. Full Russian-default build
and workspace typecheck passed, followed by all 800 UI files / 9,201 tests, all 58
DB files / 259 tests, and all three affected GitHub service files / 1,473 tests.
Two existing large-tree tests previously timed out in a combined WSL run; the full
Linux UI run passed with unchanged timeouts. The failed WSL run remains preserved.

The real task-list/board attempt failed before any task writes: it could not find
the seeded Cyrillic titles. A separate read-only API diagnosis against the reused
fixture database confirmed that all six tasks exist, an ASCII tag query finds them,
and both Cyrillic-only and mixed queries return no matches. This is a server search
problem requiring correction before accepting the Russian task journey; replacing
the test query with English would not establish acceptance. Both attempts retained
their original evidence and stopped their owned runtime, database, and listener.

The search repair is published separately in
[draft PR #6](https://github.com/dexogen/paperclip/pull/6), at
`cd50089b9c09276506293ee75e82e03a7f20746f`. All four affected files passed 246
tests; server TypeScript checking and 20 original-versus-candidate ASCII SQL
comparisons passed. Unicode capability selection preserves existing databases.
The recorded 10k-task timing run missed the 250 ms target; query plans and the
limitation are in [SEARCH.md](../SEARCH.md#unicode-task-queries). The original failed result is retained.

The task-detail/properties and common-editor slice adds 650 reviewed families.
The combined catalog has 1,959 families, 2,003 English forms and 2,091 Russian
forms. The baseline removes 563 resolved occurrences and retains 19,491; twelve
exact technical exceptions describe enum guards and currency formatting.
Independent agent reviews found and corrected terminology and two missing
accessible labels. The actual installed MDXEditor regression first reproduced
a stale language callback, then passed with live translation updates preserving
its edited content, DOM and selection. UI typecheck, token gates, focused task,
sharing, editor and composer tests passed. Combined Linux and browser acceptance
of this expanded slice remains pending.

A separate search correction at `cd50089b9c09276506293ee75e82e03a7f20746f`
passed frozen installation, full Russian-default build and workspace typecheck on
Linux. The real browser retry found Cyrillic titles and applied status filters in
both active renderers. It then stopped at the language controls: a visible
announcement covered the standard account menu, and the legacy menu had no
language selector. No task writes or browser exceptions occurred; owned services
stopped. The legacy menu now shares the real locale control and translated account
labels. Its complete component suite passes 37 tests, including a regression that
first failed with the missing selector. A revised browser recipe dismisses the
announcement through its ordinary button and records the successful response.
The complete browser retry on the combined source remains pending.

The document/artifact side-panel slice covers 49 production files and adds 466
reviewed semantic families (481 English forms and 511 Russian forms). Independent
agent review corrected two count families for 21/101. Integration verified the
exact reviewed catalog and source digests, re-examined seven existing drag
announcements in their tab context, and made six file-link interpolation contracts
explicit. Nineteen exact exceptions identify technical discriminators, a diagnostic
comparison and the Markdown format name. The baseline removes 501 resolved
occurrences and retains 18,990; no new debt is accepted.

The combined catalog has 2,425 families with no actionable localization findings.
Focused component checks cover stored tabs, browser request counts, pending uploads,
file selection/copy/media state, and a dirty document conflict across EN/RU without
replaying mutations. These are fixture-based checks; combined Linux verification
and real browser acceptance of this expanded slice remain pending. Full
chat/composer, Activity, advanced annotation tools, and remaining rich-card/viewer
branches still require separate work.

The detector and sync regressions pass all 47 cases, including conflict cleanup,
manual-edit preservation, workflow ownership, exact-SHA dispatch, and partition
coverage. Typed translator helpers now use lexical bindings, preserve namespace
boundaries and fail on unsupported prefixes. Token gates and map checks pass.
Static analysis and API-fixture browser
tests have their documented limits and do not replace real user journeys.

### Upstream refresh through 6336c3404

The next combined candidate includes upstream master through
`6336c340411809b3a94af1f4a911b30c0275447c`. Two commits narrow bound-conversation
authorization reads and correct eligible wake targets when resuming tasks. A
normal merge retains both upstream gates: no selected wake checkbox for zero
eligible agents, and no wake request for that preview. Resume removes the pause;
it does not promise that blocked, backlog or unassigned tasks start execution.

The original-upstream detector reports three added source findings and one removed
finding: separate restore/pause-removal phrases and a technical restore discriminator.
The existing restore translation, updated resume family and exact enum exception
address those findings without adding baseline debt. Manual source review also
identified the server-owned warnings newly exposed by the UI; they are outside the
configured client source roots. The tracking pin is prospective until the reviewed
stack reaches the fork default branch.

The dialog receives structured warning codes and translates six known app-owned
warnings. Unknown warning text remains literal and React-escaped. The existing
resume count family now describes pause removal in both languages. Independent
agent review checked the upstream authority/locking changes, all new EN/RU pairs,
plural case, both wake gates and the unknown fallback. Two complete task-tree
component tests passed, including the zero-target and live-warning regression.
A fresh-worktree UI typecheck first stopped on missing generated plugin SDK types;
the normal SDK prerequisite build resolved that setup error, and UI typecheck and
token gates passed without a source workaround.

The frozen candidate `6848bcc26aa4d53804a31468e6fc029f2a79169a` passed Linux
frozen installation, full Russian-default build, full workspace typecheck and native
fixture preparation. Its complete UI run finished with 9,235 passed and one failed
test across 806 files, with no skips. The failure was a stale source assertion for
`Retry queued`, now a catalog entry. The original failed run remains preserved.
Process and database cleanup passed; the checkout remains clean at that candidate.

The correction changes only two test files. It keeps the original API-binding
assertions, checks the translation key and unchanged English caption, and exercises
the selected failed-run callback in English and Russian. Switching language makes
no retry request; explicit retry submits the selected run, agent and company and
shows the translated queued notice. Both complete test files passed 172 tests;
UI typecheck and diff validation also passed. These focused results do not replace
the failed full run.

Seven affected backend files, fresh Russian list/detail journeys and the six
shipped paused/composer-stop E2E cases did not start and remain pending. The Stop
cases must use the deterministic fake provider and real runner binaries; a skipped
native case does not satisfy the matrix. English E2E builds must follow Russian
browser proof because they replace generated static UI assets. Recheck upstream
before actual deployment; this candidate is not production acceptance.

### Search and command palette integration

The search slice adds 158 reviewed semantic families, including the shared Close
caption. Review also re-examines the eleven reused status/priority families in
filter context. The 13 production owners cover the full-search page and palette,
results, desktop/mobile filters, sorting and recovery. One exact exception records
a `document` field discriminator in a title expression. The baseline removes 158
resolved occurrences and accepts no new debt.

Real Cmdk regressions found two issues during implementation: normal Enter could
open full search while an action was selected, and Cmdk could reorder already
ranked projects. The fixes preserve canonical values and existing project relevance
order. Final integration also found that markup-shaped queries and project names
could be interpreted by `Trans`. Both cases failed before explicit escaped
interpolation and unescaping restored the original literal text. The failed test
reports remain separate from successful checks. Component tests use API fixtures;
the complete live full-search journey remains pending. The final seven-file
component run passed 73 tests. UI typecheck, token gates, the 47 detector/sync
regressions, map validation and strict localization audit passed.

The prior frozen Linux candidate `6848bcc26aa4d53804a31468e6fc029f2a79169a`
passed frozen installation, full Russian-default build and full workspace
typecheck. Its full UI run completed with 9,235 passed and one failed test across
806 files, with no skips. The failure was an obsolete source assertion for the
literal `Retry queued` after that caption moved to the catalog. This is a failed
run, not a green qualification. The focused contract correction and behavioral retry
regression passed both complete test files (172 tests). Backend and live phases
did not start on the original candidate; process and database cleanup passed.
The frozen Inbox candidate `e80fc1532ce417f18c4c864f7d8ddabcc457c874` includes
that correction. It passed frozen installation, full Russian-default build,
workspace typecheck, all 810 UI files / 9,299 tests and seven affected backend
files / 257 tests, with no skips. Fresh Chromium list/detail journeys passed
12 and 11 checks respectively, including Cyrillic search, both list variants,
mobile layout and dirty-editor locale changes. Exceptions were absent, but
25 list and 23 detail ERR_ABORTED requests remain recorded. These local-trusted
journeys are not authenticated or production acceptance.

Four paused-composer cases and process Stop passed. Native Stop failed before
the work run because the deterministic provider also held the mandatory setup
hello. Read-only evidence confirms the pending setup turn. The overall run
remains failed; later S3/S4 and upstream changes are not covered. Process cleanup
passed. The E2E database cleanup remains unconfirmed due to retained marker files;
a separate observation found no active processes or listeners. Earlier failed
reports remain unchanged.

### Inbox integration

The next slice adds 151 reviewed semantic families (154 English forms and 160
Russian forms) across ten production owners. Both active Inbox renderers and
Blocked views translate their controls, actions, group labels, dates and local
errors. Approval type/subject wrappers are included, but their full payload
renderer and server-owned action descriptions are not. Existing toasts retain
the language in which their string snapshot was created.

Grouping first uses the original canonical sort, then translates the display
labels. IDs, collapsed groups, pinned order and Undo placement remain stable.
Known approval, blocked and fallback-error captions are searchable in either
language so changing locale does not remove a matching row. Names, diagnostics,
custom subjects and API-owned labels remain literal. The unavailable-agent label
covers missing or ineligible agents as well as paused ones; it does not claim
that every unavailable agent is paused.

Root review examined all catalog pairs, corrected agent-availability wording and
fractional-count grammar, and re-examined seven reused message families in their
new source contexts. Two exact enum exceptions cover display-resolver selection.
The baseline removes 190 resolved occurrences and accepts no new debt.

The worker's final eleven-file component/helper run passed 187 tests. After merging
the search slice and adapting the shared retry source contract, all twelve complete
files passed 199 tests. API-binding checks remain, with separate behavioral tests
for the selected retry payload, success navigation, error toast and no repeated
request during a locale change. The combined-host fixture uses real Inbox props;
it does not establish App redirects, server permissions or a live browser journey.
The full combined Linux and browser qualification remains pending.

### Shared decision and question forms

This slice adds 356 semantic families (382 English forms and 434 Russian forms)
across ten production owners. It covers shared decision previews and results,
interaction cards, paged questions, audience explanations, validation, image-input
controls and local resolution errors. The secret proposal page only gains its
justification caption. Decisions queues, the full chat/composer and remaining
secret management are outside this slice.

Helpers accept an optional translator with an English default. Error state stores
the original cause; rendering selects the current local message without repeating
the request. Unknown provider messages, custom action labels, question prompts,
names and document contents stay literal. Canonical IDs, resolver policies, signed
snapshots and submitted selections remain unchanged. Completed status changes use
a separate message from action previews, and task cancellation does not claim to
be irreversible.

Root review examined all source changes and English/Russian pairs. Corrections
cover operator/backlog terminology, complete sentences around names that cannot
be declined, fractional plural forms and completed-action wording. Six exact
exceptions describe technical verdict/action/property discriminators. The baseline
removes 286 resolved occurrences and accepts no new debt.

The final ten-file component/helper run passed 194 tests. UI typecheck and token
gates also passed. Tests preserve dirty text, focus, selected IDs and storage across
EN/RU/EN changes; explicit decisions send one expected payload. They also cover
permanent denials without retry, pending uploads, literal markup-shaped names and
plural counts including fractions. Failed fixture/expectation attempts remain
separate from the final successful run. APIs and the rich editor are mocked in
these component tests; they do not prove server authority or a real browser/MDX
journey. After normal integration with Inbox, the same ten complete files passed
194 tests again. UI typecheck, all 47 detector/sync regressions, token gates, map
validation and the strict source/catalog audit passed. These focused checks do
not replace the pending combined Linux and live qualification.

### Decisions, classic approvals and attention provenance

This slice adds 331 reviewed semantic families: 87 app-owned feed messages,
182 client captions and 62 classic approval messages. It adds 345 English and
373 Russian forms. Five exact exceptions describe non-rendered action enums;
244 resolved occurrences leave the source baseline, without accepting new debt.

Six optional metadata slots identify server-generated text. Closed codes and
named primitive arguments preserve original raw fields, null/empty behavior,
authority, SQL, ordering and pagination. The UI rejects unknown, malformed or
cross-slot descriptors and keeps the raw fallback. Custom text equal to an English
fallback is still custom text. Stored queue names and recovery/provider prose
remain literal without provenance. Bilingual search aliases and canonical sorting
keep matches and rows stable when language changes. Number captions now group
large English counts too.

Independent source and editorial review corrected a missing relative-time
translator and distinguished an agent's job title from a request title. Their
regressions failed first and then passed. Existing Custom date controls lost
Radix trigger props; the bounded forwarding fix opens the real popover and retains
its range across locales. A live screenshot also exposed an English task-list
date separator; its active-translator regression failed before the one-call fix.

The feed's five complete suites passed 97 tests, including company/private-task
boundaries on real PostgreSQL and both existing 16,400-row fixtures. Teardown
uses TRUNCATE CASCADE only in its disposable test database. It does not change
production SQL or relax timeouts. The keyed scale test took 167.58 seconds under
its existing 180-second limit; a prior body timeout remains evidence of possible
performance instability. Earlier hook failures remain recorded.

The client owner's six suites passed 117 tests and the helper passed 28. Classic
approval's final two files passed 15 tests. The combined serial 10-file snapshot
was 207/211: two genuine classic-approval RED findings were later fixed, while
two existing large-tree IssuesList cases still exceeded their 5-second limits.
The separator regression passed. This is not a complete local green run; the next
frozen Linux qualification must include the complete UI suite. Shared/direct
server and UI typechecks passed. Component APIs are mocked where stated.

Final source/catalog audit passed with zero pending, missing, invalid or new
findings and zero source errors. All 47 detector/sync regressions, eight fixture
checks, UI typecheck, token gates, map and diff checks passed on the integrated
source. These do not replace the pending full Linux and browser qualification.

The deterministic Stop fixture now lets setup complete, then enables an exclusive
work marker after authoritative ready/idle checks. Logs must match each actual
work/resumed run UUID; setup calls cannot satisfy the assertion. Four new shell
contract tests and four existing loader tests passed, as did narrow strict typing
and discovery. No real native rerun is claimed by those eight tests. The prior
failed qualification is retained. No production Runner or Rust code changed.

### Latest upstream candidate

The normal merge from `6336c340411809b3a94af1f4a911b30c0275447c` through
`1fbbef45a8d399771add7a27a04b12f3a20e264c` includes three upstream commits:
GitHub response-authority projections (#17686), recovery source/child projections
and agent-chat E2E cleanup (#17694), and the initial recovery candidate projection
(#17695). The merge completed without conflicts across 12 files. It adds no schema
migration, dependency or UI/catalog change.

Source review checked retained authority fields, company/source ownership and
unchanged recovery dispatch predicates. The new recovery-candidate projection
omits description from the initial scan; later branches can still load a full row.
This is not evidence that every recovery query is narrow or that latency improved.
The tracking pin is prospective until the reviewed stack reaches the default branch.

Frozen dependency installation and all 47 detector/sync regressions passed.
The original-upstream delta has no added/removed source findings, catalog changes
or audit errors. The strict merged-tree audit also passed: 3,427 reviewed families,
zero actionable findings and 18,112 existing debt occurrences. This does not prove
runtime acceptance.

The merged candidate `3ca7054e3f76d7f4fe02727729ac11cf93444f68` passed frozen
installation, full Russian build and workspace typecheck. Its complete UI suite
passed 9,411 tests in 815 files; affected attention tests passed 69 and affected
upstream GitHub/recovery tests passed 1,992, without skips. Russian list, detail
and Decisions/classic approval browser journeys passed 12, 11 and 11 checks.
The first Decisions driver failure remains recorded; its global heading selector
also matched the hidden command palette. The corrected driver scoped the heading.
List/detail aborted requests remain recorded. These are local-trusted results,
not authenticated or production acceptance.

Native Stop failed before work because its readiness assertion expected the
private `lifecycleOperation` field in the public agent response. The test-only
fix `ace0c027e70dd934d31ea484e4a239e756c827ff` preserves ready/idle checks and
asserts that the private field is absent. Its fresh native run passed readiness
but then failed to observe the three per-run provider `turn/start` receipts.
Stop itself was not reached. Source review and saved provider state traced this to
the test wrapper requiring `PAPERCLIP_RUN_ID`, which the Codex provider's filtered
environment does not supply. A test-only correction reads the run UUID from the
owned durable state associated with `CODEX_HOME`; its 23 fixture checks pass.
Candidate `40067580a` passed the fresh 23 fixture checks and native readiness,
per-run work receipts, parent Stop and explicit subtree Pause. It then failed on
an obsolete `Run cancelled` button selector; the actual current native status is
a muted `Stopped` span. The test-only correction `614f75c9` scopes that status to
the unique parent agent turn. Fresh complete native acceptance remains pending;
process Stop, paused composer and upstream chat journeys have not yet run.
Process cleanup
passed; original database cleanup remains unconfirmed with stale markers retained.
A later read-only observation found no active owned process or database listener.
The original failed receipts are unchanged. Earlier build/unit/browser evidence
is carried forward only for byte-identical inputs, with its original SHA stated;
it is not presented as a rerun on the test-fix SHA.

### Remaining journey packages

The task-chat/composer and run/recovery implementation passed editorial and source
review. It covers both active thread renderers and translates application captions
after canonical retry, grouping and identity decisions. Additive provenance keeps
custom provider text literal. Focused regressions retain drafts, queue revisions,
selection, uploads, expanded transcript details and privileged diagnostic gates.
Peer review found duration grammar, current-viewer attribution and two classic
selector captions to correct; those regressions now pass. The integrated audit
passes with 5,521 reviewed message families, no pending/missing/invalid messages,
new findings or source errors. It retains 16,972 existing source findings; catalog
parity does not establish full application coverage. Detector/sync tests pass
47/47 and token gates pass. The first full type check found an incomplete test
upload receipt, now fixed with the complete typed contract. A second check and
build found an incomplete local Copilot asset installation. The verified installer
recreated the ignored files from the pinned package. The complete `pnpm build`
and `pnpm -r typecheck` then passed on checkpoint `1a2bae9c2`. This does not certify
the later split trees or a complete fresh test suite. Publication and live
qualification remain pending. Split into
buildable run/recovery and chat/composer PRs below the repository's file limit.

The standalone run/recovery slice retains the older chat/composer consumers and
includes only their four required helper dependencies. Its 44 affected test files
pass 727 tests without skips, including 25 real PostgreSQL projection cases.
The scoped source audit passes with 4,836 reviewed families and 17,481 existing
source findings. Shared, UI and server type checks, UI/server builds, token gates and map structure
checks pass on `9fb470fe2`. The first server build populated missing ignored
Copilot assets; a warm supported build then recorded a valid Runner input stamp
and the exact commit. All copied source, catalog and lockfile hashes remained
unchanged. This is scoped standalone verification, not a fresh full monorepo test
suite. It does not establish full chat/composer or browser acceptance.

After chat, the remaining major packages are agent creation/configuration,
project details/environments, dashboard/activity/costs, member access/secrets,
connections and routines. Skills/teams/portability/plugin hosts have additional
coverage gaps. These are outstanding packages, not a claim that shared translated
components cover every host. Use the source audit and actual imports to set each
bounded scope; do not translate sandbox fixtures to reduce the baseline.

### Workflow activation

The three fork workflows prepare reviewed upstream merges, verify source and
translations, and publish immutable images only from verified `master` commits.
They do not auto-merge or deploy. Scheduled sync and image publication require
accepted default-branch integration and a successful first real run.

Actions is enabled, but its default token is read-only and Actions PR creation is
disabled. A sync App and registry publication have not been demonstrated. GitHub
cancelled earlier verification with `repository invocation blocked`; subsequent
confirmed pushes did not create PR workflow runs. The available API does not
establish the restriction's cause. Local verification does not make that hosted
gate green. The owner needs to resolve the account/repository restriction before
hosted acceptance, protection activation, or image publication.

The inherited `commitperclip PR Review` workflow was temporarily disabled after
its unguarded default-branch run failed on unavailable upstream configuration.
Re-enable it after its owner guard lands; fork verification remains enabled.
Activation, stack merge order, exact-SHA verification, and recovery are documented
in [the fork runbook](../localization/UPSTREAM.md).
