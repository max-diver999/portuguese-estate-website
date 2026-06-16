import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const bad = [];
for (const c of ['guides', 'compare']) {
  const dir = join(ROOT, c);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) { bad.push([`${c}/${f}`, 'NO frontmatter delimiters']); continue; }
    try {
      yaml.load(m[1]);
    } catch (e) {
      bad.push([`${c}/${f}`, e.message.split('\n')[0]]);
    }
  }
}
console.log(`BROKEN FRONTMATTER: ${bad.length}`);
for (const [f, e] of bad) console.log(`  ${f}  ::  ${e}`);
