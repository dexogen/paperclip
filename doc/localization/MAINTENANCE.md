# Scheduled maintenance of the Russian edition

The repository owner authorizes routine stable upstream release integration, contextual Russian
translation, merge after all required checks pass, and updates of the existing
installation. This does not authorize data resets, account creation, automatic
database restores, or weakening branch protection.

The accepted source can still be a master build while tracking is set to stable.
The already approved PR #32 deployment completes the transition; subsequent
scheduled maintenance must not automatically merge or deploy master candidates.
Master is available only through explicit manual channel selection and separate
owner authorization to merge and deploy that update.

## Schedule and responsibility

- GitHub Actions checks published, non-prerelease upstream releases daily at
  04:23 UTC (07:23 Moscow). Manual sync defaults to stable; master requires an
  explicit channel choice.
- The local Codex maintenance task runs daily at 08:15 Europe/Moscow with
  `gpt-6.1-sol` and reasoning effort `high`. It starts from its saved project prompt.
- The desktop computer and Codex app must be running for the local task. A GitHub
  schedule can also be delayed. If the sync run has not completed, inspect it before
  starting another run. Resume unfinished work before starting a newer batch.
- The App installation is limited to this fork. It needs Contents, Pull requests,
  Actions, and Workflows write permissions. Its private key stays in the repository's
  Actions Secret and the owner's private credential store, never in this repository.

The deterministic GitHub workflow discovers changes and prepares a candidate. The
maintenance agent reviews meaning, changes translations, investigates failures, and
deploys the verified result. Neither a detector result nor a successful diagnostic
dispatch substitutes for the required push check.

## Process each batch once

1. Read the latest published, non-prerelease upstream release, its exact tag peeled
   to a commit, `upstream.json`, open sync PR, and installed version. Compare the
   tracking policy with the accepted source channel; do not infer stable status
   from a branch name or `git describe`. If all are current and there is no incomplete work, stop without another
   source audit, install, build, or test run.
2. Continue the existing sync PR without force-pushing or replacing its branch.
   Respect its frozen channel and source; a master candidate needs owner action
   before merge or deployment. Otherwise run **Upstream localization sync** for
   stable. An older release is a normal waiting state without a PR or downgrade;
   a divergent release is a failure requiring investigation. Accept a descendant
   release with its history. An exact same-SHA release promotion still needs a
   metadata PR and verification. If a merge conflict prevents PR
   creation, resolve the reported integration in an isolated worktree. Pin one
   upstream SHA for this batch and preserve its ancestry with a merge commit.
3. Review the upstream delta first. Read changed text in its UI and service context.
   Preserve stable technical terms, product names, identifiers, external diagnostics,
   and user content. First-party server messages shown in the UI require a trusted
   localization descriptor or an explicit code; do not translate arbitrary strings
   by matching their text. Read [GLOSSARY.md](GLOSSARY.md).
4. Update catalogs and review only the messages whose meaning, translation, or
   source context changed. Do not regenerate baseline debt to hide findings. Use
   [DETECTOR.md](DETECTOR.md); record agent reviews as `--method agent`.
5. Run the smallest meaningful tests for changed behavior, the localization check,
   and token gates for UI changes. Review dependencies, migrations, workflows, and
   upstream behavior changes even if they do not add text. Keep the generated
   dependency lock out of commits. Review the Russian revision: once a stable
   version is published, every new fork SHA needs an increment for that same
   upstream version, including translation-only and documentation-only changes.
   A green source CI does not permit reuse of the previous publication version. Do not
   reuse or overwrite an existing version tag for different source.
6. Push the complete candidate to `codex/upstream-sync` using the configured App or
   owner identity. Open or update the PR against `russian` using its template. Wait
   for **Fork integration verified** from an eligible push run of the exact final
   head. Do not launch a competing dispatch. Diagnose failed jobs before retrying;
   a new commit needs a new verification run. The owner's fork-specific waiver
   permits one integration PR without Greptile or the 100-file limit; all actual
   CI gates and branch protections still apply.
7. Recheck the PR head and base. Resolve actionable reviews. Merge with a merge
   commit only after checks pass. Verify ancestry and delete the merged temporary
   branch. Keep `russian` as the only permanent fork branch. Confirm the accepted
   `russian` SHA has its own eligible green push verification before publishing a
   stable image or GitHub release. No npm publication is part of this process.
8. Follow the operator's private deployment runbook and local environment bindings.
   Use the immutable dependency-lock artifact from the accepted CI run. Preserve
   database, app home, credentials, configuration, telemetry opt-out, and provider
   CLI access. Review migrations and backup coverage before activation. Prepare the
   full build while the old service remains available. Use the accepted channel
   version: stable `<upstream-version>+ru.<revision>` or, for an explicitly authorized
   master update, `master-<short-upstream-SHA>-ru.<short-fork-SHA>` (12-character SHAs).
   Stable image tags use `<upstream-version>-ru.<revision>`; GitHub release tags
   add a leading `v`. Immutable
   `ru-<full-fork-SHA>` image tags and digests remain available. Set
   `PAPERCLIP_BUILD_VERSION` in the LXC service unit environment so the running
   source checkout uses this explicit version ahead of Git metadata.
9. Verify the live source version, health, access boundary, telemetry configuration,
   and an appropriate browser journey. Source CI, fixture browser tests, and live
   acceptance are separate evidence. Do not register users or invoke paid providers
   as a routine smoke test. Publish the operational documentation and remove only
   this task's accepted temporary worktrees and expired recovery materials.

If upstream changes again during this batch, leave those commits for the next run.
At the policy transition, accepted master commit
`0cb3fc7db591ba23e21fbbc70042bc44ec7d6f20` is newer than release `v2026.1023.0`.
Wait for a release containing the accepted commit; do not label the current build
with that older stable version or downgrade the installation.
If the merge succeeds but deployment fails, the next run must resume deployment of
the accepted source before integrating another batch. A blocked action must retain
its exact source, PR, CI run, and next step without claiming success.

Report the upstream/source revisions, PR and CI links, translated areas, live
version, and any material blocker. Keep routine unchanged checks quiet.
