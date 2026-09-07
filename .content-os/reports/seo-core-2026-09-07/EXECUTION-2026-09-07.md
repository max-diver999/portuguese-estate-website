# Portuguese Estate: execution report against the demand audit

Audit date: 2026-09-07. Execution date: 2026-09-07. Branch `cc/portugal-wave1-relocation-20260907`, PR #6.
This document records what was actually built against the plan in `README.md`, where it deviated, and why.

---

## 1. Summary

The audit found a site aimed at frames with no traffic. `{city} property investment` returned no data
rows for all 26 area pages in the US Semrush database, and `{nationality} buyers portugal property`
returned zero rows across all 13 variants in both US and UK. The whole investment cluster was 510
searches a month against a 155,540 market.

Four waves rebuilt the site around the demand that exists: relocation and visas on advisory SERPs,
and a commercial spine at `/property-for-sale/` where portals hold 5 to 7 of the top 10 and the honest
ceiling is positions 6 to 10 plus an AI Overview citation.

| | Before | After |
|---|---:|---:|
| MDX pages | 141 | 113 |
| Collections | 7 | 6 |
| Sitemap URLs | 159 | 132 |
| 301 redirects in `vercel.json` | 1 | 135 |
| Total corpus words | not measured | 369,420 |
| Median page length | not measured | 2,762 |
| Pages under their collection minimum | 154 of 272 (audit finding) | 0 |

Collections retired entirely: `segments` (wave 1), `areas` (wave 3).
Collections created: `move-to-portugal` (11 pages), `property-for-sale` (23 pages).

---

## 2. What was executed, wave by wave

### Wave 1: relocation and visas

Ten pages created at `/move-to-portugal/`: golden-visa, d7-visa, d8-digital-nomad-visa, from-usa,
from-uk, cost-of-living, retire-in-portugal, best-places-to-live, international-schools,
by-nationality. Plus `guides/portugal-house-prices`.

Two merges and four pillars, decided per pair rather than globally. The page held back from merging
was `portugal-golden-visa-real-estate-ended`: 22 inbound links and position 2 on an AI-retrieval
query, which on this site is the channel that works.

### Wave 2: process, tax and money

Fifteen merges, one rework. The plan's merge direction was wrong in **6 of 11 pairs** when checked
against GSC: it would have merged a page at position 6.2 into one at position 73.8, and a page with
2 clicks at 13.3 into one with 1 click at 27.4. Every arrow was re-derived from impressions,
position and inbound links before any redirect was written.

### Wave 3: the commercial spine

Twenty-three pages at `/property-for-sale/`: the hub, seven regions, four property types, two price
and feature cuts, and nine towns. The `areas` collection was emptied and removed from
`content.config.ts`, `qa-audit.mjs`, `generate-llms.mjs`, `geo-citability-audit.mjs`,
`audit-rendered-live.mjs`, `site.config.json`, the header and footer nav, the 404 routes, the
WhatsApp context and the homepage.

Five planned town pages were **not** written, against the plan. Combined demand 1,390 a month across
portal-locked SERPs, and four of the five were already covered as sections inside pages written the
same week. Olhao, the only genuinely uncovered one at 280 a month, became a section inside
`property-for-sale/faro` instead of a thin standalone page.

### Wave 4: choice and agency

Nine `compare/portugal-vs-*` pages, 37,000 words between them, produced **1 click and 119
impressions in three months**, every impression anonymised, plus 3 on Bing. Their target terms have
no measured volume. They were merged into one page built on the demand that does exist:
`golden visa spain vs portugal` 140, `greece vs portugal golden visa` 90, `d7 visa vs golden visa`
90, on an SERP held by advisory sites rather than portals.

`porto-vs-lisbon` was **not** reworked, against the plan. Its 3,200 a month target term is a travel
query: 8 of the top 10 results are travel blogs and Reddit asking which city to visit, with zero
property results in either the US or UK SERP. Chasing it would mean publishing a travel article on a
property site.

`/guides/portugal-estate-agents/` was created at 620 a month, with its ceiling stated honestly: all
ten results on the head terms are agencies or portal directories, so it targets the advisory tail.

---

## 3. Corrections made during execution

### The five-year citizenship rule had ended

Writing the citizenship page surfaced that the corpus stated the five-year naturalisation rule as
settled fact in **ten places**. **Lei Organica n.o 1/2026**, published 18 May 2026 and in force from
19 May, requires **seven years** of legal residence for EU and CPLP nationals and **ten years** for
everyone else, counted from the date the permit is issued rather than applied for. Only nationality
applications already filed on 19 May 2026 keep the old terms.

