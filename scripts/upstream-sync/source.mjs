import { assertSha, git, isAncestor } from './git.mjs';

export const UPSTREAM = 'paperclipai/paperclip';
const releaseTag = /^v\d+\.\d+\.\d+$/;

export function validateSource(source) {
  assertSha(source?.upstreamSha, 'accepted upstream source');
  if (!['stable', 'master'].includes(source.channel)) throw new Error('Unsupported upstream channel');
  if (source.channel === 'stable' && (!releaseTag.test(source.tag ?? '') ||
      !Number.isSafeInteger(source.releaseId) || source.releaseId < 1 ||
      !Number.isSafeInteger(source.ruRevision) || source.ruRevision < 1)) {
    throw new Error('Stable source requires an upstream release tag, release ID, and positive RU revision');
  }
  return source;
}

export function releaseIdentity(release) {
  if (!release || release.draft !== false || release.prerelease !== false ||
      !release.published_at || !releaseTag.test(release.tag_name ?? '') ||
      !Number.isSafeInteger(release.id) || release.id < 1) {
    throw new Error('Expected a published, non-prerelease upstream CalVer release');
  }
  return { tag: release.tag_name, releaseId: release.id };
}

export function fetchReleaseCommit(cwd, tag, runGit = git) {
  if (!releaseTag.test(tag ?? '')) throw new Error('Invalid upstream release tag');
  // Fetch the exact tag, then peel annotated or lightweight tags to a commit.
  // target_commitish may be a mutable branch and is never a source identity.
  runGit(cwd, ['fetch', '--no-tags', `https://github.com/${UPSTREAM}.git`, `refs/tags/${tag}`]);
  return assertSha(runGit(cwd, ['rev-parse', 'FETCH_HEAD^{commit}']).stdout, 'upstream release commit');
}

export function selectSource({ cwd, state, source, ancestor = isAncestor }) {
  validateSource(source);
  const accepted = validateSource(state.acceptedSource);
  if (source.channel === 'stable' && accepted.channel === 'stable' && source.tag === accepted.tag &&
      (source.upstreamSha !== accepted.upstreamSha || source.releaseId !== accepted.releaseId)) {
    throw new Error('The accepted upstream release identity changed; automatic integration is stopped');
  }
  if (source.upstreamSha === accepted.upstreamSha) {
    const sameRelease = source.channel === accepted.channel &&
      (source.channel === 'master' || (source.tag === accepted.tag && source.releaseId === accepted.releaseId));
    return { status: sameRelease ? 'unchanged' : 'ready', source: sameRelease ? accepted : source };
  }
  if (ancestor(cwd, accepted.upstreamSha, source.upstreamSha)) return { status: 'ready', source };
  if (source.channel === 'stable' && ancestor(cwd, source.upstreamSha, accepted.upstreamSha)) {
    return { status: 'waiting_for_next_release', source };
  }
  throw new Error('Upstream history diverged from the accepted source; automatic integration is stopped');
}

export async function resolveSource({ cwd, state, channel, api, runGit = git }) {
  if (!['stable', 'master'].includes(channel)) throw new Error('Unsupported synchronization channel');
  let source;
  if (channel === 'stable') {
    const identity = releaseIdentity(await api(`/repos/${UPSTREAM}/releases/latest`));
    source = { channel, ...identity, upstreamSha: fetchReleaseCommit(cwd, identity.tag, runGit), ruRevision: 1 };
  } else {
    runGit(cwd, ['fetch', '--no-tags', `https://github.com/${UPSTREAM}.git`, 'refs/heads/master']);
    source = { channel, upstreamSha: assertSha(runGit(cwd, ['rev-parse', 'FETCH_HEAD^{commit}']).stdout) };
  }
  return selectSource({ cwd, state, source });
}

export async function verifyAcceptedSource({ cwd, state, forkSha, api, runGit = git }) {
  const source = validateSource(state.acceptedSource);
  if (!isAncestor(cwd, source.upstreamSha, assertSha(forkSha))) {
    throw new Error('Accepted upstream source is not in the verified fork history');
  }
  if (source.channel === 'stable') {
    const identity = releaseIdentity(await api(`/repos/${UPSTREAM}/releases/${source.releaseId}`));
    if (identity.tag !== source.tag || identity.releaseId !== source.releaseId ||
        fetchReleaseCommit(cwd, source.tag, runGit) !== source.upstreamSha) {
      throw new Error('The upstream release no longer matches the accepted source');
    }
  }
  return source;
}

export function buildIdentity(source, forkSha) {
  validateSource(source);
  assertSha(forkSha, 'fork source');
  if (source.channel === 'stable') {
    const upstreamVersion = source.tag.slice(1);
    return { version: `${upstreamVersion}+ru.${source.ruRevision}`,
      imageTag: `${upstreamVersion}-ru.${source.ruRevision}`, releaseTag: `${source.tag}-ru.${source.ruRevision}` };
  }
  const version = `master-${source.upstreamSha.slice(0, 12)}-ru.${forkSha.slice(0, 12)}`;
  return { version, imageTag: version, releaseTag: '' };
}
