// Trim meta descriptions to <=160 chars at a clean boundary. Conservative & additive-safe.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const MAX = 160, MIN = 120;
const DRY = process.argv.includes('--dry');
let changed = 0;
const samples = [];

for (const c of ['guides', 'compare']) {
  const dir = join(ROOT, c);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf8');
    const m = raw.match(/^(---\n[\s\S]*?\n)(description:[ \t]*)(.*)(\n[\s\S]*?\n---)/);
    if (!m) continue;
    let val = m[3].trim();
    const q = val.startsWith('"') ? '"' : (val.startsWith("'") ? "'" : '"');
    let text = val.replace(/^["']|["']$/g, '');
    if (text.length <= MAX) continue;

    const stripDangling = (s) => {
      let prev;
      do {
        prev = s;
        s = s.replace(/[\s,;:—\-]+$/, '').trim();
        s = s.replace(/\s+(and|or|vs|with|for|to|in|at|by|the|a|how|of|on|plus|including|like)$/i, '').trim();
      } while (s !== prev);
      return s;
    };

    let out;
    // 1) sentence boundary
    let cut = -1;
    const sentRe = /[.!?](\s|$)/g; let mm;
    while ((mm = sentRe.exec(text)) && mm.index + 1 <= MAX) cut = mm.index + 1;
    if (cut >= MIN) {
      out = text.slice(0, cut).trim();
    } else {
      // 2) last comma / semicolon / em-dash boundary <=MAX (clean list-item end)
      const seg = text.slice(0, MAX);
      let b = Math.max(seg.lastIndexOf(','), seg.lastIndexOf(';'), seg.lastIndexOf(' — '));
      if (b >= MIN) {
        out = stripDangling(seg.slice(0, b));
      } else {
        // 3) last word boundary, strip dangling stopwords
        let slice = text.slice(0, 158);
        slice = slice.slice(0, slice.lastIndexOf(' '));
        out = stripDangling(slice);
      }
    }
    if (!out || out.length < MIN || out.length > MAX) continue; // safety: skip if can't trim cleanly
    if (out === text) continue;
    if (samples.length < 6) samples.push(`[${c}/${f}] ${text.length}->${out.length}\n   OLD: ${text}\n   NEW: ${out}`);
    if (!DRY) {
      const newRaw = raw.slice(0, m.index) + m[1] + m[2] + q + out + q + m[4] + raw.slice(m.index + m[0].length);
      writeFileSync(path, newRaw);
    }
    changed++;
  }
}
console.log(`${DRY ? '[DRY] would trim' : 'Trimmed'} ${changed} descriptions`);
console.log(samples.join('\n'));
