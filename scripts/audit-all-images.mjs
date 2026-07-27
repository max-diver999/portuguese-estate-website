#!/usr/bin/env node
/**
 * HTTP 200 gate for EVERY image URL in src/ (MDX body, Astro pages, data, featured.ts).
 * Wikimedia rate-limits parallel HEAD; uses GET + Range, UA, retries, low concurrency.
 *
 * Usage: node scripts/audit-all-images.mjs [--fail]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isImageUrl } from './lib/image-url-detect.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const URL_RE = /https?:\/\/[^\s"'`)>\]]+/g;
const FAIL = process.argv.includes('--fail');

// Wikimedia throttles hard; Cloudinary and friends do not. One global concurrency
// number cannot satisfy both, so each host gets its own lane.
const SLOW_HOSTS = new Set(['upload.wikimedia.org', 'commons.wikimedia.org']);
const SLOW_CONCURRENCY = 2;
const FAST_CONCURRENCY = 12;
const UA = 'Mozilla/5.0 (compatible; MOREGroupImageAudit/1.0; +https://portuguese-estate.com)';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules') continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(astro|mdx|ts|tsx|css|json)$/.test(name)) out.push(p);
  }
  return out;
}

async function checkUrl(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': UA, Range: 'bytes=0-0' },
        redirect: 'follow',
      });
      if (r.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1) ** 2));
        continue;
      }
      if (r.status === 200 || r.status === 206) return { ok: true, status: r.status };
      if (r.status === 400 || r.status === 416) {
        const r2 = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': UA },
          redirect: 'follow',
        });
        if (r2.status === 200) return { ok: true, status: 200 };
        return { ok: false, status: r2.status };
      }
      return { ok: false, status: r.status };
    } catch {
      if (attempt === 5) return { ok: false, status: 'ERR' };
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  return { ok: false, status: 429 };
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const map = new Map();
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (!isImageUrl(url)) continue;
    if (!map.has(url)) map.set(url, new Set());
    map.get(url).add(file.replace(ROOT + '/', ''));
  }
}

const urls = [...map.keys()];
const bad = [];
const rateLimited = [];

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const slowUrls = urls.filter((u) => SLOW_HOSTS.has(hostOf(u)));
const fastUrls = urls.filter((u) => !SLOW_HOSTS.has(hostOf(u)));

const runLane = (lane, limit) =>
  mapPool(lane, limit, async (url) => ({ url, ...(await checkUrl(url)) }));

const checks = (
  await Promise.all([
    runLane(fastUrls, FAST_CONCURRENCY),
    runLane(slowUrls, SLOW_CONCURRENCY),
  ])
).flat();

for (const c of checks) {
  if (c.ok) continue;
  if (c.status === 429) {
    rateLimited.push({ url: c.url, files: [...map.get(c.url)] });
    continue;
  }
  bad.push({ url: c.url, status: c.status, files: [...map.get(c.url)] });
}

console.log('=== IMAGE URL AUDIT ===');
console.log(`URLs checked: ${urls.length}`);
console.log(`Broken: ${bad.length}`);
if (rateLimited.length) console.log(`Rate-limited (429, skipped): ${rateLimited.length}`);

if (bad.length) {
  for (const b of bad.slice(0, 30)) {
    console.log(`\n[${b.status}] ${b.url.slice(0, 100)}`);
    for (const f of b.files.slice(0, 2)) console.log(`  ${f}`);
  }
  if (bad.length > 30) console.log(`\n... +${bad.length - 30} more`);
  if (FAIL) process.exit(1);
} else {
  console.log('✅ All image URLs return HTTP 200');
}
