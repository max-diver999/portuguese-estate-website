#!/usr/bin/env node
/**
 * Markdown renditions for agents.
 *
 * Writes public/<prefix>/<slug>.md for every indexable page in the configured
 * collections, plus public/index.md for the homepage. Vercel then serves these
 * to any client that appends `.md` or sends `Accept: text/markdown`; the routes
 * are injected by scripts/patch-vercel-output.mjs, because the Vercel adapter
 * drops rewrites and headers from vercel.json.
 *
 * It never writes llms.txt. On several sites that file is maintained by hand and
 * already answers 200; check-agent-index.mjs verifies it instead. llms-full.txt is
 * different: it claims to be the whole corpus, so it is rebuilt from the renditions
 * rather than left as a hand-kept link list that drifts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadConfig, parseFrontmatter, stripJsx, renderFaq, isoDay } from './lib.mjs';

const cfg = loadConfig();
const PUBLIC_DIR = path.join(ROOT, 'public');
const CONTENT_DIR = path.join(ROOT, 'src/content');

/** Field labels in the site's own language; English unless the config overrides them. */
const L = {
  source: 'Source', section: 'Section', author: 'Author', published: 'Published', updated: 'Updated',
  homepage: 'Homepage', contact: 'Contact', email: 'Email', telegram: 'Telegram',
  sitemap: 'Sitemap', agentIndex: 'Agent index', fullCorpus: 'Full corpus', agentCard: 'Agent card',
  entity: 'Entity', keyPages: 'Key pages', index: 'Index',
  policyHeading: 'Content policy for AI agents',
  policyCite: 'Citation in AI search and retrieval is permitted',
  policyTrainYes: 'Use as LLM training data is permitted',
  policyTrainNo: 'Use as LLM training data is **not permitted**',
  policyMarkdown: 'Any page here can be fetched as markdown by appending `.md` to its URL, or by sending `Accept: text/markdown`.',
  fullCorpusTitle: 'full markdown corpus',
  fullCorpusNote: 'Every indexable page of',
  generated: 'Generated',
  ...(cfg.labels || {}),
};

function buildPage({ fm, faq, body, canonical, label }) {
  const head = [
    `# ${fm.title || 'Untitled'}`,
    '',
    fm.description ? `> ${fm.description}` : null,
    '',
    `**${L.source}:** ${canonical}  `,
    label ? `**${L.section}:** ${label}  ` : null,
    fm.author ? `**${L.author}:** ${fm.author}  ` : null,
    isoDay(fm.pubDate) ? `**${L.published}:** ${isoDay(fm.pubDate)}  ` : null,
    isoDay(fm.updatedDate || fm.pubDate) ? `**${L.updated}:** ${isoDay(fm.updatedDate || fm.pubDate)}` : null,
    '',
    '---',
    '',
  ].filter((x) => x !== null).join('\n');

  const answer = fm.answer ? `${fm.answer}\n\n` : '';
  // Most of this network keeps its FAQ in the frontmatter AND renders it in the body
  // through <FaqBlock>, which stripJsx has already turned into a FAQ section. Appending
  // the frontmatter copy on top of that prints every question twice.
  const bodyHasFaq = /^##\s+FAQ\s*$/m.test(body);
  const tail = faq.length && !bodyHasFaq ? `\n${renderFaq(faq)}` : '';
  return `${head}\n${answer}${body}\n${tail}`;
}

