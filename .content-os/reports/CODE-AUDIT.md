# Portuguese Estate — Code & UX Audit (Phase 0)

**Scope:** `src/` (Astro 6 / Tailwind 4 / Vercel adapter), `scripts/` (content gates), rendered build output
**Date:** 2026-08-21
**Build:** ✅ exit 0, 146 pages · postbuild local rendered audit ✅ 126/126 clean
**Constraint:** no Astro/layout changes made. One script fix only (§C1), flagged for review.

---

## Summary

The Astro architecture is sound: content collections are typed, `trailingSlash: 'always'` is consistent, sitemap priorities are deliberate, schema generation is near-complete, and the rendered output passes all 10 rendered checks. There is no structural rework needed.

What is wrong is a **thin layer of fork residue and gate blind spots** — the site was forked from a Mexico/Thailand codebase and a handful of per-site values were never changed. Individually each is a one-line fix. Together they are suppressing CTR on every page and the phone number on every conversion surface belongs to another country.

| Severity | Count | Theme |
|---|---|---|
| **P0** | 6 | Fork residue on every page; SERP truncation; duplicate H1 |
| **P1** | 7 | Gate blind spots, hub UX, mobile nav |
| **P2** | 4 | Dead code, config drift, cosmetics |

---

## P0

### P0-1 · WhatsApp contact number is a **Thailand** number — on 145 of 146 pages

> **Status 2026-08-22 — resolved as an interim arrangement.** The number stays
> live so every WhatsApp CTA still opens a chat, but it is no longer printed as
> text anywhere a visitor can read it (`whatsappDisplay` is empty). A buyer never
> sees a +66 country code; the button simply works. Two gate checks now cover it:
> `contact-number-visible` fails hard if any non-Portuguese number renders as
> visible text, and `contact-country-code` is a non-blocking NOTICE while
> `whatsappInterim: true` is set in `src/data/site.ts`. Setting a +351 number and
> flipping that flag to false re-arms the strict check and restores the number to
> the contact page and lead form.

`src/data/site.ts:8-9`

```ts
whatsapp: 'https://wa.me/66651195327',
whatsappDisplay: '+66 65 119 5327',
```

`+66` is **Thailand**. This is residue from the Phuket site this codebase was forked from.

It is not cosmetic — it is the site's **primary conversion channel**, rendered on **145/146 pages** through `WhatsAppFloat`, `Header`, `InlineCta`, `LeadForm` and `/contact/`. A German or British buyer researching a €400k Lisbon apartment sees a Thai mobile number on the CTA. Whatever the true conversion loss is, this is the cheapest fix on the site with the largest plausible upside.

**Fix:** one line in `src/data/site.ts`. Add an assertion that the number starts `+351` (or the agreed business number) to the rendered audit.

### P0-2 · Layout appends a brand suffix that pushes 134/146 titles past the SERP limit

`src/layouts/BaseLayout.astro:30`

```ts
const fullTitle = title.includes('Portuguese Estate') ? title : `${title} | Portuguese Estate`;
```

`qa-audit.mjs` enforces frontmatter `title` at 50–60 chars. The layout then adds 20 more.

- **134 / 146** rendered titles exceed 60 chars — avg **73**, max **79**
- **All 134** would fit within 60 with the suffix removed
- The gate asserts on the *frontmatter* string, so this is invisible to `validate:content`

The truncated tail is the keyword-bearing end of the title. This is the mechanical cause of the CTR problem in `PRIORITY-CTR-LEADS.md`.

**Fix:** drop the suffix, or apply it conditionally only when the result stays ≤60. Then assert rendered title length in `audit-rendered-live.mjs`.

### P0-3 · Two `<h1>` elements on all 126 collection pages

`src/layouts/ArticleLayout.astro:109` renders `<h1>{title}</h1>`, and **126/126 MDX bodies also open with `# `**, which MDX renders as a second `<h1>`. The two frequently disagree.

**Fix:** demote body `#` → `##` corpus-wide (scriptable, mechanical) **or** drop the layout H1. Add `h1 count === 1` to the rendered checks.

