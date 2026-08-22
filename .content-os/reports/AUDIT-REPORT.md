# Portuguese Estate — Full Site Audit (Phase 0)

**Site:** portuguese-estate.com · EN · Portugal property + tax/residency
**Date:** 2026-08-21
**Corpus:** 126 MDX / 146 rendered pages
**Branch:** `claude/portugal-audit-content-os-8mqybx`
**Status:** audit only — no mass MDX edits, no new slugs, no deploy, no indexing

---

## 0. Executive verdict

The corpus is **factually sound and structurally consistent** — better than the "Greece pre-remediation boilerplate" hypothesis assumed. The IMT 7.5% / DL 97/2026 foundation that 107 files rest on is **externally verified as correct**, and cross-document duplication is low everywhere except one collection.

The problem is **not** the writing. It is a small number of **template and layout defects that affect every page at once**, plus an image layer that is effectively broken. Five defects, none of them content rewrites, are suppressing the entire site's CTR and crawl quality.

> **The single highest-value finding:** the content gate enforces a 50–60 character title, and then the layout appends `" | Portuguese Estate"` (+20 chars) to it. **134 of 146 rendered titles exceed 60 characters** (avg 73, max 79) and are truncated in SERPs. All 134 would fit inside 60 if the suffix were dropped. This is a one-line layout change and it touches every ranking page on the site.

---

## 1. What was actually run

All gates were executed locally on a clean clone at commit `138da6e`.

| Gate | Result | Notes |
|---|---|---|
| `validate:content --all` | ✅ **126/126**, avg 3875 words | **Only after fixing a crash — see 2.7** |
| `geo:audit` | ⚠️ **67/100 (C)**, 103 below min | Baseline reproduced exactly |
| `qa:corpus` | ✅ PASS | em-dash, padding dupes, MDX patterns clean |
| `npm run build` | ✅ exit 0 | 146 pages emitted |
| `audit-rendered-live --local --fail` | ✅ 126/126 clean, 0 issues | The postbuild variant |
| `audit:rendered:fail` (live) | ❌ 126 × HTTP 403 | **Environment**, not the site — see 1.1 |
| `qa:full:quick` | ⚠️ **4/6** | Both failures are environment — see 1.1 |

Rubric baseline reproduced to the digit: `answer 68 · self 65 · structure 70 · stats 84 · unique 36`.

### 1.1 Two gate failures are environment artifacts, not site defects

`qa:full:quick` fails on **HTTP smoke** and **Image URLs**. Both are caused by this container's egress proxy, which returns `403 CONNECT tunnel failed` for all external hosts. `portuguese-estate.com` is unreachable from here via both `curl` and the fetch service.

**I could not review the live site page-by-page as asked.** I substituted the production build output (`.vercel/output/static/`, 146 rendered pages), which is what actually deploys, so every rendered finding below is real. But **live-only checks — the lead API, real HTTP status codes, actual CDN image delivery — remain unverified and must be re-run by Cursor/Maxim on a normal network.**

---

## 2. P0 — fix before anything else

### 2.1 Every rendered title is truncated in search results

`BaseLayout.astro:30` appends `" | Portuguese Estate"` to a title the gate already forced into a 50–60 char budget.

- **134 / 146** rendered titles exceed 60 chars (avg **73**, max **79**)
- **134 / 134** would fit under 60 with the suffix removed
- The gate validates the *frontmatter* string, never the *rendered* one — so this is invisible to `validate:content`

This is the direct, mechanical cause of the CTR problem in `PRIORITY-CTR-LEADS.md`. `/guides/imt-tax-non-resident-portugal-2026/` renders at **76 chars**: Google cuts the tail, and the part it cuts is the keyword-bearing end of the title, not the brand.

**Fix:** drop the suffix (or apply it only when the result stays ≤ 60). One line. Then extend the gate to assert on rendered length.

### 2.2 All 126 collection pages render two `<h1>` elements

`ArticleLayout.astro:109` renders `<h1>{title}</h1>` from frontmatter, and **all 126 MDX bodies also open with a `# ` heading**, which MDX renders as a second `<h1>`.

The two H1s frequently disagree:

| Page | Layout H1 | Body H1 |
|---|---|---|
| IMT non-resident | Portugal IMT for Non-Residents — 7.5% Flat Rate 2026 | Portugal IMT Tax for Non-Residents: 2026 Reform Guide |
| Infinity | Infinity Lisbon Review — Sete Rios Tower Completed 2026 | Infinity Lisbon |

