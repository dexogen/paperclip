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

Use `useTranslation` in React components. Resolve labels during rendering so a
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
The legacy task list, board/column renderers, onboarding, detail pages, and most
organization settings remain follow-up work. Shared child components may still
contain untranslated copy; the source audit tracks that debt.
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
