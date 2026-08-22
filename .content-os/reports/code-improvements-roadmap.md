# Code Improvements Roadmap — Portuguese Estate

**Date:** 2026-08-21 · **Source:** `CODE-AUDIT.md`
**Status:** proposal — no Astro/layout changes until Maxim says **«ок»**
**Already applied on this branch:** one script fix (S0 below), flagged for review

---

## Why this comes before the corpus work

Four one-line changes touch **every page on the site**. Until they land, corpus work is polishing pages whose titles are truncated in SERPs, whose H1 signal is split in two, and whose CTA shows a Thai phone number.

**Estimated total effort for the entire P0 block: under a day.** It is the highest return-per-hour work available anywhere in this pilot.

---

## Stage 1 — P0 · one-liners that touch every page

| # | Fix | File | Effort | Blast radius |
|---|---|---|---|---|
| **1.1** | Replace the `+66` Thai WhatsApp number | `src/data/site.ts:8-9` | 1 line | **145/146 pages** |
| **1.2** | Drop the `\| Portuguese Estate` title suffix | `src/layouts/BaseLayout.astro:30` | 1 line | **134/146 titles** |
| **1.3** | Rewrite `/areas/` hub title + description | `src/pages/areas/index.astro:13-14` | 2 lines | 1 hub |
| **1.4** | Rewrite `/compare/` hub title + description | `src/pages/compare/index.astro:12-13` | 2 lines | 1 hub |

### 1.1 — WhatsApp number

```ts
// src/data/site.ts — currently a Thailand (+66) number on a Portugal site
whatsapp: 'https://wa.me/66651195327',
whatsappDisplay: '+66 65 119 5327',
```

**Needs a business decision from Maxim: what is the correct number?** Everything else here is mechanical; this one is blocked on an answer.

### 1.2 — Title suffix

```ts
// current — always +20 chars on a title the gate capped at 60
const fullTitle = title.includes('Portuguese Estate') ? title : `${title} | Portuguese Estate`;

// proposed — brand only when it still fits
const withBrand = `${title} | Portuguese Estate`;
const fullTitle = title.includes('Portuguese Estate')
  ? title
  : withBrand.length <= 60 ? withBrand : title;
```

Frontmatter titles are already 50–60 chars and already carry the topic and year. The brand suffix buys nothing in a SERP and costs the keyword tail on 134 pages.

**Track before/after CTR on the five GSC pages.** This is the cleanest measurable experiment on the site — and `IMT_AB_TEST_PLAN.md` already exists to hang it on.

### 1.3 / 1.4 — Hub copy

```astro
<!-- areas: "Portuguese Estatement Areas" is a broken find-and-replace -->
title="Portugal Investment Areas — 26 Micro-Market Guides"
description="Micro-market research for foreign buyers across Lisbon, Porto, Algarve, Silver Coast, Comporta and Madeira — yields, buyer profile and local risk."

<!-- compare: currently says "Spain" and describes Mexican markets -->
title="Portugal Property Comparisons — Markets & Routes"
description="Side-by-side breakdowns of Portugal against Spain, Greece, Italy, Dubai and the UK, plus Lisbon vs Porto and Algarve vs Lisbon — fees, yields, buyer fit."
```

---

## Stage 2 — P0 · duplicate H1

**1.5 — Resolve two `<h1>` per page (126/126)**

`ArticleLayout.astro:109` renders the frontmatter title as `<h1>`; every MDX body also opens with `# `.

Two options:

| Option | Change | Trade-off |
|---|---|---|
| **A (recommended)** | Sweep `# ` → `## ` across 126 MDX | Mechanical, scriptable, one reviewable diff. Keeps the layout H1 authoritative and consistent with the `<title>`. **Is a 126-file MDX edit — needs explicit «ок».** |
| B | Remove the layout `<h1>` | 1 line, no corpus edit. But H1 then comes from the body and can drift from the title, and the hero block loses its heading. |

**Recommend A**, executed as its own PR with no other content changes, so the diff is trivially auditable.

