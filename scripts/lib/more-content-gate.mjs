/**
 * MORE Group — shared P0 structural checks (single source).
 * Import from validate-content-quality.mjs and qa-audit.mjs.
 * Goal: cheap models fix everything scripts can catch; expensive model only polishes.
 */

import {
  EM_DASH_LIMIT,
  SCENARIO_SPAM_MIN,
  LIST_DASH_STEPS_MIN,
  analyzeHumanSignals,
} from './human-signals.mjs';

export const BANNED_PHRASES = [
  'Regional diversification',
  'Advanced investment strategies',
  'Operational excellence',
  'Comprehensive framework',
  'Future outlook',
  'Extended due diligence checklist',
  'in today\'s evolving landscape',
  'in today\'s rapidly evolving',
];

export const AI_FLUFF_RE =
  /\b(moreover|furthermore|in conclusion|it is important to note|unlock the potential|not just .+ but)\b/i;

export const DRAFT_MARKERS_RE =
  /\[VERIFY\b|\*\*VERIFY:\*\*|Knowledge base|KB §|\bTODO\b|source needed/i;

/** Internal DB/filter syntax leaked into client-facing MDX */
export const INTERNAL_CORPUS_RE =
  /lotsof feed|lotsof project database|lotsof pricing|lotsof\.properties|location\.beach\s*=|location\.area\s*=|`location\.|pipeline median|Programmatic listing pages|commission disclosure|Curated from MORE Group project database/i;

/** wave17 uniquify stamps — break MDX tables when glued to pipe rows */
export const STAMP_PREFIX_RE =
  /^(Studio Condos|1-Bedroom Condos|2-Bedroom Condos|3 Bedroom Apartments|Villas) [^\n]+ Phuket — /m;

export function countMarkdownTableRows(body) {
  return (body.match(/^\|[^|\n]+\|/gm) || []).length;
}

export function countBoldSpans(body) {
  return (body.match(/\*\*[^*]+\*\*/g) || []).length;
}

/** Rough fact density for GEO — prices, %, ranges, years */
export function countNumericFacts(body) {
  const hits = body.match(
    /\$[\d,]+(?:\.\d+)?|\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*%|\d+\s*[–-]\s*\d+\s*%|\d{4}|\d+\s*(?:m²|sqm|km|min|minutes|years?|months?)/gi,
  );
  return hits ? hits.length : 0;
}

export function internalLinks(body) {
  const links = [];
  const patterns = [/\]\((\/[^)#\s]+)\)/g, /href=["'](\/[^"'#\s]+)["']/g];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      if (!match[1].startsWith('/api/') && !match[1].startsWith('/_')) links.push(match[1]);
    }
  }
  return links;
}

export function linksWithoutTrailingSlash(body) {
  return internalLinks(body).filter((l) => !l.endsWith('/') && !l.includes('.'));
}

/**
 * @param {object} opts
 * @param {string} opts.prefix - e.g. "src/content/guides/foo.mdx:"
 * @param {object} opts.data - parsed frontmatter
 * @param {string} opts.body
 * @param {string} opts.raw - frontmatter yaml raw
 * @param {string} opts.text - full file
 * @param {string} opts.collection
 * @param {object} opts.cfg - { minWords, faq, label, commercial? }
 * @param {boolean} opts.legacyExempt
 * @param {string[]} opts.errors - mutates
 * @param {object} [opts.options]
 */
export function runStructuralChecks(opts) {
  const { prefix, data, body, raw, text, collection, cfg, legacyExempt, errors } = opts;
  const isNews = cfg.label === 'news';
  const isResale = cfg.kind === 'resale';
  const isCommercial =
    cfg.commercial !== false &&
    !isNews &&
    !isResale &&
    ['guides', 'gajdy', 'areas', 'rajony', 'comparisons', 'sravneniya', 'compare', 'markets', 'costs', 'finance', 'legal'].includes(
      collection,
    );

  if (!legacyExempt && data.title) {
    const tlen = String(data.title).replace(/^["']|["']$/g, '').length;
    if (tlen < 50 || tlen > 60) errors.push(`${prefix} title length ${tlen}; expected 50-60 chars`);
  }
  if (!legacyExempt && data.description && String(data.description).length > 160) {
    errors.push(`${prefix} description length ${data.description.length}; expected <=160 chars`);
  }

  if (DRAFT_MARKERS_RE.test(text)) {
    errors.push(`${prefix} contains draft/source marker ([VERIFY], Knowledge base, TODO, etc.)`);
  }
  if (INTERNAL_CORPUS_RE.test(body)) {
    errors.push(`${prefix} internal corpus/DB filter syntax (lotsof feed, location.beach=) — not for clients`);
  }
  for (const phrase of BANNED_PHRASES) {
    if (body.includes(phrase) || (raw && raw.includes(phrase))) {
      errors.push(`${prefix} banned AI phrase: "${phrase.slice(0, 40)}"`);
    }
  }
  if (AI_FLUFF_RE.test(body)) errors.push(`${prefix} AI fluff (moreover/furthermore/unlock the potential/etc.)`);

  if (/FaqBlock\s+faqs\s*=/.test(text)) errors.push(`${prefix} uses FaqBlock faqs prop; use items`);
  if (/<FaqBlock/.test(text) && !/items\s*=/.test(text)) errors.push(`${prefix} FaqBlock must use items prop`);
  if (/[<>][0-9]/.test(text)) errors.push(`${prefix} contains MDX-breaking angle-bracket number pattern`);
  const boldMarkers = (body.match(/\*\*/g) || []).length;
  if (boldMarkers % 2 !== 0) {
    errors.push(`${prefix} unclosed ** bold — breaks MDX rendering below the typo`);
  }
  if (/☐/.test(body)) errors.push(`${prefix} empty checklist box ☐ — use ✓ in Verified/DD tables`);
  if (/\{\/\* corpus:/.test(body)) errors.push(`${prefix} corpus uniquify stamp comment — remove`);
  if (/^[^\n|]+ — \| /m.test(body)) {
    errors.push(`${prefix} glued markdown table (text + pipes on one line) — breaks rendering`);
  }
  if (STAMP_PREFIX_RE.test(body)) {
    errors.push(`${prefix} wave17 area stamp prefix on paragraph — remove`);
  }

  const humanCollections = ['guides', 'comparisons', 'areas', 'projects', 'news'];
  if (!legacyExempt && humanCollections.includes(collection)) {
    const emLimit = EM_DASH_LIMIT[collection] ?? EM_DASH_LIMIT.default;
    const human = analyzeHumanSignals(body, { emLimit });
    for (const issue of human.issues) {
      if (['unclosed-bold', 'glued-table', 'corpus-stamp', 'em-dash-heavy', 'scenario-spam', 'list-dash-steps'].includes(issue.kind)) {
        errors.push(`${prefix} human-signal ${issue.kind}: ${issue.detail}`);
      }
    }
  }

  if (/Related guide [1-9]/i.test(body)) {
    errors.push(`${prefix} placeholder related-guide links (Related guide 1-6) — use RelatedGuides via relatedSlugs or real anchor text`);
  }
  if (/: holding and exit notes/i.test(body) || /: extra context \d+/i.test(body)) {
    errors.push(`${prefix} SEO padding block (holding and exit notes / extra context N) — remove`);
  }
  const leadForms = (body.match(/<LeadForm\b/g) || []).length;
  if (leadForms >= 1) {
    errors.push(
      `${prefix} inline LeadForm forbidden (${leadForms}) — ArticleLayout injects one bottom form; use InlineCta or sidebar CTA only`,
    );
  }

  if (!legacyExempt && !isNews && !isResale && isCommercial) {
    if (!/(Короткий ответ|Quick answer|TL;DR|<TldrBlock)/i.test(body)) {
      errors.push(`${prefix} missing answer-first block (Quick answer / TldrBlock)`);
    }
    if (!/<TldrBlock\b/.test(body)) errors.push(`${prefix} missing <TldrBlock /> component`);
    const h2 = (body.match(/^##\s+/gm) || []).length;
    if (h2 < 4) errors.push(`${prefix} has fewer than 4 H2 sections (${h2})`);
    const tableRows = countMarkdownTableRows(body);
    if (tableRows < 6) errors.push(`${prefix} needs 3+ tables (found ~${Math.floor(tableRows / 2)} table blocks, ${tableRows} pipe rows)`);
    if (!/(pros|cons|плюс|минус|advantages|disadvantages)/i.test(body)) {
      errors.push(`${prefix} missing pros/cons section (PLEADA)`);
    }
    if (!/(риск|риски|red flag|checklist|чеклист|what to check|insider tip)/i.test(body)) {
      errors.push(`${prefix} missing risks/red flags/insider tip block`);
    }
    if (!/(сценари|scenario|for investors|для инвестор|who this is for|buyer profile|decision framework)/i.test(body)) {
      errors.push(`${prefix} missing buyer scenarios or decision framework`);
    }
    const nums = countNumericFacts(body);
    const minNums = Math.max(8, Math.floor((cfg.minWords || 2000) / 500) * 3);
    if (nums < minNums) errors.push(`${prefix} low fact density: ${nums} numeric facts, need >=${minNums} (GEO)`);
    const bold = countBoldSpans(body);
    if (bold > 35) errors.push(`${prefix} over-bold: ${bold} ** spans (max 35)`);
    if (!/<FaqBlock/.test(body)) errors.push(`${prefix} missing <FaqBlock items={...} /> in body`);
  }

  const noSlash = linksWithoutTrailingSlash(body);
  if (!legacyExempt && noSlash.length) {
    errors.push(`${prefix} internal links missing trailing slash: ${noSlash.slice(0, 5).join(', ')}${noSlash.length > 5 ? '...' : ''}`);
  }
}

/** Checks not always present in qa-audit.mjs — avoid duplicate prob noise */
export function runExtendedChecks(opts) {
  const { prefix, body, cfg, legacyExempt, errors } = opts;
  if (legacyExempt) return;
  const isNews = cfg.label === 'news';
  if (isNews) return;

  if (AI_FLUFF_RE.test(body)) errors.push(`${prefix} AI fluff`);
  if (!/<TldrBlock\b/.test(body)) errors.push(`${prefix} missing TldrBlock`);
  if (!/<FaqBlock/.test(body)) errors.push(`${prefix} missing FaqBlock in body`);
  if (!/(pros|cons|плюс|минус|advantages|disadvantages)/i.test(body)) {
    errors.push(`${prefix} missing pros/cons`);
  }
  const nums = countNumericFacts(body);
  const minNums = Math.max(8, Math.floor((cfg.minWords || 2000) / 500) * 3);
  if (nums < minNums) errors.push(`${prefix} factDensity:${nums}<${minNums}`);
  const bold = countBoldSpans(body);
  if (bold > 35) errors.push(`${prefix} overBold:${bold}`);
}

/** Convert errors array to qa-audit prob[] short codes */
export function structuralChecksAsProbs(opts) {
  const errors = [];
  runStructuralChecks({ ...opts, errors });
  return errors.map((e) => e.replace(/^[^:]+:\s*/, '').replace(/;/g, '').slice(0, 60));
}
