// QA audit for mexico-invest content — hard gate before publish
// Usage:
//   node scripts/qa-audit.mjs
//   node scripts/qa-audit.mjs --changed
//   node scripts/qa-audit.mjs --file guides/slug.mdx

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runExtendedChecks } from './lib/more-content-gate.mjs';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const COLLECTIONS = ['guides', 'compare', 'areas', 'projects', 'developers', 'news'];

const BANNED_PHRASES = [
  'Regional diversification',
  'Advanced investment strategies',
  'Operational excellence',
  'Comprehensive framework',
  'Future outlook',
  'Extended due diligence checklist',
  '[VERIFY]',
  '**VERIFY:**',
  'Knowledge base',
  'KB §',
  'source needed',
];

const REGULATORY_STALE = [
  { pattern: /AED\s*750[,\s]?000.*(?:minimum|sole|single)\s*owner/i, hint: 'Dubai sole-owner AED 750K floor removed 2026 — verify DLD Cube' },
  { pattern: /750k.*investor visa.*minimum/i, hint: 'Investor visa minimum may be outdated — verify 2026 rules' },
];

const args = process.argv.slice(2);
const changedOnly = args.includes('--changed');
const fileArgIdx = args.indexOf('--file');
const singleFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: null, body: raw, fmRaw: '' };
  const fmRaw = m[1];
  const body = raw.slice(m[0].length);
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const km = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (km) fm[km[1]] = km[2].trim();
  }
  const faqCount = (fmRaw.match(/^\s*-\s*question:/gm) || []).length;
  fm.__faqCount = faqCount;
  fm.__hasFaq = /\nfaq:/.test('\n' + fmRaw);
  return { fm, body, fmRaw };
}

function auditTables(body) {
  const probs = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|')) continue;
    if (/^\|\|/.test(line)) probs.push(`tableDoublePipe:L${i + 1}`);
    if (/^\|[\s\-:|]+\|$/.test(line) && !/^\|[\s\-:|]+\|$/.test(line.replace(/\|\|/g, '|'))) {
      // handled by double pipe
    }
    if (/^\|/.test(line) && /\|/.test(line.slice(1))) {
      const cols = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (i + 1 < lines.length && /^[\|\s\-:]+$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        const sepCols = lines[i + 1].split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (sepCols.length && cols.length && sepCols.length !== cols.length) {
          probs.push(`tableColMismatch:L${i + 1}(${cols.length}vs${sepCols.length})`);
        }
      }
    }
  }
  return probs;
}

function getChangedFiles() {
  const repoRoot = decodeURIComponent(new URL('..', import.meta.url).pathname);
  try {
    const out = execSync('git diff --name-only HEAD', { encoding: 'utf8', cwd: repoRoot });
    return out
      .split('\n')
      .filter((f) => f.startsWith('src/content/') && f.endsWith('.mdx'))
      .map((f) => {
        const parts = f.replace('src/content/', '').split('/');
        return { coll: parts[0], slug: parts[1].replace('.mdx', ''), path: f };
      });
  } catch {
    return [];
  }
}

const slugsByCollection = {};
const allSlugs = new Set();
for (const c of COLLECTIONS) {
  const dir = join(ROOT, c);
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  } catch {
    /* missing collection */
  }
  slugsByCollection[c] = files.map((f) => f.replace(/\.mdx$/, ''));
  for (const s of slugsByCollection[c]) allSlugs.add(s);
}

const issues = [];
const stats = { total: 0, byColl: {}, wordSum: 0 };
const reportRows = [];

