# Restore + cadence report, 2026-09-23

Branch `cc/portugal-restore-and-cadence-20260923` (base origin/main 05b6c79). Content OS submodule a93aa22.

Commits:
- `42c81b3` Part 1: undo 20 Sep text rollback, keep R2 images
- `fffdcba` Part 2: clean AI cadence on 26 flagged pages

## Frozen files (byte-identical to origin/main, verified)

- `src/content/guides/portugal-property-under-300000-euros.mdx`
- `src/content/segments/australian-buyers-portugal-property.mdx`

`australian-buyers-portugal-property.mdx` is on the returned-65 list but was **not deleted** because it is frozen. Vercel already 301s its URL to `/move-to-portugal/by-nationality/`, so the file has no live effect.

## Part 1: restore text, keep R2 images

- 113 files in modified-113 minus 1 frozen = 112 files:
  - **75 restored**: e437751 text with the origin/main `heroImage` R2 URL. The task file said 74. 91fa288 modified 76 existing MDX files, one of them frozen, so 75 non-frozen files differ in text from e437751 after the heroImage swap.
  - **37 image-only**: result is byte-identical to origin/main.
- In every file, the only image reference was `heroImage`: e437751 had exactly 113 Cloudinary URLs, one per file, and no inline images. `heroImageAlt` / `heroImageCredit` are text, so they came back from e437751. The stale versions had suffixed alts with em dashes, like "Golfplatz Portugal — Lagos versus Vilamoura", and en dashes inside the Kolforn credit.
- No frontmatter field was added after e437751 by non-content commits. The content schema did not change, so nothing had to be carried over.
- **Deleted 64 of the returned-65 files** (all except the frozen one). All 65 URLs have a 301 in `vercel.json`, verified per slug. No redirect needed adding.
- **Also restored `scripts/qa-audit.mjs`**: the same stale-copy commit 91fa288 rolled it back. That changed COLLECTIONS to areas/segments, dropped move-to-portugal/property-for-sale and put em dashes in comments. It is back to e437751 plus the one functional change from 91fa288, the R2 host in `ALLOWED_IMAGE_HOST`. The other two scripts touched by 91fa288 (`verify-portugal-cloudinary.mjs`, `verify-rendered-speed.mjs`) contain real R2 additions and were kept.

### Part 1 verification

| Check | Result |
|---|---|
| `res.cloudinary.com` in src/content | **0** |
| R2 URLs: origin/main 178 unique, now 114 | 0 added; 64 removed, each used only by a deleted file (list below) |
| Restored files: text (ignoring `heroImage:`) == e437751, `heroImage` == origin/main | **112/112** |
| `git diff origin/main` on kept files touches a heroImage line | **0** (all 64 `heroImage` diff lines are deletions of removed files) |
| Files with em/en dash: e437751 / origin/main / now | 0 / 141 / **2** (the 2 frozen files) |
| Links to deleted slugs from non-frozen content | 0 |

