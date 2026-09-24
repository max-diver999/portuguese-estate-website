#!/usr/bin/env node
/**
 * Гейт уникальности фото. Кладётся в сайт как scripts/check-photo-uniqueness.mjs и стоит в postbuild.
 *
 * Зачем. До сентября 2026 повторы «чистили» дважды, и оба раза их стало больше: один раз фото
 * раскладывали по страницам по очереди из небольшого набора, другой раз уникальность проверяли по
 * адресу файла, а одно и то же фото под двумя адресами считалось двумя разными. На 22.09.2026 у
 * Залива 488 страниц делили 67 обложек, у Florida 274 страницы делили 30.
 *
 * Этот гейт сравнивает сами картинки по отпечатку (dHash, 64 бита), а не имена файлов, и валит
 * сборку, если:
 *   1. одно фото стоит на двух разных страницах (обложкой или в тексте);
 *   2. одно фото дважды на одной странице;
 *   3. фото меньше своего места: обложке нужно 960 точек в ширину, фото в тексте 640.
 *
 * Отпечатки хранятся в src/data/image-fingerprints.json; недостающие гейт считает сам, скачав
 * уменьшенную копию, и дописывает файл (его стоит закоммитить, тогда сборка быстрее).
 * Пары, которые человек проверил и признал разными фото, кладутся в src/data/photo-repeat-allow.json
 * как ["адрес1", "адрес2"].
 *
 *   node scripts/check-photo-uniqueness.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'src/content');
const FP_PATH = join(ROOT, 'src/data/image-fingerprints.json');
const ALLOW_PATH = join(ROOT, 'src/data/photo-repeat-allow.json');
const MANIFEST_PATH = join(ROOT, 'src/data/r2-image-widths.json');
const THRESHOLD = 6;
/** Ключ в манифесте ширин: путь после адреса хранилища, старого или нового (media.oper-stack.com с 24.09.2026). */
const R2_PREFIXES = ['https://media.oper-stack.com/', 'https://pub-2855c73eea384110b510f25966292c37.r2.dev/'];
const r2KeyOf = (u) => { const p = R2_PREFIXES.find((x) => u.startsWith(x)); return p ? u.slice(p.length) : null; };

const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(d, e.name), out);
    else if (/\.mdx?$/.test(e.name)) out.push(join(d, e.name));
  }
  return out;
};

