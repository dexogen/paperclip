# Localization drift checks

The detector checks catalog correctness, declared editorial review and known source
text sinks separately. It does not translate or approve text. Run from the checkout
root with Node 24.11+ after the full `pnpm install --frozen-lockfile`.

## Commands

```sh
node scripts/localization/check.mjs --check
node scripts/localization/check.mjs --json /tmp/localization.json --markdown /tmp/localization.md
node --test scripts/localization/detector.test.mjs
```

`--check` exits 1 on actionable candidate-tree findings; malformed inputs or tool
failures exit 2. Without `--check`, a successful audit exits 0 even when findings
exist, so a sync workflow can publish its report. JSON is the complete report;
Markdown limits each section to 150 rows. It escapes source markup and mentions.
Neither invocation changes catalogs, baseline, review records or Git state.

The AST parser comes from the installed UI Storybook dependency, using the same
resolution pattern as `scripts/storybook-button-usage.mjs`. Lexical value bindings
use Storybook's pinned `internal/babel` traversal export, with a bounded overlay
for TypeScript type names. A production-only or
filtered dependency install is insufficient. The dependency failure is explicit.
This avoids the removed `createSourceFile` JavaScript API in TypeScript 7; parser
smoke coverage runs as part of the detector tests.

## Upstream and candidate checks

```sh
node /trusted/checkout/scripts/localization/check.mjs \
  --root /candidate/checkout --policy-root /trusted/checkout \
  --base <last-accepted-upstream-sha> --head <candidate-upstream-sha> \
  --json /tmp/localization.json --markdown /tmp/localization.md
```

`--root` selects the files and Git object database to read. The detector and shared
message validator execute from the tool checkout, not from candidate source.
`--policy-root` optionally reads scan configuration and exceptions from a trusted
checkout. Baseline and review state are always read from the candidate. Policy,
baseline, review and detector changes need review before acceptance.

Both Git refs are resolved to commits before reading objects. The report compares
original upstream source and English catalog even when the downstream merge fails.
It also audits the current candidate files, catching mistakes in conflict resolution.
`report.upstream` contains source `added`/`removed` findings, catalog
`added`/`changed`/`removed` records and audit errors.

An upstream delta is a review signal, not a permanent candidate-tree failure:
the range remains unchanged after a translator addresses it. Automatic merge
eligibility must separately require no upstream text delta or an explicit reviewed
disposition. A passing `report.ok` alone never grants merge permission.

## Source audit and migration debt

`config.json` declares source roots and any explicitly justified exclusions. Tests,
stories, declaration files, fixtures and built output are not production UI coverage.
Both ordinary and `.production.tsx` components are scanned. Known sinks include:

- JSX text and child expressions;
- visible attributes including accessibility labels, placeholders and tooltips;
- object fields such as labels, descriptions, titles and messages;
- shared `*_LABELS`/`*_TITLES`/`*_DESCRIPTIONS`/`*_MESSAGES` display maps;
- toast, alert, confirmation and local error/message setter calls;
- complete template messages, with substitutions retained as context.

The parser recognizes imports and aliases of `t` and `useTranslation`, helper
parameters typed with an imported i18next `TFunction` (including type aliases
at import and default values), literal
fallback-key arrays and conditional literal keys, and `Trans`'s `i18nKey`.
Typed parameter names are scoped to their function; an ordinary callback with
the same name in a sibling or nested function is not a translator declaration.
Literal namespaces and explicit namespace-qualified keys are supported. Unknown
namespaces and nonempty or unknown key prefixes fail with a source audit error;
the detector does not infer them from arbitrary runtime values. Prefer complete
static message keys in these helpers.
Every static reference must exist in English, even with `defaultValue`. Runtime
keys need a `dynamicKeys` manifest with `file`, `expression`, optional `owner`,
explicit `keys` and `reason`; those declared keys receive the same catalog checks.
Static calls also declare their supplied interpolation names through object options
or `Trans` values/count props. Missing names and missing plural `count` selectors
fail the check; directly selecting a suffixed form only requires its actual
interpolations. A changed parameter contract invalidates review. Unknown option
objects, computed properties and spreads require manual inspection and rewriting
as explicit named properties; they are not accepted as evidence that parameters
exist. This is deliberately conservative and does not evaluate runtime values.

The sink inventory includes search/loading placeholders, empty-selection labels,
mobile selector headings, trigger accessible names, toast bodies, disabled
and secondary action labels, named display/copy maps, copy arrays and literal
arrays mapped directly into JSX. Comparison operands, enum lookup keys and type
literals do not become display copy; result branches remain scanned. New sinks
have regression fixtures, including negative discriminator cases.

Catalog analysis indexes references and translations by semantic family. This
avoids repeatedly scanning the complete catalog for each message while preserving
context/parameter ordering and existing review fingerprints.

A finding ID includes the file, enclosing named function/variable, sink kind,
normalized text and occurrence number. Moving lines does not invalidate an ID.
Changing text, introducing another occurrence or moving between owners does.
Renames conservatively appear as removal plus addition.

Existing hardcoded text can be recorded once as migration debt, after inspecting
the initial report and the declared scope:

```sh
node scripts/localization/baseline.mjs --write --reason "Existing UI text awaiting staged translation"
```

The snapshot stores one shared rationale and compact `{id, file}` entries, one
entry per line. Full finding text and context remain in the generated JSON/Markdown
reports. Legacy entries with their own reason remain readable. Compacting an
existing snapshot preserves its exact ID set; it must not accept new findings.

This refuses to replace an initialized baseline. Checks never add new debt. After
translation, remove resolved entries with:

```sh
node scripts/localization/baseline.mjs --write --prune
```

Technical text that intentionally remains unchanged can have a narrow exception
in `exceptions.json`: its finding `id` and an explicit `reason`. Broad file ignores
hide future strings and should not be used for one technical label.

## Translation review state

English is canonical. Catalog checks reuse the runtime's pure
`ui/src/i18n/message-validation.ts` validator. Russian plural categories can differ
from English; whole message families are reviewed as one semantic ID.

`reviewed.json` binds review to both the English contract/context fingerprint and
the Russian translation fingerprint. Changes to either make the record stale.
New messages are `draft` or `missing`; valid JSON is not editorial approval.

After actually examining selected messages in their product context, write their
semantic IDs to a JSON array and record who performed the review:

```sh
node scripts/localization/review.mjs --keys-file /tmp/reviewed-keys.json \
  --reviewer "Reviewer name" --method human
```

Use `--method agent` for an agent review; never label it human. The command refuses
unknown, missing or invalid messages and has no automatic "approve all" mode.
Records require valid hashes, a named reviewer, `human` or `agent`, and a valid
canonical UTC ISO timestamp. The record is a declaration of examination, not an
independent quality guarantee.
Deleted messages are reported as obsolete review records for deliberate cleanup.

## Limits and verification

This is a bounded syntax audit, not general data-flow analysis. Text arriving through
arbitrary computed variables, external libraries, server responses, spread props or
unregistered presentation APIs may require manual classification and UI journeys.
Imported display metadata outside configured roots needs an explicit source entry.
Catalog coverage cannot establish application-wide translation coverage.

Regression tests exercise new literals, changed text, extra occurrences, line
movement, aliases and rich text keys, masked missing keys, review invalidation,
Russian plural/parameter failures, explicit baseline handling and original upstream
diffs independently of a merge. Source parse failures are reported and fail checks.
