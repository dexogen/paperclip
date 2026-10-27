import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { git } from './git.mjs';
import { buildIdentity, fetchReleaseCommit, nearestStableAncestor, releaseIdentity, resolveSource, selectSource, validateSource, verifyAcceptedSource } from './source.mjs';
import { buildMetadata } from './build-metadata.mjs';
import { inspectPublication, publishRelease, reservePublication, validateImageManifest } from './publish-release.mjs';
import { verifyUnusedImageTags } from './verify-image-tags.mjs';

const a = 'a'.repeat(40), b = 'b'.repeat(40), c = 'c'.repeat(40);
const master = (upstreamSha, baseSha = upstreamSha) => ({ channel: 'master', upstreamSha, baseTag: 'v2026.1023.0', baseSha });
const stable = { channel: 'stable', upstreamSha: b, tag: 'v2026.1023.0', releaseId: 42, ruRevision: 1 };
const released = { id: 42, tag_name: stable.tag, draft: false, prerelease: false, published_at: '2026-10-23T00:00:00Z', target_commitish: 'master' };

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'paperclip-source-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  git(cwd, ['init', '-q', '--initial-branch=russian']);
  git(cwd, ['config', 'user.name', 'Test']); git(cwd, ['config', 'user.email', 'test@example.invalid']);
  writeFileSync(join(cwd, 'app.txt'), 'original');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'Original']);
  const original = git(cwd, ['rev-parse', 'HEAD']).stdout;
  writeFileSync(join(cwd, 'app.txt'), 'next');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-qm', 'Next']);
  return { cwd, original, next: git(cwd, ['rev-parse', 'HEAD']).stdout };
}

test('stable selection waits for an older release, advances descendants, and rejects divergence', () => {
  const state = { acceptedSource: master(a) };
  assert.equal(selectSource({ state, source: stable, ancestor: (_, from) => from === b }).status, 'waiting_for_next_release');
  assert.equal(selectSource({ state, source: stable, ancestor: (_, from) => from === a }).status, 'ready');
  assert.throws(() => selectSource({ state, source: stable, ancestor: () => false }), /history diverged/);
  assert.throws(() => selectSource({ state, source: master(b), ancestor: (_, from) => from === b }), /history diverged/);
});

test('a real release can promote the same master SHA; existing stable revision is preserved', () => {
  const state = { acceptedSource: master(b) };
  assert.equal(selectSource({ state, source: stable }).status, 'ready');
  const accepted = { ...stable, ruRevision: 3 };
  assert.deepEqual(selectSource({ state: { acceptedSource: accepted }, source: stable }), { status: 'unchanged', source: accepted });
  for (const change of [{ upstreamSha: a }, { releaseId: 43 }]) {
    assert.throws(() => selectSource({ state: { acceptedSource: stable }, source: { ...stable, ...change } }), /release identity changed/);
  }
});

test('release metadata rejects drafts, prereleases, missing publication and invalid tags', () => {
  assert.deepEqual(releaseIdentity(released), { tag: stable.tag, releaseId: 42 });
  for (const change of [{ draft: true }, { prerelease: true }, { published_at: null }, { tag_name: 'master' },
    { tag_name: 'v2026.1023.0-rc.1' }, { id: 0 }]) assert.throws(() => releaseIdentity({ ...released, ...change }), /published, non-prerelease/);
  for (const ruRevision of [0, -1, 1.5, '1']) assert.throws(() => validateSource({ ...stable, ruRevision }), /positive RU revision/);
});