// Свои фото каждой страницы: обложка из frontmatter и картинки в тексте.
const photos = [];
for (const file of walk(CONTENT)) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  if (/^draft:\s*true/m.test(text)) continue;
  const hero = (text.match(/^heroImage:\s*["']?(https?:\/\/[^"'\s]+)/m) || [])[1];
  if (hero) photos.push({ page: rel, url: hero, role: 'обложка' });
  const body = text.slice(text.indexOf('\n---', 3) + 4);
  for (const m of body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s"]+)/g)) photos.push({ page: rel, url: m[1], role: 'в тексте' });
  for (const m of body.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/g)) photos.push({ page: rel, url: m[1], role: 'в тексте' });
}

const fp = existsSync(FP_PATH) ? JSON.parse(readFileSync(FP_PATH, 'utf8')) : {};
/**
 * Известные повторы, которые ждут своих фото (например, страницы проектов, которых нет в каталоге):
 * src/data/photo-repeat-known.json, список [страница, адрес]. Повтор из этих пар сборку не валит, но
 * печатается каждый раз. Любое новое вхождение, даже того же фото на другой странице, валит.
 */
const KNOWN_PATH = join(ROOT, 'src/data/photo-repeat-known.json');
const allow = existsSync(ALLOW_PATH) ? JSON.parse(readFileSync(ALLOW_PATH, 'utf8')) : [];
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {};
const norm = (u) => u.split('?')[0];

async function fingerprint(url) {
  const key = r2KeyOf(norm(url));
  const entry = key && manifest[key];
  const src = entry && (entry.variants || []).includes(360) ? norm(url).replace(/\.webp$/i, '-w360.webp') : url;
  const r = await fetch(src, { headers: { 'user-agent': 'MoreGroupPhotoGate/1.0' } });
  if (!r.ok) throw new Error(`ответ ${r.status}`);
  const px = await sharp(Buffer.from(await r.arrayBuffer())).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return bits.toString(16);
}

const urls = [...new Set(photos.map((p) => norm(p.url)))];
const missing = urls.filter((u) => !fp[u]);
const broken = [];
for (let i = 0; i < missing.length; i += 12) {
  await Promise.all(missing.slice(i, i + 12).map(async (u) => {
    try { fp[u] = await fingerprint(u); } catch (e) { broken.push(`${u} (${e.message})`); }
  }));
}
// В файле остаются только фото, которые сейчас стоят на страницах: снятые вычищаются.
const stale = Object.keys(fp).filter((u) => !urls.includes(u));
if (missing.length || stale.length) writeFileSync(FP_PATH, JSON.stringify(Object.fromEntries(urls.filter((u) => fp[u]).sort().map((k) => [k, fp[k]])), null, 1) + '\n');

const ham = (a, b) => { let x = BigInt('0x' + a) ^ BigInt('0x' + b), n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };
const allowed = (a, b) => allow.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// Группы одинаковых фото по отпечатку.
const list = urls.filter((u) => fp[u]);
const parent = new Map(list.map((u) => [u, u]));
const find = (u) => (parent.get(u) === u ? u : find(parent.get(u)));
for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  if (ham(fp[list[i]], fp[list[j]]) <= THRESHOLD && !allowed(list[i], list[j])) parent.set(find(list[j]), find(list[i]));
}
const byGroup = new Map();
for (const p of photos) {
  const u = norm(p.url);
  if (!fp[u]) continue;
  const g = find(u);
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(p);
}

const known = new Set((existsSync(KNOWN_PATH) ? JSON.parse(readFileSync(KNOWN_PATH, 'utf8')) : []).map(([page, url]) => `${page}|${norm(url)}`));
const isKnown = (ps) => ps.length > 0 && ps.every((p) => known.has(`${p.page}|${norm(p.url)}`));
const crossPage = [];
const samePage = [];
let knownRepeats = 0;
for (const [, ps] of byGroup) {
  const pages = [...new Set(ps.map((p) => p.page))];
  if (pages.length > 1) { if (isKnown(ps)) knownRepeats++; else crossPage.push(ps); }
  for (const pg of pages) {
    const on = ps.filter((p) => p.page === pg);
    if (on.length > 1) { if (isKnown(on)) knownRepeats++; else samePage.push({ page: pg, n: on.length, url: ps[0].url }); }
  }
}
const small = photos.filter((p) => {
  const key = r2KeyOf(norm(p.url));
  const w = key && manifest[key] ? manifest[key].w : null;
  return w && ((p.role === 'обложка' && w < 960) || (p.role === 'в тексте' && w < 640));
});

console.log(`Гейт уникальности фото: страниц ${new Set(photos.map((p) => p.page)).size}, фото ${urls.length}, отпечатков досчитано ${missing.length - broken.length}`);
let failed = false;
const show = (title, items, fmt) => {
  if (!items.length) return;
  failed = true;
  console.log(`\n${title}: ${items.length}`);
  for (const x of items.slice(0, 12)) console.log('  ' + fmt(x));
  if (items.length > 12) console.log(`  и ещё ${items.length - 12}`);
};
if (knownRepeats) console.log(`Известные повторы, ждут своих фото (${KNOWN_PATH.slice(ROOT.length + 1)}): ${knownRepeats}, сборку не валят`);
show('Одно фото на разных страницах', crossPage, (ps) => [...new Set(ps.map((p) => p.page))].join(' + '));
show('Одно фото дважды на странице', samePage, (x) => `${x.page} ×${x.n}`);
show('Фото меньше своего места', small, (p) => `${p.page} (${p.role})`);
show('Фото не открылось', broken, (x) => x);
if (failed) {
  console.log('\nСборка не принимается: каждой странице нужно своё фото. Если пара на самом деле разные снимки, добавьте её в src/data/photo-repeat-allow.json.');
  process.exit(1);
}
console.log(knownRepeats
  ? 'Новых повторов нет, мелких нет. Известные повторы из списка ещё ждут своих фото.'
  : 'Все фото уникальны: ни одно не стоит на двух страницах, повторов внутри статей нет, мелких нет.');