---

## Stage 3 — P1 · close the gate blind spots

Each gate below would have caught a defect found in this audit. This is what stops the next fork-residue bug shipping.

| # | Check to add | Would have caught | Effort |
|---|---|---|---|
| **3.1** | Rendered `<title>` ≤ 60 chars | 134 truncated titles | S |
| **3.2** | Exactly one `<h1>` per page | 126 duplicate H1s | S |
| **3.3** | Resolve every internal link against built slugs | 4 × 404 | M |
| **3.4** | Audit non-collection pages too | Mexico copy on 2 hubs | S |
| **3.5** | Foreign-market denylist in rendered HTML | Mexico/Gulf/Spain/Phuket copy | S |
| **3.6** | `heroImage` host allowlist + uniqueness | 126 pages / 10 hotlinked images | M |
| **3.7** | Contact-detail assertion (`+351` prefix) | Thai WhatsApp number | S |
| **3.8** | Pin minimum-wage-derived figures | D8 stale by two years in 10 files | M |

### 3.3 — Internal link resolution

The current check (`qa-audit.mjs:159-165`) counts links and checks trailing slashes; it never resolves a target. Roughly:

```js
const known = new Set(allSlugs.map(s => `/${s.collection}/${s.slug}/`));
for (const link of internalLinks(body)) {
  if (/^\/(guides|areas|compare|segments|projects|developers|news)\//.test(link)
      && !known.has(link)) {
    prob.push(`broken-internal-link:${link}`);
  }
}
```

~15 lines, closes this class permanently.

### 3.4 — Audit the pages that matter most

`listSlugs()` enumerates `src/content/*` — 126 pages. The build emits **146**. The 20 skipped are `/`, the full lead funnel (`/portugal-property-consultation/`, `/tier-*`, `/get-shortlist/`, `/contact/`) and **all six hubs** — precisely where the Mexico copy survived. Add a static page list.

---

## Stage 4 — P1 · hub UX and navigation

| # | Fix | Detail |
|---|---|---|
| **4.1** | Cluster `/guides/` by intent | 63 flat cards → Tax & Costs / Buying Process / Yields & Rentals / Residency / Markets. Position ~73 on 335 imp. |
| **4.2** | `BreadcrumbList` + `FAQPage` on all six hubs | Currently **zero** hubs have either |
| **4.3** | `InlineCta` on the five hubs without lead capture | `/areas/`, `/compare/`, `/segments/`, `/projects/`, `/developers/` |
| **4.4** | Mobile navigation | `Header.astro:20` is `hidden md:flex` with **no fallback** — 126 pages unreachable from mobile nav |
| **4.5** | Add `/projects/` to header + footer nav | Most commercial collection, in neither |
| **4.6** | Expand thin hubs | `/developers/` **178 words**, `/projects/` 334 |
| **4.7** | Expand footer into a hub map | Currently 5 links; omits Areas, Segments, Projects, Developers |

**4.4 is the highest-value item in this stage.** A property-research audience is likely majority-mobile, and mobile users currently have no route to any hub.

---

## Stage 5 — P0/P1 · images

**5.1 — Migrate hero images to Cloudinary**

126 pages, **10 distinct images**, all hotlinked from third parties (125 × `vangproperties.com`), one photo on **49 pages**, wrong region on many, `?preset=socialShare` crops used as heroes, identical OG images across 49 pages.

Sequence:
1. Confirm licensing for any image to be retained
2. Source genuinely region-correct photography — **an Algarve page needs an Algarve photo**
3. Upload via the existing pipeline (`npm run images:upload:content`)
4. Rewrite `heroImage` frontmatter
5. Enable gate 3.6 (host allowlist + uniqueness)

**Largest effort in this roadmap and it needs a budget decision** (stock licence vs commissioned vs developer permission). It is also the largest single lift to perceived quality and E-E-A-T.

**5.2 — Re-enable the Cloudinary delivery checks**

