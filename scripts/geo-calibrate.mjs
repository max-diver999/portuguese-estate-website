#!/usr/bin/env node
/**
 * Calibration harness for the GEO scorer.
 *
 * The point of this file is that a scoring rubric is a hypothesis, and a
 * hypothesis needs a test set. Ours is labelled by history:
 *
 *   bad/  fifteen AREA pages as they stood at commit 932f3af, the end of a run of
 *         mass-injection commits: citability blocks pasted under every H2
 *         (932f3af, e5508e2), worked cash-to-close blocks stamped into 19 area
 *         guides (ece70b6), answer-first openers extended across 53 files
 *         (faa6cad, c504876). At that point the corpus also still carried the
 *         fabricated first-hand claims ("in our experience across Lisbon,
 *         Cascais and the Algarve") that were removed a day later. The old
 *         rubric scored this state 90/100.
 *   FIRST ATTEMPT, RECORDED BECAUSE IT WAS WRONG. The bad set was originally
 *         drawn from src/content/guides, following the reference implementation
 *         literally. On this site that samples the CLEANEST collection: guides
 *         average 22.6 against 0.0 for every one of the 26 area pages. Measured,
 *         bad came out at mean 34.7 / max 44 and separation 17.7, and the
 *         obvious reading - "the scorer does not work here" - was wrong. The
 *         machine templating on this site lives in areas, segments and compare,
 *         so that is where the garbage label has to be drawn from. Moving it
 *         there, with nothing else changed, took the same fifteen-file set to
 *         mean 0.0 / max 0 and separation 59.1.
 *   good/ the 15 guides composed sentence by sentence in-session, Wave 1
 *         (2d3b5ef) and Wave 2 (008ef33). None of them existed at 932f3af, so
 *         the sets do not overlap. Note the honest limit recorded in
 *         docs/GEO-SCORING.md: this repository contains no human-written text
 *         at all, so "good" means hand-composed rather than generated, not
 *         human-authored.
 *   mid/  seven June-generated guides that were cleaned editorially but never
 *         rewritten. Each appears in bad/ too, in its pre-cleanup state, which
 *         makes this the sharpest available test: the same article, before and
 *         after the cleanup, should not score the same.
 *
 * A rubric is only worth shipping if it separates bad from good. Run:
 *   node scripts/geo-calibrate.mjs --prepare      # rebuild the labelled sets
 *   node scripts/geo-calibrate.mjs                # score them and report separation
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const LAB = '/tmp/geo-lab';
// Overridable so a candidate label can be measured rather than argued about.
const GARBAGE_COMMIT = process.env.GEO_GARBAGE_COMMIT || '932f3af';
const HANDWRITTEN = [
  // Wave 1 (2d3b5ef)
  'ifici-portugal-nhr-2-tax-regime',
  'mais-valias-portugal-capital-gains',
  'portugal-6-percent-vat-housing-works',
  'renovation-costs-portugal-per-m2',
  'sell-property-portugal-non-resident',
  // Wave 2 (008ef33)
  'buy-property-portugal-through-company',
  'condominium-fees-portugal',
  'cost-of-selling-property-portugal',
  'currency-transfer-portugal-property',
  'fiscal-representative-portugal',
  'modelo-3-anexo-g-property-sale',
  'mortgage-broker-vs-bank-portugal',
  'obras-licence-portugal-renovation',
  'portugal-tax-residency-183-days',
  'uk-portugal-double-taxation-treaty',
];
// The bad and mid sets are the SAME fifteen articles, read at two commits.
//
// This matters more than it looks. Three of the scorer's signals are
// corpus-relative: a figure counts as saturated at max(8, 25% of the set), a
// sentence skeleton counts as templated when 3+ files in the set share it.
// Scoring a 63-file set against a 7-file set therefore compares two different
// thresholds, not two different qualities: at n=7 the saturation floor of 8
// exceeds the whole set, so the middle class could not be penalised for
// stamped figures at all, and it scored level with hand-composed text for that
// reason alone. Equal set sizes remove the confound; a matched pair removes the
// rest, because the same article before and after the cleanup differs only in
// the thing being measured.
//
// The fifteen are the first fifteen, alphabetically, of the 49 guides that
// exist both at GARBAGE_COMMIT and at HEAD and are not in HANDWRITTEN. The rule
// is mechanical on purpose: any selection made by looking at scores first would
// be the calibration tuning itself.
const MATCHED = [
  'albufeira-property-investment',
  'braga-property-investment',
  'caldas-da-rainha-property-investment',
  'cascais-property-investment',
  'ericeira-property-investment',
  'faro-property-investment',
  'lagos-property-investment',
  'lourinha-property-investment',
  'matosinhos-property-investment',
  'nazare-property-investment',
  'oeiras-property-investment',
  'portimao-property-investment',
  'tavira-property-investment',
  'vila-nova-de-gaia-property-investment',
  'vilamoura-property-investment',
];
const MATCHED_DIR = 'src/content/areas';
const MIDDLE = MATCHED;

function prepare() {
  for (const d of ['bad', 'good', 'mid']) {
    fs.rmSync(path.join(LAB, d), { recursive: true, force: true });
    fs.mkdirSync(path.join(LAB, d), { recursive: true });
  }
  let n = 0;
  for (const slug of MATCHED) {
    const f = `${MATCHED_DIR}/${slug}.mdx`;
    try {
      const content = execFileSync('git', ['show', `${GARBAGE_COMMIT}:${f}`], { maxBuffer: 32e6 }).toString();
      fs.writeFileSync(path.join(LAB, 'bad', `${slug}.mdx`), content);
      n += 1;
    } catch { throw new Error(`${slug} does not exist at ${GARBAGE_COMMIT}; the matched pair is broken`); }
  }
  for (const [dir, slugs, root] of [['good', HANDWRITTEN, 'src/content/guides'], ['mid', MIDDLE, MATCHED_DIR]]) {
    for (const s of slugs) {
      const src = `${root}/${s}.mdx`;
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(LAB, dir, `${s}.mdx`));
    }
  }
  console.log(`prepared: bad=${n} good=${HANDWRITTEN.length} mid=${MIDDLE.length} in ${LAB}`);
}

function stats(xs) {
  if (!xs.length) return { n: 0, mean: 0, min: 0, max: 0, p90: 0 };
  const s = [...xs].sort((a, b) => a - b);
  return {
    n: xs.length,
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
    min: s[0],
    max: s[s.length - 1],
    p90: s[Math.floor(s.length * 0.9)] ?? s[s.length - 1],
  };
}

async function scoreSet(dir, scorer) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => path.join(dir, f));
  if (!files.length) throw new Error(`labelled set ${dir} is empty; run --prepare`);
  const out = [];
  for (const f of files) out.push({ file: f, ...(await scorer(f, files)) });
  return out;
}

async function main() {
  if (process.argv.includes('--prepare')) return prepare();
  if (!fs.existsSync(path.join(LAB, 'bad'))) prepare();

  const which = process.argv.includes('--old') ? 'old' : 'new';
  let scorer;
  if (which === 'old') {
    const { scorePage } = await import('./lib/geo-citability-scorer.mjs');
    scorer = async (f) => {
      const raw = fs.readFileSync(f, 'utf8');
      const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
      const r = scorePage(body, { collection: 'guides' });
      return { score: r.score };
    };
  } else {
    const mod = await import('./lib/geo/score.mjs').catch(() => null);
    if (!mod) {
      console.error('scripts/lib/geo/score.mjs not implemented yet; run with --old to see the baseline');
      process.exit(2);
    }
    scorer = mod.scoreFileForCalibration;
  }

  const sets = {};
  for (const d of ['bad', 'good', 'mid']) sets[d] = await scoreSet(path.join(LAB, d), scorer);

  console.log(`\n=== GEO calibration (${which} scorer) ===`);
  const summary = {};
  for (const [k, rows] of Object.entries(sets)) {
    const st = stats(rows.map((r) => r.score));
    summary[k] = st;
    console.log(
      `${k.padEnd(5)} n=${String(st.n).padStart(3)}  mean=${st.mean.toFixed(1)}  min=${st.min}  p90=${st.p90}  max=${st.max}`,
    );
  }
  const sep = summary.good.mean - summary.bad.mean;
  console.log(`\nseparation (good.mean - bad.mean) = ${sep.toFixed(1)} points`);
  const overlap = sets.bad.filter((r) => r.score >= Math.min(...sets.good.map((g) => g.score))).length;
  console.log(`garbage files scoring at or above the worst hand-written file: ${overlap}/${sets.bad.length}`);

  // Targets are set against the deterministic stage, which tops out at 75.
  // The remaining twenty points to the 95 ceiling are only reachable through
  // the judge stage, so a deterministic 60 is a good article, not a mediocre one.
  const TARGETS = { badMax: 25, goodMin: 55, separation: 35 };
  const fails = [];
  if (summary.bad.max > TARGETS.badMax) fails.push(`bad.max ${summary.bad.max} > ${TARGETS.badMax}`);
  if (summary.good.min < TARGETS.goodMin) fails.push(`good.min ${summary.good.min} < ${TARGETS.goodMin}`);
  if (sep < TARGETS.separation) fails.push(`separation ${sep.toFixed(1)} < ${TARGETS.separation}`);
  if (which === 'new') {
    console.log(fails.length ? `\n❌ calibration FAILED\n  ${fails.join('\n  ')}` : '\n✅ calibration passed');
    if (fails.length) process.exit(1);
  }
}

main();
