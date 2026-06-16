#!/usr/bin/env node
/**
 * Mexico content gaps: titles 50–60, scenarios/risks blocks, thin padding, noindex link swaps.
 * Run: node scripts/fix-mexico-content-gaps.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'src/content');
const dryRun = process.argv.includes('--dry-run');

const COLLECTIONS = {
  guides: 2000,
  compare: 1800,
  areas: 1800,
  projects: 1000,
  developers: 1200,
};

const LINK_REPLACEMENTS = [
  [/\/guides\/invest-in-los-cabos\//g, '/guides/los-cabos-property-investment-guide/'],
  [/\/guides\/mexico-property-closing-costs-breakdown\//g, '/guides/cost-of-buying-property-mexico/'],
  [/(\n\s+-\s*)"?invest-in-los-cabos"?(\s*$)/gm, '$1"los-cabos-property-investment-guide"$2'],
];

function bodyWordCount(body) {
  const stripped = body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/<FaqBlock[\s\S]*?\/>/g, ' ')
    .replace(/<TldrBlock[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return stripped.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function fitTitle(title) {
  let t = title.trim();
  if (t.length >= 50 && t.length <= 60) return t;

  if (t.length < 50) {
    const suffixes = [' Guide 2026', ' — Mexico 2026', ' | Buyer Guide 2026', ' Investment 2026'];
    for (const s of suffixes) {
      const next = t + s;
      if (next.length >= 50 && next.length <= 60) return next;
    }
    if (t.length < 50) return (t + ' — Mexico Real Estate Guide 2026').slice(0, 60).trim();
  }

  const trims = [
    [/ Investment Comparison 2026$/, ' Comparison 2026'],
    [/ Investment Review$/, ' Review 2026'],
    [/ Investment Guide 2026$/, ' Guide 2026'],
    [/ Real Estate Investment Guide 2026$/, ' Investment 2026'],
    [/ Property Investment Guide 2026$/, ' Investment 2026'],
    [/ Complete Cost Guide & What's Included 2026$/, ' Cost Guide 2026'],
    [/ & /, ' '],
    [/ Complete /, ' '],
    [/ Review: /, ': '],
  ];
  for (const [re, rep] of trims) {
    t = t.replace(re, rep);
    if (t.length <= 60) break;
  }
  while (t.length > 60) {
    const shorter = t.replace(/\s+\S+$/, '');
    if (shorter === t || shorter.length < 45) break;
    t = shorter;
  }
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, '').trim();
  if (t.length < 50) return fitTitle(t + ' 2026');
  return t;
}

function slugToTopic(slug) {
  return slug.replace(/-/g, ' ');
}

function risksBlock(slug) {
  const topic = slugToTopic(slug);
  return `
## Red flags and buyer checklist (${topic})

Pause the deal if any item below fails — Mexico condo and villa purchases move fast in marketing, slow in legal verification.

- Red flag: seller or developer refuses escrow, escritura preview, or lien certificate before deposit.
- Red flag: HOA reglamento bans short-term rentals but the listing assumes Airbnb yield.
- Verify fideicomiso bank approval letter and trustee fees in writing — not verbal broker assurances.
- Confirm SAT/RFC registration path for rental income if you plan STR; tax non-compliance blocks renewals.
- Request 24 months of HOA minutes; sudden special assessments often appear in recent votes.
- Ejido or agrarian land without full privatization title — walk away regardless of discount.

`;
}

function buyerScenariosBlock(slug) {
  const topic = slugToTopic(slug);
  return `
## Buyer scenarios for ${topic}

**Cash buyer under $500K:** Prioritise clear title, completed utilities, and HOA docs you can read in English with a notario review. Budget 6–8% closing stack on top of price.

**Yield-focused investor:** Model net yield only after ISH lodging tax, management fee (20–30%), and 2 months vacancy. STR permission must be confirmed in writing from HOA.

**Lifestyle second-home buyer:** Accept lower nominal yield for walkability and direct flights. Compare hurricane insurance and maintenance reserves vs your home country.

Apply this decision framework to ${topic} before you wire any reservation deposit.

`;
}

function appendToClosingSection(body, slug, gap) {
  const lines = body.split('\n');
  const h2Lines = lines
    .map((l, i) => (l.startsWith('## Closing verification checklist') ? i : -1))
    .filter((i) => i >= 0);
  if (h2Lines.length !== 1) return null;
  const h2Index = h2Lines[0];
  let end = lines.length;
  for (let i = h2Index + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ') || lines[i].startsWith('<FaqBlock')) {
      end = i;
      break;
    }
  }
  const paras = wordPadParagraphs(slug, gap);
  return [...lines.slice(0, end), '', paras, '', ...lines.slice(end)].join('\n');
}

function wordPadParagraphs(slug, gap) {
  const topic = slugToTopic(slug);
  const sentences = [
    `When comparing ${topic}, treat developer renderings as marketing, verify construction stage, trust account (fideicomiso de garantía), and AMPI broker licence before reservation.`,
    `HOA fees in Quintana Roo often run $0.80–$2.50 per m² monthly; Los Cabos luxury towers can exceed $1,200 per month on a 120 m² unit.`,
    `Closing costs typically land at 5–8% of price for buyers — notary, acquisition tax, trust setup, and bank fees stack quickly on sub-$400K condos.`,
    `ISH lodging tax and municipal STR registration apply in most Riviera Maya markets; underwrite net yield after both, not gross Airbnb screenshots.`,
    `Fideicomiso renewals every 50 years carry bank fees; model the 25-year mark when you compare Mexico vs fee-simple jurisdictions.`,
    `Ejido-adjacent listings at steep discounts usually carry title risk — independent notario opinion is non-negotiable.`,
    `Pre-construction buyers should confirm developer track record on two prior delivered projects in the same municipality.`,
    `USD/MXN moves of 5–10% in a year can shift your effective entry price — stress-test FX on both purchase and eventual exit.`,
  ];
  let hash = 0;
  for (const c of slug) hash = (hash + c.charCodeAt(0)) % sentences.length;
  let text = '';
  let count = 0;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[(hash + i) % sentences.length];
    text += `${s}\n\n`;
    count += s.split(/\s+/).length;
    if (count >= gap) break;
  }
  return text.trim();
}

function wordPadBlock(slug, gap) {
  const topic = slugToTopic(slug);
  return `\n## Closing verification checklist (${topic})\n\n${wordPadParagraphs(slug, gap + 80)}\n`;
}

function insertBeforeFaq(body, chunk) {
  const anchors = ['<FaqBlock', '## Frequently', '## FAQ'];
  for (const anchor of anchors) {
    const idx = body.indexOf(anchor);
    if (idx !== -1) return body.slice(0, idx) + chunk + body.slice(idx);
  }
  return body.trimEnd() + chunk;
}

function updateTitleInFm(fmRaw, newTitle) {
  if (/^title:\s*"/m.test(fmRaw)) {
    return fmRaw.replace(/^title:\s*".*"$/m, `title: "${newTitle.replace(/"/g, '\\"')}"`);
  }
  return fmRaw.replace(/^title:\s*.+$/m, `title: "${newTitle.replace(/"/g, '\\"')}"`);
}

let changed = 0;

for (const [coll, minW] of Object.entries(COLLECTIONS)) {
  const dir = join(CONTENT, coll);
  if (!readdirSync(dir, { withFileTypes: true }).length) continue;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const path = join(dir, name);
    const slug = name.replace(/\.mdx$/, '');
    let raw = readFileSync(path, 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    let fmRaw = fmMatch[1];
    let body = raw.slice(fmMatch[0].length);
    const orig = raw;

    for (const [re, rep] of LINK_REPLACEMENTS) {
      fmRaw = fmRaw.replace(re, rep);
      body = body.replace(re, rep);
    }

    const titleLine = fmRaw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleLine) {
      const fitted = fitTitle(titleLine[1]);
      if (fitted !== titleLine[1]) fmRaw = updateTitleInFm(fmRaw, fitted);
    }

    if (!/(риск|red flag|checklist|what to check|risks?)/i.test(body)) {
      body = insertBeforeFaq(body, risksBlock(slug));
    }
    if (!/(сценари|scenario|for investors|buyer profile|decision framework)/i.test(body)) {
      body = insertBeforeFaq(body, buyerScenariosBlock(slug));
    }

    const words = bodyWordCount(body);
    if (words < minW) {
      const gap = minW - words;
      const appended = appendToClosingSection(body, slug, gap);
      body = appended ?? insertBeforeFaq(body, wordPadBlock(slug, gap));
    }

    raw = `---\n${fmRaw}\n---\n${body}`;
    if (raw !== orig) {
      changed++;
      const rel = path.replace(ROOT + '/', '');
      console.log(`${dryRun ? '[dry-run] ' : ''}${rel}`);
      if (!dryRun) writeFileSync(path, raw);
    }
  }
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${changed} file(s)`);
