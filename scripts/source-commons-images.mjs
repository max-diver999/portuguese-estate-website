#!/usr/bin/env node
/**
 * Source one unique, freely-licensed hero image per content page from Wikimedia
 * Commons.
 *
 * Why: all 126 pages previously shared 10 images hotlinked from third-party
 * developer sites (one photo appeared on 49 pages, several showed the wrong
 * region, and they now return 403). This produces a manifest of distinct,
 * correctly-licensed, region-appropriate images ready for the Cloudinary upload.
 *
 * Guarantees enforced here, not assumed:
 *   - every image URL is fetched and must return HTTP 200
 *   - minimum 1600px on the long edge
 *   - licence must be on the allowlist (CC0 / PD / CC BY / CC BY-SA)
 *   - no file is used twice anywhere in the corpus
 *   - author and licence are captured so attribution can be rendered
 *
 * Usage:
 *   node scripts/source-commons-images.mjs            # resolve + verify + write
 *   node scripts/source-commons-images.mjs --slug=x   # single slug, for debugging
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUERIES } from './lib/commons-queries.mjs';
import {
  imageAesthetics,
  passesAestheticBar,
  AESTHETIC_BAR,
  UNATTRACTIVE_SUBJECT,
  ASPIRATIONAL_SUBJECT,
  perceptualHash,
  hashDistance,
  NEAR_DUPLICATE_BITS,
} from './lib/image-aesthetics.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts', 'portugal-commons-images.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'portuguese-estate-image-sourcing/1.0 (https://portuguese-estate.com; info@portuguese-estate.com)';

const MIN_WIDTH = 1600;
const THUMB_WIDTH = 2000;
/** Commons rejects arbitrary thumbnail widths; 1280 is on its allowed list. */
const DELIVERY_WIDTH = 1280;

/** Licences that permit commercial reuse with attribution. */
const ALLOWED_LICENCE = /^(CC0|CC BY(-SA)? [\d.]+|Public domain|PDM [\d.]+|CC BY(-SA)? [\d.]+ [a-z]{2}|No restrictions)/i;

/**
 * Commons search surfaces a lot of material that is technically "about" a place
 * but useless as a property-page hero: graffiti, statues, plaques, museum
 * interiors, food, vehicles, festival crowds, close-up details. Reject those.
 */
const REJECT_TITLE =
  /\b(map|mapa|logo|flag|bandeira|coat of arms|bras[aã]o|diagram|chart|seal|icon|svg|blank|graffiti|grafite|mural|street ?art|statue|est[aá]tua|sculpture|escultura|plaque|placa|sign(post)?|tomb|t[uú]mulo|grave|cemet|interior|museum|museu|exhibition|exposi[cç][aã]o|portrait|retrato|festival|parade|prociss[aã]o|carnival|concert|match|stadium|car|bus|train|tram detail|locomotive|aircraft|food|dish|prato|menu|book|stamp|coin|banknote|document|close-?up|detail|detalhe|fountain detail|door detail|window detail|tile detail|MNAz|Grande Panorama|painting|pintura|quadro|gravura|engraving|lithograph|litografia|postcard|bilhete postal|postal antigo|drawing|desenho|illustration|ilustra[cç][aã]o|maquete|scale model|miniature|reproduction|reprodu[cç][aã]o|manuscript|azulejo panel|painel de azulejo)\b/i;

/**
 * Dereliction and building sites read as a warning on an investment page. Only
 * allowed when the search term deliberately asks for them (the scams guide does).
 */
/**
 * Subjects that pass every other filter but make a poor property hero: transport
 * infrastructure, people-centred snapshots, produce, single objects. The first
 * full run surfaced a motorway bridge for Albufeira, a beer festival for Braga
 * and a tree for Marvila.
 */
const WEAK_SUBJECT =
  /\b(motorway|highway|bridge over|railway|linha do|viaduct|roundabout|rotunda|parking|car park|port cranes|industrial|warehouse|petrol|antenna|pylon|substation|landfill|quarry|fisherman|pescador|lifeguard|beer|cerveja|fest\b|feira|banana|charcutaria|stairs|escalator|platform|terminal|ferry|autocarro|tree\b|[aá]rvore|storefront|shopfront|caf[eé]lia|lobster|lagosta|farm\b|sidewalk|passeio|metro station|esta[cç][aã]o de metro)\b/i;

