import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { git, isAncestor } from './git.mjs';
import { prepareCandidate, readState, removeCandidate, STATE_PATH } from './prepare.mjs';
import { ensureVerification, pullRequestBody, FORK } from './run.mjs';
import { selectVerifiedRun } from './verify-build.mjs';
import { applyDependencyLock, dependencyLockArtifactName, publishDependencyLock } from './dependency-lock.mjs';
import { checkWorkflowOwners } from './check-workflows.mjs';

function fixture(t, { conflict = false } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'paperclip-sync-test-'));
  const cwd = join(temporary, 'repo');
  mkdirSync(cwd);
  git(cwd, ['init', '-q', '--initial-branch=russian']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.invalid']);
  writeFileSync(join(cwd, 'message.txt'), 'Original\n');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'Original']);
  const originalSha = git(cwd, ['rev-parse', 'HEAD']).stdout;
  const state = { schemaVersion: 2, upstreamRepository: 'paperclipai/paperclip', upstreamBranch: 'master',
    forkBranch: 'russian', syncBranch: 'codex/upstream-sync', trackingChannel: 'stable',
    lastAcceptedUpstreamSha: originalSha, acceptedSource: { channel: 'master', upstreamSha: originalSha, baseTag: 'v2026.1023.0', baseSha: originalSha } };
  mkdirSync(join(cwd, 'doc/localization'), { recursive: true });
  writeFileSync(join(cwd, STATE_PATH), JSON.stringify(state));
  if (conflict) writeFileSync(join(cwd, 'message.txt'), 'Русский текст\n');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'Fork configuration']);
  const baseSha = git(cwd, ['rev-parse', 'HEAD']).stdout;
  git(cwd, ['switch', '-c', 'upstream', originalSha]);
  writeFileSync(join(cwd, conflict ? 'message.txt' : 'new.txt'), 'Upstream change\n');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'Upstream']);
  const upstreamSha = git(cwd, ['rev-parse', 'HEAD']).stdout;
  git(cwd, ['switch', 'russian']);
  const directory = join(temporary, 'candidate');
  t.after(() => { removeCandidate(cwd, directory); rmSync(temporary, { recursive: true, force: true }); });
  return { cwd, directory, baseSha, upstreamSha, originalSha, state };
}

test('preparation preserves both parents and advances state only in the candidate', (t) => {
  const f = fixture(t);
  const result = prepareCandidate(f);
  assert.equal(result.status, 'prepared');
  assert.equal(git(f.directory, ['show', '-s', '--format=%P', 'HEAD']).stdout, `${f.baseSha} ${f.upstreamSha}`);
  assert.equal(readState(f.cwd, f.baseSha).lastAcceptedUpstreamSha, f.originalSha);
  assert.equal(readState(f.directory, result.candidateSha).lastAcceptedUpstreamSha, f.upstreamSha);
  assert.equal(git(f.cwd, ['rev-parse', 'HEAD']).stdout, f.baseSha);
  assert.equal(readFileSync(join(f.directory, 'new.txt'), 'utf8'), 'Upstream change\n');
});

test('a release on the accepted master commit produces a metadata-only promotion candidate', (t) => {
  const f = fixture(t);
  const source = { channel: 'stable', upstreamSha: f.originalSha, tag: 'v2026.1023.0', releaseId: 42, ruRevision: 1 };
  const result = prepareCandidate({ ...f, upstreamSha: f.originalSha, source });
  assert.equal(result.status, 'prepared');
  assert.equal(git(f.directory, ['show', '-s', '--format=%P', 'HEAD']).stdout, f.baseSha);
  assert.equal(git(f.directory, ['diff', '--name-only', f.baseSha, result.candidateSha]).stdout, STATE_PATH);
  assert.deepEqual(readState(f.directory, result.candidateSha).acceptedSource, source);
  assert.equal(readState(f.cwd, f.baseSha).acceptedSource.channel, 'master');
});

