import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSha } from './git.mjs';
import { request, FORK } from './run.mjs';
import { buildMetadata } from './build-metadata.mjs';

const sourceMarker = (sha) => `<!-- paperclip-ru-source:${assertSha(sha)} -->`;

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

export async function reservePublication(metadata, api = request) {
  if (metadata.channel !== 'stable') throw new Error('Only stable sources reserve release tags');
  const existing = await inspectPublication(metadata, api);
  if (!existing.ref) await api(`/repos/${FORK}/git/refs`, { method: 'POST', body: {
    ref: `refs/tags/${metadata.releaseTag}`, sha: metadata.fullSourceSha,
  } });
  return existing;
}

export function validateImageManifest(manifest, metadata, verificationRun) {
  for (const [key, expected] of Object.entries({ forkSha: metadata.fullSourceSha,
    upstreamSha: metadata.upstreamSha, version: metadata.buildVersion, channel: metadata.channel,
    upstreamTag: metadata.upstreamTag, upstreamReleaseId: metadata.upstreamReleaseId, ruRevision: metadata.ruRevision,
    sourceTree: metadata.sourceTree,
    releaseTag: metadata.releaseTag, verificationRun: String(verificationRun) })) {
    if (manifest[key] !== expected) throw new Error(`Image provenance mismatch: ${key}`);
  }
  assertSha(manifest.sourceTree, 'image source tree');
  for (const key of ['lockSha256', 'translationSha256']) {
    if (!/^[a-f0-9]{64}$/.test(manifest[key] ?? '')) throw new Error(`Invalid image ${key}`);
  }
  if (!/^ghcr\.io\/dexogen\/paperclip@sha256:[a-f0-9]{64}$/.test(manifest.image ?? '') ||
      manifest.tag !== `ghcr.io/${FORK}:ru-${metadata.fullSourceSha}` ||
      manifest.versionTag !== `ghcr.io/${FORK}:${metadata.imageTag}`) throw new Error('Invalid immutable image identity');
  return manifest;
}

export async function publishRelease({ metadata, manifest, verificationRun, api = request }) {
  if (metadata.channel !== 'stable') throw new Error('Master integration images do not create stable releases');
  validateImageManifest(manifest, metadata, verificationRun);
  const existing = await reservePublication(metadata, api);
  if (existing.alreadyPublished) return existing.release;
  // Never PATCH refs or releases. A collision fails rather than moving a tag.
  return api(`/repos/${FORK}/releases`, { method: 'POST', body: {
    tag_name: metadata.releaseTag, target_commitish: metadata.fullSourceSha,
    name: `Paperclip RU ${metadata.buildVersion}`, draft: false, prerelease: false, make_latest: 'true',
    body: `${sourceMarker(metadata.fullSourceSha)}\nRussian edition of [upstream ${metadata.upstreamTag}](https://github.com/paperclipai/paperclip/releases/tag/${metadata.upstreamTag}).\n\n` +
      `Source: [${metadata.fullSourceSha}](https://github.com/${FORK}/commit/${metadata.fullSourceSha}). ` +
      `[Successful source verification](https://github.com/${FORK}/actions/runs/${verificationRun}).\n\n` +
      `Image: \`${manifest.image}\`. No npm package or deployment is published by this workflow.\n\n` +
      `### Source and image provenance\n\n\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n`,
  } });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Recheck current accepted source and latest green CI after the potentially
    // long image build, before making a release visible.
    const { verifyBuild } = await import('./verify-build.mjs');
    const verified = await verifyBuild();
    const metadata = buildMetadata(process.cwd(), verified.sha);
    if (process.argv[2] === '--reserve') {
      await reservePublication(metadata);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `Reserved immutable source tag ${metadata.releaseTag} before the image build.\n`);
    } else {
      const manifest = JSON.parse(readFileSync(process.argv[2] || 'image-manifest.json', 'utf8'));
      const release = await publishRelease({ metadata, manifest, verificationRun: verified.verificationRun });
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `Published [${metadata.buildVersion}](${release.html_url}) from the verified source. No deployment was performed.\n`);
    }
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
