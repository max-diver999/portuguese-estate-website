/**
 * Write the sourced hero images into the corpus.
 *
 * Reads scripts/portugal-commons-images.json and rewrites four frontmatter fields
 * per file: heroImage, heroImageAlt, heroImageCredit, heroImageLicence,
 * heroImageSource. Attribution travels with the image because most of these
 * licences require the credit to be visible to the reader, not buried in a manifest.
 *
 *   node scripts/apply-hero-images.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dry = process.argv.includes('--dry');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/portugal-commons-images.json'), 'utf8'));

const FIELDS = ['heroImage', 'heroImageAlt', 'heroImageCredit', 'heroImageLicence', 'heroImageSource'];
const yaml = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

let written = 0;
const missing = [];

for (const img of manifest.images) {
  if (img.collection === 'site') continue;
  const candidates = [
    path.join(ROOT, 'src/content', img.collection, `${img.slug}.mdx`),
    path.join(ROOT, 'src/content', img.collection, `${img.slug}.md`),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) { missing.push(img.slug); continue; }

  const raw = fs.readFileSync(file, 'utf8');
  const end = raw.indexOf('\n---', 3);
  if (!raw.startsWith('---') || end === -1) throw new Error(`no frontmatter: ${file}`);
  let front = raw.slice(4, end);
  const body = raw.slice(end);

  const values = {
    heroImage: img.url,
    heroImageAlt: img.alt,
    heroImageCredit: img.credit,
    heroImageLicence: img.licence,
    heroImageSource: img.sourcePage,
  };

  // Drop any existing hero fields, then reinsert as one block where heroImage was.
  const lines = front.split('\n');
  const firstIndex = lines.findIndex((l) => /^heroImage:/.test(l));
  const kept = lines.filter((l) => !FIELDS.some((f) => new RegExp(`^${f}:`).test(l)));
  const block = FIELDS.map((f) => `${f}: ${yaml(values[f])}`);
  const at = firstIndex === -1 ? kept.length : Math.min(firstIndex, kept.length);
  kept.splice(at, 0, ...block);
  front = kept.join('\n');

  const next = `---\n${front}${body}`;
  if (next !== raw) {
    if (!dry) fs.writeFileSync(file, next);
    written += 1;
  }
}

console.log(`${dry ? 'would write' : 'wrote'} ${written} file(s)`);
if (missing.length) {
  console.error(`no MDX found for: ${missing.join(', ')}`);
  process.exit(1);
}
