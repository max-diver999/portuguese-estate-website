#!/usr/bin/env node
/**
 * GEO citability audit v2 — geo-seo rubric scoring for MDX corpus.
 *
 * Usage:
 *   node scripts/geo-citability-audit.mjs [--json] [--today|--changed] [--min-score 60] [--top 20]
 *
 * Exit 1 when: site-level gaps OR any commercial file score < min-score OR legacy hard issues.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  parseMdxBody,
  scorePage,
  scoreToGrade,
  RUBRIC_WEIGHTS,
} from './lib/geo-citability-scorer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'src/content');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const todayOnly = args.includes('--today');
const changedOnly = args.includes('--changed');
const minScoreIdx = args.indexOf('--min-score');
const minScore = minScoreIdx >= 0 ? Number(args[minScoreIdx + 1]) : 60;
const topNIdx = args.indexOf('--top');
const topN = topNIdx >= 0 ? Number(args[topNIdx + 1]) : 20;

const COMMERCIAL = new Set([
  'guides',
  'gajdy',
  'comparisons',
  'sravneniya',
  'areas',
  'rajony',
  'compare',
  'projects',
  'proekty',
]);

function listMdx() {
  if (todayOnly || changedOnly) {
    const since = todayOnly ? 'midnight' : '';
    const gitArgs = changedOnly
      ? "git diff --name-only HEAD -- 'src/content/**/*.mdx'"
      : `git log --since='${since}' --name-only --pretty=format: -- 'src/content/**/*.mdx'`;
    const out = execSync(gitArgs, { cwd: ROOT, encoding: 'utf8' });
    return [
      ...new Set(
        out
          .trim()
          .split('\n')
          .filter((f) => f.endsWith('.mdx'))
          .map((f) => join(ROOT, f)),
      ),
    ].filter((p) => existsSync(p));
  }
  const files = [];
  if (!existsSync(CONTENT)) return files;
  for (const coll of readdirSync(CONTENT)) {
    const dir = join(CONTENT, coll);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
      files.push(join(dir, f));
    }
  }
  return files;
}

function auditSiteLevel() {
  const siteGaps = [];
  const llmsPath = join(ROOT, 'public/llms.txt');
  if (existsSync(llmsPath)) {
    const llms = readFileSync(llmsPath, 'utf8');
    if (/scaffold|publishing next|TODO/i.test(llms)) siteGaps.push('llms.txt-stale-scaffold');
  } else {
    siteGaps.push('llms.txt-missing');
  }
  const layoutPath = join(ROOT, 'src/layouts/BaseLayout.astro');
  if (existsSync(layoutPath)) {
    const layout = readFileSync(layoutPath, 'utf8');
    if (!/wikidata\.org/i.test(layout)) siteGaps.push('base-layout-no-wikidata-sameAs');
  }
  const robotsPath = join(ROOT, 'public/robots.txt');
  if (existsSync(robotsPath)) {
    const robots = readFileSync(robotsPath, 'utf8');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot']) {
      if (!new RegExp(bot, 'i').test(robots)) siteGaps.push(`robots-missing-${bot}`);
    }
  }
  return siteGaps;
}

const results = [];
for (const path of listMdx()) {
  const rel = path.replace(ROOT + '/', '');
  const coll = rel.split('/')[2] || '';
  const slug = path.split('/').pop().replace('.mdx', '');
  const raw = readFileSync(path, 'utf8');
  const body = parseMdxBody(raw);
  const scored = scorePage(body, { collection: coll });
  const failScore = COMMERCIAL.has(coll) && scored.score > 0 && scored.score < minScore;
  results.push({
    file: rel,
    slug,
    coll,
    grade: scoreToGrade(scored.score),
    ...scored,
    failScore,
  });
}

const siteGaps = auditSiteLevel();
const commercial = results.filter((r) => COMMERCIAL.has(r.coll));
const belowMin = commercial.filter((r) => r.failScore || r.issues.length > 0);
const avgScore =
  commercial.length > 0
    ? Math.round(commercial.reduce((s, r) => s + r.score, 0) / commercial.length)
    : 0;

const categoryTotals = { answer: 0, selfContain: 0, structure: 0, stats: 0, unique: 0 };
for (const r of commercial) {
  for (const k of Object.keys(categoryTotals)) {
    categoryTotals[k] += r.categoryAvgs[k] || 0;
  }
}
const categoryAvgs = {};
for (const k of Object.keys(categoryTotals)) {
  categoryAvgs[k] = commercial.length ? Math.round(categoryTotals[k] / commercial.length) : 0;
}

const worstFiles = [...commercial].sort((a, b) => a.score - b.score).slice(0, topN);

const summary = {
  version: 2,
  rubric: RUBRIC_WEIGHTS,
  minScore,
  filesScanned: results.length,
  commercialScanned: commercial.length,
  avgCommercialScore: avgScore,
  categoryAvgs,
  filesBelowMin: belowMin.length,
  siteGaps,
  worstFiles: worstFiles.map((r) => ({
    file: r.file,
    score: r.score,
    grade: r.grade,
    coverage: r.coverage,
    citabilityBlocks: r.citabilityBlockCount,
    issues: r.issues,
    worstBlocks: r.worstBlocks?.map((b) => ({ heading: b.heading, score: b.overall })),
  })),
};

const fail =
  siteGaps.length > 0 ||
  commercial.some((r) => r.failScore) ||
  belowMin.some((r) => r.issues.some((i) => !i.startsWith('thin-h2-open')));

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(fail ? 1 : 0);
}

console.log(`\n=== GEO CITABILITY AUDIT v2 (${todayOnly ? 'today' : changedOnly ? 'changed' : 'full'}) ===`);
console.log(`Scanned: ${summary.filesScanned} | commercial: ${summary.commercialScanned}`);
console.log(`Avg commercial score: ${avgScore}/100 (min ${minScore}) | grade ${scoreToGrade(avgScore)}`);
console.log(
  `Rubric avg — answer ${categoryAvgs.answer} | self ${categoryAvgs.selfContain} | structure ${categoryAvgs.structure} | stats ${categoryAvgs.stats} | unique ${categoryAvgs.unique}`,
);

if (siteGaps.length) {
  console.log('\nSite-level gaps:');
  siteGaps.forEach((g) => console.log(`  - ${g}`));
}

console.log(`\nBelow min or hard issues: ${belowMin.length} files`);
console.log(`\nWorst ${Math.min(topN, worstFiles.length)} commercial files:`);
for (const r of worstFiles) {
  console.log(
    `  ${r.score}/100 [${r.grade}] ${r.file} | coverage ${r.coverage}% | cit blocks ${r.citabilityBlockCount} | ${r.issues.slice(0, 3).join('; ') || 'ok'}`,
  );
}

process.exit(fail ? 1 : 0);
