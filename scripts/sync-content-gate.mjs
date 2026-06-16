#!/usr/bin/env node
/**
 * MORE Group — sync shared content-gate from the single template source.
 *
 * Copies the canonical files from 08_Идеи/_templates/scripts/ into THIS site's
 * scripts/ so every site runs the exact same checks and queue. Run from a site
 * root: `npm run sync:content-gate`.
 *
 * Synced files (template -> site):
 *   scripts/lib/more-content-gate.mjs
 *   scripts/audit-rendered-live.mjs
 *   scripts/fix-inline-leadforms.mjs
 *   scripts/fix-placeholder-related-guides.mjs
 *   scripts/fix-batch-queue.mjs
 *   scripts/refresh-protected-slugs.mjs
 *   scripts/fix-content-card.mjs
 *   scripts/lib/fix-batch-validate.mjs
 *   scripts/sync-content-gate.mjs   (self, so the command stays up to date)
 *
 * NOT synced (intentionally per-site, hand-tuned):
 *   validate-content-quality.mjs (EN vs RU collections, legacy exempt lists)
 *   audit-p0-quality.mjs / qa-audit.mjs
 *   protected-content-slugs.json (per-site GSC data)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SITE_ROOT = process.cwd();

function findTemplateRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, '08_Идеи', '_templates', 'scripts');
    if (existsSync(join(candidate, 'fix-batch-queue.mjs'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const TPL = findTemplateRoot(SITE_ROOT) || findTemplateRoot(resolve(SITE_ROOT, '..'));
if (!TPL) {
  console.error('[sync] template root not found (08_Идеи/_templates/scripts). Run from a site under MORE_Group.');
  process.exit(1);
}

const jobs = [
  ['lib/more-content-gate.mjs', 'scripts/lib/more-content-gate.mjs'],
  ['lib/fix-batch-validate.mjs', 'scripts/lib/fix-batch-validate.mjs'],
  ['audit-rendered-live.mjs', 'scripts/audit-rendered-live.mjs'],
  ['fix-inline-leadforms.mjs', 'scripts/fix-inline-leadforms.mjs'],
  ['fix-placeholder-related-guides.mjs', 'scripts/fix-placeholder-related-guides.mjs'],
  ['fix-batch-queue.mjs', 'scripts/fix-batch-queue.mjs'],
  ['fix-content-card.mjs', 'scripts/fix-content-card.mjs'],
  ['refresh-protected-slugs.mjs', 'scripts/refresh-protected-slugs.mjs'],
  ['sync-content-gate.mjs', 'scripts/sync-content-gate.mjs'],
];

let copied = 0;
let unchanged = 0;
for (const [from, to] of jobs) {
  const src = join(TPL, from);
  const dest = join(SITE_ROOT, to);
  if (!existsSync(src)) {
    console.warn(`[sync] skip missing template: ${from}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const same = existsSync(dest) && readFileSync(src, 'utf8') === readFileSync(dest, 'utf8');
  if (same) {
    unchanged += 1;
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[sync] updated ${to}`);
  copied += 1;
}

console.log(`[sync] done — ${copied} updated, ${unchanged} already current (source: ${TPL})`);
