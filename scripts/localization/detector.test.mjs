import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanSource, compareFindings, shouldScan } from "./source-audit.mjs";
import { analyzeCatalog } from "./catalog.mjs";
import { createReport, renderMarkdown } from "./report.mjs";
import { run as baseline } from "./baseline.mjs";
import { run as review } from "./review.mjs";

const ui = (body) => `import { t, Trans } from "@/i18n"; export function View() { return ${body}; }`;
const path = "ui/src/View.tsx";
const config = { schemaVersion: 1, locale: "ru", sourceCatalog: "ui/src/i18n/locales/en.json",
  targetCatalog: "ui/src/i18n/locales/ru.json", scanRoots: ["ui/src"], excludedSources: [], dynamicKeys: [] };

function fixture(t, source = ui('<button title="Open">Continue</button>')) {
  const root = mkdtempSync(join(tmpdir(), "paperclip-localization-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, value) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), typeof value === "string" ? value : JSON.stringify(value));
  };
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.name=Localization test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "--quiet");
  write("doc/localization/config.json", config);
  write("doc/localization/baseline.json", { schemaVersion: 1, capturedAt: null, entries: [] });
  write("doc/localization/exceptions.json", { schemaVersion: 1, entries: [] });
  write("doc/localization/reviewed.json", { schemaVersion: 1, locale: "ru", entries: {} });
  write(config.sourceCatalog, { action: "Continue" });
  write(config.targetCatalog, { action: "Продолжить" });
  write(path, source);
  return { root, write, git };
}

test("audits render sinks and retains both production UI variants", () => {
  const result = scanSource(path, ui('<><button title="Open" aria-label="Open task" className="text-sm">Continue</button>{condition ? "Saved" : "Try again"}</>'));
  assert.deepEqual(new Set(result.literals.map((item) => item.text)), new Set(["Open", "Open task", "Continue", "Saved", "Try again"]));
  assert.equal(result.errors.length, 0);
  assert.ok(shouldScan("ui/src/Agents.production.tsx", config));
  assert.ok(!shouldScan("ui/src/Agents.test.tsx", config));
  assert.ok(!shouldScan("ui/src/Agents.stories.tsx", config));
});

test("audits configuration labels, shared display maps, toasts and templates", () => {
  const result = scanSource("ui/src/helpers.ts", 'const choices = [{ value: "internal", label: "Choose agent" }]; const AGENT_ROLE_LABELS = { ceo: "Chief executive" }; toast.error(`Could not save ${name}`); console.error("Debug only");');
  assert.deepEqual(result.literals.map((item) => item.text), ["Choose agent", "Chief executive", "Could not save {{name}}"]);
});

test("line movement preserves identity; changed and additional occurrences are new", () => {
  const original = scanSource(path, ui('<><span>Saved</span></>')).literals;
  const shifted = scanSource(path, `\n\n// unrelated heading\n${ui('<><span>Saved</span></>')}`).literals;
  assert.deepEqual(compareFindings(original, shifted), { added: [], removed: [] });
  const twice = scanSource(path, ui('<><span>Saved</span><span>Saved</span></>')).literals;
  assert.equal(compareFindings(original, twice).added.length, 1);
  const changed = scanSource(path, ui('<><span>Save failed</span></>')).literals;
  assert.equal(compareFindings(original, changed).added.length, 1);
  assert.equal(compareFindings(original, changed).removed.length, 1);
});

test("checks catalog keys even with defaultValue and recognizes translation aliases and Trans", () => {
  const source = 'import { useTranslation as useT, Trans } from "@/i18n"; function View(){ const {t: translate}=useT(); return <><p>{translate("missing", {defaultValue:"Fallback"})}</p><Trans i18nKey={flag ? "a" : "b"}/></>; }';
  const audit = scanSource(path, source);
  assert.deepEqual(audit.references.map((item) => item.key), ["missing", "a", "b"]);
  assert.equal(audit.literals.length, 0);
  const catalog = analyzeCatalog({ source: { a: "A", b: "B" }, target: { a: "А", b: "Б" }, locale: "ru", references: audit.references });
  assert.equal(catalog.missingKeys[0].key, "missing");
});

