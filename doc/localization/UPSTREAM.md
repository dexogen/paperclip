# Maintaining the Russian fork

The maintained branch is `dexogen/paperclip:master`. Source integrations track
`paperclipai/paperclip:master`; they are integration builds, not official stable
releases. `upstream.json` records the last accepted upstream commit on the maintained
branch. The same field in a draft sync PR is prospective until that PR is merged.

## Workflows

- **Upstream localization sync** runs daily at 04:23 UTC (07:23 Moscow) and by manual
  dispatch from `master`. GitHub schedules may run late. It fetches immutable source
  SHAs, audits the upstream source delta, and prepares one draft PR on
  `codex/upstream-sync`. No automatic merge or deployment occurs.
- **Fork verification** runs on every PR into `master`, every `master` push, and an
  explicit dispatch bound to an expected full SHA. There are no workflow-level path
  filters. Require its **Fork integration verified** check on the maintained branch.
- **Russian edition image** publishes `ghcr.io/dexogen/paperclip:ru-<full-fork-SHA>`
  only after the latest successful `master` push verification of that exact SHA.
  Its verifier executes from the accepted default-branch revision, never an unchecked
  manual input. Its artifact records the image digest, upstream revision, catalog hash, and CI run.
  It builds `linux/amd64` with Docker target `production`. It does not deploy or move
  a mutable `latest` tag. Select a verified digest when updating an installation.

Every inherited workflow job has an explicit `paperclipai/paperclip` owner guard.
The fork workflows have a `dexogen/paperclip` guard. The workflow policy check rejects
newly imported workflows without a guard before any candidate branch is pushed, so a sync cannot silently enable upstream
publishing, paid evaluations, or bot integrations in this fork. Review workflow changes
before merging. The legacy upstream CI remains available in its original repository;
this fork runs its own checks instead of mutable upstream reusable workflows.

## One-time activation

During the initial fork PR, inherited `pull_request_target` workflows still use the
unguarded definition on `master`. If `commitperclip PR Review` fails because the
fork lacks upstream Dependency Review or bot configuration, disable that inherited
workflow in the fork's Actions settings while the foundation is under review. Keep
the failed run as evidence; disabling a workflow does not make that run pass. The
fork-owned verification must still pass on the actual candidate commit. After the
owner guard has landed on `master`, the inherited workflow can be enabled again;
its jobs will skip this fork. Do not disable the fork's verification to bypass a
code or test failure.

1. Merge the foundation and workflow changes into the fork's default `master` branch.
   The workflow definitions must exist there for schedules and manual dispatch.
2. Enable GitHub Actions for the fork. Allow Actions to create PRs if using the default
   repository token. Grant the job permissions declared in the workflows. Configure
   branch protection/rulesets to require `Fork integration verified` and review.
3. Prefer a GitHub App installed only on `dexogen/paperclip`. Give it repository
   **Contents: write**, **Pull requests: write**, **Actions: write**, and
   **Workflows: write**. Save its App ID as the Actions variable
   `UPSTREAM_SYNC_APP_ID`, and its private key as the Actions secret
   `UPSTREAM_SYNC_APP_PRIVATE_KEY`. Never commit the private key.
4. Ensure GitHub Packages permits this repository to publish
   `ghcr.io/dexogen/paperclip`; the build job uses its repository token with
   `packages: write`. No upstream registry or npm credentials are needed.
5. Dispatch **Upstream localization sync** once and inspect the artifacts and exact-SHA
   **Fork verification** run. Activate required checks only after their names appear.
   Review the first real integration and verify a published image before relying on
   recurring operation.

Without an App, synchronization uses `GITHUB_TOKEN`. It explicitly dispatches
verification on the pushed sync branch with the expected SHA; verification fails if
GitHub checked out a different revision. This avoids claiming that a bot push will
trigger CI by itself. PR creation must still be enabled, and changing workflow files
may require the App's Workflows permission. A permission failure stops the workflow
with its cause; no success is inferred. A frozen PR is redispatched only if no prior
dispatch exists for its current head, recovering an interrupted initial dispatch.

