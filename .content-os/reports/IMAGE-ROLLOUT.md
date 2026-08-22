# Hero image rollout — 126 unique images, ready for Cloudinary

**Date:** 2026-08-22
**Manifest:** `scripts/portugal-commons-images.json`
**Source:** Wikimedia Commons
**Status:** sourced and verified. **Not yet applied to the MDX** — Cloudinary upload comes first.

---

## What this replaces

| | Before | After |
|---|---|---|
| Distinct hero images | **10** | **126** |
| Pages sharing one photo | **49** on a single image | **0** |
| Hosting | Hotlinked from `vangproperties.com`, `sonaesierra.com`, `pinheirinhocomporta.com` | Cloudinary (after upload) |
| Region accuracy | A Lisbon tower headed both Albufeira and Aveiro | Each page shows its own place |
| Licence | None — third-party CMS files used without permission | CC BY / CC BY-SA / CC0 / PD, attribution captured |

---

## What was enforced during sourcing

Each of these is checked in `scripts/source-commons-images.mjs`, not assumed:

- **Every URL fetched and required to return HTTP 200** at generation time
- **Minimum 1600px** on the long edge — actual range in the manifest is 2048–12000px
- **Aspect ratio 1.2–2.2** — landscape, but no stitched panoramas (an early run returned a 24992×5035 strip)
- **Commercial-reuse licences only** — CC0, Public Domain, CC BY, CC BY-SA
- **No file used twice** — 126 slugs, 126 distinct Commons files
- **Country guard via Commons categories.** Free-text search collides badly on place names: it returned Phuket for a Portuguese price guide, Porto Alegre in Brazil for a Porto yield guide, and the Grand Lisboa in **Macau** for a Lisbon developer page. Candidates must be categorised in Portugal and must not be categorised elsewhere.
- **Municipality guard on place pages.** "Faro" matched *Faro de Santa Marta*, a lighthouse in Cascais. "Alcântara" matched *Miradouro de São Pedro de Alcântara*, which is in Bairro Alto. All 33 place pages pin the correct municipality.
- **Capture year ≥ 2005** — removes paintings, engravings and archive scans. An early run picked a 19th-century oil painting of Lisbon for the IMT guide.
- **Subject filter** — rejects graffiti, statues, museum interiors, transport infrastructure, food, festivals, dereliction and single objects. The first full run produced a motorway bridge for Albufeira, a beer festival for Braga and a tree for Marvila.

## Licence mix

| Licence | Count |
|---|---|
| CC BY-SA 4.0 | 34 |
| CC BY 2.0 | 28 |
| CC BY-SA 2.0 | 20 |
| CC BY-SA 3.0 | 15 |
| CC BY 4.0 | 14 |
| CC0 | 7 |
| CC BY 3.0 | 3 |
| CC BY-SA 3.0 (cz/de) | 3 |
| Public domain | 2 |

**117 of 126 require visible attribution.** Only the CC0 and public-domain images do not.

---

## Rollout steps

### 1. Upload to Cloudinary

Each manifest entry carries `url` (a 2000px-wide Commons thumbnail) and `originalUrl` (full resolution). Upload the original where you want maximum quality, otherwise the 2000px rendition is already sized for a hero.

Suggested public ID: `portuguese-estate/hero/<slug>`.

The repo already has `npm run images:upload:content`, but that script is wired to the old Mexico manifest (`scripts/upload-mexico-cloudinary.py`) and expects a different shape. Either point it at this manifest or upload directly — the JSON is deliberately simple.

### 2. Rewrite `heroImage` in the MDX

126 frontmatter fields, one per slug, pointing at the Cloudinary URL. **Do not point them at the Commons URLs** — that would just move the hotlinking from one third party to another.

### 3. Render attribution

`credit`, `licence` and `sourcePage` are in the manifest for every image. CC BY-SA requires the credit to be visible to the reader — a small caption under the hero, or a page-level credits line, both satisfy it. A `<meta>` tag does not.

Suggested caption format:

```
Photo: {credit} · {licence} · via Wikimedia Commons
```

### 4. Re-arm the gate

Once Cloudinary URLs are in place, add a `heroImage` check to the content gate: host must be `res.cloudinary.com`, and no two files may share a URL. That closes the hole that let one photo reach 49 pages.

---

## Alt text

`alt` is generated **after** sourcing, from the Commons file title plus the page context:

> `Algarve Coast near Albufeira — Albufeira, Algarve`

This ordering is deliberate. The first draft wrote alt text before knowing which image would be selected, which produced alt describing the article rather than the photograph — on the off-plan guide it would have described "new-build residential stock" under a photograph of a castle.

---

## Known limitations

- **These are location photographs, not property photography.** They are accurate to the place and correctly licensed, but they are not interiors, developments or the specific buildings a listing would show. For the seven `projects` pages in particular, developer-supplied photography of the actual scheme would be better; the manifest gives each one its correct parish instead.
- **Verified at generation time.** Commons URLs are stable, but re-run `node scripts/source-commons-images.mjs` before the upload if significant time has passed.
- **Not applied to MDX.** The corpus still points at the old hotlinked URLs until step 2 runs.

---

## Re-sourcing

To replace individual images without disturbing the rest:

```bash
node scripts/source-commons-images.mjs --replace=slug-one,slug-two
```

Existing picks are carried forward and their files stay reserved, so uniqueness is preserved. Search terms and per-page guards live in `scripts/lib/commons-queries.mjs`.
