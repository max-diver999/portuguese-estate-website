# Claude Code — Phase 0 start (Portuguese Estate)

Copy the block below into a **new Claude Code session** after `git pull` on `main` + submodule init.

---

## Сообщение для Claude (Фаза 0 — аудит)

```
Pull main + git submodule update --init more-group-content-os.

Сайт: portuguese-estate.com (EN). Content OS pilot — 126 MDX: guides 63, areas 26, compare 14, segments 13, projects 7, developers 3.

Прочитай по порядку:
- .content-os/STATUS.md, site-passport.yaml, pilot-lock.json
- more-group-content-os/programs/portuguese-estate.yaml
- docs/PRIORITY-CTR-LEADS.md, docs/CONTENT_QUALITY_AUDIT.md
- more-group-content-os/analytics-snapshots/portuguese-estate-website/2026-08-21.json
- /site-report/ (если есть свежие метрики)

Базовые цифры (локально уже прогнано):
- validate:content --all → 126/126 pass
- geo:audit → commercial avg 67/100 (C), 103 файла ниже минимума; слабые rubric: unique 36, self 65, answer 68
- GSC: IMT non-resident (798 imp), property under 300k, RNAL, property management cost; hub /guides/ pos ~73

Задача: полный аудит сайта + roadmap улучшений + план будущего контента. Массовые правки и новые статьи — только после «ок» от Максима.

Фаза 0 — четыре блока, потом СТОП:

A) КОРПУС (все 126 MDX)
- Golden Visa legacy vs D7/D8; IMT/AIMI; RNAL/STR; areas; segments (DE buyers); compare hubs
- Каннибализация, orphans, дубли FAQ/schema, consultation bridges
- Ожидай boilerplate как у Greece до remediation — приоритет unique/answer blocks
- npm run geo:audit + qa:corpus на выборке и full scan plan

B) RENDERED HTML
- npm run build && npm run audit:rendered:fail && npm run qa:full:quick
- Lead forms, tier pages, consultation funnel

C) КОД / UX
- Hubs (guides, areas, segments), nav, breadcrumbs, internal link graph
- Сравни с greek-invest-website (post-audit) и florida-estate-website (hub UX)
- CODE-AUDIT.md + code-improvements-roadmap.md

D) GSC / CTR
- Приоритеты из snapshot: IMT 2026, property management cost, RNAL, /guides/ hub
- topics-proposal.json — только proposals, без новых slug

Артефакты на ветке cc/portugal-audit-* (в .content-os/reports/):
- AUDIT-REPORT.md
- CODE-AUDIT.md
- corpus-cleanup-roadmap.md (волны, ~сколько статей)
- code-improvements-roadmap.md
- content-roadmap.md
- topics-proposal.json

Жёсткий СТОП после отчётов:
- не массово править MDX
- не менять Astro/layout без отдельного ok
- не push main, не деплой, не индексация

В конце: 1 страница executive summary для Максима + список «что делаем первым после ok».
```

---

## After Maxim says «ок»

1. Corpus cleanup waves (GEO → 75+ target on commercial pages)
2. Hub UX + link graph (Florida patterns)
3. SERP briefs → new articles from topics-proposal.json
4. Cursor: validate + qa:full + PR + deploy