One timeline table said 7 to 8 years total and now says 13 to 14, because AIMA's 18 to 24 month wait
moved from inside the clock to in front of it. No qa gate catches a fact that is merely out of date.

### The em dash sweep

530 em dashes across 85 files, all legacy. Removed by category rather than by blind replace: 76
machine-built alt texts rewritten, 30 titles to colons, 21 paired parentheticals to brackets or
commas, 20 table cells to `n/a`, 242 single dashes to commas, 77 to colons or semicolons. Then
reread for the two failure modes a sweep creates: four comma splices and twelve places where the
mechanical comma read worse than parentheses.

`EM_DASH_LIMIT` in `lib/human-signals.mjs` allowed 8 per 500 words per collection. It is now 0
everywhere, so `qa:corpus` fails on the first one back.

### Five registration points, not three

A new collection needs registering in more places than the three previously known. Found during this
work: `fix-batch-queue.mjs` still listed the retired `areas` and had never heard of the two new
collections, so 32 pages were invisible to it; and `reference-infra.config.json` listed both `areas`
and `segments`, failing `aeo:verify`. The `llms.txt` key-page list also pointed at two pages merged
away months ago.

---

## 4. Content standard

Every page in `guides`, `move-to-portugal` and `property-for-sale` is at or above **2,500 body
words**. Thirty pages were expanded to reach it, adding roughly 15,000 words, each addition specific
to its own page rather than restated advice. No paragraph appears on more than two pages.

| Collection | Pages | Words | Average |
|---|---:|---:|---:|
| guides | 63 | 242,197 | 3,844 |
| property-for-sale | 23 | 65,753 | 2,858 |
| move-to-portugal | 11 | 32,474 | 2,952 |
| compare | 6 | 27,089 | 4,514 |
| developers | 3 | 10,930 | 3,643 |
| projects | 7 | 8,668 | 1,238 |
| **Total** | **113** | **387,111** | **3,426** |

---

## 5. Gate status

| Gate | Result |
|---|---|
| `npm run build` | exit 0 |
| `qa-audit.mjs` | 0 issues across 113 pages |
| `qa-duplicate-prose.mjs` | pass, no paragraph over the 2-page limit |
| `qa:corpus` | pass: em dash, padding dupes, fix-queue, MDX patterns |
| `images:verify` | 77/77 uploads, dimensions, delivery and attribution |
| `audit:images` | 0 broken, all URLs HTTP 200 |
| `audit:images:rendered` | no photograph on more than one content page |
| `aeo:verify` | pass, 113 files, 0 errors |
| `speed:verify` | pass |
| GEO citability | 69/100 average, 41 pages at 70+, 9 below 60; see section 7 |
| Rendered HTML (live) | 92 notices, all the interim wa.me number; P0 and P1 both 0 |

---

## 6. Measurement baseline

Recorded so the next check has a starting point. Window 2026-06-08 to 2026-09-04, before any of this
work is deployed.

| Source | Metric | Value |
|---|---|---:|
| GSC | impressions, 89 days | 8,008 |
| GSC | clicks, 89 days | 48 |
| GSC | CTR | 0.60% |
| GSC | first 28 days | 3,293 impressions, 15 clicks |
| GSC | last 28 days | 2,725 impressions, 16 clicks |
| Bing | impressions | 660 |
| Bing | clicks | 21 |

Top GSC pages in the window: `imt-tax-non-resident-portugal-2026` (932 impressions, 10 clicks, pos
25.8), `portugal-property-under-300000-euros` (354, 10, pos 8.4), `projects/six-senses-comporta`
(176, 6, pos 9.1).

Several retired URLs still carried impressions when the baseline was taken:
`/areas/madeira-property-investment-guide/` 217, `/areas/cascais-property-investment/` 118,
`/guides/property-maintenance-costs-portugal/` 290. Their 301s are in place; expect the impressions
to move to the destination pages over the following weeks rather than disappear.

What to check at the next measurement, in order: whether impressions on the `/property-for-sale/`
and `/move-to-portugal/` trees rise as the redirects settle; whether any page enters the top 10 on a
relocation term; and whether Bing, which historically shows this site's AI-retrieval queries
unanonymised, picks up the citizenship and golden visa comparison pages.

---

