import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSha, git, isAncestor } from './git.mjs';

export const STATE_PATH = 'doc/localization/upstream.json';

export function readState(cwd, commit) {
  const state = JSON.parse(git(cwd, ['show', `${assertSha(commit)}:${STATE_PATH}`]).stdout);
  assertSha(state.lastAcceptedUpstreamSha, 'lastAcceptedUpstreamSha');
  if (state.schemaVersion !== 1 || state.upstreamRepository !== 'paperclipai/paperclip' ||
      state.upstreamBranch !== 'master' || state.forkBranch !== 'master' ||
      state.syncBranch !== 'codex/upstream-sync') {
    throw new Error('Unsupported upstream tracking configuration; review it before synchronizing');
  }
  return state;
}

export function prepareCandidate({ cwd, directory, baseSha, upstreamSha, state, existingBranchSha }) {
  assertSha(baseSha, 'fork base');
  assertSha(upstreamSha, 'upstream head');
  if (!isAncestor(cwd, state.lastAcceptedUpstreamSha, baseSha)) {
    throw new Error('The accepted upstream commit is not in fork history; preserve ancestry when merging sync PRs');
  }
  if (!isAncestor(cwd, state.lastAcceptedUpstreamSha, upstreamSha)) {
    throw new Error('Upstream history was rewritten; automatic integration is stopped');
  }
  if (existingBranchSha && !isAncestor(cwd, existingBranchSha, baseSha)) {
    throw new Error('The sync branch contains unmerged work. It will not be reset or overwritten');
  }
  git(cwd, ['worktree', 'add', '--detach', directory, baseSha]);
  const result = git(directory, ['-c', 'user.name=paperclip-sync[bot]', '-c', 'user.email=paperclip-sync[bot]@users.noreply.github.com',
    'merge', '--no-ff', '--no-commit', upstreamSha], { allowFailure: true });
  if (result.status !== 0) {
    const conflicts = git(directory, ['diff', '--name-only', '--diff-filter=U']).stdout.split('\n').filter(Boolean);
    if (conflicts.length === 0) throw new Error(`Cannot merge upstream: ${result.stderr || result.stdout}`);
    git(directory, ['merge', '--abort']);
    return { status: 'conflict', conflicts, baseSha, upstreamSha };
  }
  const stateFile = join(directory, STATE_PATH);
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, `${JSON.stringify({ ...state, lastAcceptedUpstreamSha: upstreamSha }, null, 2)}\n`);
  git(directory, ['add', '--', STATE_PATH]);
  git(directory, ['-c', 'user.name=paperclip-sync[bot]', '-c', 'user.email=paperclip-sync[bot]@users.noreply.github.com',
    'commit', '-m', `Merge upstream ${upstreamSha.slice(0, 12)} for localization review\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>`]);
  return { status: 'prepared', baseSha, upstreamSha, candidateSha: git(directory, ['rev-parse', 'HEAD']).stdout };
}

export function removeCandidate(cwd, directory) {
  git(cwd, ['worktree', 'remove', '--force', directory], { allowFailure: true });
}
