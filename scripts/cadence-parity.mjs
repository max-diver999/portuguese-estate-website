#!/usr/bin/env node
/**
 * Сверка копий движка AI-каденции.
 *
 * Движок `scripts/lib/ai-cadence.mjs` и CLI `scripts/cadence-check.mjs` живут
 * копиями на тринадцати сайтах MORE Group. Копии обязаны быть
 * байт в байт: язык и пороги задаёт только `scripts/lib/cadence-thresholds.mjs`.
 *
 * Зачем проверка. У нас уже расходился движок проверки видимости в ИИ, когда
 * он жил тремя копиями: правку внесли в одну, а мерили по другой, и полгода
 * никто не замечал. Ловится это только хэшем.
 *
 * Две проверки:
 *   1. Хэш локальных файлов против записанного в cadence-engine.lock.json.
 *      Правишь движок - обнови lock ЗДЕСЬ И НА ВТОРОМ САЙТЕ одним заходом.
 *   2. Если соседний репозиторий лежит рядом на диске, сверка с его копией.
 *      В CI соседа нет, поэтому этот шаг пропускается с явной пометкой, а не
 *      тихо считается пройденным.
 *
 * Обновить lock после осознанной правки движка: --update
 *
 * Коды выхода: 0 совпало, 1 расхождение.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = path.join(ROOT, 'scripts/lib/cadence-engine.lock.json');
const SHARED = ['scripts/lib/ai-cadence.mjs', 'scripts/cadence-check.mjs'];

/** Все сайты, где лежит та же пара файлов. Сверяются главные checkout-ы, не рабочие деревья. */
const SIBLINGS = [
  'moregroupestate-ru', 'more-group-website', 'greek-invest-website', 'portuguese-estate-website',
  'invest-cambodia-website', 'invest-gulf-website', 'italian-estate-website', 'invest-singapore-website',
  'capetown-invest-website', 'florida-estate-website', 'globalyachtguide-website', 'mexico-invest-website',
  'invest-spain-property-website',
];

const update = process.argv.includes('--update');

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const actual = {};
for (const rel of SHARED) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[cadence-parity] нет файла ${rel}`);
    process.exit(1);
  }
  actual[rel] = sha(abs);
}

if (update) {
  fs.writeFileSync(LOCK, `${JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), files: actual }, null, 2)}\n`);
  console.log('[cadence-parity] lock обновлён:');
  for (const [k, v] of Object.entries(actual)) console.log(`  ${k}  ${v.slice(0, 16)}…`);
  console.log('[cadence-parity] не забудь тот же lock на втором сайте, иначе он упадёт');
  process.exit(0);
}

let failed = false;

if (!fs.existsSync(LOCK)) {
  console.error('[cadence-parity] нет cadence-engine.lock.json, создай через --update');
  process.exit(1);
}
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
for (const rel of SHARED) {
  if (lock.files?.[rel] !== actual[rel]) {
    console.error(`[cadence-parity] ${rel} разошёлся с lock`);
    console.error(`  в lock:  ${lock.files?.[rel] ?? 'нет записи'}`);
    console.error(`  на диске: ${actual[rel]}`);
    failed = true;
  }
}
if (!failed) console.log(`[cadence-parity] хэши совпадают с lock от ${lock.updatedAt}`);

const parent = path.join(ROOT, '..');
const here = path.basename(ROOT);
let comparedFiles = 0;
let siblingSeen = false;
for (const name of SIBLINGS) {
  if (here.startsWith(name)) continue;
  const dir = path.join(parent, name);
  if (!fs.existsSync(dir)) continue;
  siblingSeen = true;
  for (const rel of SHARED) {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) {
      console.log(`[cadence-parity] SKIPPED: у ${name} ещё нет ${rel}`);
      continue;
    }
    comparedFiles += 1;
    if (sha(abs) !== actual[rel]) {
      console.error(`[cadence-parity] ${rel} отличается от копии в ${name}`);
      failed = true;
    }
  }
}
if (!siblingSeen) {
  console.log('[cadence-parity] SKIPPED: соседнего сайта нет на диске (это нормально в CI)');
} else if (comparedFiles === 0) {
  console.log('[cadence-parity] SKIPPED: у соседа файлов движка ещё нет, сверить не с чем');
} else if (!failed) {
  console.log(`[cadence-parity] копия соседнего сайта совпадает (${comparedFiles} файл(ов))`);
}

process.exit(failed ? 1 : 0);
