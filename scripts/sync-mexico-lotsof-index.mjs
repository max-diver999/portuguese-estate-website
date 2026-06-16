#!/usr/bin/env node
/**
 * Regenerates 06_Объекты_и_База_Знаний/Проекты_Mexico/index.json
 * from mexico-project-images-all.json (hero URLs) + src/content/projects/*.mdx frontmatter.
 *
 * Usage (from invest-spain-property-website/):
 *   node scripts/sync-mexico-lotsof-index.mjs
 *   node scripts/sync-mexico-lotsof-index.mjs --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');

const MANIFEST_PATH = path.join(SITE_ROOT, 'scripts/mexico-project-images-all.json');
const CONTENT_DIR = path.join(SITE_ROOT, 'src/content/projects');
const INDEX_OUT = path.join(
  REPO_ROOT,
  '06_Объекты_и_База_Знаний/Проекты_Mexico/index.json',
);

const dryRun = process.argv.includes('--dry-run');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    if (val.startsWith('"') && val.endsWith('"')) data[key] = val.slice(1, -1);
    else if (/^\d+$/.test(val)) data[key] = Number(val);
    else if (val === 'true' || val === 'false') data[key] = val === 'true';
    else data[key] = val;
  }
  return data;
}

function deriveName(title, slug) {
  if (!title) return slug;
  return title
    .split(':')[0]
    .replace(/\s+Review$/i, '')
    .replace(/\s+Villas.*$/i, '')
    .replace(/\s+Residences.*$/i, '')
    .trim();
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return Object.fromEntries(manifest.articles.map((article) => [article.slug, article]));
}

function loadMdxProjects() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
      return { slug, data: parseFrontmatter(raw) };
    });
}

function loadCloudinaryHero(slug) {
  const cdnPath = path.join(SITE_ROOT, 'scripts/mexico-cloudinary-manifest.json');
  if (!fs.existsSync(cdnPath)) return null;
  try {
    const cdn = JSON.parse(fs.readFileSync(cdnPath, 'utf8'));
    const entry = cdn.uploaded?.[`${slug}:hero`];
    return entry?.secure_url?.includes('dphvjbqb4') ? entry.secure_url : null;
  } catch {
    return null;
  }
}

function buildIndexEntry({ slug, data }, manifestBySlug) {
  const manifest = manifestBySlug[slug];
  const heroFromManifest = manifest?.images?.find((img) => img.role === 'hero')?.url ?? null;
  const heroCloudinary = loadCloudinaryHero(slug);

  return {
    slug,
    name: deriveName(data.title, slug),
    area: data.area ?? null,
    developer: data.developer ?? null,
    priceFromUsd: data.priceFromUsd ?? null,
    status: data.status ?? null,
    heroImage: heroCloudinary ?? heroFromManifest ?? data.heroImage ?? null,
  };
}

function main() {
  const manifestBySlug = loadManifest();
  const mdxProjects = loadMdxProjects();

  const missingManifest = mdxProjects
    .map((p) => p.slug)
    .filter((slug) => !manifestBySlug[slug]);
  if (missingManifest.length) {
    console.warn('⚠️  MDX slugs missing from manifest:', missingManifest.join(', '));
  }

  const projects = mdxProjects.map((entry) => buildIndexEntry(entry, manifestBySlug));
  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: {
      manifest: 'invest-spain-property-website/scripts/mexico-project-images-all.json',
      content: 'invest-spain-property-website/src/content/projects/*.mdx',
    },
    count: projects.length,
    projects,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (dryRun) {
    console.log(json);
    return;
  }

  fs.mkdirSync(path.dirname(INDEX_OUT), { recursive: true });
  fs.writeFileSync(INDEX_OUT, json, 'utf8');
  console.log(`✅ Wrote ${projects.length} projects → ${INDEX_OUT}`);
}

main();
