# Maintaining the Russian fork

The maintained branch is `dexogen/paperclip:russian`. Source integrations track
`paperclipai/paperclip:master`; they are integration builds, not official stable
releases. `upstream.json` records the last accepted upstream commit on the maintained
branch. The same field in a draft sync PR is prospective until that PR is merged.

## Workflows

- **Upstream localization sync** runs daily at 04:23 UTC (07:23 Moscow) and by manual
  dispatch from `russian`. GitHub schedules may run late. It fetches immutable source
  SHAs, audits the upstream source delta, and prepares one draft PR on
  `codex/upstream-sync`. No automatic merge or deployment occurs.
- **Fork verification** runs on pushes to `russian` and `codex/upstream-sync`, plus
  an explicit dispatch bound to an expected full SHA. It checks the branch commit,
  not a synthetic PR merge commit. There are no workflow-level path filters.
  Require its **Fork integration verified** check from an eligible push run on the
  maintained branch; manual dispatch is diagnostic evidence, not a replacement.
- **Russian edition image** publishes `ghcr.io/dexogen/paperclip:ru-<full-fork-SHA>`
  only after the latest successful `russian` push verification of that exact SHA.
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

Before migration to `russian`, inherited `pull_request_target` workflows can use
the old unguarded definition on `master`. If `commitperclip PR Review` fails because the
fork lacks upstream Dependency Review or bot configuration, disable that inherited
workflow in the fork's Actions settings while the foundation is under review. Keep
the failed run as evidence; disabling a workflow does not make that run pass. The
fork-owned verification must still pass on the actual candidate commit. After the
owner guard has landed on `russian`, the inherited workflow can be enabled again;
its jobs will skip this fork. Do not disable the fork's verification to bypass a
code or test failure.

1. Publish the verified integration history as `russian` and make it the fork's
   default branch. It is the only permanent fork branch. Keep the upstream
   source branch `paperclipai/paperclip:master` unchanged. The workflow definitions
   must exist on `russian` for schedules and manual dispatch.
2. Enable GitHub Actions for the fork. Allow Actions to create PRs if using the default
   repository token. Grant the job permissions declared in the workflows. Configure
   branch protection/rulesets to require `Fork integration verified` and review.
   Enable **Automatically delete head branches** (`delete_branch_on_merge`) so
   temporary PR branches, including `codex/upstream-sync`, are deleted after merge.
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

Without an App, synchronization uses `GITHUB_TOKEN`. Its push does not trigger
another workflow, so explicit dispatch supplies diagnostic verification bound to
the expected SHA. GitHub does not count workflow-job checks from `workflow_dispatch`
toward required branch-ruleset checks. Merge still requires an eligible push run
from an App or repository owner; do not weaken branch protection or treat a manual
success as merge approval. See GitHub's [required-check event rules](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks#checks-from-some-workflow-jobs-are-not-evaluated).

When the App token is present, sync waits for the automatic push run and never
issues a competing fallback dispatch, even before that run appears in the API.
With `GITHUB_TOKEN`, an existing push or dispatch for the same repository, workflow,
branch and SHA prevents another dispatch. A failed run remains failed; retry the
eligible push run after diagnosis. If an owner reviews a token-created candidate
and has no source changes, a reviewed empty commit pushed with the owner's identity
can start the required push verification. A successful diagnostic dispatch alone
is insufficient.

PR creation must still be enabled, and changing workflow files may require the
App's Workflows permission. A permission failure stops synchronization with its
cause; no success is inferred.

