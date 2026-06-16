// One-shot (re-runnable) corpus cleanup: tables, KB markers, broken links, banned tails.
// Usage: node scripts/corpus-cleanup.mjs [--dry]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const COLLECTIONS = ['guides', 'compare', 'areas'];
const DRY = process.argv.includes('--dry');

const allSlugs = new Set();
for (const c of COLLECTIONS) {
  try {
    for (const f of readdirSync(join(ROOT, c)).filter((x) => x.endsWith('.mdx'))) {
      allSlugs.add(f.replace(/\.mdx$/, ''));
    }
  } catch {
    /* skip */
  }
}

/** broken slug → verified existing slug */
const LINK_MAP = {
  'abu-dhabi-international-schools-guide': 'gulf-schools-comparison',
  'adek-school-ratings-abu-dhabi': 'gulf-schools-comparison',
  'abu-dhabi-relocation-guide': 'abu-dhabi-expat-community',
  'dubai-vs-abu-dhabi-cost-living': 'abu-dhabi-cost-of-living',
  'dubai-cost-of-living': 'dubai-cost-of-living-guide',
  'rak-schools-guide': 'gulf-schools-comparison',
  'rak-property-investment-guide': 'ras-al-khaimah-property-investment-guide',
  'rak-cost-of-living': 'rak-cost-of-living-detailed',
  'uae-golden-visa-property': 'uae-golden-visa-property-2026',
  'uae-banking-guide-expats': 'gulf-banking-comparison-expats',
  'uae-banking-for-russian-expats': 'gulf-banking-comparison-expats',
  'open-bank-account-non-resident-uae': 'gulf-banking-comparison-expats',
  'gulf-currency-banking-expats': 'gulf-banking-comparison-expats',
  'the-pearl-qatar-property': 'living-the-pearl-qatar',
  'the-pearl-qatar-property-investment': 'the-pearl-lusail-property-investment',
  'lusail-property-guide': 'lusail-city-property-investment',
  'lusail-property-investment': 'lusail-city-property-investment',
  'west-bay-property-guide': 'west-bay-doha-property-investment',
  'rent-vs-buy-qatar-expat': 'qatar-property-buyer-relocation',
  'saudi-property-investment-guide': 'saudi-arabia-property-foreigners-guide',
  'uae-residency-visa-types-guide': 'golden-visa-vs-dubai-residence-visa',
  'remote-work-dubai-tax-implications': 'uae-tax-residency-183-day-rule',
  'pet-relocation-dubai': 'dubai-relocation-guide',
  'uae-property-investment-guide': 'dubai-property-investment-guide',
  'jumeirah-village-circle-property-investment': 'jvc-property-investment',
  'gcc-residency-investment-comparison': 'golden-visa-vs-investor-visa-uae',
  'russian-expats-dubai-guide': 'dubai-property-for-russian-buyers',
  'gulf-tax-comparison-expats': 'uae-tax-residency-property',
  'dubai-healthcare-guide-expats': 'gulf-healthcare-comparison',
  'tax-german-residents-dubai': 'uae-tax-residency-183-day-rule',
  'uae-tax-guide-expats': 'uae-tax-residency-property',
  'dubai-freehold-areas': 'freehold-areas-dubai-list',
  'best-dubai-areas-rental-yield': 'highest-rental-yield-areas-dubai',
  'dubai-short-term-rental-guide': 'short-term-vs-long-term-rental-dubai',
  'uk-universities-gulf-schools': 'gulf-schools-comparison',
  'education-city-qatar': 'qatar-school-fees',
  'uae-to-qatar-relocation': 'qatar-relocation-guide',
};

