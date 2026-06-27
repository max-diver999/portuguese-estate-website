#!/usr/bin/env node
/** Priority re-index: wave articles → updated hubs → full sitemap (max 200 Google/day). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = 'https://portuguese-estate.com';
const MAX = Number(process.env.INDEXING_MAX || 200);

const wave = [
  'guides/portugal-property-deposit-guide-cpcv',
  'guides/property-maintenance-costs-portugal',
  'guides/non-resident-rental-income-tax-portugal',
  'guides/prenuptial-agreement-portugal-property',
  'guides/portugal-property-inheritance-tax-foreigners',
  'guides/portugal-mortgage-rates-foreigners-2026',
  'guides/portugal-buying-costs-calculator-examples',
  'guides/complete-before-september-2026-imt-guide',
  'compare/portugal-vs-dubai-property-investment',
  'compare/portugal-vs-uk-property-investment',
  'compare/portugal-vs-cyprus-property-investment',
  'compare/portugal-vs-malta-property-investment',
  'compare/portugal-vs-turkey-property-investment',
  'segments/indian-buyers-portugal-property',
  'segments/uae-buyers-portugal-property',
  'segments/israeli-buyers-portugal-property',
  'segments/south-african-buyers-portugal-property',
  'segments/australian-buyers-portugal-property',
  'segments/canadian-buyers-portugal-property',
];

const hubs = [
  'guides/buy-property-portugal-foreigner',
  'guides/portugal-property-investment-guide',
  'compare/porto-vs-lisbon-property-investment',
  'compare/portugal-vs-france-property-investment',
  'guides/how-to-buy-property-portugal-step-by-step',
  'guides/imt-tax-non-resident-portugal-2026',
  'guides/algarve-property-investment-guide',
  '',
  'guides/',
  'compare/',
  'segments/',
  'areas/',
  'get-shortlist/',
];

const sitemapPath = join(ROOT, 'dist/client/sitemap-0.xml');
let sitemapUrls = [];
try {
  const xml = readFileSync(sitemapPath, 'utf8');
  sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} catch {
  console.error('Run npm run build first to generate dist/client/sitemap-0.xml');
  process.exit(1);
}

const toUrl = (p) => {
  if (p === '') return `${BASE}/`;
  if (p.startsWith('http')) return p.endsWith('/') ? p : `${p}/`;
  const clean = p.replace(/^\//, '').replace(/\/$/, '');
  return `${BASE}/${clean}/`;
};

const ordered = [];
const seen = new Set();
const push = (p) => {
  const url = typeof p === 'string' && p.startsWith('http') ? toUrl(p) : toUrl(p);
  const key = url.replace(/\/$/, '').toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  ordered.push(url);
};

for (const p of wave) push(p);
for (const p of hubs) push(p);
for (const u of sitemapUrls) push(u);

while (ordered.length > MAX) ordered.pop();

console.log(`Indexing batch: ${ordered.length} URLs (max ${MAX})`);
console.log(`  Wave articles: ${wave.length}`);
console.log(`  First 5: ${ordered.slice(0, 5).join(', ')}`);

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

for (const part of chunk(ordered, 50)) {
  const r = spawnSync('node', [join(__dirname, 'submit-google-explicit.mjs'), ...part], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const part of chunk(ordered, 50)) {
  const r = spawnSync('node', [join(__dirname, 'indexnow-submit.mjs'), '--explicit', ...part], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(`Done. Submitted ${ordered.length} URLs to Google + Bing.`);