GitHub can automatically disable public schedules after 60 days without repository
activity. Re-enable the workflow and run it manually after inactivity. Check these
[trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
and [schedule rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
when changing authentication or scheduling.

## Review and merge an update

The report contains both the original upstream delta and the candidate-tree audit.
The former remains available when merging conflicts. The trusted scanner comes from
the accepted control revision; merged candidate code is not executed with write
credentials. Its config/exceptions come from the trusted policy root. Review changes
to audit rules, baseline, exceptions, review metadata, workflow files, and dependency
inputs explicitly; changing metadata does not establish editorial acceptance.

An open sync PR freezes its source revision and branch. The scheduler never resets
or force-pushes it, including after a person edits translations. New upstream commits
wait for the next batch. Complete translation and code review, run the required
checks, then merge with **Create a merge commit**. Do not squash or rebase a sync PR:
future integrations verify that the recorded upstream SHA is an ancestor of master.

The existing sync branch can be reused with a normal fast-forward push after all its
commits are included in master. A closed unmerged branch is preserved and blocks
reuse. Resolve or retain that work before restarting; the bot will not delete it.
The tracking state advances on master only when the reviewed candidate lands.

An initial merge conflict aborts only the disposable candidate worktree. Master and
remote branches remain unchanged. The failed run's summary names the conflicting
files and its artifact holds the upstream source delta. Resolve the merge in a
separate reviewed branch, preserve upstream ancestry, update `upstream.json` to the
actual incorporated SHA, and run the same checks. The bot never chooses `ours` or
`theirs` automatically. If a push succeeded but PR creation failed, create the draft
PR from the preserved `codex/upstream-sync` branch after fixing permissions; do not
reset that branch.

A missing/stale translation produces a draft PR with a failing localization check.
Use the localization review procedure to edit and approve messages; sync never
regenerates the baseline or marks translations reviewed. Current workflow automation
only prepares updates. Any future auto-merge policy must separately examine upstream
source/catalog changes and editorial acceptance, not just `report.ok`.

## Verification and recovery

The code lane installs the frozen dependency lock, selects the Runner toolchain from
`packages/paperclip-runner/rust-toolchain.toml`, and runs `pnpm build`,
`pnpm -r typecheck`, the three `general-workspaces-a/b/c` test groups,
`pnpm check:token-gates`, and `pnpm test:localization:browser` with Chromium.
The server test matrix runs four `general-server` shards and two `serialized` shards,
with at most three matrix jobs at a time. Every job has a 90-minute limit and all
shards finish even if one fails. Vitest workers are capped at two for workspace and
general server jobs and one for serialized jobs to bound runner memory use.
These groups together cover the same suite inventory
as `pnpm test:run`; the matrix does not remove chat or native Runner suites. Its
partition regression test checks for omissions and duplicates against the current
test planner. General server jobs build both debug process fixtures and the release
Runner binaries before test discovery, so missing binaries do not silently skip the
local native recovery cases. Existing opt-in live/container cases keep their own gates.
Each test job installs the frozen lock; the existing grouped test scripts prepare
workspace links and shared/plugin SDK builds. The required summary waits for every
matrix result, code checks, and localization checks.

The single serial server path exceeds 90 minutes in the checked-in historical timing
weights. Four general shards have about 26 minutes of serial weight each; the two
serialized shards have about 17 minutes each, before setup and host differences.
These are sizing estimates, not proof of hosted execution time.

The localization browser journeys exercise the shipped UI with API fixtures; they
do not replace full-stack auth tests. Genuine upstream
lockfile changes are allowed. An inconsistent lock stops verification; repair it in
an explicit dependency-maintenance change rather than suppressing the failure.
The localization lane exercises the scanner and sync tests and checks the reviewed
catalog and new literals. Ordinary verification builds use English for existing
browser/test contracts; locale tests select Russian explicitly. Production image
builds use the fork's Russian default.

In WSL, the headless browser fixture removes `DISPLAY`, `WAYLAND_DISPLAY`, and
`XDG_RUNTIME_DIR` from the browser child process only. In this environment, inherited
WSLg settings stopped animation frames even on a plain HTML page while timers kept
running; clicks could not pass Playwright's stability check and screenshots stalled.
The fixture retains actionability checks and the real application. It preserves the
parent environment, non-WSL launches, and headed debugging (`--headed` or `PWDEBUG`). The config
sets the headless option explicitly so the launch fixture can read the resolved mode.

Local checks for the orchestration code:

```sh
node --test scripts/upstream-sync/*.test.mjs
node scripts/upstream-sync/check-workflows.mjs
node scripts/localization/check.mjs --check --json /tmp/localization.json --markdown /tmp/localization.md
```

The tests use temporary Git repositories and stubbed API calls; they do not publish
branches, PRs, or images. They cover ancestry, conflict cleanup, preserved unmerged
work, exact-source dispatch, and publication qualification. A local pass is not
proof of GitHub App configuration or a hosted workflow run.

Keep prior image digests for rollback. Reverting an image is insufficient when an
upstream update changed database compatibility; take and test appropriate backups
before deployment. Automatic deployment is intentionally outside this workflow.
