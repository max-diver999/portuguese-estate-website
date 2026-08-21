# Content quality audit — Portuguese Estate

**Date:** 2026-08-21  
**Corpus:** 126 MDX

## Automated baseline

| Check | Result |
|-------|--------|
| `validate:content --all` | ✅ 126/126 clean |
| `geo:audit` commercial avg | **67/100 (grade C)** |
| Files below GEO min | **103 / 126** |
| Avg words | ~3875 |

## Rubric breakdown (commercial pages)

| Dimension | Avg | Target |
|-----------|-----|--------|
| answer | 68 | 75+ |
| self | 65 | 75+ |
| structure | 70 | 75+ |
| stats | 84 | ok |
| **unique** | **36** | **60+** |

## Hypothesis (Phase 0 to confirm)

- Shared intro/outro blocks across guides (Greece pre-remediation pattern)
- Repeated FAQ tails and consultation paragraphs
- Compare/areas templates with thin local differentiation
- Segments pages may share buyer-persona scaffolding

## Phase 0 deliverable

`corpus-cleanup-roadmap.md` with waves, slug lists, expected GEO lift, and protected slugs (GSC winners).

## Post-remediation target

- Commercial GEO avg ≥ 75
- Files below min < 15
- `qa:full:quick` 6/6 after any code changes
