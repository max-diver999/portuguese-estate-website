#!/usr/bin/env node
// Show paragraphs near the 130-170 word citability window and why they miss.
import { readFileSync } from 'node:fs';
import { parseMdxBody, stripMdx, wordCount, hasStat } from './lib/geo-citability-scorer.mjs';
const PRON = /^(it|this|they|these|those|however|but|and|also)\b/i;
for (const f of process.argv.slice(2)) {
  const body = parseMdxBody(readFileSync(f, 'utf8'));
  console.log(`\n### ${f}`);
  for (const p of body.split(/\n{2,}/)) {
    const plain = stripMdx(p); const w = wordCount(plain);
    if (w < 100 || w > 210) continue;
    const ok = w >= 130 && w <= 170 && hasStat(plain) && !PRON.test(plain);
    console.log(`  ${ok ? 'OK ' : '   '} ${String(w).padStart(3)}w stat=${hasStat(plain) ? 'y' : 'n'} pron=${PRON.test(plain) ? 'y' : 'n'} | ${plain.slice(0, 78)}`);
  }
}