async function processCollection(col) {
  const srcDir = path.join(CONTENT_DIR, col.dir);
  const outDir = path.join(PUBLIC_DIR, col.urlPrefix.replace(/^\//, ''));
  let files;
  try {
    files = await fs.readdir(srcDir);
  } catch {
    return [];
  }
  await fs.mkdir(outDir, { recursive: true });

  const entries = [];
  for (const file of files) {
    if (!/\.mdx?$/.test(file)) continue;
    const slug = file.replace(/\.mdx?$/, '');
    const raw = await fs.readFile(path.join(srcDir, file), 'utf8');
    const { fm, faq, body } = parseFrontmatter(raw);
    if (fm.noindex === 'true' || fm.draft === 'true') continue;

    const canonical = `${cfg.siteUrl}${col.urlPrefix}/${slug}/`;
    const md = buildPage({ fm, faq, body: stripJsx(body), canonical, label: col.label });
    await fs.writeFile(path.join(outDir, `${slug}.md`), md, 'utf8');

    entries.push({
      slug,
      title: fm.title || slug,
      description: fm.description || '',
      url: canonical,
      mdUrl: `${cfg.siteUrl}${col.urlPrefix}/${slug}.md`,
      updated: isoDay(fm.updatedDate || fm.pubDate),
      fm,
    });
  }
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return entries;
}

async function writeHomepage(perCollection) {
  const p = cfg.contentPolicy || {};
  const lines = [];
  lines.push(`# ${cfg.title}${cfg.tagline ? `: ${cfg.tagline}` : ''}`);
  lines.push('');
  if (cfg.summary) lines.push(`> ${cfg.summary}`, '');
  if (cfg.entity) lines.push(`**${L.entity}:** ${cfg.entity}`, '');
  lines.push(`**${L.homepage}:** ${cfg.siteUrl}/  `);
  if (cfg.contact?.page) lines.push(`**${L.contact}:** ${cfg.siteUrl}${cfg.contact.page}  `);
  if (cfg.contact?.email) lines.push(`**${L.email}:** ${cfg.contact.email}  `);
  if (cfg.contact?.telegram) lines.push(`**${L.telegram}:** ${cfg.contact.telegram}  `);
  lines.push(`**${L.sitemap}:** ${cfg.siteUrl}/sitemap-index.xml  `);
  lines.push(`**${L.agentIndex}:** ${cfg.siteUrl}/llms.txt  `);
  lines.push(`**${L.fullCorpus}:** ${cfg.siteUrl}/llms-full.txt  `);
  lines.push(`**${L.agentCard}:** ${cfg.siteUrl}/.well-known/agent.json`);
  lines.push('');

  if (cfg.keyPages?.length) {
    lines.push(`## ${L.keyPages}`, '');
    for (const k of cfg.keyPages) lines.push(`- [${k.label}](${cfg.siteUrl}${k.url})`);
    lines.push('');
  }

  for (const { col, entries } of perCollection) {
    if (!entries.length) continue;
    lines.push(`## ${col.label}`, '');
    lines.push(`${L.index}: ${cfg.siteUrl}${col.urlPrefix}/`, '');
    for (const e of entries) {
      const desc = e.description ? `: ${e.description}` : '';
      lines.push(`- [${e.title}](${e.mdUrl})${desc}`);
    }
    lines.push('');
  }

  lines.push(`## ${L.policyHeading}`, '');
  lines.push(`- ${L.policyCite} (Content-Signal: \`search=${p.search ?? 'yes'}, ai-input=${p.aiInput ?? 'yes'}\`).`);
  lines.push(`- ${p.aiTrain === 'yes' ? L.policyTrainYes : L.policyTrainNo} (Content-Signal: \`ai-train=${p.aiTrain ?? 'yes'}\`).`);
  lines.push(`- ${L.policyMarkdown}`);
  lines.push('');
  await fs.writeFile(path.join(PUBLIC_DIR, 'index.md'), lines.join('\n'), 'utf8');
}

/**
 * llms.txt, the agent index. Written only where the config asks for it: several sites
 * keep a hand-built one that already works, and this must never overwrite those.
 * Where it is asked for, it replaces a curated stub that named a handful of pages on a
 * site of several hundred, which is a map an answer engine cannot navigate.
 */
async function writeLlmsIndex(perCollection) {
  const p = cfg.contentPolicy || {};
  const lines = [];
  lines.push(`# ${cfg.title}${cfg.tagline ? `: ${cfg.tagline}` : ''}`, '');
  if (cfg.summary) lines.push(`> ${cfg.summary}`, '');
  lines.push(`- ${L.homepage}: ${cfg.siteUrl}/`);
  if (cfg.contact?.email) lines.push(`- ${L.email}: ${cfg.contact.email}`);
  if (cfg.contact?.page) lines.push(`- ${L.contact}: ${cfg.siteUrl}${cfg.contact.page}`);
  for (const f of cfg.facts || []) lines.push(`- ${f}`);
  lines.push(`- ${L.sitemap}: ${cfg.siteUrl}/sitemap-index.xml`);
  lines.push(`- ${L.fullCorpus}: ${cfg.siteUrl}/llms-full.txt`);
  lines.push(`- ${L.agentCard}: ${cfg.siteUrl}/.well-known/agent.json`);
  lines.push('');
  if (cfg.entity) lines.push(`## ${L.entity}`, '', cfg.entity, '');

  const total = perCollection.reduce((n, x) => n + x.entries.length, 0);
  lines.push(`## ${L.keyPages}`, '');
  for (const k of cfg.keyPages || []) lines.push(`- [${k.label}](${cfg.siteUrl}${k.url})`);
  lines.push('');

  for (const { col, entries } of perCollection) {
    if (!entries.length) continue;
    lines.push(`## ${col.label} (${entries.length})`, '');
    for (const e of entries) {
      const desc = e.description ? `: ${e.description}` : '';
      lines.push(`- [${e.title}](${e.url})${desc}`);
    }
    lines.push('');
  }

  lines.push(`## ${L.policyHeading}`, '');
  lines.push(`- ${L.policyCite} (Content-Signal: \`search=${p.search ?? 'yes'}, ai-input=${p.aiInput ?? 'yes'}\`).`);
  lines.push(`- ${p.aiTrain === 'yes' ? L.policyTrainYes : L.policyTrainNo} (Content-Signal: \`ai-train=${p.aiTrain ?? 'yes'}\`).`);
  lines.push(`- ${L.policyMarkdown}`);
  lines.push('');
  await fs.writeFile(path.join(PUBLIC_DIR, 'llms.txt'), lines.join('\n'), 'utf8');
  return total;
}

/**
 * Priced project catalog in llms.txt (25.09.2026, after more-group-website #107).
 * One line per indexable card of cfg.catalog.collection: name, area, type, status, entry
 * price from the card's own frontmatter, page. No completion dates: a status with a year or
 * a percentage in it is left out. The section is rebuilt on every run and placed before the
 * corpus section, so a hand-kept llms.txt keeps everything else as written.
 */
const SMALL_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'di', 'da', 'do', 'dos', 'das', 'of', 'the', 'and', 'al', 'y', 'e', 'en', 'sur', 'van', 'von']);
const labelOf = (slug) =>
  /[A-Z ]/.test(String(slug || '')) ? String(slug).trim() : String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