test("dynamic translation keys require an explicit manifest", () => {
  const audit = scanSource(path, ui('<p>{t(statusKey)}</p>'));
  assert.equal(audit.dynamicKeys[0].text, "statusKey");
  assert.equal(audit.references.length, 0);
});

test("audits typed translator parameters without leaking names into sibling helpers", () => {
  const source = `import type { TFunction as Translator } from "i18next";
    import { i18n } from "@/i18n";
    function translated(t: Translator = i18n.getFixedT("en")) {
      return t("helper.open", { url: value });
    }
    const arrow = (translate: Translator) => translate(dynamicKey);
    function ordinary(t: (value: string) => string) { return t("ordinary data"); }
    function nested(t: Translator) {
      function inner(t: (value: string) => string) { return t("shadowed data"); }
      return t("helper.missing");
    }`;
  const audit = scanSource("ui/src/helpers.ts", source);
  assert.deepEqual(audit.references.map(({ key }) => key), ["helper.open", "helper.missing"]);
  assert.deepEqual(audit.dynamicKeys.map(({ text }) => text), ["dynamicKey"]);
  const catalog = analyzeCatalog({ source: { helper: { open: "Open {{url}}" } },
    target: { helper: { open: "Открыть {{url}}" } }, locale: "ru", references: audit.references });
  assert.deepEqual(catalog.invalid, []);
  assert.equal(catalog.missingKeys[0].key, "helper.missing");
  const changed = scanSource("ui/src/helpers.ts", source.replace("{ url: value }", "{ other: value }"));
  assert.ok(analyzeCatalog({ source: { helper: { open: "Open {{url}}" } }, target: {}, locale: "ru",
    references: changed.references }).invalid.some(({ message }) => message.includes("missing interpolation parameter: url")));
});

test("a local translation hook overrides an outer ordinary function parameter", () => {
  const audit = scanSource(path, `import { useTranslation } from "@/i18n";
    function outer(t: (value: string) => string) {
      function Inner() { const { t } = useTranslation(); return t("missing.key"); }
    }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["missing.key"]);
  assert.deepEqual(audit.errors, []);
  assert.deepEqual(analyzeCatalog({ source: {}, target: {}, locale: "ru", references: audit.references })
    .missingKeys.map(({ key }) => key), ["missing.key"]);
});

test("translator namespaces belong to their lexical binding, including literal TFunction namespaces", () => {
  const audit = scanSource(path, `import type { TFunction as Translator } from "i18next";
    import { t, useTranslation as useT } from "@/i18n";
    function other() { const { t } = useT("other"); return t("one"); }
    function normal(t: Translator) { return t("helper.open"); }
    function typed(t: Translator<"settings">) { return t("helper.open"); }
    function ordinary() { return t("common.open"); }
    function innerHook(t: Translator<"outer">) {
      function Inner() { const { t } = useT("inner"); return t("one"); }
      return t("two");
    }`);
  assert.deepEqual(audit.references.map(({ key }) => key), [
    "other:one", "helper.open", "settings:helper.open", "common.open", "inner:one", "outer:two",
  ]);
  assert.deepEqual(audit.errors, []);
});

test("ordinary local declarations shadow imported and typed translators in their own scopes", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { t, i18n } from "@/i18n";
    function outer(t: TFunction) {
      { const t = (value: string) => value; const label = t("Ordinary label"); }
      { const { t } = ordinary; t("ordinary destructured value"); }
      try {} catch (t) { t("ordinary caught value"); }
      return t("real.key");
    }
    function ordinary(i18n: { t: (value: string) => string }) { return i18n.t("ordinary member"); }
    function local() { function t(value: string) { return value; } return t("ordinary function"); }
    { const t = ordinary; t("ordinary block"); }
    t("module.key"); i18n.t("instance.key");`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["real.key", "module.key", "instance.key"]);
  assert.deepEqual(audit.errors, []);
});

