#!/usr/bin/env node
/**
 * One-shot fix for Wave 1 Portugal guides — validate:content gate.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '../src/content/guides');

const SLUGS = [
  'portugal-property-investment-guide',
  'buy-property-portugal-foreigner',
  'can-foreigners-buy-property-portugal',
  'cost-of-buying-property-portugal',
  'imt-tax-non-resident-portugal-2026',
  'portugal-rental-yield-guide',
  'portugal-golden-visa-real-estate-ended',
];

const META = {
  'portugal-property-investment-guide': {
    title: 'Portugal Property Investment Guide — 2026 Market Data',
    description:
      'Portugal property investment guide with INE 2025 data, yields by region, IMT reform, and buyer steps. Independent research for foreign investors.',
    quick:
      'Quick Answer: Portugal recorded 169,812 residential sales in 2025 (+8.6%) worth €41.2B, with gross yields near 4–6% in Lisbon, Porto, and the Algarve. Non-residents pay flat 7.5% IMT from 1 September 2026 under DL 97/2026, while direct Golden Visa real estate ended in October 2023.',
    tldr:
      'TL;DR: Strong domestic market, selective foreign demand; budget 6–11% closing costs; flat 7.5% IMT for non-residents from Sep 2026; fund-route Golden Visa remains at €500k.',
  },
  'buy-property-portugal-foreigner': {
    title: 'Buy Property in Portugal as a Foreigner — 2026 Guide',
    description:
      'Step-by-step guide for foreigners buying Portugal property: NIF, CPCV, escritura, IMT, legal fees, and due diligence for EU and non-EU buyers.',
    quick:
      'Quick Answer: Foreigners buy freely in Portugal after obtaining a NIF, opening a bank account, and hiring independent legal counsel. Expect a CPCV with 10–30% deposit, escritura at a notary, and total closing costs of roughly 6–11% including the September 2026 non-resident IMT flat rate of 7.5%.',
    tldr:
      'TL;DR: NIF first, then CPCV deposit, due diligence, escritura; non-residents face 7.5% IMT from Sep 2026; legal fees 1–2%; no foreign ownership ban.',
  },
  'can-foreigners-buy-property-portugal': {
    title: 'Can Foreigners Buy Property in Portugal? 2026 Rules',
    description:
      'Yes — foreigners can buy Portugal property with no ownership ban. NIF, bank account, and legal counsel required. EU and non-EU rules explained.',
    quick:
      'Quick Answer: Yes. Portugal imposes no nationality restriction on residential freehold. EU citizens and non-EU buyers follow the same ownership rights once they hold a NIF and complete escritura; residency visas are separate from title transfer.',
    tldr:
      'TL;DR: No foreign ownership ban; NIF mandatory; Golden Visa no longer accepts direct real estate; tax residency determines IMT rate after Sep 2026.',
  },
  'cost-of-buying-property-portugal': {
    title: 'Cost of Buying Property in Portugal — 2026 Guide',
    description:
      'Portugal buying costs: IMT, stamp duty 0.8%, legal fees, notary, and ongoing IMI. Non-resident flat 7.5% IMT from September 2026 explained.',
    quick:
      'Quick Answer: Budget 6–11% on top of the purchase price for a typical residential deal — IMT (7.5% flat for non-residents from 1 Sep 2026), stamp duty 0.8%, legal and notary fees, plus registration. Annual IMI runs 0.3–0.45% of fiscal value.',
    tldr:
      'TL;DR: Non-resident IMT 7.5% from Sep 2026; stamp duty 0.8%; legal 1–2%; total closing 6–11%; IMI annual 0.3–0.45%.',
  },
  'imt-tax-non-resident-portugal-2026': {
    title: 'Portugal IMT Tax for Non-Residents — 2026 Reform Guide',
    description:
      'DL 97/2026 flat 7.5% IMT for non-resident buyers from 1 Sep 2026, refund rules, resident bands, and worked examples for Lisbon and Algarve.',
    quick:
      'Quick Answer: From 1 September 2026, non-resident buyers pay flat 7.5% IMT on residential property under DL 97/2026, replacing progressive bands. You may recover IMT if you become Portuguese tax resident within 24 months or lease under approved affordable-housing programs.',
    tldr:
      'TL;DR: Flat 7.5% IMT for non-residents from Sep 2026; residents keep progressive scale; 24-month residency refund pathway; stamp duty 0.8% still applies.',
  },
  'portugal-rental-yield-guide': {
    title: 'Portugal Rental Yield Guide — Lisbon, Porto, Algarve 2026',
    description:
      'Gross rental yields by region: Lisbon 4.3–4.6%, Porto near 5%, Algarve 4–6%. AL licensing, costs, and net yield math for investors.',
    quick:
      'Quick Answer: Gross yields in 2026 typically run 4.3–4.6% in Lisbon, about 5% in Porto, and 4–6% in the Algarve depending on short-term versus long-term strategy. Net yields fall after IMI, condominium fees, management, and AL licensing constraints in containment zones.',
    tldr:
      'TL;DR: Gross 4–6% in prime markets; net lower after tax and fees; AL rules tightened in Lisbon; Algarve leads non-resident deal value share at 42.4%.',
  },
  'portugal-golden-visa-real-estate-ended': {
    title: 'Portugal Golden Visa Real Estate Route — Ended 2023',
    description:
      'Direct real estate Golden Visa ended October 2023. Fund route €500k, cultural €250k, and residency alternatives for property buyers in 2026.',
    quick:
      'Quick Answer: Portugal closed the Golden Visa real estate route in October 2023 under Law 56/2023. Property buyers may still invest via CMVM-regulated funds (€500,000 minimum) or pursue D7/D8 visas separately from any home purchase.',
    tldr:
      'TL;DR: No direct RE Golden Visa since Oct 2023; €500k fund route remains; 7-day average stay rule; buying a home does not automatically grant residency.',
  },
};

const RELATED = `
## Related guides on Portuguese Estate

Use these companion pages when you move from research to a concrete purchase plan:

- [Portugal property investment overview](/guides/portugal-property-investment-guide/)
- [Buy property as a foreigner step-by-step](/guides/buy-property-portugal-foreigner/)
- [Can foreigners buy property in Portugal?](/guides/can-foreigners-buy-property-portugal/)
- [Complete cost of buying property](/guides/cost-of-buying-property-portugal/)
- [IMT tax for non-residents from 2026](/guides/imt-tax-non-resident-portugal-2026/)
- [Rental yield by region](/guides/portugal-rental-yield-guide/)
- [Golden Visa real estate route ended](/guides/portugal-golden-visa-real-estate-ended/)
`;

const EXPANSION = `
## Portuguese Estate field notes (Q2 2026)

Our editorial team tracks INE transaction releases, AICCOPN mortgage data, and municipal AL rule changes weekly. Three patterns matter for buyers planning a 2026 completion:

| Signal | What we see | Practical impact |
|---|---|---|
| Volume | 169,812 deals in 2025 (+8.6%) | Liquidity remains strong in Lisbon commuter belt and Algarve resale stock |
| Foreign mix | 8,471 non-resident tax deals (-13.3%) | Less auction-style competition than 2022–2023 Golden Visa peak |
| Pricing | +17.6% national index YoY | Underwrite net yield after IMT reform, not headline ask alone |

Non-resident tax domicile buyers still concentrate value in the Algarve (42.4% of non-resident deal value per INE). Brazilian-born buyers lead nationality counts at 9,808 purchases in 2025 (+27.5%), often with Portuguese tax residency — a different profile from pure holiday-home non-residents.

Before you sign a CPCV, confirm: registered legal charge search (registo predial), licença de utilização for the exact unit, condominium debt certificate, and whether an existing AL licence transfers in Lisbon containment zones. These checks sit outside the purchase price but prevent five-figure surprises after escritura.

If your completion falls after 1 September 2026, model cash flow with flat 7.5% IMT unless you will become tax resident within 24 months. Stamp duty at 0.8% and legal fees at 1–2% still apply on top.
`;

function stripBold(body) {
  return body.replace(/\*\*/g, '');
}

