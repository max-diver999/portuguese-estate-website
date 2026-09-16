#!/usr/bin/env node
/**
 * Блок «Related research» читается, а не сливается с карточкой.
 *
 * Компонент писали под белую карточку и потому красили текст тёмным. На сайтах, где карточка стоит
 * на тёмной раме (--color-frame), выходило тёмное по тёмному: на invest-spain-property.com у
 * заголовка был контраст 1.30 при норме 4.5, то есть почти чёрный текст на тёмно-бордовом.
 *
 * Глазами такое мерить нельзя, поэтому проверка считает: берёт цвета из самого компонента,
 * разворачивает var(...) по объявлениям сайта и выдаёт отношение яркостей по WCAG.
 *
 * Если цвет посчитать не удалось, это не «прошло», а провал: молча пропускать нечитаемый текст
 * ровно то, чем эта поломка и жила.
 *
 *   node scripts/test-related-contrast.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN = 4.5;
// Через pathname нельзя: в пути есть кириллица, и она пришла бы процентными кодами.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const COMPONENT = join(ROOT, 'src/components/RelatedContent.astro');

if (!existsSync(COMPONENT)) {
  console.log('на этом сайте нет src/components/RelatedContent.astro, проверять нечего');
  process.exit(0);
}

/* ---------- откуда берутся значения переменных ---------- */

function tokenSources() {
  const files = [];
  for (const dir of ['src/styles', 'src/layouts', 'src/components']) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full)) {
      if (/\.(css|astro)$/.test(name)) files.push(join(full, name));
    }
  }
  return files;
}

const tokens = new Map();
for (const file of tokenSources()) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    tokens.set(m[1], m[2].trim());
  }
}

/* ---------- разбор цветов ---------- */

function toRgb(value) {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

/** var(--a, var(--b, #fff)) разворачивается по объявлениям сайта. */
function resolve(value, depth = 0) {
  if (depth > 8) return null;
  const v = value.trim();
  const direct = toRgb(v);
  if (direct) return direct;
  const m = v.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([\s\S]+))?\)$/i);
  if (!m) return null;
  const [, name, fallback] = m;
  if (tokens.has(name)) {
    const resolved = resolve(tokens.get(name), depth + 1);
    if (resolved) return resolved;
  }
  if (fallback) return resolve(fallback, depth + 1);
  return null;
}

function luminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ---------- что объявлено в самом компоненте ---------- */

const style = readFileSync(COMPONENT, 'utf8')
  .match(/<style>([\s\S]*?)<\/style>/)?.[1]
  // Комментарии убираем сразу: запятая внутри них ломала бы разбор селекторов.
  ?.replace(/\/\*[\s\S]*?\*\//g, '');
if (!style) {
  console.error('FAIL в компоненте нет блока <style>, посчитать нечего');
  process.exit(1);
}

const rules = [];
for (const chunk of style.split('}')) {
  const i = chunk.indexOf('{');
  if (i === -1) continue;
  const selector = chunk.slice(0, i).replace(/^[\s\S]*\{/, '').trim();
  const body = chunk.slice(i + 1);
  if (selector) rules.push({ selector, body });
}

function declaration(selectorTest, prop) {
  let found = null;
  for (const rule of rules) {
    if (!rule.selector.split(',').map((s) => s.trim()).some(selectorTest)) continue;
    const m = rule.body.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`));
    if (m) found = m[1].trim();
  }
  return found;
}

const cardBgRaw = declaration((s) => s === '.related-content a', 'background')
  ?? declaration((s) => s === '.related-content a', 'background-color');
if (!cardBgRaw) {
  console.error('FAIL у .related-content a не найден фон, посчитать не от чего');
  process.exit(1);
}
const cardBg = resolve(cardBgRaw);
if (!cardBg) {
  console.error(`FAIL фон карточки не разворачивается в цвет: ${cardBgRaw}`);
  process.exit(1);
}

const PARTS = [
  ['подпись', '.related-content__label'],
  ['заголовок', '.related-content__title'],
  ['описание', '.related-content__desc'],
];

console.log(`фон карточки ${cardBgRaw} = rgb(${cardBg.join(', ')})`);

let bad = 0;
for (const [human, selector] of PARTS) {
  const raw = declaration((s) => s === selector, 'color');
  if (!raw) {
    bad++;
    console.error(`FAIL ${human} (${selector}): цвет не объявлен, посчитать нечего`);
    continue;
  }
  const rgb = resolve(raw);
  if (!rgb) {
    bad++;
    console.error(`FAIL ${human} (${selector}): цвет ${raw} не разворачивается, посчитать нечего`);
    continue;
  }
  const ratio = contrast(rgb, cardBg);
  const line = `${human.padEnd(10)} ${raw.padEnd(46)} ${ratio.toFixed(2)}`;
  if (ratio >= MIN) console.log(`ok   ${line}`);
  else {
    bad++;
    console.error(`FAIL ${line} при норме ${MIN}`);
  }
}

console.log(bad ? `\nнечитаемых элементов: ${bad}` : `\nвсе три элемента читаются, норма ${MIN}`);
process.exit(bad ? 1 : 0);
