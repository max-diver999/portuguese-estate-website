# Handoff: expensive model only

Site: `portuguese-estate-website` / https://portuguese-estate.com

## Already done (skip)

- Unified shortlist offer (`src/data/leadOffer.ts`, 5 priority InlineCta, LeadForm)
- `/get-shortlist/` Portugal content fix
- Homepage trust copy tweak
- IMT cluster body links (4 area guides)
- `docs/analytics-leads.md` spec only

## Status 2026-07-27: scope below is DONE

- Snippets + answer-first rewritten on all 7 MDX (GSC 28-day query+page pull); 4 em-dash titles removed
- IMT callout component `src/components/ImtCostCallout.astro` live on 5 CRO URLs; get-shortlist reordered so the form sits above the budget ladder on mobile
- GA4 wired: `generate_lead`, `whatsapp_click`, `page_view_thanks`. Fixed prerender bug where `/thanks/` never shipped its analytics script
- GEO: imt guide 61 to 82 (A), step-by-step 66 to 81 (A). Other 5 target guides lifted to 60-73 (C/B), not yet A
- validate:content, qa:corpus, build all pass

Remaining GEO work: push porto-alojamento-local-rules, rnal-registration-portugal, power-of-attorney, buy-property-portugal-foreigner, nif to 80+ (thin H2 openings and citability blocks).

## Original scope

1. **Snippets + answer-first** (7 MDX): porto-alojamento-local-rules, rnal-registration-portugal, property-management-portugal-cost, buy-property-portugal-foreigner, how-to-buy-property-portugal-step-by-step, nif-portugal-property-purchase, power-of-attorney-property-portugal. Use GSC MCP `user-search-console-portuguese-estate`, 28 days query+page. No em-dash in new prose.

2. **CRO 5 URLs**: imt guide, step-by-step, get-shortlist, uk-buyers, us-buyers. Mobile form/WhatsApp visibility, IMT 7.5% + 0.8% stamp callout table.

3. **Implement GA4** per `docs/analytics-leads.md`.

4. **GEO citability** on top 10 money pages (audit script), target ≥4.0 where quick.

5. validate + qa:corpus + build + production commit + push + explicit indexing.

## Wikidata

Add Q-id to `sameAs` in `BaseLayout.astro` only if Maksim provides Q-id.
