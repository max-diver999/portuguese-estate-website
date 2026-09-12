/**
 * Shared helpers for the AI-visibility pack.
 *
 * The pack is copied between sites unchanged; everything site-specific lives in
 * ai-visibility.config.json at the repo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadConfig() {
  const p = path.join(ROOT, 'ai-visibility.config.json');
  if (!fs.existsSync(p)) {
    console.error(`[ai-visibility] missing ${path.relative(ROOT, p)}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Frontmatter parser for the two shapes this network actually ships:
 * scalars, and a `faq:` list of `- question:` / `answer:` pairs.
 * Deliberately not a YAML engine: the schemas are already enforced by Astro,
 * and a dependency here would have to be added to fourteen repositories.
 */
export function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, faq: [], body: raw };
  const lines = m[1].split(/\r?\n/);
  const fm = {};
  const faq = [];
  let inFaq = false;
  let current = null;
  const unquote = (v) => v.trim().replace(/^["']([\s\S]*)["']$/, '$1');

  for (const line of lines) {
    if (/^faq:\s*$/.test(line)) {
      inFaq = true;
      continue;
    }
    if (inFaq) {
      const item = line.match(/^\s*-\s*question:\s*(.*)$/);
      if (item) {
        current = { question: unquote(item[1]), answer: '' };
        faq.push(current);
        continue;
      }
      const ans = line.match(/^\s+answer:\s*(.*)$/);
      if (ans && current) {
        current.answer = unquote(ans[1]);
        continue;
      }
      if (/^\S/.test(line)) inFaq = false;
      else continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = unquote(kv[2]);
  }
  return { fm, faq, body: m[2] };
}

/** Strip Astro/MDX components so an answer engine reads prose, not JSX. */
export function stripJsx(body) {
  let s = body.replace(/^[ \t]*import\s+.*$/gm, '');

  s = s.replace(
    /<figure[^>]*>[\s\S]*?<img[^>]*\bsrc=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*\/?>[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/g,
    (_m, src, alt, cap) => `![${alt}](${src})\n\n*${cap.trim()}*\n`,
  );
  s = s.replace(
    /<img[^>]*\bsrc=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*\/?>/g,
    (_m, src, alt) => `![${alt}](${src})`,
  );
  s = s.replace(
    /<img[^>]*\balt=["']([^"']*)["'][^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/g,
    (_m, alt, src) => `![${alt}](${src})`,
  );

  // <FaqBlock items={[...]} /> is how the real-estate sites carry their FAQ.
  s = s.replace(/<FaqBlock\s+items=\{(\[[\s\S]*?\])\}\s*\/>/g, (_m, itemsStr) => {
    const items = [];
    const rxDq = /\{\s*question:\s*"((?:[^"\\]|\\.)*)"\s*,\s*answer:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
    const rxSq = /\{\s*question:\s*'((?:[^'\\]|\\.)*)'\s*,\s*answer:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
    let mm;
    while ((mm = rxDq.exec(itemsStr)) !== null) items.push({ question: mm[1], answer: mm[2] });
    if (items.length === 0) while ((mm = rxSq.exec(itemsStr)) !== null) items.push({ question: mm[1], answer: mm[2] });
    return items.length ? renderFaq(items) : '';
  });

  s = s.replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, '');
  for (let i = 0; i < 3; i++) s = s.replace(/<([A-Z][A-Za-z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g, '$2');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

export function renderFaq(items) {
  const clean = (t) =>
    String(t)
      .replace(/<\/?strong>/g, '**')
      .replace(/<\/?b>/g, '**')
      .replace(/<\/?em>/g, '*')
      .replace(/<br\s*\/?>/g, '\n\n')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  return '\n## FAQ\n\n' + items.map((i) => `### ${clean(i.question)}\n\n${clean(i.answer)}\n`).join('\n');
}

export function isoDay(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00Z`);
  return Number.isNaN(d.valueOf()) ? null : m[1];
}