const DERELICT = /\b(abandoned|abandonado|derelict|devoluto|ruin|ru[ií]na|demolit|vandal|construction site|scaffold|andaime|boarded[- ]up|dilapidated|decay)\b/i;

/** Words that mark a frame as scenery or architecture — what a hero needs. */
const SCENERY = /\b(view|vista|panorama|aerial|a[eé]rea|skyline|coast|costa|beach|praia|bay|ba[ií]a|riverside|waterfront|marina|harbour|harbor|porto de|street|rua|avenida|square|pra[cç]a|old town|centro hist[oó]rico|architecture|arquitetura|building|edif[ií]cio|houses|casas|rooftops|telhados|castle|castelo|palace|pal[aá]cio|church|igreja|bridge|ponte|landscape|paisagem|countryside|hills|valley|vale|cliffs|falsias|sunset|skyview|from above|overview|geral)\b/i;

/**
 * Broad fallbacks appended to every slug's own terms. Specific terms win when
 * they resolve; these guarantee full coverage without ever reusing a file,
 * because the dedup set spreads results across slugs.
 */
/**
 * Broad fallbacks, deliberately spread across regions and subjects. An earlier
 * list leaned on one "Coasts of Portugal" category, and three pages ended up with
 * three frames from the same photographer's walk.
 */
const FALLBACK = [
  'cat:Beaches of the Algarve',
  'cat:Marinas in Portugal',
  'cat:Villas in Portugal',
  'cat:Aerial photographs of beaches of Portugal',
  'cat:Beaches of Madeira',
  'cat:Beaches of the Azores',
  'cat:Sunsets in Portugal',
  'cat:Swimming pools in Portugal',
  'Algarve praia falesia dourada',
  'Portugal moradia piscina jardim',
  'Portugal vila costeira colorida',
  'Portugal miradouro vista mar',
];

/**
 * Free-text search collides badly on place names: "Lisboa" matched the Grand
 * Lisboa in Macau, "Porto" matched Porto Alegre in Brazil, "Alcantara" matched
 * a Bairro Alto viewpoint, and one query returned Phuket. Commons categories are
 * curated, so use them as the country guard.
 */
const PORTUGAL_CAT = /Portugal|Portuguese|Lisboa|Lisbon|Porto\b|Algarve|Madeira|Alentejo|Douro|Minho|Aveiro|Coimbra|Braga|Cascais|Sintra|Set[uú]bal|Faro District|Leiria|Santar[eé]m|Beja|[EÉ]vora|Viseu|Guarda|Castelo Branco|Viana do Castelo|Vila Real|Bragan[cç]a/i;
const FOREIGN_CAT =
  /Brazil|Brasil|Macau|Macao|Thailand|Spain|Espa\u00f1a|Espanha|Mexico|M\u00e9xico|France(?!sa)|Italy|Italia|Angola|Mozambique|Cape Verde|Goa|Timor|India\\b|China\\b|Japan|United States|Argentina|Uruguay|Colombia|Manaus|Amazonas|Amazon(ia|as)?\\b|Rio de Janeiro|S[a\u00e3]o Paulo|Bahia|Minas Gerais|Recife|Salvador|Bel[e\u00e9]m do Par[a\u00e1]|Luanda|Maputo|Peru|Per[u\u00fa]|Tonatico/i;