function auditFile(c, slug) {
  stats.total++;
  stats.byColl[c] = (stats.byColl[c] || 0) + 1;
  const path = join(ROOT, c, slug + '.mdx');
  const raw = readFileSync(path, 'utf8');
  const { fm, body, fmRaw } = parseFrontmatter(raw);
  const words = body.split(/\s+/).filter(Boolean).length;
  stats.wordSum += words;
  const prob = [];

  if (!fm) {
    issues.push(`[${c}/${slug}] NO frontmatter`);
    return;
  }

  for (const k of ['title', 'description', 'pubDate', 'category']) {
    if (!fm[k]) prob.push(`missing:${k}`);
  }
  if (!fm.updatedDate) prob.push('missing:updatedDate');
  if (!fm.author) prob.push('missing:author');
  if (!fm.readingTime) prob.push('missing:readingTime');

  const desc = (fm.description || '').replace(/^["']|["']$/g, '');
  if (desc && desc.length > 160) prob.push(`descLen:${desc.length}>160`);
  if (desc && desc.length < 120) prob.push(`descLen:${desc.length}<120`);

  const title = (fm.title || '').replace(/^["']|["']$/g, '');
  if (title && (title.length < 45 || title.length > 65)) prob.push(`titleLen:${title.length}`);

  const minFaq = c === 'news' ? 3 : 5;
  if (!fm.__hasFaq) prob.push('no-faq-block');
  else if (fm.__faqCount < minFaq) prob.push(`faq:${fm.__faqCount}<${minFaq}`);

  const minW = {
    guides: 2000,
    projects: 1200,
    compare: 1800,
    areas: 1800,
    developers: 1200,
    news: 600,
  }[c] ?? 1800;
  if (words < minW) prob.push(`words:${words}<${minW}`);

  if (c !== 'news' && !/quick answer|tl;dr|\*\*quick answer|\*\*tl;dr/i.test(body)) {
    prob.push('no-quick-answer');
  }

  const links = body.match(/\]\((\/[a-z0-9\-\/]*)\)/gi) || [];
  const internal = links.filter((l) =>
    /\]\(\/(guides|compare|areas|projects|developers|news)\//i.test(l),
  );
  if (internal.length < 5) prob.push(`intLinks:${internal.length}<5`);
  const noTrail = internal.filter((l) => !/\/\)$/.test(l));
  if (noTrail.length) prob.push(`noTrailingSlash:${noTrail.length}`);

  if (/<\d|[\s(]>\d/.test(body)) prob.push('mdx-angle-digit');
  if (/faqs=\{/.test(body)) prob.push('FaqBlock-faqs-prop');

  const tableLines = (body.match(/^\|.*\|$/gm) || []).length;
  if (tableLines < 3) prob.push(`tables:${tableLines}<3`);
  prob.push(...auditTables(body));

  for (const phrase of BANNED_PHRASES) {
    if (body.includes(phrase) || (fmRaw && fmRaw.includes(phrase))) {
      prob.push(`banned:${phrase.slice(0, 24)}`);
    }
  }

  const extErr = [];
  runExtendedChecks({
    prefix: `[${c}/${slug}]`,
    body,
    cfg: { minWords: minW, label: c },
    legacyExempt: c === 'news',
    errors: extErr,
  });
  for (const e of extErr) prob.push(e.replace(`[${c}/${slug}]: `, '').replace(`[${c}/${slug}] `, ''));

  const isRegulatory = /visa|golden visa|investor visa|dld|residency/i.test(
    `${fm.title} ${(fm.tags || '').toString()} ${slug}`,
  );
  if (isRegulatory) {
    for (const { pattern, hint } of REGULATORY_STALE) {
      const m = body.match(pattern);
      if (m) {
        const start = Math.max(0, m.index - 80);
        const end = Math.min(body.length, m.index + m[0].length + 80);
        const context = body.slice(start, end);
        if (!/removed|no longer|abolished|suspended|was|previously|until|before april/i.test(context)) {
          prob.push(`regulatoryStale:${hint.slice(0, 40)}`);
        }
      }
    }
  }

  const relBlock = fmRaw.match(/relatedSlugs:\s*\n([\s\S]*?)(?:\n[a-zA-Z_]+:|$)/);
  if (relBlock) {
    const rels = (relBlock[1].match(/-\s*["']?([a-z0-9\-]+)["']?/g) || [])
      .map((r) => r.replace(/-\s*["']?/, '').replace(/["']$/, ''))
      .filter((r) => r && r !== '--');
    const bad = rels.filter((r) => r && !allSlugs.has(r));
    if (bad.length) prob.push(`relatedSlugsBad:${bad.join('|')}`);
  }

  const bodySlugs = [
    ...body.matchAll(/\]\(\/(?:guides|compare|areas|projects|developers|news)\/([a-z0-9\-]+)\/?\)/gi),
  ].map((m) => m[1]);
  const badLinks = [...new Set(bodySlugs.filter((s) => !allSlugs.has(s)))];
  if (badLinks.length) prob.push(`brokenInternalLinks:${badLinks.join('|')}`);

  reportRows.push({ coll: c, slug, words, faq: fm.__faqCount, prob });
  if (prob.length) issues.push(`[${c}/${slug}] (${words}w) ${prob.join(', ')}`);
}

let filesToAudit = [];
if (singleFile) {
  const parts = singleFile.replace(/^src\/content\//, '').split('/');
  filesToAudit = [{ coll: parts[0], slug: parts[1].replace('.mdx', '') }];
} else if (changedOnly) {
  filesToAudit = getChangedFiles();
  if (!filesToAudit.length) {
    console.log('No changed MDX files — skipping audit.');
    process.exit(0);
  }
} else {
  for (const c of COLLECTIONS) {
    for (const slug of slugsByCollection[c] || []) {
      filesToAudit.push({ coll: c, slug });
    }
  }
}

for (const { coll, slug } of filesToAudit) {
  auditFile(coll, slug);
}

console.log('=== MEXICO-INVEST QA AUDIT ===');
console.log(`Scope: ${changedOnly ? 'changed only' : singleFile ? singleFile : 'full corpus'}`);
console.log(`Files audited: ${stats.total}`);
if (stats.total) console.log(`Avg words: ${Math.round(stats.wordSum / stats.total)}`);
console.log(`Clean: ${reportRows.filter((r) => !r.prob.length).length}/${stats.total}`);
console.log('');

const counts = {};
for (const r of reportRows) {
  for (const p of r.prob) {
    const key = p.split(':')[0];
    counts[key] = (counts[key] || 0) + 1;
  }
}
if (Object.keys(counts).length) {
  console.log('=== PROBLEM SUMMARY ===');
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
  console.log('');
  console.log('=== DETAILED ISSUES ===');
  for (const i of issues) console.log(i);
}

const failCount = reportRows.filter((r) => r.prob.length).length;
console.log(`\nArticles with issues: ${failCount}/${stats.total}`);

if (failCount > 0) {
  console.error('\n❌ validate:content FAILED');
  process.exit(1);
}
console.log('\n✅ validate:content PASSED');
