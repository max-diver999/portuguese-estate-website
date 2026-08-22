# Hero images — 127 unique photographs, live in the corpus

**Date:** 2026-08-22
**Manifest:** `scripts/portugal-commons-images.json`
**Source:** Wikimedia Commons
**Status:** sourced, applied to all 126 MDX files and the homepage, and enforced by two gates.

---

## What changed

| | Before | After |
|---|---|---|
| Distinct hero photographs | **10** | **127** |
| Pages sharing one photograph | **49** on a single image | **0** |
| Hosting | Hotlinked from `vangproperties.com`, `sonaesierra.com`, `pinheirinhocomporta.com` | `upload.wikimedia.org` (Cloudinary after upload) |
| Licence | None — third-party CMS files used without permission | CC BY / CC BY-SA / CC0 / PD, credit rendered on the page |
| Alt text | Empty `alt=""` on every hero | Describes the photograph and the page subject |
| Homepage hero | The featured project's own photograph | Its own Lisbon panorama |

126 photographs belong to the 126 content pages; the 127th is the homepage hero.

---

## Why a third round was needed: accurate is not attractive

The second round fixed duplication and got every page its own correctly-located,
correctly-licensed photograph. It still shipped the wrong pictures. Wikimedia Commons
is strongest where volunteers document buildings for the record, so "a photograph of
Porto" resolves to a grey 1970s housing block far more readily than to a beach — and a
site selling €660,982 property was illustrating a tax guide with wet concrete.

Attractiveness is now measured rather than eyeballed, in `scripts/lib/image-aesthetics.mjs`:

| Metric | Bar | What it catches |
|---|---|---|
| Colourfulness (Hasler & Süsstrunk) | ≥ 38 | Grey façades, overcast documentary shots |
| Grey mass (share of desaturated pixels) | ≤ 0.55 | Concrete blocks, car parks |
| Brightness (mean value channel) | 0.42–0.95 | Murky, underexposed, blown-out frames |
| Subject blacklist | regex | Courthouses, metro stations, social housing, night shots |
| Subject bonus | regex | Beach, coast, cliff, villa, pool, marina, terrace, vineyard, aerial |

**The metric is necessary and not sufficient.** The concrete block from the reported
screenshot passes it: a deep blue sky supplies the colourfulness and the pale façade the
brightness. Ten further heroes cleared every number and were still wrong for the site —
a photograph of the Moon on a developer page, a jeep-safari snapshot, a bank façade, a
university building, an old town hall. Those were re-picked by subject, by hand. Treat
the numbers as a floor that catches the grey half of the corpus automatically, and the
subject judgement as the part that still needs a person.

Scored against the second image set, **58 of 121 measurable heroes failed** — the concrete
blocks the metric was built to catch. Those, plus 11 unmeasurable, were re-sourced against
curated Commons categories (`cat:Beaches of Albufeira`, `cat:Marinas in Portugal`,
`cat:Villas in Portugal`) instead of free-text search.

Two mechanical faults were fixed in the same pass:

- **`--slug=` was destructive.** It rewrote the manifest down to the single slug being
  debugged. It now carries the rest forward like `--replace`.
- **Perceptual dedup read a stale cache.** Entries written before the hash field existed
  returned `hash: undefined`, which silently disabled the near-duplicate check and let
  three pages take three frames of the same coastal walk. A cached entry without a hash
  is now a cache miss.
- **Measurement fetched a 640px rendition** that Commons returns HTTP 400 for on many
  files, so every measurement failed silently and every candidate was rejected. Measuring
  runs on the same 1280px rendition the site serves.

## Why a second round was needed

The first pass produced 126 distinct *files* and I reported it as done. It wasn't.
Distinct files are not distinct pictures. Free-text Commons search kept resolving
loosely-related terms to the same handful of viewpoints, and the fallback terms
("Porto vista cidade", "Lisboa vista cidade") pulled eleven pages into two clusters:

- five frames of the **Vista da Cidade do Porto** series across five unrelated guides
- three **Castelo de São Jorge** shots
- three views of **Porto from Vila Nova de Gaia**
- two **Tram 28** frames, two **Nazaré** frames, two **Lisboa panorâmica I/II** frames