**Blast radius 126/126.** Two competing H1s dilute the topical signal on exactly the pages that need it most.

**Fix:** demote body `#` to `##` corpus-wide (mechanical, scriptable), or stop rendering the layout H1. Then add an `h1 count === 1` assertion to the rendered audit.

### 2.3 Two hub pages ship another country's copy

The site was forked from a Mexico project (`qa-audit.mjs` still prints `=== MEXICO-INVEST QA AUDIT ===`). Two hubs were never localised, and they are **live and indexable**:

| Page | Rendered `<title>` | Rendered meta description |
|---|---|---|
| `/areas/` | **"Portuguese Estatement Areas"** | "Area guides for **Riviera Maya, Los Cabos, and Puerto Vallarta**…" |
| `/compare/` | **"Spain Property Market Comparisons \| Portuguese Estate"** | "…comparisons of **Riviera Maya, Los Cabos, and other Gulf markets**…" |

`"Portuguese Estatement Areas"` is a broken find-and-replace: `"Investment Areas"` with `Invest` → `Portuguese Estate`.

Source: `src/pages/areas/index.astro:13-14`, `src/pages/compare/index.astro:12-13`.

The org's own policy (`site-full-audit.mdc`) lists *"чужой бренд в layout"* as a known recurring failure mode. It recurred here.

### 2.4 126 pages share 10 hero images, all hotlinked from third parties

| Image | Pages using it |
|---|---|
| `tomas-ribeiro-79-quiet_18_final_2_2.jpg` | **49** |
| `sliderpro_empreendimento_bayline…png` | 32 |
| `terracos-do-monte_2.png` | 17 |
| `20210916wshelldji_0559rn.jpg` | 11 |
| `1825_1510h_vista_733_01.png` | 10 |
| 5 others | 1 each |

**126 pages · 10 distinct images.** Every one is hotlinked from `www.vangproperties.com` (125 refs), plus single images from `sonaesierra.com` and `pinheirinhocomporta.com`.

Four compounding problems:

1. **Wrong region.** `albufeira-property-investment` (Algarve) and `aveiro-property-investment` (Silver Coast) both use a photo of a **Lisbon** project.
2. **Hotlinking a competitor's CMS.** These are a developer's Umbraco media URLs with `?preset=socialShare` — social-share crops, served as heroes. They can be revoked at any time; they are already returning 403.
3. **No Cloudinary.** The org has an image pipeline; this site never migrated to it.
4. **Identical OG images** on 49 pages — every social share looks the same.

This is the largest single drag on perceived quality and E-E-A-T, and it is invisible to every current gate.

### 2.5 Four internal links 404

Wrong collection prefix — the target pages exist, just not at the linked path:

| In file | Broken link | Correct path |
|---|---|---|
| `areas/cascais-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `areas/nazare-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `guides/buy-property-portugal-foreigner` | `/guides/comporta-property-investment/` | `/areas/…` |
| `segments/german-buyers-portugal-property` | `/guides/portugal-vs-spain-property-investment/` | `/compare/…` |

Verified 404 against the build output. **Root cause:** `qa-audit.mjs` counts internal links and checks trailing slashes, but never checks that a target resolves.

### 2.6 94 of 126 files have zero citability blocks

This is the finding that matters most for AI search (AEO/GEO), and no current report surfaces it.

- Corpus has **1873 H2 blocks**; only **45 (2.4%)** qualify as citability blocks (130–170 words, self-contained, contains a statistic, no pronoun opener)
- **94 / 126 files have none at all**
- **179 thin H2 openers** across **66 files** (opener under 35 words)

Citability blocks are the unit an LLM lifts when it answers a question. At 2.4%, the corpus is well-written for humans and close to unquotable for machines. `robots.txt` correctly allows GPTBot, ClaudeBot, PerplexityBot and OAI-SearchBot — so the crawl access is there, and there is little worth quoting when they arrive.

### 2.7 `validate:content` crashes on a clean clone

`scripts/lib/more-content-gate.mjs:13` imported `'../../../scripts/lib/cloudinary-gate.mjs'` — a path that resolves **outside the repository** (`/home/user/scripts/lib/…`) and matches nothing on any machine but the original author's. The file exists nowhere in this repo or in `more-group-content-os`.

