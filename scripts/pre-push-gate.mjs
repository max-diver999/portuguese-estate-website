#!/usr/bin/env node
/**
 * Pre-push gate: validate MDX in commits being pushed + build.
 * Usage: npm run prepush:gate
 * Install: npm run setup:hooks
 */
import { execSync, spawnSync } from 'node:child_process';

const repoRoot = process.cwd();

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function gitOut(args) {
  try {
    return execSync(['git', ...args].join(' '), { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function mdxBeingPushed() {
  const upstream = gitOut(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const range = upstream ? `${upstream}..HEAD` : 'HEAD';
  const files = gitOut(['diff', '--name-only', range]);
  return files.split('\n').filter((f) => /^src\/content\/.*\.mdx$/.test(f));
}

console.log('=== mexico-invest pre-push gate ===');

const mdxFiles = mdxBeingPushed();
if (mdxFiles.length) {
  console.log(`MDX in push (${mdxFiles.length} files) → corpus signals + validate + build`);
  run('node', ['scripts/qa-corpus-signals.mjs']);
  const changed = gitOut(['diff', '--name-only', 'HEAD']);
  const unstaged = gitOut(['diff', '--name-only']);
  const hasLocalDiff = [...changed.split('\n'), ...unstaged.split('\n')].some((f) =>
    /^src\/content\/.*\.mdx$/.test(f),
  );
  if (hasLocalDiff) {
    run('node', ['scripts/qa-audit.mjs', '--changed']);
  } else {
    for (const f of mdxFiles) {
      run('node', ['scripts/qa-audit.mjs', '--file', f]);
    }
  }
  console.log('→ npm run build');
  run('npm', ['run', 'build']);
} else {
  console.log('No MDX in outgoing commits — skipping content validate/build');
}

console.log('✅ prepush gate passed');