GitHub can automatically disable public schedules after 60 days without repository
activity. Re-enable the workflow and run it manually after inactivity. Check these
[trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
and [schedule rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
when changing authentication or scheduling.

## Review and merge an update

All new update PRs target `russian`. The `codex/upstream-sync` branch is temporary;
it exists only while an update is being reviewed. Historical stacked PRs remain
review evidence, not permanent maintenance branches. PR creation, retargeting and
base-branch changes do not start verification. Before merge, integrate the current
`russian` base into the candidate with a merge commit and require the eligible push
check on its resulting exact head SHA. Other temporary branch names need an explicit
workflow change before they can receive automatic verification. Accept the upstream
tracking state only when the reviewed integration lands on `russian`.

Push and dispatch share one concurrency group per branch. The workflow does not
create a competing synthetic-merge check. Existing failed or cancelled runs remain
failure evidence; changing triggers does not turn those runs into successful checks.

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
future integrations verify that the recorded upstream SHA is an ancestor of `russian`.

After a merge commit includes the sync head in `russian`, GitHub deletes the
temporary head branch through the repository setting above. The next update creates
`codex/upstream-sync` again. If automatic deletion did not occur, remove the merged
head only after verifying its ancestry and that it has no unmerged work. A closed
unmerged branch is preserved and blocks reuse; the bot never deletes unmerged work.
The tracking state advances on `russian` only when the reviewed candidate lands.

An initial merge conflict aborts only the disposable candidate worktree. The maintained and
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

The sync job installs trusted audit tooling with `--no-frozen-lockfile --ignore-scripts`
and filters for the root and UI packages. This permits upstream manifest changes
whose committed lock is stale. Resolution stays in the isolated Actions control
checkout, without lifecycle scripts. The candidate is created in a separate worktree
from the committed fork SHA; the generated control lock is neither copied into it
nor committed to the update PR. Candidate verification and image publication still
use the single source-bound dependency-lock artifact described below.

The dependency-lock job resolves manifest changes once, without lifecycle scripts,
using the same resolution command as upstream CI. It rejects changes outside the
unstaged `pnpm-lock.yaml`. Its artifact contains the lock and a manifest bound to
the source commit, Git tree, verification run and SHA-256 digest. Every lane verifies
and applies this artifact before a frozen install; lanes do not resolve independently.
The artifact name stays stable for retries. Rerunning failed jobs reuses it, while
rerunning the complete workflow replaces it from the dependency-lock job.

The code lane installs that frozen dependency lock, selects the Runner toolchain from
`packages/paperclip-runner/rust-toolchain.toml`, and runs `pnpm build`,
`pnpm -r typecheck`, the three `general-workspaces-a/b/c` test groups,
`pnpm check:token-gates`, and `pnpm test:localization:browser` with Chromium.
The server test matrix runs four `general-server` shards and two `serialized` shards,
with at most six matrix jobs at a time, each on an independent hosted runner.
Every job has a 90-minute limit and all shards finish even if one fails. Vitest workers are capped at two for workspace and
general server jobs and one for serialized jobs to bound runner memory use.
These groups together cover the same suite inventory
as `pnpm test:run`; the matrix does not remove chat or native Runner suites. Its
partition regression test checks for omissions and duplicates against the current
test planner. General server jobs build both debug process fixtures and the release
Runner binaries before test discovery, so missing binaries do not silently skip the
local native recovery cases. Existing opt-in live/container cases keep their own gates.
Each test job installs the frozen lock; the existing grouped test scripts prepare
workspace links and shared/plugin SDK builds. The required summary waits for every
matrix result, code checks, localization checks and the dependency-lock job.

The single serial server path exceeds 90 minutes in the checked-in historical timing
weights. Four general shards have about 26 minutes of serial weight each; the two
serialized shards have about 17 minutes each, before setup and host differences.
These are sizing estimates, not proof of hosted execution time.

The localization browser journeys exercise the shipped UI with API fixtures; they
do not replace full-stack auth tests. The checked-in lock remains owned by upstream
automation. Resolution failures still stop verification. Image publication downloads
the lock from the accepted verification run and passes its digest to Docker's
verified-lock mode, which checks the digest and performs only a frozen install.
The image provenance includes the lock digest. A source deployment must likewise
retain and use the verified artifact; its generated lock is a documented build
input, not a manual repository lockfile commit.
The localization lane exercises the scanner and sync tests and checks the reviewed
catalog and new literals. Ordinary verification builds use English for existing
browser/test contracts; locale tests select Russian explicitly. Production image
builds use the fork's Russian default.

Six original workspace/recovery tests failed because Git reports a non-repository
directory differently at a filesystem boundary. A controlled
`GIT_DISCOVERY_ACROSS_FILESYSTEM=1` comparison identified the cause. The integration
fix shares an exact diagnostic recognizer between managed checkout preparation and
the heartbeat worktree probe. Each caller retains its own exit, signal, and Git
override checks. Plain task directories still require explicit authority; heartbeat
also requires proof that Git metadata is absent and the workspace is an explicit
local-path source. Damaged metadata and unexpected errors remain reportable. Real
filesystem-boundary regressions first failed, then passed with the fix. Test jobs
use Git's ordinary discovery behavior again.

The Linux full-suite run also exposed diagnostic corruption from an inherited
`XDG_SESSION_CLASS=user`: the secret collector treated the standard session class
as an unknown credential and masked `user` inside error codes. Only this exact
inherited key/value pair is now public. Explicitly declared secrets, non-inherited
bindings, and unknown values remain private. Regression checks preserve those
privacy boundaries and the original heartbeat recovery assertions.

The OpenCode shell-hook fixture invokes Bash with `--norc` so that an inherited
SSH session does not select the remote-shell startup path instead of `BASH_ENV`.
The fixture still sources the generated hook, checks the child's actual OOM
preference, and verifies that the parent environment and score are unchanged.
Both the original failure and the correction were reproduced with controlled SSH
metadata. No runtime hook or container security policy changed. See the
[Bash startup rules](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html).
Linux source-test environments also need `jq` for the issue-update and file-delivery
Bash helper tests; missing prerequisites are failures, not platform skips.

A separate sandbox test accepts a positive shell exit status for denied redirection:
shells can return either 1 or 2. It still verifies a successful in-workspace write,
denied external read, and unchanged external file. The original failed hosted run
remains part of the verification record.

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

An enabled workflow is not evidence that GitHub accepted its execution. If jobs
are cancelled with `repository invocation blocked`, preserve the run and annotation
and ask the repository owner to check GitHub's account/repository notices. The
annotation alone does not establish a billing or policy cause. Do not disable the
required checks or treat a separate local test run as a successful hosted run.

Keep prior image digests for rollback. Reverting an image is insufficient when an
upstream update changed database compatibility; take and test appropriate backups
before deployment. Automatic deployment is intentionally outside this workflow.
