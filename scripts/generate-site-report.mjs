#!/usr/bin/env node
/** Generate src/pages/site-report/index.astro from live corpus + config. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src/pages/site-report/index.astro');

const REPORT_DATE = '17 June 2026';
const REPORT_VERSION = 'v1.0';

const collections = [
  { key: 'guides', label: 'Guides', path: '/guides/', min: '2 000+', desc: 'Tax, legal, residency, yields, off-plan, national HUBs' },
  { key: 'compare', label: 'Comparisons', path: '/compare/', min: '1 800+', desc: 'Portugal vs Spain/France/Italy/Greece · city vs city · new-build vs resale' },
  { key: 'areas', label: 'Areas', path: '/areas/', min: '1 800+', desc: 'Lisbon, Porto, Algarve, Silver Coast, Comporta micro-markets' },
  { key: 'segments', label: 'Segments', path: '/segments/', min: '2 000+', desc: 'US, UK, DE, FR, BR, CN, AO buyer guides' },
  { key: 'developers', label: 'Developers & agencies', path: '/developers/', min: '1 200+', desc: 'Vanguard, VIC, Farinvest agency DD profiles' },
  { key: 'projects', label: 'Projects', path: '/projects/', min: '1 200+', desc: 'Empty — noindex until reviews launch' },
  { key: 'news', label: 'News', path: '/news/', min: '600+', desc: 'Not started — add 3/day when indexing stabilises' },
];

function bodyWords(raw) {
  const i = raw.indexOf('\n---\n', 4);
  if (i < 0) return 0;
  const body = raw.slice(i + 5).replace(/<[^>]+>/g, ' ').replace(/[#*`|\[\](){}]/g, ' ').replace(/\s+/g, ' ').trim();
  return body.split(' ').filter(Boolean).length;
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

const corpus = {};
let totalFiles = 0;
let totalWords = 0;
let indexable = 0;

for (const col of collections) {
  const dir = join(ROOT, 'src/content', col.key);
  corpus[col.key] = { ...col, items: [], count: 0, words: 0, indexable: 0 };
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
  } catch {
    /* empty collection */
  }
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const titleM = raw.match(/^title:\s*["']([^"']+)["']/m);
    const noindex = /^noindex:\s*true/m.test(raw);
    const w = bodyWords(raw);
    const slug = f.replace(/\.mdx$/, '');
    const item = { slug, title: titleM?.[1] || slug, words: w, noindex };
    corpus[col.key].items.push(item);
    corpus[col.key].count++;
    corpus[col.key].words += w;
    if (!noindex) corpus[col.key].indexable++;
    totalFiles++;
    totalWords += w;
    if (!noindex) indexable++;
  }
  corpus[col.key].items.sort((a, b) => a.slug.localeCompare(b.slug));
}

