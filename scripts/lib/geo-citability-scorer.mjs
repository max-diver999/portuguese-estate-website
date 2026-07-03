/**
 * GEO citability scoring (geo-seo-claude rubric adapted for MORE Group MDX).
 * Weights: answer 30%, self-containment 25%, structure 20%, stats 15%, uniqueness 10%.
 */

export const RUBRIC_WEIGHTS = {
  answer: 0.3,
  selfContain: 0.25,
  structure: 0.2,
  stats: 0.15,
  unique: 0.1,
};

export const CITABILITY_BLOCK_MIN = 130;
export const CITABILITY_BLOCK_MAX = 170;
export const ANSWER_FIRST_MIN = 40;
export const ANSWER_FIRST_MAX = 60;
export const THIN_H2_OPEN = 35;

const DEFINITION_RE =
  /\b(is|are|refers to|means|typically|costs|starts at|ranges from|allows|requires)\b/i;

/** Stat patterns for GEO density — supports ZAR/R prefix, glued %, and "14 business days". */
const STAT_PATTERNS = [
  /\b\d+(?:\.\d+)?%/g,
  /\b\d+(?:\.\d+)?\s*(?:percent|million|bn|billion|thousand|k\b)/gi,
  /\b\d+(?:\.\d+)?\s+(?:business\s+)?(?:years?|months?|weeks?|days?)\b/gi,
  /\b\d+(?:\.\d+)?\s*sqm\b/gi,
  /\b\d+(?:\.\d+)?\s*sq\.?\s*m(?:²|2)?(?!\w)/gi,
  /\b\d+(?:\.\d+)?\s*m[²2](?!\w)/gi,
  /\b\d[\d,]*(?:\.\d+)?\s*(?:USD|EUR|GBP|THB|AED|MXN|ZAR|SAR|SGD|CHF)\b/gi,
  /\b(?:USD|EUR|GBP|THB|AED|MXN|ZAR|SAR|SGD|CHF)\s+[\d,]+(?:\.\d+)?/gi,
  /\bR\s?[\d,]+(?:\.\d+)?(?:\s*(?:million|m\b|k\b|bn\b))?/gi,
  /\$\d[\d,]*(?:\.\d+)?(?:\s*k\b)?/g,
  /€\d[\d,]*(?:\.\d+)?/g,
  /£\d[\d,]*(?:\.\d+)?/g,
  /\d[\d,]*(?:\.\d+)?\s*(?:฿|₽)/g,
];

/** @deprecated Use hasStat() — kept for callers that expect a RegExp. */
export const STAT_RE = /\b\d+(?:\.\d+)?(?:%|\s*(?:percent|million|bn|billion|thousand|k\b|years?|months?|weeks?|days?|sqm|sq\.?\s*m(?:²|2)?|USD|EUR|GBP|THB|AED|MXN|ZAR|SAR|SGD|CHF)\b)|\b(?:USD|EUR|GBP|THB|AED|MXN|ZAR|SAR|SGD|CHF|R)\s*[\d,]+|\$\d|€\d|£\d|\d[\d,]*\s*(?:฿|₽)/i;

