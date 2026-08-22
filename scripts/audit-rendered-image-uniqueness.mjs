/**
 * Rendered-HTML check: no photograph belongs to two pages.
 *
 * The frontmatter gate already blocks two MDX files sharing a heroImage. This runs
 * against the built output instead, because a duplicate can also arrive from a
 * hard-coded URL in a component or a data file — which is exactly how the homepage
 * ended up showing a project's hero photograph as its own.
 *
 * Hub and listing pages are exempt: a card is *supposed* to show the photograph of
 * the page it links to. What must never happen is one photograph owned by two
 * content pages.
 *
 *   node scripts/audit-rendered-image-uniqueness.mjs [dist-dir]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.vercel/output/static';
if (!fs.existsSync(root)) {
  console.error(`no build output at ${root} — run npm run build first`);
  process.exit(1);
}

/** Pages whose job is to show other pages' images. */
const LISTING = /^\/$|^\/(areas|guides|compare|projects|developers|segments|news|site-report)\/$/;

const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (entry === 'index.html') pages.push(p);
  }
})(root);

const owners = new Map();
let contentPages = 0;

for (const file of pages) {
  const rel = path.relative(root, path.dirname(file));
  const url = `/${rel === '' ? '' : `${rel}/`}`.replace(/\/+/g, '/');
  if (LISTING.test(url)) continue;
  contentPages += 1;
  const html = fs.readFileSync(file, 'utf8');
  const urls = new Set([...html.matchAll(/<img[^>]+src="(https?:[^"]+)"/g)].map((m) => m[1]));
  for (const u of urls) {
    if (!owners.has(u)) owners.set(u, []);
    owners.get(u).push(url);
  }
}

const shared = [...owners].filter(([, ps]) => ps.length > 1);
console.log(`content pages: ${contentPages} · distinct images: ${owners.size}`);
if (!shared.length) {
  console.log('PASS — no photograph appears on more than one content page.');
  process.exit(0);
}
for (const [u, ps] of shared) console.log(`SHARED  ${ps.join('  ')}\n        ${u}`);
console.log(`\nFAIL — ${shared.length} image(s) on more than one content page.`);
process.exit(1);
