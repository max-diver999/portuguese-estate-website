# Corpus Cleanup Roadmap — Portuguese Estate

**Date:** 2026-08-21 · **Corpus:** 126 MDX · **Baseline:** GEO 67/100 (C), 103 below min
**Target:** commercial GEO ≥ 75, files below min < 15, `validate:content` 126/126 held throughout
**Status:** proposal — nothing executes until Maxim says **«ок»**

---

## The one-line strategy

**Do not run a de-boilerplating wave.** Measured cross-document duplication is **1–6%** in guides, areas, segments and compare. The boilerplate hypothesis is true for exactly **7 files** (`projects`, 55% shared prose).

The real defect is that the corpus is written for humans and is **close to unquotable by machines**: only **45 of 1873 H2 blocks (2.4%)** qualify as citability blocks, and **94 of 126 files have none at all**.

One edit fixes that and the two heaviest rubric dimensions at the same time:

> **Rewrite thin H2 openers into 40–60 word, self-contained, stat-bearing paragraphs.**

That single move raises `answer` (30% weight), `self` (25%), and creates the citability blocks — **179 openers across 66 files** is the whole of Waves 1–2.

### Why uniqueness comes last

`scoreUniqueness()` does not compare documents. It regex-matches literal strings (`insider tip`, `our analysis`, `MORE Group`). Chasing `unique 36 → 80` is worth **+4.4 points** and would be achieved by pasting "Insider tip:" into every section — pure metric gaming, zero reader or crawler value. It also hardcodes `MORE Group`, a brand this site never uses.

`answer` + `self` are **55% of the weight** and reach ~77 on their own. `unique` then rises as a by-product of real proprietary framing.

| Action | Rubric move | Gain | Honest? |
|---|---|---|---|
| Answer-first openers | answer 68 → 85 | **+5.1** | ✅ |
| Self-containment | self 65 → 85 | **+5.0** | ✅ |
| Structure | structure 70 → 85 | +3.0 | ✅ |
| "insider tip" keyword | unique 36 → 80 | +4.4 | ❌ gaming |

---

## Prerequisite — Wave 0 (code, not corpus)

Waves 1–6 are **blocked** on these, because corpus work is wasted while every page has a truncated title and two H1s. Detail in `code-improvements-roadmap.md`.

| Fix | Effort |
|---|---|
| Drop the `\| Portuguese Estate` title suffix (134 titles over 60 chars) | 1 line |
| Fix the Thai WhatsApp number (`+66`, on 145/146 pages) | 1 line |
| Rewrite `/areas/` + `/compare/` hub titles/descriptions (Mexico/Spain copy) | 4 lines |
| Resolve the duplicate `<h1>` (126/126 pages) | 1 line + corpus sweep |

> The H1 fix is the one place a **mass MDX edit is the right tool**: demote the leading `# ` to `## ` in all 126 files. It is mechanical, scriptable, and reviewable as a single diff. **It still needs explicit «ок» — it is a 126-file change.**

---

## Waves

| Wave | Files | What | Expected GEO | Risk |
|---|---|---|---|---|
| **1** | **25** | Answer-first + citability — GSC pages & worst scores | 67 → ~71 | Low |
| **2** | **41** | Answer-first + citability — remaining thin openers | ~71 → ~75 | Low |
| **3** | **7** | De-template `projects` | ~75 → ~76 | Medium |
| **4** | **13** | Factual freshness — visa thresholds | no move | **High value** |
| **5** | **50** | Citability blocks where openers are already fine | ~76 → ~78 | Low |
| **6** | **5** | Link hygiene + orphans | no move | Low |

**Total touched: 116 of 126 files** (Waves 1+2+5 union), but **only 7 are rewrites**. The rest is paragraph-level surgery on section openers.

---

### Wave 1 — Answer-first, priority 25

**Selection:** every GSC-visible page, plus the worst-scoring commercial files. Highest revenue impact per edit.

**Method, per H2 block flagged `thin-h2-open`:**
1. Rewrite the opening paragraph to **40–60 words** (`ANSWER_FIRST_MIN/MAX`)
2. Open with a **noun phrase, never a pronoun** (`PRONOUN_START_RE` costs −20 on `self`)
3. Include **one hard statistic** (+15 `answer`, +15 `self`)
4. Use a **definition verb** — *is / are / costs / requires / ranges from* (+20 `answer`)
5. Never open with *"In this section…"* / *"Let's explore…"* (−25)
6. Where the section carries a worked example, extend to a **130–170 word citability block**

