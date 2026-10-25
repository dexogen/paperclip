import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSha, git } from './git.mjs';
import { request, FORK } from './run.mjs';
import { readState } from './prepare.mjs';

export function selectVerifiedRun(runs, sha) {
  assertSha(sha);
  const matching = runs.filter((run) => run.head_sha === sha && run.event === 'push' &&
    run.head_branch === 'master' && run.head_repository?.full_name === FORK &&
    run.path === '.github/workflows/localization-check.yml')
    .sort((a, b) => b.id - a.id);
  if (!matching[0] || matching[0].status !== 'completed' || matching[0].conclusion !== 'success') {
    throw new Error('The latest master verification for this exact SHA has not succeeded');
  }
  return matching[0];
}

export async function verifyBuild() {
  if (process.env.GITHUB_REPOSITORY !== FORK) throw new Error('Unexpected publication repository');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const sha = assertSha(process.env.SOURCE_SHA, 'build source');
  if (event.workflow_run && (event.workflow_run.event !== 'push' || event.workflow_run.head_branch !== 'master')) {
    throw new Error('Only a verified master push may publish an image');
  }
  const branch = await request(`/repos/${FORK}/branches/master`);
  if (branch.commit.sha !== sha) throw new Error('A newer master exists; this build will not replace the accepted image');
  const runs = await request(`/repos/${FORK}/actions/workflows/localization-check.yml/runs?event=push&head_sha=${sha}&per_page=100`);
  const run = selectVerifiedRun(runs.workflow_runs, sha);
  if (event.workflow_run && event.workflow_run.id !== run.id) throw new Error('A newer verification run superseded this event');
  if (git(process.cwd(), ['rev-parse', 'HEAD']).stdout !== sha) throw new Error('Checkout does not match verified source');
  const state = readState(process.cwd(), sha);
  const output = `sha=${sha}\nupstream_sha=${state.lastAcceptedUpstreamSha}\nverification_run=${run.id}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  return { sha, upstreamSha: state.lastAcceptedUpstreamSha, verificationRun: run.id };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyBuild(); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
