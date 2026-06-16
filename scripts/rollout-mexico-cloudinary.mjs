#!/usr/bin/env node
/**
 * Apply mexico-cloudinary-manifest.json to project MDX + lotsof JSON.
 *
 * Usage:
 *   node scripts/rollout-mexico-cloudinary.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const MANIFEST = path.join(__dirname, 'mexico-cloudinary-manifest.json');
const PROJECTS_DIR = path.join(ROOT, 'src/content/projects');
const LOTSOF_DIR = path.join(REPO_ROOT, '06_Объекты_и_База_Знаний/Проекты_Mexico/projects');
const INDEX_PATH = path.join(REPO_ROOT, '06_Объекты_и_База_Знаний/Проекты_Mexico/index.json');

const dryRun = process.argv.includes('--dry-run');
const CDN = 'dphvjbqb4';

function requireCdn(url) {
  if (!url?.includes(CDN)) {
    throw new Error(`Not a Cloudinary URL: ${url}`);
  }
  return url;
}

function bySlug(manifest) {
  const out = {};
  for (const [key, entry] of Object.entries(manifest.uploaded || {})) {
    const [slug, role] = key.split(':');
    if (!out[slug]) out[slug] = {};
    out[slug][role] = entry;
  }
  return out;
}

function parseFm(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return { fm: m[1], body: raw.slice(m[0].length), full: m[0] };
}

function setHero(fm, url) {
  const line = `heroImage: "${url}"`;
  if (/^heroImage:/m.test(fm)) {
    return fm.replace(/^heroImage:\s*.+$/m, line);
  }
  return fm.replace(/^(readingTime:\s*\d+\s*)$/m, `$1\n${line}`);
}

const IMG_LINE = /^!\[[^\]]*\]\([^)]+\)\s*$/gm;

function applyBody(body, inline1, inline2) {
  let b = body.replace(IMG_LINE, '').replace(/\n{3,}/g, '\n\n');
  const block = `\n\n![${inline1.alt || ''}](${inline1.secure_url})\n\n![${inline2.alt || ''}](${inline2.secure_url})`;
  const firstH2 = b.indexOf('\n## ');
  if (firstH2 === -1) return b.trimEnd() + block + '\n';
  const marker = '\n\n---\n\n## ';
  const sectionEnd = b.indexOf(marker, firstH2 + 1);
  if (sectionEnd === -1) return b.trimEnd() + block + '\n';
  return b.slice(0, sectionEnd).trimEnd() + block + b.slice(sectionEnd);
}

function updateLotsof(slug, hero, inlines) {
  const lotsofPath = path.join(LOTSOF_DIR, `${slug}.json`);
  if (!fs.existsSync(lotsofPath)) return false;
  const data = JSON.parse(fs.readFileSync(lotsofPath, 'utf8'));
  data.cloudinary = {
    hero: requireCdn(hero.secure_url),
    exterior: inlines.map((i) => requireCdn(i.secure_url)),
  };
  if (data.images) {
    data.images.hero = { ...data.images.hero, url: hero.secure_url, cloudinary: true };
    if (data.images.inline?.length >= 2) {
      data.images.inline[0].url = inlines[0].secure_url;
      data.images.inline[1].url = inlines[1].secure_url;
    }
  }
  if (!dryRun) fs.writeFileSync(lotsofPath, `${JSON.stringify(data, null, 2)}\n`);
  return true;
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Missing ${MANIFEST} — run upload-mexico-cloudinary.py first`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const map = bySlug(manifest);
  let changed = 0;
  let skipped = 0;

  for (const slug of Object.keys(map).sort()) {
    const roles = map[slug];
    const hero = roles.hero;
    const i1 = roles['inline-1'];
    const i2 = roles['inline-2'];
    if (!hero?.secure_url || !i1?.secure_url || !i2?.secure_url) {
      console.warn(`skip ${slug}: incomplete cloudinary set`);
      skipped++;
      continue;
    }

    const mdxPath = path.join(PROJECTS_DIR, `${slug}.mdx`);
    if (!fs.existsSync(mdxPath)) {
      console.warn(`skip ${slug}: no MDX`);
      skipped++;
      continue;
    }

    const raw = fs.readFileSync(mdxPath, 'utf8');
    const parsed = parseFm(raw);
    if (!parsed) {
      console.warn(`skip ${slug}: bad frontmatter`);
      skipped++;
      continue;
    }

    const newFm = setHero(parsed.fm, requireCdn(hero.secure_url));
    const newBody = applyBody(parsed.body, i1, i2);
    const newRaw = `---\n${newFm}\n---\n${newBody}`;
    if (newRaw !== raw) {
      if (!dryRun) fs.writeFileSync(mdxPath, newRaw);
      console.log(`  updated ${slug}.mdx`);
      changed++;
    }

    if (updateLotsof(slug, hero, [i1, i2])) {
      console.log(`  updated lotsof ${slug}.json`);
    }
  }

  if (fs.existsSync(INDEX_PATH) && !dryRun) {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    for (const p of index.projects || []) {
      const hero = map[p.slug]?.hero?.secure_url;
      if (hero?.includes(CDN)) p.heroImage = hero;
    }
    index.cloudinaryMigrated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
    console.log('  updated index.json heroImage URLs');
  }

  console.log(`\nDone: ${changed} MDX updated, ${skipped} skipped${dryRun ? ' (dry-run)' : ''}`);
}

main();
