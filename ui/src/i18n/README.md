# UI localization

The Russian edition translates application-owned UI copy in both UI shells,
including reachable diagnostic routes. The current surface inventory and runtime
boundaries are in [COVERAGE.md](../../../doc/localization/COVERAGE.md). Follow
[UPSTREAM.md](../../../doc/localization/UPSTREAM.md) for source updates, verification
and publication, and [GLOSSARY.md](../../../doc/localization/GLOSSARY.md) for Russian
terminology. This guide describes implementation contracts, not a history of
translation slices or evidence that every runtime state has been visited.

## Catalogs and locale selection

The UI uses i18next and react-i18next. English messages in `locales/en.json` are
canonical. Add reviewed translations to the corresponding locale file; do not
copy English placeholders into other locales. `selectableLocales` exposes English
and Russian. Other seed catalogs may be partial and fall back to English.

The browser defaults to Russian unless `VITE_DEFAULT_LOCALE=en` overrides the
build default. An explicit preference in `paperclip.locale` takes precedence.
Changing language still works for the current page when storage is unavailable,
and updates the document language and direction. Server-side utility callers
without a browser retain English. Existing Vitest checks use the English default;
locale regressions exercise both languages and the production default resolver.

Import `useTranslation` from `@/i18n` so isolated components initialize the catalogs.
Resolve display text during rendering. Store semantic keys in static label maps;
do not freeze translated primitive strings at module initialization. Presentation
memos must depend on the translator or locale they read. A rerender alone does not
recompute a memo that calls a stable global translator. Keep raw data, query keys,
mutation inputs and resource-lifecycle dependencies independent of locale.

## Whole messages and literal data

Use complete messages with named interpolation. Use `Trans` with explicit named
components for rich text, and preserve the source markup placeholders. Include
nested visible captions in the message or translate them separately; a `<part/>`
placeholder does not translate hardcoded text inside that component.

Use `count` for plural families: English normally has `_one` and `_other`; Russian
has `_one`, `_few`, `_many` and `_other`, including fractional counts. Do not build
endings, sentences or quotation marks by concatenation. Missing-name fallbacks
need whole generic messages selected by explicit absence/provenance, not by
comparing a real name with an English fallback.

When `Trans` interpolates user content, pass
`tOptions={{ interpolation: { escapeValue: true } }}` and `shouldUnescape`, or use
an explicit component whose child is raw text. Names such as
`Operator <strong>name</strong>` must remain literal. React escapes the resulting
text; user data must not become translation markup or executable HTML.

Keep brands, routes, commands, paths, URLs, protocol identifiers, canonical enum
values and JSON/YAML keys exact. User names, task text, documents, instructions,
prompts, skill/release contents, terminal output and provider diagnostics remain
literal. An English-looking value is not proof that Paperclip owns it. Custom
captions and schema descriptions also stay literal unless their producer has an
explicit reviewed localization contract.

## State, errors and asynchronous work

Changing language must preserve drafts, focus, selection, open dialogs, pending
uploads, pagination, tab IDs and editor identity. Do not use translated labels as
React keys or action discriminators. Sort, group, deduplicate and classify using
canonical values before translating display text. Preserve the existing debounce,
retry, idempotency, permission and explicit-save rules; locale changes must not
restart OAuth polling, trigger requests or autosave.

Retain typed application-owned errors or closed descriptors and render them in
the current language. Preserve legacy English `Error.message` contracts and raw
causes. A provider error remains literal even when its message equals an owned
English error. Completion toasts resolve the language current at completion;
already-shown toast snapshots retain their creation language. Do not rely on
mutation-observer option replacement to refresh a captured translator.

Optional helper translators retain fixed English defaults for existing callers,
including canonical transcript/tool models and activity helpers. Live renderers
pass the active translator. Keep raw model fields, grouping keys, classification
and callbacks unchanged; display descriptors do not replace those fields.

Environment editors retain row IDs, values and secret-version bindings. Hosts may
call `flush()` explicitly or mark a localized external button with
`data-flush-environment-draft="true"`; language changes do not flush drafts.
`renderCreateSecretError` and `MarkdownEditor.renderImageUploadError` format owned
retained causes without recreating editor plugins or changing default consumers.
`validateJsonSchemaFormIssues` returns owned `JsonSchemaValidationIssue` objects;
supplied string errors stay literal. Legacy `validateField` and
`validateJsonSchemaForm` retain English output and existing path semantics; this
contract does not add JSON Pointer escaping.