test("hook names and imported translator types respect local shadowing", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { useTranslation } from "@/i18n";
    function ordinary(useTranslation: () => { t: (value: string) => string }) {
      const { t } = useTranslation(); return t("ordinary hook");
    }
    function nestedType() {
      type TFunction = (value: string) => string;
      function helper(t: TFunction) { return t("ordinary local type"); }
    }
    function generic<TFunction>(t: TFunction) { return t("ordinary generic type"); }
    function real(t: TFunction) { return t("real.key"); }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["real.key"]);
  assert.deepEqual(audit.errors, []);
});

test("unresolved translator namespaces fail audit rather than using the default catalog", (t) => {
  const f = fixture(t, `import type { TFunction } from "i18next";
    import { useTranslation } from "@/i18n";
    function generic<Ns extends string>(translate: TFunction<Ns>) { return translate("action"); }
    function dynamicHook() { const { t } = useTranslation(namespace); return t("action"); }`);
  const report = createReport(f.root);
  assert.equal(report.ok, false);
  assert.equal(report.summary.sourceErrors, 2);
  assert.ok(report.source.errors.every(({ message }) => /translation namespace.*statically/i.test(message)));
  assert.deepEqual(report.catalog.messages[0].contexts, []);
});

test("var bindings shadow through a function while loop and catch bindings stay local", () => {
  const audit = scanSource(path, `import { t } from "@/i18n";
    function ordinary() { if (true) { var t = ordinaryCall; } return t("ordinary var"); }
    for (const t of callbacks) { t("ordinary loop"); }
    try {} catch ({ t }) { t("ordinary catch"); }
    t("module.key");`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["module.key"]);
  assert.deepEqual(audit.errors, []);
});

test("generic function types do not shadow sibling translator types and anonymous classes remain scannable", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { t } from "@/i18n";
    const ordinary: <TFunction>(value: TFunction) => TFunction = value => value;
    function helper(t: TFunction) { return t("helper.key"); }
    export default class { render() { return <p>{t("class.key")}</p>; } }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["helper.key", "class.key"]);
  assert.deepEqual(audit.errors, []);
});

test("var redeclarations preserve translator parameters and hook bindings", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { useTranslation } from "@/i18n";
    function helper(t: TFunction) { var t; return t("helper.key"); }
    function view() { var { t } = useTranslation(); if (true) { var t; } return t("view.key"); }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["helper.key", "view.key"]);
  assert.deepEqual(audit.errors, []);
});

test("function body variables cannot hide imported translators from default parameter initializers", () => {
  const audit = scanSource(path, `import { t } from "@/i18n";
    function ordinary(value = t("default.key")) { var t = (text: string) => text; return t("ordinary"); }
    class Holder { static { var t = (text: string) => text; t("ordinary static"); } }
    t("module.key");`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["default.key", "module.key"]);
  assert.deepEqual(audit.errors, []);
});

test("an explicit key namespace overrides the translator namespace", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { useTranslation } from "@/i18n";
    function helper(t: TFunction<"settings">) { return t("common:open"); }
    function View() { const { t } = useTranslation("settings"); return t("translation:default.key"); }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["common:open", "default.key"]);
  assert.deepEqual(audit.errors, []);
});

test("unsupported key prefixes fail closed instead of auditing a different key", () => {
  const audit = scanSource(path, `import type { TFunction } from "i18next";
    import { useTranslation } from "@/i18n";
    function helper(t: TFunction<"translation", "prefix">) { return t("open"); }
    function View() { const { t } = useTranslation(undefined, { keyPrefix: "prefix" }); return t("open"); }
    function Dynamic() { const { t } = useTranslation(undefined, options); return t("open"); }
    function Empty() { const { t } = useTranslation(undefined, { keyPrefix: "" }); return t("plain.key"); }`);
  assert.deepEqual(audit.references.map(({ key }) => key), ["plain.key"]);
  assert.equal(audit.errors.length, 3);
  assert.ok(audit.errors.every(({ message }) => /translation key prefix.*unsupported/i.test(message)));
});

