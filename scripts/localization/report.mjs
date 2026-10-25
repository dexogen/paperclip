import { analyzeCatalog, compareCatalogs } from "./catalog.mjs";
import { compareFindings } from "./source-audit.mjs";
import { auditRepository, loadPolicy, readJson, readAtCommit, resolveCommit } from "./repository.mjs";

export function createReport(root, { base, head, policyRoot } = {}) {
  if (Boolean(base) !== Boolean(head)) throw new Error("--base and --head must be supplied together");
  const { config, baseline, reviewed, exceptions } = loadPolicy(root, policyRoot);
  const audit = auditRepository(root, config);
  const manifests = config.dynamicKeys ?? [];
  const catalog = analyzeCatalog({ source: readJson(root, config.sourceCatalog), target: readJson(root, config.targetCatalog),
    locale: config.locale, references: audit.references, dynamicManifests: manifests, reviewed: reviewed.entries });
  const unresolvedDynamic = audit.dynamicKeys.filter((finding) => !manifests.some((entry) =>
    entry.file === finding.file && entry.expression === finding.text && (!entry.owner || entry.owner === finding.owner)));
  const findings = [...audit.literals, ...unresolvedDynamic];
  const exempt = new Set(exceptions.entries.map((entry) => entry.id));
  const debt = new Set(baseline.entries.map((entry) => entry.id));
  const currentIds = new Set(findings.map((entry) => entry.id));
  const newFindings = findings.filter((entry) => !debt.has(entry.id) && !exempt.has(entry.id));
  const remainingDebt = findings.filter((entry) => debt.has(entry.id) && !exempt.has(entry.id));
  const removedDebt = baseline.entries.filter((entry) => !currentIds.has(entry.id));
  const pending = catalog.messages.filter(({ status }) => status !== "reviewed");
  const report = {
    schemaVersion: 1, locale: config.locale,
    summary: { scannedFiles: audit.files, catalogMessages: catalog.messages.length, reviewedMessages: catalog.messages.length - pending.length,
      pendingMessages: pending.length, missingKeys: catalog.missingKeys.length, invalidMessages: catalog.invalid.length,
      newFindings: newFindings.length, remainingDebt: remainingDebt.length, resolvedDebt: removedDebt.length, sourceErrors: audit.errors.length },
    catalog, source: { newFindings, remainingDebt, removedDebt, errors: audit.errors },
    limitations: ["Static analysis covers documented render sinks; it is not full runtime data-flow analysis.",
      "Catalog coverage, remaining hardcoded text and verified UI journeys are separate measures.",
      "A reviewed fingerprint records a declared review, not proof of editorial quality."],
  };
  if (base && head) {
    const baseSha = resolveCommit(root, base), headSha = resolveCommit(root, head);
    const previous = auditRepository(root, config, baseSha), current = auditRepository(root, config, headSha);
    report.upstream = {
      base: baseSha, head: headSha,
      source: compareFindings([...previous.literals, ...previous.dynamicKeys], [...current.literals, ...current.dynamicKeys]),
      catalog: compareCatalogs(JSON.parse(readAtCommit(root, baseSha, config.sourceCatalog, "{}")), JSON.parse(readAtCommit(root, headSha, config.sourceCatalog, "{}"))),
      errors: [...previous.errors, ...current.errors],
    };
  }
  report.ok = newFindings.length === 0 && pending.length === 0 && catalog.missingKeys.length === 0
    && catalog.invalid.length === 0 && audit.errors.length === 0 && !(report.upstream?.errors.length);
  return report;
}

const cell = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").replace(/`/g, "&#96;")
  .replace(/@/g, "&#64;").replace(/[\[\]()*_!~]/g, "\\$&");

export function renderMarkdown(report) {
  const lines = ["# Localization report", "", `Result: **${report.ok ? "passed" : "needs attention"}** (${cell(report.locale)}).`, "",
    "| Measure | Count |", "| --- | ---: |", ...Object.entries(report.summary).map(([name, count]) => `| ${name} | ${count} |`), ""];
  const table = (title, headers, rows) => {
    if (!rows.length) return;
    lines.push(`## ${title}`, "", `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`,
      ...rows.slice(0, 150).map((row) => `| ${row.map(cell).join(" | ")} |`), "");
    if (rows.length > 150) lines.push(`${rows.length - 150} further entries are in the JSON report.`, "");
  };
  table("New source findings", ["Location", "Kind", "Text"], report.source.newFindings.map((item) => [`${item.file}:${item.line}`, item.kind, item.text]));
  table("Translations needing review", ["Key", "Status", "English", "Translation"], report.catalog.messages.filter((item) => item.status !== "reviewed")
    .map((item) => [item.key, item.status, JSON.stringify(item.source), JSON.stringify(item.translation)]));
  table("Missing catalog keys", ["Location", "Key"], report.catalog.missingKeys.map((item) => [`${item.file}:${item.line ?? "manifest"}`, item.key]));
  table("Invalid messages", ["Locale", "Error"], report.catalog.invalid.map((item) => [item.locale, item.message]));
  table("Source audit errors", ["Location", "Error"], report.source.errors.map((item) => [`${item.file}:${item.line ?? ""}`, item.message]));
  if (report.upstream) {
    lines.push("## Upstream changes", "", `Range: ${report.upstream.base} → ${report.upstream.head}.`, "",
      "This compares original upstream text independently of whether the merge succeeds.", "");
    table("Added or changed upstream literals", ["Location", "Kind", "Text"], report.upstream.source.added.map((item) => [`${item.file}:${item.line}`, item.kind, item.text]));
    table("Upstream catalog delta", ["Key", "Kind", "Previous", "Current"], report.upstream.catalog.map((item) => [item.key, item.kind, item.previous, item.current]));
    table("Upstream audit errors", ["Location", "Error"], report.upstream.errors.map((item) => [item.file, item.message]));
  }
  lines.push("## Scope", "", ...report.limitations.map((line) => `- ${line}`), "");
  return lines.join("\n");
}
