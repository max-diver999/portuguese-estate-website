import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const ALLOWED_KEYS = new Set(['title','description','pubDate','updatedDate','author','category','tags','heroImage','readingTime','relatedSlugs','noindex','faq','featured','segment']);
const bad = [];
for (const c of ['guides', 'compare']) {
  const dir = join(ROOT, c);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) { bad.push([`${c}/${f}`, 'no delimiters']); continue; }
    const fm = m[1];
    const body = raw.slice(m[0].length).trim();
    // signs body leaked into frontmatter: markdown lines inside FM
    const leak = /^\s*(#|>|\*\*|\| )/m.test(fm) || /\bTL;DR\b|Quick answer/i.test(fm);
    if (leak) bad.push([`${c}/${f}`, 'BODY LEAKED into frontmatter']);
    else if (body.length < 200) bad.push([`${c}/${f}`, `body too short (${body.length})`]);
    // unknown top-level key (typo / merged)
    const topKeys = [...fm.matchAll(/^([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((x)=>x[1]);
    const unknown = topKeys.filter((k)=>!ALLOWED_KEYS.has(k));
    if (unknown.length) bad.push([`${c}/${f}`, `unknown FM keys: ${unknown.join(',')}`]);
  }
}
console.log(`SUSPECT FILES: ${bad.length}`);
for (const [f, e] of bad) console.log(`  ${f}  ::  ${e}`);
