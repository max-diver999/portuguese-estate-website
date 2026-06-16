// Trim titles to 50-60 chars: remove year, then cut tail at word boundary (keyword-first preserved).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const TARGET = 58; // aim 50-60
const MIN = 50;
const MAX = 60;
const DRY = process.argv.includes('--dry');

function trimTitle(text) {
  let t = text.replace(/\s+2026\b/g, '').replace(/\s+2027\b/g, '').replace(/\s+/g, ' ').trim();
  if (t.length >= MIN && t.length <= MAX) return t;
  if (t.length < MIN) return t; // already short enough, don't touch
  if (t.length <= MAX) return t;

  let slice = t.slice(0, TARGET);
  const sp = slice.lastIndexOf(' ');
  if (sp >= MIN - 5) slice = slice.slice(0, sp);
  slice = slice.replace(/[\s,:;—\-&]+$/g, '').trim();
  // if still too long, hard cut
  if (slice.length > MAX) {
    slice = slice.slice(0, MAX);
    const sp2 = slice.lastIndexOf(' ');
    if (sp2 > MIN) slice = slice.slice(0, sp2);
    slice = slice.replace(/[\s,:;—\-&]+$/g, '').trim();
  }
  return slice.length >= MIN ? slice : t.slice(0, MAX).trim();
}

let changed = 0;
const samples = [];

for (const c of ['guides', 'compare']) {
  const dir = join(ROOT, c);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    const titleLine = fm.match(/^(title:\s*)(.*)$/m);
    if (!titleLine) continue;
    const prefix = titleLine[1];
    const valRaw = titleLine[2].trim();
    const q = valRaw.startsWith('"') ? '"' : valRaw.startsWith("'") ? "'" : '"';
    const title = valRaw.replace(/^["']|["']$/g, '');
    if (title.length <= MAX) continue;

    const out = trimTitle(title);
    if (!out || out === title || out.length > MAX || out.length < MIN) continue;
    if (samples.length < 6) samples.push(`[${c}/${f}] ${title.length}->${out.length}\n   ${out}`);

    if (!DRY) {
      const newFm = fm.replace(/^title:\s*.*$/m, `${prefix}${q}${out}${q}`);
      writeFileSync(path, raw.replace(/^---\n[\s\S]*?\n---/, `---\n${newFm}\n---`));
    }
    changed++;
  }
}

console.log(`${DRY ? '[DRY]' : ''} Trimmed ${changed} titles`);
console.log(samples.join('\n'));
