#!/usr/bin/env node
/**
 * Apply the Portugal Cloudinary upload manifest without changing attribution,
 * canonical URLs, slugs, or article text.
 *
 * Usage: node scripts/rollout-portugal-cloudinary.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'scripts/portugal-commons-images.json');
const UPLOAD_PATH = path.join(ROOT, 'scripts/portugal-cloudinary-manifest.json');
const CACHE_PATH = path.join(ROOT, 'src/data/portugal-image-dimensions.json');
const FEATURED_PATH = path.join(ROOT, 'src/data/featured.ts');
const CLOUD = 'dlrrtf6bq';
const PREFIX = 'more-group/portugal/';
const dryRun = process.argv.includes('--dry-run');

const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
const uploads = JSON.parse(fs.readFileSync(UPLOAD_PATH, 'utf8'));
const expected = source.images;

if (expected.length !== 132 || Object.keys(uploads.uploaded || {}).length !== 132) {
  throw new Error(`Expected 132 source and uploaded entries; got ${expected.length} and ${Object.keys(uploads.uploaded || {}).length}`);
}

const yaml = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const fields = [
  'heroImage',
  'heroImageAlt',
  'heroImageCredit',
  'heroImageLicence',
  'heroImageSource',
  'heroImageWidth',
  'heroImageHeight',
];

function deliveryUrl(publicId, width = 1280) {
  if (!publicId.startsWith(PREFIX)) throw new Error(`Unexpected Portugal public ID: ${publicId}`);
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

function updateFrontmatter(file, values) {
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`Missing frontmatter: ${file}`);
  const lines = match[1].split('\n');
  const first = lines.findIndex((line) => /^heroImage:/.test(line));
  const kept = lines.filter((line) => !fields.some((field) => new RegExp(`^${field}:`).test(line)));
  const block = fields.map((field) => {
    const value = values[field];
    return typeof value === 'number' ? `${field}: ${value}` : `${field}: ${yaml(value)}`;
  });
  kept.splice(first === -1 ? kept.length : Math.min(first, kept.length), 0, ...block);
  const next = `---\n${kept.join('\n')}\n---${raw.slice(match[0].length)}`;
  if (next === raw) return false;
  if (!dryRun) fs.writeFileSync(file, next);
  return true;
}

function updateFeatured(item, upload) {
  const raw = fs.readFileSync(FEATURED_PATH, 'utf8');
  const replacements = {
    HOMEPAGE_HERO_IMAGE: deliveryUrl(upload.public_id),
    HOMEPAGE_HERO_ALT: item.alt,
    HOMEPAGE_HERO_CREDIT: item.credit,
    HOMEPAGE_HERO_LICENCE: item.licence,
    HOMEPAGE_HERO_SOURCE: item.sourcePage,
  };
  let next = raw;
  for (const [name, value] of Object.entries(replacements)) {
    const line = `export const ${name} = ${JSON.stringify(value)};`;
    const pattern = new RegExp(`^export const ${name} = .+;$`, 'm');
    if (!pattern.test(next)) throw new Error(`Missing ${name} in featured.ts`);
    next = next.replace(pattern, line);
  }
  if (next === raw) return false;
  if (!dryRun) fs.writeFileSync(FEATURED_PATH, next);
  return true;
}

const dimensions = {};
let changed = 0;
for (const item of expected) {
  const upload = uploads.uploaded[item.slug];
  if (!upload) throw new Error(`Missing upload for ${item.slug}`);
  if (upload.original_url !== item.originalUrl || upload.source_page !== item.sourcePage) {
    throw new Error(`Attribution/source mismatch for ${item.slug}`);
  }
  if (!upload.public_id.startsWith(PREFIX) || upload.format !== 'jpg') {
    throw new Error(`Invalid upload record for ${item.slug}`);
  }
  const width = Number(upload.width);
  const height = Number(upload.height);
  if (!width || !height || Math.max(width, height) > 1920) {
    throw new Error(`Invalid dimensions for ${item.slug}: ${width}x${height}`);
  }
  dimensions[upload.public_id] = { width, height };

  if (item.collection === 'site') {
    if (item.slug !== 'homepage') throw new Error(`Unknown site asset: ${item.slug}`);
    if (updateFeatured(item, upload)) changed += 1;
    continue;
  }

  const file = ['mdx', 'md']
    .map((extension) => path.join(ROOT, 'src/content', item.collection, `${item.slug}.${extension}`))
    .find(fs.existsSync);
  if (!file) throw new Error(`No content file for ${item.collection}/${item.slug}`);
  if (updateFrontmatter(file, {
    heroImage: deliveryUrl(upload.public_id),
    heroImageAlt: item.alt,
    heroImageCredit: item.credit,
    heroImageLicence: item.licence,
    heroImageSource: item.sourcePage,
    heroImageWidth: width,
    heroImageHeight: height,
  })) changed += 1;
}

const cache = `${JSON.stringify(Object.fromEntries(Object.entries(dimensions).sort()), null, 2)}\n`;
const previousCache = fs.existsSync(CACHE_PATH) ? fs.readFileSync(CACHE_PATH, 'utf8') : '';
if (cache !== previousCache) {
  if (!dryRun) fs.writeFileSync(CACHE_PATH, cache);
  changed += 1;
}

console.log(`${dryRun ? 'Would update' : 'Updated'} ${changed} file(s); verified ${expected.length} attributed heroes`);
