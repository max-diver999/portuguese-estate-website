# GEO diagnostic — portuguese-estate.com, 27 August 2026

Honest scorer ported from `max-diver999/capetown-invest-website@90dc5e1`, adapted,
calibrated against labelled sets rebuilt from this repository's own history, and
run over all 141 MDX pages at `origin/main` (`666aa95`).

Method and every rejected hypothesis: `docs/GEO-SCORING.md`.

## The one-line finding

The corpus is not badly written. It is **the same article written many times with
the nouns swapped**, and the previous cleanup did not touch that.

Two measurements carry the whole report:

1. The reward components are **flat across the corpus**. Worst 18 pages against
   best 18 pages: openers 15.4 vs 16.2, evidence 13.3 vs 12.3, structure 12.4 vs
   13.3, rhythm 7.1 vs 6.7. Every page is written to the same standard. The
   entire spread in score is penalties.
2. **80% of all penalty mass is duplication and templating**: template-family
   37.2%, duplicated-volume 22.4%, duplicated-text 20.1%.

## Step 4 — the scoring currently shipping on this site

Both rubrics, same labelled sets, same files.

| | bad | good | mid | separation |
|---|---|---|---|---|
| old rubric (`geo-citability-scorer.mjs`) | 65.9 | 89.9 | 63.4 | 24.0 |
| honest scorer | 0.0 | 59.1 | 0.0 | **59.1** |

The old rubric's 24-point separation is not evidence that it works. The 15 pages
in `good` are Waves 1 and 2, which were **written against that rubric** to reach
90+: question-form H2s, 50–60 word openers containing a stat, a table in every
section, two paragraphs of 130–170 words. It is measuring compliance with itself.

The honest scorer scores those same 15 articles at 52–65, and scores the 26 area
pages — which the old rubric also passed — at exactly 0.

## Step 5 — calibration

Required: garbage `max ≤ 25`, hand-composed `min ≥ 55`, separation `≥ 35`.

| set | n | mean | min | max |
|---|---|---|---|---|
| bad — 15 area pages at `932f3af` | 15 | 0.0 | 0 | **0** ✅ |
| mid — the same 15 at HEAD | 15 | 0.0 | 0 | 0 |
| good — 15 hand-composed guides | 15 | 59.1 | **52** ❌ | 65 |

Separation **59.1** ✅. Garbage at or above the worst hand-composed file: **0 of 15**.

**Status: FAILING on one criterion, deliberately left failing.** `good.min` is 52
against a required 55. The three articles at 52 are all Wave 1, each held down by
the openers component, which `docs/GEO-SCORING.md` shows does not separate on this
corpus (machine 16.5, hand-composed 13.7 — backwards). A guard for that component
was implemented, A/B-measured on three sets, and **not shipped** because it gained
the hand-composed set 0.1 points and left the machine corpus ahead.

The blocker is stated in full at the end of this report.

### `bad` and `mid` are the same fifteen articles, before and after the cleanup

Both score **0.0**. The August remediation — de-forking, brand unification, jargon
removal, injected citability blocks, extended answer-first openers — moved those
pages by nothing. The work was real; it was aimed at the wrong thing.

## Step 6 — the corpus

**n = 141, mean 19.2 / 75, min 0, max 53, and 45 pages score exactly zero.**

| collection | n | mean | min | max | zeros |
|---|---|---|---|---|---|
| projects | 7 | 48.3 | 46 | 53 | 0 |
| guides | 78 | 26.4 | 0 | 53 | 3 |
| developers | 3 | 24.7 | 0 | 53 | 1 |
| compare | 14 | 10.1 | 0 | 42 | 8 |
| segments | 13 | 6.8 | 0 | 29 | 7 |
| **areas** | **26** | **0.0** | 0 | **0** | **26** |

Every area page on the site scores zero. `projects`, the collection de-templated
by hand in an earlier wave, is the best — which is the same result read from the
other end.

### Worst 15

| page | score | base | penalties | top three |
|---|---|---|---|---|
| areas/lagos-property-investment | 0 | 54 | 703 | template-family 333, duplicated-text 176, duplicated-volume 169 |
| areas/vila-nova-de-gaia-property-investment | 0 | 58 | 695 | template-family 339, duplicated-volume 187, duplicated-text 118 |
| areas/matosinhos-property-investment | 0 | 56 | 692 | template-family 348, duplicated-volume 184, duplicated-text 127 |
| areas/albufeira-property-investment | 0 | 55 | 673 | template-family 336, duplicated-volume 160, duplicated-text 151 |
| segments/uk-buyers-portugal-property-brexit | 0 | 63 | 608 | template-family 231, duplicated-volume 188, duplicated-text 164 |
| areas/braga-property-investment | 0 | 57 | 580 | template-family 324, duplicated-volume 121, duplicated-text 81 |
| segments/american-buyers-portugal-property | 0 | 63 | 569 | template-family 222, duplicated-volume 183, duplicated-text 140 |
| areas/cascais-property-investment | 0 | 56 | 564 | template-family 264, duplicated-volume 146, duplicated-text 119 |
| areas/tavira-property-investment | 0 | 53 | 548 | template-family 300, duplicated-volume 120, duplicated-text 100 |
| areas/oeiras-property-investment | 0 | 57 | 541 | template-family 312, duplicated-volume 113, duplicated-text 85 |
| areas/portimao-property-investment | 0 | 57 | 541 | template-family 252, duplicated-volume 138, duplicated-text 127 |
| areas/nazare-property-investment | 0 | 56 | 530 | template-family 216, duplicated-volume 163, duplicated-text 119 |
| areas/vilamoura-property-investment | 0 | 53 | 513 | template-family 222, duplicated-volume 132, duplicated-text 125 |
| segments/french-buyers-portugal-property | 0 | 61 | 480 | duplicated-text 155, template-family 150, duplicated-volume 148 |
| areas/faro-property-investment | 0 | 57 | 475 | template-family 252, duplicated-volume 107, duplicated-text 90 |