| File | Openers | Score | Cit |
|---|---|---|---|
| `guides/portugal-rental-yield-guide` | 6 | 56 | 0 |
| `guides/portugal-golden-visa-real-estate-ended` | 6 | 57 | 0 |
| `guides/hidden-costs-buying-property-portugal` | 6 | 59 | 1 |
| `guides/portugal-capital-gains-tax-property` | 6 | 60 | 0 |
| `guides/portugal-buy-to-let-investment-guide` | 5 | 55 | 0 |
| `guides/long-term-vs-holiday-rental-portugal` | 5 | 56 | 0 |
| `guides/aimi-wealth-tax-portugal-property` | 5 | 57 | 1 |
| `guides/can-foreigners-buy-property-portugal` | 5 | 58 | 0 |
| `guides/imt-refund-tax-resident-portugal` | 5 | 58 | 0 |
| `guides/moderate-rent-tax-incentives-portugal-2026` | 5 | 58 | 0 |
| `guides/how-to-buy-portugal-property-remotely` | 4 | 57 | 0 |
| `guides/imi-property-tax-portugal` | 4 | 59 | 0 |
| `guides/portugal-property-developers-guide-2026` | 3 | **50** | 0 |
| `developers/vic-properties-portugal` | 2 | **52** | 0 |
| `developers/vanguard-properties-portugal` | 1 | 56 | 0 |
| `compare/portugal-vs-malta-property-investment` | 1 | 58 | 0 |
| **GSC-visible — CTR critical** | | | |
| `guides/rnal-registration-portugal` | 2 | 63 | 0 |
| `guides/property-management-portugal-cost` | 3 | 73 | 0 |
| `guides/imt-tax-non-resident-portugal-2026` | 0 | 71 | 1 |
| `guides/portugal-property-under-300000-euros` | 1 | 75 | 1 |
| `areas/madeira-property-investment-guide` | 0 | 78 | 0 |
| `projects/six-senses-comporta` | 0 | 62 | 0 |
| `guides/escritura-notary-portugal-property` | 2 | 60 | 1 |
| `guides/power-of-attorney-property-portugal` | 2 | 60 | 0 |
| `guides/portugal-golden-visa-vs-property-purchase` | 2 | 60 | 2 |

> **`rnal-registration-portugal` is the single highest-leverage page on the site** — position **6.2** with **0.49% CTR**. It already ranks. Wave 0's title fix plus a step checklist and deadline callout should move it more than any new article could.

---

### Wave 2 — Answer-first, remaining 41

Same method, the other 41 files carrying `thin-h2-open`. Includes all 6 remaining `compare` files with flagged openers (`compare` is the weakest collection at **65**, 14/14 below 75), the rest of the tax cluster (`stamp-duty`, `nif`, `cost-of-buying`, `gross-vs-net-yield`), the AL/RNAL cluster (`alojamento-local-license`, `lisbon-al-containment`, `porto-al-rules`, `al-license-transfer`), and the visa guides.

Full list: the 66-file thin-opener set minus Wave 1's 25.

**Do not batch more than ~10 files per PR.** Run `validate:content --all` + `geo:audit` between batches.

---

### Wave 3 — De-template `projects` (7 files)

The only genuine boilerplate in the corpus.

- All **21 of 21** pairs exceed **69%** similarity (peak **78.7%**, `castilho-203` ~ `infinity`)
- **55%** of prose is shared; ~940 words each → **~420 unique words per review**
- 15 paragraphs appear **verbatim in all 7**: national-context, DL 67/2003 guarantee, IMT timing, verification checklist, the "insider tip", the disclaimer
- `stats` **58** and `self` **58** — worst of any collection

**Method:** keep one shared national-context block **in a component, not copy-pasted prose**, and rewrite each review around what is actually project-specific: unit mix, real price list, delivery status, developer track record, parish-level comps, the specific condominium/AL position.

**Target:** shared prose < 15%, ~1200 unique words each.

**Risk: medium** — this is real rewriting and `six-senses-comporta` is a GSC page (pos 9.1). Do that one **last**, and only after the other six validate clean.

---

### Wave 4 — Factual freshness (13 files) · **highest trust value, zero GEO movement**

Portugal's minimum wage rose to **€920/month on 1 Jan 2026** (externally verified). D7 tracks it; D8 is 4× → **€3,680/month**.

| Figure | Basis | Files |
|---|---|---|
| €3,040 | 4 × €760 (≈2023) | **10** |
| €3,480 | 4 × €870 (2025) | 2 |
| **€3,680** | **4 × €920 — correct** | **1** |
| €820 D7 | matches no year | 3 |

**€3,040 (stale by two years):** `guides/portugal-golden-visa-real-estate-ended`, `guides/portugal-digital-nomad-visa-property`, `guides/portugal-residency-options-without-golden-visa`, `guides/algarve-property-investment-guide`, `areas/parque-das-nacoes-property`, `areas/sintra-property-investment`, `areas/albufeira-property-investment`, `areas/ericeira-property-investment`, `areas/obidos-property-investment`, `areas/alcantara-property-investment`

