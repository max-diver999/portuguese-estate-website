# Handoff: expensive model only

Site: `portuguese-estate-website` / https://portuguese-estate.com

## Already done (skip)

- Unified shortlist offer (`src/data/leadOffer.ts`, 5 priority InlineCta, LeadForm)
- `/get-shortlist/` Portugal content fix
- Homepage trust copy tweak
- IMT cluster body links (4 area guides)
- `docs/analytics-leads.md` spec only

## Your scope

1. **Snippets + answer-first** (7 MDX): porto-alojamento-local-rules, rnal-registration-portugal, property-management-portugal-cost, buy-property-portugal-foreigner, how-to-buy-property-portugal-step-by-step, nif-portugal-property-purchase, power-of-attorney-property-portugal. Use GSC MCP `user-search-console-portuguese-estate`, 28 days query+page. No em-dash in new prose.

2. **CRO 5 URLs**: imt guide, step-by-step, get-shortlist, uk-buyers, us-buyers. Mobile form/WhatsApp visibility, IMT 7.5% + 0.8% stamp callout table.

3. **Implement GA4** per `docs/analytics-leads.md`.

4. **GEO citability** on top 10 money pages (audit script), target ≥4.0 where quick.

5. validate + qa:corpus + build + production commit + push + explicit indexing.

## Wikidata

Add Q-id to `sameAs` in `BaseLayout.astro` only if Maksim provides Q-id.
