# Task: undo the 20 Sep text rollback on portuguese-estate.com, then clean AI cadence

Branch `cc/portugal-restore-and-cadence-20260923`, based on origin/main 05b6c79. Content OS submodule a93aa22.

## Background (verified by Hermes on origin/main)

On 20 Sep the Cloudinary to R2 image migration (commit 91fa288, then 4363c33 and 148a6c5) was run from a stale local copy. It rewrote whole MDX files: new R2 image URLs, but text from an older state. Correct pre-migration main is **e437751** (16 Sep).

- 113 MDX files modified since e437751 (`.content-os/batches/modified-113.txt`): 74 have text differences vs e437751 (all 74 equal an older version of the file: that is the rollback), the rest differ only in image lines.
- 65 MDX files re-added (`.content-os/batches/returned-65.txt`) in areas/, compare/, guides/ etc. All 65 had been deleted before 20 Sep. Hermes checked the live site: all 65 old URLs already return 301 to their successors.
- Files with em/en dash: 0 at e437751, 141 now.
- Files with "Quick answer:" / "Short answer:" / "Strongest fit:": 0 at e437751 and 0 now.
- Only content commit after the migration: cc76ab5 (cadence pilot, 2 files). See "Frozen files" below.

## HARD RULE: "Quick answer" block is untouchable

Any line or block starting with `**Quick answer:**`, `Short answer:`, `Strongest fit:`, `Быстрый ответ:`, and any `TldrBlock`, is an AEO/GEO answer block designed by the owner. In Part 2 never rewrite, shorten, merge or remove it. If the cadence checker flags it, leave it. Check before commit: `git diff -U0 origin/main -- src/content | grep -E '^[-+].*(Quick answer|Short answer|Strongest fit|Быстрый ответ|TldrBlock)'` must only show lines that Part 1 restored verbatim from e437751, and nothing from Part 2.

## Frozen files (do not touch in either part)

- `src/content/guides/portugal-property-under-300000-euros.mdx`
- `src/content/segments/australian-buyers-portugal-property.mdx`

They are in the running content-os cadence pilot (`content-engine/experiments/cadence-pilot-2026-09-22.json`). Leave them byte-identical to origin/main. List them in the report.

## Read first

`CLAUDE.md`, `.claude/rules/` if present, content-os `skills/seo-aeo-geo-humanizer/SKILL.md` (cadence section and the Quick answer rule).

## Part 1: restore text, keep R2 images

For every file in `modified-113.txt` except the frozen ones:
1. Take the text from `e437751`.
2. Keep every image reference exactly as on origin/main (heroImage, inline images, component image props, all R2 URLs). Method: start from the e437751 version and replace each old Cloudinary URL with the R2 URL origin/main uses at the same position; `git show 91fa288` / `4363c33` diffs give the mapping, as does any r2 migration report in scripts/. After this step, `git diff origin/main` for a file must show only text lines changed, never an image line.
3. For image-only files the result must be byte-identical to origin/main.
4. Keep any frontmatter field added after e437751 by non-content commits if the schema needs it (build must pass).

Delete the 65 files in `returned-65.txt`. Before deleting, confirm each has a redirect in the redirect config (vercel.json / astro config / public/_redirects). If any lacks one, add a 301 to the successor it redirects to on the live site today (Hermes saw e.g. `/areas/albufeira-property-investment/` 301 to `/property-for-sale/albufeira/`).

Verify Part 1 before going on (paste in PR):
- 0 `res.cloudinary.com` in src/content.
- Set of R2 URLs in src/content identical to origin/main minus images only used on deleted files (list them).
- For each restored file: text (ignoring image lines) equals e437751.
- Dash file count back to around 0.

Commit Part 1 separately.

## Part 2: AI cadence cleanup

Run `node scripts/cadence-check.mjs --all`, save to `.content-os/batches/cadence-before-2026-09-23.txt`. For every flagged page (except frozen) rewrite ONLY the sentences carrying a flagged marker: antithesis "not X, but Y" (keep 1 to 2 per page where the contrast is the point), metronome paragraph endings, parallel sentence starts, colon hooks, superlative openers. Do not introduce a new repeated pattern.

Do NOT touch the first-paragraph direct answer or any Quick answer / Short answer / Strongest fit / TldrBlock block (see HARD RULE). Do not "reduce template intros".

Must NOT change: any number, price, percentage, date, name, legal reference, source; title, description, H1 to H3, slugs, frontmatter (except `updatedDate: 2026-09-23` on pages whose text changed in Part 2), image URLs, links, FAQ questions. No em dash, en dash or " -- ".

Commit Part 2 separately.

## Verify before PR (paste results into the PR body)

1. `node scripts/cadence-check.mjs --all`: before/after counts, 0 hard violations. Target: at least 80% of flagged pages clean.
2. Number integrity for Part 2: for every file changed in Part 2, the multiset of number tokens before vs after Part 2 is identical.
3. Link integrity: same for `](...)` targets and `href`.
4. Quick answer check from HARD RULE: 0 Part 2 lines.
5. `npm run validate:content` passes. `npm run validate:batch` if applicable.
6. `node more-group-content-os/scripts/batch-fact-check.mjs --changed --base origin/main` and `node more-group-content-os/scripts/content-preflight.mjs --changed --base origin/main`: 0 errors.
7. `npm run build` passes (including image gate).
8. No `—`, `–`, ` -- ` in src/content.
9. Frozen files byte-identical to origin/main.
10. Fresh-context review subagent on 10 changed pages: natural reading, no meaning change, no new pattern. Fix what it finds.

## Deliver

Commit with author max-diver999 <maks.shchegolev@gmail.com>. Push branch, open PR to main: `fix(portugal): undo 20 Sep text rollback, keep R2 images, clean cadence`. Write `.content-os/batches/restore-cadence-report-2026-09-23.md`. Also write `.content-os/batches/reindex-urls-2026-09-23.txt` with the live URLs of every page whose text changed (not deleted ones).

GitHub: one action at a time, no polling loops, no `--watch`. If GitHub answers 403/429/rate limit, stop and write it in the report.

Do NOT merge, deploy or submit to search engines. Hermes reviews and merges.
