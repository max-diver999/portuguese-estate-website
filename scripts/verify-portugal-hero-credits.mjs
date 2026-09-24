#!/usr/bin/env node
/**
 * Hero credits stay true to the photograph they describe.
 *
 * Most heroes on this site are Wikimedia Commons photographs re-hosted on R2 as
 * more-group/portugal/<collection>/<slug>/hero.webp. Their CC BY and CC BY-SA licences
 * require the author's name, which /image-credits/ collects from heroImageCredit,
 * heroImageLicence and heroImageSource. Since 23 Sep 2026 some heroes are replaced with
 * photographs from developers' and official tourism sites, uploaded as .../photo-N.webp.
 * Those carry no Commons credit, and a leftover credit would name the wrong author.
 *
 * Fails the build when:
 *   1. a page credits a Commons author but its hero is not the re-hosted Commons file,
 *      or the licence or Commons source is missing;
 *   2. a page shows its own photo-N hero and still carries a Commons credit or licence;
 *   3. anything in src/ loads an image straight from upload.wikimedia.org or a retired host.
 *
 * Replaces verify-portugal-cloudinary.mjs, which checked the Cloudinary upload manifest.
 *
 *   node scripts/verify-portugal-hero-credits.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R2 = /^https:\/\/(?:pub-[a-f0-9]+\.r2\.dev|media\.oper-stack\.com)\/more-group\/portugal\/[^"]+\.webp$/;
const errors = [];
let commons = 0;
let own = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const field = (frontmatter, key) => (frontmatter.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm')) || [])[1];

for (const file of walk(path.join(ROOT, 'src/content')).filter((f) => /\.mdx?$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  const frontmatter = text.slice(0, text.indexOf('\n---', 3));
  const rel = path.relative(ROOT, file);
  const hero = field(frontmatter, 'heroImage');
  if (!hero) continue;
  if (!R2.test(hero)) {
    errors.push(`${rel}: heroImage is not a Portugal photo on R2: ${hero.slice(0, 90)}`);
    continue;
  }
  const credit = field(frontmatter, 'heroImageCredit');
  const licence = field(frontmatter, 'heroImageLicence');
  const source = field(frontmatter, 'heroImageSource');
  if (/\/photo-\d+\.webp$/.test(hero)) {
    own++;
    if (credit || licence) errors.push(`${rel}: own photo ${path.basename(hero)} still carries a Commons credit or licence`);
    continue;
  }
  if (credit) {
    commons++;
    if (!/\/hero\.webp$/.test(hero)) errors.push(`${rel}: Commons credit on a hero that is not the re-hosted Commons file`);
    if (!licence) errors.push(`${rel}: Commons credit without heroImageLicence`);
    if (!source || !source.startsWith('https://commons.wikimedia.org/')) errors.push(`${rel}: Commons credit without a Commons heroImageSource`);
  }
}

for (const file of walk(path.join(ROOT, 'src')).filter((f) => /\.(astro|mdx?|tsx?|json)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/https:\/\/upload\.wikimedia\.org\//.test(text)) errors.push(`${path.relative(ROOT, file)}: image loaded straight from upload.wikimedia.org`);
  if (/https:\/\/res\.cloudinary\.com\//.test(text)) errors.push(`${path.relative(ROOT, file)}: image loaded from the retired Cloudinary host`);
}

if (errors.length) {
  console.error(errors.slice(0, 40).join('\n'));
  console.error(`Portugal hero credit verification failed: ${errors.length} issue(s)`);
  process.exit(1);
}
console.log(`Portugal hero credit verification passed: ${commons} Commons heroes credited, ${own} own photos without a Commons credit`);