test('resolver fetches exact lightweight and annotated tags instead of target_commitish', async (t) => {
  const f = fixture(t);
  for (const annotated of [false, true]) {
    const tag = annotated ? 'v2026.1024.0' : stable.tag;
    git(f.cwd, annotated ? ['tag', '-a', tag, f.next, '-m', 'Release'] : ['tag', tag, f.next]);
    const calls = [];
    const runGit = (cwd, args) => {
      calls.push(args);
      return git(cwd, args[0] === 'fetch' ? ['fetch', '--no-tags', f.cwd, args.at(-1)] : args);
    };
    const result = await resolveSource({ cwd: f.cwd, state: { acceptedSource: master(f.original) },
      channel: 'stable', api: async (path) => {
        assert.equal(path, '/repos/paperclipai/paperclip/releases/latest');
        return { ...released, tag_name: tag, target_commitish: f.original };
      }, runGit });
    assert.equal(result.status, 'ready'); assert.equal(result.source.upstreamSha, f.next);
    assert.equal(calls[0].at(-1), `refs/tags/${tag}`);
    assert.deepEqual(calls[1], ['rev-parse', 'FETCH_HEAD^{commit}']);
  }
  assert.throws(() => fetchReleaseCommit(f.cwd, 'refs/heads/master'), /Invalid upstream release tag/);
});

test('publication validates the accepted tag again and fails when it moved', async (t) => {
  const f = fixture(t);
  git(f.cwd, ['tag', stable.tag, f.original]);
  const state = { acceptedSource: { ...stable, upstreamSha: f.next } };
  const runGit = (cwd, args) => git(cwd, args[0] === 'fetch' ? ['fetch', '--no-tags', f.cwd, args.at(-1)] : args);
  await assert.rejects(verifyAcceptedSource({ cwd: f.cwd, state, forkSha: f.next, api: async () => released, runGit }), /no longer matches/);
  state.acceptedSource.upstreamSha = f.original;
  assert.equal((await verifyAcceptedSource({ cwd: f.cwd, state, forkSha: f.next, api: async () => released, runGit })).upstreamSha, f.original);
});

test('version and image names distinguish upstream stable releases from master integrations', () => {
  assert.deepEqual(buildIdentity(stable, c), { version: '2026.1023.0+ru.1', imageTag: '2026.1023.0-ru.1', releaseTag: 'v2026.1023.0-ru.1' });
  assert.deepEqual(buildIdentity(master(b), c), {
    version: '2026.1023.0+master.bbbbbbbbbbbb.ru.cccccccccccc', imageTag: '2026.1023.0-master.bbbbbbbbbbbb.ru.cccccccccccc', releaseTag: '',
  });
});

test('master version base is the nearest stable ancestor from upstream refs, including annotated tags', (t) => {
  const f = fixture(t);
  git(f.cwd, ['tag', 'v9999.1.0', f.next]); // A fork-only tag must not affect the version.
  const listing = `${f.original}\trefs/tags/v2026.1005.0\n${a}\trefs/tags/v2026.1023.0\n` +
    `${f.next}\trefs/tags/v2026.1023.0^{}\n${f.next}\trefs/tags/v2026.1024.0-rc.1\n`;
  const runGit = (cwd, args, options) => args[0] === 'ls-remote' ? { stdout: listing, status: 0 } : git(cwd, args, options);
  assert.deepEqual(nearestStableAncestor(f.cwd, f.next, runGit), { baseTag: 'v2026.1023.0', baseSha: f.next });
  assert.throws(() => nearestStableAncestor(f.cwd, f.next, (cwd, args, options) => args[0] === 'ls-remote'
    ? { stdout: `${b}\trefs/tags/v2026.1023.0`, status: 0 } : git(cwd, args, options)), /No stable upstream tag/);
  assert.throws(() => nearestStableAncestor(f.cwd, f.next, () => ({ stdout: 'true', status: 0 })), /complete upstream history/);
});

test('master publication rejects a moved base tag even though its accepted source remains in history', async (t) => {
  const f = fixture(t);
  git(f.cwd, ['tag', 'v2026.1023.0', f.next]);
  const state = { acceptedSource: master(f.next, f.original) };
  const runGit = (cwd, args, options) => git(cwd, args[0] === 'fetch' ? ['fetch', '--no-tags', f.cwd, args.at(-1)] : args, options);
  await assert.rejects(verifyAcceptedSource({ cwd: f.cwd, state, forkSha: f.next, runGit }), /base no longer matches/);
});