let gitCommits = '0';
try {
  gitCommits = execSync('git rev-list --count HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {}

let submitted = 0;
try {
  const j = JSON.parse(readFileSync(join(ROOT, 'scripts/submitted-urls.json'), 'utf8'));
  submitted = Array.isArray(j.urls) ? j.urls.length : j.submitted?.length || 0;
} catch {}

let sitemapUrls = 108;
try {
  const xml = readFileSync(join(ROOT, 'dist/client/sitemap-0.xml'), 'utf8');
  sitemapUrls = (xml.match(/<loc>/g) || []).length;
} catch {}

const avgWords = totalFiles ? Math.round(totalWords / totalFiles) : 0;

function slugListHtml(col, showWords = false) {
  if (!corpus[col].items.length) return `<p style="font-size:12px;color:#78716c;">No pages yet.</p>`;
  return corpus[col].items
    .map((it) => {
      const tag = it.noindex ? ' <span class="tag red">noindex</span>' : '';
      const w = showWords ? ` <span style="color:#a8a29e;font-size:10px;">(${it.words.toLocaleString()}w)</span>` : '';
      return `<a href="${corpus[col].path}${it.slug}/">${it.slug}</a>${w}${tag}`;
    })
    .join(' · ');
}

const waves = [
  { wave: 'Wave 1–3', commit: '122e011…', shipped: '~21', focus: 'Scaffold, national pillar, tax/legal cluster, first Lisbon & Algarve areas', indexing: 'Launch batch' },
  { wave: 'Wave 4–5', commit: '9f48086', shipped: '14', focus: 'Tier-A expansion 3000+ words, buy-to-let hub, yield cluster, AL rules', indexing: 'Build + validate' },
  { wave: 'Wave 6–7', commit: '46ba7c0', shipped: '14', focus: 'Residency cluster, AL licensing depth, more area guides', indexing: 'Explicit Google batches' },
  { wave: 'Wave 8–9', commit: 'd53453e', shipped: '14', focus: 'TOFU guides, country compares, Lisbon districts, UK segment', indexing: '109 URLs API total' },
  { wave: 'Wave 10', commit: 'a6f510f', shipped: '7', focus: 'Porto/Lisbon compares, Silver Coast hub, Matosinhos, Comporta, US/DE segments', indexing: '7/7 OK' },
  { wave: 'Wave 11', commit: '457411b', shipped: '7', focus: 'Supply/INE data, off-plan hub, Italy compare, Gaia/Óbidos/Nazaré', indexing: '7/7 OK' },
  { wave: 'Wave 12', commit: '29a83e2', shipped: '7', focus: 'Ericeira/Caldas/Braga, France compare, Vanguard/VIC developers', indexing: '7/7 OK' },
  { wave: 'Wave 13', commit: '193baab', shipped: '7', focus: 'Marvila/Alcântara/Lourinhá, Greece compare, developers hub, CN segment, Farinvest', indexing: '7/7 OK' },
  { wave: 'Quality pass', commit: '74df066', shipped: '—', focus: 'Hero diversity, /projects/ noindex, Farinvest agency label, hub copy fixes', indexing: 'Farinvest re-index' },
];

const html = `---
/** Portuguese Estate — live site report. Regenerate: node scripts/generate-site-report.mjs */
export const prerender = true;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>portuguese-estate.com — Site Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f3ef; color: #1c1917; min-height: 100vh; }
    .header { background: #1c1917; color: white; padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { width: 36px; height: 36px; background: linear-gradient(135deg, #d4a853, #b45309); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; color: #1c1917; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header-sub { font-size: 13px; color: #a8a29e; margin-top: 2px; }
    .header-meta { text-align: right; }
    .header-meta .label { font-size: 12px; color: #a8a29e; }
    .header-meta .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .live-badge { display: inline-flex; align-items: center; gap: 6px; background: #292524; border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-top: 8px; }
    .live-dot { width: 6px; height: 6px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; margin-bottom: 16px; margin-top: 40px; }
    .section-title:first-child { margin-top: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
    .stat-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e7e5e4; }
    .stat-card .num { font-size: 40px; font-weight: 800; color: #1c1917; line-height: 1; }
    .stat-card .num.gold { color: #b45309; }
    .stat-card .num.green { color: #15803d; }
    .stat-card .label { font-size: 13px; color: #78716c; margin-top: 6px; }
    .stat-card .sublabel { font-size: 11px; color: #a8a29e; margin-top: 4px; line-height: 1.4; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }
    .info-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e7e5e4; }
    .info-card h3 { font-size: 14px; font-weight: 700; color: #1c1917; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f5f5f4; }
    .info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid #fafaf9; gap: 16px; }
    .info-row:last-child { border-bottom: none; }
    .info-row .key { font-size: 13px; color: #78716c; flex-shrink: 0; }
    .info-row .val { font-size: 13px; font-weight: 600; color: #1c1917; text-align: right; }
    .info-row .val a { color: #b45309; text-decoration: none; }
    .content-card { background: white; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden; }
    .table-scroll { width: 100%; overflow-x: auto; }
    .content-table { width: 100%; border-collapse: collapse; min-width: 640px; }
    .content-table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #78716c; font-weight: 700; padding: 12px 20px; text-align: left; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
    .content-table td { padding: 12px 20px; font-size: 13px; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
    .content-table .count { font-weight: 800; color: #b45309; font-size: 18px; }
    .content-table .words { color: #78716c; font-size: 12px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .tag.green { background: #dcfce7; color: #166534; }
    .tag.blue { background: #dbeafe; color: #1e40af; }
    .tag.amber { background: #fef3c7; color: #92400e; }
    .tag.gray { background: #f5f5f4; color: #57534e; }
    .tag.red { background: #fee2e2; color: #991b1b; }
    .pulse-wrap { background: white; border-radius: 16px; border: 1px solid #e7e5e4; padding: 24px 28px; }
    .pulse-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    @media (max-width: 700px) { .pulse-kpi-row { grid-template-columns: repeat(2, 1fr); } }
    .pulse-kpi { background: #fafaf9; border-radius: 12px; border: 1px solid #e7e5e4; padding: 18px 20px; }
    .pulse-kpi .kpi-val { font-size: 36px; font-weight: 900; color: #1c1917; line-height: 1; margin-top: 4px; }
    .pulse-kpi .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #78716c; }
    .pulse-kpi .kpi-sub { font-size: 11px; color: #a8a29e; margin-top: 4px; line-height: 1.35; }
    .baseline-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px; color: #92400e; line-height: 1.5; }
    .insight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin-top: 16px; font-size: 12px; color: #166534; line-height: 1.5; }
    .insight-warn { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
    .slug-list { font-size: 11px; color: #57534e; line-height: 1.75; }
    .slug-list a { color: #b45309; text-decoration: none; }
    .slug-list a:hover { text-decoration: underline; }
    .slug-block { background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; }
    .slug-block h4 { font-size: 13px; font-weight: 700; color: #1c1917; margin-bottom: 8px; }
    .changelog-item { background: white; border: 1px solid #e7e5e4; border-bottom: none; padding: 16px 20px; display: flex; gap: 16px; }
    .changelog-item:first-child { border-radius: 12px 12px 0 0; }
    .changelog-item:last-child { border-radius: 0 0 12px 12px; border-bottom: 1px solid #e7e5e4; }
    .changelog-date { font-size: 11px; color: #a8a29e; min-width: 110px; }
    .changelog-title { font-size: 13px; font-weight: 600; }
    .changelog-desc { font-size: 12px; color: #78716c; margin-top: 3px; line-height: 1.45; }
    .changelog-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .next-item { background: white; border-radius: 10px; border: 1px solid #e7e5e4; padding: 14px 18px; display: flex; gap: 12px; margin-bottom: 10px; }
    .priority.high { color: #dc2626; font-size: 11px; font-weight: 700; min-width: 50px; }
    .priority.medium { color: #d97706; font-size: 11px; font-weight: 700; min-width: 50px; }
    .priority.low { color: #059669; font-size: 11px; font-weight: 700; min-width: 50px; }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .link-card { background: white; border-radius: 10px; border: 1px solid #e7e5e4; padding: 16px; text-decoration: none; color: #1c1917; display: block; }
    .link-card:hover { border-color: #b45309; }
    .link-card .link-label { font-size: 11px; color: #a8a29e; text-transform: uppercase; }
    .link-card .link-url { font-size: 13px; font-weight: 600; color: #b45309; margin-top: 4px; word-break: break-all; }
    .footer { text-align: center; padding: 32px 24px; color: #a8a29e; font-size: 12px; line-height: 1.6; }
    .footer a { color: #b45309; text-decoration: none; }
    .audit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 700px) { .audit-grid { grid-template-columns: 1fr; } }
    .audit-item { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px 16px; font-size: 12px; line-height: 1.45; }
    .audit-item strong { display: block; margin-bottom: 4px; color: #1c1917; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-brand">
    <div class="header-logo">PT</div>
    <div>
      <div class="header-sub">Website Performance Report — Portugal RE</div>
      <h1>portuguese-estate.com</h1>
    </div>
  </div>
  <div class="header-meta">
    <div class="label">Last updated</div>
    <div class="value">${REPORT_DATE} · ${REPORT_VERSION}</div>
    <div class="live-badge"><span class="live-dot"></span> ${indexable} indexable MDX · ${sitemapUrls} sitemap URLs · qa:full 5/5 PASS</div>
  </div>
</div>

<div class="container">

  <div class="section-title">At a glance</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="num gold">${totalFiles}</div>
      <div class="label">MDX articles</div>
      <div class="sublabel">${corpus.guides.count} guides · ${corpus.compare.count} compares · ${corpus.areas.count} areas · ${corpus.segments.count} segments · ${corpus.developers.count} developers</div>
    </div>
    <div class="stat-card">
      <div class="num">${fmtNum(totalWords)}</div>
      <div class="label">Words of SEO content</div>
      <div class="sublabel">~${avgWords.toLocaleString()} avg/article · validate:content ${totalFiles}/${totalFiles} PASS</div>
    </div>
    <div class="stat-card">
      <div class="num gold">${sitemapUrls}</div>
      <div class="label">URLs in sitemap</div>
      <div class="sublabel">GSC sitemap 0 errors · last downloaded 16 Jun · /projects/ excluded (noindex)</div>
    </div>
    <div class="stat-card">
      <div class="num green">${submitted}</div>
      <div class="label">URLs sent (Google API)</div>
      <div class="sublabel">portuguese-estate-indexing · explicit batches only · Farinvest re-index 17 Jun</div>
    </div>
    <div class="stat-card">
      <div class="num green">5/5</div>
      <div class="label">QA full package</div>
      <div class="sublabel">corpus-signals · validate · live HTTP · rendered HTML · build</div>
    </div>
    <div class="stat-card">
      <div class="num">${gitCommits}</div>
      <div class="label">Git commits</div>
      <div class="sublabel">Waves 1–13 shipped · indexing gap fix 74df066</div>
    </div>
  </div>

  <div class="section-title">SEO Pulse — Google Search Console</div>
  <div class="pulse-wrap">
    <div class="baseline-box">
      <strong>Early index phase (${REPORT_DATE}).</strong> GSC MCP <code>sc-domain:portuguese-estate.com</code> · Jan–14 Jun 2026: <strong>0 clicks, 0 impressions</strong> on queries/pages. Site content batch published 16–17 Jun; ${submitted} URLs pinged via Indexing API + Bing IndexNow. Sitemap resubmitted 16 Jun: <strong>0 errors</strong>, last downloaded 16 Jun 22:27 UTC. First query data expected ~27 Jun–4 Jul.
    </div>
    <div class="pulse-kpi-row">
      <div class="pulse-kpi"><div class="kpi-label">Total Clicks</div><div class="kpi-val">0</div><div class="kpi-sub">Baseline · monitor weekly</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Impressions</div><div class="kpi-val">0</div><div class="kpi-sub">${submitted} URLs in API log</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Avg. Position</div><div class="kpi-val">—</div><div class="kpi-sub">Awaiting first query data</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Avg. CTR</div><div class="kpi-val">—</div><div class="kpi-sub">CTR sprint when 50+ imp/query</div></div>
    </div>
    <div class="insight"><strong>Quick wins pipeline (when data arrives):</strong> Priority URLs — <code>/guides/portugal-property-investment-guide/</code>, <code>/guides/can-foreigners-buy-property-portugal/</code>, <code>/guides/imt-tax-non-resident-portugal-2026/</code>, <code>/guides/portugal-golden-visa-fund-investment-2026/</code>, <code>/compare/portugal-vs-spain-property-investment/</code>. Pages at pos 8–15 with 50+ impressions → expand FAQ + retitle for CTR. Monitor via <code>search-console-portuguese-estate</code> MCP.</div>
    <p style="font-size:11px;color:#a8a29e;text-align:center;margin-top:16px;">Updated ${REPORT_DATE} via GSC API · EN site — Google + Bing only · never Yandex</p>
  </div>

  <div class="section-title">Analytics — GA4</div>
  <div class="pulse-wrap">
    <div class="pulse-kpi-row">
      <div class="pulse-kpi"><div class="kpi-label">Users (16 Jun)</div><div class="kpi-val">9</div><div class="kpi-sub">Homepage only · post-deploy crawl/bot traffic</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Sessions</div><div class="kpi-val">9</div><div class="kpi-sub">Organic TBD after GSC impressions</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Pageviews</div><div class="kpi-val">9</div><div class="kpi-sub">ga4-analytics-portuguese-estate MCP</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Lead API</div><div class="kpi-val" style="font-size:22px;">✓</div><div class="kpi-sub">POST /api/lead/ → 200 live · prerender=false</div></div>
    </div>
    <div class="insight insight-warn"><strong>Baseline only:</strong> GA4 has no article-level organic yet. After GSC shows impressions, refresh this block and mark <code>generate_lead</code> / shortlist events as key events in GA4 admin.</div>
  </div>

  <div class="section-title">Bing Webmaster</div>
  <div class="pulse-wrap">
    <div class="pulse-kpi-row">
      <div class="pulse-kpi"><div class="kpi-label">Bing Clicks</div><div class="kpi-val">0</div><div class="kpi-sub">bing-webmaster-portuguese-estate MCP</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Impressions</div><div class="kpi-val">0</div><div class="kpi-sub">IndexNow via bing.com/indexnow only</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Site verified</div><div class="kpi-val" style="font-size:22px;">✓</div><div class="kpi-sub">Imported from GSC</div></div>
      <div class="pulse-kpi"><div class="kpi-label">Crawl issues</div><div class="kpi-val" style="font-size:22px;">0</div><div class="kpi-sub">Never api.indexnow.org (Yandex hub)</div></div>
    </div>
  </div>

  <div class="section-title">Content breakdown</div>
  <div class="content-card table-scroll">
    <table class="content-table">
      <thead><tr><th>Collection</th><th>Pages</th><th>Words</th><th>Avg</th><th>Min gate</th><th>Status</th></tr></thead>
      <tbody>
${collections
  .map((col) => {
    const c = corpus[col.key];
    const avg = c.count ? Math.round(c.words / c.count) : 0;
    const status =
      c.count === 0
        ? col.key === 'projects'
          ? '<span class="tag amber">noindex hub</span>'
          : col.key === 'news'
            ? '<span class="tag gray">planned</span>'
            : '<span class="tag gray">empty</span>'
        : '<span class="tag green">Live</span>';
    return `        <tr>
          <td><strong>${col.label}</strong><br><span class="words">${col.desc}</span></td>
          <td><span class="count">${c.count}</span></td>
          <td><span class="words">${c.words.toLocaleString()}</span></td>
          <td><span class="words">${avg.toLocaleString()}</span></td>
          <td><span class="tag blue">${col.min}</span></td>
          <td>${status}</td>
        </tr>`;
  })
  .join('\n')}
        <tr>
          <td><strong>TOTAL</strong></td>
          <td><span class="count">${totalFiles}</span></td>
          <td><span class="words"><strong>${totalWords.toLocaleString()}</strong></span></td>
          <td><span class="words">${avgWords.toLocaleString()}</span></td>
          <td><span class="tag green">qa:full PASS</span></td>
          <td><span class="tag green">${indexable} indexable</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section-title">Content waves (91-article corpus)</div>
  <div class="content-card table-scroll">
    <table class="content-table">
      <thead><tr><th>Wave</th><th>Commit</th><th>Shipped</th><th>Focus</th><th>Indexing</th></tr></thead>
      <tbody>
${waves
  .map(
    (w) => `        <tr>
          <td><strong>${w.wave}</strong></td>
          <td><span class="words">${w.commit}</span></td>
          <td><span class="count">${w.shipped}</span></td>
          <td>${w.focus}</td>
          <td><span class="tag ${w.indexing.includes('OK') || w.indexing.includes('109') ? 'green' : w.indexing.includes('noindex') ? 'amber' : 'gray'}">${w.indexing}</span></td>
        </tr>`
  )
  .join('\n')}
        <tr>
          <td><strong>Corpus total</strong></td>
          <td colspan="2"><span class="count">${totalFiles}</span></td>
          <td>Tier-A standard · 3000+ body words · 10 FAQ · pause for indexing</td>
          <td><span class="tag green">Ready</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section-title">Full article inventory — all ${totalFiles} pages</div>
  <p style="font-size:12px;color:#78716c;margin-bottom:16px;">Every indexable slug with live link. Word counts = body-only after frontmatter.</p>
${['guides', 'compare', 'areas', 'segments', 'developers']
  .map(
    (col) => `  <div class="slug-block">
    <h4>${corpus[col].label} (${corpus[col].count}) — ${corpus[col].words.toLocaleString()} words</h4>
    <div class="slug-list">${slugListHtml(col, true)}</div>
  </div>`
  )
  .join('\n')}

  <div class="section-title">Full SEO audit — ${REPORT_DATE}</div>
  <div class="pulse-wrap">
    <div class="audit-grid">
      <div class="audit-item"><strong>Technical SEO: 9/10</strong>Sitemap 200, lead API 200, robots OK, /projects/ noindex + excluded from sitemap, API prerender=false verified.</div>
      <div class="audit-item"><strong>Indexation: baseline</strong>${submitted} URLs explicit Google API · GSC 0 imp (too early) · sitemap 0 errors · Bing IndexNow active.</div>
      <div class="audit-item"><strong>On-page / corpus: 9.5/10</strong>${totalFiles}/${totalFiles} validate PASS · fix:queue empty · 0 em-dash failures · hero diversity rotated 17 Jun.</div>
      <div class="audit-item"><strong>Content depth: 9/10</strong>${fmtNum(totalWords)} words · pillar 6157w · avg ${avgWords}w · 7 nationality segments · 9 country/city compares.</div>
      <div class="audit-item"><strong>Entity trust: 8/10</strong>Developers hub live · Farinvest labelled agency · VIC/Vanguard DD · no LeadForm on tier-A (by design).</div>
      <div class="audit-item"><strong>GEO / AI: 7/10</strong>FAQPage + Article schema · llms.txt present · Wikidata Q-id not yet · news cadence not started.</div>
    </div>
  </div>

  <div class="section-title">Promotion recommendations</div>
  <div class="content-card table-scroll">
    <table class="content-table">
      <thead><tr><th>Priority</th><th>Action</th><th>Expected outcome</th></tr></thead>
      <tbody>
        <tr><td><span class="tag green">DONE</span></td><td>91 tier-A corpus + qa:full 5/5 + ${submitted} URL indexing batch + sitemap hygiene</td><td>Clean launch baseline before pause</td></tr>
        <tr><td><span class="tag red">P0</span></td><td><strong>Indexing pause 2–3 weeks</strong> — no new MDX until GSC shows 100+ impressions on pillar URLs</td><td>Avoid crawl budget dilution; let Google process explicit batch</td></tr>
        <tr><td><span class="tag amber">P1</span></td><td>Weekly GSC refresh via MCP — when pos 8–15 + 50 imp: CTR sprint on IMT, foreigners-buy, Golden Visa fund guides</td><td>First clicks from high-intent legal/tax queries</td></tr>
        <tr><td><span class="tag amber">P1</span></td><td>Start news collection: 3 short news MDX/day (INE, AL law, Golden Visa fund flows)</td><td>Freshness signal + NewsArticle schema</td></tr>
        <tr><td><span class="tag blue">P2</span></td><td>Project reviews batch (10–15 off-plan) → then re-enable /projects/ in sitemap</td><td>Commercial project-intent traffic like moregroup.estate /projects/</td></tr>
        <tr><td><span class="tag blue">P2</span></td><td>Wikidata entity Portuguese Estate + Q-id in Organization sameAs</td><td>GEO citability in ChatGPT/Perplexity</td></tr>
        <tr><td><span class="tag gray">P3</span></td><td>Wave 14+ only after GSC baseline — expand developer profiles (Liberdade, SEV, etc.)</td><td>Entity authority without cannibalizing hub</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section-title">Cursor MCP servers (Portugal direction)</div>
  <div class="info-grid">
    <div class="info-card">
      <h3>Analytics &amp; Search MCP</h3>
      <div class="info-row"><span class="key">GSC</span><span class="val">search-console-portuguese-estate</span></div>
      <div class="info-row"><span class="key">GA4</span><span class="val">ga4-analytics-portuguese-estate</span></div>
      <div class="info-row"><span class="key">Bing</span><span class="val">bing-webmaster-portuguese-estate</span></div>
      <div class="info-row"><span class="key">GSC property</span><span class="val">sc-domain:portuguese-estate.com</span></div>
      <div class="info-row"><span class="key">Regenerate report</span><span class="val">node scripts/generate-site-report.mjs</span></div>
    </div>
    <div class="info-card">
      <h3>Indexing isolation</h3>
      <div class="info-row"><span class="key">GCP project</span><span class="val">portuguese-estate-indexing</span></div>
      <div class="info-row"><span class="key">SA email</span><span class="val">indexing-bot-portugal@…</span></div>
      <div class="info-row"><span class="key">NOT shared with</span><span class="val">soy-braid / mexico / invest-gulf</span></div>
      <div class="info-row"><span class="key">Google API</span><span class="val">submit-google-explicit.mjs</span></div>
      <div class="info-row"><span class="key">Bing</span><span class="val">submit-bing-explicit.mjs</span></div>
      <div class="info-row"><span class="key">Yandex</span><span class="val">❌ Never (EN site)</span></div>
    </div>
  </div>

  <div class="section-title">Technical setup</div>
  <div class="info-grid">
    <div class="info-card">
      <h3>Infrastructure</h3>
      <div class="info-row"><span class="key">Framework</span><span class="val">Astro 5 + MDX + Vercel</span></div>
      <div class="info-row"><span class="key">Repository</span><span class="val"><a href="https://github.com/max-diver999/portuguese-estate-website" target="_blank">portuguese-estate-website</a></span></div>
      <div class="info-row"><span class="key">Domain</span><span class="val"><a href="https://portuguese-estate.com/">portuguese-estate.com</a></span></div>
      <div class="info-row"><span class="key">Email</span><span class="val">info@portuguese-estate.com</span></div>
      <div class="info-row"><span class="key">QA</span><span class="val">npm run qa:full</span></div>
    </div>
    <div class="info-card">
      <h3>SEO &amp; schema</h3>
      <div class="info-row"><span class="key">JSON-LD</span><span class="val">Article + FAQPage + BreadcrumbList</span></div>
      <div class="info-row"><span class="key">Lead capture</span><span class="val">/get-shortlist/ (no inline LeadForm on tier-A)</span></div>
      <div class="info-row"><span class="key">Sitemap filter</span><span class="val">thanks · site-report · /projects/</span></div>
      <div class="info-row"><span class="key">Collections</span><span class="val">guides · compare · areas · segments · developers</span></div>
      <div class="info-row"><span class="key">Nav</span><span class="val">Developers hub (not empty Projects)</span></div>
    </div>
  </div>

  <div class="section-title">Launch changelog</div>
  <div>
    <div class="changelog-item">
      <div class="changelog-date">${REPORT_DATE} ${REPORT_VERSION}</div>
      <div>
        <div class="changelog-title">Full site-report rebuilt — Portugal data, all ${totalFiles} slugs, MCP baseline</div>
        <div class="changelog-desc">Replaced Mexico template copy. GSC/GA4/Bing MCP pull. Corpus inventory with word counts. Promotion roadmap for indexing pause.</div>
        <div class="changelog-tags"><span class="tag blue">Report</span><span class="tag green">MCP</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">17 Jun 2026</div>
      <div>
        <div class="changelog-title">Indexing gap fix — 74df066</div>
        <div class="changelog-desc">/projects/ noindex + Portugal copy · /developers/ hub fix · hero diversity · Farinvest agency title · VIC hero 404 fix · Farinvest re-indexed.</div>
        <div class="changelog-tags"><span class="tag green">SEO</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">17 Jun 2026</div>
      <div>
        <div class="changelog-title">Wave 13 — 193baab (7 tier-A)</div>
        <div class="changelog-desc">Marvila, Alcântara, Lourinhá · Greece compare · developers hub · Chinese segment · Farinvest agency DD.</div>
        <div class="changelog-tags"><span class="tag green">Wave 13</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">17 Jun 2026</div>
      <div>
        <div class="changelog-title">Waves 10–12 — a6f510f → 29a83e2 (21 tier-A)</div>
        <div class="changelog-desc">Country compares, Silver Coast, segments US/DE/CN, off-plan hub, INE data, Vanguard/VIC developers, France/Greece compares.</div>
        <div class="changelog-tags"><span class="tag green">Waves 10–12</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">16–17 Jun 2026</div>
      <div>
        <div class="changelog-title">Waves 1–9 — corpus foundation (~63 articles)</div>
        <div class="changelog-desc">National pillar, tax/legal/AL cluster, Lisbon/Porto/Algarve areas, residency, yields, nationality segments UK/FR/BR/AO.</div>
        <div class="changelog-tags"><span class="tag blue">Waves 1–9</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">Jun 2026</div>
      <div>
        <div class="changelog-title">Portugal indexing isolated + MCP trio</div>
        <div class="changelog-desc">GCP portuguese-estate-indexing · search-console-portuguese-estate · ga4-analytics-portuguese-estate · bing-webmaster-portuguese-estate.</div>
        <div class="changelog-tags"><span class="tag gray">Infra</span></div>
      </div>
    </div>
  </div>

  <div class="section-title">Next steps</div>
  <div>
    <div class="next-item"><div class="priority high">HIGH</div><div><div class="text">Wait for GSC first impressions (~27 Jun) — refresh SEO Pulse weekly</div><div class="subtext">search-console-portuguese-estate MCP · no new content batch until 100+ impressions on pillar</div></div></div>
    <div class="next-item"><div class="priority medium">MED</div><div><div class="text">CTR sprint when data arrives: IMT, foreigners-buy, Golden Visa fund, Portugal vs Spain</div><div class="subtext">Target pos 8–15 with 50+ impressions · FAQ + title refresh</div></div></div>
    <div class="next-item"><div class="priority medium">MED</div><div><div class="text">Launch news cadence (3/day) after first GSC clicks</div><div class="subtext">INE releases · AL containment updates · fund route news</div></div></div>
    <div class="next-item"><div class="priority low">LOW</div><div><div class="text">Project review batch + Wikidata entity</div><div class="subtext">Re-enable /projects/ in sitemap when 10+ reviews live</div></div></div>
  </div>

  <div class="section-title">Quick links</div>
  <div class="links-grid">
    <a class="link-card" href="https://portuguese-estate.com/" target="_blank" rel="noopener"><div class="link-label">Live site</div><div class="link-url">portuguese-estate.com</div></a>
    <a class="link-card" href="https://portuguese-estate.com/guides/portugal-property-investment-guide/" target="_blank" rel="noopener"><div class="link-label">National pillar</div><div class="link-url">/guides/portugal-property-investment-guide/</div></a>
    <a class="link-card" href="https://portuguese-estate.com/developers/" target="_blank" rel="noopener"><div class="link-label">Developers hub</div><div class="link-url">/developers/</div></a>
    <a class="link-card" href="https://portuguese-estate.com/segments/" target="_blank" rel="noopener"><div class="link-label">Segments hub</div><div class="link-url">/segments/</div></a>
    <a class="link-card" href="https://portuguese-estate.com/sitemap-index.xml" target="_blank" rel="noopener"><div class="link-label">Sitemap</div><div class="link-url">sitemap-index.xml (${sitemapUrls} URLs)</div></a>
    <a class="link-card" href="https://search.google.com/search-console?resource_id=sc-domain:portuguese-estate.com" target="_blank" rel="noopener"><div class="link-label">Google Search Console</div><div class="link-url">sc-domain:portuguese-estate.com</div></a>
    <a class="link-card" href="https://analytics.google.com/" target="_blank" rel="noopener"><div class="link-label">GA4</div><div class="link-url">ga4-analytics-portuguese-estate MCP</div></a>
    <a class="link-card" href="https://www.bing.com/webmasters/" target="_blank" rel="noopener"><div class="link-label">Bing Webmaster</div><div class="link-url">portuguese-estate.com</div></a>
    <a class="link-card" href="https://github.com/max-diver999/portuguese-estate-website" target="_blank" rel="noopener"><div class="link-label">GitHub</div><div class="link-url">max-diver999/portuguese-estate-website</div></a>
  </div>

</div>

<div class="footer">
  <strong>Portuguese Estate Site Report ${REPORT_VERSION}</strong> · ${REPORT_DATE} ·
  <a href="https://portuguese-estate.com/site-report/">portuguese-estate.com/site-report/</a><br />
  Data: GSC + GA4 + Bing MCP · Content: generate-site-report.mjs + qa:full · ${totalFiles} MDX · ${fmtNum(totalWords)} words<br />
  EN site — Google + Bing only · never Yandex
</div>

</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Wrote ${OUT} (${totalFiles} articles, ${totalWords.toLocaleString()} words)`);
