import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { git, isAncestor } from './git.mjs';
import { prepareCandidate, readState, removeCandidate, STATE_PATH } from './prepare.mjs';
import { ensureVerification, pullRequestBody, FORK } from './run.mjs';
import { selectVerifiedRun } from './verify-build.mjs';
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
  const state = { schemaVersion: 1, upstreamRepository: 'paperclipai/paperclip', upstreamBranch: 'master',
    forkBranch: 'russian', syncBranch: 'codex/upstream-sync', lastAcceptedUpstreamSha: originalSha };
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
  const alreadyDispatched = async () => ({ workflow_runs: [{ head_sha: sha, head_branch: 'codex/upstream-sync' }] });
  assert.equal(await ensureVerification('codex/upstream-sync', sha, alreadyDispatched), false);
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

test('fork verification and publication target russian while upstream stays on master', () => {
  const root = resolve(import.meta.dirname, '../..');
  const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
  const { load } = createRequire(uiRequire.resolve('@mdxeditor/editor'))('js-yaml');
  const workflow = load(readFileSync(join(root, '.github/workflows/localization-check.yml'), 'utf8'));
  assert.deepEqual(workflow.on.pull_request.branches, ['russian']);
  assert.deepEqual(workflow.on.push.branches, ['russian']);
  assert.equal(Object.hasOwn(workflow.on, 'pull_request_target'), false);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const image = load(readFileSync(join(root, '.github/workflows/fork-build.yml'), 'utf8'));
  const sync = load(readFileSync(join(root, '.github/workflows/upstream-sync.yml'), 'utf8'));
  assert.deepEqual(image.on.workflow_run.branches, ['russian']);
  assert.match(image.jobs.image.if, /github\.ref == 'refs\/heads\/russian'/);
  assert.match(sync.jobs.prepare.if, /github\.ref == 'refs\/heads\/russian'/);
  const state = JSON.parse(readFileSync(join(root, STATE_PATH), 'utf8'));
  assert.equal(state.forkBranch, 'russian');
  assert.equal(state.upstreamBranch, 'master');
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
  assert.deepEqual([...workflow.jobs.verify.needs].sort(), ['code', 'localization', 'tests']);
  assert.equal(workflow.jobs.tests.strategy['fail-fast'], false);
});
