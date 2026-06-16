/**
 * Run site validator (validate:strict or qa-audit) for fix:card / fix:queue --verify.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function detectSiteUrl(root) {
  const astro = join(root, 'astro.config.mjs');
  if (existsSync(astro)) {
    const m = readFileSync(astro, 'utf8').match(/site:\s*['"]([^'"]+)['"]/);
    if (m) return m[1].replace(/\/$/, '');
  }
  return null;
}

export function detectValidator(root) {
  if (existsSync(join(root, 'scripts/validate-content-quality.mjs'))) {
    return {
      script: 'scripts/validate-content-quality.mjs',
      strictArgs: ['--strict-protected'],
      filesFlag: '--files',
      fileArg: (rel) => rel,
    };
  }
  if (existsSync(join(root, 'scripts/qa-audit.mjs'))) {
    return {
      script: 'scripts/qa-audit.mjs',
      strictArgs: [],
      filesFlag: '--file',
      fileArg: (rel) => rel.replace(/^src\/content\//, ''),
    };
  }
  return null;
}

export function parseValidatorErrors(output) {
  const errors = [];
  for (const line of output.split('\n')) {
    const t = line.trim();
    if (/^\[content-quality\]/.test(t)) continue;
    if (t.startsWith('- ')) errors.push(t.slice(2).trim());
    else if (/^src\/content\/.+\.mdx:/.test(t)) errors.push(t);
    else if (/^\[[\w/.-]+\]/.test(t)) errors.push(t);
    else if (t.includes(' heroImage returned HTTP ')) errors.push(t);
    else if (t.startsWith('Duplicate ')) errors.push(t);
  }
  return [...new Set(errors)];
}

export function runStrictValidate(root, fileRel) {
  const validator = detectValidator(root);
  if (!validator) {
    return { pass: false, errors: ['no validator script found in scripts/'] };
  }
  if (!existsSync(join(root, fileRel))) {
    return { pass: false, errors: [`file not found: ${fileRel}`] };
  }

  const args = [
    join(root, validator.script),
    ...validator.strictArgs,
    validator.filesFlag,
    validator.fileArg(fileRel),
  ];

  try {
    const stdout = execFileSync('node', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    return { pass: true, errors: [], stdout: stdout.trim() };
  } catch (err) {
    const combined = `${err.stdout || ''}\n${err.stderr || ''}`.trim();
    const errors = parseValidatorErrors(combined);
    return {
      pass: false,
      errors: errors.length ? errors : [combined.slice(0, 400) || `validator exit ${err.status}`],
      stdout: combined,
    };
  }
}

/** Rough buckets for queue vs validator drift report */
export function validatorOnlyHints(errors) {
  const hints = [];
  for (const e of errors) {
    if (/heroImage returned HTTP|heroImage local path|Unsplash|Cloudinary account/i.test(e)) {
      hints.push('hero-http');
    } else if (/Duplicate (title|description|heroImage|paragraph)/i.test(e)) {
      hints.push('duplicate-batch');
    } else if (/Repeated paragraph/i.test(e)) {
      hints.push('repeated-paragraph');
    } else if (/relatedSlug.*does not exist/i.test(e)) {
      hints.push('relatedslug-missing');
    } else if (/points to noindex/i.test(e)) {
      hints.push('relatedslug-noindex');
    } else if (/missing <TldrBlock/i.test(e)) hints.push('missing-tldr');
    else if (/description length/i.test(e)) hints.push('bad-description-length');
    else if (/title length/i.test(e)) hints.push('bad-title-length');
    else if (/fact density|numeric facts/i.test(e)) hints.push('low-fact-density');
    else if (/pros\/cons/i.test(e)) hints.push('missing-pros-cons');
    else if (/FaqBlock/i.test(e)) hints.push('missing-faq-block');
    else if (/trailing slash/i.test(e)) hints.push('missing-trailing-slash');
    else if (/word count|words/i.test(e)) hints.push('thin-content');
    else if (/over-bold/i.test(e)) hints.push('over-bold');
    else if (/missing answer-first|Quick answer|TldrBlock/i.test(e)) hints.push('missing-tldr');
    else if (/missing risks|red flag|insider tip/i.test(e)) hints.push('missing-risks');
    else if (/buyer scenarios|decision framework/i.test(e)) hints.push('missing-scenarios');
    else if (/fewer than \d+ H2/i.test(e)) hints.push('few-h2');
    else if (/internal link points to noindex/i.test(e)) hints.push('link-to-noindex');
  }
  return [...new Set(hints)];
}

export function suggestFableVerdict({ tier, gscProtected, validatePass }) {
  if (!validatePass) return { verdict: 'не нужен', reason: 'сначала validate:strict pass' };
  if (tier === 'A' && gscProtected) return { verdict: 'рекомендую', reason: 'tier A + GSC protected после strict pass' };
  if (tier === 'A') return { verdict: 'рекомендую', reason: 'tier A money page после strict pass' };
  return { verdict: 'не нужен', reason: 'tier B/C без обязательного Fable' };
}
