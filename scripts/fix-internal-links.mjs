// Ensure >=5 unique internal /guides/ or /compare/ links in each MDX body.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../src/content/', import.meta.url).pathname);
const MIN_LINKS = 5;
const DRY = process.argv.includes('--dry');

const allSlugs = new Map(); // slug -> {coll, title}
for (const c of ['guides', 'compare']) {
  for (const f of readdirSync(join(ROOT, c)).filter((x) => x.endsWith('.mdx'))) {
    const raw = readFileSync(join(ROOT, c, f), 'utf8');
    const slug = f.replace(/\.mdx$/, '');
    const tm = raw.match(/^title:\s*["'](.+?)["']/m);
    allSlugs.set(slug, { coll: c, title: tm ? tm[1] : slug });
  }
}

function slugToPath(slug) {
  const e = allSlugs.get(slug);
  return e ? `/${e.coll}/${slug}/` : null;
}

function anchorFromTitle(title) {
  // short anchor: drop after colon
  const short = title.split(':')[0].trim();
  return short.length > 45 ? short.slice(0, 42) + '…' : short;
}

function getInternalLinks(body) {
  return [...new Set([...body.matchAll(/\]\((\/(?:guides|compare)\/[^)/]+)\/?\)/g)].map((m) => {
    let p = m[1];
    if (!p.endsWith('/')) p += '/';
    return p;
  }))];
}

function getRelatedSlugs(fm) {
  const m = fm.match(/relatedSlugs:\s*\n((?:\s*-\s*.*\n)+)/);
  if (!m) return [];
  return [...m[1].matchAll(/-\s*["']?([a-z0-9\-]+)["']?/g)].map((x) => x[1]);
}

function hubFallback(slug, coll) {
  // generic hubs by keyword in slug
  const hubs = [];
  if (/dubai|uae|golden|off-plan|yield|freehold|mortgage|developer/.test(slug))
    hubs.push('dubai-property-investment-guide');
  if (/abu-dhabi|aldar|yas|saadiyat|reem/.test(slug))
    hubs.push('abu-dhabi-property-investment-guide');
  if (/qatar|doha|lusail|pearl/.test(slug))
    hubs.push('qatar-property-investment-guide');
  if (/saudi|riyadh|jeddah/.test(slug))
    hubs.push('saudi-arabia-property-foreigners-guide');
  if (/oman|muscat/.test(slug))
    hubs.push('oman-property-investment-guide');
  if (/bahrain|manama/.test(slug))
    hubs.push('bahrain-property-investment-guide');
  if (/rak|ras-al-khaimah|al-marjan/.test(slug))
    hubs.push('ras-al-khaimah-property-investment-guide');
  if (/cost-of-living|rent-prices|school|relocation|living-/.test(slug))
    hubs.push('gulf-expat-living-comparison');
  if (coll === 'compare') hubs.push('gulf-property-investment-comparison-2026');
  return [...new Set(hubs)].filter((s) => s !== slug && allSlugs.has(s));
}

let changed = 0;

for (const c of ['guides', 'compare']) {
  const dir = join(ROOT, c);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const path = join(ROOT, c, f);
    const raw = readFileSync(path, 'utf8');
    const slug = f.replace(/\.mdx$/, '');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;
    const [, fm, body] = fmMatch;
    const existing = getInternalLinks(body);
    if (existing.length >= MIN_LINKS) continue;

    const havePaths = new Set(existing);
    const candidates = [
      ...getRelatedSlugs(fm),
      ...hubFallback(slug, c),
      'dubai-property-investment-guide',
      'can-foreigners-buy-property-uae',
      'gulf-property-investment-comparison-2026',
    ].filter((s) => s !== slug && allSlugs.has(s));

    const toAdd = [];
    for (const s of candidates) {
      const p = slugToPath(s);
      if (!p || havePaths.has(p)) continue;
      toAdd.push({ slug: s, path: p, anchor: anchorFromTitle(allSlugs.get(s).title) });
      havePaths.add(p);
      if (havePaths.size >= MIN_LINKS) break;
    }
    if (havePaths.size < MIN_LINKS) continue;

    const linkBits = toAdd.map(({ anchor, path: p }) => `[${anchor}](${p})`);
    const para = `\n\n**Related reading:** ${linkBits.join(' · ')}.\n`;

    // insert before LeadForm or at end
    let newBody;
    if (body.includes('<LeadForm')) {
      newBody = body.replace(/(\n<LeadForm)/, `${para}$1`);
    } else {
      newBody = body.trimEnd() + para;
    }

    if (!DRY) writeFileSync(path, `---\n${fm}\n---\n${newBody}`);
    changed++;
  }
}

console.log(`${DRY ? '[DRY]' : ''} Added internal links block to ${changed} files`);
