#!/usr/bin/env node
/** Sync project MDX heroImage + inline images from mexico-cloudinary-manifest.json */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const manifest = JSON.parse(
  readFileSync(join(__dirname, 'mexico-cloudinary-manifest.json'), 'utf8')
);
const uploaded = manifest.uploaded || {};

const bySlug = {};
for (const [kid, entry] of Object.entries(uploaded)) {
  if (!entry?.slug || !entry?.secure_url) continue;
  const role = entry.role || kid.split(':').pop();
  bySlug[entry.slug] ??= {};
  bySlug[entry.slug][role] = entry.secure_url;
}

const projectsDir = join(ROOT, 'src/content/projects');
let updated = 0;

for (const file of readdirSync(projectsDir).filter((f) => f.endsWith('.mdx'))) {
  const slug = file.replace('.mdx', '');
  const urls = bySlug[slug];
  if (!urls?.hero) continue;

  const path = join(projectsDir, file);
  let text = readFileSync(path, 'utf8');
  const orig = text;

  text = text.replace(
    /^heroImage: ".*"$/m,
    `heroImage: "${urls.hero}"`
  );

  const inline = [urls['inline-1'], urls.inline_1, urls['inline-2'], urls.inline_2].filter(Boolean);
  if (inline.length) {
    let n = 0;
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, (match) => {
      if (n < inline.length) {
        const alt = match.match(/!\[([^\]]*)\]/)?.[1] || 'Project photo';
        const next = `![${alt}](${inline[n]})`;
        n += 1;
        return next;
      }
      return match;
    });
  }

  if (text !== orig) {
    writeFileSync(path, text);
    updated += 1;
    console.log(`✓ ${slug}`);
  }
}

console.log(`\nUpdated ${updated} MDX files`);
