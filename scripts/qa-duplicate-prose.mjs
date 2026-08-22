#!/usr/bin/env node
/**
 * Cross-page duplicate prose gate.
 *
 * A reader who lands on two area pages and meets the same paragraph twice learns
 * that the site generates rather than writes. Search engines draw the same
 * conclusion. This counts paragraphs that appear, near-identically, on more than
 * one page, and fails when any single paragraph exceeds the allowed spread.
 *
 * Numbers are normalised out before comparison, so "48 days versus 31" and
 * "39 days versus 48" collapse to the same template and are caught.
 *
 *   node scripts/qa-duplicate-prose.mjs [--max 2] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'src/content');
const args = process.argv.slice(2);
const maxIdx = args.indexOf('--max');
/** A paragraph may legitimately recur on two closely related pages, never more. */
const MAX_PAGES = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 2;
const jsonOut = args.includes('--json');
const MIN_WORDS = 12;

const groups = new Map();

for (const coll of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, coll);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const body = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^---\n[\s\S]*?\n---/, '');
    for (const raw of body.split(/\n{2,}/)) {
      const para = raw.trim();
      if (!para) continue;
      // Headings, tables, components and imports are structure, not prose.
      if (/^(#{1,6}\s|\||<|import\s)/.test(para)) continue;
      if (para.split(/\s+/).length < MIN_WORDS) continue;
      const key = para
        .toLowerCase()
        .replace(/[€$£]?\d[\d.,]*%?/g, '#')
        .replace(/[^a-z# ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!groups.has(key)) groups.set(key, { sample: para, pages: [] });
      groups.get(key).pages.push(`${coll}/${file.replace(/\.mdx$/, '')}`);
    }
  }
}

const shared = [...groups.values()].filter((g) => new Set(g.pages).size > 1);
const failures = shared.filter((g) => new Set(g.pages).size > MAX_PAGES);
const instances = shared.reduce((sum, g) => sum + g.pages.length, 0);

if (jsonOut) {
  console.log(JSON.stringify({ shared: shared.length, instances, failures: failures.length, max: MAX_PAGES }, null, 2));
} else {
  console.log('\n=== DUPLICATE PROSE GATE ===');
  console.log(`Shared paragraph groups: ${shared.length} (${instances} instances)`);
  console.log(`Limit: a paragraph may appear on at most ${MAX_PAGES} pages`);
  if (!failures.length) {
    console.log('✅ PASS — no paragraph exceeds the limit\n');
  } else {
    console.log(`❌ FAIL — ${failures.length} paragraph(s) over the limit\n`);
    for (const g of failures.sort((a, b) => b.pages.length - a.pages.length).slice(0, 20)) {
      console.log(`  [${new Set(g.pages).size} pages] ${g.sample.slice(0, 100).replace(/\n/g, ' ')}`);
      console.log(`      ${[...new Set(g.pages)].slice(0, 6).join(', ')}`);
    }
    console.log('');
  }
}

process.exit(failures.length ? 1 : 0);