test("source and Russian edits invalidate separate review fingerprints", () => {
  const source = { action: "Continue" }, target = { action: "Продолжить" };
  const initial = analyzeCatalog({ source, target, locale: "ru" }).messages[0];
  const reviewed = { action: { sourceHash: initial.sourceHash, translationHash: initial.translationHash } };
  assert.equal(analyzeCatalog({ source, target, locale: "ru", reviewed }).messages[0].status, "reviewed");
  assert.equal(analyzeCatalog({ source: { action: "Save and continue" }, target, locale: "ru", reviewed }).messages[0].status, "stale-source");
  assert.equal(analyzeCatalog({ source, target: { action: "Далее" }, locale: "ru", reviewed }).messages[0].status, "stale-translation");
  assert.equal(analyzeCatalog({ source, target, locale: "ru", reviewed, references: [{ key: "action", file: path, owner: "DangerousAction" }] }).messages[0].status, "stale-source");
});

test("validates Russian plural families and parameter contracts through runtime validator", () => {
  const source = { count_one: "{{count}} task", count_other: "{{count}} tasks" };
  const target = { count_one: "{{count}} задача", count_few: "{{count}} задачи", count_many: "{{count}} задач", count_other: "{{count}} задачи" };
  const valid = analyzeCatalog({ source, target, locale: "ru", references: [{ key: "count", file: path, owner: "View" }] });
  assert.deepEqual(valid.invalid, []);
  assert.equal(valid.messages.length, 1);
  assert.equal(valid.messages[0].key, "count");
  assert.deepEqual(valid.missingKeys, []);
  const { count_few, ...missingForm } = target;
  assert.ok(analyzeCatalog({ source, target: missingForm, locale: "ru" }).invalid.some((item) => item.message === "count_few is missing"));
  assert.ok(analyzeCatalog({ source, target: { ...target, count_one: "{{total}} задача" }, locale: "ru" }).invalid.some((item) => /placeholders/.test(item.message)));
});

test("baseline is explicit, cannot grow automatically, and only prunes resolved debt", (t) => {
  const f = fixture(t);
  const first = createReport(f.root);
  assert.equal(first.summary.newFindings, 2);
  baseline(["--root", f.root, "--write", "--reason", "Existing untranslated UI reviewed as migration debt"]);
  const baselineBefore = readFileSync(join(f.root, "doc/localization/baseline.json"), "utf8");
  assert.equal(createReport(f.root).summary.newFindings, 0);
  f.write(path, ui('<button title="Open">New wording</button>'));
  assert.equal(createReport(f.root).summary.newFindings, 1);
  assert.equal(readFileSync(join(f.root, "doc/localization/baseline.json"), "utf8"), baselineBefore);
  assert.throws(() => baseline(["--root", f.root, "--write", "--reason", "Hide new debt"]), /already initialized/);
  baseline(["--root", f.root, "--write", "--prune"]);
  const pruned = JSON.parse(readFileSync(join(f.root, "doc/localization/baseline.json"), "utf8"));
  assert.equal(pruned.entries.length, 1);
  assert.equal(createReport(f.root).summary.newFindings, 1);
});

