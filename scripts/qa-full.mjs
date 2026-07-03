#!/usr/bin/env node
/**
 * Full QA package — MORE Group niche sites (mexico-invest etalon).
 *
 * Run BEFORE "audit clean", "аудит сайта", "аудитируй статьи", or content batch push.
 * validate:content alone is NEVER sufficient.
 *
 * Usage:
 *   npm run qa:full              # full corpus GEO + images + live + build
 *   npm run qa:full:quick        # mid-batch: GEO on --changed only, no build
 *   node scripts/qa-full.mjs --local   # rendered audit on dist only (after build)
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const LOCAL_ONLY = args.includes('--local');
const SKIP_LIVE = args.includes('--no-live');

function siteName() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    return pkg.name || 'site';
  } catch {
    return 'site';
  }
}

function runStep(name, cmd, cmdArgs = []) {
  const started = Date.now();
  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const ms = Date.now() - started;
  const ok = result.status === 0;
  const out = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  const tail = out ? out.split('\n').slice(-10).join('\n') : '(no output)';
  return { name, ok, ms, tail, status: result.status ?? 1 };
}

const renderedArgs = LOCAL_ONLY || QUICK
  ? ['scripts/audit-rendered-live.mjs', '--local', '--fail']
  : ['scripts/audit-rendered-live.mjs', '--fail'];

const geoArgs = QUICK
  ? ['scripts/geo-citability-audit.mjs', '--changed']
  : ['scripts/geo-citability-audit.mjs', '--min-score', '90'];

const steps = [
  {
    name: 'Corpus signals (em-dash, padding dupes, fix-queue)',
    cmd: 'node',
    args: ['scripts/qa-corpus-signals.mjs'],
  },
  {
    name: 'Content validate (qa-audit, full corpus)',
    cmd: 'node',
    args: ['scripts/qa-audit.mjs'],
  },
  ...(existsSync(join(ROOT, 'scripts/audit-all-images.mjs'))
    ? [
        {
          name: 'Image URLs (HTTP 200 — all src/, not just heroImage)',
          cmd: 'node',
          args: ['scripts/audit-all-images.mjs', '--fail'],
        },
      ]
    : []),
  ...(existsSync(join(ROOT, 'scripts/geo-citability-audit.mjs'))
    ? [
        {
          name: QUICK ? 'GEO citability (--changed MDX)' : 'GEO citability (full corpus, min 90)',
          cmd: 'node',
          args: geoArgs,
        },
      ]
    : []),
  ...(SKIP_LIVE
    ? []
    : [
        {
          name: 'HTTP smoke (live sitemap + lead API)',
          cmd: 'node',
          args: ['scripts/post-deploy-smoke.mjs', '--http-only'],
        },
      ]),
  {
    name: LOCAL_ONLY ? 'Rendered HTML (local dist)' : 'Rendered HTML (live)',
    cmd: 'node',
    args: renderedArgs,
  },
  ...(QUICK
    ? []
    : [
        {
          name: 'Production build + local rendered postbuild',
          cmd: 'npm',
          args: ['run', 'build'],
        },
      ]),
];

console.log('\n═══════════════════════════════════════════');
console.log(`  QA FULL — ${siteName()}`);
console.log(
  `  quick: ${QUICK} | local-rendered: ${LOCAL_ONLY} | live-http: ${!SKIP_LIVE && !QUICK}`,
);
console.log('═══════════════════════════════════════════\n');

const results = [];
for (const step of steps) {
  process.stdout.write(`▶ ${step.name}… `);
  const r = runStep(step.name, step.cmd, step.args);
  results.push(r);
  console.log(r.ok ? `PASS (${(r.ms / 1000).toFixed(1)}s)` : `FAIL (${(r.ms / 1000).toFixed(1)}s)`);
}

const passed = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);

console.log('\n───────────────────────────────────────────');
console.log(`  RESULT: ${passed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('\n  FAILURES:');
  for (const f of failed) {
    console.log(`\n  ✗ ${f.name} (exit ${f.status})`);
    console.log(f.tail.split('\n').map((l) => `    ${l}`).join('\n'));
  }
} else {
  console.log('\n  ✓ Full QA package passed. Safe to report "audit clean" or push.');
}
console.log('───────────────────────────────────────────\n');

process.exit(failed.length ? 1 : 0);
