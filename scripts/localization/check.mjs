import { resolve } from "node:path";
import { createReport, renderMarkdown } from "./report.mjs";
import { isMain, parseArgs, printError, writeOutput } from "./cli.mjs";

export function run(args = process.argv.slice(2)) {
  const options = parseArgs(args, ["--root", "--policy-root", "--base", "--head", "--json", "--markdown"], ["--check"]);
  const report = createReport(resolve(options.root ?? process.cwd()), {
    base: options.base, head: options.head, policyRoot: options["policy-root"] ? resolve(options["policy-root"]) : undefined,
  });
  if (options.json) writeOutput(options.json, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdown) writeOutput(options.markdown, renderMarkdown(report));
  if (options.json !== "-" && options.markdown !== "-") console.log(`Localization ${report.ok ? "passed" : "needs attention"}: ${JSON.stringify(report.summary)}`);
  if (options.check && !report.ok) process.exitCode = 1;
  return report;
}

if (isMain(import.meta.url)) {
  try { run(); } catch (error) { printError(error); }
}