Every consumer of the gate module — `validate:content`, `fix:queue` — died with `ERR_MODULE_NOT_FOUND` before reading a single file.

**The documented "126/126 pass" baseline was therefore not reproducible from a clean clone.** I made the import optional (graceful no-op when the module is absent), after which the baseline reproduced exactly: 126/126, avg 3875 words. This is the one code change in this branch and it is flagged for review in `CODE-AUDIT.md`.

---

## 3. P1 — high value, not blocking

### 3.1 The `projects` collection is a single template

This is the **only** place the boilerplate hypothesis holds — and there it holds completely.

| Collection | Avg shared prose | Files ≥30% shared |
|---|---|---|
| **projects** | **55%** | **7 / 7** |
| compare | 6% | 0 |
| areas | 2% | 0 |
| segments | 2% | 0 |
| guides | 1% | 0 |
| developers | 1% | 0 |

All **21 of 21** project pairs exceed **69%** 5-gram Jaccard similarity (peak 78.7%, `castilho-203` ~ `infinity`). 15 paragraphs appear verbatim in all 7 files — the national-context block, the DL 67/2003 guarantee block, the IMT timing block, the verification checklist, even the "insider tip".

Each project page carries only ~940 words of prose, roughly half of it shared. **~420 unique words per project review.**

### 3.2 Stale visa thresholds contradict each other across files

Portugal's minimum wage rose to **€920/month on 1 Jan 2026** (verified externally). D7 tracks it; D8 is 4×, so **€3,680/month**.

| Figure in corpus | Implied basis | Files |
|---|---|---|
| €3,040 | 4 × €760 (≈2023) | **10** |
| €3,480 | 4 × €870 (2025) | 2 |
| **€3,680** | **4 × €920 (2026) — correct** | **1** |
| €820 D7 | matches no year | 3 |

Ten files quote a D8 threshold that is **two years out of date**; exactly one carries the current number. On a site whose entire pitch is "independent, current, primary-source", this is the most damaging kind of error.

### 3.3 The `unique` rubric score is a keyword proxy, not a duplication measure

`scoreUniqueness()` (`geo-citability-scorer.mjs:189`) does not compare documents. It regex-matches literal strings:

```
/\b(MORE Group|our (analysis|data|clients|underwriting)|insider tip|
   underwriting snapshot|we (surveyed|analyzed|tracked))\b/i
```

Three consequences:

1. **`unique 36` does not mean the corpus is duplicated.** Measured duplication is 1–6% outside `projects`. The two numbers describe different things, and the roadmap in `CONTENT_QUALITY_AUDIT.md` conflates them.
2. **It is trivially gameable.** Pasting "Insider tip:" into every H2 would move `unique` from 36 to ~80 with zero benefit to a reader or a crawler.
3. **It hardcodes the wrong brand.** `MORE Group` can never match on a site that brands as *Portuguese Estate*.

**Do not run a wave that chases this metric.** See §4 for where the weight actually is.

### 3.4 Hubs are under-built

| Hub | Words | Lead form | FAQPage | BreadcrumbList |
|---|---|---|---|---|
| `/guides/` | 3204 | ✅ | ❌ | ❌ |
| `/areas/` | 1137 | ❌ | ❌ | ❌ |
| `/compare/` | 670 | ❌ | ❌ | ❌ |
| `/segments/` | 646 | ❌ | ❌ | ❌ |
| `/projects/` | 334 | ❌ | ❌ | ❌ |
| `/developers/` | **178** | ❌ | ❌ | ❌ |

`/guides/` sits at **position ~73 on 335 impressions**. It is a flat wall of 63 cards with one "Start here" row — no clustering into tax / process / yields / areas, no schema, no answer text. Every other hub is thinner still, and five of six have no lead capture at all.

### 3.5 Cannibalisation risk is low — and the automated signal is mostly noise

215 title/slug overlap pairs sounds alarming and is almost entirely a naming artifact: all 13 `segments` pages are `{nationality}-buyers-portugal-property`, so they share tokens by construction while targeting clearly distinct queries.

Only one pair is a genuine risk:

- `guides/porto-property-investment-guide` — *"Porto Property Investment Guide — 2026 Market Data"*
- `guides/portugal-property-investment-guide` — *"Portugal Property Investment Guide — 2026 Market Data"*