// "Aldea Tulum Review: Delivering Condos From $188K 2026" -> "Aldea Tulum"
const catalogName = (title) =>
  String(title)
    .split(/:\s| [-–|] /)[0]
    .replace(/\s+(Investment\s+)?Review(\s+20\d\d)?\s*$/i, '')
    .replace(/\s+20\d\d\s*$/, '')
    .trim();

const CURRENCY = {
  USD: (n) => `$${n.toLocaleString('en-US')}`,
  EUR: (n) => `€${n.toLocaleString('en-US')}`,
  ZAR: (n) => `R${n.toLocaleString('en-US')}`,
  SGD: (n) => `S$${n.toLocaleString('en-US')}`,
  AED: (n) => `AED ${n.toLocaleString('en-US')}`,
};

async function injectCatalog(perCollection) {
  const c = cfg.catalog;
  const found = perCollection.find((x) => x.col.dir === c.collection);
  if (!found) return 0;
  const fmt = CURRENCY[c.currency];
  const heading = c.heading || 'Project catalog with prices';
  const rows = found.entries.map((e) => {
    const price = Number(e.fm[c.priceField]);
    const status = String(e.fm[c.statusField || 'status'] || '').trim();
    const parts = [
      labelOf(e.fm[c.areaField || 'area']),
      c.typeField ? labelOf(e.fm[c.typeField]).toLowerCase() : '',
      /[0-9%]/.test(status) ? '' : status.replace(/-/g, ' ').replace(/^off plan$/, 'off-plan').replace(/^pre construction$/, 'pre-construction'),
      price > 0 ? `from ${fmt(price)}` : 'price on request',
    ].filter(Boolean);
    return { area: labelOf(e.fm[c.areaField || 'area']), price: price > 0 ? price : Infinity, line: `- [${catalogName(e.title)}](${e.url}): ${parts.join(', ')}` };
  });
  rows.sort((a, b) => a.area.localeCompare(b.area) || a.price - b.price);
  const section = [
    `## ${heading}`,
    '',
    `One line per ${c.noun || 'project'}: name, area, ${c.typeField ? 'property type, ' : ''}status, entry price, page. ` +
      'Append `.md` to any page URL for its full markdown review.',
    '',
    ...rows.map((r) => r.line),
    '',
  ];

  const file = path.join(PUBLIC_DIR, 'llms.txt');
  const lines = (await fs.readFile(file, 'utf8')).split('\n');
  // Drop the section a previous run wrote: from its heading to the next H2.
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start !== -1) {
    let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
    if (end === -1) end = lines.length;
    lines.splice(start, end - start);
  }
  const before = lines.findIndex((l) => /^## (Full corpus|Content policy)/i.test(l));
  if (before === -1) {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push(...section);
  } else {
    lines.splice(before, 0, ...section);
  }
  await fs.writeFile(file, lines.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
  return rows.length;
}

async function writeFullCorpus(perCollection) {
  const chunks = [
    `# ${cfg.title}: ${L.fullCorpusTitle}\n`,
    `> ${L.fullCorpusNote} ${cfg.siteUrl}. ${L.agentIndex}: ${cfg.siteUrl}/llms.txt\n`,
    `> ${L.generated} ${new Date().toISOString().slice(0, 10)}\n`,
  ];
  for (const { col, entries } of perCollection) {
    if (!entries.length) continue;
    chunks.push(`\n\n# ${col.label}\n`);
    for (const e of entries) {
      try {
        chunks.push(`\n\n${await fs.readFile(path.join(PUBLIC_DIR, col.urlPrefix.replace(/^\//, ''), `${e.slug}.md`), 'utf8')}\n`);
      } catch {
        /* a rendition that failed to write is already reported by the loop above */
      }
    }
  }
  const out = chunks.join('');
  await fs.writeFile(path.join(PUBLIC_DIR, 'llms-full.txt'), out, 'utf8');
  return out.length;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const perCollection = [];
  let total = 0;
  for (const col of cfg.collections ?? []) {
    const entries = await processCollection(col);
    perCollection.push({ col, entries });
    total += entries.length;
    console.log(`  ${col.urlPrefix.padEnd(14)} ${String(entries.length).padStart(4)} .md`);
  }
  await writeHomepage(perCollection);
  // llms-full.txt is only written where the site has no generator of its own for it.
  // Several sites build theirs from the same corpus already, and two files racing for
  // one path is how a corpus silently halves.
  let note = '';
  if (cfg.writeLlms) {
    const listed = await writeLlmsIndex(perCollection);
    note += `, llms.txt lists ${listed} page(s)`;
  }
  if (cfg.catalog) {
    const listed = await injectCatalog(perCollection);
    note += `, llms.txt catalog ${listed} line(s)`;
  }
  if (cfg.writeLlmsFull) {
    const fullBytes = await writeFullCorpus(perCollection);
    note = `, llms-full.txt ${(fullBytes / 1024).toFixed(0)} KB`;
  }
  console.log(`[agent-markdown] ${total} page file(s) + index.md written to public/${note}`);
}

main().catch((err) => {
  console.error('[agent-markdown] ERROR:', err);
  process.exit(1);
});
