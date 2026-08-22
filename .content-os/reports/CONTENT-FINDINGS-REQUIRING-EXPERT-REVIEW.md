# Content findings requiring a Portuguese tax professional

**Date:** 2026-08-22 · **Raised during:** post-audit cleanup
**Status:** NOT changed by Claude — deliberately left alone

These are substantive tax positions, not typos. Each one is stated consistently
across a page's description, TL;DR, FAQ schema, body and worked examples, so a
partial correction would leave the page internally inconsistent in a new way.
They need a Portuguese tax professional to settle, then a single coordinated edit.

---

## 1. Capital gains for non-residents — possibly the pre-2023 position (P0)

**File:** `src/content/guides/portugal-capital-gains-tax-property.mdx`

The guide states throughout that non-residents pay **28% flat on the full gain**:

| Location | Claim |
|---|---|
| `description` | "28% flat for non-residents, 50% inclusion for residents" |
| FAQ (line 20) | "Non-residents pay a flat 28% tax rate on the capital gain… regardless of how long you owned" |
| Quick Answer (line 45) | "Non-residents pay 28% on the capital gain" |
| TL;DR (line 47) | "Non-residents: 28% on gain after allowable costs" |
| H3 (line 53) | "Non-Resident Rate: 28% Flat" |
| Worked example (line 181) | "Tax due: €47,000 × 28% = €13,160" |

**The concern:** multiple 2026 sources state that since 2023 non-residents receive
**the same 50% exclusion as residents**, so only half the gain is taxable, at
progressive rates — putting effective rates around 6–24% rather than a flat 28%
on the whole gain. If that is right, the guide overstates the liability
materially, on the site's own exit-tax page.

**Also internally inconsistent already:** the FAQ at line 36 describes a
€500,000 → €631,500 sale (a €131,500 gain) as producing "a taxable gain of
around €53,000", which is neither the full gain nor 50% of it. Something in the
worked examples does not reconcile with the stated rule.

**Why it was not corrected here:** the rate, the base, the inclusion percentage
and the election between flat and progressive rates interact. Getting one of
them right and the others wrong on a page people use to size an exit is worse
than leaving a consistent-but-dated position in place for one more review cycle.

---

## 2. Capital gains filing deadline and form (P1 — clearer, but same page)

**File:** same

FAQ (line 34): *"Non-residents must file and pay within 31 days of the sale
completion. Residents include gains in their annual IRS return, due by July
31st…"*

Sources consistently describe a different process: property gains are declared
in the **annual Modelo 3 return, Anexo G**, filed between **1 April and 30 June**
of the year following the sale — for residents and non-residents alike. No
31-day filing obligation for CGT appears in any source consulted. The 31-day
figure may be a confusion with the Modelo 1 IMT declaration made *before* a
purchase deed.

This one is much clearer cut than finding 1, but it sits in the same FAQ block
and should be corrected in the same pass.

---

## 3. Cross-corpus consistency check needed after 1 and 2 are settled

The 28% figure is not confined to one page. Once the correct position is
confirmed, sweep for it — the flat-28% framing appears in the rental-income and
segment guides too, and only two files in the whole corpus currently mention the
50% exclusion at all.

```bash
grep -rn "28%" src/content --include=*.mdx | grep -i "capital gain\|mais-valia\|CGT"
```

---

## What *was* corrected during cleanup

For contrast — these were unambiguous across sources and have been fixed:

| Fix | Files |
|---|---|
| AIMI payment deadline: was "Modelo 3 by March 31st", is assessed 1 January, noted end of August, **due end of September**, billed separately from IRS | `aimi-wealth-tax-portugal-property` (FAQ + body) |
| D8 visa threshold: €3,040 (4 × 2023 minimum wage) → **€3,680** (4 × €920) | 4 files |
| D7 threshold: €820 / €870 → **€920** (2026 minimum wage) | 5 files, 14 occurrences |
| NHR described as possibly "still available" → closed end-2024, IFICI replaced it | `portugal-golden-visa-real-estate-ended` |

The gate now pins minimum-wage-derived figures (`REGULATORY_STALE` in
`scripts/qa-audit.mjs`), so the January uplift will be caught automatically.
`portugal-residency-options-without-golden-visa` documents the historical
progression on purpose and is exempted by name.

---

## 4. Wave 3 (de-template `projects`) is blocked on source data — not on writing time

**Files:** all 7 in `src/content/projects/`

The measurement stands: 55% shared prose, all 21 file pairs above 69% 5-gram
similarity, roughly 420 unique words per review.

**What was tried and reverted.** Extracting the two verbatim closing sections
("Mortgage, payment schedule and foreign buyer timing", "National market context
for project underwriting") into a shared Astro component. It was reverted for
two reasons:

1. **It does not fix the SEO problem.** A shared component still renders the same
   paragraphs into all seven pages. Google sees the rendered HTML, so measured
   duplication in the output is unchanged. It is a maintainability win only.
2. **It breaks the content gate.** Body word count fell from ~1,530 to ~1,060
   against a 1,200-word minimum for the collection, because the gate counts MDX
   source words and the extracted prose no longer lives there.

**What Wave 3 actually needs, and why it was not done here:** the fix is to
replace shared prose with project-specific substance — real unit mix, current
developer price list, actual delivery status and longstop dates, parish-level
comparables, the specific condominium and AL position for that building.

None of that is in the repository, and it cannot be inferred. These are seven
real developments — Infinity, Castilho 203, Tomás Ribeiro 79, Terraços do Monte,
Mar Adentro, Six Senses Comporta, Carvalhido — and writing plausible-sounding
unit mixes or price points for them would be fabrication about identifiable
third-party projects. That is worse than boilerplate.

**To unblock:** supply, per project, the developer price list or fact sheet, the
current delivery status, and the unit schedule. With those, each review can carry
~1,200 genuinely distinct words and duplication falls below 15% without touching
the shared national context.

**Note on sequencing:** `six-senses-comporta` is a GSC page (position 9.1), so it
should be rewritten last and tracked before/after, per the corpus roadmap.

**Also worth deciding:** whether the 1,200-word minimum should measure rendered
output rather than MDX source. As written, the gate rewards storing duplicated
prose in every file — the same class of mismatch as the title-length check, which
validated frontmatter while the layout appended a brand suffix.
