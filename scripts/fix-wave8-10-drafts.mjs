#!/usr/bin/env node
/**
 * Tier A fix pass for _drafts/wave8-10/*.mdx
 * - Remap invented internal links to live + draft slugs
 * - Fix relatedSlugs
 * - Strip AI-slop phrases
 * - Fix known title/description issues
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT = join(ROOT, '_drafts/wave8-10');
const LIVE = join(ROOT, 'src/content');

function collectSlugs(dir, base = '') {
  const out = new Map();
  for (const coll of readdirSync(dir)) {
    const p = join(dir, coll);
    if (!statSync(p).isDirectory()) continue;
    for (const f of readdirSync(p)) {
      if (f.endsWith('.mdx')) out.set(f.replace('.mdx', ''), coll);
    }
  }
  return out;
}

const live = collectSlugs(LIVE);
const draft = collectSlugs(DRAFT);
const valid = new Map([...live, ...draft]);

/** invented slug -> [collection, slug] */
const SLUG_MAP = {
  'due-diligence-mexico-developers': ['guides', 'developer-due-diligence-mexico'],
  'due-diligence-luxury-developers': ['guides', 'developer-due-diligence-mexico'],
  'riviera-nayarit': ['areas', 'nuevo-vallarta'],
  'riviera-nayarit-investment-guide': ['guides', 'puerto-vallarta-property-investment-guide'],
  'punta-mita': ['areas', 'punta-de-mita'],
  'luxury-tier-mexico': ['guides', 'tier-luxury'],
  'puerto-vallarta-vs-los-cabos': ['compare', 'los-cabos-vs-puerto-vallarta'],
  'tulum-property-investment-guide': ['guides', 'invest-in-tulum'],
  'marina-living-mexico-guide': ['guides', 'mexico-marina-property-investment'],
  'north-shore-playa-del-carmen': ['projects', 'distrito-xcalacoco-beach'],
  'north-shore-vs-centro-playa-del-carmen': ['compare', 'centro-playa-vs-playacar'],
  'villa-vs-condo-investment-mexico': ['compare', 'condo-vs-villa-mexico-investment'],
  'puerto-vallarta-investment-guide': ['guides', 'puerto-vallarta-property-investment-guide'],
  'aldea-zama': ['areas', 'aldea-zama-tulum'],
  'land-investment-mexico-guide': ['guides', 'cost-of-buying-property-mexico'],
  'villa-construction-mexico-guide': ['guides', 'pre-construction-mexico-risks'],
  'branded-residences-mexico': ['guides', 'branded-residences-mexico-guide'],
  'ultra-luxury-real-estate-mexico': ['guides', 'tier-luxury'],
  'los-cabos': ['guides', 'los-cabos-property-investment-guide'],
  'luxury-real-estate-los-cabos': ['guides', 'los-cabos-property-investment-guide'],
  'golf-community-investment-mexico': ['guides', 'mexico-golf-course-property'],
  'golf-course-communities-mexico': ['guides', 'mexico-golf-course-property'],
  'lake-living-mexico-guide': ['projects', 'el-lago-querencia'],
  'luxury-villa-inspection-mexico': ['guides', 'due-diligence-mexico-real-estate'],
  'villa-property-management-mexico': ['guides', 'property-management-riviera-maya-cost'],
  'off-plan-luxury-development-risk-mexico': ['guides', 'pre-construction-mexico-risks'],
  'ultra-luxury-development-risk-mexico': ['guides', 'pre-construction-mexico-risks'],
  'nayarit-vs-cabos-ultra-luxury': ['compare', 'punta-mita-vs-los-cabos-luxury'],
  'luxury-property-resale-mexico': ['guides', 'how-to-sell-mexico-property-from-abroad'],
  'ultra-luxury-resale-mexico': ['guides', 'how-to-sell-mexico-property-from-abroad'],
  'marina-vs-beach-investment-mexico': ['compare', 'vacation-home-vs-pure-rental-mexico'],
  'marina-property-due-diligence-mexico': ['guides', 'due-diligence-mexico-real-estate'],
  'pacific-resort-community-investment-mexico': ['guides', 'los-cabos-property-investment-guide'],
  'pacific-oceanfront-living-mexico': ['guides', 'mexico-beachfront-property-investment'],
  'oceanfront-villa-inspection-mexico': ['guides', 'due-diligence-mexico-real-estate'],
  'oceanfront-property-risk-management-mexico': ['guides', 'mexico-property-insurance-foreigners'],
  'luxury-estate-management-mexico': ['guides', 'property-management-riviera-maya-cost'],
  'construction-permits-mexico-guide': ['guides', 'due-diligence-mexico-real-estate'],
  'build-to-rent-mexico-strategy': ['guides', 'airbnb-investment-mexico-guide'],
  '101-tulum': ['projects', '101-park-tulum'],
  'tulum-real-estate-prices-2026': ['news', 'tulum-inventory-2026'],
  'lock-off-condo-investment-tulum': ['guides', 'gross-vs-net-yield-mexico'],
  'lock-off-rental-operations-tulum': ['guides', 'airbnb-investment-mexico-guide'],
  'str-unit-configuration-riviera-maya': ['guides', 'short-term-rental-rules-riviera-maya'],
  '101-tulum-master-plan-analysis': ['projects', '101-park-tulum'],
  'tulum-rental-yield-analysis': ['guides', 'mexico-rental-yield-guide'],
  'master-plan-yield-premiums-tulum': ['projects', 'gran-tulum'],
  'tulum-investment-zones-comparison': ['compare', 'aldea-zama-vs-region-15-tulum'],
  'master-plan-vs-independent-tulum': ['compare', 'pre-construction-vs-resale-tulum'],
  'simca-developer-due-diligence': ['developers', 'simca-desarrollos'],
  'master-plan-development-verification': ['guides', 'developer-due-diligence-mexico'],
  '101-tulum-master-plan-investment': ['projects', 'gran-tulum'],
  'entry-level-playa-del-carmen-real-estate': ['guides', 'tier-entry'],
  'beachfront-premium-playa-del-carmen': ['guides', 'mexico-beachfront-property-investment'],
  'gonzalo-guerrero-rental-performance': ['areas', 'gonzalo-guerrero-playa'],
  'beachfront-str-operations-playa': ['guides', 'short-term-rental-rules-riviera-maya'],
  'grupo-emerita-due-diligence': ['developers', 'grupo-emerita'],
  'beachfront-development-due-diligence': ['guides', 'due-diligence-mexico-real-estate'],
  'playa-del-carmen-investment-guide': ['guides', 'invest-in-playa-del-carmen'],
  'playa-del-carmen-investment-zones': ['areas', 'playa-del-carmen'],
  'short-term-rental-playa-del-carmen': ['guides', 'short-term-rental-rules-riviera-maya'],
  'concentrated-developer-due-diligence': ['guides', 'developer-due-diligence-mexico'],
  'playa-del-carmen-rental-yields': ['guides', 'mexico-rental-yield-guide'],
  'beachfront-rental-performance-riviera-maya': ['guides', 'mexico-rental-yield-guide'],
  'riviera-maya-developers-comparison': ['guides', 'developer-due-diligence-mexico'],
  'el-lago-ascendant': ['projects', 'el-lago-querencia'],
  'hoa-assessment-mexico-real-estate': ['guides', 'hoa-fees-mexico-condo'],
  'affordable-los-cabos-real-estate': ['projects', 'tao-monte-rocella'],
  'individual-project-due-diligence-mexico': ['guides', 'due-diligence-mexico-real-estate'],
  'puerto-vallarta-rental-yields': ['guides', 'mexico-rental-yield-guide'],
  'los-cabos-investment-returns': ['guides', 'mexico-rental-yield-guide'],
  'branded-residence-operations-mexico': ['guides', 'branded-residences-mexico-guide'],
  'punta-mita-luxury-developments': ['projects', 'montage-punta-mita'],
  'branded-vs-independent-luxury-residences': ['compare', 'branded-residence-vs-standard-condo-mexico'],
  'branded-residence-due-diligence-mexico': ['guides', 'developer-due-diligence-mexico'],
  'ultra-luxury-developer-verification': ['guides', 'developer-due-diligence-mexico'],
  simca: ['developers', 'simca-desarrollos'],
  quivira: ['developers', 'quivira-los-cabos'],
};

