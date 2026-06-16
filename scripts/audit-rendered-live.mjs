#!/usr/bin/env node
/**
 * Rendered-page audit — LIVE or local dist HTML (layout + MDX combined).
 * Auto-discovers collections from src/content/*.mdx
 *
 * Usage:
 *   node scripts/audit-rendered-live.mjs [--local] [--fail] [--collection=guides]
 *   SITE_URL=https://example.com node scripts/audit-rendered-live.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const useLocal = process.argv.includes('--local');
const failOnIssues = process.argv.includes('--fail');
const collectionFilter = process.argv.find((a) => a.startsWith('--collection='))?.split('=')[1];
const CONCURRENCY = 24;

function readSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  for (const rel of ['src/data/site.ts', 'src/data/site.js']) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/url:\s*['"]([^'"]+)['"]/);
    if (m) return m[1].replace(/\/$/, '');
  }
  throw new Error('SITE_URL env or src/data/site.ts url required');
}

const SITE_URL = readSiteUrl();
const siteConfig = { skipCollections: [], requireLeadForm: true };

function discoverCollections() {
  const contentRoot = path.join(ROOT, 'src/content');
  if (!fs.existsSync(contentRoot)) return [];
  return fs
    .readdirSync(contentRoot)
    .filter((name) => {
      if (siteConfig.skipCollections.includes(name)) return false;
      const p = path.join(contentRoot, name);
      return fs.statSync(p).isDirectory() && fs.readdirSync(p).some((f) => f.endsWith('.mdx'));
    })
    .map((name) => ({ name }));
}

/** @type {{ id: string, test: (html: string) => string | null, severity: 'P0' | 'P1' }[]} */
const CHECKS = [
  {
    id: 'lead-form-top',
    severity: 'P0',
    test: (html) =>
      html.includes('id="lead-form-top"') || html.includes("id='lead-form-top'")
        ? 'compact top lead form still present'
        : null,
  },
  {
    id: 'multi-lead-form',
    severity: 'P0',
    test: (html) => {
      const n = (html.match(/id="lead-form"/g) || []).length;
      if (n > 1) return `${n} elements with id="lead-form" (expected 1)`;
      if (n === 0 && siteConfig.requireLeadForm) return 'no #lead-form on page';
      return null;
    },
  },
  {
    id: 'multi-lead-section',
    severity: 'P0',
    test: (html) => {
      const n = (html.match(/lead-form-section/g) || []).length;
      return n > 1 ? `${n} lead-form-section blocks (expected 1)` : null;
    },
  },
  {
    id: 'related-guide-placeholder',
    severity: 'P0',
    test: (html) => (/Related guide [1-9]/i.test(html) ? 'placeholder "Related guide N" link text' : null),
  },
  {
    id: 'more-guides-boilerplate',
    severity: 'P1',
    test: (html) =>
      /More guides for .{20,120}<\/h[23]>/i.test(html) ? 'boilerplate "More guides for …" heading' : null,
  },
  {
    id: 'internal-corpus-leak',
    severity: 'P0',
    test: (html) => {
      if (/lotsof feed|location\.beach\s*=|pipeline median|Programmatic listing pages/i.test(html)) {
        return 'internal DB/corpus jargon in rendered HTML';
      }
      return null;
    },
  },
  {
    id: 'draft-marker',
    severity: 'P0',
    test: (html) => {
      if (/(\[VERIFY(?:\]|:)|\*\*VERIFY:\*\*|KB §)/.test(html)) {
        return 'draft/verify marker in HTML';
      }
      if (/\bsource needed\b/i.test(html)) return 'draft/verify marker in HTML';
      return null;
    },
  },
  {
    id: 'duplicate-additional-notes',
    severity: 'P1',
    test: (html) => {
      const n = (html.match(/Additional notes/gi) || []).length;
      return n >= 2 ? `"Additional notes" appears ${n} times` : null;
    },
  },
  {
    id: 'extra-context-boilerplate',
    severity: 'P1',
    test: (html) => {
      const n = (html.match(/extra context \d+/gi) || []).length;
      return n >= 1 ? `SEO padding "extra context N" (${n}×)` : null;
    },
  },
  {
    id: 'holding-exit-boilerplate',
    severity: 'P1',
    test: (html) => {
      const n = (html.match(/holding and exit notes/gi) || []).length;
      return n >= 1 ? 'template "holding and exit notes" block' : null;
    },
  },
];

