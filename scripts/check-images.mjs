#!/usr/bin/env node
/**
 * Гейт картинок. Кладётся в каждый сайт как scripts/check-images.mjs и запускается после сборки.
 *
 * Зачем. Проверки, которые были на сайтах до сентября 2026, искали в собранных страницах адреса
 * Cloudinary. После переезда на R2 таких адресов не осталось, и проверки стали зелёными всегда,
 * что бы ни случилось. В тот же период на живых сайтах оказались: обложка размером 54 байта и
 * кадром 2 на 2 пикселя, иконка приложения 180 на 180, растянутая на 1280 на 720, и полная потеря
 * выбора размера, из-за которой телефон качал файл для компьютера.
 *
 * Этот гейт ловит ровно эти четыре случая и валит сборку. Зелёный ответ здесь что-то значит.
 *
 *   node scripts/check-images.mjs              проверить dist
 *   node scripts/check-images.mjs --dir build  другая папка сборки
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const DIST = dirIdx >= 0 ? args[dirIdx + 1] : 'dist';
const R2_HOST = 'pub-2855c73eea384110b510f25966292c37.r2.dev';

/** Картинка легче этого это не картинка, а пустышка. */
const MIN_BYTES = 2048;
/** Иконки и логотипы живут по этим путям и в роли фотографии появляться не должны. */
const NOT_A_PHOTO = /(apple-touch-icon|favicon|logo|icon-\d+|placeholder)/i;

if (!existsSync(DIST)) {
  console.error(`Гейт картинок: папки сборки ${DIST} нет. Сначала соберите сайт.`);
  process.exit(1);
}

function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) htmlFiles(join(dir, e.name), out);
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i')) || tag.match(new RegExp(`${name}='([^']*)'`, 'i'));
  return m ? m[1] : '';
};

const problems = { tiny: [], noSrcset: [], noSize: [], iconAsPhoto: [] };
const seen = new Set();
const pages = htmlFiles(DIST);

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = file.replace(DIST, '').replace(/index\.html$/, '') || '/';

  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attr(tag, 'src');
    if (!src || src.startsWith('data:')) continue;

    /** Иконка в роли фотографии: ловим по размерам блока, а не по вере в имя файла. */
    const w = Number(attr(tag, 'width') || 0);
    if (NOT_A_PHOTO.test(src) && w >= 600) problems.iconAsPhoto.push({ page, src });

    if (!src.includes(R2_HOST)) continue;

    if (!attr(tag, 'width') || !attr(tag, 'height')) problems.noSize.push({ page, src });

    const srcset = attr(tag, 'srcset');
    const candidates = srcset ? srcset.split(',').filter((c) => /\s\d+w\s*$/.test(c.trim())).length : 0;
    if (candidates < 2) problems.noSrcset.push({ page, src, candidates });

    seen.add(src.split('?')[0]);
  }
}

/** Вес проверяем по сети и только по разным адресам: файлов меньше, чем упоминаний. */
const tiny = [];
for (const url of seen) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const len = Number(r.headers.get('content-length') || 0);
    if (!r.ok) tiny.push({ url, why: `ответ ${r.status}` });
    else if (len && len < MIN_BYTES) tiny.push({ url, why: `${len} байт` });
  } catch (e) {
    tiny.push({ url, why: `не открылась: ${e.message}` });
  }
}
problems.tiny = tiny;

const uniq = (list, key) => [...new Map(list.map((x) => [x[key], x])).values()];
const noSrcset = uniq(problems.noSrcset, 'src');
const noSize = uniq(problems.noSize, 'src');
const icons = uniq(problems.iconAsPhoto, 'src');

console.log(`Гейт картинок: страниц ${pages.length}, разных картинок с R2 ${seen.size}`);

let failed = false;
const report = (title, list, format) => {
  if (!list.length) return;
  failed = true;
  console.log(`\n${title}: ${list.length}`);
  for (const x of list.slice(0, 15)) console.log(`  ${format(x)}`);
  if (list.length > 15) console.log(`  и ещё ${list.length - 15}`);
};

report('Пустые или неоткрывающиеся картинки', problems.tiny, (x) => `${x.why}  ${x.url}`);
report('Без выбора размера (телефон качает файл для компьютера)', noSrcset, (x) => `${x.page}  ${x.src}`);
report('Без размеров кадра (страница прыгает при загрузке)', noSize, (x) => `${x.page}  ${x.src}`);
report('Иконка в роли фотографии', icons, (x) => `${x.page}  ${x.src}`);

if (failed) {
  console.log('\nСборка не принимается. Это те самые случаи, которые в сентябре 2026 доехали до живых сайтов.');
  process.exit(1);
}
console.log('Картинки в порядке: все открываются, у всех есть выбор размера и размеры кадра.');