const SLOP_REPLACEMENTS = [
  [/family office coordination/gi, 'cross-border wealth advisor review'],
  [/family office connections/gi, 'private banking and advisor networks'],
  [/family office investments/gi, 'portfolio capital allocations'],
  [/family offices parking USD/gi, 'buyers parking USD'],
  [/family offices/gi, 'portfolio buyers'],
  [/family office/gi, 'wealth advisor'],
  [/sophisticated cross-border tax planning/gi, 'cross-border tax planning with a licensed CPA'],
  [/sophisticated tax planning/gi, 'cross-border tax planning'],
  [/sophisticated investor due diligence/gi, 'thorough buyer due diligence'],
  [/sophisticated investors seeking/gi, 'experienced buyers seeking'],
  [/sophisticated investors/gi, 'experienced buyers'],
  [/sophisticated investor/gi, 'experienced buyer'],
  [/sophisticated understanding/gi, 'clear understanding'],
  [/sophisticated US\/Mexico tax planning/gi, 'US/Mexico tax planning with licensed counsel'],
  [/Comprehensive Investment Guide/g, 'Investment Guide'],
  [/Comprehensive windstorm/g, 'Full windstorm'],
  [/Comprehensive coverage/g, 'Full coverage'],
  [/Comprehensive insurance/g, 'Full insurance'],
];