test("review records require selected existing messages and do not approve subsequent edits", (t) => {
  const f = fixture(t, ui('<button>{t("action")}</button>'));
  f.write("selected.json", ["action"]);
  assert.equal(createReport(f.root).ok, false);
  review(["--root", f.root, "--keys-file", join(f.root, "selected.json"), "--reviewer", "Test editor", "--method", "agent"]);
  assert.equal(createReport(f.root).ok, true);
  f.write(config.targetCatalog, { action: "Дальше" });
  const report = createReport(f.root);
  assert.equal(report.ok, false);
  assert.equal(report.catalog.messages[0].status, "stale-translation");
  f.write("selected.json", ["does.not.exist"]);
  assert.throws(() => review(["--root", f.root, "--keys-file", join(f.root, "selected.json"), "--reviewer", "Test editor", "--method", "human"]), /absent message/);
});

test("upstream source delta works independently of a merge and reports changed original literals", (t) => {
  const f = fixture(t, ui('<button>Continue</button>'));
  f.git("add", "."); f.git("commit", "--quiet", "-m", "old upstream");
  const base = f.git("rev-parse", "HEAD");
  f.write(path, ui('<button>Save and continue</button>'));
  f.git("add", "."); f.git("commit", "--quiet", "-m", "new upstream");
  const head = f.git("rev-parse", "HEAD");
  f.write(path, ui('<button>{t("action")}</button>'));
  const report = createReport(f.root, { base, head });
  assert.deepEqual(report.upstream.source.added.map((item) => item.text), ["Save and continue"]);
  assert.deepEqual(report.upstream.source.removed.map((item) => item.text), ["Continue"]);
  assert.equal(report.source.newFindings.length, 0);
  assert.equal(report.upstream.base, base);
  assert.throws(() => createReport(f.root, { base }), /supplied together/);
});

test("malformed TS cannot silently disappear from audit; reports escape untrusted source markup", (t) => {
  const f = fixture(t, 'export function Broken() { return <div>Hello');
  f.write("ui/src/Other.tsx", ui('<div title="<script>alert(1)</script>">Hello</div>'));
  const report = createReport(f.root);
  assert.ok(report.summary.sourceErrors > 0);
  assert.equal(report.ok, false);
  const markdown = renderMarkdown(report);
  assert.ok(markdown.includes("&lt;script&gt;"));
  assert.ok(!markdown.includes('<script>'));
  assert.ok(markdown.includes("not full runtime data-flow analysis"));
});

test("CLI emits reports on findings and has distinct report/check/tool-error exits", (t) => {
  const f = fixture(t);
  const script = fileURLToPath(new URL("./check.mjs", import.meta.url));
  const reportPath = join(f.root, "report.json");
  const invoke = (flags) => spawnSync(process.execPath, [script, "--root", f.root, ...flags], { encoding: "utf8" });
  assert.equal(invoke(["--json", reportPath]).status, 0);
  assert.equal(JSON.parse(readFileSync(reportPath, "utf8")).ok, false);
  assert.equal(invoke(["--check"]).status, 1);
  assert.equal(invoke(["--unknown"]).status, 2);
  assert.equal(JSON.parse(readFileSync(join(f.root, "doc/localization/baseline.json"), "utf8")).entries.length, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, "doc/localization/reviewed.json"), "utf8")).entries, {});
});

test("trusted policy-root prevents candidate configuration from hiding source findings", (t) => {
  const trusted = fixture(t), candidate = fixture(t);
  candidate.write("doc/localization/config.json", { ...config, excludedSources: [{ path: "ui/src", reason: "Candidate attempted broad exclusion" }] });
  assert.equal(createReport(candidate.root).summary.newFindings, 0);
  assert.equal(createReport(candidate.root, { policyRoot: trusted.root }).summary.newFindings, 2);
});


