# IMT Guide Snippet A/B Test Plan

**URL:** https://portuguese-estate.com/guides/imt-tax-non-resident-portugal-2026/

## Baseline (current, 7+ days live)

| Metric | Value | Period |
|---|---|---|
| Position | 5.4 | Jun 5 - Jul 1 |
| Impressions | 94 | Jun 5 - Jul 1 |
| Clicks | 4 | Jun 5 - Jul 1 |
| **CTR** | **4.26%** | Jun 5 - Jul 1 |

### Current snippet

```yaml
title: "Portugal IMT for Non-Residents — 7.5% Flat Rate 2026"
description: "Non-resident IMT flat 7.5% from Sep 2026 (DL 97/2026). Worked €400k examples, refund rules, resident bands — Lisbon and Algarve."
```

**Strengths:**
- Цифра 7.5% в начале
- Закон DL 97/2026 (authority)
- Concrete example €400k
- Refund hint

**CTR expectation for position 5.4:** ~8-12% (organic baseline). **Current 4.26% = underperforming.**

## A/B Variants (test 14-21 days each)

### Variant A: Urgency + Savings

```yaml
title: "Portugal IMT 7.5% Non-Resident — Sep 2026 Tax Calculator"
description: "€30,000 tax on €400k from Sep 2026 (DL 97/2026). Get full refund in 24 months via tax residency. Worked examples Lisbon/Porto/Algarve."
```

**Hypothesis:** Leading with concrete €30k figure creates urgency. "Get full refund" = actionable benefit.

### Variant B: Comparison Frame

```yaml
title: "Portugal IMT Non-Resident 2026 — 7.5% Flat vs Resident 0-6%"
description: "Non-residents: 7.5% flat from Sep 2026. Residents: 0-6% progressive (DL 97/2026). €400k examples, refund path, timing strategy."
```

**Hypothesis:** Explicit vs-resident comparison attracts buyers weighing residency. "Timing strategy" = click for detail.

### Variant C: Solution-First

```yaml
title: "IMT Refund Portugal — Get Back 7.5% in 24 Months"
description: "Non-residents pay 7.5% IMT upfront (DL 97/2026). Become tax resident within 24 months = full refund. €400k case, documents, timeline."
```

**Hypothesis:** "Get Back" reframes cost as recoverable. Targets buyers already committed, looking for refund mechanics.

## Success Criteria

| Metric | Baseline | Target (Variant) | Method |
|---|---|---|---|
| CTR | 4.26% | ≥6.5% (+50% lift) | GSC 14-21 days post-change |
| Clicks | 4 | ≥9 | Same period comparison |
| Position | 5.4 | ±0.5 | Control for SERP volatility |

**Minimal viable sample:** 100+ impressions per variant (21 days @ current 4.5 imp/day).

## Rollout Plan

1. **Week 1-2 (now):** Collect more baseline data (current snippet stays)
2. **Week 3-4:** Deploy Variant A, monitor GSC daily
3. **Week 5-6:** If A < baseline, test Variant B. If A > baseline, keep A and test C against A.
4. **Winner:** Keep best-performing snippet, document lift for other guides.

## Risk: Low Volume

- Site launched May 2026, only 94 impressions in 27 days = **3.5 imp/day**
- Need 21 days @ 3.5/day = only **73 impressions per variant**
- Statistical significance requires 100+ impressions minimum

**Mitigation:** Run variant for 30 days (not 14) to reach 100+ impressions, or wait until September when site has more authority and volume.

## Next Step

**Defer A/B test to September 2026** when:
- Site has 3+ months of authority
- IMT guide reaches 10+ imp/day (300/month)
- Can reach statistical significance in 14 days

**OR deploy Variant A now as "best guess"** if Maksim wants immediate action, knowing that confirmation will take 30 days.
