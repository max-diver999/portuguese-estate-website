// Source one unique Commons hero per wave-1 page.
//
// Trawling a place category returns whatever anyone uploaded there: recycling
// bins, shuttered shopfronts, macro shots of a plaque. Commons already curates
// for exactly the bar a hero needs, so search inside Quality images first and
// only widen if a place has none.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'MOREGroup-hero-sourcing/1.0 (editorial use)' };
const OK_LICENCE = /^(CC BY(-SA)? [1-4]\.0|CC0|Public domain|PDM)/i;
const MIN_EDGE = 1600;

const used = new Set(
  JSON.parse(readFileSync('scripts/portugal-commons-images.json', 'utf8')).images.map((i) => i.commonsTitle),
);

const WANT = [
  { slug: 'portugal-house-prices', terms: ['Alfama Lisboa Portugal', 'Setúbal Portugal city', 'Matosinhos Portugal', 'Viana do Castelo Portugal'] },
];

const JUNK = /ecoponto|placa|plaque|sign(age)?\b|logo|coat of arms|bras[ãa]o|\bmap\b|mapa|diagram|graffiti|detalhe|close-?up|manhole|construction site|scaffold|roadworks|parking/i;

// Commons search matches loosely across the Iberian peninsula: a search for
// Lisbon returned a beach in Benidorm. Require a Portuguese anchor in the title
// and reject the neighbours outright.
const NOT_PORTUGAL = /espa[ñn]a|\bspain\b|\bfrance\b|italia|\bitaly\b|brasil|\bbrazil\b|marruecos|morocco|galicia|andaluc/i;
const PORTUGAL = /portugal|portuguesa|lisbo[an]|lisbon|\bporto\b|oporto|madeira|funchal|set[úu]bal|cascais|estoril|guincho|sintra|aveiro|braga\b|algarve|douro|ribeira|bel[ée]m|alfama|chiado|coimbra|[óo]bidos|nazar[ée]|tavira|lagos, portugal/i;

async function api(params) {
  const u = new URL(API);
  u.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', ...params }).toString();
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1800 * attempt));
    const r = await fetch(u, { headers: UA });
    if (r.ok) {
      const j = await r.json();
      await new Promise((res) => setTimeout(res, 900));
      return j;
    }
    if (attempt === 3) console.error(`  HTTP ${r.status} after retries`);
  }
  return null;
}

async function search(term, pool) {
  const q = pool ? `${term} incategory:"${pool}"` : term;
  const j = await api({
    generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '40',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1280',
  });
  return Object.values(j?.query?.pages ?? {});
}

function usable(pages) {
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || used.has(p.title)) continue;
    if (!/\.(jpe?g|png)$/i.test(p.title)) continue;
    if (JUNK.test(p.title)) continue;
    if (NOT_PORTUGAL.test(p.title) || !PORTUGAL.test(p.title)) continue;
    if (ii.width < ii.height) continue;
    if (ii.width / ii.height > 2.0) continue; // panorama strips crop badly in a 16:9 hero
    if (Math.max(ii.width, ii.height) < MIN_EDGE) continue;
    const m = ii.extmetadata ?? {};
    const licence = (m.LicenseShortName?.value ?? '').replace(/<[^>]*>/g, '').trim();
    if (!OK_LICENCE.test(licence)) continue;
    const artist = (m.Artist?.value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    out.push({
      commonsTitle: p.title,
      url: ii.thumburl ?? ii.url,
      originalUrl: ii.url,
      width: ii.width,
      height: ii.height,
      licence,
      credit: artist ? `${artist} / Wikimedia Commons` : 'Wikimedia Commons',
      sourcePage: ii.descriptionurl,
      subject: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
    });
  }
  return out;
}

// Title heuristics can only reject the obvious. A replica aeroplane and a beach
// in Benidorm both passed every filter, so the last call is made by eye:
// shortlist six per page, render a contact sheet, choose from that.
const shortlist = {};
for (const w of WANT) {
  const seen = new Set();
  const cands = [];
  for (const term of w.terms) {
    for (const c of usable(await search(term, 'Quality images'))) {
      if (seen.has(c.commonsTitle)) continue;
      seen.add(c.commonsTitle);
      cands.push({ ...c, term });
      if (cands.length >= 6) break;
    }
    if (cands.length >= 6) break;
  }
  shortlist[w.slug] = cands;
  console.log(`${w.slug.padEnd(24)} ${cands.length} candidates`);
  cands.forEach((c, i) => console.log(`   ${i} ${String(c.width).padStart(5)}x${String(c.height).padEnd(5)} ${c.licence.padEnd(13)} ${c.subject.slice(0, 60)}`));
}
writeFileSync('.content-os/batches/wave1-hero-shortlist.json', JSON.stringify(shortlist, null, 2) + '\n');
console.log('\nwrote .content-os/batches/wave1-hero-shortlist.json');
