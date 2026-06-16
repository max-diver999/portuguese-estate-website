#!/usr/bin/env node
/**
 * Bulk human-signal cleanup: em dashes, duplicate padding H2 blocks.
 * Run: node scripts/fix-human-corpus-signals.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EM_DASH_LIMIT,
  analyzeHumanSignals,
  humanizeBodyLines,
  humanizeFrontmatter,
  forceUnderEmLimit,
  parseMdx,
} from './lib/human-signals.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const dryRun = process.argv.includes('--dry-run');

const DEDUPE_HEADINGS = [
  'What to verify next',
  'Closing verification checklist',
  'Red flags and buyer checklist',
  'Buyer scenarios for',
];

function walkMdx(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkMdx(p, out);
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function collectionFor(rel) {
  const m = rel.match(/^src\/content\/([^/]+)\//);
  return m ? m[1] : 'default';
}

/** Keep first H2 block per prefix; for Closing checklist keep last (longest padding). */
function dedupePaddingBlocks(body) {
  let out = body;
  for (const prefix of DEDUPE_HEADINGS) {
    const re = new RegExp(
      `(\\n## ${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n)([\\s\\S]*?)(?=\\n## |\\n<FaqBlock|\\n\\*[^\\n]|$)`,
      'g',
    );
    const matches = [...out.matchAll(re)];
    if (matches.length <= 1) continue;
    const keep = matches[matches.length - 1];
    out = out.replace(re, (full, heading, content) => {
      if (full === keep[0]) return full;
      return '';
    });
  }
  return out.replace(/\n{4,}/g, '\n\n\n');
}

let touched = 0;
let linePatches = 0;
let stillHeavy = 0;

for (const abs of walkMdx(CONTENT)) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = parseMdx(raw);
  let { fm, body } = parsed;
  const origFm = fm;
  const origBody = body;
  const coll = collectionFor(rel);
  const emLimit = EM_DASH_LIMIT[coll] ?? EM_DASH_LIMIT.default;

  body = dedupePaddingBlocks(body);

  const fmHuman = humanizeFrontmatter(fm);
  fm = fmHuman.fm;
  linePatches += fmHuman.changed;

  let newBody = body.replace(/\{\/\* corpus:[^*]+ \*\/\}\n?/g, '');

  for (let pass = 0; pass < 4; pass++) {
    const { body: patched, changed } = humanizeBodyLines(newBody, { includeTables: true });
    newBody = patched;
    linePatches += changed;
    const after = analyzeHumanSignals(newBody, { emLimit });
    if (
      after.emPer500 <= emLimit &&
      after.issues.every((i) => !['em-dash-heavy', 'scenario-spam', 'list-dash-steps'].includes(i.kind))
    ) {
      break;
    }
    if (changed === 0) break;
  }

  let after = analyzeHumanSignals(newBody, { emLimit });
  if (after.emPer500 > emLimit) {
    newBody = forceUnderEmLimit(newBody, emLimit);
    after = analyzeHumanSignals(newBody, { emLimit });
  }

  if (newBody === origBody && fm === origFm) continue;
  touched++;
  if (!dryRun) fs.writeFileSync(abs, fm ? `---\n${fm}\n---\n${newBody}` : newBody);
  if (after.issues.some((i) => ['em-dash-heavy', 'scenario-spam', 'list-dash-steps'].includes(i.kind))) {
    stillHeavy++;
    console.log(`still ${after.issues.map((i) => i.kind).join(', ')} | ${rel}`);
  }
}

console.log(`\n${dryRun ? '[dry-run] ' : ''}Updated ${touched} files, ${linePatches} line patches, ${stillHeavy} still over em limit`);