## 6b. Citability pass

The GEO rubric scores every H2 block on how quotable its opening paragraph is. The house style
opened sections with a 15 to 30 word lead-in before a table, which scores 10 to 55 on answer
quality. Every section on all 86 failing pages was rewritten to open with 40 to 60 words that state
the answer, carry a real figure where one exists, and do not begin with a pronoun.

| | Before | After |
|---|---:|---:|
| Average commercial score | 64 | 69 |
| Answer quality | 67 | 79 |
| Self-containment | 62 | 68 |
| Statistical density | 66 | 70 |
| Pages at 70 or above | 24 | 41 |
| Pages below 60 | 41 | 9 |

Largest individual moves: golden-visa 58 to 80, moderate-rent-tax-incentives 59 to 71,
imi-property-tax 59 to 71, aimi-wealth-tax 64 to 71, porto-alojamento-local 61 to 72,
citizenship-by-investment 59 to 70, escritura 60 to 70, d7-visa 53 to 68, cost-of-living 47 to 67.

Three structural problems surfaced during the pass and are fixed.

**Twelve pages put an H2 straight into an H3**, 51 sections in total, so a reader landing there met
a stack of headings and no orientation. Each now opens with the figures: the 0.3% to 0.45% IMI band,
the EUR 5.00 and EUR 7.50 rent caps, the 4% interest and 20% penalty on a broken 8-year commitment.

**An unverifiable client claim.** The moderate-rent page stated that "several Portuguese Estate
clients from the UK have successfully recovered full IMT". That is the class of assertion purged
corpus-wide in PR 41. The sentence now describes the pathway without asserting the outcome.

**A page contradicting itself on DL 97/2026**, describing an IMT surcharge above EUR 550,000 in one
section and the flat 7.5% in another. The flat rate is correct from 1 September 2026.

**Three paragraphs running verbatim across all four surviving compare pages.** They passed
qa-duplicate-prose because the sentences diverge after the opening clause, which is how templated
writing hides from a paragraph-level check. Each page now opens those sections on its own terms. No
opening paragraph now repeats across three or more pages anywhere in the corpus.

Two helper scripts were added: `geo-inspect.mjs` for the per-section score breakdown and
`geo-thin.mjs` for the exact text of every opener under 40 words. The audit's COMMERCIAL set now
includes move-to-portugal and property-for-sale, which had been unscored entirely.

---

## 7. The honest block

**GEO citability was addressed and is now partly capped by content rather than by effort.** All
86 pages below the bar were rewritten. The average moved from 64 to 69, answer quality from 67 to
79, and the number of pages at 70 or above from 24 to 41. Nine pages remain below 60.

Those nine are all place pages: central-and-northern-portugal, rural-and-land, alvor,
coastal-sea-view, lagos, best-places-to-live, by-nationality, azores, ericeira. Their answer quality
now sits at 72 to 82, so the openers are fixed. What holds them down is statistical density at 21 to
31, because their sections describe wind, ferries, granite, steps and levadas. The rubric rewards
percentages, euro figures and durations, and those sections have none that are true. The relative
price tables on the town pages are deliberately qualitative, "above 100" rather than a fabricated
index, because verified parish-level series do not exist for them. Converting those bands into
invented percentages would lift the score and reintroduce exactly the defect purged in PR 41.

Uniqueness sits at 37 and was left there on purpose. The scorer's own source comment warns that
pasting "insider tip" games that proxy with no reader value, so the work went into answer quality,
self-containment and real figures instead.

**The commercial ceiling has not moved.** The for-sale SERPs are still held by idealista, Kyero,
Rightmove and the agencies. Nothing in this work changes that, and the realistic outcome on those
terms remains positions 6 to 10 plus AI Overview citations, which is why the relocation cluster
carries the traffic case and the commercial spine carries the conversion case.

**Nothing is deployed.** All of this sits on a branch. Every number in section 6 describes the site
as it was, not as it now is, and the first meaningful read on whether the work paid is 4 to 8 weeks
after merge and indexing.

**Five town pages and the porto-vs-lisbon rework were dropped deliberately.** Both decisions are
argued above from SERP and volume data. If the reasoning is wrong, those are the two places to
reverse first.

**One interim item is unresolved and shows on 92 pages.** The WhatsApp number is still a Thailand
(+66) number inherited from another MORE Group site. It is not displayed to visitors, and the audit
reports it as a notice rather than a defect, but it should be replaced with a +351 number.