test('tracking configuration rejects the retired fork target without changing upstream', (t) => {
  const f = fixture(t);
  assert.equal(readState(f.cwd, f.baseSha).forkBranch, 'russian');
  assert.equal(readState(f.cwd, f.baseSha).upstreamBranch, 'master');
  writeFileSync(join(f.cwd, STATE_PATH), JSON.stringify({ ...f.state, forkBranch: 'master' }));
  git(f.cwd, ['add', '--', STATE_PATH]);
  git(f.cwd, ['commit', '-qm', 'Retired fork target']);
  assert.throws(() => readState(f.cwd, git(f.cwd, ['rev-parse', 'HEAD']).stdout), /Unsupported upstream tracking configuration/);
});

test('preparation uses the bot identity without changing an unconfigured repository', (t) => {
  const f = fixture(t);
  git(f.cwd, ['config', '--local', 'user.name', '']);
  git(f.cwd, ['config', '--local', 'user.email', '']);
  const configPath = join(f.cwd, '.git', 'config');
  const config = readFileSync(configPath, 'utf8');
  const result = prepareCandidate(f);
  assert.equal(result.status, 'prepared');
  assert.equal(git(f.directory, ['show', '-s', '--format=%an <%ae>%n%cn <%ce>', 'HEAD']).stdout,
    'paperclip-sync[bot] <paperclip-sync[bot]@users.noreply.github.com>\n' +
    'paperclip-sync[bot] <paperclip-sync[bot]@users.noreply.github.com>');
  assert.equal(git(f.directory, ['show', '-s', '--format=%P', 'HEAD']).stdout, `${f.baseSha} ${f.upstreamSha}`);
  assert.equal(readFileSync(configPath, 'utf8'), config);
});

test('conflicting text leaves source history and accepted state unchanged', (t) => {
  const f = fixture(t, { conflict: true });
  const result = prepareCandidate(f);
  assert.deepEqual(result.conflicts, ['message.txt']);
  assert.equal(result.status, 'conflict');
  assert.equal(git(f.directory, ['rev-parse', 'HEAD']).stdout, f.baseSha);
  assert.equal(git(f.directory, ['status', '--porcelain']).stdout, '');
  assert.equal(readState(f.cwd, f.baseSha).lastAcceptedUpstreamSha, f.originalSha);
});

test('an unmerged sync branch is never overwritten', (t) => {
  const f = fixture(t);
  assert.throws(() => prepareCandidate({ ...f, existingBranchSha: f.upstreamSha }), /unmerged work/);
  assert.equal(git(f.cwd, ['rev-parse', 'HEAD']).stdout, f.baseSha);
});

test('an already merged previous sync branch permits a new fast-forward candidate', (t) => {
  const f = fixture(t);
  const result = prepareCandidate({ ...f, existingBranchSha: f.originalSha });
  assert.equal(result.status, 'prepared');
  assert.ok(isAncestor(f.cwd, f.originalSha, result.candidateSha));
});

test('upstream rewind or lost downstream ancestry stops preparation', (t) => {
  const f = fixture(t);
  assert.throws(() => prepareCandidate({ ...f, state: { ...f.state, lastAcceptedUpstreamSha: f.upstreamSha } }), /not in fork history/);
  assert.throws(() => prepareCandidate({ ...f, upstreamSha: f.originalSha,
    state: { ...f.state, lastAcceptedUpstreamSha: f.baseSha } }), /history was rewritten/);
});

