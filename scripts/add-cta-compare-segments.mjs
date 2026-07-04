#!/usr/bin/env node
/**
 * Adds InlineCta to compare/ and segments/ MDX files that lack one.
 * Context-aware CTA text per file theme.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const IMPORT = "import InlineCta from '../../components/InlineCta.astro';";

const files = {
  'compare/algarve-vs-lisbon-property-investment.mdx': {
    headline: 'Algarve or Lisbon: which fits your investment case?',
    subtext: 'Share budget, rental strategy, and tax status. We model yield, liquidity, and IMT timing for both regions.',
    ctaId: 'inline_algarve_lisbon',
    whatsapp: "Hi Portuguese Estate! I read your Algarve vs Lisbon comparison and want help choosing the right region.",
  },
  'compare/lagos-vs-vilamoura-investment.mdx': {
    headline: 'Lagos or Vilamoura: where does your budget go further?',
    subtext: 'Tell us target price and AL priority. We compare price per m2, rental ceilings, and licence availability.',
    ctaId: 'inline_lagos_vilamoura',
    whatsapp: "Hi Portuguese Estate! I read your Lagos vs Vilamoura comparison and want area-specific shortlist.",
  },
  'compare/lisbon-vs-cascais-property.mdx': {
    headline: 'Lisbon capital or Cascais coast for your strategy?',
    subtext: 'Share budget and rental plan. We model centre vs seaside trade-offs and IMT from September 2026.',
    ctaId: 'inline_lisbon_cascais',
    whatsapp: "Hi Portuguese Estate! I read your Lisbon vs Cascais comparison and want help narrowing my search.",
  },
  'compare/portugal-vs-greece-property-investment.mdx': {
    headline: 'Portugal or Greece for your EU property play?',
    subtext: 'Send budget and citizenship. We compare yields, Golden Visa paths, tax regimes, and IMT vs Greek rules.',
    ctaId: 'inline_portugal_greece',
    whatsapp: "Hi Portuguese Estate! I read your Portugal vs Greece comparison and want Portugal-specific guidance.",
  },
  'compare/portugal-vs-italy-property-investment.mdx': {
    headline: 'Portugal or Italy: which market suits your profile?',
    subtext: 'Share budget and rental vs lifestyle goal. We compare yields, buyer costs, and tax treatment side-by-side.',
    ctaId: 'inline_portugal_italy',
    whatsapp: "Hi Portuguese Estate! I read your Portugal vs Italy comparison and want Portugal investment help.",
  },
  'compare/portugal-vs-spain-property-investment.mdx': {
    headline: 'Portugal or Spain after their 2025 Golden Visa changes?',
    subtext: 'Share budget and target region. We model Portugal IMT 7.5% vs Spanish buyer taxes and rental licensing.',
    ctaId: 'inline_portugal_spain',
    whatsapp: "Hi Portuguese Estate! I read your Portugal vs Spain comparison and want Portugal property guidance.",
  },
  'segments/american-buyers-portugal-property.mdx': {
    headline: 'US buyer? Need NIF, FBAR, and FATCA clarity?',
    subtext: 'Share state, budget, and tax residency. We connect Portuguese lawyers and US-qualified CPAs for clean cross-border setup.',
    ctaId: 'inline_us_buyers',
    whatsapp: "Hi Portuguese Estate! I'm a US buyer researching Portugal property and need tax/legal guidance.",
  },
  'segments/angolan-buyers-portugal.mdx': {
    headline: 'Angolan buyer navigating forex and fiscal rep?',
    subtext: 'Share budget and financing plan. We coordinate Portuguese banks familiar with AOA transfers and non-EU KYC.',
    ctaId: 'inline_angolan_buyers',
    whatsapp: "Hi Portuguese Estate! I'm from Angola and researching Portugal property investment.",
  },
  'segments/brazilian-buyers-portugal-property.mdx': {
    headline: 'Brazilian buyer? We help with BRL forex and D7 visa.',
    subtext: 'Send budget and residency plan. We model exchange timing, tax treaties, and D7 passive income path.',
    ctaId: 'inline_brazilian_buyers',
    whatsapp: "Hi Portuguese Estate! I'm from Brazil and want Portugal property guidance.",
  },
  'segments/chinese-buyers-portugal-property.mdx': {
    headline: 'Chinese buyer navigating capital controls and NIF?',
    subtext: 'Share budget and transfer plan. We connect lawyers experienced with CNY settlement and non-EU buyer flows.',
    ctaId: 'inline_chinese_buyers',
    whatsapp: "Hi Portuguese Estate! I'm from China and researching Portugal property investment.",
  },
  'segments/french-buyers-portugal-property.mdx': {
    headline: 'French buyer? We help with tax treaty and mortgage options.',
    subtext: 'Share budget and financing plan. We model France-Portugal tax treaty benefits and cross-border mortgage paths.',
    ctaId: 'inline_french_buyers',
    whatsapp: "Hi Portuguese Estate! I'm from France and want Portugal property guidance.",
  },
  'segments/german-buyers-portugal-property.mdx': {
    headline: 'German buyer? We model tax treaty and D7 visa paths.',
    subtext: 'Send budget and residency goal. We coordinate German-speaking lawyers and tax advisors for clean setup.',
    ctaId: 'inline_german_buyers',
    whatsapp: "Hi Portuguese Estate! I'm from Germany and researching Portugal property investment.",
  },
  'segments/uk-buyers-portugal-property-brexit.mdx': {
    headline: 'UK buyer post-Brexit? We help with NIF, mortgage, and 183-day rule.',
    subtext: 'Share budget and tax residency plan. We model mortgage access, Schengen limits, and UK-Portugal tax treaty.',
    ctaId: 'inline_uk_buyers',
    whatsapp: "Hi Portuguese Estate! I'm a UK buyer researching Portugal property post-Brexit.",
  },
};

let added = 0;

for (const [relPath, cta] of Object.entries(files)) {
  const path = join(ROOT, 'src/content', relPath);
  let src = readFileSync(path, 'utf8');
  if (src.includes('InlineCta')) {
    console.log(`SKIP (has CTA): ${relPath}`);
    continue;
  }

  // 1. Add import
  const imports = [...src.matchAll(/^import .*;$/gm)];
  if (imports.length === 0) {
    console.error(`SKIP (no imports): ${relPath}`);
    continue;
  }
  const lastImport = imports[imports.length - 1];
  const importEnd = lastImport.index + lastImport[0].length;
  src = src.slice(0, importEnd) + '\n' + IMPORT + src.slice(importEnd);

  // 2. Insert CTA before mid-article H2
  const h2s = [...src.matchAll(/^## .*$/gm)];
  if (h2s.length < 3) {
    console.error(`SKIP (<3 H2s): ${relPath}`);
    continue;
  }
  const target = h2s[Math.min(3, Math.floor(h2s.length / 2))];
  const block = `<InlineCta
  headline="${cta.headline}"
  subtext="${cta.subtext}"
  ctaId="${cta.ctaId}"
  whatsappMessage="${cta.whatsapp}"
/>

`;
  src = src.slice(0, target.index) + block + src.slice(target.index);

  writeFileSync(path, src);
  added++;
  console.log(`✓ ${relPath}`);
}

console.log(`\nAdded InlineCta: ${added} files`);
