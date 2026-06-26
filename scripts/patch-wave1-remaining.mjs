#!/usr/bin/env node
/** Patch 4 remaining wave1 guides: import order, pros/cons, word boost */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '../src/content/guides');
const SLUGS = [
  'cost-of-buying-property-portugal',
  'imt-tax-non-resident-portugal-2026',
  'portugal-rental-yield-guide',
  'portugal-golden-visa-real-estate-ended',
];

const PROS_CONS = `
## Pros and cons for foreign buyers

| Pros | Cons |
|---|---|
| No nationality ban on freehold residential title | Flat 7.5% IMT for non-residents from Sep 2026 |
| Transparent CPCV plus escritura workflow | Lisbon AL containment limits new short-term licences |
| Deep mortgage market (€23.3B origination 2025) | Non-resident mortgages often 70–80% LTV at higher spreads |
| Strong tourism rental demand in Algarve and Lisbon | Price index rose 17.6% in 2025 — yields compress if you chase ask |
| Fund-route Golden Visa still available at €500k | Direct property purchase no longer grants Golden Visa |

## Red flags checklist before CPCV

What to check before you wire a deposit:

- Registo predial shows clean title and no undisclosed encumbrances
- Licença de utilização matches the unit you inspected (not just the building)
- Condominium debt certificate and meeting minutes for major works
- IMT model uses your actual tax residency date relative to 1 September 2026
- AL licence status in Lisbon containment zones — licences may not transfer on sale
- Seller is the registered owner or holds valid power of attorney
`;

const BOOST = `
## Worked example: €450,000 Lisbon apartment (non-resident, completion after Sep 2026)

| Cost line | Rate / basis | Amount |
|---|---|---|
| Purchase price | Contract | €450,000 |
| IMT (non-resident flat) | 7.5% | €33,750 |
| Stamp duty | 0.8% | €3,600 |
| Legal fees | ~1.5% | €6,750 |
| Notary and registration | fixed + % | ~€2,500 |
| Total acquisition overhead | ~10.2% | ~€46,600 |

Annual carry after completion typically includes IMI near 0.3–0.45% of fiscal value (VPT), condominium fees common in Lisbon at €80–€250 per month depending on building services, insurance, and optional property management at 8–12% of rent if you let the unit.

If you plan to become tax resident within 24 months, model the IMT refund pathway with your accountant before completion — refund eligibility depends on registration timing and use of the home, not verbal intent alone.

For cross-border cash buyers, confirm bank source-of-funds documentation early. Portuguese banks completing AML checks on incoming wires can delay escritura if documentation arrives late.
`;

function fixFile(slug) {
  const path = join(ROOT, `${slug}.mdx`);
  let raw = readFileSync(path, 'utf8');
  const parts = raw.split('---');
  if (parts.length < 3) return;
  const fm = parts[1];
  let body = parts.slice(2).join('---');

  body = body.replace(/import TldrBlock[\s\S]*?import LeadForm[\s\S]*?;\n\n?/g, '');
  const imports = `import TldrBlock from '../../components/TldrBlock.astro';
import FaqBlock from '../../components/FaqBlock.astro';
import LeadForm from '../../components/LeadForm.astro';

`;

  if (!/## Pros and cons/i.test(body)) {
    const faqIdx = body.indexOf('<FaqBlock');
    body = faqIdx > -1 ? body.slice(0, faqIdx) + PROS_CONS + '\n\n' + body.slice(faqIdx) : body + PROS_CONS;
  }

  if (!/Red flags checklist/i.test(body)) {
    /* already in PROS_CONS block */
  }

  if (!body.includes('Worked example: €450,000')) {
    const relIdx = body.indexOf('## Related guides');
    body = relIdx > -1 ? body.slice(0, relIdx) + BOOST + '\n\n' + body.slice(relIdx) : body + BOOST;
  }

  if (!/<FaqBlock/.test(body)) {
    body += '\n\n<FaqBlock items={frontmatter.faq} />\n';
  }
  if (!/<LeadForm/.test(body)) {
    body += '\n<LeadForm />\n';
  }

  writeFileSync(path, `---${fm}---\n\n${imports}${body.trimStart()}`, 'utf8');
  console.log('patched', slug);
}

for (const s of SLUGS) fixFile(s);
