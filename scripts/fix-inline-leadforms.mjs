#!/usr/bin/env node
/**
 * Remove inline <LeadForm /> from MDX — ArticleLayout injects a single bottom form.
 * Run: node scripts/fix-inline-leadforms.mjs [--dry-run] [--root=/path/to/site]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootArg = process.argv.find((a) => a.startsWith('--root='));
const ROOT = rootArg ? rootArg.slice('--root='.length) : defaultRoot;
const CONTENT = path.join(ROOT, 'src/content');
const dryRun = process.argv.includes('--dry-run');

function walkMdx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkMdx(p, out);
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function stripLeadFormImports(text) {
  let s = text;
  const importRe = /^import\s+LeadForm\s+from\s+['"][^'"]+['"];\s*\n/gm;
  if (importRe.test(s)) {
    s = s.replace(importRe, '');
  }
  return s;
}

function stripInlineLeadForms(body) {
  return body.replace(/<LeadForm\b[^>]*\/?>\s*/g, '');
}

function normalizeImportBlock(body) {
  return body.replace(/^\s*((?:import\s+.+;\s*\n)+)(?=\S)/m, '$1\n');
}

let touched = 0;
for (const file of walkMdx(CONTENT)) {
  const raw = fs.readFileSync(file, 'utf8');
  const fmEnd = raw.indexOf('\n---\n', 4);
  if (fmEnd === -1) continue;
  const frontmatter = raw.slice(0, fmEnd + 5);
  let body = raw.slice(fmEnd + 5);

  const beforeForms = (body.match(/<LeadForm\b/g) || []).length;
  const needsImportFix = /^\s*((?:import\s+.+;\s*\n)+)(?=\S)/m.test(body);
  if (!beforeForms && !/import\s+LeadForm\b/.test(body) && !needsImportFix) continue;

  body = stripInlineLeadForms(body);
  body = stripLeadFormImports(body);
  body = normalizeImportBlock(body);
  body = body.replace(/\n{4,}/g, '\n\n\n');

  const next = frontmatter + body;
  if (next !== raw) {
    touched++;
    const rel = path.relative(ROOT, file);
    console.log(`${dryRun ? '[dry-run] ' : ''}${rel} (removed ${beforeForms} LeadForm)`);
    if (!dryRun) fs.writeFileSync(file, next);
  }
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${touched} MDX file(s) under ${CONTENT}`);