test('dispatch binds an exact SHA and a frozen candidate is not repeatedly dispatched', async () => {
  const sha = 'a'.repeat(40);
  const calls = [];
  const api = async (path, options) => { calls.push({ path, options }); return { workflow_runs: [] }; };
  assert.equal(await ensureVerification('codex/upstream-sync', sha, api), true);
  assert.deepEqual(calls[1].options.body, { ref: 'codex/upstream-sync', inputs: { expected_sha: sha } });
  assert.equal(calls[0].path, `/repos/${FORK}/actions/workflows/localization-check.yml/runs?head_sha=${sha}&per_page=100`);
  const run = { head_sha: sha, head_branch: 'codex/upstream-sync', head_repository: { full_name: FORK },
    path: '.github/workflows/localization-check.yml', event: 'workflow_dispatch' };
  for (const event of ['push', 'workflow_dispatch']) {
    const existingCalls = [];
    const existingRun = async (path, options) => { existingCalls.push({ path, options }); return { workflow_runs: [{ ...run, event }] }; };
    assert.equal(await ensureVerification('codex/upstream-sync', sha, existingRun, false), false);
    assert.equal(existingCalls.length, 1);
  }
  for (const change of [{ event: 'pull_request' }, { head_sha: 'b'.repeat(40) },
    { head_branch: 'russian' }, { head_repository: { full_name: 'other/repo' } }, { path: 'other.yml' }]) {
    const unrelatedCalls = [];
    const unrelatedRun = async (path, options) => { unrelatedCalls.push({ path, options }); return { workflow_runs: [{ ...run, ...change }] }; };
    assert.equal(await ensureVerification('codex/upstream-sync', sha, unrelatedRun, false), true);
    assert.deepEqual(unrelatedCalls[1].options.body, { ref: 'codex/upstream-sync', inputs: { expected_sha: sha } });
  }
  const beforeAppPush = calls.length;
  assert.equal(await ensureVerification('codex/upstream-sync', sha, api, true), false);
  assert.equal(calls.length, beforeAppPush, 'an App push never races an informational dispatch, even before its run is visible');
  await assert.rejects(ensureVerification('master', sha, api), /Unexpected verification branch/);
  await assert.rejects(ensureVerification('russian', sha, api), /Unexpected verification branch/);
});

