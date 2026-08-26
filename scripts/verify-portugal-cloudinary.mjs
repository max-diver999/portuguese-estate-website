#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/portugal-commons-images.json'), 'utf8'));
const uploaded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/portugal-cloudinary-manifest.json'), 'utf8')).uploaded || {};
const dimensions = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/portugal-image-dimensions.json'), 'utf8'));
const errors = [];
const expectedCount = source.images.length;

if (
  source.total !== expectedCount ||
  new Set(source.images.map((item) => item.commonsTitle)).size !== expectedCount ||
  new Set(source.images.map((item) => item.slug)).size !== expectedCount
) {
  errors.push(
    `source manifest inventory mismatch: declared=${source.total}, rows=${expectedCount}, ` +
    `unique files=${new Set(source.images.map((item) => item.commonsTitle)).size}`,
  );
}
if (Object.keys(uploaded).length !== expectedCount) {
  errors.push(`uploaded manifest has ${Object.keys(uploaded).length}/${expectedCount} entries`);
}
if (Object.keys(dimensions).length !== expectedCount) {
  errors.push(`dimensions cache has ${Object.keys(dimensions).length}/${expectedCount} entries`);
}

for (const item of source.images) {
  const upload = uploaded[item.slug];
  if (!upload) {
    errors.push(`missing upload: ${item.slug}`);
    continue;
  }
  const expectedPid = `more-group/portugal/${item.collection}/${item.slug}/hero`;
  if (upload.public_id !== expectedPid) errors.push(`wrong public ID: ${item.slug}`);
  if (upload.original_url !== item.originalUrl || upload.source_page !== item.sourcePage) {
    errors.push(`source attribution mismatch: ${item.slug}`);
  }
  if (!dimensions[expectedPid]) errors.push(`missing dimensions: ${item.slug}`);
  if (item.collection === 'site') continue;

  const file = ['mdx', 'md']
    .map((extension) => path.join(ROOT, 'src/content', item.collection, `${item.slug}.${extension}`))
    .find(fs.existsSync);
  if (!file) {
    errors.push(`missing content file: ${item.collection}/${item.slug}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const required = [
    `heroImage: "https://res.cloudinary.com/dlrrtf6bq/image/upload/f_auto,q_auto,w_1280/${expectedPid}"`,
    `heroImageSource: "${item.sourcePage.replace(/"/g, '\\"')}"`,
    `heroImageLicence: "${item.licence.replace(/"/g, '\\"')}"`,
  ];
  for (const value of required) {
    if (!text.includes(value)) errors.push(`missing preserved field in ${item.collection}/${item.slug}: ${value.slice(0, 32)}`);
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(path.join(ROOT, 'src')).filter((file) => /\.(astro|mdx?|tsx?|json)$/.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/https:\/\/upload\.wikimedia\.org\/[^\s"'<>)]*/.test(text)) {
    errors.push(
      `unmapped Wikimedia image delivery remains in ${path.relative(ROOT, file)}; ` +
      'upload and rollout the hero before build',
    );
  }
  const urls = text.match(/https:\/\/res\.cloudinary\.com\/[^\s"'<>)]*/g) || [];
  for (const url of urls) {
    if (file.endsWith('src/lib/responsiveImage.ts') && url.includes('w_${width}')) continue;
    if (!/\/image\/upload\/[^/]*f_auto[^/]*q_auto[^/]*w_\d+[^/]*\/more-group\/portugal\//.test(url)) {
      errors.push(`bare or non-standard Cloudinary URL in ${path.relative(ROOT, file)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.slice(0, 30).join('\n'));
  console.error(`Portugal Cloudinary verification failed: ${errors.length} issue(s)`);
  process.exit(1);
}
console.log(
  `Portugal Cloudinary verification passed: ${expectedCount}/${expectedCount} uploads, ` +
  'dimensions, delivery mappings and attribution sources',
);