Same title shape, one-token difference, and *Porto* is a substring of *Portugal*. Descriptions differentiate well (Porto leads on yield; Portugal leads on national transaction data), so this is a **title differentiation fix, not a merge**.

The IMT pair (`imt-tax-non-resident` / `imt-refund-tax-resident`) is complementary and correctly differentiated. **No merges or redirects are recommended.**

### 3.6 One orphan page

`/guides/prenuptial-agreement-portugal-property/` has zero inbound internal links. Four more have exactly one: `compare/portugal-vs-turkey…`, `guides/portugal-golden-visa-vs-property-purchase`, `guides/portugal-property-inheritance-tax-foreigners`, `projects/carvalhido`.

---

## 4. Where the GEO weight actually is

The rubric weights are `answer 30% · self 25% · structure 20% · stats 15% · unique 10%`. Current: `68 / 65 / 70 / 84 / 36` → **66.85 ≈ 67**.

| Action | Rubric move | Score gain |
|---|---|---|
| Fix answer-first openers | answer 68 → 85 | **+5.1** |
| Fix self-containment | self 65 → 85 | **+5.0** |
| Tighten structure | structure 70 → 85 | +3.0 |
| Chase "insider tip" keyword | unique 36 → 80 | +4.4 *(gaming)* |

**`answer` + `self` alone carry 55% of the weight and take the corpus to ~77 — past the 75 target — without touching `unique`.**

Better still, both are fixed by the *same* edit: rewriting a thin H2 opener into a 40–60 word, self-contained, stat-bearing paragraph raises `answer` **and** `self` **and** creates the citability blocks from §2.6. **179 openers across 66 files is the entire remediation.** `unique` then rises on its own as real proprietary framing gets written.

This inverts the stated priority in `site-passport.yaml` (`audit_priority: corpus_uniqueness_and_answer_blocks`) — **uniqueness should come last, not first.**

### 4.1 GEO by collection

| Collection | n | Score | answer | self | struct | stats | unique | <60 | <75 |
|---|---|---|---|---|---|---|---|---|---|
| areas | 26 | **75** | 78 | 73 | 77 | 93 | 41 | 0 | 9 |
| segments | 13 | 70 | 74 | 69 | 77 | 82 | 25 | 0 | 12 |
| compare | 14 | 65 | 64 | 64 | 64 | 86 | 35 | 1 | 14 |
| guides | 63 | 64 | 64 | 62 | 69 | 82 | 34 | 12 | 57 |
| projects | 7 | 61 | 68 | 58 | 66 | 58 | 40 | 0 | 7 |
| developers | 3 | **53** | 56 | 60 | 64 | 41 | 26 | 3 | 3 |

**`areas` is the strongest collection and needs the least work.** `guides` is weakest at scale (57 of 63 below 75). `developers` is worst per-file but is only 3 pages.

---

## 5. What is genuinely good

Worth stating plainly, because the roadmap should not break these:

- **The IMT 7.5% / DL 97/2026 foundation is correct.** Externally verified: DL 97/2026 of 20 May implements the housing package under Lei 9-A/2026, applying a flat 7.5% IMT to non-resident purchases of urban residential property, with exemptions where the buyer becomes tax resident within 2 years or commits to a 36-month lease. 107 files cite it, **with no internal contradictions**.
- **Zero duplicate titles, descriptions, or canonicals** across 146 pages.
- **Schema coverage is near-complete** on collection pages: Article + BreadcrumbList + FAQPage + Organization on 125/126, zero JSON-LD parse errors.
- **Every `<img>` has an `alt`.**
- **`robots.txt` explicitly allows GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot** — deliberate, correct GEO hygiene.
- **`llms.txt` / `llms-full.txt` exist and are accurate.**
- Frontmatter discipline is perfect against the current gate: 126/126 titles in band, 126/126 descriptions ≤160.
- Outside `projects`, **cross-document duplication is 1–6%** — genuinely original writing at 3875 words/page.

---

## 6. Competitive position

Direct competitors on the same "independent, non-listing" positioning:

| Competitor | Overlap |
|---|---|
| **portugalpropertyinvest.com** | Near-identical positioning: *"Independent Portugal property buyer intelligence for foreigners"* |
| portugalbuyersagent.com | Regional pricing + yield analysis; agent-led |
| globalcitizensolutions.com / immigrantinvest.com | Residency-led, high authority |
| portugalhomes.com | Developer/listing-led |

