#!/usr/bin/env node
/**
 * src/data/page-lastmod.json holds the honest "last changed" date for pages that are
 * not articles, so every page type can carry dateModified instead of only the
 * collections.
 *
 * The date is the newest git commit touching the page file or any local module it
 * imports directly, because a pricing page changes when src/data/pricing.ts
 * changes, not when the .astro wrapper does.
 *
 * Vercel clones shallow, so git there usually answers with the deploy commit or
 * nothing at all. The generated file is therefore committed, and this script
 * only ever moves a date forward: a value it cannot recompute is kept.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadConfig, parseFrontmatter, isoDay } from './lib.mjs';

const cfg = loadConfig();
const PAGES_DIR = path.join(ROOT, 'src/pages');
const OUT = path.join(ROOT, 'src/data/page-lastmod.json');
/** A module used by more pages than this is shared plumbing, not this page's content. */
const SHARED_AFTER = 2;

/**
 * A shallow clone has a single commit, and git then reports that commit for every
 * file, which would stamp the whole site with the deploy date. Vercel clones that
 * way, so on Vercel the committed map is simply kept.
 */
function hasRealHistory() {
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (shallow === 'true') return false;
    const count = Number(
      execFileSync('git', ['rev-list', '--count', 'HEAD'], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim(),
    );
    return Number.isFinite(count) && count > 1;
  } catch {
    return false;
  }
}

function gitDay(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    // .md and .mdx files in src/pages are routes too: /privacy/ is privacy.md here.
    else if (e.isFile() && /\.(astro|mdx?)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/**
 * src/pages/about/index.astro -> /about/ ; src/pages/index.astro -> /
 * A dynamic route becomes a wildcard key: src/pages/produkty/[slug].astro -> /produkty/*
 * Pages generated from a data module have no frontmatter date of their own, so the date
 * of that module is the only honest answer for all of them.
 */
function routeFor(file) {
  const rel = path.relative(PAGES_DIR, file).split(path.sep).join('/');
  const noExt = rel.replace(/\.(astro|mdx?)$/, '');
  const segments = noExt.split('/');
  const dynamicAt = segments.findIndex((s) => s.includes('['));
  if (dynamicAt !== -1) {
    const prefix = segments.slice(0, dynamicAt).join('/');
    return prefix ? `/${prefix}/*` : '/*';
  }
  const clean = noExt.replace(/(^|\/)index$/, '');
  return clean ? `/${clean}/` : '/';
}

/** Local imports one level deep, resolved to real files. */
function localImports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  if (!/\.astro$/.test(file)) return out;
  for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const base = path.resolve(path.dirname(file), m[1]);
    for (const cand of [base, `${base}.ts`, `${base}.astro`, `${base}.mjs`, `${base}/index.ts`]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        out.push(cand);
        break;
      }
    }
  }
  return out;
}

/** Newest updatedDate (or pubDate) inside a collection, for its index page. */
function newestInCollection(dir) {
  const abs = path.join(ROOT, 'src/content', dir);
  if (!fs.existsSync(abs)) return null;
  let newest = null;
  for (const file of fs.readdirSync(abs)) {
    if (!/\.mdx?$/.test(file)) continue;
    const { fm } = parseFrontmatter(fs.readFileSync(path.join(abs, file), 'utf8'));
    const day = isoDay(fm.updatedDate || fm.pubDate);
    if (day && (!newest || day > newest)) newest = day;
  }
  return newest;
}

function main() {
  const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  if (!hasRealHistory()) {
    console.log(
      `[page-lastmod] shallow or empty git history, keeping the committed map ` +
        `(${Object.keys(previous).length} route(s), ${cfg.host})`,
    );
    return;
  }
  const map = { ...previous };
  let moved = 0;
  let kept = 0;

  const files = walk(PAGES_DIR);

  // A module imported by many pages is shared plumbing (site.ts, the layout). Its
  // commit date says nothing about any one page, and counting it would stamp the
  // whole site with the date of the last refactor. Only narrowly used modules count.
  const usage = new Map();
  const importsOf = new Map();
  for (const file of files) {
    const deps = localImports(file);
    importsOf.set(file, deps);
    for (const d of deps) usage.set(d, (usage.get(d) ?? 0) + 1);
  }

  for (const file of files) {
    const route = routeFor(file);
    if (!route) continue;
    const own = (importsOf.get(file) ?? []).filter((d) => (usage.get(d) ?? 0) <= SHARED_AFTER);
    // A collection index changes when the collection does, not when its template does.
    const col = (cfg.collections ?? []).find((c) => `${c.urlPrefix}/` === route);
    const days = [gitDay(file), ...own.map(gitDay), col ? newestInCollection(col.dir) : null]
      .filter(Boolean)
      .sort();
    const newest = days.length ? days[days.length - 1] : null;
    if (!newest) {
      kept += 1;
      continue;
    }
    if (!map[route] || newest > map[route]) {
      if (map[route]) moved += 1;
      map[route] = newest;
    }
  }

  const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(
    `[page-lastmod] ${Object.keys(sorted).length} route(s), ${moved} moved forward, ` +
      `${kept} left on the committed value (${cfg.host})`,
  );
}

main();
