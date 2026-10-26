import { spawnSync } from 'node:child_process';

export function assertSha(value, label = 'commit') {
  if (!/^[a-f0-9]{40}$/.test(value ?? '')) throw new Error(`${label} must be a full commit SHA`);
  return value;
}

export function git(cwd, args, { allowFailure = false, token } = {}) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  if (token) {
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader';
    env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
  }
  const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
    cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args[0]} failed: ${result.stderr || result.stdout}`);
  }
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export function isAncestor(cwd, ancestor, descendant) {
  const result = git(cwd, ['merge-base', '--is-ancestor', assertSha(ancestor), assertSha(descendant)], { allowFailure: true });
  if (![0, 1].includes(result.status)) throw new Error(`Cannot inspect commit ancestry: ${result.stderr}`);
  return result.status === 0;
}