R2 URLs dropped (only used by deleted files), base `https://pub-2855c73eea384110b510f25966292c37.r2.dev/`:
- more-group/portugal/areas/albufeira-property-investment/hero.webp
- more-group/portugal/areas/alcantara-property-investment/hero.webp
- more-group/portugal/areas/aveiro-property-investment/hero.webp
- more-group/portugal/areas/braga-property-investment/hero.webp
- more-group/portugal/areas/caldas-da-rainha-property-investment/hero.webp
- more-group/portugal/areas/cascais-property-investment/hero.webp
- more-group/portugal/areas/chiado-principe-real-property/hero.webp
- more-group/portugal/areas/coimbra-property-investment/hero.webp
- more-group/portugal/areas/comporta-property-investment/hero.webp
- more-group/portugal/areas/ericeira-property-investment/hero.webp
- more-group/portugal/areas/faro-property-investment/hero.webp
- more-group/portugal/areas/lagos-property-investment/hero.webp
- more-group/portugal/areas/lourinha-property-investment/hero.webp
- more-group/portugal/areas/madeira-property-investment-guide/hero.webp
- more-group/portugal/areas/marvila-property-investment/hero.webp
- more-group/portugal/areas/matosinhos-property-investment/hero.webp
- more-group/portugal/areas/nazare-property-investment/hero.webp
- more-group/portugal/areas/obidos-property-investment/hero.webp
- more-group/portugal/areas/oeiras-property-investment/hero.webp
- more-group/portugal/areas/parque-das-nacoes-property/hero.webp
- more-group/portugal/areas/portimao-property-investment/hero.webp
- more-group/portugal/areas/setubal-peninsula-property-investment/hero.webp
- more-group/portugal/areas/sintra-property-investment/hero.webp
- more-group/portugal/areas/tavira-property-investment/hero.webp
- more-group/portugal/areas/vila-nova-de-gaia-property-investment/hero.webp
- more-group/portugal/areas/vilamoura-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-cyprus-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-dubai-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-france-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-greece-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-italy-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-malta-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-spain-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-turkey-property-investment/hero.webp
- more-group/portugal/compare/portugal-vs-uk-property-investment/hero.webp
- more-group/portugal/guides/al-license-transfer-portugal-sale/hero.webp
- more-group/portugal/guides/best-portugal-property-under-4000-euro-m2/hero.webp
- more-group/portugal/guides/buy-property-portugal-foreigner/hero.webp
- more-group/portugal/guides/cost-of-selling-property-portugal/hero.webp
- more-group/portugal/guides/gross-vs-net-yield-portugal/hero.webp
- more-group/portugal/guides/hidden-costs-buying-property-portugal/hero.webp
- more-group/portugal/guides/highest-rental-yield-areas-portugal/hero.webp
- more-group/portugal/guides/how-to-calculate-rental-yield-portugal/hero.webp
- more-group/portugal/guides/is-portugal-property-good-investment-2026/hero.webp
- more-group/portugal/guides/mais-valias-portugal-capital-gains/hero.webp
- more-group/portugal/guides/mortgage-broker-vs-bank-portugal/hero.webp
- more-group/portugal/guides/non-resident-mortgage-portugal/hero.webp
- more-group/portugal/guides/portugal-buy-to-let-investment-guide/hero.webp
- more-group/portugal/guides/portugal-golden-visa-vs-property-purchase/hero.webp
- more-group/portugal/guides/portugal-property-deposit-guide-cpcv/hero.webp
- more-group/portugal/guides/property-maintenance-costs-portugal/hero.webp
- more-group/portugal/guides/renovation-costs-portugal-per-m2/hero.webp
- more-group/portugal/segments/american-buyers-portugal-property/hero.webp
- more-group/portugal/segments/angolan-buyers-portugal/hero.webp
- more-group/portugal/segments/brazilian-buyers-portugal-property/hero.webp
- more-group/portugal/segments/canadian-buyers-portugal-property/hero.webp
- more-group/portugal/segments/chinese-buyers-portugal-property/hero.webp
- more-group/portugal/segments/french-buyers-portugal-property/hero.webp
- more-group/portugal/segments/german-buyers-portugal-property/hero.webp
- more-group/portugal/segments/indian-buyers-portugal-property/hero.webp
- more-group/portugal/segments/israeli-buyers-portugal-property/hero.webp
- more-group/portugal/segments/south-african-buyers-portugal-property/hero.webp
- more-group/portugal/segments/uae-buyers-portugal-property/hero.webp
- more-group/portugal/segments/uk-buyers-portugal-property-brexit/hero.webp

## Part 2: AI cadence cleanup

`node scripts/cadence-check.mjs --all` output is saved to `cadence-before-2026-09-23.txt` and `cadence-after-2026-09-23.txt`.

| | Checked | Flagged pages | Hard |
|---|---|---|---|
| Before | 114 | 26 | 0 |
| After | 114 | **0** | **0** |

26 of 26 flagged pages are clean (target was 80%). None of the frozen files were flagged.

What was rewritten: only sentences carrying a marker. That means "X, not Y" antitheses, with 1 to 2 kept per page where the contrast is the point; short metronome paragraph endings, fixed by joining to or extending the previous sentence; parallel sentence starts; colon hooks; and superlative openers. Pages where the only marker sat in the protected first paragraph or Quick Answer kept it there. `updatedDate: 2026-09-23` is set on all 26 pages.

Per-file changed lines (Part 2):
- `src/content/compare/algarve-vs-lisbon-property-investment.mdx`: 11 lines
- `src/content/compare/lagos-vs-vilamoura-investment.mdx`: 7 lines
- `src/content/compare/lisbon-vs-cascais-property.mdx`: 10 lines
- `src/content/compare/new-build-vs-resale-property-portugal.mdx`: 17 lines
- `src/content/developers/farinvest-properties-portugal.mdx`: 14 lines
- `src/content/developers/vanguard-properties-portugal.mdx`: 10 lines
- `src/content/developers/vic-properties-portugal.mdx`: 19 lines
- `src/content/guides/complete-before-september-2026-imt-guide.mdx`: 11 lines
- `src/content/guides/cpcv-promissory-contract-portugal.mdx`: 14 lines
- `src/content/guides/porto-alojamento-local-rules.mdx`: 11 lines
- `src/content/guides/porto-property-investment-guide.mdx`: 12 lines
- `src/content/guides/portugal-capital-gains-tax-property.mdx`: 14 lines
- `src/content/guides/portugal-d7-visa-property.mdx`: 8 lines
- `src/content/guides/portugal-property-1-million-plus-investment.mdx`: 13 lines
- `src/content/guides/portugal-property-inheritance-tax-foreigners.mdx`: 6 lines
- `src/content/guides/portugal-property-under-500000-euros.mdx`: 12 lines
- `src/content/guides/sell-property-portugal-non-resident.mdx`: 8 lines
- `src/content/move-to-portugal/cost-of-living.mdx`: 5 lines
- `src/content/move-to-portugal/d7-visa.mdx`: 6 lines
- `src/content/move-to-portugal/from-usa.mdx`: 15 lines
- `src/content/move-to-portugal/retire-in-portugal.mdx`: 5 lines
- `src/content/projects/tomas-ribeiro-79.mdx`: 3 lines
- `src/content/property-for-sale/albufeira.mdx`: 4 lines
- `src/content/property-for-sale/cascais.mdx`: 7 lines
- `src/content/property-for-sale/cheap-property.mdx`: 4 lines
- `src/content/property-for-sale/lisbon.mdx`: 5 lines