const BANNED_REPLACEMENTS = [
  [/## Future outlook and trends/g, '## Market trends ahead'],
  [/## Future outlook: /g, '## Market outlook: '],
  [/\*\*Future outlook:\*\*/g, '**Market note:**'],
  [/\| \*\*Regional diversification\*\* \|/g, '| **Multi-market allocation** |'],
];

function fixTables(text) {
  return text
    .split('\n')
    .map((line) => (line.startsWith('||') ? line.replace(/^\|\|/, '|') : line))
    .join('\n');
}

function stripKbMarkers(text) {
  return text
    .replace(/\(KB §\d+\)/g, '')
    .replace(/^KB §\d+:\s*/gm, '')
    .replace(/\*\*KB §\d+:\*\*\s*/g, '')
    .replace(/\*\*KB §\d+\*\*\s*/g, '')
    .replace(/## KB §\d+[^#\n]*/g, (m) => m.replace(/KB §\d+\s*[-—]?\s*/, ''))
    .replace(/\bper KB §\d+\b/gi, '')
    .replace(/\bKB §\d+\b/g, '')
    .replace(/KB §\d+\s+/g, '')
    .replace(/KB §\d+[:\s—-]*/g, '')
    .replace(/ — KB §\d+[^.\n]*/g, '')
    .replace(/\*Draft v1[^*]*KB §\d+[^*]*\*/g, '');
  // Do NOT collapse whitespace — breaks YAML if applied to frontmatter
}

function countTableCols(line) {
  const parts = line.split('|');
  if (parts.length < 2) return 0;
  return parts.slice(1, -1).length;
}

function isSeparatorRow(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim()) && line.includes('-');
}

function fixTableSeparators(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|') || !line.includes('|')) continue;
    if (isSeparatorRow(line)) continue;
    const headerCols = countTableCols(line);
    if (headerCols < 2) continue;
    const next = lines[i + 1];
    if (!next || !isSeparatorRow(next)) continue;
    const sepCols = countTableCols(next);
    if (sepCols === headerCols) continue;
    lines[i + 1] = `|${' --- |'.repeat(headerCols)}`;
  }
  return lines.join('\n');
}

function fixLinks(text) {
  let out = text;
  for (const [bad, good] of Object.entries(LINK_MAP)) {
    if (!allSlugs.has(good)) {
      console.warn(`WARN: replacement slug missing: ${good} (for ${bad})`);
      continue;
    }
    out = out.replaceAll(`(/guides/${bad}/)`, `(/guides/${good}/)`);
    out = out.replaceAll(`(/guides/${bad})`, `(/guides/${good}/)`);
    out = out.replaceAll(`(/compare/${bad}/)`, `(/compare/${good}/)`);
    out = out.replaceAll(`(/compare/${bad})`, `(/compare/${good}/)`);
    out = out.replaceAll(`(/areas/${bad}/)`, `(/areas/${good}/)`);
    out = out.replaceAll(`(/areas/${bad})`, `(/areas/${good}/)`);
    // relatedSlugs in frontmatter
    out = out.replaceAll(`- "${bad}"`, `- "${good}"`);
    out = out.replaceAll(`- '${bad}'`, `- "${good}"`);
    out = out.replaceAll(`- ${bad}\n`, `- ${good}\n`);
  }
  return out;
}

function fixBanned(text) {
  let out = text;
  for (const [re, rep] of BANNED_REPLACEMENTS) out = out.replace(re, rep);
  return out;
}

function cleanupBody(body) {
  let next = body;
  next = fixTables(next);
  next = fixTableSeparators(next);
  next = stripKbMarkers(next);
  next = fixLinks(next);
  next = fixBanned(next);
  return next;
}

function fixFrontmatterLinks(fm) {
  let nextFm = stripKbMarkers(fm);
  for (const [bad, good] of Object.entries(LINK_MAP)) {
    if (!allSlugs.has(good)) continue;
    nextFm = nextFm.replaceAll(`- "${bad}"`, `- "${good}"`);
    nextFm = nextFm.replaceAll(`- '${bad}'`, `- "${good}"`);
    nextFm = nextFm.replaceAll(`- ${bad}\n`, `- ${good}\n`);
  }
  return nextFm;
}

let changedFiles = 0;
const log = [];

for (const c of COLLECTIONS) {
  const dir = join(ROOT, c);
  let files = [];
  try {
    files = readdirSync(dir).filter((x) => x.endsWith('.mdx'));
  } catch {
    continue;
  }
  for (const f of files) {
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;
    const [, fm, body] = fmMatch;
    const nextBody = cleanupBody(body);
    const nextFm = fixFrontmatterLinks(fm);
    if (nextBody === body && nextFm === fm) continue;
    changedFiles++;
    log.push(`${c}/${f}`);
    if (!DRY) writeFileSync(path, `---\n${nextFm}\n---\n${nextBody}`);
  }
}

console.log(`${DRY ? '[DRY] ' : ''}Updated ${changedFiles} files`);
for (const l of log) console.log(`  ${l}`);
