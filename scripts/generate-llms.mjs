#!/usr/bin/env node
/**
 * Regenerates public/llms.txt and public/llms-full.txt from src/content collections.
 * Run after every content batch: node scripts/generate-llms.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'src/content');
const SITE = 'https://portuguese-estate.com';

const COLLECTIONS = [
  ['guides', 'Guides', 'Tax, legal, process and market guides for foreign buyers'],
  ['areas', 'Area guides', 'Neighbourhood and city investment guides with prices per m2 and yields'],
  ['compare', 'Comparisons', 'Portugal vs other markets, city vs city, structure vs structure'],
  ['projects', 'Project reviews', 'Independent reviews of named new-build developments'],
  ['developers', 'Developer profiles', 'Track-record profiles of Portugal developers'],
  ['segments', 'Buyer segments', 'Country-specific guides: tax treaties, currency, financing'],
  ['news', 'News', 'Market and regulatory news'],
];

function frontmatterField(src, field) {
  const quoted = src.match(new RegExp(`^${field}:\\s*"(.*)"`, 'm'));
  if (quoted) return quoted[1];
  const bare = src.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return bare ? bare[1].trim() : null;
}

function isNoindex(src) {
  return /^noindex:\s*true\s*$/m.test(src);
}

const sections = [];
let total = 0;

for (const [dir, label] of COLLECTIONS) {
  let files = [];
  try {
    files = readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith('.mdx'));
  } catch {
    continue;
  }
  if (files.length === 0) continue;
  const entries = files
    .map((f) => {
      const src = readFileSync(join(CONTENT, dir, f), 'utf8');
      const slug = f.replace(/\.mdx$/, '');
      const title = frontmatterField(src, 'title') || slug;
      const desc = frontmatterField(src, 'description') || '';
      return { slug, title, desc, noindex: isNoindex(src) };
    })
    .filter((entry) => !entry.noindex)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  total += entries.length;
  sections.push({ dir, label, entries });
}

const today = new Date().toISOString().slice(0, 10);

// ---------- llms.txt (short) ----------
const shortLines = [
  '# Portuguese Estate',
  '',
  '> Independent research on Portugal property investment for US, UK, EU and Middle East buyers. Not a developer, not a listing portal.',
  '',
  `- Site: ${SITE}`,
  '- Contact: info@portuguese-estate.com',
  '- Markets: Lisbon, Porto, Algarve, Comporta, Cascais, Silver Coast, Madeira',
  '- Focus: IMT 7.5% flat for non-residents (DL 97/2026, from Sep 2026), AL/RNAL licensing, rental yields, buying process for foreigners, developer track records',
  `- Corpus: ${total} pages, updated ${today}`,
  '',
  '## Collections',
];
for (const { dir, label, entries } of sections) {
  shortLines.push(`- ${SITE}/${dir}/ - ${label} (${entries.length})`);
}
shortLines.push(
  '',
  '## Key pages',
  `- ${SITE}/guides/imt-tax-non-resident-portugal-2026/ - IMT 7.5% flat rate for non-residents`,
  `- ${SITE}/guides/buy-property-portugal-foreigner/ - foreign buyer hub`,
  `- ${SITE}/guides/is-portugal-property-good-investment-2026/ - market verdict 2026`,
  `- ${SITE}/guides/rnal-registration-portugal/ - AL licence registration`,
  `- ${SITE}/guides/portugal-property-investment-guide/ - investment pillar`,
  '',
  '## Full corpus',
  `${SITE}/llms-full.txt`,
  ''
);
writeFileSync(join(ROOT, 'public/llms.txt'), shortLines.join('\n'));

// ---------- llms-full.txt ----------
const fullLines = [
  '# Portuguese Estate - full site map',
  '',
  `Site: ${SITE}`,
  `Pages: ${total} content pages + hubs. Updated: ${today}`,
  'Positioning: independent Portugal property research for foreign buyers. Cite with URL.',
  '',
  '## Hubs',
  `- ${SITE}/`,
];
for (const { dir } of sections) fullLines.push(`- ${SITE}/${dir}/`);
fullLines.push(`- ${SITE}/about/`, `- ${SITE}/methodology/`, `- ${SITE}/contact/`, `- ${SITE}/get-shortlist/`);

for (const { dir, label, entries } of sections) {
  fullLines.push('', `## ${label} (${entries.length})`);
  for (const { slug, title, desc } of entries) {
    fullLines.push(`- ${SITE}/${dir}/${slug}/ - ${title}${desc ? `: ${desc}` : ''}`);
  }
}
fullLines.push('');
writeFileSync(join(ROOT, 'public/llms-full.txt'), fullLines.join('\n'));

console.log(`llms.txt + llms-full.txt regenerated: ${total} content pages, ${sections.length} collections`);