test('image publication requires the latest successful push verification of the exact fork SHA', () => {
  const sha = 'a'.repeat(40);
  const run = { id: 10, head_sha: sha, event: 'push', head_branch: 'russian', head_repository: { full_name: FORK },
    path: '.github/workflows/localization-check.yml', status: 'completed', conclusion: 'success' };
  assert.equal(selectVerifiedRun([run], sha).id, 10);
  assert.throws(() => selectVerifiedRun([{ ...run, head_branch: 'master' }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([{ ...run, head_branch: 'codex/upstream-sync' }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([{ ...run, head_sha: 'b'.repeat(40) }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([run, { ...run, id: 11, conclusion: 'failure' }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([{ ...run, event: 'pull_request' }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([{ ...run, event: 'workflow_dispatch' }], sha), /has not succeeded/);
  assert.throws(() => selectVerifiedRun([{ ...run, head_repository: { full_name: 'other/repo' } }], sha), /has not succeeded/);
});

test('new inherited workflows require an effective repository guard', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'paperclip-workflows-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.github/workflows'), { recursive: true });
  const file = join(root, '.github/workflows/new-upstream.yml');
  writeFileSync(file, 'jobs:\n  publish:\n    runs-on: ubuntu-latest\n');
  assert.equal(checkWorkflowOwners(root).length, 1);
  writeFileSync(file, "jobs:\n  publish:\n    if: true || github.repository == 'paperclipai/paperclip'\n    runs-on: ubuntu-latest\n");
  assert.equal(checkWorkflowOwners(root).length, 1);
  writeFileSync(file, "jobs:\n  publish:\n    if: github.repository == 'paperclipai/paperclip' && always()\n    runs-on: ubuntu-latest\n");
  assert.deepEqual(checkWorkflowOwners(root), []);
  writeFileSync(file, "jobs:\n  publish:\n    if: github.repository == 'paperclipai/paperclip' && false || true\n    runs-on: ubuntu-latest\n");
  assert.equal(checkWorkflowOwners(root).length, 1);
  for (const unguarded of ['  "release":\n    runs-on: ubuntu-latest\n',
    '  release: {runs-on: ubuntu-latest}\n']) {
    writeFileSync(file, "jobs:\n  safe:\n    if: github.repository == 'paperclipai/paperclip'\n    runs-on: ubuntu-latest\n" + unguarded);
    assert.match(checkWorkflowOwners(root).join('\n'), /release: missing repository owner guard/);
  }
  writeFileSync(file, "jobs:\n    'release':\n        runs-on: ubuntu-latest\n");
  assert.match(checkWorkflowOwners(root).join('\n'), /release: missing repository owner guard/);
  writeFileSync(file, "jobs:\n  release:\n    if: github.repository == 'paperclipai/paperclip'\n    if: true\n");
  assert.match(checkWorkflowOwners(root).join('\n'), /cannot parse workflow YAML/);
});

test('sync PR explains pending checks rather than claiming acceptance', () => {
  const body = pullRequestBody({ previousSha: 'a'.repeat(40), upstreamSha: 'b'.repeat(40),
    candidateSha: 'c'.repeat(40), findings: 2, runUrl: 'https://github.com/dexogen/paperclip/actions/runs/1' });
  for (const heading of ['Thinking Path', 'What Changed', 'Verification', 'Risks', 'Model Used', 'Checklist']) assert.match(body, new RegExp(`## ${heading}`));
  assert.match(body, /- \[ \] Required checks pass/);
  assert.match(body, /Merge with a merge commit/);
});

test('fork verification targets russian and publication preserves stable/manual-master channel guards', () => {
  const root = resolve(import.meta.dirname, '../..');
  const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
  const { load } = createRequire(uiRequire.resolve('@mdxeditor/editor'))('js-yaml');
  const workflow = load(readFileSync(join(root, '.github/workflows/localization-check.yml'), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on).sort(), ['push', 'workflow_dispatch']);
  assert.deepEqual(workflow.on.push.branches, ['russian', 'codex/upstream-sync']);
  assert.equal(Object.hasOwn(workflow.on, 'pull_request'), false);
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.expected_sha, {
    description: 'Exact branch commit to verify; a moved branch fails closed', required: true, type: 'string',
  });
  assert.equal(workflow.concurrency.group, 'fork-verification-${{ github.ref }}');
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  const producer = workflow.jobs['dependency-lock'];
  assert.equal(producer.steps.find((step) => step.uses?.startsWith('actions/checkout@')).with.ref, '${{ github.sha }}');
  const identity = producer.steps.find((step) => step.name === 'Verify exact source identity');
  assert.equal(identity.env.EXPECTED_SHA, '${{ inputs.expected_sha || github.sha }}');
  assert.match(identity.run, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(identity.run, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.equal(Object.hasOwn(workflow.on, 'pull_request_target'), false);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const image = load(readFileSync(join(root, '.github/workflows/fork-build.yml'), 'utf8'));
  const sync = load(readFileSync(join(root, '.github/workflows/upstream-sync.yml'), 'utf8'));
  assert.deepEqual(image.on.workflow_run.branches, ['russian']);
  assert.match(image.jobs.image.if, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(image.jobs.image.if, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(image.jobs.image.if, /github\.ref == 'refs\/heads\/russian'/);
  assert.match(sync.jobs.prepare.if, /github\.ref == 'refs\/heads\/russian'/);
  assert.equal(sync.jobs.prepare.steps.find((step) => step.id === 'sync').env.SYNC_PUSH_TRIGGERS_WORKFLOWS,
    "${{ steps.app.outputs.token != '' }}");
  assert.deepEqual(sync.on.workflow_dispatch.inputs.channel.options, ['stable', 'master']);
  assert.equal(sync.on.workflow_dispatch.inputs.channel.default, 'stable');
  const steps = image.jobs.image.steps;
  const build = steps.find((step) => step.id === 'image');
  const reservation = steps.find((step) => step.run === 'node scripts/upstream-sync/publish-release.mjs --reserve');
  const publication = steps.find((step) => step.run === 'node scripts/upstream-sync/publish-release.mjs image-manifest.json');
  const registryGuard = steps.find((step) => step.run === 'node scripts/upstream-sync/verify-image-tags.mjs');
  assert.ok(steps.indexOf(reservation) < steps.indexOf(build));
  assert.ok(steps.indexOf(registryGuard) < steps.indexOf(build));
  assert.equal(registryGuard.if, "steps.source.outputs.already_published != 'true'");
  assert.ok(steps.indexOf(publication) > steps.indexOf(build));
  const provenanceUpload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.ok(steps.indexOf(provenanceUpload) > steps.indexOf(build));
  assert.ok(steps.indexOf(provenanceUpload) < steps.indexOf(publication), 'preserve the digest before release API writes');
  for (const step of [reservation, publication]) assert.equal(step.if,
    "steps.source.outputs.channel == 'stable' && steps.source.outputs.already_published != 'true'");
  assert.equal(build.if, "steps.source.outputs.already_published != 'true'");
  assert.match(build.with.tags, /ru-\$\{\{ steps.source.outputs.sha \}\}/);
  assert.match(build.with.tags, /\$\{\{ steps.source.outputs.image_tag \}\}/);
  assert.match(build.with['build-args'], /PAPERCLIP_BUILD_VERSION=\$\{\{ steps.source.outputs.version \}\}/);
  const state = JSON.parse(readFileSync(join(root, STATE_PATH), 'utf8'));
  assert.equal(state.forkBranch, 'russian');
  assert.equal(state.upstreamBranch, 'master');
  assert.equal(state.trackingChannel, 'stable');
  assert.equal(state.acceptedSource.upstreamSha, state.lastAcceptedUpstreamSha);
});

test('fork CI partitions the full test inventory without omissions or duplicate suites', () => {
  const root = resolve(import.meta.dirname, '../..');
  const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
  const { load } = createRequire(uiRequire.resolve('@mdxeditor/editor'))('js-yaml');
  const workflow = load(readFileSync(join(root, '.github/workflows/localization-check.yml'), 'utf8'));
  const plan = (args) => JSON.parse(execFileSync(process.execPath,
    [join(root, 'scripts/run-vitest-stable.mjs'), ...args, '--dry-run'],
    { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_WORKFLOW: 'Fork verification' } }));
  for (const mode of ['general', 'serialized']) {
    const group = mode === 'general' ? ['--group', 'general-server'] : [];
    const property = mode === 'general' ? 'selectedGeneralServerSuites' : 'selectedSerializedSuites';
    const all = plan(['--mode', mode, ...group, '--shard-index', '0', '--shard-count', '1'])[property];
    const selected = workflow.jobs.tests.strategy.matrix.include.filter((item) => item.mode === mode)
      .flatMap((item) => plan(['--mode', mode, ...group,
        '--shard-index', String(item.shard_index), '--shard-count', String(item.shard_count)])[property]);
    assert.equal(new Set(selected).size, selected.length, `${mode} suite must run once`);
    assert.deepEqual([...selected].sort(), [...all].sort(), `${mode} coverage must match the full planner`);
    if (mode === 'general') {
      assert.ok(selected.includes('server/src/__tests__/chat-channels.integration.test.ts'));
      assert.ok(selected.includes('server/src/services/native-runtime/native-runner-restart-recovery.integration.test.ts'));
    }
  }
  const workspaceGroups = workflow.jobs.code.steps.map((step) => step.run?.match(
    /^pnpm test:run:general -- --group (general-workspaces-[a-z])$/)?.[1]).filter(Boolean);
  assert.deepEqual(workspaceGroups.sort(), ['general-workspaces-a', 'general-workspaces-b', 'general-workspaces-c']);
  assert.deepEqual([...workflow.jobs.verify.needs].sort(), ['code', 'dependency-lock', 'localization', 'tests']);
  assert.equal(workflow.jobs.tests.strategy['fail-fast'], false);
});

function dependencyFixture(t) {
  const f = fixture(t);
  writeFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  git(f.cwd, ['add', '--', 'pnpm-lock.yaml']);
  git(f.cwd, ['commit', '-qm', 'Original dependency lock']);
  return { ...f, sha: git(f.cwd, ['rev-parse', 'HEAD']).stdout,
    directory: join(f.cwd, '..', 'dependency-lock'), verificationRun: '12345' };
}

test('one resolved lock is bound to source/tree/run and reused byte-for-byte by clean consumers', (t) => {
  const f = dependencyFixture(t);
  const resolved = 'lockfileVersion: 9.0\nresolved: exact-version\n';
  writeFileSync(join(f.cwd, 'pnpm-lock.yaml'), resolved);
  const manifest = publishDependencyLock(f);
  assert.equal(manifest.sourceSha, f.sha);
  assert.equal(manifest.sourceTree, git(f.cwd, ['rev-parse', 'HEAD^{tree}']).stdout);
  assert.equal(manifest.verificationRun, '12345');
  assert.equal(dependencyLockArtifactName(f.sha), `dependency-lock-${f.sha}`);
  for (const lane of ['localization', 'code', 'tests', 'image']) {
    git(f.cwd, ['restore', '--', 'pnpm-lock.yaml']);
    assert.deepEqual(applyDependencyLock(f), manifest, lane);
    assert.equal(readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8'), resolved, lane);
    assert.equal(git(f.cwd, ['diff', '--name-only']).stdout, 'pnpm-lock.yaml');
  }
});

test('lock artifacts reject wrong SHA/tree/run/digest before changing the consumer lock', (t) => {
  const f = dependencyFixture(t);
  const original = readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8');
  const manifest = publishDependencyLock(f);
  assert.throws(() => applyDependencyLock({ ...f, sha: 'b'.repeat(40) }), /source SHA mismatch/);
  for (const change of [
    { sourceSha: 'b'.repeat(40) }, { sourceTree: 'c'.repeat(40) }, { verificationRun: '54321' },
    { schemaVersion: 2 }, { lockSha256: 'd'.repeat(64) },
  ]) {
    writeFileSync(join(f.directory, 'manifest.json'), JSON.stringify({ ...manifest, ...change }));
    assert.throws(() => applyDependencyLock(f), /mismatch/);
    assert.equal(readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8'), original);
  }
  writeFileSync(join(f.directory, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(join(f.directory, 'pnpm-lock.yaml'), 'corrupted artifact\n');
  assert.throws(() => applyDependencyLock(f), /digest mismatch/);
  assert.equal(readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8'), original);
});

test('dependency resolution rejects other tracked, staged or untracked source changes', (t) => {
  const f = dependencyFixture(t);
  writeFileSync(join(f.cwd, 'message.txt'), 'Unexpected manifest edit\n');
  assert.throws(() => publishDependencyLock(f), /only unstaged pnpm-lock/);
  git(f.cwd, ['restore', '--', 'message.txt']);
  writeFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'resolved lock\n');
  git(f.cwd, ['add', '--', 'pnpm-lock.yaml']);
  assert.throws(() => publishDependencyLock(f), /only unstaged pnpm-lock/);
  git(f.cwd, ['restore', '--staged', '--worktree', '--', 'pnpm-lock.yaml']);
  writeFileSync(join(f.cwd, 'unexpected.txt'), 'unexpected source\n');
  assert.throws(() => publishDependencyLock(f), /only unstaged pnpm-lock/);
});

test('every verification lane and image use the same run-bound lock without resolving again', () => {
  const root = resolve(import.meta.dirname, '../..');
  const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
  const { load } = createRequire(uiRequire.resolve('@mdxeditor/editor'))('js-yaml');
  const workflow = load(readFileSync(join(root, '.github/workflows/localization-check.yml'), 'utf8'));
  const producer = workflow.jobs['dependency-lock'];
  const resolutions = Object.values(workflow.jobs).flatMap((job) => job.steps ?? [])
    .filter((step) => step.run?.includes('--no-frozen-lockfile'));
  assert.equal(resolutions.length, 1);
  assert.equal(resolutions[0].run, 'pnpm install --resolution-only --ignore-scripts --no-frozen-lockfile');
  assert.ok(producer.steps.some((step) => step.run?.includes('test "$GITHUB_SHA" = "$EXPECTED_SHA"')));
  const upload = producer.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.equal(upload.with.name, '${{ steps.lock.outputs.artifact_name }}');
  assert.equal(upload.with.overwrite, true);
  assert.equal(upload.with['if-no-files-found'], 'error');
  for (const lane of ['localization', 'code', 'tests']) {
    const job = workflow.jobs[lane];
    assert.deepEqual(job.needs, ['dependency-lock']);
    assert.equal(job.steps.find((step) => step.uses?.startsWith('actions/checkout@')).with.ref,
      '${{ needs.dependency-lock.outputs.source_sha }}');
    const download = job.steps.findIndex((step) => step.uses?.startsWith('actions/download-artifact@'));
    const apply = job.steps.findIndex((step) => step.run?.includes('dependency-lock.mjs apply'));
    const install = job.steps.findIndex((step) => step.run?.startsWith('pnpm install '));
    assert.ok(download >= 0 && download < apply && apply < install, lane);
    assert.equal(job.steps[download].with.name, '${{ needs.dependency-lock.outputs.artifact_name }}');
    assert.equal(job.steps[apply].env.LOCK_SOURCE_SHA, '${{ needs.dependency-lock.outputs.source_sha }}');
    assert.match(job.steps[apply].run, /"\$GITHUB_RUN_ID"$/);
    assert.match(job.steps[install].run, /--frozen-lockfile/);
  }
  assert.ok(workflow.jobs.verify.needs.includes('dependency-lock'));
  assert.equal(workflow.jobs.verify.steps[0].env.DEPENDENCY_LOCK_RESULT, '${{ needs.dependency-lock.result }}');
  assert.match(workflow.jobs.verify.steps[0].run, /test "\$DEPENDENCY_LOCK_RESULT" = success/);
  const image = load(readFileSync(join(root, '.github/workflows/fork-build.yml'), 'utf8')).jobs.image;
  const download = image.steps.findIndex((step) => step.uses?.startsWith('actions/download-artifact@'));
  const apply = image.steps.findIndex((step) => step.run?.includes('dependency-lock.mjs apply'));
  const build = image.steps.findIndex((step) => step.uses?.startsWith('docker/build-push-action@'));
  assert.ok(download >= 0 && download < apply && apply < build);
  assert.equal(image.steps[download].with.name, 'dependency-lock-${{ steps.source.outputs.sha }}');
  assert.equal(image.steps[download].with['run-id'], '${{ steps.source.outputs.verification_run }}');
  assert.equal(image.steps[apply].env.VERIFICATION_RUN, '${{ steps.source.outputs.verification_run }}');
  assert.equal(image.steps[build].with.context, '.');
  assert.match(image.steps[build].with['build-args'], /PAPERCLIP_DEPENDENCY_LOCK_SHA256=\$\{\{ steps.lock.outputs.lock_sha256 \}\}/);
  assert.match(image.steps[build].with.labels, /lock-sha256=\$\{\{ steps.lock.outputs.lock_sha256 \}\}/);
  assert.ok(image.steps.some((step) => step.run?.includes('lockSha256: process.env.LOCK_SHA256')));
});

test('image verified-lock mode checks the digest and bypasses resolution while the upstream default still resolves', (t) => {
  const root = resolve(import.meta.dirname, '../..');
  const docker = readFileSync(join(root, 'Dockerfile'), 'utf8');
  assert.match(docker, /^ARG PAPERCLIP_DEPENDENCY_LOCK_SHA256$/m);
  const command = docker.match(/^RUN if \[ -n "\$PAPERCLIP_DEPENDENCY_LOCK_SHA256" \]; then[\s\S]*?fi && pnpm install --frozen-lockfile$/m)?.[0];
  assert.ok(command, 'the real Docker install block is exercised');
  const cwd = mkdtempSync(join(tmpdir(), 'paperclip-image-lock-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  const hash = execFileSync('sha256sum', ['pnpm-lock.yaml'], { cwd, encoding: 'utf8' }).split(' ')[0];
  const run = (value) => execFileSync('sh', ['-c',
    `pnpm() { printf '%s\\n' "$*"; }; ${command.slice(4).replaceAll('\\\n', '')}`],
    { cwd, encoding: 'utf8', env: { ...process.env, PAPERCLIP_DEPENDENCY_LOCK_SHA256: value }, stdio: 'pipe' });
  const verified = run(hash);
  assert.match(verified, /pnpm-lock.yaml: OK/);
  assert.match(verified, /install --frozen-lockfile/);
  assert.doesNotMatch(verified, /resolution-only/);
  assert.throws(() => run('0'.repeat(64)), (error) => {
    assert.doesNotMatch(String(error.stdout), /install --frozen-lockfile/);
    return true;
  });
  const upstream = run('');
  assert.match(upstream, /install --resolution-only --ignore-scripts --no-frozen-lockfile/);
  assert.match(upstream, /install --frozen-lockfile/);
});

test('trusted audit installation resolves a stale lock without scripts or leaking it into the candidate', (t) => {
  const f = fixture(t);
  const marker = join(f.cwd, '..', 'lifecycle-ran');
  const lifecycle = `node -e "require('node:fs').writeFileSync(process.env.PAPERCLIP_AUDIT_TEST_MARKER, 'ran')"`;
  const scripts = { preinstall: lifecycle, install: lifecycle, postinstall: lifecycle };
  mkdirSync(join(f.cwd, 'ui'));
  mkdirSync(join(f.cwd, 'vendor/audit-tool'), { recursive: true });
  writeFileSync(join(f.cwd, '.gitignore'), 'node_modules/\n');
  writeFileSync(join(f.cwd, 'pnpm-workspace.yaml'), 'packages:\n  - ui\n');
  const manifest = { name: 'audit-fixture', private: true, scripts };
  writeFileSync(join(f.cwd, 'package.json'), JSON.stringify(manifest));
  writeFileSync(join(f.cwd, 'ui/package.json'), JSON.stringify({ name: '@paperclipai/ui', private: true, scripts }));
  writeFileSync(join(f.cwd, 'vendor/audit-tool/package.json'), JSON.stringify({ name: 'audit-tool', version: '1.0.0', main: 'index.cjs', scripts }));
  writeFileSync(join(f.cwd, 'vendor/audit-tool/index.cjs'), 'module.exports = "installed-audit-tool";\n');
  const pnpm = (args) => spawnSync('pnpm', args, { cwd: f.cwd, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, CI: 'true', npm_config_offline: 'true', PAPERCLIP_AUDIT_TEST_MARKER: marker } });
  const initial = pnpm(['install', '--lockfile-only', '--ignore-scripts', '--offline']);
  assert.equal(initial.status, 0, initial.error?.message ?? initial.stderr + initial.stdout);
  writeFileSync(join(f.cwd, 'package.json'), JSON.stringify({ ...manifest, devDependencies: { 'audit-tool': 'file:vendor/audit-tool' } }));
  git(f.cwd, ['add', '--', '.gitignore', 'pnpm-workspace.yaml', 'package.json', 'ui', 'vendor', 'pnpm-lock.yaml']);
  git(f.cwd, ['commit', '-qm', 'Manifest change with a stale upstream lock']);
  const baseSha = git(f.cwd, ['rev-parse', 'HEAD']).stdout;
  const sourceTree = git(f.cwd, ['rev-parse', 'HEAD^{tree}']).stdout;
  const originalLock = readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8');
  const control = pnpm(['install', '--frozen-lockfile', '--ignore-scripts', '--filter', '.', '--filter', '@paperclipai/ui']);
  assert.notEqual(control.status, 0);
  assert.match(control.stdout + control.stderr, /ERR_PNPM_OUTDATED_LOCKFILE/);
  assert.equal(existsSync(marker), false);
  const root = resolve(import.meta.dirname, '../..');
  const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
  const { load } = createRequire(uiRequire.resolve('@mdxeditor/editor'))('js-yaml');
  const workflow = load(readFileSync(join(root, '.github/workflows/upstream-sync.yml'), 'utf8'));
  const command = workflow.jobs.prepare.steps.find((step) => step.name === 'Install trusted audit tooling without lifecycle scripts').run;
  const [executable, ...args] = command.trim().split(/\s+/);
  assert.equal(executable, 'pnpm');
  assert.ok(args.includes('--ignore-scripts'));
  const install = pnpm(args);
  assert.equal(install.status, 0, install.error?.message ?? install.stderr + install.stdout);
  assert.equal(createRequire(join(f.cwd, 'package.json'))('audit-tool'), 'installed-audit-tool');
  assert.equal(existsSync(marker), false);
  assert.notEqual(readFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'utf8'), originalLock);
  assert.equal(git(f.cwd, ['diff', '--name-only']).stdout, 'pnpm-lock.yaml');
  assert.equal(git(f.cwd, ['diff', '--cached', '--name-only']).stdout, '');
  assert.equal(git(f.cwd, ['rev-parse', 'HEAD']).stdout, baseSha);
  assert.equal(git(f.cwd, ['rev-parse', 'HEAD^{tree}']).stdout, sourceTree);
  const result = prepareCandidate({ ...f, baseSha });
  assert.equal(result.status, 'prepared');
  assert.equal(git(f.directory, ['show', '-s', '--format=%P', 'HEAD']).stdout, `${baseSha} ${f.upstreamSha}`);
  assert.equal(readFileSync(join(f.directory, 'pnpm-lock.yaml'), 'utf8'), originalLock);
  assert.equal(git(f.directory, ['status', '--porcelain']).stdout, '');
  assert.equal(git(f.cwd, ['show', 'HEAD:pnpm-lock.yaml']).stdout, originalLock.trim());
  assert.equal(existsSync(marker), false);
});
