# Scheduled maintenance of the Russian edition

The repository owner authorizes routine upstream integration, contextual Russian
translation, merge after all required checks pass, and updates of the existing
installation. This does not authorize data resets, account creation, automatic
database restores, or weakening branch protection.

## Schedule and responsibility

- GitHub Actions checks upstream daily at 04:23 UTC (07:23 Moscow).
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

1. Read the current upstream SHA, `upstream.json`, open sync PR, and installed
   version. If all are current and there is no incomplete work, stop without another
   source audit, install, build, or test run.
2. Continue the existing sync PR without force-pushing or replacing its branch.
   Otherwise run **Upstream localization sync**. If a merge conflict prevents PR
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
   dependency lock out of commits.
6. Push the complete candidate to `codex/upstream-sync` using the configured App or
   owner identity. Open or update the PR against `russian` using its template. Wait
   for **Fork integration verified** from an eligible push run of the exact final
   head. Do not launch a competing dispatch. Diagnose failed jobs before retrying;
   a new commit needs a new verification run. The owner's fork-specific waiver
   permits one integration PR without Greptile or the 100-file limit; all actual
   CI gates and branch protections still apply.
7. Recheck the PR head and base. Resolve actionable reviews. Merge with a merge
   commit only after checks pass. Verify ancestry and delete the merged temporary
   branch. Keep `russian` as the only permanent fork branch.
8. Follow the operator's private deployment runbook and local environment bindings.
   Use the immutable dependency-lock artifact from the accepted CI run. Preserve
   database, app home, credentials, configuration, telemetry opt-out, and provider
   CLI access. Review migrations and backup coverage before activation. Prepare the
   full build while the old service remains available.
9. Verify the live source version, health, access boundary, telemetry configuration,
   and an appropriate browser journey. Source CI, fixture browser tests, and live
   acceptance are separate evidence. Do not register users or invoke paid providers
   as a routine smoke test. Publish the operational documentation and remove only
   this task's accepted temporary worktrees and expired recovery materials.

If upstream changes again during this batch, leave those commits for the next run.
If the merge succeeds but deployment fails, the next run must resume deployment of
the accepted source before integrating another batch. A blocked action must retain
its exact source, PR, CI run, and next step without claiming success.

Report the upstream/source revisions, PR and CI links, translated areas, live
version, and any material blocker. Keep routine unchanged checks quiet.
