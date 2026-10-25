import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSha, git } from './git.mjs';
import { prepareCandidate, readState, removeCandidate } from './prepare.mjs';
import { checkWorkflowOwners } from './check-workflows.mjs';

export const FORK = 'dexogen/paperclip';
const controlRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const marker = '<!-- paperclip-upstream-sync -->';

export function pullRequestBody({ previousSha, upstreamSha, candidateSha, findings, runUrl }) {
  const checklist = readFileSync(join(controlRoot, '.github/PULL_REQUEST_TEMPLATE.md'), 'utf8')
    .split('## Checklist')[1]?.trim();
  if (!checklist) throw new Error('The repository PR template must include its checklist');
  return `${marker}
## Thinking Path

> - Paperclip manages agents and their work.
> - This fork adds Russian interface text.
> - Upstream changes can add or alter that text.
> - Each update keeps upstream history and a fixed source revision.
> - This PR prepares an update for code and translation review.

## Linked Issues or Issue Description

**Current behavior**
The maintained fork includes upstream \`${previousSha}\`.

**Proposed behavior**
Integrate [upstream \`${upstreamSha}\`](https://github.com/paperclipai/paperclip/commit/${upstreamSha}) and review its translation changes.

**Reason and benefit**
Keep the Russian edition current without losing its translations or prior reviews.

## What Changed

- Merge the pinned upstream commit, preserving its ancestry.
- Propose the new tracking revision; it becomes accepted only when this PR lands.
- Keep this batch frozen. Later upstream changes go into the next PR.

## Verification

- Initial candidate: \`${candidateSha}\`.
- Failing translation/workflow-policy checks: **${findings}**.
- [Workflow reports and source delta](${runUrl}). Full checks run on this branch separately.
- Resolve all findings and review new Russian text before converting this draft to ready.

## Risks

Upstream can change application behavior, migrations, workflow files, and English text. Review the diff and checks. Merge with a merge commit; squash/rebase loses the ancestry required by future updates. No deployment is performed.

## Model Used

None — this PR is assembled by a deterministic GitHub Actions workflow. Any later agent-assisted edits must update this section.

## Checklist

${checklist}

Sync review:

- [x] The source revision and upstream ancestry are recorded.
- [x] The PR includes a source and translation report.
- [ ] Required checks pass on the current candidate.
- [ ] New or changed Russian text has editorial acceptance.
- [ ] Workflow, dependency, migration, and behavior changes have been reviewed.
- [ ] The PR is ready to merge with a merge commit.
`;
}

export async function request(path, { method = 'GET', body, token = process.env.GH_TOKEN } = {}) {
  if (!token) throw new Error('A GitHub token is required');
  const response = await fetch(`https://api.github.com${path}`, {
    method, headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json',
    }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status} ${data.message || response.statusText}`);
  return data;
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value).replace(/[\r\n]/g, '')}\n`);
}

