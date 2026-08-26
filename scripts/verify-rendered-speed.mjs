#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = fs.existsSync(path.join(ROOT, 'dist/client'))
  ? path.join(ROOT, 'dist/client')
  : path.join(ROOT, 'dist');
const errors = [];
let pages = 0;
let cloudinaryImages = 0;
let priorityHeroes = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
}

for (const file of walk(DIST).filter((item) => (
  item.endsWith('.html')
  && !['design-preview.html', 'logo-preview.html'].includes(path.basename(item))
))) {
  pages += 1;
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);

  if (/fonts\.(?:googleapis|gstatic)\.com/.test(html)) {
    errors.push(`${relative}: external Google Fonts remain`);
  }
  if (/src="https:\/\/upload\.wikimedia\.org\//.test(html)) {
    errors.push(`${relative}: Wikimedia image delivery remains`);
  }

  const fontPreloads = html.match(/<link\b[^>]*rel="preload"[^>]*as="font"[^>]*>/g) || [];
  if (fontPreloads.length > 1) errors.push(`${relative}: duplicate font preloads (${fontPreloads.length})`);
  const imagePreloads = html.match(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/g) || [];
  if (imagePreloads.length > 1) errors.push(`${relative}: duplicate image preloads (${imagePreloads.length})`);

  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    const src = attribute(tag, 'src');
    if (!src.includes('res.cloudinary.com/dlrrtf6bq/image/upload/')) continue;
    cloudinaryImages += 1;

    for (const name of ['srcset', 'sizes', 'width', 'height']) {
      if (!attribute(tag, name)) errors.push(`${relative}: Cloudinary image missing ${name}`);
    }
    if (!/\/image\/upload\/[^/]*f_auto[^/]*q_auto[^/]*w_\d+\//.test(src)) {
      errors.push(`${relative}: bare or unsafe Cloudinary image src`);
    }
    if (!/w_360\//.test(attribute(tag, 'srcset'))) {
      errors.push(`${relative}: responsive image lacks a mobile 360px candidate`);
    }

    if (attribute(tag, 'fetchpriority') === 'high') {
      priorityHeroes += 1;
      if (attribute(tag, 'loading') !== 'eager') errors.push(`${relative}: priority hero is not eager`);
      if (attribute(tag, 'sizes') === '100vw') errors.push(`${relative}: priority hero overstates mobile width`);
    }
  }
}

if (!pages) errors.push('no rendered HTML found');
if (!cloudinaryImages) errors.push('no rendered Cloudinary images found');
if (!priorityHeroes) errors.push('no priority Cloudinary heroes found');

if (errors.length) {
  console.error(errors.slice(0, 40).join('\n'));
  console.error(`Rendered speed verification failed: ${errors.length} issue(s)`);
  process.exit(1);
}

console.log(
  `Rendered speed verification passed: ${pages} pages, ${cloudinaryImages} responsive Cloudinary images, `
  + `${priorityHeroes} priority heroes, local fonts and no duplicate preloads`,
);
