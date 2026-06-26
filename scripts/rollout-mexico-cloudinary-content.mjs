#!/usr/bin/env node
/**
 * Apply Cloudinary manifests to guides, areas, compare, developers, news MDX.
 *
 * Usage:
 *   node scripts/rollout-mexico-cloudinary-content.mjs [--dry-run]
 *   node scripts/rollout-mexico-cloudinary-content.mjs --collection guides
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNicheCloudinaryCdn } from '../../scripts/lib/cloudinary-routing.mjs';
import { deliveryUrl } from '../../scripts/lib/cloudinary-gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CDN = resolveNicheCloudinaryCdn(import.meta.url);

const MANIFESTS = {
  guides: {
    file: 'mexico-cloudinary-guides-manifest.json',
    dir: path.join(ROOT, 'src/content/guides'),
    prefix: 'guides',
  },
  areas: {
    file: 'mexico-cloudinary-areas-manifest.json',
    dir: path.join(ROOT, 'src/content/areas'),
    prefix: 'areas',
  },
  editorial: {
    file: 'mexico-cloudinary-editorial-manifest.json',
    dirs: {
      compare: path.join(ROOT, 'src/content/compare'),
      developers: path.join(ROOT, 'src/content/developers'),
      news: path.join(ROOT, 'src/content/news'),
    },
    prefix: 'editorial',
  },
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--collection') ? args[args.indexOf('--collection') + 1] : null;

const IMG_LINE = /^!\[[^\]]*\]\([^)]+\)\s*$/gm;

function requireCdn(url) {
  if (!url?.includes(CDN)) throw new Error(`Not Cloudinary: ${url}`);
  return url;
}

function bySlug(manifest, prefix) {
  const out = {};
  for (const [key, entry] of Object.entries(manifest.uploaded || {})) {
    let slug, role;
    if (prefix === 'editorial' || prefix === 'guides' || prefix === 'areas') {
      const parts = key.split(':');
      if (parts.length < 3) continue;
      role = parts.pop();
      slug = parts.slice(1).join(':');
    } else {
      [slug, role] = key.split(':');
    }
    if (!out[slug]) out[slug] = {};
    out[slug][role] = entry;
  }
  return out;
}

function parseFm(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return { fm: m[1], body: raw.slice(m[0].length) };
}

function setHero(fm, url) {
  const line = `heroImage: "${url}"`;
  if (/^heroImage:/m.test(fm)) return fm.replace(/^heroImage:\s*.+$/m, line);
  if (/^readingTime:/m.test(fm)) return fm.replace(/^(readingTime:\s*\d+\s*)$/m, `$1\n${line}`);
  return `${fm.rstrip?.() ?? fm.trimEnd()}\n${line}`;
}

function applyBody(body, inline1, inline2) {
  let b = body.replace(IMG_LINE, '').replace(/\n{3,}/g, '\n\n');
  const block = `\n\n![${inline1.alt || ''}](${deliveryUrl(inline1.secure_url, 'inline')})\n\n![${inline2.alt || ''}](${deliveryUrl(inline2.secure_url, 'inline')})`;
  const firstH2 = b.indexOf('\n## ');
  if (firstH2 === -1) return `${b.trimEnd()}${block}\n`;
  const markers = ['\n\n---\n\n## ', '\n## '];
  let sectionEnd = -1;
  for (const marker of markers) {
    const idx = b.indexOf(marker, firstH2 + 1);
    if (idx !== -1) {
      sectionEnd = idx;
      break;
    }
  }
  if (sectionEnd === -1) return `${b.trimEnd()}${block}\n`;
  return `${b.slice(0, sectionEnd).trimEnd()}${block}${b.slice(sectionEnd)}`;
}

function resolveEditorialPath(slug) {
  for (const [coll, dir] of Object.entries(MANIFESTS.editorial.dirs)) {
    const p = path.join(dir, `${slug}.mdx`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function applyCollection(name, cfg) {
  const manifestPath = path.join(__dirname, cfg.file);
  if (!fs.existsSync(manifestPath)) {
    console.warn(`skip ${name}: missing ${cfg.file}`);
    return { changed: 0, skipped: 0 };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const map = bySlug(manifest, cfg.prefix);
  let changed = 0;
  let skipped = 0;

  for (const slug of Object.keys(map).sort()) {
    const roles = map[slug];
    const hero = roles.hero;
    const i1 = roles['inline-1'];
    const i2 = roles['inline-2'];
    if (!hero?.secure_url || !i1?.secure_url || !i2?.secure_url) {
      console.warn(`skip ${slug}: incomplete set`);
      skipped++;
      continue;
    }

    let mdxPath;
    if (name === 'editorial') {
      mdxPath = resolveEditorialPath(slug);
    } else {
      mdxPath = path.join(cfg.dir, `${slug}.mdx`);
    }
    if (!mdxPath || !fs.existsSync(mdxPath)) {
      console.warn(`skip ${slug}: no MDX`);
      skipped++;
      continue;
    }

    const raw = fs.readFileSync(mdxPath, 'utf8');
    const parsed = parseFm(raw);
    if (!parsed) {
      skipped++;
      continue;
    }

    let fm = parsed.fm;
    if (!/^heroImage:/m.test(fm)) {
      fm = fm.trimEnd() + `\nheroImage: "${requireCdn(deliveryUrl(hero.secure_url, 'hero'))}"`;
    } else {
      fm = fm.replace(/^heroImage:\s*.+$/m, `heroImage: "${requireCdn(deliveryUrl(hero.secure_url, 'hero'))}"`);
    }
    const newBody = applyBody(parsed.body, i1, i2);
    const newRaw = `---\n${fm}\n---\n${newBody}`;
    if (newRaw !== raw) {
      if (!dryRun) fs.writeFileSync(mdxPath, newRaw);
      console.log(`  updated ${name}/${slug}`);
      changed++;
    }
  }
  return { changed, skipped };
}

const targets = only ? [only] : ['guides', 'areas', 'editorial'];
let totalChanged = 0;
for (const name of targets) {
  console.log(`\n▶ ${name}`);
  const { changed, skipped } = applyCollection(name, MANIFESTS[name]);
  totalChanged += changed;
  console.log(`  ${changed} updated, ${skipped} skipped`);
}
console.log(`\nDone: ${totalChanged} files${dryRun ? ' (dry-run)' : ''}`);