Note the `base` column: 53–63 everywhere. These pages are written to the same
standard as the best pages on the site. They score zero because a penalty total
of 475–703 buries a base of 55.

## Cannibals

`npm run geo:cannibals` — 201 pairs share 60 or more nine-word sequences.

| share of the smaller page | shared | pair |
|---|---|---|
| **47%** | 2131 / 4522 | segments/american-buyers × segments/uk-buyers-brexit |
| 42% | 1592 / 3816 | segments/french-buyers × segments/german-buyers |
| 40% | 1550 / 3829 | areas/albufeira × areas/lagos |
| 35% | 1359 / 3829 | areas/lagos × areas/portimao |
| 32% | 1342 / 4211 | areas/albufeira × areas/portimao |
| 31% | 1719 / 5630 | areas/matosinhos × areas/vila-nova-de-gaia |
| 29% | 1383 / 4726 | compare/portugal-vs-italy × compare/portugal-vs-spain |
| 29% | 1100 / 3829 | areas/lagos × areas/tavira |
| 28% | 1083 / 3816 | segments/french-buyers × segments/uk-buyers-brexit |
| 26% | 1111 / 4205 | areas/cascais × areas/vilamoura |

The worst pair is the sister site's failure repeated exactly: Portugal applies the
same property rules whatever passport the buyer holds, so a page about "what an
American buyer faces" has nothing American in it unless it covers what the
**buyer's own country** does to them. Without that, it can only restate the
national mechanics, which is what the UK page also does.

## Content defects found on the way

Not scoring artefacts — these are wrong on the page.

1. **One worked example, identical euro amounts, stamped onto 22 towns.**
   "At the 5.0% mid-point of the local gross range the unit lets for about €1,462
   a month, €17,550 a year", followed by "Deducting IMI of €983, condominium
   charges of €1,200, management at 10% (€1,755) and a maintenance reserve of
   €1,053 leaves €12,559 net, or 3.2% cash-on-cash". Same numbers on 22 different
   area pages, so the arithmetic is right for at most one of them. Introduced by
   `ece70b6`, "add worked cash-to-close blocks to 19 area guides".
2. **The noun-swap template in the open.** "The following conservative scenario
   illustrates how national tax reform and *‹PLACE›* yields interact over a medium
   hold" — 21 pages, place name substituted.
3. **`compare/portugal-vs-turkey-property-investment.mdx` writes `EUR500,000`
   instead of `€500,000`, 28 times.** Every other page uses the sign. This is not
   cosmetic: the figure detector matches `€`, `£` and `$` and does not match a
   `EUR` prefix, so all 28 money figures on that page are invisible to saturation
   detection and to provenance. The page is scored as though it quoted no money
   at all.

   *Correction.* An earlier pass of this report claimed 59 leftover South African
   rand amounts. That was wrong — a false positive from a `R[0-9]` search matching
   the R in `EUR500,000`. Checked with a negative lookbehind, the corpus contains
   **no rand at all**. The finding above is what was actually there.

## Registries

- `.content-os/facts.json` — 18 entries, each with a named primary source
  (DL 97/2026, CIMI, CIS, CIRS, Lei 82/2023, INE 2025). Coverage **5.6%** of the
  284 load-bearing figures, deliberately: the ratios the corpus leans on hardest —
  10%, 5%, 30%, 3% — are **not** registered, because each means several different
  things across the corpus. Those pages need rewriting so the figure carries its
  meaning; a registry entry would hand unrelated pages a provenance they have not
  earned. The gate arms at 80% coverage.
- `.content-os/external-claims.json` — 12 claims about GB, US, DE, CA, ES, IT, GR,
  each with `reviewBy` 2027-02-27. This matters more here than on the sister site:
  `segments` and `compare` are 27 of 141 pages and exist entirely to describe
  jurisdictions nobody on this project monitors.
- `npm run facts:review` — passes, nothing overdue.

## The blocker, stated plainly

**This repository contains no human-written text.** Its entire history is agent
output: the June waves generated in bulk in a single day, Waves 1 and 2 composed
sentence by sentence in-session but against the old rubric's formula.

So the `good` label means *hand-composed*, not *hand-written*, and `good.min 52`
admits two readings that the available evidence cannot separate:

- three Wave 1 articles are genuinely the weakest of the set and should be
  rewritten; or
- formula-composed prose tops out near 52–65 on this scorer, and the floor is
  measuring the method rather than three articles.

Resolving it needs a genuinely hand-written reference, and inventing one would be
the same error as inventing a figure. The playbook's instruction at this point is
to stop and ask, so that is what happens here. The scorer is otherwise sound on
this corpus: garbage max 0, separation 59.1, and 0 of 15 garbage files reach the
worst hand-composed article.
