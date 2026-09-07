#!/usr/bin/env node
// Per-section GEO citability inspector: shows which H2 block loses which points.
import { readFileSync } from 'node:fs';
import { parseMdxBody, scorePage, wordCount, stripMdx, extractH2Blocks } from './lib/geo-citability-scorer.mjs';
for (const f of process.argv.slice(2)) {
  const body = parseMdxBody(readFileSync(f, 'utf8'));
  const r = scorePage(body, { collection: f.split('/')[2], commercial: true });
  console.log(`\n### ${f}  score ${r.score} cov ${r.coverage}% citBlocks ${r.citabilityBlockCount}`);
  console.log('   ' + JSON.stringify(r.categoryAvgs));
  const blocks = extractH2Blocks(body);
  r.blockScores.forEach((b, i) => {
    const fw = wordCount(blocks[i].plainFirst);
    console.log(`  ${String(b.overall).padStart(3)} a${String(b.answer).padStart(3)} s${String(b.selfContain).padStart(3)} st${String(b.structure).padStart(3)} n${String(b.stats).padStart(3)} u${String(b.unique).padStart(3)} | open ${String(fw).padStart(3)}w | ${b.heading}`);
  });
}
