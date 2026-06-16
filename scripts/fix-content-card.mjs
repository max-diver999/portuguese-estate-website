#!/usr/bin/env node
/**
 * MORE Group — article card for fix-batch (content_enforcement.mdc format).
 *
 * Combines fix:queue row + validate:strict in one command.
 *
 * Usage:
 *   npm run fix:card -- --slug proof-of-funds-thailand-property
 *   npm run fix:card -- --slug proof-of-funds-thailand-property --collection guides
 *   npm run fix:card -- --slug foo --json
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectSiteUrl,
  runStrictValidate,
  suggestFableVerdict,
  validatorOnlyHints,
} from './lib/fix-batch-validate.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const slug = opt('--slug', null);
const collection = opt('--collection', null);
const jsonOut = args.includes('--json');

if (!slug) {
  console.error('Usage: npm run fix:card -- --slug <slug> [--collection guides] [--json]');
  process.exit(1);
}

function loadQueueRow() {
  const queueArgs = [
    join(SCRIPT_DIR, 'fix-batch-queue.mjs'),
    '--json',
    '--slug',
    slug,
    '--limit',
    '1',
  ];
  if (collection) queueArgs.push('--collection', collection);

  const stdout = execFileSync('node', queueArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rows = JSON.parse(stdout);
  if (!rows.length) {
    console.error(`[fix:card] slug not found: ${slug}${collection ? ` in ${collection}` : ''}`);
    process.exit(1);
  }
  return rows[0];
}

const row = loadQueueRow();
const fileRel = `src/content/${row.coll}/${row.slug}.mdx`;
const validation = runStrictValidate(ROOT, fileRel);
const siteUrl = detectSiteUrl(ROOT) || 'https://[site]';
const publicUrl = `${siteUrl}${row.url}`;
const strictRequired = row.tier === 'A' || row.gscProtected;
const validateLabel = validation.pass ? 'pass' : 'fail';
const fable = suggestFableVerdict({
  tier: row.tier,
  gscProtected: row.gscProtected,
  validatePass: validation.pass,
});

const card = {
  url: publicUrl,
  validate: validateLabel,
  validateMode: strictRequired ? 'validate:strict' : 'validate:content',
  queueReady: row.ready ? 'yes' : 'no',
  auditScore: row.score,
  tier: row.tier,
  gscProtected: row.gscProtected ? 'yes' : 'no',
  cheapFixRounds: 0,
  opusEscalation: 'no',
  fableVerdict: fable.verdict,
  fableReason: fable.reason,
  queueIssues: row.issues,
  validateErrors: validation.errors,
  validatorOnly: validation.pass
    ? []
    : validatorOnlyHints(validation.errors).filter((h) => !row.issues.includes(h)),
  file: fileRel,
};

if (jsonOut) {
  console.log(JSON.stringify(card, null, 2));
  process.exit(validation.pass && row.ready ? 0 : 1);
}

console.log(`
URL: ${card.url}
VALIDATE: ${card.validate} (${card.validateMode})
QUEUE_READY: ${card.queueReady}
AUDIT_SCORE: ${card.auditScore}/100
TIER: ${card.tier}
GSC_PROTECTED: ${card.gscProtected}
CHEAP_FIX_ROUNDS: ${card.cheapFixRounds}
OPUS_ESCALATION: ${card.opusEscalation}
FABLE_VERDICT: ${card.fableVerdict}
FABLE_REASON: ${card.fableReason}
`);

if (card.queueIssues.length) {
  console.log('Queue blockers:', card.queueIssues.join(', '));
}
if (card.validateErrors.length) {
  console.log('\nvalidate:strict errors:');
  for (const e of card.validateErrors.slice(0, 15)) console.log(`  - ${e}`);
  if (card.validateErrors.length > 15) {
    console.log(`  ... +${card.validateErrors.length - 15} more`);
  }
}
if (card.validatorOnly.length) {
  console.log('\nValidator-only (queue drift):', card.validatorOnly.join(', '));
}

if (!validation.pass) {
  console.log('\n→ Чинить cheap до validate:strict pass. Максиму не показывать.');
  process.exit(1);
}
if (!row.ready) {
  console.log('\n→ validate pass, но queue_ready=no — проверь расхождение (`fix:queue --verify`).');
  process.exit(1);
}
console.log('\n→ Карточка готова к показу Максиму (ответ: ок / fable на URL / доработай cheap).');
