#!/usr/bin/env node
/**
 * Проверка AI-каденции статей.
 *
 *   node scripts/cadence-check.mjs --calibrate            распределение по корпусу
 *   node scripts/cadence-check.mjs --changed              только изменённые файлы
 *   node scripts/cadence-check.mjs --all                  весь корпус
 *   node scripts/cadence-check.mjs src/content/gajdy/x.mdx
 *   node scripts/cadence-check.mjs --all --json
 *   node scripts/cadence-check.mjs --all --fail           ненулевой код при замечаниях
 *   node scripts/cadence-check.mjs --changed --fail-hard  ненулевой код только на невидимых
 *                                                         символах: так стоит в prebuild
 *
 * Коды выхода: 0 чисто, 1 есть замечания при --fail (или жёсткие при --fail-hard),
 * 2 ошибка ввода.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeCadence, cadenceIssues } from './lib/ai-cadence.mjs';
import { LANG, cadenceProfileFor } from './lib/cadence-thresholds.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const JSON_OUT = flag('--json');
const FAIL = flag('--fail');
const FAIL_HARD = flag('--fail-hard');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.mdx') || name.endsWith('.md')) out.push(p);
  }
  return out;
}

function changedFiles() {
  let out = '';
  for (const cmd of ['git diff --name-only HEAD', 'git diff --name-only --cached', 'git ls-files --others --exclude-standard']) {
    try { out += `${execSync(cmd, { cwd: ROOT, encoding: 'utf8' })}\n`; } catch { /* пусто */ }
  }
  return [...new Set(out.split('\n').map((s) => s.trim()).filter(Boolean))]
    .filter((f) => /^src\/content\/.+\.(mdx|md)$/.test(f))
    .map((f) => path.join(ROOT, f))
    .filter((f) => fs.existsSync(f));
}

function collectionOf(file) {
  const rel = path.relative(CONTENT, file);
  return rel.split(path.sep)[0] || 'default';
}

