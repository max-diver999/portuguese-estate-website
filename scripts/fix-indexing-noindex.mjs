#!/usr/bin/env node
/** Remove noindex guide URLs from indexing lists. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const siteConfig = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const HOST = (siteConfig.siteUrl || `https://${siteConfig.siteHost}`).replace(/\/$/, '');

const NOINDEX_SLUGS = new Set();

for (const file of readdirSync(join(ROOT, 'src/content/guides'))) {
  if (!file.endsWith('.mdx')) continue;
  const raw = readFileSync(join(ROOT, 'src/content/guides', file), 'utf8');
  if (/^noindex:\s*true/m.test(raw)) {
    NOINDEX_SLUGS.add(file.replace('.mdx', ''));
  }
}

const noindexUrls = new Set(
  [...NOINDEX_SLUGS].map((slug) => `${HOST}/guides/${slug}/`),
);

console.log('Noindex guides:', [...NOINDEX_SLUGS].join(', '));

function filterTxt(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const kept = lines.filter((l) => l.trim() && !noindexUrls.has(l.trim()));
  const removed = lines.length - kept.length - (lines.at(-1) === '' ? 1 : 0);
  writeFileSync(path, kept.join('\n') + (kept.length ? '\n' : ''), 'utf8');
  console.log(`${path}: removed ${removed} noindex URL(s), kept ${kept.filter(Boolean).length}`);
}

filterTxt(join(__dirname, 'index-rollout-all-urls.txt'));
filterTxt(join(__dirname, 'index-rollout-google-pending.txt'));

const submittedPath = join(__dirname, 'submitted-urls.json');
if (readFileSync(submittedPath, 'utf8').includes('{')) {
  const data = JSON.parse(readFileSync(submittedPath, 'utf8'));
  const urls = Array.isArray(data.urls) ? data.urls : data;
  const list = Array.isArray(urls) ? urls : data.urls || [];
  const before = list.length;
  const filtered = list.filter((u) => !noindexUrls.has(u));
  if (Array.isArray(data.urls)) {
    data.urls = filtered;
    data.submittedCount = filtered.length;
    data.noindexExcluded = [...NOINDEX_SLUGS];
    writeFileSync(submittedPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  console.log(`${submittedPath}: removed ${before - filtered.length}, kept ${filtered.length}`);
}

const gapPath = join(__dirname, 'indexing-gap-queue.json');
if (readFileSync(gapPath, 'utf8').includes('{')) {
  const gap = JSON.parse(readFileSync(gapPath, 'utf8'));
  gap.urls = (gap.urls || []).filter((u) => !noindexUrls.has(u));
  gap.gapCount = gap.urls.length;
  gap.noindexExcluded = [...NOINDEX_SLUGS];
  writeFileSync(gapPath, JSON.stringify(gap, null, 2) + '\n', 'utf8');
  console.log(`${gapPath}: updated gapCount=${gap.gapCount}`);
}
