#!/usr/bin/env node
/**
 * Live verification of the agent surface. A build that succeeded proves nothing:
 * the Vercel adapter drops routes and headers, so every claim here is a request to
 * the deployed origin.
 *
 * Usage: node scripts/ai-visibility/verify-live.mjs [--url https://example.com]
 */
import { loadConfig } from './lib.mjs';

const cfg = loadConfig();
const argUrl = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
const BASE = (argUrl || cfg.siteUrl).replace(/\/$/, '');
const UA = 'OperStack-AI-Visibility-Verify/1.0';

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

async function main() {
  const robots = await get(`${BASE}/robots.txt`);
  record(
    'robots.txt carries Content-Signal',
    robots.status === 200 && /content-signal:/i.test(robots.body),
    (robots.body.match(/Content-Signal:.*/i) || [`HTTP ${robots.status}`])[0],
  );

  const home = await get(`${BASE}/`);
  record(
    'Link header points at the agent surface',
    /text\/markdown/i.test(home.headers.get('link') || ''),
    home.headers.get('link') || 'no Link header',
  );
  record(
    'homepage HTML carries dateModified',
    /"dateModified"\s*:/.test(home.body),
    (home.body.match(/"dateModified"\s*:\s*"[^"]*"/) || ['absent'])[0],
  );

  const indexMd = await get(`${BASE}/index.md`);
  record('/index.md answers 200', indexMd.status === 200, `HTTP ${indexMd.status}`);

  const negotiated = await get(`${BASE}/`, { Accept: 'text/markdown' });
  record(
    'Accept: text/markdown returns markdown',
    /markdown|text\/plain/i.test(negotiated.headers.get('content-type') || '') &&
      negotiated.body.trimStart().startsWith('#'),
    negotiated.headers.get('content-type') || 'no content-type',
  );

  const card = await get(`${BASE}/.well-known/agent.json`);
  let cardOk = false;
  let cardDetail = `HTTP ${card.status}`;
  if (card.status === 200) {
    try {
      const parsed = JSON.parse(card.body);
      cardOk = Boolean(parsed.name && parsed.url);
      cardDetail = `valid JSON, name "${parsed.name}"`;
    } catch (e) {
      cardDetail = `HTTP 200 but invalid JSON: ${e.message}`;
    }
  }
  record('/.well-known/agent.json answers 200 with valid JSON', cardOk, cardDetail);

  for (const file of ['llms.txt', 'llms-full.txt']) {
    const r = await get(`${BASE}/${file}`);
    record(`/${file} answers 200`, r.status === 200, `HTTP ${r.status}, ${r.body.length} bytes`);
  }

  const col = cfg.collections?.[0];
  if (col) {
    const idx = await get(`${BASE}/index.md`);
    const sample = (idx.body.match(new RegExp(`${BASE.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}${col.urlPrefix}/[^)\\s]+\\.md`)) || [])[0];
    if (sample) {
      const page = await get(sample);
      record(
        'a page markdown rendition answers 200',
        page.status === 200 && page.body.startsWith('#'),
        `${sample} → HTTP ${page.status}`,
      );
      record(
        'markdown renditions are noindex',
        /noindex/i.test(page.headers.get('x-robots-tag') || ''),
        page.headers.get('x-robots-tag') || 'no X-Robots-Tag',
      );
    }
  }

  const width = Math.max(...results.map((r) => r.name.length));
  console.log(`\nAgent surface on ${BASE}\n`);
  for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.detail}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} checks pass.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('[verify-live] ERROR:', err);
  process.exit(1);
});
