# UI localization

The UI uses i18next and react-i18next. English messages in `locales/en.json`
are the source of truth. Add reviewed translations to the corresponding locale
file; do not copy English placeholders into other locales. A partial locale
falls back to English. The fork currently exposes English and Russian through
`selectableLocales`; the other seed catalogs are retained for future work.

The fork defaults to Russian in the browser. `VITE_DEFAULT_LOCALE=en` overrides
that build default. An explicit browser preference, saved as `paperclip.locale`,
takes precedence. If storage is unavailable, changing language still works for
the current page. Locale changes update the document language and direction.
Server-side utility callers without a browser retain English. The existing
Vitest suite explicitly builds with the English default; localization tests
exercise both languages and the production default resolver.

Import `useTranslation` from `@/i18n` in React components so isolated consumers
also initialize the catalogs. Resolve labels during rendering so a
language change updates the screen without remounting it. Keep semantic keys in
static label maps and translate them inside the component. Include `t` in memo
and effect dependencies when a callback reads translated text. Do not translate
stored identifiers, routes, commands, provider diagnostics, or user content.

Use whole messages and named interpolation. Use `Trans` for messages containing
React markup and explicit named components, preserving the source's markup
placeholders. Do not interpolate executable HTML. Translate a plural family with
`count`: English normally uses `_one` and `_other`; Russian uses `_one`, `_few`,
`_many`, and `_other`. The latter also covers fractional counts. Do not construct
Russian endings by concatenating strings.

When `Trans` interpolates user content, pass
`tOptions={{ interpolation: { escapeValue: true } }}` and `shouldUnescape`.
This preserves literal names such as `Operator <strong>name</strong>` instead of
interpreting them as translation markup. React still escapes the resulting text.
Keep local error identifiers in state and translate them during rendering so an
existing error follows a language change without repeating the failed operation.

`message-validation.ts` is the pure validator shared by runtime and the source
audit. It rejects unknown keys, non-string leaves, blank translations, changed
parameters/markup placeholders, unsafe content, and excessive length. Missing
whole messages may be allowed, but a supplied plural family must include all of
the target locale's required forms. `locale-validation.ts` supplies the canonical
English reference for browser callers. Runtime allows partial catalogs; tests
and release checks require complete Russian translations for registered messages.
The absence of an English key remains an audit error even if a call has a
`defaultValue`.

For another language, add a BCP 47 catalog, review its plural forms and formatting,
and run the same source-change checks. Add it to `selectableLocales` only after
its declared scope passes editorial and UI review. Catalog coverage is separate
from remaining hardcoded source text and verified user journeys.

The initial localized surfaces include self-hosted sign-in, organization
selection, primary navigation, account actions, agent-list controls, and task
creation controls, warnings, and notifications; profile preferences; project browsing;
and the modern task collection toolbar, list copy, and main filter popover.
The next slice adds first-administrator bootstrap, access-gate messages, board
claim, the active onboarding wizard and its model/provider setup controls,
organization settings, instance general/access settings, and their permission
controls. Provider account selection and the shared access step are included;
the complete Connections catalog and its other setup steps are not.
The task collection slice also covers the legacy list, board, column picker,
shared rows, status picker, hover previews, retry indicators, and external-object
summaries. Both standard and legacy task lists pass the active translator to
their display helpers. Those helpers retain English defaults for other callers
whose existing contracts still use English labels. Language changes preserve
search text, open controls, pagination, user titles, and canonical status values.
The design-sandbox-only refreshed filter panel is outside this production slice.

The task-detail slice covers the page shell, properties, privacy and sharing,
relations, subtask controls, monitor and retry presentation, and common inline
and Markdown editors. Locale regressions check literal names, drafts, selection,
dialog state and explicit mutations. They use mocked requests and do not certify
server authorization or a live task-detail journey. Chat/composer and activity
coverage is described separately below.

The task-panel slice covers document and attachment panels, artifact and output
controls, workspace file browsing and previews, browser controls, and side-panel
tabs. Built-in tab labels resolve from their canonical payload during rendering;
saved tab IDs, order, selection and custom titles keep their original values.
Only an empty system document title with the known `plan` key receives a translated
fallback. User titles, file paths, document bodies and server diagnostics remain
literal. Locale regressions preserve dirty/conflicted document drafts, selected
resources, pending uploads, clipboard state and browser viewer identity, and check
that changing language does not repeat saves, uploads or browser control requests.

Advanced annotation tools remain outside the panel slice. Chat/composer, browser
activity and the expanded work-product card are covered by the later chat slice.
Component tests do not establish a complete browser journey or server permission
coverage.

The search slice covers the full-search page, result and empty states, desktop
and mobile filters, sorting, recovery suggestions, and the command palette. Search
operators and URLs remain canonical. Switching language preserves the query,
selection, filter draft and request count. Command names and known agent roles are
searchable in both languages. Stable command IDs preserve selection; promoted
projects keep their existing relevance order. Normal Enter executes the selected
command, while Ctrl/Cmd+Enter opens full search. User queries and names remain
literal even when they contain strings that resemble translation markup.
These component checks include the real Cmdk and Radix primitives. They do not
establish a live full-search journey or complete localization of Inbox/Decisions.

