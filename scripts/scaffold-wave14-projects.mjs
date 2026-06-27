#!/usr/bin/env node
/** Scaffold Wave 14 P1 project reviews from curated metadata. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../src/content/projects');

const PROJECTS = [
  {
    slug: 'tomas-ribeiro-79',
    title: 'Tomás Ribeiro 79 Review — Avenidas Novas Lisbon 2026',
    description: 'Tomás Ribeiro 79 Lisbon review: Vanguard off-plan in Avenidas Novas, unit mix, DL 67/2003 guarantees, IMT 7.5% and foreign buyer checklist.',
    heroImage:
      'https://www.vangproperties.com/media/6903/tomas-ribeiro-79-quiet_18_final_2_2.jpg?anchor=center&mode=crop&rnd=133740018570000000&preset=socialShare',
    developer: 'Vanguard Properties',
    area: 'lisbon-avenidas-novas',
    propertyType: 'apartment',
    status: 'off-plan',
    priceFromEUR: 850000,
    handover: '2027',
    location: 'Avenidas Novas, Lisbon',
    units: 'Premium apartments in a mid-rise urban scheme',
    angle: 'Lisbon professional tenant and owner-occupier demand near Avenidas Novas offices and metro',
  },
  {
    slug: 'terracos-do-monte',
    title: 'Terraços do Monte Review — Graça Lisbon Off-Plan 2026',
    description: 'Terraços do Monte Graça review: Vanguard Lisbon hilltop scheme, terraces, completion timeline, bank guarantees and investor due diligence.',
    heroImage:
      'https://www.vangproperties.com/media/6658/terracos-do-monte_2.png?anchor=center&mode=crop&width=390&height=844&format=webp&quality=90&rnd=133602640930000000&preset=sliderheromax600',
    developer: 'Vanguard Properties',
    area: 'lisbon-graca',
    propertyType: 'apartment',
    status: 'off-plan',
    priceFromEUR: 720000,
    handover: '2027',
    location: 'Graça, Lisbon historic hillside',
    units: 'Terraced apartments with city and river views',
    angle: 'View premium and short-term regulation context versus Chiado RMAL containment',
  },
  {
    slug: 'castilho-203',
    title: 'Castilho 203 Review — Avenidas Novas Completed 2026',
    description: 'Castilho 203 Lisbon review: completed Vanguard ultra-premium building, resale liquidity, service charges and benchmark for off-plan buyers.',
    heroImage:
      'https://www.vangproperties.com/media/3350/vp-castilho-203.png?anchor=center&mode=crop&rnd=133470292310000000&preset=socialShare',
    developer: 'Vanguard Properties',
    area: 'lisbon-avenidas-novas',
    propertyType: 'apartment',
    status: 'completed',
    priceFromEUR: 1200000,
    handover: 'delivered',
    location: 'Castilho street, Avenidas Novas',
    units: '19 ultra-premium apartments',
    angle: 'Completed benchmark for Vanguard build quality and AML luxury resale depth',
  },
  {
    slug: 'infinity',
    title: 'Infinity Lisbon Review — Sete Rios Tower Completed 2026',
    description: 'Infinity Sete Rios review: completed Vanguard high-rise, BREEAM context, yields, IMT for resale buyers and comparison with off-plan pipeline.',
    heroImage:
      'https://www.vangproperties.com/media/3351/vp-infinity.png?anchor=center&mode=crop&rnd=133470292310000000&preset=socialShare',
    developer: 'Vanguard Properties',
    area: 'lisbon-sete-rios',
    propertyType: 'apartment',
    status: 'completed',
    priceFromEUR: 650000,
    handover: 'delivered',
    location: 'Sete Rios, Lisbon',
    units: 'Roughly 195 apartments across tower format',
    angle: 'Scale delivery proof and long-term tenant pool near hospital and transport hub',
  },
  {
    slug: 'six-senses-comporta',
    title: 'Six Senses Comporta Review — Branded Residences 2026',
    description: 'Six Senses Residences Comporta review: VIC branded villas, hospitality operator, handover timeline and luxury buyer due diligence.',
    heroImage: 'https://pinheirinhocomporta.com/wp-content/uploads/2025/07/pin.png',
    developer: 'VIC Properties',
    area: 'comporta',
    propertyType: 'villa',
    status: 'off-plan',
    priceFromEUR: 2500000,
    handover: '2028',
    location: 'Pinheirinho, Comporta coast',
    units: 'Branded residences within Six Senses masterplan',
    angle: 'Luxury hospitality-branded exit narrative versus pure rental yield',
  },
  {
    slug: 'carvalhido',
    title: 'Carvalhido BTR Review — Porto Build-to-Rent 2026',
    description: 'Carvalhido Porto BTR review: Sonae Sierra build-to-rent, ~200 units, institutional tenancy model and foreign buyer limitations.',
    heroImage: 'https://www.sonaesierra.com/wp-content/uploads/2023/03/Imagem3.png',
    developer: 'Sonae Sierra Developments',
    area: 'porto-carvalhido',
    propertyType: 'apartment',
    status: 'delivering',
    priceFromEUR: 280000,
    handover: '2026',
    location: 'Carvalhido, Porto',
    units: 'Approx. 200 T0–T2 build-to-rent units',
    angle: 'Institutional BTR model — verify if individual foreign freehold sales apply',
  },
  {
    slug: 'mar-adentro',
    title: 'Mar Adentro Faro Review — Waterfront Regeneration 2026',
    description: 'Mar Adentro Faro review: Lantia Ria Formosa regeneration, ~200 units, sales from 2026, moderately priced housing mix and off-plan checks.',
    heroImage:
      'https://www.vangproperties.com/media/6903/tomas-ribeiro-79-quiet_18_final_2_2.jpg?anchor=center&mode=crop&rnd=133740018570000000&preset=socialShare',
    developer: 'Lantia',
    area: 'faro',
    propertyType: 'apartment',
    status: 'off-plan',
    priceFromEUR: 320000,
    handover: '2029',
    location: 'Fábrica da Moagem site, lower Faro',
    units: 'Five buildings, studios to four-bedroom, ~200 units',
    angle: 'Algarve capital regeneration play versus western resort premiums',
  },
];

function buildBody(p) {
  const devSlug =
    p.developer.includes('Vanguard')
      ? 'vanguard-properties-portugal'
      : p.developer.includes('VIC')
        ? 'vic-properties-portugal'
        : p.developer.includes('Sonae') || p.developer.includes('Lantia')
          ? null
          : 'farinvest-properties-portugal';
  const devLink = devSlug
    ? `[developer review](/developers/${devSlug}/)`
    : `[Portugal developers hub](/guides/portugal-property-developers-guide-2026/)`;

  return `# ${p.title.replace(/ Review.*$/, '')}

Quick Answer: ${p.title.split(' Review')[0]} is a ${p.status.replace('-', ' ')} ${p.propertyType} scheme by ${p.developer} in ${p.location}. ${p.angle}. Foreign buyers follow standard CPCV and escritura rules; non-residents completing after 1 September 2026 pay flat 7.5% IMT under DL 97/2026. Off-plan payments require Decreto-Lei 67/2003 bank guarantees. This is editorial due diligence, not a buy recommendation.

<TldrBlock text="TL;DR: ${p.developer} · ${p.location} · ${p.status}. ${p.units}. Handover/target: ${p.handover}. Non-resident IMT flat 7.5% from Sep 2026. Off-plan: DL 67/2003 guarantee on every pre-deed payment. Independent lawyer mandatory. Compare [off-plan guide](/guides/off-plan-property-portugal-guide/) and ${devLink}." />

${p.title.split(' Review')[0]} sits in ${p.location}, one of the addresses foreign buyers research when comparing Lisbon, Porto, Comporta and Algarve capital stock. Developer marketing emphasises design, amenities and location narrative. Investor underwriting must separate render from registered plans, verify seller legal identity, and model tax timing at escritura.

This review covers location context, unit mix, delivery status, acquisition costs for non-residents, pros and cons, red flags before deposit, and links to national purchase mechanics. Start with [off-plan property Portugal guide](/guides/off-plan-property-portugal-guide/) for shared legal framework and [due diligence checklist](/guides/due-diligence-portugal-property/) for registry checks.

Disclaimer: Portuguese Estate Editorial does not provide investment, tax or legal advice. Confirm all figures with developer price lists, your lawyer and latest INE data before CPCV.

## What is ${p.title.split(' Review')[0]}?

${p.title.split(' Review')[0]} is developed by ${p.developer} as ${p.units.toLowerCase()}. Marketing positions the scheme for ${p.angle.toLowerCase()}. Status in 2026: **${p.status.replace('-', ' ')}** with target handover **${p.handover}**.

National context: Portugal recorded 169,812 transactions in 2025, €41.2B deal value, +17.6% price index, and 8,471 non-resident purchases (-13.3% YoY). AICCOPN reported 41,592 new dwelling licences (+20.1%). New supply affects resale narrative but does not remove off-plan execution risk on any single scheme.

| Item | Detail |
|---|---|
| Developer | ${p.developer} |
| Location | ${p.location} |
| Type | ${p.propertyType} |
| Status | ${p.status} |
| Units (marketing) | ${p.units} |
| Target handover | ${p.handover} |

## Where is the project and who is the tenant pool?

${p.location} determines commute patterns, rental seasonality and resale buyer depth. ${p.angle}. Cross-read the relevant area or city guide: [Lisbon property investment](/guides/lisbon-property-investment-guide/), [Porto property investment](/guides/porto-property-investment-guide/), [Algarve property investment](/guides/algarve-property-investment-guide/), [Comporta property investment](/areas/comporta-property-investment/), or [Faro property investment](/areas/faro-property-investment/) as applicable.

Professional long-term tenants, owner-occupiers and selective Alojamento Local operators compete in overlapping sub-markets. Default underwriting to twelve-month contracts unless RNAL transfer is verified for holiday use. See [long-term vs holiday rental](/guides/long-term-vs-holiday-rental-portugal/) and [AL licence guide](/guides/alojamento-local-license-portugal/).

## Pricing context and acquisition costs

List prices change by phase and unit. Developer materials at publish time should be treated as indicative; request written price list before reservation. Where marketing cites **from €${(p.priceFromEUR / 1000).toFixed(0)}K**, confirm exact unit, floor, parking and storage line items.

Non-resident buyers completing after 1 September 2026 pay **flat 7.5% IMT** plus **0.8% stamp duty** under DL 97/2026. Legal, notary and registry add roughly 2–3%. Model total cash-to-close in [cost of buying property](/guides/cost-of-buying-property-portugal/) and [buying costs calculator](/guides/portugal-buying-costs-calculator-examples/).

| Cost line | Typical non-resident note |
|---|---|
| IMT | Flat 7.5% from Sep 2026 |
| Stamp duty | 0.8% of purchase price |
| Legal fees | 1–2% off-plan review |
| Guarantee | DL 67/2003 on deposits |

## Off-plan protections and CPCV checklist

Any payment before escritura on ${p.status.includes('off') || p.status === 'delivering' ? 'off-plan or pre-completion' : 'resale'} stock requires independent legal review. Decreto-Lei 67/2003 mandates bank guarantee or insurance equal to sums paid if licença de utilização does not yet exist.

**Insider tip:** Match guarantee certificate amount and beneficiary to the exact seller entity on the CPCV — not the marketing brand alone. Read [CPCV promissory contract guide](/guides/cpcv-promissory-contract-portugal/) and [deposit guide](/guides/portugal-property-deposit-guide-cpcv/) before transfer.

Verify: licença de construção, IMPIC promotional filing, longstop calendar date, unit plan vs marketing render, condominium draft budget, IMT timing, and seller NIPC on registry.

## Pros and cons for foreign investors

| Pros | Cons |
|---|---|
| ${p.developer} track record and pipeline visibility | Premium new-build pricing vs resale in same parish |
| ${p.location} location narrative for target buyer pool | Off-plan delay risk on permits and fit-out |
| Clear unit mix for underwriting | Service charges on branded or amenity-heavy schemes |
| National buyer path open to foreigners | No guaranteed capital growth or yield |
| Bank guarantee law on pre-deed payments | AL restrictions may apply by municipality/building |

## Who should consider ${p.title.split(' Review')[0]}?

Suits buyers who want ${p.propertyType} exposure in ${p.location.split(',')[0]} with ${p.developer} delivery context and can tolerate ${p.status === 'completed' ? 'resale premium and condominium costs' : 'construction timeline risk'}. Suits less well pure yield hunters needing immediate cash flow without void period, or buyers who cannot verify guarantees before deposit.

Decision framework: compare [new-build vs resale](/compare/new-build-vs-resale-property-portugal/) and ${devLink}. Request shortlist via [get shortlist](/get-shortlist/) with lawyer referral.

## What to verify before paying a deposit

1. Seller legal name matches licença and land registry  
2. Active DL 67/2003 guarantee for deposit tranche  
3. Calendar longstop date with refund mechanics  
4. IMT model at 7.5% if non-resident post-Sep 2026  
5. Condominium rules on short-term letting if relevant  
6. Independent valuation context vs parish comps  

## How does ${p.title.split(' Review')[0]} compare with resale stock nearby?

New-build in ${p.location.split(',')[0]} often trades at a 10–25% per-square-metre premium over comparable age resale when energy rating and warranty are included. That premium may be justified if handover date is firm, guarantee stack is clean, and parking or storage is deeded. Resale often wins on immediate occupancy and known condominium accounts. Run three escritura comparables through your lawyer before accepting developer price list anchoring.

Compare national framing in [new-build vs resale Portugal](/compare/new-build-vs-resale-property-portugal/) and budget routing in [property under €500,000](/guides/portugal-property-under-500000-euros/) if ticket size matters to your portfolio.

| Factor | New-build (${p.status}) | Resale alternative |
|---|---|---|
| Entry premium | Often 10–25% €/m² | Lower if renovation needed |
| Occupancy | Void until handover | Immediate if tenanted |
| Guarantees | DL 67/2003 on deposits | Escritura-day risk only |
| Energy class | Typically A/A+ | Variable by year |

## Mortgage, payment schedule and foreign buyer timing

Non-resident mortgage origination remains selective in 2026. Many foreign buyers purchase ${p.propertyType} stock with cash or low LTV. If financing, start [non-resident mortgage](/guides/non-resident-mortgage-portugal/) and [mortgage rates foreigners 2026](/guides/portugal-mortgage-rates-foreigners-2026/) early — bank valuation may lag developer list price.

Off-plan payment schedules typically follow CPCV milestones tied to construction certificates. Never transfer a tranche without updated guarantee coverage for cumulative paid amounts. If targeting escritura before 1 September 2026 for progressive IMT bands, model dates in [complete before September 2026 IMT](/guides/complete-before-september-2026-imt-guide/) — calendar risk is buyer's unless longstop protects you.

## National market context for project underwriting

INE 2025: 169,812 transactions, €41.2B value, +17.6% residential index, 8,471 non-resident purchases (-13.3%). Non-resident concentration remains highest in AML and Algarve by value share. ${p.developer} pipeline adds supply in ${p.location.split(',')[0]} but single-scheme risk is idiosyncratic — permit delays, contractor disputes and fit-out complexity affect one building independent of national averages.

AICCOPN licensing at 41,592 units (+20.1%) moderates extreme scarcity narratives in some belts while leaving premium addresses supply-constrained. Underwrite this asset on parish comps, not national headlines alone. See [Portugal property market record 2025](/guides/portugal-property-market-record-2025-ine-data/) for release context.

<FaqBlock items={frontmatter.faq} />
`;
}

function buildFaq(p) {
  const name = p.title.split(' Review')[0];
  return [
    {
      question: `Who is the developer of ${name}?`,
      answer: `${p.developer} is the developer named in marketing materials for ${name} in ${p.location}. Confirm the exact CPCV seller entity and licença de construção holder with your Portuguese lawyer before any reservation payment.`,
    },
    {
      question: `Is ${name} off-plan or completed?`,
      answer: `Status is reported as ${p.status.replace('-', ' ')} with target handover ${p.handover}. Completed stock follows resale due diligence; off-plan requires Decreto-Lei 67/2003 guarantees on all pre-deed payments.`,
    },
    {
      question: `Can foreigners buy at ${name}?`,
      answer: `Yes. Portugal imposes no nationality ban on ownership. Non-residents need a NIF, bank account and fiscal representative if non-EU. Non-residents completing after 1 September 2026 pay flat 7.5% IMT under DL 97/2026.`,
    },
    {
      question: `What should I verify before a CPCV on ${name}?`,
      answer: `Verify licença de construção or utilização, guarantee certificates, longstop date, seller identity, unit plans vs render, condominium budget, and IMT timing. Use an independent lawyer — not the developer's counsel.`,
    },
    {
      question: `Does ${name} guarantee rental yield or capital growth?`,
      answer: `No developer can guarantee investment returns. Underwrite gross and net yield with your own rent comps and [gross vs net yield guide](/guides/gross-vs-net-yield-portugal/). INE recorded +17.6% national price growth in 2025 — past performance does not predict future results.`,
    },
  ];
}

function yamlFaq(faq) {
  return faq
    .map(
      (f) =>
        `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"')}"`,
    )
    .join('\n');
}

mkdirSync(OUT, { recursive: true });

for (const p of PROJECTS) {
  const faq = buildFaq(p);
  const related = [
    'off-plan-property-portugal-guide',
    'due-diligence-portugal-property',
    'cpcv-promissory-contract-portugal',
    'cost-of-buying-property-portugal',
    'imt-tax-non-resident-portugal-2026',
    p.developer.includes('Vanguard')
      ? 'vanguard-properties-portugal'
      : p.developer.includes('VIC')
        ? 'vic-properties-portugal'
        : 'portugal-property-investment-guide',
    'buy-property-portugal-foreigner',
    'portugal-property-deposit-guide-cpcv',
    'new-build-vs-resale-property-portugal',
  ].map((s) => `  - "${s}"`);

  const mdx = `---
title: "${p.title}"
description: "${p.description}"
pubDate: 2026-06-27
updatedDate: 2026-06-27
author: "Portuguese Estate Editorial"
category: "projects"
tags: ["${p.slug}", "${p.developer.toLowerCase().replace(/\s+/g, ' ')}", "${p.area}", "off-plan portugal", "portugal property project"]
readingTime: 14
heroImage: "${p.heroImage}"
priceFromEUR: ${p.priceFromEUR}
developer: "${p.developer}"
area: "${p.area}"
propertyType: "${p.propertyType}"
status: "${p.status}"
relatedSlugs:
${related.join('\n')}
faq:
${yamlFaq(faq)}
---

import TldrBlock from '../../components/TldrBlock.astro';
import FaqBlock from '../../components/FaqBlock.astro';

${buildBody(p)}
`;

  writeFileSync(join(OUT, `${p.slug}.mdx`), mdx, 'utf8');
  console.log('Wrote', p.slug);
}

console.log(`Done: ${PROJECTS.length} projects → ${OUT}`);
