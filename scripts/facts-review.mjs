#!/usr/bin/env node
/**
 * Review calendar for claims about jurisdictions we do not monitor.
 *
 * The corpus carried last year's City of Cape Town rates on thirty pages until
 * somebody happened to look. That was a figure with a published South African
 * source we can check on demand. The Portuguese State Budget, the Mauritian
 * Economic Development Board and UAE tax practice have no such watcher on this
 * project, so a stale figure there would sit on the site indefinitely with an
 * asOf date quietly asserting it was current.
 *
 * This makes that failure loud instead. Every claim in
 * .content-os/external-claims.json carries a reviewBy date; once one passes,
 * this exits non-zero. It also checks that each claim's listed files still
 * exist, so a claim left behind by a rewrite is pruned rather than reviewed
 * forever.
 *
 *   node scripts/facts-review.mjs            report and fail on anything overdue
 *   node scripts/facts-review.mjs --soon 60  also warn on claims due within N days
 *   node scripts/facts-review.mjs --json     machine-readable
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = path.join(REPO, '.content-os/external-claims.json');
const CONTENT = path.join(REPO, 'src/content');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const soonIdx = args.indexOf('--soon');
const soonDays = soonIdx !== -1 ? Number(args[soonIdx + 1]) : 45;

if (!fs.existsSync(REGISTER)) {
  console.error(`missing ${path.relative(REPO, REGISTER)}`);
  process.exit(2);
}

const register = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
const claims = Array.isArray(register.claims) ? register.claims : [];
const today = new Date(process.env.FACTS_REVIEW_TODAY || Date.now());
const day = 86_400_000;

const overdue = [];
const soon = [];
const malformed = [];
const orphaned = [];

for (const c of claims) {
  const where = c.id || c.claim?.slice(0, 40) || '(unnamed)';
  if (!c.claim || !c.source || !/^\d{4}-\d{2}-\d{2}$/.test(c.reviewBy || '') || !/^\d{4}-\d{2}-\d{2}$/.test(c.asOf || '')) {
    malformed.push({ id: where, why: 'needs claim, source, and ISO asOf and reviewBy dates' });
    continue;
  }
  const missing = (c.files || []).filter((f) => !fs.existsSync(path.join(CONTENT, f)));
  if (missing.length) orphaned.push({ id: where, missing });

  const days = Math.round((new Date(c.reviewBy) - today) / day);
  if (days < 0) overdue.push({ ...c, days });
  else if (days <= soonDays) soon.push({ ...c, days });
}

if (asJson) {
  console.log(JSON.stringify({ total: claims.length, overdue, soon, malformed, orphaned }, null, 2));
} else {
  console.log(`=== external claims review (${claims.length} claims) ===`);
  const byJ = {};
  for (const c of claims) byJ[c.jurisdiction || '?'] = (byJ[c.jurisdiction || '?'] || 0) + 1;
  console.log(`jurisdictions: ${Object.entries(byJ).map(([k, v]) => `${k} ${v}`).join(', ')}`);

  for (const [label, list] of [['OVERDUE', overdue], [`due within ${soonDays} days`, soon]]) {
    if (!list.length) continue;
    console.log(`\n${label}:`);
    for (const c of list) {
      console.log(`  [${c.jurisdiction}] ${c.id}  reviewBy ${c.reviewBy} (${c.days < 0 ? `${-c.days} days ago` : `in ${c.days} days`})`);
      console.log(`      ${c.claim.slice(0, 150)}${c.claim.length > 150 ? '…' : ''}`);
      console.log(`      source: ${c.source}`);
      console.log(`      files:  ${(c.files || []).join(', ') || '(none listed)'}`);
    }
  }
  if (malformed.length) {
    console.log('\nMALFORMED:');
    for (const m of malformed) console.log(`  ${m.id}: ${m.why}`);
  }
  if (orphaned.length) {
    console.log('\nfiles listed but not found (prune the claim or fix the path):');
    for (const o of orphaned) console.log(`  ${o.id}: ${o.missing.join(', ')}`);
  }
  if (!overdue.length && !malformed.length) {
    console.log(`\n✅ nothing overdue. Next review: ${claims.map((c) => c.reviewBy).sort()[0]}`);
  }
}

if (overdue.length || malformed.length) {
  if (!asJson) {
    console.log(
      `\n❌ ${overdue.length} claim(s) overdue, ${malformed.length} malformed.\n` +
        '   Re-read the primary source, then either move asOf and reviewBy forward or correct every file listed.',
    );
  }
  process.exit(1);
}