function listSlugs(collection) {
  const dir = path.join(ROOT, 'src/content', collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MORE-Group-rendered-audit/1.0', Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function readLocalHtml(collection, slug) {
  const p = path.join(ROOT, 'dist/client', collection, slug, 'index.html');
  if (!fs.existsSync(p)) throw new Error('missing dist HTML');
  return fs.readFileSync(p, 'utf8');
}

async function auditPage(collection, slug) {
  const urlPath = `/${collection}/${slug}/`;
  const url = `${SITE_URL}${urlPath}`;
  let html;
  try {
    html = useLocal ? readLocalHtml(collection, slug) : await fetchHtml(url);
  } catch (e) {
    return { collection, slug, url, error: String(e.message || e) };
  }
  const issues = [];
  for (const check of CHECKS) {
    const detail = check.test(html);
    if (detail) issues.push({ id: check.id, severity: check.severity, detail });
  }
  return { collection, slug, url, issues };
}

async function runPool(tasks, worker) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await worker(tasks[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => next()));
  return results;
}

async function main() {
const collections = collectionFilter
  ? discoverCollections().filter((c) => c.name === collectionFilter)
  : discoverCollections();

const tasks = [];
for (const { name } of collections) {
  for (const slug of listSlugs(name)) {
    tasks.push({ collection: name, slug });
  }
}

console.log(`Rendered audit: ${useLocal ? 'local dist' : SITE_URL}`);
console.log(`Site: ${path.basename(ROOT)} | pages: ${tasks.length} | checks: ${CHECKS.length}\n`);

if (!tasks.length) {
  console.log('No MDX pages found — skip.');
  process.exit(0);
}

const started = Date.now();
const results = await runPool(tasks, ({ collection, slug }) => auditPage(collection, slug));
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const byCheck = new Map();
const bySeverity = { P0: 0, P1: 0 };
const errors = [];

for (const r of results) {
  if (r.error) {
    errors.push(r);
    continue;
  }
  if (!r.issues.length) continue;
  for (const issue of r.issues) {
    bySeverity[issue.severity]++;
    if (!byCheck.has(issue.id)) byCheck.set(issue.id, []);
    byCheck.get(issue.id).push({ ...r, detail: issue.detail, severity: issue.severity });
  }
}

console.log(`Done in ${elapsed}s`);
console.log(`Scanned: ${results.length} | errors: ${errors.length} | pages with issues: ${[...byCheck.values()].flat().length}\n`);

if (errors.length) {
  console.log('=== FETCH / BUILD ERRORS ===');
  for (const e of errors.slice(0, 15)) {
    console.log(`  ${e.collection}/${e.slug}: ${e.error}`);
  }
  if (errors.length > 15) console.log(`  ... +${errors.length - 15} more\n`);
}

if (byCheck.size === 0 && errors.length === 0) {
  console.log('✓ No rendered issues found.');
} else {
  for (const [checkId, hits] of [...byCheck.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const sev = hits[0]?.severity || 'P1';
    console.log(`=== [${sev}] ${checkId} — ${hits.length} page(s) ===`);
    for (const h of hits.slice(0, 6)) {
      console.log(`  ${h.url}`);
      console.log(`    → ${h.detail}`);
    }
    if (hits.length > 6) console.log(`  ... +${hits.length - 6} more`);
    console.log('');
  }
}

console.log('Summary by severity:');
console.log(`  P0 (must fix): ${bySeverity.P0}`);
console.log(`  P1 (cleanup):  ${bySeverity.P1}`);

if (failOnIssues && (bySeverity.P0 > 0 || bySeverity.P1 > 0 || errors.length > 0)) {
  process.exit(1);
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
