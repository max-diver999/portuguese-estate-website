#!/usr/bin/env node
/**
 * Patch .vercel/output/config.json produced by @astrojs/vercel.
 *
 * The adapter does not carry `headers`, `rewrites` or `has` conditions from
 * vercel.json into the Build Output API config, so anything declared there never
 * reaches production. The agent surface needs three things that live exactly here:
 * the Link header, markdown content negotiation, and noindex on the renditions.
 *
 * Idempotent: it strips its own earlier injections, detected by signature, because
 * the Vercel schema rejects a custom marker property inside a route object.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, '.vercel/output/config.json');
const AI_CONFIG_PATH = path.join(ROOT, 'ai-visibility.config.json');

const aiCfg = JSON.parse(await fs.readFile(AI_CONFIG_PATH, 'utf8'));
const HOST = aiCfg.host;
const COLLECTIONS = (aiCfg.collections ?? []).map((c) => c.urlPrefix.replace(/^\//, ''));

/** Points agents at the machine-readable surface on every response. */
const LINK_HEADER =
  '</sitemap-index.xml>; rel="sitemap", </llms.txt>; rel="describedby"; type="text/markdown", ' +
  '</.well-known/agent.json>; rel="service-desc"; type="application/json", </robots.txt>; rel="policy"';

async function main() {
  let raw;
  try {
    raw = await fs.readFile(CONFIG_PATH, 'utf8');
  } catch (e) {
    console.error(`[patch-vercel] cannot read ${CONFIG_PATH}: ${e.message}`);
    process.exit(1);
  }
  const config = JSON.parse(raw);
  if (!Array.isArray(config.routes)) {
    console.error('[patch-vercel] config.routes is not an array');
    process.exit(1);
  }

  const mine = (r) =>
    Boolean(r.headers?.Link && r.headers.Link.includes('llms.txt')) ||
    (Array.isArray(r.has) && r.has.some((h) => h.key === 'accept' && String(h.value).includes('text/markdown'))) ||
    (r.src === '^/(.+)\\.md$' && r.headers?.['X-Robots-Tag']) ||
    (r.src === '^/$' && r.dest === '/index.md');
  config.routes = config.routes.filter((r) => !mine(r));

  const preFs = [
    { src: '^/(.*)$', headers: { Link: LINK_HEADER, Vary: 'Accept' }, continue: true },
    // A markdown rendition duplicates the HTML page, so it must never be indexed.
    // This has to sit before the filesystem handler: a request for a file that exists
    // stops there, and routes placed after it never run.
    {
      src: '^/(.+)\\.md$',
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
      continue: true,
    },
    // Markdown content negotiation. Only fires on an explicit Accept: text/markdown.
    { src: '^/$', has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }], dest: '/index.md' },
    ...COLLECTIONS.map((col) => ({
      src: `^/${col}/([^/]+)/$`,
      has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
      dest: `/${col}/$1.md`,
    })),
  ];

  const fsIdx = config.routes.findIndex((r) => r.handle === 'filesystem');
  if (fsIdx === -1) {
    console.error('[patch-vercel] filesystem handler not found in config.routes');
    process.exit(1);
  }
  config.routes.splice(fsIdx, 0, ...preFs);

  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  console.log(
    `[patch-vercel] ${HOST}: injected ${preFs.length} pre-filesystem route(s) ` +
      `(collections: ${COLLECTIONS.join(', ') || 'none'})`,
  );
}

main().catch((err) => {
  console.error('[patch-vercel] ERROR:', err);
  process.exit(1);
});
