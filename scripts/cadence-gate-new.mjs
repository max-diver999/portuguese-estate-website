#!/usr/bin/env node
/**
 * Гейт новых статей: машинный почерк (и английские слова, где есть словарь сайта).
 *
 *   node scripts/cadence-gate-new.mjs                    против origin/main
 *   node scripts/cadence-gate-new.mjs --base origin/main
 *
 * НОВАЯ статья (файл добавлен в ветке) с любым замечанием проверки - ошибка:
 * написать её сразу чисто дешевле, чем чистить потом.
 * ИЗМЕНЁННАЯ старая статья - только замечание: корпус несёт долг, и правка
 * одной строки не должна заставлять переписывать страницу целиком.
 * Невидимые символы (zero-width, BOM) - ошибка в любом файле.
 *
 * Запускается на каждый PR в GitHub (.github/workflows/content-cadence.yml),
 * то есть не зависит от того, вспомнил ли автор запустить проверку.
 *
 * Сайт может исключить вид замечания из гейта через GATE_SKIP_KINDS в
 * scripts/lib/cadence-thresholds.mjs, с объяснением почему.
 *
 * Коды выхода: 0 можно, 1 есть ошибки, 2 сбой запуска.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeCadence, cadenceIssues } from './lib/ai-cadence.mjs';
import * as T from './lib/cadence-thresholds.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TERMS_FILE = path.join(ROOT, 'scripts/lib/cadence-terms.mjs');
const TERMS = fs.existsSync(TERMS_FILE) ? (await import(TERMS_FILE)).TERMS : null;
const SKIP = new Set(T.GATE_SKIP_KINDS || []);

const argv = process.argv.slice(2);
const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'origin/main';

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

let added = [];
let modified = [];
try {
  const list = (filter) => git(`diff --name-only --diff-filter=${filter} ${base}...HEAD -- src/content`).split('\n').filter((f) => /\.mdx?$/.test(f));
  added = list('A');
  modified = list('M');
} catch (e) {
  console.error(`[cadence-gate] не удалось сравнить с ${base}: ${String(e.stderr || e.message).trim().slice(0, 200)}`);
  console.error('[cadence-gate] в CI нужен checkout с fetch-depth: 0');
  process.exit(2);
}
// Локально: новые файлы, ещё не добавленные в git, тоже новые статьи.
try {
  added.push(...git('ls-files --others --exclude-standard -- src/content').split('\n').filter((f) => /\.mdx?$/.test(f)));
} catch { /* не git: пропуск */ }
added = [...new Set(added)].filter((f) => fs.existsSync(path.join(ROOT, f)));
modified = [...new Set(modified)].filter((f) => fs.existsSync(path.join(ROOT, f)) && !added.includes(f));

if (!added.length && !modified.length) {
  console.log('[cadence-gate] статей в изменениях нет');
  process.exit(0);
}

const errors = [];
const warnings = [];
for (const [files, isNew] of [[added, true], [modified, false]]) {
  for (const f of files) {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const coll = f.split('/')[2] || 'default';
    const a = analyzeCadence(raw, { lang: T.LANG, terms: TERMS });
    const { issues, hard } = cadenceIssues(a, T.cadenceProfileFor(coll));
    for (const h of hard) errors.push(`${f}: ${h.kind}: ${h.detail}`);
    for (const i of issues) {
      if (SKIP.has(i.kind)) continue;
      (isNew ? errors : warnings).push(`${f}: ${i.kind}: ${i.detail}`);
    }
  }
}

console.log(`[cadence-gate] новых статей ${added.length}, изменённых ${modified.length}`);
if (warnings.length) {
  console.log(`\n[cadence-gate] замечания по изменённым старым статьям (не блокируют, при правке страницы лучше почистить заодно):`);
  for (const w of warnings) console.log(`- ${w}`);
}
if (errors.length) {
  console.error(`\n[cadence-gate] ОШИБКИ (${errors.length}): новая статья должна быть чистой`);
  for (const e of errors) console.error(`- ${e}`);
  console.error('\nПодробно по файлу: node scripts/cadence-check.mjs <файл>. Нормы: навык seo-aeo-geo-humanizer.');
  process.exit(1);
}
console.log('\n[cadence-gate] новые статьи чистые');