function resolve(slug) {
  if (valid.has(slug)) return slug;
  if (SLUG_MAP[slug]) return SLUG_MAP[slug][1];
  return null;
}

function resolveColl(slug) {
  if (valid.has(slug)) return valid.get(slug);
  if (SLUG_MAP[slug]) return SLUG_MAP[slug][0];
  return 'guides';
}

function fixLinks(text) {
  return text.replace(
    /\]\(\/(guides|compare|areas|projects|developers|news)\/([a-z0-9\-]+)\/?\)/gi,
    (full, _coll, slug) => {
      const target = resolve(slug);
      if (!target) return full;
      const coll = resolveColl(slug);
      return `](/${coll}/${target}/)`;
    },
  );
}

function fixRelatedSlugs(fm) {
  if (!fm.includes('relatedSlugs:')) return fm;
  return fm.replace(/-\s+["']?([a-z0-9\-]+)["']?/g, (line, slug) => {
    if (!slug || slug === 'relatedSlugs') return line;
    const target = resolve(slug);
    if (!target || target === slug) return line;
    return `  - "${target}"`;
  });
}

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (e.endsWith('.mdx')) files.push(p);
  }
  return files;
}

const TITLE_FIXES = {
  'branded-residences-mexico-guide.mdx':
    'Branded Residences Mexico 2026: Investment Guide',
  'el-lago-querencia.mdx': 'El Lago Querencia Review: Golf Villas from $3M',
  'coronado-quivira.mdx': 'Coronado Quivira Review: Pacific Estates $2.7M+',
  'one-only-mandarina.mdx': 'One&Only Mandarina Review: Villas from $7.8M',
  'dine-montage-punta-mita.mdx': 'DINE Montage Punta Mita: Developer Profile',
  'querencia-los-cabos.mdx': 'Querencia Los Cabos: Developer Profile 2026',
  'quivira-los-cabos.mdx': 'Quivira Los Cabos: Developer Profile 2026',
  'zama-desarrollos.mdx': 'Zama Desarrollos: Aldea Zama Developer Profile',
  'tm-real-estate-group.mdx': 'TM Real Estate Group: Playa Developer Profile',
};

let stats = { files: 0, links: 0, slop: 0, titles: 0 };

for (const path of walk(DRAFT)) {
  let raw = readFileSync(path, 'utf8');
  const m = raw.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!m) continue;
  let [, o, fm, c, body] = m;

  const beforeLinks = body;
  body = fixLinks(body);
  if (body !== beforeLinks) stats.links++;

  fm = fixRelatedSlugs(fm);

  for (const [re, rep] of SLOP_REPLACEMENTS) {
    const b = body;
    body = body.replace(re, rep);
    fm = fm.replace(re, rep);
    if (body !== b) stats.slop++;
  }

  const base = path.split('/').pop();
  if (TITLE_FIXES[base]) {
    fm = fm.replace(/^title:\s*.+$/m, `title: "${TITLE_FIXES[base]}"`);
    stats.titles++;
  }

  writeFileSync(path, o + fm + c + body, 'utf8');
  stats.files++;
}

console.log('Fixed', stats.files, 'files. Link passes:', stats.links, 'slop passes:', stats.slop, 'titles:', stats.titles);
