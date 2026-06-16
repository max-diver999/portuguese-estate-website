#!/usr/bin/env node
/**
 * Corpus signal gate — catches what validate:content alone misses.
 * Exit 1 on: em-dash overload, duplicate padding H2s, MDX hard-fail patterns, fix-queue blockers.
 *
 * Usage: node scripts/qa-corpus-signals.mjs [--json]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  EM_DASH_LIMIT,
  analyzeHumanSignals,
} from './lib/human-signals.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'src/content');
const jsonOut = process.argv.includes('--json');

const PADDING_H2 = [
  'What to verify next',
  'Closing verification checklist',
  'Red flags and buyer checklist',
  'Buyer scenarios for',
];

const MDX_GREP_CHECKS = [
  { id: 'mdx-angle', pattern: /<[0-9]/, label: 'MDX angle bracket (<5)' },
  { id: 'faqs-prop', pattern: /faqs=\{/, label: 'FaqBlock faqs={ instead of items=' },
  { id: 'draft-marker', pattern: /\[VERIFY\]|TODO|Knowledge base|KB §/, label: 'draft marker' },
  { id: 'fm-import-bug', pattern: /^---import/m, label: '---import frontmatter bug' },
  { id: 'tldr-escape', pattern: /TldrBlock text="[^"]*\\"/, label: 'TldrBlock escaped quotes' },
];

function listAllMdx() {
  const out = [];
  if (!existsSync(CONTENT)) return out;
  for (const coll of readdirSync(CONTENT)) {
    const dir = join(CONTENT, coll);
    try {
      if (!readdirSync(dir).some((f) => f.endsWith('.mdx'))) continue;
    } catch {
      continue;
    }
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
      out.push({ coll, path: join(dir, f), slug: f.replace(/\.mdx$/, '') });
    }
  }
  return out;
}

function parseBody(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? raw.slice(m[0].length) : raw;
}

function countH2(body, prefix) {
  const re = new RegExp(`^## ${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gm');
  return (body.match(re) || []).length;
}

const failures = [];

for (const { coll, path, slug } of listAllMdx()) {
  const raw = readFileSync(path, 'utf8');
  const body = parseBody(raw);
  const rel = `src/content/${coll}/${slug}.mdx`;
  const emLimit = EM_DASH_LIMIT[coll] ?? EM_DASH_LIMIT.default;

  const human = analyzeHumanSignals(body, { emLimit });
  for (const issue of human.issues) {
    failures.push({ kind: issue.kind, file: rel, detail: issue.detail });
  }

  for (const prefix of PADDING_H2) {
    const n = countH2(body, prefix);
    if (n > 1) {
      failures.push({
        kind: 'duplicate-padding-h2',
        file: rel,
        detail: `"## ${prefix}" appears ${n} times (max 1)`,
      });
    }
  }

  for (const check of MDX_GREP_CHECKS) {
    if (check.pattern.test(raw)) {
      failures.push({ kind: check.id, file: rel, detail: check.label });
    }
  }
}

const fq = spawnSync('node', ['scripts/fix-batch-queue.mjs', '--json', '--not-ready', '--limit', '500'], {
  cwd: ROOT,
  encoding: 'utf8',
});
let notReady = [];
if (fq.status === 0 && fq.stdout) {
  try {
    notReady = JSON.parse(fq.stdout);
  } catch {
    failures.push({ kind: 'fix-queue-parse', file: 'scripts/fix-batch-queue.mjs', detail: 'invalid JSON' });
  }
}
for (const row of notReady) {
  failures.push({
    kind: 'fix-queue-blocker',
    file: `src/content/${row.coll}/${row.slug}.mdx`,
    detail: (row.issues || []).join(', '),
  });
}

const apiDir = join(ROOT, 'src/pages/api');
if (existsSync(apiDir)) {
  for (const f of readdirSync(apiDir).filter((x) => x.endsWith('.ts'))) {
    const api = readFileSync(join(apiDir, f), 'utf8');
    if (!/export const prerender = false/.test(api)) {
      failures.push({
        kind: 'api-prerender',
        file: `src/pages/api/${f}`,
        detail: 'missing export const prerender = false',
      });
    }
  }
}

const summary = {
  files: listAllMdx().length,
  failures: failures.length,
  byKind: failures.reduce((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {}),
  items: failures,
};

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\n=== CORPUS SIGNALS GATE ===');
  console.log(`MDX scanned: ${summary.files}`);
  if (!failures.length) {
    console.log('✅ PASS — em-dash, padding dupes, fix-queue, MDX patterns OK\n');
  } else {
    console.log(`❌ FAIL — ${failures.length} issue(s)\n`);
    for (const [k, n] of Object.entries(summary.byKind).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}× ${k}`);
    }
    console.log('');
    for (const f of failures.slice(0, 30)) {
      console.log(`  ${f.file}: ${f.detail}`);
    }
    if (failures.length > 30) console.log(`  … +${failures.length - 30} more`);
    console.log('');
  }
}

process.exit(failures.length ? 1 : 0);