## Provenance at external and server boundaries

Translate only known owned messages with valid parameters. Unknown codes, invalid
descriptors and untagged provider text keep their original display fallback.
Closed mappings use own-property checks; unknown lifecycle values must not become
active phases. The following boundaries require source review when producers change:

- Attention display slots validate their slot, code and primitive arguments.
  Workspace-close descriptors preserve the ordered raw reasons, warnings and
  actions, with validated indexes and action identity. The current strict SDK
  validator accepts legacy responses without descriptors and current descriptors;
  older strict SDKs may reject enriched responses, and future codes are not
  automatically compatible.
- Environment probe `summaryMessage` applies only to host-generated summaries
  and must match the driver/status. Original summaries and nested provider
  metadata remain raw, including empty or English-equal values. Task-resume
  warnings use known structured codes; unknown warnings remain literal. Removing
  a pause and starting execution remain distinct actions.
- Built-in GitHub registry captions require canonical local object identity or
  server-owned `displaySource` metadata. The gallery strips plugin-supplied
  markers. Only after provenance is established does the helper check known copy
  against reviewed English source; changed or unknown copy falls back to raw.
  The five-caption `github.json` contract test detects upstream copy drift that
  the generic UI scanner cannot see. This metadata grants no authority.
- Built-in agent captions use closed definition IDs, not stored names. Onboarding
  seed titles and descriptions and first-party announcements require their
  specific provenance and exact known source checks; arbitrary edited content
  stays raw. Recent-task snapshots preserve origin metadata rather than inferring
  it from a title.
- Synthetic transcript trim markers require provenance; identical provider log
  lines remain literal. Execution-label descriptors identify a confirmed wait
  for Muse or Dot without changing dispatch or authority. Saved tab IDs, order
  and custom titles remain raw; only an empty system document title with the
  known `plan` key receives its localized fallback.
- `lib/markdown-editor-i18n.ts` maps the built-in messages of the enabled MDXEditor
  plugins. Unknown library keys keep their supplied fallback with literal
  interpolation. Dependency updates require reviewing plugin keys/defaults and
  exercising their controls in both languages; the scanner does not inspect
  `node_modules`.

## Validation and verification

`message-validation.ts` is the pure validator shared by runtime and the source
audit. It rejects unknown keys, non-string or blank leaves, changed interpolation
or markup placeholders, unsafe content and excessive length. Runtime can accept
partial catalogs, but a supplied plural family must contain all required forms.
`locale-validation.ts` supplies the English reference. Tests and release checks
require complete Russian key and interpolation parity. An absent English key is
an error even when a call supplies `defaultValue`.

Run `node scripts/localization/check.mjs --check` for current findings, message
contracts and editorial fingerprints. The scanner covers UI render sinks, display
maps, copy arrays, accessible names and toast bodies, plus shared constants.
Dynamic key expressions need closed manifests. Classify retained technical values
with exact reasons; do not exclude production directories or grow the migration
baseline to hide new copy. Review source/context changes before refreshing review
metadata. New server producers need provenance review beyond the client scanner.

Use focused existing suites to check EN/RU/EN changes while preserving state,
exact payloads and request counts. Keep full-workspace and browser checks in the
required verification gate described in [COVERAGE.md](../../../doc/localization/COVERAGE.md).
Catalog parity is not screen coverage. Mocked component/API fixtures do not prove
live OAuth, provider delivery, authorization, billing, skill materialization or
cleanup. Record real journey results and deployed build identity separately.

For another language, review its BCP 47 catalog, plural forms and formatting, and
run the same source checks. Add it to `selectableLocales` only after editorial
and UI review.

## Foundation attribution

The initial foundation adapts the 19-file diff from
[upstream PR #17546](https://github.com/paperclipai/paperclip/pull/17546), head
`50b5204633a50b1982da2f7c0250ba4e8c31312a`, authored by
[mussolene](https://github.com/mussolene). This fork adds explicit supported
languages, the Russian default, plural-aware validation, terminology corrections,
expanded text coverage and regression tests. Upstream test reports are not
verification evidence for the adapted source.