function summary(message, directory) {
  writeFileSync(join(directory, 'sync-summary.md'), message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
}

function runAudit(root, outputPrefix, extraArgs = []) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/TOKEN|SECRET|PRIVATE_KEY/.test(key)) delete env[key];
  const result = spawnSync(process.execPath, [join(controlRoot, 'scripts/localization/check.mjs'),
    '--root', root, '--policy-root', controlRoot, '--json', `${outputPrefix}.json`, '--markdown', `${outputPrefix}.md`, ...extraArgs],
  { cwd: controlRoot, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (![0, 1].includes(result.status) || !existsSync(`${outputPrefix}.json`)) {
    throw new Error(`Localization audit failed to produce a report: ${result.stderr || result.stdout}`);
  }
  return result.status;
}

async function updateReport(prNumber, report) {
  const prefix = '<!-- paperclip-localization-report -->';
  const body = `${prefix}\n${report}`.slice(0, 60000);
  let existing;
  for (let page = 1; ; page++) {
    const comments = await request(`/repos/${FORK}/issues/${prNumber}/comments?per_page=100&page=${page}`);
    existing = comments.find((comment) => comment.body?.startsWith(prefix));
    if (existing || comments.length < 100) break;
  }
  if (existing?.body === body) return;
  await request(existing ? `/repos/${FORK}/issues/comments/${existing.id}` : `/repos/${FORK}/issues/${prNumber}/comments`,
    { method: existing ? 'PATCH' : 'POST', body: { body } });
}

export async function ensureVerification(branch, sha, api = request) {
  assertSha(sha, 'verification source');
  if (branch !== 'codex/upstream-sync') throw new Error('Unexpected verification branch');
  const runs = await api(`/repos/${FORK}/actions/workflows/localization-check.yml/runs?event=workflow_dispatch&head_sha=${sha}&per_page=100`);
  if (runs.workflow_runs.some((run) => run.head_sha === sha && run.head_branch === branch)) return false;
  await api(`/repos/${FORK}/actions/workflows/localization-check.yml/dispatches`, {
    method: 'POST', body: { ref: branch, inputs: { expected_sha: sha } },
  });
  return true;
}

export async function runSync() {
  if (process.env.GITHUB_REPOSITORY !== FORK || process.env.GITHUB_REF !== 'refs/heads/master') {
    throw new Error('Upstream synchronization runs only from dexogen/paperclip master');
  }
  const directory = resolve(process.env.SYNC_REPORT_DIR || join(tmpdir(), 'paperclip-sync-reports'));
  mkdirSync(directory, { recursive: true });
  output('reports', directory);
  const runUrl = `https://github.com/${FORK}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  git(controlRoot, ['fetch', '--no-tags', `https://github.com/${FORK}.git`, 'refs/heads/master:refs/remotes/fork-sync/master']);
  const baseSha = assertSha(git(controlRoot, ['rev-parse', 'refs/remotes/fork-sync/master']).stdout);
  if (git(controlRoot, ['rev-parse', 'HEAD']).stdout !== baseSha) {
    throw new Error('master moved after this workflow started; run synchronization again on the current master');
  }
  const state = readState(controlRoot, baseSha);
  git(controlRoot, ['fetch', '--no-tags', `https://github.com/${state.upstreamRepository}.git`,
    `refs/heads/${state.upstreamBranch}:refs/remotes/fork-sync/upstream`]);
  const upstreamSha = assertSha(git(controlRoot, ['rev-parse', 'refs/remotes/fork-sync/upstream']).stdout);
  const prs = await request(`/repos/${FORK}/pulls?state=open&head=dexogen:${encodeURIComponent(state.syncBranch)}&base=master`);
  if (prs.length) {
    await ensureVerification(state.syncBranch, prs[0].head.sha);
    output('status', 'frozen');
    summary(`An update is already awaiting review: [PR #${prs[0].number}](${prs[0].html_url}). Its branch was not changed. Latest upstream: \`${upstreamSha}\`.`, directory);
    return { status: 'frozen', pr: prs[0].number };
  }
  if (upstreamSha === state.lastAcceptedUpstreamSha) {
    output('status', 'unchanged');
    summary(`Upstream is unchanged at \`${upstreamSha}\`. No PR or comment was created.`, directory);
    return { status: 'unchanged' };
  }
  runAudit(controlRoot, join(directory, 'upstream-delta'), ['--base', state.lastAcceptedUpstreamSha, '--head', upstreamSha]);
  const branch = git(controlRoot, ['ls-remote', `https://github.com/${FORK}.git`, `refs/heads/${state.syncBranch}`]).stdout;
  const existingBranchSha = branch ? assertSha(branch.split(/\s/)[0]) : undefined;
  if (existingBranchSha) git(controlRoot, ['fetch', '--no-tags', `https://github.com/${FORK}.git`, `refs/heads/${state.syncBranch}`]);
  const temporary = mkdtempSync(join(tmpdir(), 'paperclip-sync-'));
  const candidate = join(temporary, 'candidate');
  try {
    const result = prepareCandidate({ cwd: controlRoot, directory: candidate, baseSha, upstreamSha, state, existingBranchSha });
    writeFileSync(join(directory, 'sync.json'), `${JSON.stringify(result, null, 2)}\n`);
    if (result.status === 'conflict') {
      output('status', 'conflict');
      summary(`Upstream \`${upstreamSha}\` conflicts with \`${baseSha}\`. The maintained branch was not changed. Resolve these paths in a reviewed integration:\n\n${result.conflicts.map((path) => `- \`${path}\``).join('\n')}\n\nThe upstream source delta is attached to this run.`, directory);
      process.exitCode = 1;
      return result;
    }
    const auditStatus = runAudit(candidate, join(directory, 'candidate'), ['--check']);
    const policyErrors = checkWorkflowOwners(candidate);
    writeFileSync(join(directory, 'workflow-policy.json'), `${JSON.stringify({ errors: policyErrors }, null, 2)}\n`);
    const findings = auditStatus + policyErrors.length;
    if (policyErrors.length) {
      output('status', 'policy-blocked');
      summary(`Upstream workflow ownership needs review before any branch is pushed:\n\n${policyErrors.map((error) => `- ${error}`).join('\n')}\n\nSource and candidate reports are attached. The maintained and sync branches were not changed.`, directory);
      process.exitCode = 1;
      return { ...result, status: 'policy-blocked', policyErrors };
    }
    git(candidate, ['push', `https://github.com/${FORK}.git`, `HEAD:refs/heads/${state.syncBranch}`], { token: process.env.GH_TOKEN });
    const pr = await request(`/repos/${FORK}/pulls`, { method: 'POST', body: {
      title: `Merge upstream ${upstreamSha.slice(0, 12)} for Russian localization`,
      head: state.syncBranch, base: state.forkBranch, draft: true,
      body: pullRequestBody({ previousSha: state.lastAcceptedUpstreamSha, upstreamSha,
        candidateSha: result.candidateSha, findings, runUrl }),
    } });
    const candidateReport = readFileSync(join(directory, 'candidate.md'), 'utf8');
    await updateReport(pr.number, `Candidate: \`${result.candidateSha}\`\n\n${candidateReport}\n\n${policyErrors.map((error) => `- ${error}`).join('\n')}\n\n[Complete upstream delta and reports](${runUrl})`);
    await ensureVerification(state.syncBranch, result.candidateSha);
    output('status', 'prepared');
    output('candidate_sha', result.candidateSha);
    output('pr_url', pr.html_url);
    summary(`Prepared [PR #${pr.number}](${pr.html_url}) at \`${result.candidateSha}\`. Full verification was dispatched for that exact SHA. Review translations and use a merge commit; no automatic merge or deployment was performed.`, directory);
    return { ...result, pr: pr.number };
  } finally {
    removeCandidate(controlRoot, candidate);
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runSync(); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nSynchronization stopped: ${message}\n`);
    process.exitCode = 1;
  }
}
