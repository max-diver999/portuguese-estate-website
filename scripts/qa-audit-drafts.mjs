#!/usr/bin/env node
/** QA audit for _drafts/wave8-10 — Tier A gate before publish move */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT = join(ROOT, '_drafts/wave8-10');
const LIVE = join(ROOT, 'src/content');

const BANNED = [
  'Regional diversification', 'Advanced investment strategies', 'Operational excellence',
  'Comprehensive framework', 'Future outlook', '[VERIFY]', 'Knowledge base', 'family office',
  'sophisticated investors', 'sophisticated investor',
];

const MIN = { guides: 2000, compare: 1800, projects: 1400, developers: 1200, news: 600 };

function slugs(dir) {
  const m = new Set();
  for (const c of readdirSync(dir)) {
    const p = join(dir, c);
    if (!statSync(p).isDirectory()) continue;
    for (const f of readdirSync(p)) if (f.endsWith('.mdx')) m.add(f.replace('.mdx', ''));
  }
  return m;
}

const live = slugs(LIVE);
const draft = slugs(DRAFT);
const valid = new Set([...live, ...draft]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const issues = [];

for (const path of walk(DRAFT)) {
  const coll = path.split('/wave8-10/')[1].split('/')[0];
  const slug = path.split('/').pop().replace('.mdx', '');
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { issues.push(`${slug}: NO frontmatter`); continue; }
  const [fm, body] = [m[1], m[2]];
  const words = body.split(/\s+/).filter(Boolean).length;
  const prob = [];

  if (words < (MIN[coll] || 1200)) prob.push(`words:${words}<${MIN[coll]}`);
  if (!/quick answer|tl;dr/i.test(body)) prob.push('no-quick-answer');
  if (/<\d|[\s|]>\d/.test(body)) prob.push('mdx-angle');
  if (/faqs=\{/.test(body)) prob.push('FaqBlock-faqs');

  const desc = (fm.match(/^description:\s*["']?(.+?)["']?\s*$/m) || [])[1]?.replace(/^["']|["']$/g, '') || '';
  if (desc.length > 160) prob.push(`desc:${desc.length}`);
  if (desc.length < 100 && coll !== 'news') prob.push(`descShort:${desc.length}`);

  const title = (fm.match(/^title:\s*["']?(.+?)["']?\s*$/m) || [])[1]?.replace(/^["']|["']$/g, '') || '';
  if (title.length < 45 || title.length > 65) prob.push(`title:${title.length}`);

  const faq = (fm.match(/^\s*-\s*question:/gm) || []).length;
  if (faq < (coll === 'news' ? 3 : 5)) prob.push(`faq:${faq}`);

  const internal = [...body.matchAll(/\]\(\/(guides|compare|areas|projects|developers|news)\/([a-z0-9\-]+)\/?\)/gi)];
  if (internal.length < 5) prob.push(`intLinks:${internal.length}`);
  const broken = [...new Set(internal.map((x) => x[2]).filter((s) => !valid.has(s)))];
  if (broken.length) prob.push(`broken:${broken.join('|')}`);

  if ((body.match(/^\|/gm) || []).length < 6) prob.push('tables<6rows');

  for (const b of BANNED) if (body.includes(b) || fm.includes(b)) prob.push(`banned:${b.slice(0, 20)}`);

  if (/\n    - /.test(fm)) prob.push('yaml-nested-relatedSlugs');

  if (prob.length) issues.push(`[${coll}/${slug}] (${words}w) ${prob.join(', ')}`);
}

console.log('=== DRAFT TIER A QA ===');
console.log(`Files: ${walk(DRAFT).length}`);
console.log(`Clean: ${walk(DRAFT).length - issues.length}/${walk(DRAFT).length}`);
if (issues.length) {
  console.log('\nISSUES:');
  for (const i of issues) console.log(i);
  process.exit(1);
}
console.log('\n✅ Tier A draft QA PASSED');