### Part 2 verification (all against 42c81b3, the Part 1 commit)

Script `check2` per file: frontmatter identical except `updatedDate`; number tokens multiset identical; `](...)` and `href` target multiset identical; headings identical; table rows identical; MDX component/import lines identical; every Quick answer / Short answer / Strongest fit / Быстрый ответ / TldrBlock line identical; first body paragraph identical; no dash; no paragraph merge/split (line count identical).

- **26/26 OK**.
- Quick answer check: the HARD RULE grep on `42c81b3..HEAD` shows **0 lines**. Against origin/main it shows only Part 1 restores: all 44 added lines matching the pattern (case-insensitive, so "Quick Answer:" is included) are **verbatim lines from the e437751 version of the same file**. The removed lines come from deleted files and replaced stale text.
- Fresh-context review (subagent, 10 pages: algarve-vs-lisbon, new-build-vs-resale, farinvest, vic, complete-before-september-2026-imt, cpcv, capital-gains, 1-million-plus, inheritance-tax, from-usa). It found 13 concrete issues (4 meaning shifts, e.g. "the CPCV date is irrelevant" was too absolute, a dropped "your lawyer", and an over-broad "Portugal becomes the main taxing state"; plus clumsy wording) and a repeated ", because" join formula. **All 13 were fixed**, and the ", because" joins in vic and complete-before-september were broken back up. I also fixed one meaning drift of my own in under-500000 ("Norte" vs Porto centre) and one unsupported wind claim in cascais. The checks were re-run after these fixes.

## Gates

| # | Check | Result |
|---|---|---|
| 1 | cadence-check --all | 26 → 0 flagged, 0 hard |
| 2 | Number integrity, Part 2 | 26/26 identical multisets |
| 3 | Link integrity, Part 2 | 26/26 identical multisets |
| 4 | Quick answer lines in Part 2 | 0 |
| 5 | `npm run validate:content` | **FAILS on 1 file only: the frozen `portugal-property-under-300000-euros`** (7 body links + 3 relatedSlugs to deleted guides, all 301 live). 112/113 clean. `qa-duplicate-prose` PASS. `validate:batch`: new 0, changed 75, clean |
| 6 | batch-fact-check / content-preflight | Neither script supports `--base`, so both were run with `--slug` over all 83 changed slugs. Errors are **identical to origin/main** (preflight 83 = 23 "MDX not found" for collections outside its scope + 60 "missing SERP brief", a new-article gate) and **identical to e437751** (fact-check: 15 "internal links < 8" + 11 "MDX not found"). 0 new errors from this branch |
| 7 | `npm run build` | PASS (prebuild cadence + images:verify; postbuild rendered audit 0 errors, image uniqueness PASS, speed verify PASS, check-images) |
| 8 | No `—`, `–`, ` -- ` in src/content | Only the 2 frozen files (not touchable) |
| 9 | Frozen files byte-identical to origin/main | Yes |
| 10 | Fresh-context review | Done, all findings fixed |

## Open items for Hermes / Maxim

1. **Frozen pilot pages carry the stale 20 Sep text.** `portugal-property-under-300000-euros` has em/en dashes and links to 7 deleted guides, which causes the `validate:content` failure. `australian-buyers-portugal-property` has 1 em dash in the alt, links to 3 deleted pages, and exists as MDX while its URL 301s. Both need the e437751 restore once the cadence pilot ends.
2. The build regenerates `public/llms*.txt` and `src/data/page-lastmod.json`. They are not committed here, because Vercel regenerates them on deploy.
3. The 15 fact-check "internal links < 8" errors and the preflight "missing SERP brief" errors predate this branch.

## Not done (by instruction)

No merge, no deploy, no indexing submission. The reindex list is `reindex-urls-2026-09-23.txt`: 83 live URLs, made up of the 75 restored pages plus the 8 pages changed only by Part 2 (move-to-portugal ×4, property-for-sale ×4). Deleted URLs are excluded.