**€820 D7:** `compare/portugal-vs-italy-property-investment`, `compare/portugal-vs-france-property-investment`, `guides/portugal-residency-options-without-golden-visa`

On a site whose entire pitch is *"independent, current, primary-source"*, a two-year-old statutory threshold is the most damaging error class in the corpus. **This wave can run independently of all others** and should arguably run first.

**Follow-up:** add a gate rule pinning minimum-wage-derived figures, so the January uplift is caught automatically next year.

---

### Wave 5 — Citability blocks (50 files)

Files with **zero** citability blocks whose openers are *already* long enough, so Waves 1–2 do not reach them.

| Collection | Files |
|---|---|
| areas | 21 |
| guides | 12 |
| segments | 9 |
| projects | 5 |
| compare | 2 |
| developers | 1 |

**Method:** add **one** 130–170 word block per page — a worked example with real numbers (an IMT calculation at that area's median price, a net-yield walk-through, a cost stack). One block per page moves the corpus from 45 to ~95 citability blocks and roughly doubles quotable surface for AI answers.

`areas` is the largest group here but is already the **strongest** collection (75 avg, 0 below 60) — so this is upside work, not repair. Sequence it last.

---

### Wave 6 — Link hygiene (5 files)

**Four 404s** — wrong collection prefix (targets exist):

| File | Broken | Correct |
|---|---|---|
| `areas/cascais-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `areas/nazare-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `guides/buy-property-portugal-foreigner` | `/guides/comporta-property-investment/` | `/areas/…` |
| `segments/german-buyers-portugal-property` | `/guides/portugal-vs-spain-property-investment/` | `/compare/…` |

**Orphan:** `/guides/prenuptial-agreement-portugal-property/` — 0 inbound links. Link from `portugal-property-inheritance-tax-foreigners` and the relevant segments pages.

**Near-orphans (1 inbound):** `compare/portugal-vs-turkey-property-investment`, `guides/portugal-golden-visa-vs-property-purchase`, `guides/portugal-property-inheritance-tax-foreigners`, `projects/carvalhido`.

**Title differentiation (not a merge):** `guides/porto-property-investment-guide` and `guides/portugal-property-investment-guide` currently share the title shape *"X Property Investment Guide — 2026 Market Data"*, one token apart, with *Porto* a substring of *Portugal*. Differentiate the titles; keep both pages.

---

## Protected slugs — do not touch in bulk waves

`scripts/refresh-protected-slugs.mjs` exists but **`protected-content-slugs.json` does not**. Generate it before Wave 1.

| Slug | Why |
|---|---|
| `guides/portugal-property-under-300000-euros` | **pos 8.1, 3.12% CTR — best performer on the site** |
| `guides/rnal-registration-portugal` | pos 6.2 — best position |
| `guides/imt-tax-non-resident-portugal-2026` | 798 imp — highest impressions |
| `guides/property-management-portugal-cost` | pos 9.8 |
| `projects/six-senses-comporta` | pos 9.1 |
| `areas/madeira-property-investment-guide` | 169 imp |

These may be **improved individually with before/after GSC tracking**, never swept in a batch.

---

## Sequencing

```
Wave 0 (code)  ──┬── Wave 4 (freshness — can run in parallel, independent)
                 │
                 └── Wave 1 (25) ── Wave 2 (41) ── Wave 6 (5) ── Wave 3 (7) ── Wave 5 (50)
```

**Gates between every batch:**

```bash
npm run validate:content -- --all   # must hold 126/126
npm run geo:audit                   # must trend up, never down
npm run qa:corpus
npm run build && node scripts/audit-rendered-live.mjs --local --fail
```

`npm run qa:full` (not `:quick`) before any «готово» — per `site-full-audit.mdc`, and only at exit code 0.

---

## Expected outcome

| Metric | Now | After W1–2 | After all waves |
|---|---|---|---|
| Commercial GEO avg | **67 (C)** | ~75 (B) | **~78 (B)** |
| Files below min | **103** | ~40 | **< 15** |
| answer | 68 | ~82 | ~85 |
| self | 65 | ~78 | ~82 |
| unique | 36 | ~40 | ~55 *(by-product, not targeted)* |
| Citability blocks | **45 (2.4%)** | ~90 | **~140 (7.5%)** |
| Files with 0 citability blocks | **94** | ~50 | **< 10** |
| `projects` shared prose | 55% | 55% | **< 15%** |

**Estimates, not guarantees.** They are derived from the rubric's own weights and band thresholds applied to the measured per-file scores in `geo-citability-scorer.mjs`. Re-measure after every wave; if Wave 1 does not land near +4, re-model before committing to Wave 2.
