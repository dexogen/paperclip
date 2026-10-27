import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSha, git } from './git.mjs';

const LOCK = 'pnpm-lock.yaml';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function dependencyLockArtifactName(sha) {
  return `dependency-lock-${assertSha(sha)}`;
}

function sourceIdentity(cwd, sha, verificationRun) {
  assertSha(sha, 'dependency lock source');
  if (!/^[1-9][0-9]*$/.test(verificationRun ?? '')) throw new Error('Invalid verification run ID');
  if (git(cwd, ['rev-parse', 'HEAD']).stdout !== sha) throw new Error('Dependency lock source SHA mismatch');
  return { sourceSha: sha, sourceTree: git(cwd, ['rev-parse', 'HEAD^{tree}']).stdout, verificationRun };
}

function assertChanges(cwd, allowLock) {
  const changed = git(cwd, ['diff', 'HEAD', '--name-only', '-z']).stdout.split('\0').filter(Boolean);
  if (changed.some((path) => !allowLock || path !== LOCK) ||
      git(cwd, ['diff', '--cached', '--name-only']).stdout ||
      git(cwd, ['ls-files', '--others', '--exclude-standard']).stdout) {
    throw new Error('Dependency resolution may change only unstaged pnpm-lock.yaml');
  }
}

function regularFile(path) {
  if (!lstatSync(path).isFile()) throw new Error('Dependency lock artifact must contain regular files');
  return readFileSync(path);
}

export function publishDependencyLock({ cwd, directory, sha, verificationRun }) {
  const identity = sourceIdentity(cwd, sha, verificationRun);
  assertChanges(cwd, true);
  const lock = regularFile(join(cwd, LOCK));
  const manifest = { schemaVersion: 1, ...identity, lockSha256: digest(lock) };
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, LOCK), lock);
  writeFileSync(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function applyDependencyLock({ cwd, directory, sha, verificationRun }) {
  const identity = sourceIdentity(cwd, sha, verificationRun);
  assertChanges(cwd, false);
  const manifest = JSON.parse(regularFile(join(directory, 'manifest.json')).toString('utf8'));
  if (manifest.schemaVersion !== 1 || Object.entries(identity).some(([key, value]) => manifest[key] !== value)) {
    throw new Error('Dependency lock artifact source/tree/run mismatch');
  }
  const lock = regularFile(join(directory, LOCK));
  if (!/^[a-f0-9]{64}$/.test(manifest.lockSha256 ?? '') || digest(lock) !== manifest.lockSha256) {
    throw new Error('Dependency lock artifact digest mismatch');
  }
  regularFile(join(cwd, LOCK));
  writeFileSync(join(cwd, LOCK), lock);
  assertChanges(cwd, true);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, directory, sha, verificationRun] = process.argv.slice(2);
    const action = mode === 'publish' ? publishDependencyLock : mode === 'apply' ? applyDependencyLock : null;
    if (!action || !directory) throw new Error('Usage: dependency-lock.mjs publish|apply DIRECTORY SHA VERIFICATION_RUN');
    const manifest = action({ cwd: process.cwd(), directory, sha, verificationRun });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,
      `source_sha=${manifest.sourceSha}\nsource_tree=${manifest.sourceTree}\nlock_sha256=${manifest.lockSha256}\nartifact_name=${dependencyLockArtifactName(manifest.sourceSha)}\n`);
    console.log(JSON.stringify(manifest));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