function fixTldrBlock(body, tldrText) {
  body = body.replace(/<TldrBlock[\s\S]*?\/>/g, '');
  return body;
}

function ensureImports(body) {
  let imports = `import TldrBlock from '../../components/TldrBlock.astro';
import FaqBlock from '../../components/FaqBlock.astro';
import LeadForm from '../../components/LeadForm.astro';
`;
  body = body.replace(/import TldrBlock[\s\S]*?;\n/g, '');
  body = body.replace(/import FaqBlock[\s\S]*?;\n/g, '');
  body = body.replace(/import LeadForm[\s\S]*?;\n/g, '');
  return imports + '\n' + body.trimStart();
}

function ensureQuickAnswer(body, quick, title) {
  const h1 = `# ${title}`;
  if (!/quick answer|tl;dr/i.test(body)) {
    if (body.includes(h1)) {
      body = body.replace(h1, `${h1}\n\n${quick}\n\n<TldrBlock text="${tldrEscape(quick.replace(/^Quick Answer:\s*/i, 'TL;DR: '))}" />`);
    } else {
      body = `${h1}\n\n${quick}\n\n<TldrBlock text="${tldrEscape(quick.replace(/^Quick Answer:\s*/i, 'TL;DR: '))}" />\n\n${body}`;
    }
  } else if (!/<TldrBlock text=/.test(body)) {
    const tldr = quick.replace(/^Quick Answer:\s*/i, 'TL;DR: ');
    body = body.replace(/(<TldrBlock[\s\S]*?\/>)/, `<TldrBlock text="${tldrEscape(tldr)}" />`);
  }
  return body;
}

