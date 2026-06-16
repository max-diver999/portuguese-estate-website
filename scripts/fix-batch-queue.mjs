#!/usr/bin/env node
/**
 * MORE Group — universal fix-batch queue (single source; synced to every site).
 *
 * Prioritises EXISTING pages to fix (not new content). Works on any MORE Group
 * site (EN guides/areas/... or RU gajdy/rajony/...). No HTTP, no paid models.
 *
 * `ready` = aligned with validate:strict blockers (not just score >= 90).
 * Run validate:strict on tier A before showing Maksim — queue is a pre-filter only.
 *
 * Usage:
 *   node scripts/fix-batch-queue.mjs                 # tier A, top 15
 *   node scripts/fix-batch-queue.mjs --tier B --limit 30
 *   node scripts/fix-batch-queue.mjs --recover       # noindex recovery buckets
 *   node scripts/fix-batch-queue.mjs --json          # machine-readable
 *   node scripts/fix-batch-queue.mjs --ready         # zero strict blockers
 *   node scripts/fix-batch-queue.mjs --verify --tier A --limit 5
 *   node scripts/fix-batch-queue.mjs --slug proof-of-funds-thailand-property --json
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runStrictValidate, validatorOnlyHints } from './lib/fix-batch-validate.mjs';
import {
  AI_FLUFF_RE,
  BANNED_PHRASES,
  DRAFT_MARKERS_RE,
  countBoldSpans,
  countMarkdownTableRows,
  countNumericFacts,
  internalLinks,
  linksWithoutTrailingSlash,
} from './lib/more-content-gate.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const CONTENT = join(ROOT, 'src/content');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};

const tierFilter = (opt('--tier', null) || '').toUpperCase() || null;
const limit = parseInt(opt('--limit', '15'), 10);
const collectionFilter = opt('--collection', null);
const jsonOut = flag('--json');
const recoverMode = flag('--recover');
const includeNoindexAlso = flag('--include-noindex');
const readyOnly = flag('--ready');
const notReadyOnly = flag('--not-ready');
const verifyMode = flag('--verify');
const slugFilter = opt('--slug', null);

const isRu = existsSync(join(CONTENT, 'gajdy'));
const COLLECTIONS = isRu
  ? {
      gajdy: { minWords: 2000, minFaq: 5, commercial: true },
      rajony: { minWords: 1800, minFaq: 4, commercial: true },
      sravneniya: { minWords: 1800, minFaq: 4, commercial: true },
      proekty: { minWords: 1200, minFaq: 3, commercial: true },
      novosti: { minWords: 500, minFaq: 0, light: true },
      pereustupki: { minWords: 500, minFaq: 0, light: true },
    }
  : {
      guides: { minWords: 2000, minFaq: 5, commercial: true },
      areas: { minWords: 1800, minFaq: 4, commercial: true },
      comparisons: { minWords: 1800, minFaq: 4, commercial: true },
      markets: { minWords: 1800, minFaq: 4, commercial: true },
      costs: { minWords: 1800, minFaq: 4, commercial: true },
      finance: { minWords: 1800, minFaq: 4, commercial: true },
      legal: { minWords: 1800, minFaq: 4, commercial: true },
      compare: { minWords: 1800, minFaq: 4, commercial: true },
      projects: { minWords: 1000, minFaq: 3, commercial: false },
      developers: { minWords: 1200, minFaq: 3, commercial: false },
      news: { minWords: 500, minFaq: 0, light: true },
      resales: { minWords: 500, minFaq: 0, light: true },
    };

const LAYOUT_PROVIDES_LEAD_FORM = new Set(
  isRu
    ? ['gajdy', 'rajony', 'sravneniya']
    : ['guides', 'areas', 'comparisons', 'compare', 'projects', 'developers', 'markets', 'costs', 'finance', 'legal'],
);

const SEVERITY = {
  'mdx-risk': 12,
  'thin-content': 8,
  'missing-hero': 6,
  'bad-title-length': 6,
  'bad-description-length': 6,
  'missing-tldr': 6,
  'missing-answer-box': 6,
  'few-internal-links': 6,
  'missing-trailing-slash': 5,
  'relatedslug-noindex': 5,
  'relatedslug-missing': 5,
  'link-to-noindex': 5,
  'missing-table': 5,
  'missing-pros-cons': 5,
  'low-fact-density': 5,
  'missing-risks': 5,
  'missing-scenarios': 5,
  'few-h2': 4,
  'draft-marker': 10,
  'missing-faq': 4,
  'missing-faq-block': 4,
  'missing-lead-form': 4,
  'ai-language': 4,
  'over-bold': 2,
};

function loadProtected() {
  const p = join(SCRIPT_DIR, 'protected-content-slugs.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8')).slugs || {};
  } catch {
    return {};
  }
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, fmRaw: '', body: raw };
  const fmRaw = m[1];
  const body = raw.slice(m[0].length);
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
  }
  return { fm, fmRaw, body };
}

function parseRelatedSlugs(fmRaw) {
  const slugs = [];
  const block = fmRaw.match(/^relatedSlugs:\s*\n((?:\s+-\s*.+\n)+)/m);
  if (block) {
    for (const line of block[1].match(/^\s+-\s*(.+)$/gm) || []) {
      slugs.push(line.replace(/^\s+-\s*/, '').replace(/^['"]|['"]$/g, '').trim());
    }
  }
  const inline = fmRaw.match(/^relatedSlugs:\s*\[([^\]]+)\]/m);
  if (inline) {
    for (const part of inline[1].split(',')) {
      const s = part.trim().replace(/^['"]|['"]$/g, '');
      if (s) slugs.push(s);
    }
  }
  return slugs;
}

function bodyWordCount(body) {
  const stripped = body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/<FaqBlock[\s\S]*?\/>/g, ' ')
    .replace(/<TldrBlock[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return stripped.split(/\s+/).filter((w) => /[A-Za-zА-Яа-яЁё0-9]/.test(w)).length;
}

function countFaq(fmRaw, body) {
  const fmQ = (fmRaw.match(/^\s*-\s*question:/gm) || []).length;
  const compQ = (body.match(/question\s*:/g) || []).length;
  return Math.max(fmQ, compQ);
}

function buildContentIndex(rawRecords) {
  const slugs = new Set();
  const noindexSlugs = new Set();
  const noindexUrls = new Set();
  const collUrl = (coll) => `/${coll}/`;

  for (const r of rawRecords) {
    const { fm } = parseFrontmatter(r.raw);
    slugs.add(r.slug);
    const noindex = fm.noindex === 'true' || fm.noindex === true;
    if (noindex) {
      noindexSlugs.add(r.slug);
      noindexUrls.add(`${collUrl(r.coll)}${r.slug}/`);
    }
  }
  return { slugs, noindexSlugs, noindexUrls, collUrl };
}

function analyze(file, index) {
  const { fm, fmRaw, body } = parseFrontmatter(file.raw);
  const cfg = file.cfg;
  const noindex = fm.noindex === 'true' || fm.noindex === true;
  const words = bodyWordCount(body);
  const issues = [];
  const light = cfg.light === true;
  const commercial = cfg.commercial === true;
  const layoutLead = LAYOUT_PROVIDES_LEAD_FORM.has(file.coll);

  if (/[<>][0-9]/.test(file.raw) || /FaqBlock\s+faqs\s*=/.test(file.raw)) {
    issues.push('mdx-risk');
  }
  if (DRAFT_MARKERS_RE.test(file.raw)) issues.push('draft-marker');
  if (!fm.heroImage && !light) issues.push('missing-hero');

  if (!light && !noindex) {
    if (fm.title) {
      const tlen = String(fm.title).length;
      if (tlen < 50 || tlen > 60) issues.push('bad-title-length');
    }
    if (fm.description && String(fm.description).length > 160) {
      issues.push('bad-description-length');
    }

    if (words < cfg.minWords) issues.push('thin-content');

    if (commercial) {
      if (!/(Короткий ответ|Quick answer|TL;DR|<TldrBlock)/i.test(body)) {
        issues.push('missing-answer-box');
      }
      if (!/<TldrBlock\b/.test(body)) issues.push('missing-tldr');
      const h2 = (body.match(/^##\s+/gm) || []).length;
      if (h2 < 4) issues.push('few-h2');
      if (internalLinks(body).filter((l) => !l.startsWith('/api/')).length < 5) {
        issues.push('few-internal-links');
      }
      const noSlash = linksWithoutTrailingSlash(body);
      if (noSlash.length) issues.push('missing-trailing-slash');
      if (countMarkdownTableRows(body) < 6) issues.push('missing-table');
      if (!/(pros|cons|плюс|минус|advantages|disadvantages)/i.test(body)) {
        issues.push('missing-pros-cons');
      }
      if (!/(риск|red flag|checklist|чеклист|what to check|insider tip|risks?)/i.test(body)) {
        issues.push('missing-risks');
      }
      if (!/(сценари|scenario|for investors|для инвестор|who this is for|buyer profile|decision framework)/i.test(body)) {
        issues.push('missing-scenarios');
      }
      const nums = countNumericFacts(body);
      const minNums = Math.max(8, Math.floor((cfg.minWords || 2000) / 500) * 3);
      if (nums < minNums) issues.push('low-fact-density');
      if (cfg.minFaq > 0 && countFaq(fmRaw, body) < cfg.minFaq) issues.push('missing-faq');
      if (!/<FaqBlock/.test(body)) issues.push('missing-faq-block');
      if (
        !layoutLead &&
        !/(<LeadForm|<InlineCta|#lead-form|WhatsApp|Telegram|подбер|consultation|shortlist)/i.test(body)
      ) {
        issues.push('missing-lead-form');
      }
      if (AI_FLUFF_RE.test(body) || BANNED_PHRASES.some((p) => body.includes(p))) {
        issues.push('ai-language');
      }
      if (countBoldSpans(body) > 35) issues.push('over-bold');

      for (const slug of parseRelatedSlugs(fmRaw)) {
        if (!index.slugs.has(slug)) issues.push('relatedslug-missing');
        if (index.noindexSlugs.has(slug)) issues.push('relatedslug-noindex');
      }
      for (const link of internalLinks(body)) {
        if (index.noindexUrls.has(link.endsWith('/') ? link : `${link}/`)) {
          issues.push('link-to-noindex');
          break;
        }
      }
    }
  }

  const uniqueIssues = [...new Set(issues)];
  let score = 100;
  for (const i of uniqueIssues) score -= SEVERITY[i] ?? 1;
  score = Math.max(0, score);

  const ready = uniqueIssues.length === 0 && (light || words >= cfg.minWords);
  return { ...file, noindex, words, issues: uniqueIssues, score, ready, blockers: uniqueIssues.length };
}

function tierOf(rec, gsc) {
  const g = gsc[rec.slug] || {};
  const imp = g.impressions || 0;
  const clk = g.clicks || 0;
  if (imp >= 300 || clk > 0) return 'A';
  if (imp > 0 || rec.cfg.commercial === true) return 'B';
  return 'C';
}

function recoverBucket(rec, gsc) {
  const imp = (gsc[rec.slug] || {}).impressions || 0;
  if (imp > 0) return 'A';
  if (rec.words >= 1000) return 'B';
  return 'C';
}

const gsc = loadProtected();
const cols = collectionFilter ? [collectionFilter] : Object.keys(COLLECTIONS);
const rawRecords = [];
for (const coll of cols) {
  const cfg = COLLECTIONS[coll];
  if (!cfg) continue;
  const dir = join(CONTENT, coll);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.mdx')) continue;
    const slug = name.replace(/\.mdx$/, '');
    const raw = readFileSync(join(dir, name), 'utf8');
    rawRecords.push({ coll, slug, cfg, raw });
  }
}

const index = buildContentIndex(rawRecords);
const records = rawRecords.map((r) => analyze(r, index));

let rows = records;
if (slugFilter) {
  rows = records.filter((r) => r.slug === slugFilter);
  if (collectionFilter) rows = rows.filter((r) => r.coll === collectionFilter);
} else if (recoverMode) {
  rows = records.filter((r) => r.noindex);
} else if (!includeNoindexAlso) {
  rows = records.filter((r) => !r.noindex);
}
for (const r of rows) {
  const g = gsc[r.slug] || {};
  r.imp = g.impressions || 0;
  r.clk = g.clicks || 0;
  r.gscProtected = Boolean(gsc[r.slug]);
  r.tier = recoverMode ? recoverBucket(r, gsc) : tierOf(r, gsc);
}
if (tierFilter) rows = rows.filter((r) => r.tier === tierFilter);
if (readyOnly) rows = rows.filter((r) => r.ready);
if (notReadyOnly) rows = rows.filter((r) => !r.ready);

const tierRank = { A: 0, B: 1, C: 2 };
rows.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || b.imp - a.imp || a.score - b.score);

if (verifyMode) {
  const toVerify = rows.slice(0, limit);
  const results = [];
  let aligned = 0;
  let falseReady = 0;
  let falseBlock = 0;

  console.log(`\n=== QUEUE vs VALIDATE:STRICT VERIFY — ${isRu ? 'RU' : 'EN'} ===`);
  console.log(`Checking ${toVerify.length} URL(s)…\n`);

  for (const r of toVerify) {
    const fileRel = `src/content/${r.coll}/${r.slug}.mdx`;
    const v = runStrictValidate(ROOT, fileRel);
    const isAligned = (r.ready && v.pass) || (!r.ready && !v.pass);
    if (isAligned) aligned += 1;
    else if (r.ready && !v.pass) falseReady += 1;
    else if (!r.ready && v.pass) falseBlock += 1;

    const drift = v.pass ? [] : validatorOnlyHints(v.errors).filter((h) => !r.issues.includes(h));
    results.push({ r, v, isAligned, drift });
  }

  console.log('ALN  QRD  VAL  SCORE  DRIFT  PAGE');
  console.log('---  ---  ---  -----  -----  ----');
  for (const { r, v, isAligned, drift } of results) {
    console.log(
      `${(isAligned ? 'ok' : '!!').padEnd(3)}  ${(r.ready ? 'yes' : 'no').padEnd(3)}  ` +
        `${(v.pass ? 'pass' : 'fail').padEnd(4)}  ${String(r.score).padStart(5)}  ` +
        `${(drift.length ? drift.join('+') : '–').padEnd(5)}  ${r.coll}/${r.slug}`,
    );
    if (!isAligned) {
      if (r.ready && !v.pass) {
        console.log(`        └ FALSE READY — validator: ${v.errors.slice(0, 2).join('; ')}`);
      } else if (!r.ready && v.pass) {
        console.log('        └ FALSE BLOCK — queue too strict or drift');
      }
    } else if (drift.length) {
      console.log(`        └ validator-only: ${drift.join(', ')}`);
    }
  }

  console.log(
    `\nAligned: ${aligned}/${toVerify.length} | false ready: ${falseReady} | false block: ${falseBlock}`,
  );
  console.log('ALN=ok → queue ready matches validate pass/fail. DRIFT = validator catches extra (HTTP hero, duplicates, …).');
  process.exit(falseReady > 0 ? 1 : 0);
}

if (jsonOut) {
  console.log(
    JSON.stringify(
      rows.slice(0, limit).map((r) => ({
        tier: r.tier,
        coll: r.coll,
        slug: r.slug,
        url: `/${r.coll}/${r.slug}/`,
        impressions: r.imp,
        clicks: r.clk,
        gscProtected: r.gscProtected,
        score: r.score,
        ready: r.ready,
        blockers: r.blockers,
        words: r.words,
        issues: r.issues,
      })),
      null,
      2,
    ),
  );
  process.exit(0);
}

const mode = recoverMode ? 'NOINDEX RECOVERY' : 'FIX-BATCH';
console.log(`\n=== ${mode} QUEUE — ${isRu ? 'RU' : 'EN'} site ===`);
console.log(`Scanned: ${records.length} | in queue: ${rows.length}${tierFilter ? ` | tier ${tierFilter}` : ''}\n`);

const counts = rows.reduce((a, r) => ((a[r.tier] = (a[r.tier] || 0) + 1), a), {});
console.log(`Tiers: A=${counts.A || 0}  B=${counts.B || 0}  C=${counts.C || 0}`);
console.log(`Queue-ready (0 strict blockers): ${rows.filter((r) => r.ready).length}/${rows.length}\n`);

console.log('TIER  IMP   CLK  SCORE  RDY  PAGE');
console.log('----  ----  ---  -----  ---  ----');
for (const r of rows.slice(0, limit)) {
  const line =
    `${r.tier.padEnd(4)}  ${String(r.imp).padStart(4)}  ${String(r.clk).padStart(3)}  ` +
    `${String(r.score).padStart(5)}  ${(r.ready ? 'ok' : '–').padEnd(3)}  ${r.coll}/${r.slug}`;
  console.log(line);
  if (!r.ready && r.issues.length) console.log(`        └ ${r.issues.join(', ')}`);
}
if (rows.length > limit) console.log(`\n... +${rows.length - limit} more (raise --limit)`);

if (recoverMode) {
  console.log(
    '\nRecovery rule: bucket A → remove noindex AFTER P0 rewrite; ' +
      'bucket B → rewrite then remove noindex; bucket C → keep noindex or 301 to KEEP pillar.',
  );
} else {
  console.log(
    '\n`ready` = zero strict blockers (aligned with validate:strict). ' +
      'Tier A still needs `npm run validate:strict -- --files <path>` before card → Maksim "ок".',
  );
}
