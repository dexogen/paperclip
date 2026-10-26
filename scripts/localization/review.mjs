import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createReport } from "./report.mjs";
import { readJson, writeJson } from "./repository.mjs";
import { parseArgs, isMain, printError } from "./cli.mjs";

export function run(args = process.argv.slice(2)) {
  const options = parseArgs(args, ["--root", "--keys-file", "--reviewer", "--method"]);
  if (!options["keys-file"] || !options.reviewer?.trim() || !["human", "agent"].includes(options.method)) {
    throw new Error("Use --keys-file <JSON array of examined message IDs> --reviewer <name> --method human|agent");
  }
  const root = resolve(options.root ?? process.cwd());
  const keys = JSON.parse(readFileSync(resolve(options["keys-file"]), "utf8"));
  if (!Array.isArray(keys) || !keys.length || keys.some((key) => typeof key !== "string" || !key) || new Set(keys).size !== keys.length) throw new Error("keys-file must contain distinct, explicitly selected message IDs");
  const report = createReport(root), records = readJson(root, "doc/localization/reviewed.json");
  for (const key of keys) {
    const message = report.catalog.messages.find((item) => item.key === key);
    if (!message || message.status === "missing") throw new Error(`Cannot review absent message: ${key}`);
    if (report.catalog.invalid.some((item) => item.key === key || item.message.startsWith(`${key} `) || item.message.startsWith(`${key}_`) || item.message.startsWith(`${key}.`))) throw new Error(`Cannot review invalid message: ${key}`);
    records.entries[key] = { sourceHash: message.sourceHash, translationHash: message.translationHash,
      reviewer: options.reviewer, method: options.method, reviewedAt: new Date().toISOString() };
  }
  records.entries = Object.fromEntries(Object.entries(records.entries).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(root, "doc/localization/reviewed.json", records);
  console.log(`Recorded ${keys.length} ${options.method} reviews by ${options.reviewer}. Review records are declarations, not automatic quality checks.`);
  return records;
}

if (isMain(import.meta.url)) { try { run(); } catch (error) { printError(error); } }