The Inbox slice covers both active renderers, the combined host's Inbox controls,
Blocked labels, grouping, dates, actions and local error messages. Translated group
captions are applied after the original sort so group IDs, order, collapsed state
and Undo placement stay stable. Known approval and blocked captions remain
searchable in English and Russian across a language change. User names, subjects,
provider errors and API-owned owner/action text stay literal. Retry tests retain
the selected run or task request and its existing idempotency behavior.

The shared approval helper translates only its type and subject wrapper; the full
approval payload renderer is outside this slice. Existing toast storage keeps text
snapshots, so a shown toast retains the language in which it was created. The
combined-host fixture renders Inbox with the real host props; it does not verify
the App redirect or the full Tasks wrapper. Decisions and chat/composer coverage
is described separately below; full-stack verification remains separate.

The shared decision-form slice covers decision previews and results, interaction
cards, paged questions, audience explanations, validation and image-input controls.
Stored errors keep the original cause and translate at render time. A locale
change keeps drafts, selected IDs, focus, pending uploads and submitted payloads.
Optional helper translators retain English defaults for unconverted consumers.
Custom prompts, labels, provider errors and names stay literal. The secret proposal
page only translates its justification caption. Component evidence uses mocked APIs and
editors; real server authorization and browser acceptance are separate checks.

The Decisions slice covers both queue pages, rows, filters, date controls, triage,
shelves and review actions, plus the classic approval list, detail and payloads.
Language changes preserve query/filter selection, open date ranges, decision and
comment drafts, literal payloads and mutation counts. Filter matching includes
fixed English and Russian aliases; group sorting and action variants use canonical
values before display translation. Count captions now use locale-aware grouping
in English as well as Russian. Existing toast snapshots keep their creation locale.

The attention feed adds six optional display slots with closed codes and explicit
primitive arguments. The server supplies them only where it generates its own
fallback text. The UI validates the slot/code/arguments and otherwise preserves the
raw string; older servers and custom strings keep their existing behavior. Stored
queue names, recovery prose and provider diagnostics remain literal without
reliable provenance. The source detector scans client call sites, not all server
message producers, so server changes also require a manual provenance review.
No database field or API action changes. The date picker forwards trigger props
and refs so the existing Custom control can open and retain its range across locales.
The task-list date separator also passes the active translator.

The chat and run slice covers both task-thread renderers, the composer and queue,
run settings, handoff and pause controls, goals, compact interaction cards,
protocol/resource cards, browser activity, run history, inspection and transcript
controls, and recovery notices. Helpers keep fixed English defaults for callers
that still use their output for classification. Rendering uses the active
translator. Raw messages, titles, commands, paths, IDs and provider diagnostics
keep their existing values, even when they equal an English application caption.

Closed display descriptors identify application-generated captions without
replacing the original model fields. Deduplication, grouping, keys, ordering and
retry decisions use those original fields. A separate optional execution label
descriptor identifies a confirmed wait for Muse or Dot; missing or malformed
metadata keeps the original label. It adds no database field, request, authority
or dispatch behavior. The detector cannot establish provenance across arbitrary
server or provider producers; new producers require source review.

Locale regressions cover dirty text and override reasons, focus and selection,
pending uploads and requests, expanded details, selected operation IDs and exact
action payloads. Run inspection keeps its existing explicit access and disclosure
gates. Component checks use mocked APIs where declared; they do not certify
authenticated trace access, real editor behavior, provider execution or a complete
live chat journey. Toasts retain the language used when the event occurred.

`lib/markdown-editor-i18n.ts` maps the 43 built-in message keys used by the enabled
plugins in `@mdxeditor/editor` 4.2.3. Unknown library keys retain their supplied
English fallback, with literal interpolation. A dependency update must review
the enabled plugins' message keys and defaults and exercise their controls in
both languages. The source detector does not scan `node_modules`; catalog parity
cannot prove that a newer library has no additional labels.

Unconverted task-detail child panels, agent/project detail pages, the rest of agent
configuration, dashboards and remaining settings still need translation. Shared task rows also appear in
Inbox, projects, and routines; their translation does not cover those entire host
pages. Shared child components may contain untranslated copy; the source audit
tracks that debt.
An English/Russian key match is not a claim of complete application localization.
Formatting helpers update when their host component renders. Screens that do not
yet subscribe to locale changes, such as Costs and Dashboard, may retain their
previous display formatting until that next render.

The initial foundation adapts the 19-file diff from
[upstream PR #17546](https://github.com/paperclipai/paperclip/pull/17546), head
`50b5204633a50b1982da2f7c0250ba4e8c31312a`, authored by
[mussolene](https://github.com/mussolene). This fork adds explicit supported
languages, the Russian default, plural-aware validation, terminology corrections,
expanded text coverage, and additional regression tests. Upstream test reports
are not verification evidence for the adapted source.

Task resume confirmations distinguish removing a pause from starting execution.
Known structured warning codes receive translations; unknown server warnings keep
their original text. Locale changes preserve the wake choice and action gates.
