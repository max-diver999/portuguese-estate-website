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

/**
 * The WhatsApp number is currently an interim one (see src/data/site.ts). It is
 * dialled by the CTAs but never printed as text, so a visitor never sees a
 * foreign country code. While `whatsappInterim` is true the link-side check is a
 * notice rather than a failure; the visible-number check stays hard either way.
 */
function readSiteFlag(name) {
  for (const rel of ['src/data/site.ts', 'src/data/site.js']) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(new RegExp(`${name}:\\s*(true|false)`));
    if (m) return m[1] === 'true';
  }
  return false;
}
const WHATSAPP_INTERIM = readSiteFlag('whatsappInterim');
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
    test: (html, ctx = {}) => {
      const n = (html.match(/id="lead-form"/g) || []).length;
      if (n > 1) return `${n} elements with id="lead-form" (expected 1)`;
      const required = ctx.requireLeadForm ?? siteConfig.requireLeadForm;
      if (n === 0 && required) return 'no #lead-form on page';
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
  {
    // The content gate caps frontmatter titles at 60 chars, but the layout can
    // append a brand suffix. Only the rendered string decides SERP truncation.
    id: 'title-too-long',
    severity: 'P0',
    test: (html) => {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      if (!m) return 'no <title>';
      const title = m[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      return title.length > 60 ? `rendered <title> is ${title.length} chars (max 60): "${title}"` : null;
    },
  },
  {
    // A layout H1 plus an "# " heading in the MDX body ships two competing H1s.
    id: 'h1-count',
    severity: 'P0',
    test: (html) => {
      const n = (html.match(/<h1[\s>]/g) || []).length;
      return n === 1 ? null : `page has ${n} <h1> elements (expected exactly 1)`;
    },
  },
  {
    // This codebase was forked through several MORE Group sites (Mexico, Italy,
    // UAE, Thailand) and copy from those markets repeatedly survived into
    // production. Two tiers, because Portugal-vs-X pages legitimately discuss
    // other markets in prose:
    //   HARD  — markets this site never covers, or known broken strings. Anywhere.
    //   SOFT  — other-market regions. Only a defect in <title>, meta description
    //           or a heading, which is where every instance of fork residue sat.
    id: 'foreign-market-copy',
    severity: 'P0',
    test: (html) => {
      const HARD = [
        /Riviera Maya/i, /Los Cabos/i, /Puerto Vallarta/i, /Playa del Carmen/i,
        /\bTulum\b/i, /\bCancun\b/i, /\bPhuket\b/i, /\bPattaya\b/i,
        /Portuguese Estatement/i, /Spain Property Market Comparisons/i,
        /other Gulf markets/i, /investGulfTrack\s*=\s*function/i,
        // UAE is a legitimate buyer-origin market here (see /segments/uae-buyers-…),
        // so only flag UAE as the *subject* market, which is what the fork left behind.
        /UAE (property|government)/i, /licensed UAE/i, /emirate-level/i,
      ];
      const SOFT = [
        /Costa Smeralda/i, /Lake Como/i, /\bPuglia\b/i, /\bTuscany\b/i,
        /\bSicily\b/i, /\bPortofino\b/i, /\bTrulli\b/i,
      ];
      const body = html.replace(/<script[\s\S]*?<\/script>/g, ' ');
      const head = [
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '',
        html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1] ?? '',
        ...[...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => m[1]),
      ].join(' \n ');

      const hits = [
        ...HARD.filter((re) => re.test(body)).map((re) => re.source),
        ...SOFT.filter((re) => re.test(head)).map((re) => `${re.source} (in title/description/heading)`),
      ];
      return hits.length ? `foreign-market copy: ${hits.join(', ')}` : null;
    },
  },
  {
    // A phone number a visitor can READ must never be a foreign one — a +66
    // country code on a Lisbon property page destroys trust before the click.
    // This stays hard regardless of the interim flag.
    id: 'contact-number-visible',
    severity: 'P0',
    test: (html) => {
      const numbers = [...new Set([...html.matchAll(/wa\.me\/(\d{6,})/g)].map((m) => m[1]))];
      if (!numbers.length) return null;
      // strip scripts, tags and attributes — leave only what renders as text
      const text = html
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<[^>]+>/g, ' ');
      const digitsOnly = text.replace(/[^\d]/g, '');
      const shown = numbers.filter((n) => digitsOnly.includes(n) && !n.startsWith('351'));
      return shown.length
        ? `non-Portuguese contact number rendered as visible text: +${shown.join(', +')}`
        : null;
    },
  },
  {
    // Link-side check. Downgraded to a notice while an interim number is in use;
    // flip whatsappInterim to false in src/data/site.ts to make this blocking.
    id: 'contact-country-code',
    severity: WHATSAPP_INTERIM ? 'NOTICE' : 'P0',
    test: (html) => {
      const bad = [...new Set([...html.matchAll(/wa\.me\/(\d{6,})/g)].map((m) => m[1]))]
        .filter((n) => !n.startsWith('351'));
      if (!bad.length) return null;
      return WHATSAPP_INTERIM
        ? `interim wa.me number in use (+${bad.join(', +')}) — not displayed to visitors; replace with a +351 number when available`
        : `wa.me number is not a Portuguese (+351) number: +${bad.join(', +')}`;
    },
  },
];