const only = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];
/** Re-source a subset: --replace=slug1,slug2 keeps the rest of the manifest intact. */
const replaceList = process.argv.find((a) => a.startsWith('--replace='))?.split('=')[1]?.split(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

/** Human-readable subject from a Commons filename, for alt text. */
function subjectOf(title) {
  return title
    .replace(/^File:/, '')
    .replace(/\.(jpe?g|png|webp)$/i, '')
    .replace(/\s*\(\d{6,}\)\s*$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Candidate files for one search term, best (largest) first. */
async function candidates(term, opts = {}) {
  // "cat:Beaches of Albufeira" reads a curated category; free-text search returns
  // whatever shares a word with the query, which is how a courthouse ended up
  // illustrating a power-of-attorney guide.
  const generator = term.startsWith('cat:')
    ? { generator: 'categorymembers', gcmtitle: `Category:${term.slice(4)}`, gcmtype: 'file', gcmlimit: '200' }
    : { generator: 'search', gsrsearch: `filetype:bitmap ${term}`, gsrnamespace: '6', gsrlimit: '50' };
  const data = await api({
    action: 'query',
    ...generator,
    prop: 'imageinfo|categories',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: String(THUMB_WIDTH),
    cllimit: 'max',
  });
  const pages = Object.values(data?.query?.pages || {});
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const em = ii.extmetadata || {};
      return {
        title: p.title,
        pageid: p.pageid,
        url: ii.thumburl || ii.url,
        original: ii.url,
        width: ii.width,
        height: ii.height,
        mime: ii.mime,
        licence: stripHtml(em.LicenseShortName?.value),
        author: stripHtml(em.Artist?.value) || 'Unknown',
        descriptionUrl: ii.descriptionurl,
        dateRaw: stripHtml(em.DateTimeOriginal?.value || em.DateTime?.value || ''),
        cats: (p.categories || []).map((c) => c.title.replace(/^Category:/, '')).join(' | '),
      };
    })
    .filter(Boolean)
    .filter((c) => /^image\/(jpeg|png|webp)$/.test(c.mime))
    .filter((c) => Math.max(c.width, c.height) >= MIN_WIDTH)
    .filter((c) => ALLOWED_LICENCE.test(c.licence))
    .filter((c) => !REJECT_TITLE.test(c.title))
    // A property site needs contemporary photography. Filtering on the capture
    // year removes paintings, engravings and archive scans in one rule — the
    // title-based artwork filter kept missing things like "escola portuguesa,
    // séc. XIX". Undated files are kept; only a detectably old one is dropped.
    .filter((c) => {
      const m = String(c.dateRaw).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
      if (!m) return !/s[ée]c\.|s[ée]culo|century|escola portuguesa|an[oó]nimo|[oó]leo/i.test(c.title);
      return Number(m[1]) >= 2005;
    })
    // Hero crop: landscape, but not a stitched panorama (Comporta returned a
    // 24992x5035 strip on the first run, which is unusable as a card image).
    .filter((c) => {
      const ratio = c.width / c.height;
      return ratio >= 1.2 && ratio <= 2.2;
    })
    .map((c) => {
      const title = c.title.replace(/^File:/, '');
      // The place or subject must actually appear in the filename. Commons search
      // happily returns loosely-related files otherwise.
      const tokens = term.startsWith('cat:')
        ? []
        : term
            .split(/\s+/)
            .filter((t) => t.length > 3)
            .map((t) => t.toLowerCase());
      const hay = title.toLowerCase();
      // Category membership is itself the subject guarantee, so a category query
      // starts at 1 rather than failing the filename-token test below.
      const matched = tokens.length ? tokens.filter((t) => hay.includes(t)).length : 1;
      const score =
        matched * 10 +
        (ASPIRATIONAL_SUBJECT.test(`${title} ${c.cats}`) ? 14 : 0) +
        (/Quality images|Featured pictures|Valued images/i.test(c.cats) ? 8 : 0) +
        (SCENERY.test(title) ? 6 : 0) +
        Math.min(4, Math.floor((c.width * c.height) / 6e6));
      return { ...c, score, matched };
    })
    .filter((c) => c.matched > 0)
    .filter((c) => !DERELICT.test(c.title) || DERELICT.test(term))
    .filter((c) => !WEAK_SUBJECT.test(c.title))
    // A premium property site cannot illustrate itself with courthouses, metro
    // stations and social housing, however well those photograph.
    .filter((c) => !UNATTRACTIVE_SUBJECT.test(`${c.title} ${c.cats}`))
    // Must be categorised in Portugal, and must not be categorised elsewhere.
    .filter((c) => PORTUGAL_CAT.test(c.cats) || /Portugal/i.test(c.title))
    .filter((c) => !FOREIGN_CAT.test(c.cats) && !FOREIGN_CAT.test(c.title))
    // Place pages pin the municipality: "Faro" otherwise matched "Faro de Santa
    // Marta", a lighthouse in Cascais, and "Alcantara" matched a Bairro Alto
    // viewpoint named Miradouro de São Pedro de Alcântara.
    .filter((c) => !opts.requireCat || opts.requireCat.test(`${c.cats} ${c.title}`))
    .filter((c) => !opts.rejectCat || !opts.rejectCat.test(`${c.cats} ${c.title}`))
    .sort((a, b) => b.score - a.score);
}

/**
 * Commons search is a blunt instrument. Some pages need a specific file — either
 * because search kept returning the wrong country (a Manaus market for an Angolan
 * buyer guide) or because two pages ended up with two frames of the same view.
 * `pin` in commons-queries.mjs names the file; this fetches it directly and still
 * runs the licence and size checks.
 */
async function pinnedCandidate(title) {
  const data = await api({
    action: 'query',
    titles: title,
    prop: 'imageinfo|categories',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: String(THUMB_WIDTH),
    cllimit: 'max',
  });
  const page = Object.values(data?.query?.pages || {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  const licence = stripHtml(em.LicenseShortName?.value);
  if (!ALLOWED_LICENCE.test(licence)) throw new Error(`pinned file licence not permitted: ${licence}`);
  if (Math.max(ii.width, ii.height) < MIN_WIDTH) throw new Error('pinned file below minimum width');
  return {
    title: page.title,
    url: ii.thumburl || ii.url,
    original: ii.url,
    width: ii.width,
    height: ii.height,
    licence,
    author: stripHtml(em.Artist?.value) || 'Unknown',
    descriptionUrl: ii.descriptionurl,
  };
}

/**
 * Commons only serves a fixed set of thumbnail widths, and the width the API hands
 * back varies by file. Rewriting every pick to one deterministic width keeps page
 * weight predictable and makes the manifest diffable.
 */
function deliveryUrl(originalUrl) {
  const clean = String(originalUrl).split('?')[0];
  const m = clean.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/]+)/);
  if (!m) return clean;
  const [, a, b, file] = m;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${b}/${file}/${DELIVERY_WIDTH}px-${file}`;
}

async function verify(url) {
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA } });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * Measure on the same rendition the site will serve. Commons only generates a
 * per-file set of thumbnail widths, and 640px returns HTTP 400 on many files —
 * which silently failed every measurement and rejected every candidate.
 */
function measureUrl(originalUrl) {
  return deliveryUrl(originalUrl);
}

const AESTHETIC_CACHE = path.join(ROOT, '.content-os/cache/image-aesthetics.json');
let aestheticCache = {};
try {
  aestheticCache = JSON.parse(readFileSync(AESTHETIC_CACHE, 'utf8'));
} catch { /* first run */ }

function saveAestheticCache() {
  mkdirSync(path.dirname(AESTHETIC_CACHE), { recursive: true });
  writeFileSync(AESTHETIC_CACHE, `${JSON.stringify(aestheticCache, null, 2)}\n`);
}

/**
 * Accuracy is not attractiveness. A candidate that is correctly located, properly
 * licensed and unique can still be a grey concrete block, which is exactly what the
 * first image set shipped. Measure the pixels before accepting the file.
 */
async function aestheticsFor(originalUrl) {
  const key = deliveryUrl(originalUrl);
  // Entries cached before the perceptual hash existed carry no `hash`, and a
  // silently-undefined hash disables the near-duplicate check. Re-measure those.
  if (aestheticCache[key]?.hash) return aestheticCache[key];
  let metrics = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(measureUrl(originalUrl), { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        metrics = await imageAesthetics(buf);
        metrics.hash = await perceptualHash(buf);
        break;
      }
      if (res.status !== 429 && res.status < 500) break;
    } catch { /* retry */ }
    await sleep(700 * (attempt + 1));
  }
  aestheticCache[key] = metrics;
  return metrics;
}

const used = new Set();
/** Hashes of pictures already spoken for, so a second frame of the same view loses. */
const usedHashes = [];
const results = [];
const failures = [];

let carried = [];
if (replaceList) {
  const prev = JSON.parse(readFileSync(OUT, 'utf8'));
  carried = prev.images.filter((i) => !replaceList.includes(i.slug));
  for (const i of carried) {
    used.add(i.commonsTitle);
    if (i.aesthetics?.hash) usedHashes.push(i.aesthetics.hash);
  }
  process.stdout.write(`carrying ${carried.length} existing picks, re-sourcing ${replaceList.length}\n`);
}

// --slug= is a debugging view: it must never rewrite the manifest down to one row,
// which is exactly what it did once. Treat it as a single-slug replace instead.
const targeted = only ? [only] : replaceList;
if (only && !replaceList) {
  const prev = JSON.parse(readFileSync(OUT, 'utf8'));
  carried = prev.images.filter((i) => i.slug !== only);
  for (const i of carried) {
    used.add(i.commonsTitle);
    if (i.aesthetics?.hash) usedHashes.push(i.aesthetics.hash);
  }
}
const entries = Object.entries(QUERIES).filter(
  ([slug]) => !targeted || targeted.includes(slug),
);
let i = 0;

for (const [slug, spec] of entries) {
  i += 1;
  let picked = null;

  if (spec.pin) {
    const c = await pinnedCandidate(spec.pin);
    if (!c) throw new Error(`${slug}: pinned file not found on Commons — ${spec.pin}`);
    if (used.has(c.title)) throw new Error(`${slug}: pinned file already used by another page — ${spec.pin}`);
    const metrics = await aestheticsFor(c.original);
    if (passesAestheticBar(metrics)) {
      picked = { ...c, term: 'pinned', metrics };
    } else {
      // A hand-pick that fails the measured bar is a stale hand-pick, not a reason
      // to abort the run. Fall through to search and report it.
      process.stdout.write(
        `    pin dropped (below attractiveness bar): ${spec.pin.replace('File:', '')}\n`,
      );
    }
  }

  for (const term of picked ? [] : [...spec.terms, ...FALLBACK]) {
    let list;
    try {
      list = await candidates(term, { requireCat: spec.requireCat, rejectCat: spec.rejectCat });
    } catch (e) {
      process.stderr.write(`  ! ${slug}: query failed (${term}): ${e.message}\n`);
      continue;
    }
    for (const c of list) {
      if (used.has(c.title)) continue;
      const status = await verify(c.url);
      if (status !== 200) continue;
      const metrics = await aestheticsFor(c.original);
      if (!passesAestheticBar(metrics)) continue;
      if (metrics.hash && usedHashes.some((h) => hashDistance(h, metrics.hash) <= NEAR_DUPLICATE_BITS)) continue;
      picked = { ...c, term, metrics };
      break;
    }
    if (picked) break;
    await sleep(120);
  }

  if (!picked) {
    failures.push({ slug, terms: spec.terms });
    process.stdout.write(`[${i}/${entries.length}] ${slug}: NO MATCH\n`);
    continue;
  }

  used.add(picked.title);
  if (picked.metrics?.hash) usedHashes.push(picked.metrics.hash);
  results.push({
    slug,
    collection: spec.collection,
    url: deliveryUrl(picked.original),
    originalUrl: String(picked.original).split('?')[0],
    width: picked.width,
    height: picked.height,
    // A Commons filename is not always a description ('Rhythmic living', 'Lisboa').
    // altText overrides the composed string where the filename says nothing useful.
    alt: spec.altText || `${subjectOf(picked.title)} — ${spec.alt}`,
    altSubject: subjectOf(picked.title),
    credit: `${picked.author} / Wikimedia Commons`,
    licence: picked.licence,
    sourcePage: picked.descriptionUrl,
    commonsTitle: picked.title,
    matchedTerm: picked.term,
    aesthetics: picked.metrics || null,
  });
  process.stdout.write(
    `[${i}/${entries.length}] ${slug}\n    ${picked.title.replace('File:', '').slice(0, 72)}\n    ${picked.width}x${picked.height} · ${picked.licence}\n`,
  );
  // Measurements are the expensive part of a run; a crash at slug 24 should not
  // throw away the 23 before it.
  saveAestheticCache();
  await sleep(150);
}

const merged = [...carried, ...results].sort((a, b) => a.slug.localeCompare(b.slug));

const manifest = {
  rollout: 'portugal-commons-hero-images',
  generated: new Date().toISOString().slice(0, 10),
  source: 'Wikimedia Commons',
  rule: `One unique hero per page. Min ${MIN_WIDTH}px long edge. Commercial-reuse licences only. Every URL verified HTTP 200 at generation time.`,
  attributionRequired: true,
  deliveryWidth: DELIVERY_WIDTH,
  aestheticBar: AESTHETIC_BAR,
  total: merged.length,
  uniqueFiles: new Set(merged.map((r) => r.commonsTitle)).size,
  failures,
  images: merged,
};

saveAestheticCache();
writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(
  `\nwrote ${path.relative(ROOT, OUT)} — ${merged.length} images, ${manifest.uniqueFiles} unique files, ${failures.length} unresolved\n`,
);