`more-content-gate.mjs` has `runCloudinaryDeliveryChecks(...)` nested inside the `STAMP_PREFIX_RE` branch, which never matches this corpus — so the checks never run. Deliberately left alone during Phase 0 (moving it changes the 126/126 baseline). **Land it together with 5.1.**

---

## Stage 6 — P2 · residue and hygiene

| # | Fix | File |
|---|---|---|
| 6.1 | Replace Mexican `AREA_PRIORITY` with Portuguese areas — homepage curation is currently dead code | `src/lib/homeProjects.ts:6-15` |
| 6.2 | Purge Thailand/Phuket GSC rows from the site report | `src/pages/site-report/index.astro:845-874` |
| 6.3 | Reconcile `site.config.json` `contentCollections` with the gate's hardcoded map (or delete the dead block) | `site.config.json` |
| 6.4 | Rename the `=== MEXICO-INVEST QA AUDIT ===` banner | `scripts/qa-audit.mjs` |
| 6.5 | Decide on `window.investGulfTrack` — rename or document as intentional | `GoogleAnalytics.astro:20` + 3 call sites |
| 6.6 | Remove `MORE Group` from `UNIQUE_RE`, or add `Portuguese Estate` | `geo-citability-scorer.mjs:70` |
| 6.7 | Generate `protected-content-slugs.json` — the refresh script exists, the file does not | `npm run refresh:protected` |
| 6.8 | Prune ~20 stale `mexico-*` manifests from `scripts/` | `scripts/` |

**6.7 should move to Stage 1** — protected slugs must exist *before* any corpus wave touches a GSC winner.

---

## S0 — the change already made on this branch

**`scripts/lib/more-content-gate.mjs:13`** — the only code change in this branch.

```js
// before — resolves to /home/user/scripts/lib/, outside the repo, exists nowhere
import { runCloudinaryDeliveryChecks } from '../../../scripts/lib/cloudinary-gate.mjs';

// after — optional, degrades to a no-op when the module is absent
let runCloudinaryDeliveryChecks = () => {};
try {
  ({ runCloudinaryDeliveryChecks } = await import('./cloudinary-gate.mjs'));
} catch { /* gate not vendored here — image delivery checks are skipped */ }
```

**Why it was necessary:** `validate:content` and `fix:queue` both crashed with `ERR_MODULE_NOT_FOUND` before reading a single file, so the mandated Phase 0 gates could not run and the documented 126/126 baseline was not reproducible from a clean clone. After the fix the baseline reproduced exactly (126/126, avg 3875 words).

**Behaviour change:** none. The call site was already unreachable (5.2), so no check that previously ran has stopped running.

**Decision needed from Maxim:** should `cloudinary-gate.mjs` be vendored into this repo? It is **not** in the `sync-content-gate.mjs` job list, so `npm run sync:content-gate` will not fetch it either — the import has probably been broken on every machine except the original author's since the file was first copied in.

---

## Suggested order

```
Stage 1  (1.1–1.4)  one-liners, every page          ← do first, same day
   +     (6.7)      generate protected slugs
Stage 2  (1.5)      duplicate H1 sweep              ← needs «ок» (126 files)
Stage 3  (3.1–3.8)  gate hardening                  ← before any corpus wave
Stage 4  (4.1–4.7)  hub UX + mobile nav
Stage 5  (5.1–5.2)  images                          ← needs budget decision
Stage 6  (6.1–6.8)  residue cleanup                 ← background
```

Corpus Waves 1–2 can begin as soon as **Stages 1–3** are merged.

---

## Verification for every stage

```bash
npm run validate:content -- --all
npm run geo:audit
npm run qa:corpus
npm run build
node scripts/audit-rendered-live.mjs --local --fail
```

On a machine with real network access, also:

```bash
npm run qa:full          # full package, must exit 0
npm run audit:rendered:fail   # live — cannot pass from a sandboxed runner
```

> **Note for CI:** `audit:rendered:fail` fetches the live site and returns 126 × HTTP 403 from any runner without egress. Make `--local` the gate and keep live as a post-deploy check (3.4 territory).