test('metadata CLI binds HEAD and committed state while permitting a generated lock', (t) => {
  const f = fixture(t);
  const state = { schemaVersion: 2, upstreamRepository: 'paperclipai/paperclip', upstreamBranch: 'master',
    forkBranch: 'russian', syncBranch: 'codex/upstream-sync', trackingChannel: 'stable', lastAcceptedUpstreamSha: f.next,
    acceptedSource: master(f.next) };
  mkdirSync(join(f.cwd, 'doc/localization'), { recursive: true });
  writeFileSync(join(f.cwd, 'doc/localization/upstream.json'), JSON.stringify(state));
  git(f.cwd, ['add', '.']); git(f.cwd, ['commit', '-qm', 'Tracking']);
  const sha = git(f.cwd, ['rev-parse', 'HEAD']).stdout;
  writeFileSync(join(f.cwd, 'pnpm-lock.yaml'), 'generated tested lock');
  writeFileSync(join(f.cwd, 'doc/localization/upstream.json'), '{}');
  const metadata = JSON.parse(execFileSync(process.execPath, [resolve(import.meta.dirname, 'build-metadata.mjs'), sha], { cwd: f.cwd, encoding: 'utf8' }));
  assert.equal(metadata.fullSourceSha, sha); assert.equal(metadata.channel, 'master');
  assert.equal(metadata.upstreamSha, f.next); assert.equal(metadata.upstreamTag, null);
  assert.equal(metadata.upstreamBaseTag, 'v2026.1023.0'); assert.equal(metadata.upstreamBaseSha, f.next);
  assert.equal(metadata.buildVersion, `2026.1023.0+master.${f.next.slice(0, 12)}.ru.${sha.slice(0, 12)}`);
  assert.throws(() => buildMetadata(f.cwd, f.next), /Checkout does not match/);
});

function publication() {
  const metadata = { fullSourceSha: c, buildVersion: '2026.1023.0+ru.1', channel: 'stable', upstreamSha: b,
    upstreamTag: stable.tag, upstreamReleaseId: 42, ruRevision: 1, sourceTree: a,
    imageTag: '2026.1023.0-ru.1', releaseTag: 'v2026.1023.0-ru.1' };
  const manifest = { forkSha: c, upstreamSha: b, version: metadata.buildVersion, channel: 'stable',
    upstreamTag: stable.tag, upstreamReleaseId: 42, ruRevision: 1, releaseTag: metadata.releaseTag, sourceTree: a,
    verificationRun: '123', lockSha256: 'd'.repeat(64), translationSha256: 'e'.repeat(64),
    image: `ghcr.io/dexogen/paperclip@sha256:${'f'.repeat(64)}`, tag: `ghcr.io/dexogen/paperclip:ru-${c}`,
    versionTag: `ghcr.io/dexogen/paperclip:${metadata.imageTag}` };
  return { metadata, manifest, verificationRun: 123 };
}

test('a stable release binds the immutable tag, complete provenance and successful CI', async () => {
  const f = publication();
  const calls = [];
  const api = async (path, options) => { calls.push({ path, options }); return options?.method === 'POST' ? options.body : null; };
  const release = await publishRelease({ ...f, api });
  const writes = calls.filter(({ options }) => options?.method === 'POST');
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].options.body, { ref: `refs/tags/${f.metadata.releaseTag}`, sha: c });
  assert.equal(release.prerelease, false); assert.equal(release.target_commitish, c);
  assert.ok(release.body.includes(f.manifest.image)); assert.ok(release.body.includes('actions/runs/123'));
  assert.ok(release.body.includes(`<!-- paperclip-ru-source:${c} -->`));
  for (const field of ['forkSha', 'upstreamSha', 'upstreamTag', 'upstreamReleaseId', 'sourceTree', 'lockSha256', 'verificationRun', 'image']) {
    assert.throws(() => validateImageManifest({ ...f.manifest, [field]: 'wrong' }, f.metadata, 123), /mismatch|Invalid/);
  }
});

