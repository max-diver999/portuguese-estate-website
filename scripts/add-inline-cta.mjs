#!/usr/bin/env node
/**
 * Adds an InlineCta mid-article to every areas/ and guides/ MDX that lacks one.
 * Inserts before the 4th H2 (or the middle H2 for short files).
 * Usage: node scripts/add-inline-cta.mjs [--dry]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const dry = process.argv.includes('--dry');

const IMPORT_LINE = "import InlineCta from '../../components/InlineCta.astro';";

function areaName(slug) {
  const base = slug
    .replace(/-property-investment-guide$/, '')
    .replace(/-property-investment$/, '')
    .replace(/-investment-guide$/, '')
    .replace(/-property$/, '');
  return base
    .split('-')
    .map((w) => (w === 'de' || w === 'das' || w === 'da' ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function ctaFor(collection, slug) {
  if (collection === 'areas') {
    const name = areaName(slug);
    return `<InlineCta
  headline="Want a ${name} shortlist matched to your budget?"
  subtext="Tell us budget, financing and rental goal. We send ${name} options with price per m2, yield math and licence status within one business day."
  ctaId="area_mid_${slug.replace(/-/g, '_')}"
  whatsappMessage="Hi Portuguese Estate! I'm researching ${name} property and I'd like a shortlist matched to my budget."
/>`;
  }
  return `<InlineCta
  headline="Want this modelled for your own numbers?"
  subtext="Share budget, nationality and target region. We reply with a shortlist plus the cost and yield math behind it within one business day."
  ctaId="guide_mid_${slug.replace(/-/g, '_')}"
  whatsappMessage="Hi Portuguese Estate! I read your guide and I'd like a shortlist plus cost breakdown for my budget."
/>`;
}

let changed = 0;
let skipped = 0;

for (const collection of ['areas', 'guides']) {
  const dir = join(ROOT, 'src/content', collection);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const path = join(dir, file);
    let src = readFileSync(path, 'utf8');
    if (src.includes('InlineCta')) {
      skipped++;
      continue;
    }
    const slug = file.replace(/\.mdx$/, '');

    // 1. import after the last existing import
    const importMatches = [...src.matchAll(/^import .*;$/gm)];
    if (importMatches.length === 0) {
      console.error(`SKIP (no imports): ${collection}/${file}`);
      continue;
    }
    const lastImport = importMatches[importMatches.length - 1];
    const importEnd = lastImport.index + lastImport[0].length;
    src = src.slice(0, importEnd) + '\n' + IMPORT_LINE + src.slice(importEnd);

    // 2. insert CTA before a mid-article H2
    const h2s = [...src.matchAll(/^## .*$/gm)];
    if (h2s.length < 3) {
      console.error(`SKIP (<3 H2s): ${collection}/${file}`);
      continue;
    }
    const target = h2s[Math.min(3, Math.floor(h2s.length / 2))];
    const block = ctaFor(collection, slug) + '\n\n';
    src = src.slice(0, target.index) + block + src.slice(target.index);

    if (!dry) writeFileSync(path, src);
    changed++;
  }
}

console.log(`${dry ? '[dry] ' : ''}InlineCta added: ${changed}, already had: ${skipped}`);
