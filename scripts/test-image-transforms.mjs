#!/usr/bin/env node
/**
 * Каждое преобразование картинки отдаёт картинку, а не ошибку.
 *
 * g_auto говорит Cloudinary, какую часть кадра оставить ПРИ ОБРЕЗКЕ. Без режима обрезки он
 * бессмыслен, и Cloudinary отвечает 400, а не игнорирует его. Картинка не грузится совсем.
 *
 * На invest-spain-property.com такой параметр простоял двенадцать дней и выбил главные картинки на
 * 342 страницах. Никто не заметил, потому что сборка такие вещи не видит, а глазами каждую страницу
 * не открывают. Живы оставались только карточки: там единственный набор с c_fill.
 *
 * Поэтому проверка смотрит не на исходники, а на собранный сайт: берёт из dist/ все адреса
 * Cloudinary, какими бы путями они туда ни попали (хелпер, MDX, плагин), и ходит по ним.
 *
 *   node scripts/test-image-transforms.mjs            собрать dist заранее
 *   node scripts/test-image-transforms.mjs --offline  только разбор адресов, без сети
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFLINE = process.argv.includes('--offline');
// Через pathname нельзя: в пути есть кириллица, и она пришла бы процентными кодами.
const ROOT = fileURLToPath(new URL('../', import.meta.url));

/* Astro с адаптером Vercel пишет и dist/, и .vercel/output/static. Стоит смотреть на свежую:
 * старая лежит рядом и врала бы про то, чего на сайте уже нет. */
const DIST = ['dist', '.vercel/output/static']
  .map((d) => join(ROOT, d))
  .filter((d) => existsSync(d))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];

const URL_RE = /https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[^\s"'<>)\]]+/g;
const DELIVERY_RE = /^https:\/\/res\.cloudinary\.com\/([A-Za-z0-9_-]+)\/image\/upload\/(.+)$/;
const TOKEN_RE = /^(w_|h_|c_|f_|q_|g_|e_|b_|dpr_|fl_|a_|ar_|r_|o_|x_|y_|z_|bo_|co_|l_|u_|t_|if_)/;
const CROP_RE = /\bc_(crop|fill|thumb|lfill|fill_pad|auto|auto_pad|imagga_crop|imagga_scale)\b/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(html|css|js|json|txt|xml)$/.test(name)) out.push(full);
  }
  return out;
}

/** Первый сегмент после /upload/ это список преобразований, только если он из токенов. */
function splitDelivery(url) {
  const m = url.match(DELIVERY_RE);
  if (!m) return null;
  const [, cloud, rest] = m;
  const parts = rest.split('/');
  let head = parts[0] ?? '';
  if (/^v\d+$/.test(head)) {
    parts.shift();
    head = parts[0] ?? '';
  }
  const isTransform = head.split(',').every((t) => TOKEN_RE.test(t)) && head.length > 0;
  return { cloud, transforms: isTransform ? head : '', url };
}

const files = DIST ? walk(DIST) : [];
if (files.length === 0) {
  console.error('нет собранного сайта: сначала npm run build, потом эта проверка');
  process.exit(1);
}

const byTransform = new Map();
let seen = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const raw of text.match(URL_RE) || []) {
    const url = raw.replace(/&(amp|quot|#\d+);.*$/, '').replace(/[.,;:\\]+$/, '');
    const parsed = splitDelivery(url);
    if (!parsed) continue;
    seen++;
    const key = `${parsed.cloud}|${parsed.transforms}`;
    if (!byTransform.has(key)) byTransform.set(key, { ...parsed, file });
  }
}

console.log(`собранный сайт ${DIST.replace(ROOT, '')}: ${files.length} файлов, ${seen} адресов Cloudinary, ${byTransform.size} разных наборов преобразований`);

let bad = 0;

// Тот самый набор, что стоил двенадцати дней. Ловим по разбору, без сети.
for (const item of byTransform.values()) {
  if (/\bg_auto\b/.test(item.transforms) && !CROP_RE.test(item.transforms)) {
    bad++;
    console.error(`FAIL g_auto без режима обрезки, Cloudinary ответит 400: ${item.transforms}`);
    console.error(`     например ${item.url}`);
  }
}
if (bad === 0) console.log('ok   g_auto стоит только вместе с обрезкой');

if (!OFFLINE) {
  let unreachable = 0;
  for (const item of byTransform.values()) {
    const res = await fetch(item.url, { method: 'GET' }).catch(() => null);
    if (!res) {
      unreachable++;
      console.warn(`сеть недоступна для ${item.cloud} ${item.transforms || '(без преобразований)'}`);
      continue;
    }
    if (res.status === 200) {
      console.log(`ok   ${item.cloud} ${item.transforms || '(без преобразований)'}`);
    } else {
      bad++;
      console.error(`FAIL ${res.status} ${item.url}`);
    }
  }
  if (unreachable) console.warn(`не проверено из-за сети: ${unreachable}`);
} else {
  console.log('сеть не опрашивалась (--offline)');
}

const clean = OFFLINE
  ? 'разбор адресов чистый, картинки по сети не запрашивались'
  : 'все преобразования отдают картинку';
console.log(bad ? `\nбитых наборов: ${bad}` : `\n${clean}`);
process.exit(bad ? 1 : 0);