test('published releases are idempotent and immutable collisions fail before any write', async () => {
  const f = publication();
  const ref = { object: { type: 'commit', sha: c } };
  const release = { tag_name: f.metadata.releaseTag, draft: false, prerelease: false, published_at: 'now', body: `<!-- paperclip-ru-source:${c} -->` };
  const api = async (path, options) => {
    assert.equal(options?.method, undefined, 'an existing publication must not be changed');
    return path.includes('/git/ref/') ? ref : release;
  };
  assert.equal((await inspectPublication(f.metadata, api)).alreadyPublished, true);
  assert.equal(await publishRelease({ ...f, api }), release);
  await assert.rejects(inspectPublication(f.metadata, async () => ({ object: { type: 'commit', sha: a } })), /Immutable release tag/);
  await assert.rejects(inspectPublication(f.metadata, async (path) => path.includes('/git/ref/') ? ref : { ...release, draft: true }), /not a completed publication/);
  assert.deepEqual(await inspectPublication({ ...f.metadata, channel: 'master' }, async () => assert.fail('no release API for master')), { alreadyPublished: false });
  await assert.rejects(publishRelease({ ...f, metadata: { ...f.metadata, channel: 'master' }, api }), /do not create stable releases/);
});

test('reserving a stable version before image push prevents reuse after an interrupted build', async () => {
  const f = publication();
  let ref = null;
  const api = async (path, options) => {
    if (options?.method === 'POST') {
      assert.equal(path, '/repos/dexogen/paperclip/git/refs');
      assert.equal(ref, null, 'an existing tag must never be rewritten');
      ref = { object: { type: 'commit', sha: options.body.sha } };
      return ref;
    }
    return path.includes('/git/ref/') ? ref : null;
  };
  await reservePublication(f.metadata, api);
  assert.equal((await reservePublication(f.metadata, api)).alreadyPublished, false, 'the same verified source can resume');
  await assert.rejects(reservePublication({ ...f.metadata, fullSourceSha: a }, api), /Immutable release tag/);
});

test('registry guard accepts only absent tags and preserves partially published images', async () => {
  const f = publication();
  const makeFetch = (status, existingIndex = 0) => {
    let heads = 0;
    return async (url, options) => {
      if (url.startsWith('https://ghcr.io/token?')) return new Response(JSON.stringify({ token: 'test-bearer' }), { status: 200 });
      assert.equal(options.method, 'HEAD');
      assert.equal(options.headers.Authorization, 'Bearer test-bearer');
      assert.ok(url.startsWith('https://ghcr.io/v2/dexogen/paperclip/manifests/'));
      return new Response(null, { status: heads++ === existingIndex ? status : 404,
        headers: { 'docker-content-digest': `sha256:${'f'.repeat(64)}` } });
    };
  };
  const credentials = { token: 'test-token', actor: 'test-actor' };
  await verifyUnusedImageTags(f.metadata, { ...credentials, fetchImpl: makeFetch(404) });
  for (const existingIndex of [0, 1]) await assert.rejects(verifyUnusedImageTags(f.metadata,
    { ...credentials, fetchImpl: makeFetch(200, existingIndex) }), /already exists.*Recover the existing image/);
  for (const status of [401, 403, 429, 500]) await assert.rejects(verifyUnusedImageTags(f.metadata,
    { ...credentials, fetchImpl: makeFetch(status) }), /Cannot verify image tag/);
  await assert.rejects(verifyUnusedImageTags(f.metadata, { ...credentials,
    fetchImpl: async () => new Response(null, { status: 401 }) }), /Cannot obtain registry read access/);
  await assert.rejects(verifyUnusedImageTags(f.metadata, { ...credentials,
    fetchImpl: async () => { throw new Error('network unavailable'); } }), /network unavailable/);
});