/**
 * Non-collection pages. These are NOT under src/content, so the collection walk
 * never reached them — which is exactly where Mexico/Italy fork copy survived.
 * requireLeadForm is false where a lead form is not expected.
 */
const STANDALONE_PAGES = [
  { urlPath: '/', requireLeadForm: true },
  { urlPath: '/guides/', requireLeadForm: true },
  { urlPath: '/areas/', requireLeadForm: false },
  { urlPath: '/compare/', requireLeadForm: false },
  { urlPath: '/segments/', requireLeadForm: false },
  { urlPath: '/projects/', requireLeadForm: false },
  { urlPath: '/developers/', requireLeadForm: false },
  { urlPath: '/portugal-property-consultation/', requireLeadForm: true },
  { urlPath: '/tier-entry/', requireLeadForm: true },
  { urlPath: '/tier-mid/', requireLeadForm: true },
  { urlPath: '/tier-luxury/', requireLeadForm: true },
  { urlPath: '/get-shortlist/', requireLeadForm: true },
  { urlPath: '/contact/', requireLeadForm: false },
  { urlPath: '/about/', requireLeadForm: false },
  { urlPath: '/methodology/', requireLeadForm: false },
  { urlPath: '/news/', requireLeadForm: false },
  { urlPath: '/privacy-policy/', requireLeadForm: false },
  { urlPath: '/terms/', requireLeadForm: false },
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

function readLocalHtml(urlPath) {
  const p = path.join(ROOT, 'dist/client', urlPath, 'index.html');
  if (!fs.existsSync(p)) throw new Error('missing dist HTML');
  return fs.readFileSync(p, 'utf8');
}

async function auditPage(task) {
  const { collection, slug, urlPath } = task;
  const url = `${SITE_URL}${urlPath}`;
  let html;
  try {
    html = useLocal ? readLocalHtml(urlPath) : await fetchHtml(url);
  } catch (e) {
    return { collection, slug, url, error: String(e.message || e) };
  }
  const ctx = { urlPath, requireLeadForm: task.requireLeadForm };
  const issues = [];
  for (const check of CHECKS) {
    const detail = check.test(html, ctx);
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
    tasks.push({ collection: name, slug, urlPath: `/${name}/${slug}/` });
  }
}
if (!collectionFilter) {
  for (const page of STANDALONE_PAGES) {
    tasks.push({
      collection: '(page)',
      slug: page.urlPath,
      urlPath: page.urlPath,
      requireLeadForm: page.requireLeadForm,
    });
  }
}

console.log(`Rendered audit: ${useLocal ? 'local dist' : SITE_URL}`);
console.log(`Site: ${path.basename(ROOT)} | pages: ${tasks.length} | checks: ${CHECKS.length}\n`);

if (!tasks.length) {
  console.log('No MDX pages found — skip.');
  process.exit(0);
}

const started = Date.now();
const results = await runPool(tasks, (task) => auditPage(task));
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const byCheck = new Map();
const bySeverity = { P0: 0, P1: 0, NOTICE: 0 };
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
if (bySeverity.NOTICE) console.log(`  NOTICE (known, non-blocking): ${bySeverity.NOTICE}`);

if (failOnIssues && (bySeverity.P0 > 0 || bySeverity.P1 > 0 || errors.length > 0)) {
  process.exit(1);
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
