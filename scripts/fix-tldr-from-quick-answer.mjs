#!/usr/bin/env node
/** Sync <TldrBlock text="..."/> from "Quick answer:" line (fixes 255-char truncation). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const COLLECTIONS = ['guides', 'compare', 'areas', 'projects', 'developers', 'news'];

function walkMdx() {
  const out = [];
  for (const coll of COLLECTIONS) {
    const dir = path.join(CONTENT, coll);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
      out.push(path.join(dir, f));
    }
  }
  return out;
}

let fixed = 0;
for (const file of walkMdx()) {
  let raw = fs.readFileSync(file, 'utf8');
  const qa = raw.match(/^Quick answer:\s*(.+)$/m);
  if (!qa || !/<TldrBlock\b/.test(raw)) continue;
  const text = qa[1].trim();
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, "'").replace(/\n/g, ' ');
  const next = raw.replace(/<TldrBlock text="[^"]*" \/>/, `<TldrBlock text="${escaped}" />`);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    fixed++;
    console.log(path.relative(ROOT, file));
  }
}
console.log(`\nFixed ${fixed} TldrBlock(s)`);
