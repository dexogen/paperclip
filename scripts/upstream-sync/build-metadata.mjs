import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSha, git, isAncestor } from './git.mjs';
import { readState } from './prepare.mjs';
import { buildIdentity } from './source.mjs';

// Read only committed metadata. A verified generated lock may be present in the
// working tree; CI/lock validation remains the publication/deployment caller's job.
export function buildMetadata(cwd, fullSourceSha) {
  assertSha(fullSourceSha, 'build source');
  if (git(cwd, ['rev-parse', 'HEAD']).stdout !== fullSourceSha) throw new Error('Checkout does not match build source');
  const state = readState(cwd, fullSourceSha);
  const source = state.acceptedSource;
  if (!isAncestor(cwd, source.upstreamSha, fullSourceSha)) throw new Error('Accepted upstream source is not in fork history');
  const identity = buildIdentity(source, fullSourceSha);
  return { fullSourceSha, buildVersion: identity.version, channel: source.channel,
    sourceTree: assertSha(git(cwd, ['rev-parse', `${fullSourceSha}^{tree}`]).stdout, 'source tree'),
    upstreamSha: source.upstreamSha, upstreamTag: source.tag ?? null, ruRevision: source.ruRevision ?? null,
    upstreamReleaseId: source.releaseId ?? null,
    imageTag: identity.imageTag, releaseTag: identity.releaseTag };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(buildMetadata(process.cwd(), process.argv[2]))); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