Plus outright wrong subjects that every filter had missed: a **Mercedes C-Class** on
the CPCV deposit guide, and the **Mercado Adolpho Lisboa in Manaus, Brazil** on the
Angolan buyers page (the country guard matched the word "Lisboa" in the market's name).

28 images were re-picked by hand and pinned; a 29th was sourced for the homepage.

## How duplicates are detected now

`npm run audit:images:unique` downloads every hero, reduces it to a 9×8 greyscale and
computes a 64-bit difference hash. Any two pages whose heroes are within 12 bits fail.
Hashes cache in `.content-os/cache/hero-image-hashes.json`.

The closest surviving pair is **13 bits apart** (two different Lisbon tower blocks).
Exact duplicates score 0–5, so there is real headroom.

## What is enforced, and where

| Check | Gate | Runs |
|---|---|---|
| Two MDX files sharing a `heroImage` | `validate:content` | every content change |
| `heroImage` host is Cloudinary or Wikimedia | `validate:content` | every content change |
| Missing `heroImageAlt` | `validate:content` | every content change |
| Missing credit on a licence that requires one | `validate:content` | every content change |
| One photograph rendered on two content pages | `postbuild` | every build |
| Every image URL returns HTTP 200 | `audit:images` | on demand (network) |
| Hero clears the attractiveness bar | `audit:images:unique` | on demand (network) |
| No two heroes *look* alike | `audit:images:unique` | on demand (network) |

The rendered check exists because the frontmatter check cannot see a URL hard-coded in
a component or a data file — which is exactly how the homepage came to display a
project's hero as its own.

## Sourcing rules

Enforced in `scripts/source-commons-images.mjs`, not assumed:

- Every URL fetched and required to return HTTP 200 at generation time
- Minimum 1600px on the long edge (actual range 1600–11656px)
- Delivered at a fixed **1280px** width. Commons rejects arbitrary thumbnail widths, so
  the URL is built deterministically from the file name
- Aspect ratio 1.2–2.2 — landscape, but no stitched panoramas
- Commercial-reuse licences only: CC0, public domain, CC BY, CC BY-SA
- No file used twice across all 127 slugs
- Country guard via Commons categories, now including Brazilian and Angolan place names
- Municipality guard on all 33 place pages
- Capture year ≥ 2005 — removes paintings, engravings and archive scans
- Subject filter — rejects graffiti, statues, museum interiors, transport infrastructure,
  food, festivals, dereliction and single objects
- `pin:` in `scripts/lib/commons-queries.mjs` names an exact file where search cannot be
  trusted. 29 pages use one

## Licence mix

| Licence | Count |
|---|---|
| CC BY-SA 4.0 | 38 |
| CC BY 2.0 | 25 |
| CC BY-SA 2.0 | 23 |
| CC BY 4.0 | 20 |
| CC BY-SA 3.0 | 9 |
| CC0 | 6 |
| CC BY 3.0 | 3 |
| CC BY-SA 3.0 (de) | 1 |
| CC BY-SA 3.0 (cz) | 1 |
| Public domain | 1 |

**120 of 127 require visible attribution.** All 127 carry it: `ArticleLayout` renders a
`<figcaption>` under the hero linking the photographer to the Commons file page, and the
homepage renders the same credit in its hero caption. A `<meta>` tag would not satisfy
CC BY-SA; a caption does.

---

## Cloudinary migration

The images are on Wikimedia's own CDN, which permits hotlinking — unlike the developer
CMSs the site was using before. Moving them to Cloudinary is a performance and control
decision, not a licensing one, so it is no longer urgent.

When you do it:

1. Upload from the manifest. Each entry carries `url` (1280px, what the site serves) and
   `originalUrl` (full resolution). Suggested public ID: `portuguese-estate/hero/<slug>`.
   `npm run images:upload:content` still points at the old Mexico manifest — repoint it or
   upload directly; the JSON is deliberately flat.
2. Rewrite `heroImage` in the MDX and `HOMEPAGE_HERO_IMAGE` in `src/data/featured.ts`.
   `node scripts/apply-hero-images.mjs` does the MDX half once the manifest holds
   Cloudinary URLs.
3. Keep `heroImageCredit`, `heroImageLicence` and `heroImageSource` unchanged — the licence
   obligation follows the photograph, not the host.
4. Narrow `ALLOWED_IMAGE_HOST` in `scripts/qa-audit.mjs` to `res.cloudinary.com` only.

## Known limitations

- **These are location photographs, not property photography.** Accurate to the place and
  correctly licensed, but not interiors, developments, or the specific buildings a listing
  would show. For the seven `projects` pages, developer-supplied photography of the actual
  scheme would be better; the manifest gives each one its correct parish instead.
- **Verified at generation time.** Commons URLs are stable, but re-run
  `npm run audit:images` before any long-delayed deploy.

## Re-sourcing one page

```bash
node scripts/source-commons-images.mjs --replace=slug-one,slug-two
```

Existing picks are carried forward and their files stay reserved, so uniqueness holds.
Search terms, municipality guards and pinned files live in `scripts/lib/commons-queries.mjs`.
