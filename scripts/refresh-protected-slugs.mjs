#!/usr/bin/env node
/**
 * Build scripts/protected-content-slugs.json from a GSC page export.
 *
 * Usage:
 *   node scripts/refresh-protected-slugs.mjs path/to/gsc-pages.json
 *   cat gsc.json | node scripts/refresh-protected-slugs.mjs --stdin
 *
 * Accepted input shapes:
 *   - MCP get_search_analytics: { rows: [{ keys: [url], clicks, impressions }] }
 *   - Flat array: [{ page|url, clicks, impressions }]
 *   - Our format (merge): { slugs: { slug: { collection, clicks, impressions } } }
 *
 * Filters: only URLs with clicks > 0 OR impressions >= 1 (configurable via --min-impressions).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(SCRIPT_DIR, 'protected-content-slugs.json');

const args = process.argv.slice(2);
const stdin = args.includes('--stdin');
const minImp = parseInt(args.find((a) => a.startsWith('--min-impressions='))?.split('=')[1] || '1', 10);
const fileArg = args.find((a) => !a.startsWith('--'));

function readInput() {
  if (stdin) return readFileSync(0, 'utf8');
  if (!fileArg) {
    console.error('Usage: node scripts/refresh-protected-slugs.mjs <gsc.json> | --stdin');
    process.exit(1);
  }
  return readFileSync(fileArg, 'utf8');
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (data.rows && Array.isArray(data.rows)) {
    return data.rows.map((r) => ({
      page: r.keys?.[0] || r.page || r.url,
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    }));
  }
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

function parseSlugFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const slug = parts[parts.length - 1];
    const collection = parts[parts.length - 2];
    return { slug, collection };
  } catch {
    return null;
  }
}

const raw = JSON.parse(readInput());
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { slugs: {} };
const slugs = { ...(existing.slugs || {}) };

let added = 0;
for (const row of normalizeRows(raw)) {
  const page = row.page || row.url || row.keys?.[0];
  if (!page) continue;
  const parsed = parseSlugFromUrl(page);
  if (!parsed) continue;
  const { slug, collection } = parsed;
  const clicks = Number(row.clicks) || 0;
  const impressions = Number(row.impressions) || 0;
  if (clicks <= 0 && impressions < minImp) continue;

  const prev = slugs[slug] || {};
  slugs[slug] = {
    collection: prev.collection || collection,
    clicks: Math.max(prev.clicks || 0, clicks),
    impressions: Math.max(prev.impressions || 0, impressions),
  };
  added += 1;
}

const out = {
  source: `GSC refresh ${new Date().toISOString().slice(0, 10)}`,
  rule: 'Never noindex — upgrade only',
  slugs,
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`[refresh-protected] wrote ${OUT} — ${Object.keys(slugs).length} slugs (${added} rows processed)`);
