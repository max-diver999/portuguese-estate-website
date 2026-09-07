#!/usr/bin/env node
// Print the exact opening paragraph of every H2 whose opener is under 40 words.
import { readFileSync } from 'node:fs';
import { parseMdxBody, stripMdx, wordCount } from './lib/geo-citability-scorer.mjs';
for (const f of process.argv.slice(2)) {
  const body = parseMdxBody(readFileSync(f, 'utf8'));
  console.log(`\n##### ${f}`);
  const parts = body.split(/^## /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = part.slice(0, nl).trim();
    const rest = part.slice(nl + 1).trim();
    const first = rest.split(/\n{2,}/)[0] ?? '';
    const w = wordCount(stripMdx(first));
    if (w < 40) console.log(`[${w}w] ## ${heading}\n${first}\n`);
  }
}