test("static call parameters are checked and changed parameter names invalidate review", () => {
  const source = { greeting: "Hello {{name}}" }, target = { greeting: "Здравствуйте, {{name}}" };
  const references = (options) => scanSource(path, ui(`<p>{t("greeting", ${options})}</p>`)).references;
  const valid = analyzeCatalog({ source, target, locale: "ru", references: references("{ name: user.name }") });
  assert.deepEqual(valid.invalid, []);
  const reviewed = { greeting: { sourceHash: valid.messages[0].sourceHash, translationHash: valid.messages[0].translationHash } };
  const changed = analyzeCatalog({ source, target, locale: "ru", reviewed, references: references("{ username: user.name }") });
  assert.ok(changed.invalid.some((item) => /missing interpolation parameter: name/.test(item.message)));
  assert.equal(changed.messages[0].status, "stale-source");
  const noOptions = analyzeCatalog({ source, target, locale: "ru", references: scanSource(path, ui('<p>{t("greeting")}</p>')).references });
  assert.ok(noOptions.invalid.some((item) => /missing interpolation parameter/.test(item.message)));
});

test("plural family calls require count independently of formatted text; explicit forms do not", () => {
  const source = { tasks_one: "{{formattedCount}} task", tasks_other: "{{formattedCount}} tasks" };
  const target = { tasks_one: "{{formattedCount}} задача", tasks_few: "{{formattedCount}} задачи", tasks_many: "{{formattedCount}} задач", tasks_other: "{{formattedCount}} задачи" };
  const analyze = (call) => analyzeCatalog({ source, target, locale: "ru", references: scanSource(path, ui(`<p>{${call}}</p>`)).references });
  assert.ok(analyze('t("tasks", { formattedCount: total })').invalid.some((item) => /plural selector: count/.test(item.message)));
  assert.deepEqual(analyze('t("tasks", { count: total, formattedCount: total })').invalid, []);
  assert.deepEqual(analyze('t("tasks_one", { formattedCount: total })').invalid, []);
});

test("rich text values and count props satisfy the same call-site contract", () => {
  const source = { greeting: "Hello {{name}}", count_one: "One task", count_other: "Tasks" };
  const target = { greeting: "Здравствуйте, {{name}}", count_one: "Задача", count_few: "Задачи", count_many: "Задач", count_other: "Задачи" };
  const analyze = (jsx) => analyzeCatalog({ source, target, locale: "ru", references: scanSource(path, ui(jsx)).references });
  assert.deepEqual(analyze('<Trans i18nKey="greeting" values={{ name: user.name }} />').invalid, []);
  assert.ok(analyze('<Trans i18nKey="greeting" values={{ username: user.name }} />').invalid.some((item) => /parameter: name/.test(item.message)));
  assert.deepEqual(analyze('<Trans i18nKey="count" count={total} />').invalid, []);
  assert.ok(analyze('<Trans i18nKey="count" />').invalid.some((item) => /selector: count/.test(item.message)));
});

test("dynamic option objects and spreads fail closed and bind their expression to review", () => {
  const source = { greeting: "Hello {{name}}" }, target = { greeting: "Здравствуйте, {{name}}" };
  const analyze = (call) => analyzeCatalog({ source, target, locale: "ru", references: scanSource(path, ui(`<p>{${call}}</p>`)).references });
  const spread = analyze('t("greeting", { name, ...otherOptions })');
  const changed = analyze('t("greeting", { name, ...differentOptions })');
  assert.ok(spread.invalid.some((item) => /dynamic translation options.*manual inspection/.test(item.message)));
  assert.notEqual(spread.messages[0].sourceHash, changed.messages[0].sourceHash);
  assert.ok(analyze('t("greeting", options)').invalid.some((item) => /dynamic translation options/.test(item.message)));
});

test("review provenance cannot be removed or replaced with invalid metadata", (t) => {
  const f = fixture(t, ui('<button>{t("action")}</button>'));
  const message = createReport(f.root).catalog.messages[0];
  const valid = { sourceHash: message.sourceHash, translationHash: message.translationHash,
    reviewer: "Test editor", method: "agent", reviewedAt: "2026-10-26T12:00:00.000Z" };
  const writeRecord = (entry) => f.write("doc/localization/reviewed.json", { schemaVersion: 1, locale: "ru", entries: { action: entry } });
  writeRecord(valid);
  assert.equal(createReport(f.root).ok, true);
  for (const bad of [{ ...valid, reviewer: " " }, { ...valid, method: "automatic" },
    { ...valid, reviewedAt: "2026-02-31T12:00:00.000Z" }, { ...valid, reviewedAt: "yesterday" },
    { sourceHash: valid.sourceHash, translationHash: valid.translationHash }]) {
    writeRecord(bad);
    assert.throws(() => createReport(f.root), /Invalid localization review record/);
  }
});

