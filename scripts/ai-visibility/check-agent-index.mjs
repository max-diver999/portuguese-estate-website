#!/usr/bin/env node
/**
 * The agent index (public/llms.txt) is what answer engines read instead of crawling.
 * It drifts silently: a page renamed or set to noindex stays advertised, and nothing
 * in the build notices. This gate fails when llms.txt points at a URL this site does
 * not serve, or at a page marked noindex or draft.
 *
 * It never rewrites llms.txt. On several sites that file is written by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig, parseFrontmatter } from './lib.mjs';

const cfg = loadConfig();
const INDEX = path.join(ROOT, 'public/llms.txt');

if (!fs.existsSync(INDEX)) {
  console.log('[agent-index] skipped: public/llms.txt does not exist');
  process.exit(0);
}

/** Routes this site actually serves: static pages plus indexable collection entries. */
function knownRoutes() {
  const routes = new Set();
  const noindex = new Set();

  const pagesDir = path.join(ROOT, 'src/pages');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(astro|ts|js)$/.test(e.name)) {
        const rel = path.relative(pagesDir, p).split(path.sep).join('/');
        if (/\[.+\]/.test(rel)) continue;
        const clean = rel.replace(/\.(astro|ts|js)$/, '').replace(/(^|\/)index$/, '');
        routes.add(clean ? `/${clean}/` : '/');
      }
    }
  };
  if (fs.existsSync(pagesDir)) walk(pagesDir);

  for (const col of cfg.collections ?? []) {
    const dir = path.join(ROOT, 'src/content', col.dir);
    if (!fs.existsSync(dir)) continue;
    routes.add(`${col.urlPrefix}/`);
    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue;
      const slug = file.replace(/\.mdx?$/, '');
      const route = `${col.urlPrefix}/${slug}/`;
      const { fm } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (fm.noindex === 'true' || fm.draft === 'true') noindex.add(route);
      else routes.add(route);
    }
  }
  return { routes, noindex };
}

const { routes, noindex } = knownRoutes();
const raw = fs.readFileSync(INDEX, 'utf8');
const host = cfg.host.replace(/\./g, '\\.');
// Trailing punctuation is not part of the URL: these files write both
// `- [Title](https://host/x/): description` and `- https://host/x/: description`.
const advertised = [
  ...new Set(
    [...raw.matchAll(new RegExp(`https?://${host}(/[^)\\s\\]<>"']*)`, 'g'))]
      .map((m) => m[1].replace(/[.,;:]+$/, '')),
  ),
];

/** Built by the framework or by this pack, so they are never found under src/pages. */
const GENERATED = [
  /^\/sitemap[^/]*\.xml$/,
  /^\/robots\.txt$/,
  /^\/llms[^/]*\.txt$/,
  /^\/index\.md$/,
  /^\/\.well-known\//,
  /^\/rss\.xml$/,
  /^\/feed\.xml$/,
];

const dead = [];
const closed = [];
for (const url of advertised) {
  if (GENERATED.some((rx) => rx.test(url))) continue;
  const route = url.replace(/\.md$/, '/').replace(/\/+$/, '/');
  const normalised = route.startsWith('/') ? route : `/${route}`;
  if (noindex.has(normalised)) {
    closed.push(url);
    continue;
  }
  // Files served straight out of public/ are legitimate targets too.
  if (fs.existsSync(path.join(ROOT, 'public', url.replace(/^\//, '')))) continue;
  if (!routes.has(normalised)) dead.push(url);
}

if (closed.length || dead.length) {
  console.error(`[agent-index] ${cfg.host}: llms.txt advertises URLs it should not`);
  for (const u of closed) console.error(`  noindex or draft: ${u}`);
  for (const u of dead) console.error(`  not served by this site: ${u}`);
  process.exit(1);
}

console.log(`[agent-index] ok: ${advertised.length} URL(s) in llms.txt, all live and indexable`);