### P0-4 · `/areas/` and `/compare/` hubs ship Mexico/Gulf copy

`src/pages/areas/index.astro:13-14`

```astro
title="Portuguese Estatement Areas"
description="Area guides for Riviera Maya, Los Cabos, and Puerto Vallarta — yields, buyer profile, and micro-market risks."
```

`src/pages/compare/index.astro:12-13`

```astro
title="Spain Property Market Comparisons"
description="Side-by-side comparisons of Riviera Maya, Los Cabos, and other Gulf markets for property investors."
```

`"Portuguese Estatement Areas"` is a broken find-and-replace (`"Investment Areas"`, `Invest` → `Portuguese Estate`). `"Spain"` on a Portugal compare hub is worse — it is a competitor country in the title tag of an indexable hub.

The org's own `site-full-audit.mdc` lists *"чужой бренд в layout"* as a known recurring failure. It recurred.

**Fix:** rewrite both. Add a rendered check that fails on a foreign-market allowlist (`Riviera Maya|Los Cabos|Puerto Vallarta|Gulf|Phuket|Spain Property Market`).

### P0-5 · 126 pages share 10 hotlinked hero images

Every `heroImage` in the corpus points at a third party — 125 at `www.vangproperties.com`, plus `sonaesierra.com` and `pinheirinhocomporta.com`.

| Image | Pages |
|---|---|
| `tomas-ribeiro-79-quiet_18_final_2_2.jpg` | **49** |
| `sliderpro_empreendimento_bayline…png` | 32 |
| `terracos-do-monte_2.png` | 17 |
| `20210916wshelldji_0559rn.jpg` | 11 |
| `1825_1510h_vista_733_01.png` | 10 |
| 5 others | 1 each |

Compounding failures: **wrong region** (a Lisbon project photo heroes both Albufeira and Aveiro); **hotlinking a developer's Umbraco CMS** with `?preset=socialShare` (social crops used as heroes, revocable at any time, already 403); **no Cloudinary** despite the org pipeline existing; **identical OG images** on 49 pages.

**Fix:** migrate to Cloudinary (`images:upload` scripts exist), then enforce `heroImage` host allowlist + uniqueness in the gate.

> **Caveat:** the 403s observed here could not be separated from this container's egress proxy. The *reuse* finding is from source and is certain; *availability* needs a real-network re-run.

### P0-6 · Four internal links 404 — the gate cannot catch them