export function findStatMatches(text) {
  const spans = [];
  for (const re of STAT_PATTERNS) {
    const r = new RegExp(re.source, re.flags);
    for (const m of text.matchAll(r)) {
      if (m.index == null) continue;
      spans.push([m.index, m.index + m[0].length]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let count = 0;
  let lastEnd = -1;
  for (const [start, end] of spans) {
    if (start >= lastEnd) {
      count += 1;
      lastEnd = end;
    }
  }
  return count;
}

export function hasStat(text) {
  return findStatMatches(text) > 0;
}
const VAGUE_RE = /\b(many|several|some|often|usually|a lot|significant|various)\b/i;
const PRONOUN_START_RE = /^(it|this|they|these|those|however|but|and|also)\b/i;
const QUESTION_H2_RE = /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will)\b/i;
const UNIQUE_RE =
  /\b(MORE Group|our (analysis|data|clients|underwriting)|insider tip|underwriting snapshot|we (surveyed|analyzed|tracked))\b/i;

export function wordCount(text) {
  return (text.match(/\b[\w']+\b/g) || []).length;
}

export function stripMdx(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMdxBody(raw) {
  const m = raw.match(/^---\n[\s\S]*?\n---\n?/);
  return m ? raw.slice(m[0].length) : raw;
}

export function splitParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,6}\s/.test(p) && !/^[-*]\s/.test(p) && !/^\d+\.\s/.test(p));
}

const SKIP_H2 =
  /Closing|Faq|Independent verification|MORE Group underwriting|who we are \(citable|Get Personal Help/i;

export function extractH2Blocks(body) {
  const blocks = [];
  const re = /^## (.+)$/gm;
  let match;
  const headings = [];
  while ((match = re.exec(body)) !== null) {
    headings.push({ title: match[1], index: match.index });
  }
  for (let i = 0; i < headings.length; i += 1) {
    const { title, index } = headings[i];
    if (SKIP_H2.test(title)) continue;
    const start = index + body.slice(index).indexOf('\n') + 1;
    const end = i + 1 < headings.length ? headings[i + 1].index : body.length;
    const section = body.slice(start, end).trim();
    const firstPara = splitParagraphs(section.replace(/^##[^\n]*\n?/, ''))[0] || '';
    blocks.push({ heading: title, section, firstPara, plainFirst: stripMdx(firstPara) });
  }
  return blocks;
}

function bandScore(value, bands) {
  for (const [min, score] of bands) {
    if (value >= min) return score;
  }
  return bands[bands.length - 1][1];
}

export function scoreAnswerQuality(plainFirst, heading) {
  if (!plainFirst) return 15;
  const words = wordCount(plainFirst);
  let score = 30;
  if (words >= ANSWER_FIRST_MIN && words <= ANSWER_FIRST_MAX) score += 35;
  else if (words >= 25 && words < ANSWER_FIRST_MIN) score += 20;
  else if (words > ANSWER_FIRST_MAX && words <= 90) score += 25;
  else if (words < 15) score -= 20;
  if (DEFINITION_RE.test(plainFirst)) score += 20;
  if (hasStat(plainFirst)) score += 15;
  if (QUESTION_H2_RE.test(heading) || /\?$/.test(heading.trim())) score += 5;
  if (/in this section|we will discuss|let'?s explore|overview of/i.test(plainFirst)) score -= 25;
  return Math.max(0, Math.min(100, score));
}

export function scoreSelfContainment(plainFirst, sectionPlain) {
  if (!plainFirst) return 10;
  let score = 40;
  const words = wordCount(plainFirst);
  if (words >= 50 && words <= 200) score += 25;
  else if (words >= 35) score += 12;
  if (PRONOUN_START_RE.test(plainFirst)) score -= 20;
  if (hasStat(sectionPlain)) score += 15;
  if (/\b(the project|this market|the area|the developer|foreign buyers)\b/i.test(plainFirst)) score += 10;
  if (VAGUE_RE.test(plainFirst) && !hasStat(plainFirst)) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function scoreStructure(section, heading) {
  let score = 35;
  if (QUESTION_H2_RE.test(heading) || /\?$/.test(heading.trim())) score += 20;
  if (/^\|.+\|/m.test(section)) score += 15;
  if (/^[-*]\s/m.test(section) || /^\d+\.\s/m.test(section)) score += 15;
  const paras = splitParagraphs(section);
  const longParas = paras.filter((p) => wordCount(stripMdx(p)) > 120).length;
  if (paras.length && longParas / paras.length <= 0.25) score += 15;
  else if (longParas > 2) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function countStats(text) {
  return findStatMatches(text);
}

export function scoreStatisticalDensity(sectionPlain) {
  const words = wordCount(sectionPlain) || 1;
  const stats = countStats(sectionPlain);
  const per500 = (stats / words) * 500;
  return bandScore(per500, [
    [5, 100],
    [3, 85],
    [2, 70],
    [1, 55],
    [0.5, 40],
    [0, 15],
  ]);
}

export function scoreUniqueness(sectionPlain, bodyPlain) {
  let score = 25;
  if (UNIQUE_RE.test(sectionPlain)) score += 45;
  if (/\b(case study|methodology|checklist|red flag|buyer scenario)\b/i.test(sectionPlain)) score += 15;
  if (UNIQUE_RE.test(bodyPlain)) score += 10;
  if (/according to (the )?(world bank|oecd|statista|official)/i.test(sectionPlain)) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function scoreBlock(block, bodyPlain) {
  const sectionPlain = stripMdx(block.section);
  const sub = {
    answer: scoreAnswerQuality(block.plainFirst, block.heading),
    selfContain: scoreSelfContainment(block.plainFirst, sectionPlain),
    structure: scoreStructure(block.section, block.heading),
    stats: scoreStatisticalDensity(sectionPlain),
    unique: scoreUniqueness(sectionPlain, bodyPlain),
  };
  const overall = Math.round(
    sub.answer * RUBRIC_WEIGHTS.answer +
      sub.selfContain * RUBRIC_WEIGHTS.selfContain +
      sub.structure * RUBRIC_WEIGHTS.structure +
      sub.stats * RUBRIC_WEIGHTS.stats +
      sub.unique * RUBRIC_WEIGHTS.unique,
  );
  return { ...sub, overall, heading: block.heading };
}

export function findCitabilityBlocks(body) {
  const bodyPlain = stripMdx(body);
  const paras = splitParagraphs(body);
  return paras
    .map((p) => ({ raw: p, plain: stripMdx(p), words: wordCount(stripMdx(p)) }))
    .filter(
      (p) =>
        p.words >= CITABILITY_BLOCK_MIN &&
        p.words <= CITABILITY_BLOCK_MAX &&
        hasStat(p.plain) &&
        !PRONOUN_START_RE.test(p.plain),
    );
}

export function scorePage(body, { collection } = {}) {
  const bodyPlain = stripMdx(body);
  const blocks = extractH2Blocks(body);
  const blockScores = blocks.map((b) => scoreBlock(b, bodyPlain));
  const citabilityBlocks = findCitabilityBlocks(body);

  const avg =
    blockScores.length > 0
      ? Math.round(blockScores.reduce((s, b) => s + b.overall, 0) / blockScores.length)
      : 0;
  const coverage =
    blockScores.length > 0
      ? Math.round((blockScores.filter((b) => b.overall >= 70).length / blockScores.length) * 100)
      : 0;

  const categoryAvgs = {};
  for (const key of ['answer', 'selfContain', 'structure', 'stats', 'unique']) {
    categoryAvgs[key] = blockScores.length
      ? Math.round(blockScores.reduce((s, b) => s + b[key], 0) / blockScores.length)
      : 0;
  }

  const issues = [];
  const commercial = ['guides', 'gajdy', 'comparisons', 'sravneniya', 'areas', 'rajony', 'compare'].includes(
    collection,
  );

  if (commercial && !/<TldrBlock/.test(body)) issues.push('missing-tldr');
  if (commercial && !/insider tip/i.test(body)) issues.push('missing-insider-tip');
  if (/## Independent verification notes/.test(body)) issues.push('generic-verification-padding');

  for (const block of blocks.slice(0, 6)) {
    const w = wordCount(block.plainFirst);
    if (w > 0 && w < THIN_H2_OPEN) {
      issues.push(`thin-h2-open:${block.heading.slice(0, 48)} (${w}w)`);
    }
  }

  if (commercial && citabilityBlocks.length < 2) {
    issues.push(`citability-blocks:${citabilityBlocks.length}/2 (need ${CITABILITY_BLOCK_MIN}-${CITABILITY_BLOCK_MAX}w + stat)`);
  }

  const worst = [...blockScores].sort((a, b) => a.overall - b.overall).slice(0, 3);

  return {
    score: avg,
    coverage,
    categoryAvgs,
    blockCount: blockScores.length,
    citabilityBlockCount: citabilityBlocks.length,
    blockScores,
    worstBlocks: worst,
    issues,
  };
}

export function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}
