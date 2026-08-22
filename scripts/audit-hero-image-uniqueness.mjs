/**
 * Hero image uniqueness audit.
 *
 * Two things can go wrong with hero images and only one of them is visible in a diff:
 *   1. Two pages pointing at the same URL — caught by the content gate, no network needed.
 *   2. Two pages pointing at *different* URLs that show the same thing — a second shot from
 *      the same viewpoint, another frame from the same photo walk. That is what a reader sees
 *      as a duplicate, and it needs the pixels.
 *
 * This script downloads every hero in use, reduces each to a 9x8 greyscale, and computes a
 * 64-bit difference hash. Pairs within HAMMING_MAX bits are reported as near-duplicates.
 * Hashes are cached in .content-os/cache/hero-image-hashes.json keyed by URL.
 *
 *   node scripts/audit-hero-image-uniqueness.mjs            # audit what the MDX currently uses
 *   node scripts/audit-hero-image-uniqueness.mjs --manifest # audit the sourcing manifest instead
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, '.content-os/cache/hero-image-hashes.json');
const HAMMING_MAX = 12;
const UA = 'portuguese-estate-image-audit/1.0 (https://portuguese-estate.com)';

const useManifest = process.argv.includes('--manifest');

/** Every heroImage in the corpus, plus the standalone images the pages hard-code. */
function collectFromCorpus() {
  const out = [];
  const base = path.join(ROOT, 'src/content');
  for (const col of fs.readdirSync(base)) {
    const dir = path.join(base, col);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue;
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const m = raw.match(/^heroImage:\s*["']([^"']+)["']/m);
      if (m) out.push({ id: `${col}/${file.replace(/\.mdx?$/, '')}`, url: m[1] });
    }
  }
  // featured.ts also holds the credit link, which is a Commons wiki page rather than
  // a photograph. Match on the host that actually serves files.
  const IMAGE_HOST = /^https:\/\/(res\.cloudinary\.com|upload\.wikimedia\.org)\//;
  const featured = fs.readFileSync(path.join(ROOT, 'src/data/featured.ts'), 'utf8');
  for (const m of featured.matchAll(/['"](https?:\/\/[^'"]+)['"]/g)) {
    if (IMAGE_HOST.test(m[1])) out.push({ id: 'src/data/featured.ts', url: m[1] });
  }
  return out;
}

function collectFromManifest() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/portugal-commons-images.json'), 'utf8'));
  return data.images.map((i) => ({ id: `${i.collection}/${i.slug}`, url: i.url }));
}

const entries = useManifest ? collectFromManifest() : collectFromCorpus();

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

async function fetchBuffer(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === 4) throw err;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error('unreachable');
}

/** 64-bit dHash as a hex string. */
async function dhash(buf) {
  const px = await sharp(buf).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += px[y * 9 + x] < px[y * 9 + x + 1] ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

const urls = [...new Set(entries.map((e) => e.url))];
const missing = urls.filter((u) => !cache[u]);
if (missing.length) {
  process.stderr.write(`hashing ${missing.length} image(s)\n`);
  const CONCURRENCY = 4;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const chunk = missing.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(chunk.map(async (u) => {
      try {
        cache[u] = await dhash(await fetchBuffer(u));
      } catch (err) {
        cache[u] = null;
        process.stderr.write(`\n  unreachable: ${u} — ${err.message}\n`);
      }
    }));
    process.stderr.write('.');
  }
  process.stderr.write('\n');
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2) + '\n');
}

const problems = [];

// 1. Same URL on more than one page.
const byUrl = new Map();
for (const e of entries) {
  if (!byUrl.has(e.url)) byUrl.set(e.url, []);
  byUrl.get(e.url).push(e.id);
}
for (const [url, ids] of byUrl) {
  if (ids.length > 1) problems.push({ kind: 'same-url', pages: ids, detail: url });
}

// 2. Different URLs, same picture.
const hashed = entries.filter((e) => cache[e.url]);
for (let i = 0; i < hashed.length; i += 1) {
  for (let j = i + 1; j < hashed.length; j += 1) {
    if (hashed[i].url === hashed[j].url) continue;
    const d = hamming(cache[hashed[i].url], cache[hashed[j].url]);
    if (d <= HAMMING_MAX) {
      problems.push({ kind: 'near-duplicate', pages: [hashed[i].id, hashed[j].id], detail: `${d} bits apart` });
    }
  }
}

const unreachable = entries.filter((e) => cache[e.url] === null);
for (const e of unreachable) problems.push({ kind: 'unreachable', pages: [e.id], detail: e.url });

console.log(`hero images: ${entries.length} references, ${urls.length} distinct URLs`);
if (!problems.length) {
  console.log('PASS — every page carries its own picture, and no two pictures look alike.');
  process.exit(0);
}
for (const p of problems) console.log(`${p.kind.toUpperCase()}  ${p.pages.join('  <->  ')}  (${p.detail})`);
console.log(`\nFAIL — ${problems.length} problem(s).`);
process.exit(1);