| File | Broken link | Correct |
|---|---|---|
| `areas/cascais-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `areas/nazare-property-investment` | `/guides/french-buyers-portugal-property/` | `/segments/…` |
| `guides/buy-property-portugal-foreigner` | `/guides/comporta-property-investment/` | `/areas/…` |
| `segments/german-buyers-portugal-property` | `/guides/portugal-vs-spain-property-investment/` | `/compare/…` |

Verified 404 against build output. **Root cause:** `qa-audit.mjs:159-165` counts internal links and checks trailing slashes — it never resolves a target.

**Fix:** resolve every internal link against the built slug set. ~15 lines, catches this class permanently.

---

## P1

### P1-1 · The content gate crashed on a clean clone *(fixed in this branch)*

`scripts/lib/more-content-gate.mjs:13` (before)

```js
import { runCloudinaryDeliveryChecks } from '../../../scripts/lib/cloudinary-gate.mjs';
```

From `<repo>/scripts/lib/`, `../../../scripts/lib/` resolves to **`/home/user/scripts/lib/`** — outside the repository. The file exists nowhere in this repo or in `more-group-content-os`. It is vendored from a local template workspace (`08_Идеи/_templates/scripts/`, see `sync-content-gate.mjs`), and the relative path was written for the template's own location.

Every consumer — `validate:content`, `fix:queue` — died with `ERR_MODULE_NOT_FOUND` before reading a file. **The documented "126/126 pass" baseline was not reproducible from a clean clone.**

**Change made (the only code change in this branch):** the import is now optional and degrades to a no-op when the module is absent. Baseline then reproduced exactly — 126/126, avg 3875 words.

**Follow-up for Maxim:** decide whether `cloudinary-gate.mjs` should be vendored into this repo (it is currently *not* in the `sync-content-gate.mjs` job list, so `npm run sync:content-gate` will not bring it in either).

### P1-2 · Cloudinary checks are unreachable — misplaced brace

`scripts/lib/more-content-gate.mjs` — the call sits **inside** the wave17 stamp branch:

```js
if (STAMP_PREFIX_RE.test(body)) {
  errors.push(`${prefix} wave17 area stamp prefix on paragraph — remove`);

runCloudinaryDeliveryChecks({ prefix, text, errors, legacyExempt });
}
```

`STAMP_PREFIX_RE` matches a Phuket-specific artifact (`Studio Condos … Phuket —`) that never occurs in this corpus, so the image checks **never execute** on any file.

**Deliberately not fixed.** Moving the call out would activate dormant checks and change the 126/126 baseline mid-audit — that is a Phase 1 decision, and it should land together with P0-5.

### P1-3 · `audit:rendered:fail` cannot run in CI or cloud

The documented gate (`STATUS.md`, `CLAUDE.md`, `site-full-audit.mdc` step 6) fetches **the live site**. From any sandboxed or CI runner without egress it returns 126 × HTTP 403 and exits 1.

The working variant is the `postbuild` one — `audit-rendered-live.mjs --local --fail` — which reads `dist/client/` and passes clean.

Also confusing: the summary prints `P0: 0 / P1: 0` while holding 126 fetch errors. The exit code is correct (1); the report reads as a pass.

**Fix:** make `--local` the default gate; keep live as a separate post-deploy step. Print fetch errors in the severity summary.

### P1-4 · Rendered audit skips the 20 highest-value commercial pages

`listSlugs()` enumerates `src/content/*` only — **126 collection pages**. The build emits **146**. The 20 never audited include:

`/` · `/portugal-property-consultation/` · `/tier-entry/` · `/tier-mid/` · `/tier-luxury/` · `/get-shortlist/` · `/contact/` · and all six hubs.

That is the entire lead funnel and every hub — exactly where P0-4's Mexico copy survived undetected.

**Fix:** add a static page list to the audit.

### P1-5 · No mobile navigation

`src/components/Header.astro:20` — `<nav class="hidden md:flex …">`, and there is **no hamburger, drawer, or `md:hidden` fallback** anywhere in the 37-line component.

Below the `md` breakpoint the only navigation is the logo, a WhatsApp link, and "Free shortlist". **All six hubs and 126 content pages are unreachable from mobile navigation.**

For a property-research audience that is likely majority-mobile, this caps internal link equity and session depth.

**Fix:** add a mobile disclosure menu with the same seven items.

### P1-6 · `/projects/` is in neither header nor footer navigation

Header nav: Guides, Segments, Developers, Areas, Compare, About, Contact. Footer: Guides, Compare, Methodology, Privacy, Terms.

`/projects/` — the most commercially-intent collection, the actual inventory, and home of the site's #3 GSC page (`six-senses-comporta`, pos 9.1) — is in **neither**. It is reachable only from body links and the sitemap.

The footer is also thin: it omits Areas, Segments, Projects and Developers entirely.

**Fix:** add Projects to header nav; expand footer into a real hub map.

### P1-7 · Hubs are under-built and mostly have no lead capture

| Hub | Words | Lead form | FAQPage | BreadcrumbList |
|---|---|---|---|---|
| `/guides/` | 3204 | ✅ | ❌ | ❌ |
| `/areas/` | 1137 | ❌ | ❌ | ❌ |
| `/compare/` | 670 | ❌ | ❌ | ❌ |
| `/segments/` | 646 | ❌ | ❌ | ❌ |
| `/projects/` | 334 | ❌ | ❌ | ❌ |
| `/developers/` | **178** | ❌ | ❌ | ❌ |

`/guides/` (pos ~73, 335 imp) is a flat wall of 63 `ContentCard`s with one "Start here" row — no clustering by tax / process / yields / areas, no `FAQPage`, no `BreadcrumbList`, no answer text above the grid. Five of six hubs have **no lead capture at all**.

**Fix:** cluster `/guides/` by intent; add `BreadcrumbList` + `FAQPage` to all hubs; add `InlineCta` to the five without one; expand `/developers/` and `/projects/` copy.

---

## P2

### P2-1 · Homepage project curation is dead code

`src/lib/homeProjects.ts:6-15` — `AREA_PRIORITY` is entirely Mexican:

```ts
['tulum','playa-del-carmen','aldea-zama-tulum','cabo-san-lucas',
 'san-jose-del-cabo','cabo-corridor','puerto-vallarta','punta-de-mita','puerto-morelos']
```

Actual project areas: `comporta`, `faro`, `lisbon-avenidas-novas` ×2, `lisbon-graca`, `lisbon-sete-rios`, `porto-carvalhido`.

`pool.find(p => p.data.area === area)` never matches, so the priority pass is a no-op and the homepage silently falls through to **price-ascending** order. Not a crash — but the curation Maxim thinks is running is not running.

### P2-2 · `/site-report/` contains another site's search data

`src/pages/site-report/index.astro:845-874` renders **Thailand/Phuket** GSC rows — `phuket or pattaya invest`, `/guides/freehold-vs-leasehold-thailand/`, `chanote thailand` — alongside genuine Portugal data further down (lines 945, 1041).

It is `noindex` so there is no SEO exposure, but this is the dashboard used to judge the site's performance, and it is partly reporting a different country.

### P2-3 · `site.config.json` `contentCollections` is stale and unused by the gate

It declares only `guides`, `news`, `projects`. `qa-audit.mjs:144-152` ignores it entirely and uses its own hardcoded map covering all seven collections. `areas`, `compare`, `segments`, `developers` are absent from the config but *are* enforced by the gate.

No live defect — but two sources of truth, one of them wrong, is how the next drift starts. `smoke.collections` likewise checks only `/guides/`.

### P2-4 · Cosmetic fork residue

- `qa-audit.mjs` prints `=== MEXICO-INVEST QA AUDIT ===` on every run
- The GA global is `window.investGulfTrack` (`GoogleAnalytics.astro:20`, + 3 call sites) — documented in `analytics-leads.md`, so intentional, but it is a third brand in a fourth site
- `scripts/` carries ~20 `mexico-*` manifests and `upload-mexico-cloudinary.py` is wired to `npm run images:upload`
- `geo-citability-scorer.mjs:70` hardcodes `MORE Group` in `UNIQUE_RE` — a brand this site never uses, so that alternative can never match

---

## Gate coverage gaps (summary)

What the current gates provably do **not** catch — each one is a defect found in this audit:

| Blind spot | Missed defect |
|---|---|
| Rendered `<title>` length | 134 titles over 60 chars (P0-2) |
| `h1` count in rendered HTML | 126 pages with 2 H1s (P0-3) |
| Non-collection pages | Mexico copy on 2 hubs (P0-4) |
| `heroImage` host / uniqueness | 10 images across 126 pages (P0-5) |
| Internal link resolution | 4 × 404 (P0-6) |
| Contact-detail sanity | Thai phone number (P0-1) |
| Cross-file duplication | `projects` at 55% shared prose |
| Numeric freshness | D8 threshold two years stale in 10 files |

Closing these is the subject of `code-improvements-roadmap.md`.

---

## Reference-pattern comparison — not performed

`greek-invest-website` (corpus remediation) and `florida-estate-website` (hub UX) are **not in this session's GitHub scope**, so no code comparison was made. Guidance here is drawn from `more-group-content-os/policies/` (`site-full-audit.mdc`, `geo-aeo-writing-gates.md`, `corpus-cleanup-mode.md`).

If that comparison is wanted, attach both repos and it can be done in Phase 1.
