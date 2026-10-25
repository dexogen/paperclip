import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, mkdirSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { shouldScan, scanSource } from "./source-audit.mjs";

export const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export function localPath(root, path) {
  const full = resolve(root, path), rel = relative(resolve(root), full);
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || /^(?:[A-Za-z]:|\/)/.test(rel)) throw new Error(`Path escapes repository: ${path}`);
  let parent = dirname(full);
  while (!existsSync(parent)) parent = dirname(parent);
  const realRel = relative(realpathSync(root), realpathSync(parent));
  if (realRel === ".." || realRel.startsWith("../") || realRel.startsWith("..\\") || /^(?:[A-Za-z]:|\/)/.test(realRel)) throw new Error(`Path follows a symlink outside repository: ${path}`);
  return full;
}

export function readJson(root, path, fallback) {
  const full = localPath(root, path);
  if (!existsSync(full) && fallback !== undefined) return fallback;
  if (!lstatSync(full).isFile() || lstatSync(full).isSymbolicLink()) throw new Error(`Expected a regular file: ${path}`);
  return JSON.parse(readFileSync(full, "utf8"));
}

export function writeJson(root, path, value) {
  const full = localPath(root, path);
  mkdirSync(dirname(full), { recursive: true });
  const text = path === "doc/localization/baseline.json"
    ? `${JSON.stringify({ ...value, entries: [] }, null, 2).replace('"entries": []',
      `"entries": [\n${value.entries.map((entry) => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]`)}\n`
    : `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(full, text);
}

const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
export const resolveCommit = (root, ref) => git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
export function readAtCommit(root, commit, path, fallback) {
  if (!git(root, ["ls-tree", "--name-only", commit, "--", path]).trim()) return fallback;
  return git(root, ["show", `${commit}:${path}`]);
}

export function validateConfig(config) {
  if (config.schemaVersion !== 1) throw new Error("Unsupported localization config schemaVersion");
  if (!Array.isArray(config.scanRoots) || !config.scanRoots.length || config.scanRoots.some((root) => typeof root !== "string" || !root || root.includes("..") || root.startsWith("/"))) throw new Error("scanRoots must contain repository-relative paths");
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(config.locale ?? "")) throw new Error("config.locale must be a language tag");
  for (const entry of config.excludedSources ?? []) {
    if (!entry.path || typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error("Excluded sources need a path and reason");
  }
  for (const entry of config.dynamicKeys ?? []) {
    if (!entry.file || !entry.expression || !entry.reason || !Array.isArray(entry.keys) || !entry.keys.length
      || entry.keys.some((key) => typeof key !== "string" || !key)) throw new Error("Dynamic keys need file, expression, reason and a nonempty key list");
  }
  return config;
}

export function loadPolicy(root, policyRoot = root) {
  const config = validateConfig(readJson(policyRoot, "doc/localization/config.json"));
  const baseline = readJson(root, "doc/localization/baseline.json");
  const reviewed = readJson(root, "doc/localization/reviewed.json");
  const exceptions = readJson(policyRoot, "doc/localization/exceptions.json");
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.entries)) throw new Error("Invalid localization baseline");
  if (reviewed.schemaVersion !== 1 || reviewed.locale !== config.locale || !reviewed.entries || typeof reviewed.entries !== "object" || Array.isArray(reviewed.entries)) throw new Error("Invalid localization review records");
  for (const [key, entry] of Object.entries(reviewed.entries)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)
      || typeof entry.reviewer !== "string" || !entry.reviewer.trim()
      || !["human", "agent"].includes(entry.method)
      || typeof entry.reviewedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.reviewedAt)
      || !Number.isFinite(Date.parse(entry.reviewedAt))
      || new Date(entry.reviewedAt).toISOString() !== entry.reviewedAt
      || !/^[a-f0-9]{64}$/.test(entry.sourceHash ?? "")
      || !/^[a-f0-9]{64}$/.test(entry.translationHash ?? "")) {
      throw new Error(`Invalid localization review record: ${key}; require fingerprints, reviewer, method and valid reviewedAt`);
    }
  }
  if (exceptions.schemaVersion !== 1 || !Array.isArray(exceptions.entries)) throw new Error("Invalid localization exceptions");
  for (const item of baseline.entries) {
    const reason = item.reason ?? baseline.reason;
    if (typeof item.id !== "string" || !/^[a-f0-9]{64}$/.test(item.id)
      || typeof item.file !== "string" || !item.file
      || typeof reason !== "string" || !reason.trim()) throw new Error("Baseline entries need a finding id, file and inherited or explicit reason");
  }
  for (const item of exceptions.entries) {
    if (typeof item.id !== "string" || !/^[a-f0-9]{64}$/.test(item.id) || typeof item.reason !== "string" || !item.reason.trim()) throw new Error("Exception entries need a finding id and explicit reason");
  }
  return { config, baseline, reviewed, exceptions };
}

export function auditRepository(root, config, commit) {
  const paths = [...new Set(git(root, commit
    ? ["ls-tree", "-r", "--name-only", "-z", commit]
    : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean))].sort();
  const audit = { files: 0, literals: [], references: [], dynamicKeys: [], errors: [] };
  for (const path of paths.filter((path) => shouldScan(path, config))) {
    let source;
    try {
      if (commit) source = readAtCommit(root, commit, path, "");
      else {
        const full = localPath(root, path);
        if (!existsSync(full)) continue;
        const stat = lstatSync(full);
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("source is not a regular file");
        source = readFileSync(full, "utf8");
      }
      if (Buffer.byteLength(source) > 5 * 1024 * 1024) throw new Error("source exceeds the 5 MiB audit limit");
      const result = scanSource(path, source);
      audit.files++;
      for (const key of ["literals", "references", "dynamicKeys", "errors"]) audit[key].push(...result[key]);
    } catch (error) {
      audit.errors.push({ file: path, message: error.message });
    }
  }
  return audit;
}
