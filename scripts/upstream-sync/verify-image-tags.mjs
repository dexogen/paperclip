import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMetadata } from './build-metadata.mjs';

// GitHub Release creation and a registry push cannot be one transaction. Check
// the registry too, so a retry after a partial publication cannot replace a digest.
export async function verifyUnusedImageTags(metadata, { token = process.env.GH_TOKEN,
  actor = process.env.GITHUB_ACTOR, fetchImpl = fetch } = {}) {
  if (!token || !actor) throw new Error('Registry read credentials are required');
  const auth = await fetchImpl('https://ghcr.io/token?service=ghcr.io&scope=repository%3Adexogen%2Fpaperclip%3Apull', {
    headers: { Authorization: `Basic ${Buffer.from(`${actor}:${token}`).toString('base64')}` },
  });
  if (!auth.ok) throw new Error(`Cannot obtain registry read access: HTTP ${auth.status}`);
  const credentials = await auth.json();
  const bearer = credentials.token ?? credentials.access_token;
  if (typeof bearer !== 'string' || !bearer) throw new Error('Registry did not return a read token');
  for (const tag of [`ru-${metadata.fullSourceSha}`, metadata.imageTag]) {
    const response = await fetchImpl(`https://ghcr.io/v2/dexogen/paperclip/manifests/${encodeURIComponent(tag)}`, {
      method: 'HEAD', headers: { Authorization: `Bearer ${bearer}`,
        Accept: 'application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json' },
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Cannot verify image tag ${tag}: HTTP ${response.status}`);
    const digest = response.headers.get('docker-content-digest');
    throw new Error(`Immutable image tag ${tag} already exists${/^sha256:[a-f0-9]{64}$/.test(digest ?? '') ? ` at ${digest}` : ''}. Recover the existing image publication; do not rebuild or overwrite it`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await verifyUnusedImageTags(buildMetadata(process.cwd(), process.env.SOURCE_SHA)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
