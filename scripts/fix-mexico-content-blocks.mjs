#!/usr/bin/env node
/**
 * Batch-fix Mexico MDX: TldrBlock + FaqBlock from frontmatter, strip excess bold.
 * Run: node scripts/fix-mexico-content-blocks.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const COLLECTIONS = ['guides', 'compare', 'areas', 'projects', 'developers', 'news'];
const dryRun = process.argv.includes('--dry-run');

function walkMdx() {
  const out = [];
  for (const coll of COLLECTIONS) {
    const dir = path.join(CONTENT, coll);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
      out.push({ coll, file: path.join(dir, f), slug: f.replace(/\.mdx$/, '') });
    }
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return { fmRaw: m[1], body: raw.slice(m[0].length), full: m[0] };
}

function parseFaqItems(fmRaw) {
  const items = [];
  const block = fmRaw.match(/\nfaq:\s*\n([\s\S]*?)(?=\n[a-zA-Z_]+:|\s*$)/);
  if (!block) return items;
  const lines = block[1].split('\n');
  let q = null;
  let a = '';
  for (const line of lines) {
    const qm = line.match(/^\s*-\s*question:\s*(.+)$/);
    const am = line.match(/^\s*answer:\s*(.+)$/);
    if (qm) {
      if (q) items.push({ question: q, answer: a.trim() });
      q = qm[1].replace(/^["']|["']$/g, '').trim();
      a = '';
    } else if (am && q) {
      a = am[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  if (q) items.push({ question: q, answer: a.trim() });
  return items;
}

function extractTldrText(body) {
  const qa = body.match(/\*\*Quick answer:\*\*\s*([^\n]+)/i);
  if (qa) return qa[1].replace(/\*\*/g, '').trim().slice(0, 320);
  const h1 = body.match(/^#\s+[^\n]+\n+([^\n#][^\n]{40,320})/m);
  if (h1) return h1[1].replace(/\*\*/g, '').trim();
  return 'Summary of key buyer facts for Spain property — confirm details with your notario and broker before closing.';
}

function stripBold(body) {
  return body.replace(/\*\*([^*]+)\*\*/g, '$1');
}

function faqBlockJsx(items) {
  const lines = items.map(
    (it) =>
      `  { question: ${JSON.stringify(it.question)}, answer: ${JSON.stringify(it.answer)} }`,
  );
  return `<FaqBlock items={[\n${lines.join(',\n')}\n]} />`;
}

function ensureImports(body) {
  let b = body;
  const needsTldr = !/import\s+TldrBlock/.test(b);
  const needsFaq = !/import\s+FaqBlock/.test(b);
  if (!needsTldr && !needsFaq) return b;

  const imports = [];
  if (needsTldr) imports.push("import TldrBlock from '../../components/TldrBlock.astro';");
  if (needsFaq) imports.push("import FaqBlock from '../../components/FaqBlock.astro';");

  const importBlock = `${imports.join('\n')}\n\n`;
  if (/^import\s/m.test(b)) {
    b = b.replace(/^(import[^\n]+\n)+/, (m) => m + (needsTldr && !/TldrBlock/.test(m) ? "import TldrBlock from '../../components/TldrBlock.astro';\n" : '') + (needsFaq && !/FaqBlock/.test(m) ? "import FaqBlock from '../../components/FaqBlock.astro';\n" : ''));
    if (!/^import\s+TldrBlock/m.test(b) && needsTldr) b = importBlock + b;
    if (!/^import\s+FaqBlock/m.test(b) && needsFaq) b = importBlock + b;
  } else {
    b = importBlock + b.replace(/^\n+/, '');
  }
  return b;
}

function insertTldr(body, text) {
  if (/<TldrBlock\b/.test(body)) return body;
  const escaped = text.replace(/"/g, '\\"');
  const block = `<TldrBlock text="${escaped}" />\n\n`;
  const qaMatch = body.match(/(\*\*Quick answer:\*\*[^\n]+\n\n)/i);
  if (qaMatch) {
    return body.replace(qaMatch[0], qaMatch[0] + block);
  }
  const h1Match = body.match(/(^#\s+[^\n]+\n\n)/m);
  if (h1Match) return body.replace(h1Match[0], h1Match[0] + block);
  return block + body;
}

function insertFaq(body, items) {
  if (/<FaqBlock\b/.test(body)) return body;
  if (!items.length) return body;
  const jsx = faqBlockJsx(items);
  return body.trimEnd() + '\n\n' + jsx + '\n';
}

let touched = 0;
for (const { coll, file, slug } of walkMdx()) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) continue;

  let body = parsed.body;
  const faqItems = parseFaqItems(parsed.fmRaw);
  const tldr = extractTldrText(body);

  body = ensureImports(body);
  body = insertTldr(body, tldr);
  body = insertFaq(body, faqItems);
  body = stripBold(body);

  const next = parsed.full + body;
  if (next === raw) continue;
  touched++;
  const rel = path.relative(ROOT, file);
  console.log(`${dryRun ? '[dry-run] ' : ''}${rel}`);
  if (!dryRun) fs.writeFileSync(file, next);
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${touched} file(s)`);