test("compact baseline preserves debt identity and accepts legacy entry reasons", (t) => {
  const f = fixture(t);
  const before = createReport(f.root).source.newFindings;
  baseline(["--root", f.root, "--write", "--reason", "Accepted migration inventory"]);
  const compact = JSON.parse(readFileSync(join(f.root, "doc/localization/baseline.json"), "utf8"));
  assert.equal(compact.reason, "Accepted migration inventory");
  assert.deepEqual(compact.entries, before.map(({ id, file }) => ({ id, file })));
  assert.equal(createReport(f.root).summary.newFindings, 0);
  f.write("doc/localization/baseline.json", { schemaVersion: 1, capturedAt: compact.capturedAt,
    entries: before.map((finding) => ({ ...finding, reason: "Legacy inventory" })) });
  assert.equal(createReport(f.root).summary.newFindings, 0);
});


test("review cannot bless a message whose static caller omits a required parameter", (t) => {
  const f = fixture(t, ui('<button>{t("action")}</button>'));
  f.write(config.sourceCatalog, { action: "Continue {{name}}" });
  f.write(config.targetCatalog, { action: "Продолжить: {{name}}" });
  f.write("selected.json", ["action"]);
  assert.throws(() => review(["--root", f.root, "--keys-file", join(f.root, "selected.json"),
    "--reviewer", "Test editor", "--method", "agent"]), /Cannot review invalid message/);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, "doc/localization/reviewed.json"), "utf8")).entries, {});
});


test("native formatted count families retain plural selection and parameter checks", () => {
  const source = { tasks_one: "{{count, number}} task", tasks_other: "{{count, number}} tasks" };
  const target = { tasks_one: "{{count, number}} задача", tasks_few: "{{count, number}} задачи", tasks_many: "{{count, number}} задач", tasks_other: "{{count, number}} задачи" };
  const report = analyzeCatalog({ source, target, locale: "ru", references: scanSource(path, ui('<p>{t("tasks", { count: total })}</p>')).references });
  assert.equal(report.messages[0].plural, true);
  assert.deepEqual(report.invalid, []);
  assert.deepEqual(report.missingKeys, []);
});


test("translation imports resolve relative to the caller, including the i18n directory itself", () => {
  for (const specifier of ["./index", "./index.ts"]) {
    const result = scanSource("ui/src/i18n/ui-labels.ts", `import { t } from "${specifier}"; export function label(){ return t("missing.status"); }`);
    assert.deepEqual(result.references.map(({ key }) => key), ["missing.status"]);
    assert.equal(analyzeCatalog({ source: {}, target: {}, locale: "ru", references: result.references }).missingKeys[0].key, "missing.status");
  }
});


test("audits lowercase display variables and every conditional branch", () => {
  const source = `function ThemeToggle() {
    const label = isDark ? "Switch to light theme" : "Switch to dark theme";
    const title = enabled ? "Pause agent" : "Resume agent";
    const message = "Changes saved";
    const text = "Retry";
    const requestId = "internal-id";
    return <button aria-label={label} title={title}>{text}</button>;
  }`;
  const result = scanSource(path, source);
  assert.deepEqual(result.literals.map(({ text }) => text), [
    "Switch to light theme", "Switch to dark theme", "Pause agent", "Resume agent", "Changes saved", "Retry",
  ]);
  assert.ok(result.literals.every(({ kind }) => kind === "display-variable"));
  assert.deepEqual(result.errors, []);
});
