#!/usr/bin/env node
/**
 * Post-deploy smoke test for portuguese-estate.com
 * Usage: node scripts/post-deploy-smoke.mjs [--http-only]
 *        SITE_URL=https://invest-spain-property.com node scripts/post-deploy-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTTP_ONLY = process.argv.includes('--http-only');

const SMOKE_UA = 'MORE-Group-smoke/1.0';

/** Cloudflare blocks empty User-Agent (Python urllib); always send one. */
async function siteFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('User-Agent')) headers.set('User-Agent', SMOKE_UA);
  return fetch(url, { ...options, headers });
}

function readSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const siteFile = path.join(ROOT, 'src/data/site.ts');
  const match = fs.readFileSync(siteFile, 'utf8').match(/url:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error(`Could not read site URL from ${siteFile}`);
  return match[1].replace(/\/$/, '');
}

function firstSlug(contentDir) {
  const dir = path.join(ROOT, 'src/content', contentDir);
  if (!fs.existsSync(dir)) return null;
  const file = fs.readdirSync(dir).filter((n) => n.endsWith('.mdx')).sort()[0];
  return file ? file.replace(/\.mdx$/, '') : null;
}

function buildPaths() {
  const paths = ['/', '/guides/', '/compare/', '/get-shortlist/', '/contact/'];
  const guide = firstSlug('guides');
  const compare = firstSlug('compare');
  if (guide) paths.push(`/guides/${guide}/`);
  if (compare) paths.push(`/compare/${compare}/`);
  return paths;
}

function log(ok, label, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`);
}

async function runHttpChecks(site) {
  console.log('\n[http] Production HTTP checks');
  let failed = 0;

  const sitemap = await siteFetch(`${site}/sitemap-index.xml`);
  log(sitemap.ok, 'sitemap-index.xml', String(sitemap.status));
  if (!sitemap.ok) failed++;

  for (const p of buildPaths()) {
    const res = await siteFetch(`${site}${p}`);
    log(res.ok, p, String(res.status));
    if (!res.ok) failed++;
  }

  const lead = await siteFetch(`${site}/api/lead/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'healthcheck',
      contact: 'healthcheck@bot',
      source: 'healthcheck',
    }),
  });
  log(lead.ok || lead.status === 500, 'POST /api/lead/', String(lead.status));
  if (lead.status === 405) {
    log(false, 'lead API prerender', '405 — add export const prerender = false');
    failed++;
  }

  return failed;
}

const site = readSiteUrl();
console.log(`Site: ${site}`);
const failed = await runHttpChecks(site);
if (HTTP_ONLY) {
  process.exit(failed > 0 ? 1 : 0);
}
process.exit(failed > 0 ? 1 : 0);
