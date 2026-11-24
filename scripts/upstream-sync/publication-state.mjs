import { assertSha } from './git.mjs';
import { FORK, request } from './run.mjs';

export const sourceMarker = (sha) => `<!-- paperclip-ru-source:${assertSha(sha)} -->`;

// An existing release is immutable. A rerun skips it; new fork edits need a new
// reviewed RU revision, even when the upstream release itself did not change.
export async function inspectPublication(metadata, api = request) {
  if (metadata.channel !== 'stable') return { alreadyPublished: false };
  const tag = encodeURIComponent(metadata.releaseTag);
  const ref = await api(`/repos/${FORK}/git/ref/tags/${tag}`, { allowNotFound: true });
  if (ref && (ref.object?.type !== 'commit' || ref.object.sha !== metadata.fullSourceSha)) {
    throw new Error(`Immutable release tag ${metadata.releaseTag} belongs to another source; review and increment ruRevision`);
  }
  const release = await api(`/repos/${FORK}/releases/tags/${tag}`, { allowNotFound: true });
  if (release && (!ref || release.draft || release.prerelease || !release.published_at ||
      release.tag_name !== metadata.releaseTag || !release.body?.includes(sourceMarker(metadata.fullSourceSha)))) {
    throw new Error(`Existing release ${metadata.releaseTag} is not a completed publication of this source; investigate without overwriting it`);
  }
  return { alreadyPublished: Boolean(release), ref, release };
}