Portuguese Estate's defensible edge is **tax and compliance depth** — IMT/AIMI/IMI/stamp duty/CGT, AL/RNAL, CPCV/escritura mechanics — where it already ranks (RNAL pos 6.2, property-management pos 9.8, under-300k pos 8.1). The residency-led competitors outrank it on visa queries and will keep doing so.

**Strategic read:** do not chase Golden Visa / residency head terms. Own the *transaction mechanics and tax* cluster, where the site already has position and the competitors are thin. §7 and `content-roadmap.md` are built on that.

---

## 7. GSC / CTR priorities

From `analytics-snapshots/2026-08-21.json`, reinterpreted against the defects above.

| URL | Signal | Real blocker |
|---|---|---|
| `/guides/imt-tax-non-resident-portugal-2026/` | 798 imp, pos 22.3, **1.25%** CTR | **76-char title truncated** (§2.1) + duplicate H1 (§2.2). Content is correct and deep — this is a packaging problem, not a content problem. |
| `/guides/property-management-portugal-cost/` | 267 imp, pos 9.8, **0.37%** CTR | Position 9.8 with 0.37% CTR is a **title/meta failure**, not a ranking failure. Truncated title. Needs a cost table in the snippet. |
| `/guides/rnal-registration-portugal/` | 203 imp, pos **6.2**, 0.49% CTR | Best position on the site, near-zero CTR. Same cause. Highest-leverage single page. |
| `/guides/` hub | 335 imp, pos ~73 | Flat 63-card wall, no schema, no clustering (§3.4). |
| `/areas/madeira-property-investment-guide/` | 169 imp, low CTR | 77-char title; shares a hero image with 48 other pages. |
| `/guides/portugal-property-under-300000-euros/` | pos 8.1, **3.12%** CTR | **Working — protect it.** Highest CTR on the site. Do not touch in bulk waves. |

**The pattern is unambiguous:** three of the top five pages rank on page 1 and convert at under 0.5%. Nothing here calls for new content. It calls for §2.1 and §2.2.

---

## 8. Corrections to the Phase 0 briefing

Stated in `CONTENT_QUALITY_AUDIT.md` / `site-passport.yaml`, and not supported by measurement:

| Briefing hypothesis | Measured |
|---|---|
| "Shared intro/outro blocks across guides (Greece pre-remediation pattern)" | **False for guides** — 1% shared prose. True only for `projects` (55%). |
| "Repeated FAQ tails" | **False** — 10 reused questions out of 1151 distinct (0.9%). |
| "Compare/areas templates with thin local differentiation" | **False for areas** — best collection (75). Partly true for compare (6%). |
| "Segments pages may share buyer-persona scaffolding" | **False** — 2% shared prose. |
| `audit_priority: corpus_uniqueness_and_answer_blocks` | **Half right** — answer blocks yes; uniqueness is a keyword proxy and should be last (§3.3, §4). |
| "126/126 clean" as a reproducible baseline | **Not reproducible** until §2.7 was fixed. |

**A mass de-boilerplating wave across 126 files would have been wasted effort.** The corpus does not have a boilerplate problem outside 7 files. It has a template/layout problem and an image problem.

---

## 9. Deliverables

| File | Contents |
|---|---|
| `AUDIT-REPORT.md` | This document |
| `CODE-AUDIT.md` | Layout, hub, gate and tooling defects with file:line |
| `corpus-cleanup-roadmap.md` | 6 waves, file counts, expected GEO lift, protected slugs |
| `code-improvements-roadmap.md` | Sequenced code fixes with effort and risk |
| `content-roadmap.md` | 50 proposed articles, clustered and prioritised |
| `topics-proposal.json` | Machine-readable proposals — **no slugs created** |

---

## 10. Verification limits

Stated plainly so nothing here is over-trusted:

- **The live site was never reached.** All rendered findings come from `.vercel/output/static/` (the deploy artifact). Live HTTP status, lead-API behaviour and CDN image delivery are **unverified**.
- **Image 403s could not be separated** into "hotlink protection" vs "proxy block". The *reuse* finding (126 pages / 10 images) is from source and is certain; the *availability* finding needs a real-network re-run.
- GSC/GA4/Bing MCP connectors were not available; all search data is from the committed snapshot.
- `greek-invest-website` and `florida-estate-website` are not in this session's scope, so reference-pattern comparison is based on `more-group-content-os/policies/`, not their code.
