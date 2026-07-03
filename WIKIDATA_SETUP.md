# Portuguese Estate — Wikidata Entity Creation

> **Контекст:** P1 task из SEO-аудита. Wikidata entity = AEO boost для цитирования в ChatGPT/Perplexity/Claude.

## Шаг 1: Создать аккаунт (если нет)

1. https://www.wikidata.org/
2. "Create account" → заполнить форму

## Шаг 2: Создать новый Item

URL: https://www.wikidata.org/wiki/Special:NewItem

### Основная информация

| Поле | Значение |
|---|---|
| **Language** | English |
| **Label** | Portuguese Estate |
| **Description** | Independent Portugal property investment research platform for foreign buyers |
| **Also known as** | Portuguese Estate, portuguese-estate.com |

## Шаг 3: Добавить Statements (свойства)

После создания, на странице entity добавить:

| Property | Value | Notes |
|---|---|---|
| instance of (P31) | **organization (Q43229)** | или website (Q35127), оба подходят |
| country (P17) | **Portugal (Q45)** | focus market |
| official website (P856) | https://portuguese-estate.com | |
| inception (P571) | **2026** | |
| industry (P452) | **real estate (Q10538834)** | |
| topic's main category (P910) | real estate investment | |
| main subject (P921) | Portugal property market | |
| official language (P37) | **English (Q1860)** | |
| language used (P2936) | English, Italian | contact point |
| email address (P968) | info@portuguese-estate.com | |
| described at URL (P973) | https://portuguese-estate.com/about/ | |

## Шаг 4: После создания

1. **Скопировать Q-номер** (например `Q123456789` или что получится)
2. **Прислать мне Q-id** → я обновлю `BaseLayout.astro`
3. Подождать 24-48 часов для индексации Wikidata

## Шаг 5: Проверка после индексации

```bash
# Google Knowledge Graph API
curl -s "https://kgsearch.googleapis.com/v1/entities:search?query=Portuguese%20Estate&key=YOUR_KEY&limit=10&indent=True"

# Wikidata entity page
https://www.wikidata.org/wiki/QXXXXXXX
```

## Зачем это нужно (AEO context)

| AI-модель | Как использует Wikidata |
|---|---|
| ChatGPT | Верификация entity → цитирование в ответах |
| Claude | Knowledge graph для контекстной выдачи |
| Perplexity | Source authority → приоритет в списках источников |
| Google SGE | Wikidata → Knowledge Graph → featured snippets |

**Эффект:** site:portuguese-estate.com в AI-поисковиках появится раньше конкурентов без Wikidata.

## Альтернативные значения для `instance of (P31)`

Если organization (Q43229) не подходит по UI, попробовать:

- **website (Q35127)** — если Wikidata считает что это скорее веб-ресурс
- **information source (Q24634210)** — если акцент на research platform
- **business (Q4830453)** — общее определение

Главное чтобы property-набор был заполнен, `instance of` можно уточнить потом.

---

**После получения Q-id от Максима:** я обновлю `src/layouts/BaseLayout.astro` → добавлю `https://www.wikidata.org/entity/QXXXXXXX` в `sameAs`.
