#!/usr/bin/env node
/**
 * Remove bulk "More guides for {Project}" sections with Related guide 1-6 placeholders.
 * ArticleLayout already renders RelatedGuides from relatedSlugs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const dryRun = process.argv.includes('--dry-run');

const BLOCK_RE =
  /\n## More guides for[^\n]+\n+(?:- \[Related guide \d+\]\([^)]+\)\n*)+/g;

function walkMdx(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkMdx(p, out);
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

let touched = 0;
for (const file of walkMdx(CONTENT)) {
  const raw = fs.readFileSync(file, 'utf8');
  if (!BLOCK_RE.test(raw)) continue;
  BLOCK_RE.lastIndex = 0;
  const next = raw.replace(BLOCK_RE, '\n').replace(/\n{4,}/g, '\n\n\n');
  if (next === raw) continue;
  touched++;
  console.log(`${dryRun ? '[dry-run] ' : ''}${path.relative(ROOT, file)}`);
  if (!dryRun) fs.writeFileSync(file, next);
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${touched} file(s)`);