function targets() {
  const explicit = argv.filter((a) => !a.startsWith('--'));
  if (explicit.length) return explicit.map((f) => path.resolve(ROOT, f));
  if (flag('--changed')) return changedFiles();
  return walk(CONTENT);
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// --------------------------------------------------------------------------
// Режим калибровки: печатает распределение, ничего не блокирует.
// Порог берётся из корпуса, а не из головы.
// --------------------------------------------------------------------------
function calibrate(files) {
  const rows = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const a = analyzeCadence(raw, { lang: LANG });
    if (a.words < 250) continue;
    rows.push({ file: path.relative(ROOT, f), collection: collectionOf(f), ...a });
  }
  if (!rows.length) {
    console.error('нет файлов длиннее 250 слов для калибровки');
    process.exit(2);
  }

  const byCollection = new Map();
  for (const r of rows) {
    if (!byCollection.has(r.collection)) byCollection.set(r.collection, []);
    byCollection.get(r.collection).push(r);
  }

  const stat = (arr, pick) => {
    const v = arr.map(pick).filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    return {
      n: v.length,
      p50: quantile(v, 0.5),
      p75: quantile(v, 0.75),
      p90: quantile(v, 0.9),
      max: v[v.length - 1] ?? 0,
    };
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ rows: rows.map((r) => ({ file: r.file, collection: r.collection, words: r.words, per1k: r.per1k, metronomePct: r.metronome.pct, cv: r.burstiness.cv, counts: r.counts })) }, null, 2));
    return;
  }

  console.log(`Калибровка AI-каденции: ${rows.length} файлов длиннее 250 слов\n`);
  const show = (title, pick, fmt = (x) => x.toFixed(2)) => {
    const s = stat(rows, pick);
    console.log(`${title}`);
    console.log(`  весь корпус (n=${s.n}): медиана ${fmt(s.p50)}, p75 ${fmt(s.p75)}, p90 ${fmt(s.p90)}, макс ${fmt(s.max)}`);
    for (const [c, arr] of [...byCollection.entries()].sort()) {
      const cs = stat(arr, pick);
      if (cs.n < 5) continue;
      console.log(`    ${c.padEnd(14)} n=${String(cs.n).padStart(3)}  медиана ${fmt(cs.p50)}  p75 ${fmt(cs.p75)}  p90 ${fmt(cs.p90)}  макс ${fmt(cs.max)}`);
    }
    console.log('');
  };

  show('Плотность маркеров на 1000 слов', (r) => r.per1k);
  show('Метроном, % абзацев с коротким финалом', (r) => r.metronome.pct, (x) => `${x.toFixed(0)}%`);
  show('Разброс длин предложений (CV)', (r) => r.burstiness.cv);

  console.log('Вклад категорий (сумма по корпусу):');
  const totals = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.counts)) totals[k] = (totals[k] || 0) + v;
  for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${String(Math.round(v)).padStart(6)}   (${(v / rows.length).toFixed(2)} на файл)`);
  }

  const inv = rows.filter((r) => r.invisible.some((i) => !i.soft));
  const nbsp = rows.filter((r) => r.invisible.some((i) => i.soft));
  console.log(`\nНевидимые символы: жёсткие в ${inv.length} файлах, неразрывный пробел в ${nbsp.length}`);

  console.log('\nХудшие по плотности маркеров:');
  for (const r of [...rows].sort((a, b) => b.per1k - a.per1k).slice(0, 12)) {
    console.log(`  ${r.per1k.toFixed(1).padStart(5)} /1k  метроном ${String(Math.round(r.metronome.pct)).padStart(3)}%  ${r.file}`);
  }

  console.log('\nХудшие по метроному:');
  for (const r of [...rows].sort((a, b) => b.metronome.pct - a.metronome.pct).slice(0, 12)) {
    console.log(`  ${String(Math.round(r.metronome.pct)).padStart(3)}%  ${r.per1k.toFixed(1).padStart(5)} /1k  ${r.file}`);
  }

  console.log('\nПорог ставить по p75-p90 живого корпуса, а не по нулю: цель поймать хвост, а не переписать всё.');
}

// --------------------------------------------------------------------------
// Обычный режим
// --------------------------------------------------------------------------
function run(files) {
  const report = [];
  let withIssues = 0;
  let withHard = 0;

  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const collection = collectionOf(f);
    const a = analyzeCadence(raw, { lang: LANG });
    const { issues, hard } = cadenceIssues(a, cadenceProfileFor(collection));
    if (issues.length || hard.length) {
      report.push({ file: path.relative(ROOT, f), collection, words: a.words, per1k: Number(a.per1k.toFixed(1)), metronomePct: Math.round(a.metronome.pct), cv: a.burstiness.cv, issues, hard, examples: a.examples });
      if (issues.length) withIssues += 1;
      if (hard.length) withHard += 1;
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ checked: files.length, withIssues, withHard, report }, null, 2));
  } else {
    console.log(`AI-каденция: проверено ${files.length}, с замечаниями ${withIssues}, с жёсткими нарушениями ${withHard}\n`);
    for (const r of report) {
      console.log(`${r.file}  (${r.words} слов, ${r.per1k}/1k, метроном ${r.metronomePct}%, CV ${r.cv === null ? 'н/д' : r.cv.toFixed(2)})`);
      for (const h of r.hard) console.log(`   БЛОК  ${h.kind}: ${h.detail}`);
      for (const i of r.issues) console.log(`   ---   ${i.kind}: ${i.detail}`);
      for (const [k, ex] of Object.entries(r.examples || {})) {
        if (['antithesis', 'colonHook', 'superlativeOpener'].includes(k)) {
          for (const e of ex.slice(0, 2)) console.log(`         ${k}: «${e}»`);
        }
      }
      console.log('');
    }
    if (!report.length) console.log('Замечаний нет.');
  }

  if (FAIL && (withHard > 0 || withIssues > 0)) process.exit(1);
  if (FAIL_HARD && withHard > 0) process.exit(1);
}

const files = targets();
if (!files.length) {
  console.log('AI-каденция: нечего проверять.');
  process.exit(0);
}
if (flag('--calibrate')) calibrate(files);
else run(files);