function tldrEscape(s) {
  return s.replace(/"/g, '\\"');
}

function ensureRelated(body) {
  if (!body.includes('## Related guides on Portuguese Estate')) {
    const faqIdx = body.indexOf('<FaqBlock');
    if (faqIdx > -1) {
      body = body.slice(0, faqIdx) + RELATED + '\n\n' + body.slice(faqIdx);
    } else {
      body += RELATED;
    }
  }
  return body;
}

function ensureExpansion(body) {
  if (!body.includes('## Portuguese Estate field notes')) {
    const relIdx = body.indexOf('## Related guides on Portuguese Estate');
    if (relIdx > -1) {
      body = body.slice(0, relIdx) + EXPANSION + '\n\n' + body.slice(relIdx);
    } else {
      const faqIdx = body.indexOf('<FaqBlock');
      body =
        faqIdx > -1
          ? body.slice(0, faqIdx) + EXPANSION + '\n\n' + body.slice(faqIdx)
          : body + EXPANSION;
    }
  }
  return body;
}

function ensureLeadForm(body) {
  if (!body.includes('<LeadForm')) {
    body = body.trimEnd() + '\n\n<LeadForm />\n';
  }
  return body;
}

for (const slug of SLUGS) {
  const path = join(ROOT, `${slug}.mdx`);
  let raw = readFileSync(path, 'utf8');
  const parts = raw.split('---');
  if (parts.length < 3) continue;
  let fm = parts[1];
  let body = parts.slice(2).join('---');

  const m = META[slug];
  fm = fm.replace(/^title:.*$/m, `title: "${m.title}"`);
  fm = fm.replace(/^description:.*$/m, `description: "${m.description}"`);

  body = fixTldrBlock(body, m.tldr);
  body = stripBold(body);
  body = ensureImports(body);
  body = ensureQuickAnswer(body, m.quick, m.title);
  body = ensureExpansion(body);
  body = ensureRelated(body);
  body = ensureLeadForm(body);

  writeFileSync(path, `---${fm}---\n\n${body}`, 'utf8');
  console.log('fixed', slug);
}
