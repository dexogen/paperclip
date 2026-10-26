import { resolve } from "node:path";
import { loadPolicy, auditRepository, writeJson } from "./repository.mjs";
import { parseArgs, isMain, printError } from "./cli.mjs";

export function run(args = process.argv.slice(2)) {
  const options = parseArgs(args, ["--root", "--reason"], ["--write", "--prune"]);
  if (!options.write || Boolean(options.prune) === Boolean(options.reason)) throw new Error("Use --write --reason <initial inventory rationale> or --write --prune");
  const root = resolve(options.root ?? process.cwd());
  const { config, baseline, exceptions } = loadPolicy(root);
  const audit = auditRepository(root, config);
  if (audit.errors.length) throw new Error(`Cannot baseline an incomplete source audit: ${JSON.stringify(audit.errors)}`);
  const exempt = new Set(exceptions.entries.map(({ id }) => id));
  const findings = [...audit.literals, ...audit.dynamicKeys.filter((finding) => !(config.dynamicKeys ?? []).some((entry) =>
    entry.file === finding.file && entry.expression === finding.text && (!entry.owner || entry.owner === finding.owner)))].filter(({ id }) => !exempt.has(id));
  if (options.prune) {
    const current = new Set(findings.map(({ id }) => id));
    baseline.entries = baseline.entries.filter(({ id }) => current.has(id));
  } else {
    if (baseline.capturedAt || baseline.entries.length) throw new Error("Baseline already initialized. Fix new findings; --prune only removes resolved debt.");
    if (!options.reason.trim()) throw new Error("A nonempty inventory reason is required");
    baseline.capturedAt = new Date().toISOString();
    baseline.reason = options.reason;
    baseline.entries = findings.map(({ id, file }) => ({ id, file }));
  }
  writeJson(root, "doc/localization/baseline.json", baseline);
  console.log(`Saved ${baseline.entries.length} baseline findings. This does not approve translations.`);
  return baseline;
}

if (isMain(import.meta.url)) { try { run(); } catch (error) { printError(error); } }
