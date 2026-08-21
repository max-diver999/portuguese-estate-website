# Content OS — Portuguese Estate (portuguese-estate.com)

**Updated:** 2026-08-21  
**Pilot:** full audit → corpus remediation → hub UX → new articles (after Maxim ok)

## Current state

| Metric | Value |
|--------|-------|
| MDX | **126** (guides 63, areas 26, compare 14, segments 13, projects 7, developers 3) |
| validate:content --all | ✅ 126/126 |
| GEO commercial avg | **67/100 (C)** — **103 files below min** |
| Rubric weak | unique **36**, self **65**, answer **68** |
| GSC (May–Aug 2026) | IMT tax, under-300k, RNAL, property management — see snapshot |

## Pilot lock

- **Phase 0:** audit only — no mass MDX, no Astro deploy, no indexing
- **After «ок»:** corpus cleanup (expect Greece-style boilerplate removal), hub UX, then topic batch
- **Branch prefix:** `cc/portugal-`

## Read first (Claude)

1. `.content-os/site-passport.yaml`
2. `more-group-content-os/programs/portuguese-estate.yaml`
3. `docs/PRIORITY-CTR-LEADS.md`
4. `docs/CONTENT_QUALITY_AUDIT.md`
5. `more-group-content-os/analytics-snapshots/portuguese-estate-website/2026-08-21.json`

## Gates before any production merge

```bash
npm run validate:content -- --all
npm run geo:audit
npm run build
npm run audit:rendered:fail
npm run qa:full:quick
```

## Indexing

GCP: `portuguese-estate-indexing` only. Never `soy-braid-491510-c2`.

## Owner

- **Claude:** audit, roadmaps, corpus fixes on branch, PR drafts
- **Cursor / Maxim:** merge, deploy, indexing after explicit ok
