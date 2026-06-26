#!/usr/bin/env node
/**
 * Build site-report/index.astro v2 — full moregroup.estate layout, Portugal data.
 * Run: node scripts/build-portugal-site-report-v2.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'src/pages/site-report/index.astro');

const collections = ['guides', 'compare', 'areas', 'developers', 'segments'];
const slugInventory = {};
let totalWords = 0;
let totalFiles = 0;

function bodyWords(raw) {
  const i = raw.indexOf('\n---\n', 4);
  if (i < 0) return 0;
  return raw
    .slice(i + 5)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

for (const c of collections) {
  slugInventory[c] = [];
  for (const f of readdirSync(join(ROOT, 'src/content', c)).filter((x) => x.endsWith('.mdx'))) {
    const raw = readFileSync(join(ROOT, 'src/content', c, f), 'utf8');
    const words = bodyWords(raw);
    const title = (raw.match(/^title:\s*["']([^"']+)["']/m) || [])[1] || f;
    slugInventory[c].push({ slug: f.replace('.mdx', ''), words, title });
    totalWords += words;
    totalFiles++;
  }
  slugInventory[c].sort((a, b) => a.slug.localeCompare(b.slug));
}

const counts = Object.fromEntries(
  collections.map((c) => [c, { n: slugInventory[c].length, words: slugInventory[c].reduce((s, x) => s + x.words, 0) }])
);

const commits = execSync('git rev-list --count HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();

const frontmatter = `---
export const prerender = true;

const reportDate = '25 June 2026';
const reportVersion = 'v2.0';
const launchDate = '16 June 2026';
const dataThrough = '24 June 2026';

const monthlyGsc = [
  { month: 'Mar 2026', label: 'Mar', clicks: 0, impressions: 0, position: 0, note: 'Pre-launch' },
  { month: 'Apr 2026', label: 'Apr', clicks: 0, impressions: 0, position: 0, note: 'Pre-launch' },
  { month: 'May 2026', label: 'May', clicks: 0, impressions: 0, position: 0, note: 'Pre-launch' },
  { month: 'Jun 2026', label: 'Jun', clicks: 1, impressions: 164, position: 23.6, note: 'Live 16 Jun · first GSC signals 17 Jun · first click 22 Jun' },
];

const monthlyGa4 = [
  { month: 'Mar', sessions: 0 },
  { month: 'Apr', sessions: 0 },
  { month: 'May', sessions: 0 },
  { month: 'Jun', sessions: 73 },
];

const contentBreakdown = [
  { type: 'Guides', count: ${counts.guides.n}, words: ${counts.guides.words}, color: '#2d7a5e' },
  { type: 'Comparisons', count: ${counts.compare.n}, words: ${counts.compare.words}, color: '#d97706' },
  { type: 'Areas', count: ${counts.areas.n}, words: ${counts.areas.words}, color: '#8b5cf6' },
  { type: 'Developers', count: ${counts.developers.n}, words: ${counts.developers.words}, color: '#4e9e7e' },
  { type: 'Segments', count: ${counts.segments.n}, words: ${counts.segments.words}, color: '#60a5fa' },
];

const totalClicks = monthlyGsc.reduce((s, m) => s + m.clicks, 0);
const totalImp = monthlyGsc.reduce((s, m) => s + m.impressions, 0);
const totalWords = contentBreakdown.reduce((s, c) => s + c.words, 0);
const totalFiles = contentBreakdown.reduce((s, c) => s + c.count, 0);
const clicksDelta = 100;
const maxImp = Math.max(...monthlyGsc.map(m => m.impressions), 1);
---`;

function slugListHtml(c, prefix) {
  return slugInventory[c]
    .map(
      (x) =>
        `<div class="pulse-page-row"><div class="pulse-page-url">${prefix}/${x.slug}/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">${x.words.toLocaleString('en-US')} w</span></div></div>`
    )
    .join('\n');
}

const contentBreakdownRows = `
        <tr>
          <td><strong>Investment &amp; process guides</strong><br><span style="font-size:11px;color:#9ca3af">Golden Visa, IMT, CPCV/escritura, foreigners buying, remote purchase, yields, AIMI, rental licensing — tier-A pillar cluster</span></td>
          <td><span class="count">${counts.guides.n}</span></td>
          <td><span class="words">~${Math.round(counts.guides.words / counts.guides.n).toLocaleString('en-US')} words</span></td>
          <td><span class="tag blue">Head keywords</span></td>
          <td><span class="tag green">Live</span></td>
        </tr>
        <tr>
          <td><strong>Area guides — Lisbon, Porto, Algarve &amp; coast</strong><br><span style="font-size:11px;color:#9ca3af">Chiado, Alfama, Cascais, Sintra, Faro, Lagos, Óbidos, Gaia, Parque das Nações and 12 more micro-markets</span></td>
          <td><span class="count">${counts.areas.n}</span></td>
          <td><span class="words">~${Math.round(counts.areas.words / counts.areas.n).toLocaleString('en-US')} words</span></td>
          <td><span class="tag blue">Location intent</span></td>
          <td><span class="tag green">Live</span></td>
        </tr>
        <tr>
          <td><strong>Market comparisons</strong><br><span style="font-size:11px;color:#9ca3af">Portugal vs Spain, France, Italy, Greece, Dubai, UK — plus Lisbon vs Porto and Algarve vs Lisbon</span></td>
          <td><span class="count">${counts.compare.n}</span></td>
          <td><span class="words">~${Math.round(counts.compare.words / counts.compare.n).toLocaleString('en-US')} words</span></td>
          <td><span class="tag amber">Comparison intent</span></td>
          <td><span class="tag green">Live</span></td>
        </tr>
        <tr>
          <td><strong>Buyer segments</strong><br><span style="font-size:11px;color:#9ca3af">US, UK, EU, retirees, digital nomads, HNWI — persona-specific entry pages</span></td>
          <td><span class="count">${counts.segments.n}</span></td>
          <td><span class="words">~${Math.round(counts.segments.words / counts.segments.n).toLocaleString('en-US')} words</span></td>
          <td><span class="tag blue">Persona intent</span></td>
          <td><span class="tag green">Live</span></td>
        </tr>
        <tr>
          <td><strong>Developer profiles</strong><br><span style="font-size:11px;color:#9ca3af">Farinvest Properties, Domus Development, Vanguard Properties — agency/developer hub pages</span></td>
          <td><span class="count">${counts.developers.n}</span></td>
          <td><span class="words">~${Math.round(counts.developers.words / counts.developers.n).toLocaleString('en-US')} words</span></td>
          <td><span class="tag amber">Entity SEO</span></td>
          <td><span class="tag green">Live</span></td>
        </tr>
        <tr style="background:#faf8f4;">
          <td><strong>TOTAL</strong></td>
          <td><span class="count" style="font-size:24px;">${totalFiles}</span></td>
          <td><span class="words">~${Math.round(totalWords / totalFiles).toLocaleString('en-US')} avg</span></td>
          <td></td>
          <td><span class="tag green">All live</span></td>
        </tr>`;

const inventorySection = collections
  .map(
    (c) => `
  <div class="section-title">${c.charAt(0).toUpperCase() + c.slice(1)} — full slug list (${slugInventory[c].length})</div>
  <div class="content-card" style="margin-bottom:24px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
      ${slugListHtml(c, `/${c}`)}
    </div>
  </div>`
  )
  .join('');

const seoPulse = `  <!-- SEO PULSE — Google Search Console, GA4 and available analytics data -->
  <div class="section-title" style="margin-top:40px;">SEO Pulse — Google Search Console</div>

  <div style="background:white;border-radius:16px;border:1px solid #e8e4dc;padding:24px 28px;">

    <div class="pulse-header">
      <div>
        <h2>Search Performance</h2>
        <p style="font-size:12px;color:#9ca3af;margin-top:2px;">portuguese-estate.com · 1 Jun – 24 Jun 2026 · Web search · Updated 25 Jun via GSC API</p>
      </div>
      <div class="pulse-updated">
        <span class="pulse-updated-dot"></span>
        Updated 25 Jun 2026
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
      <div style="background:#f0faf5;border:1px solid #c6e8da;border-radius:10px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#7a7a6e;text-transform:uppercase;">17–20 Jun 2026</div>
        <div style="font-size:22px;font-weight:900;color:#1a2e2a;margin-top:4px;">0 clicks</div>
        <div style="font-size:12px;color:#7a7a6e;">70 impressions · index warming · peak day 20 Jun (38 imp, pos 8.7)</div>
      </div>
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#7a7a6e;text-transform:uppercase;">21–24 Jun 2026</div>
        <div style="font-size:22px;font-weight:900;color:#1a2e2a;margin-top:4px;">1 click</div>
        <div style="font-size:12px;color:#7a7a6e;">94 impressions · CTR 1.06% · first click 22 Jun (compare page)</div>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#7a7a6e;text-transform:uppercase;">Launch baseline</div>
        <div style="font-size:22px;font-weight:900;color:#1a2e2a;margin-top:4px;">164 imp</div>
        <div style="font-size:12px;color:#7a7a6e;">Site live 16 Jun · 108 sitemap URLs · indexing pause on new MDX until GSC &gt;100 imp on pillar</div>
      </div>
    </div>

    <div class="pulse-kpi-row">
      <div class="pulse-kpi kpi-green">
        <div class="kpi-trend trend-up">First click</div>
        <div class="kpi-label">Total Clicks</div>
        <div class="kpi-val">1</div>
        <div class="kpi-sub">22 Jun · /compare/portugal-vs-france-property-investment/ · 10 imp · 10% CTR · pos 4.5</div>
      </div>
      <div class="pulse-kpi kpi-blue">
        <div class="kpi-trend trend-up">↑ Index warming</div>
        <div class="kpi-label">Impressions</div>
        <div class="kpi-val">164</div>
        <div class="kpi-sub">Peak 38 on 20 Jun · guides hub 25 imp (pos 80.9 — long-tail tail)</div>
      </div>
      <div class="pulse-kpi kpi-amber">
        <div class="kpi-trend" style="background:#fef3c7;color:#92400e;">Early</div>
        <div class="kpi-label">Avg. Position</div>
        <div class="kpi-val">23.6</div>
        <div class="kpi-sub">Golden Visa queries pos 70–90 · compare + step-by-step guides pos 4–6</div>
      </div>
      <div class="pulse-kpi kpi-purple">
        <div class="kpi-label">Avg. CTR</div>
        <div class="kpi-val">0.61%</div>
        <div class="kpi-sub">Compare cluster converts · hub pages still building relevance</div>
      </div>
    </div>

    <div class="pulse-grid">
      <div class="pulse-card">
        <div class="pulse-card-title"><span class="span-blue"></span> Daily Impressions — Jun 2026 (GSC)</div>
        <div class="pulse-chart">
          <div class="chart-bars">
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:3%"></div><div class="chart-label">17</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:53%"></div><div class="chart-label">18</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:29%"></div><div class="chart-label">19</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:100%"></div><div class="chart-label" style="color:#2d7a5e;font-weight:700;">20</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:66%"></div><div class="chart-label">21</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:82%"></div><div class="chart-label">22</div></div>
            <div class="chart-bar-wrap"><div class="chart-bar bar-impr" style="height:100%"></div><div class="chart-label">23</div></div>
          </div>
          <p style="font-size:10px;color:#aaa;margin-top:8px;">Jun 17–23 · bars = daily GSC impressions · first click 22 Jun · site deployed 16 Jun</p>
        </div>
        <div class="pulse-insight" style="margin-top:16px;">
          <div class="pulse-insight-icon">📈</div>
          <div class="pulse-insight-text">
            <strong>Early index signals — compare pages lead:</strong> Portugal vs France comparison earned the first click at 10% CTR. Step-by-step purchase guides and Faro area page show strong positions (pos 2–6). Golden Visa head terms still on page 7–9 — expected at launch; CTR sprint when impressions exceed 100 on pillar URLs.
          </div>
        </div>
      </div>

      <div class="pulse-card">
        <div class="pulse-card-title"><span class="span-green"></span> Top Queries (impressions)</div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#1</div><div class="pulse-query-text">how much deposit to buy a house in portugal</div><div class="pulse-query-pos">pos 96</div><div class="pulse-query-imp">4 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#2</div><div class="pulse-query-text">property maintenance costs in portugal</div><div class="pulse-query-pos">pos 23</div><div class="pulse-query-imp">4 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#3</div><div class="pulse-query-text">lisbon golden visa property</div><div class="pulse-query-pos">pos 78</div><div class="pulse-query-imp">2 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#4</div><div class="pulse-query-text">portugal golden visa properties for sale</div><div class="pulse-query-pos">pos 90</div><div class="pulse-query-imp">2 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#5</div><div class="pulse-query-text">prenuptial agreement portugal</div><div class="pulse-query-pos">pos 85</div><div class="pulse-query-imp">2 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#6</div><div class="pulse-query-text">aimi tax portugal</div><div class="pulse-query-pos">pos 89</div><div class="pulse-query-imp">1 imp</div></div>
        <div class="pulse-query-row"><div class="pulse-query-rank">#7</div><div class="pulse-query-text">ine portugal house price index porto 2025</div><div class="pulse-query-pos">pos 10</div><div class="pulse-query-imp">1 imp</div></div>
      </div>
    </div>

    <div class="pulse-card" style="margin-top:16px;">
      <div class="pulse-card-title"><span class="span-blue"></span> Top GSC Pages</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
        <div>
          <div class="pulse-page-row"><div class="pulse-page-url">/compare/portugal-vs-france-property-investment/</div><div class="pulse-page-meta"><span class="pulse-badge badge-clicks">1 clk</span><span class="pulse-badge badge-impr">10 imp</span><span class="pulse-badge badge-pos">pos 4.5</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/guides/how-to-buy-property-portugal-step-by-step/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">6 imp</span><span class="pulse-badge badge-pos">pos 5.2</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/guides/algarve-property-investment-guide/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">5 imp</span><span class="pulse-badge badge-pos">pos 14.2</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/guides/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">25 imp</span><span class="pulse-badge badge-pos">pos 80.9</span></div></div>
        </div>
        <div>
          <div class="pulse-page-row"><div class="pulse-page-url">/guides/how-to-buy-portugal-property-remotely/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">2 imp</span><span class="pulse-badge badge-pos">pos 5.5</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/areas/parque-das-nacoes-property/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">2 imp</span><span class="pulse-badge badge-pos">pos 6.5</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/areas/faro-property-investment/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">1 imp</span><span class="pulse-badge badge-pos">pos 2</span></div></div>
          <div class="pulse-page-row"><div class="pulse-page-url">/developers/</div><div class="pulse-page-meta"><span class="pulse-badge badge-impr">2 imp</span><span class="pulse-badge badge-pos">pos 7</span></div></div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
      <div class="pulse-insight" style="background:#f0faf5;border-color:#c6e8da;margin-top:0;">
        <div class="pulse-insight-icon">📊</div>
        <div class="pulse-insight-text"><strong>GA4 (25 May – 24 Jun):</strong> 73 sessions · 81 pageviews · 1 organic search session · 70 direct (pre-launch QA + team). Top page: homepage 63 pv. Lead API smoke: 200 OK.</div>
      </div>
      <div class="pulse-insight" style="background:#eef2ff;border-color:#c7d2fe;margin-top:0;">
        <div class="pulse-insight-icon">🔍</div>
        <div class="pulse-insight-text"><strong>GSC sitemap:</strong> 108 URLs submitted · last downloaded 24 Jun · 0 errors · /projects/ excluded (noindex). Dedicated GCP project: portuguese-estate-indexing.</div>
      </div>
    </div>

    <p class="pulse-footer-note">
      Google: <a href="https://search.google.com/search-console" target="_blank">Search Console</a> · <a href="https://analytics.google.com" target="_blank">GA4</a> · Bing: <a href="https://www.bing.com/webmasters" target="_blank">Webmaster Tools</a> · Updated 25 Jun 2026 via MCP APIs
    </p>

  </div>`;

const bingPulse = `  <!-- BING PULSE — Bing Webmaster Tools -->
  <div class="section-title" style="margin-top:40px;">Bing Pulse — Bing Webmaster Tools</div>

  <div style="background:white;border-radius:16px;border:1px solid #e8e4dc;padding:24px 28px;">

    <div class="pulse-header">
      <div>
        <h2>Bing / Yahoo Search Performance</h2>
        <p style="font-size:12px;color:#9ca3af;margin-top:2px;">portuguese-estate.com · Jun 2026 · MCP bing-webmaster-portuguese-estate · Updated 25 Jun</p>
      </div>
      <div class="pulse-updated">
        <span class="pulse-updated-dot"></span>
        Live via MCP
      </div>
    </div>

    <div class="pulse-kpi-row">
      <div class="pulse-kpi kpi-orange">
        <div class="kpi-trend">Launch</div>
        <div class="kpi-label">Bing Clicks</div>
        <div class="kpi-val">0</div>
        <div class="kpi-sub">Expected — site live 16 Jun · IndexNow via bing.com/indexnow only</div>
      </div>
      <div class="pulse-kpi kpi-blue">
        <div class="kpi-label">Bing Impressions</div>
        <div class="kpi-val">0</div>
        <div class="kpi-sub">Crawl in progress · 108 URLs in sitemap</div>
      </div>
      <div class="pulse-kpi kpi-green">
        <div class="kpi-label">Sitemap</div>
        <div class="kpi-val">108</div>
        <div class="kpi-sub">Status Success · 0 crawl issues reported · 25 Jun</div>
      </div>
      <div class="pulse-kpi kpi-purple">
        <div class="kpi-label">Leads</div>
        <div class="kpi-val">0</div>
        <div class="kpi-sub">Lead form live · Telegram notifications configured</div>
      </div>
    </div>

    <div class="pulse-insight" style="margin-top:12px;">
      <div class="pulse-insight-icon">🔶</div>
      <div class="pulse-insight-text"><strong>Bing lags Google on new domains:</strong> Normal for a 9-day-old EN property site. Monitor weekly; comparison + Golden Visa guides are the expected first Bing converters once crawl completes.</div>
    </div>

    <p class="pulse-footer-note">Bing data via <code>bing-webmaster-portuguese-estate</code> MCP · EN site — IndexNow direct to Bing only (no Yandex hub)</p>
  </div>`;

const technicalSetup = `  <div class="section-title">Technical setup</div>
  <div class="info-grid">
    <div class="info-card">
      <h3>Infrastructure</h3>
      <div class="info-row"><span class="key">Framework</span><span class="val">Astro 6 (SSR + prerender)</span></div>
      <div class="info-row"><span class="key">Hosting</span><span class="val">Vercel (auto-deploy)</span></div>
      <div class="info-row"><span class="key">Repository</span><span class="val"><a href="https://github.com/max-diver999/portuguese-estate-website" target="_blank">GitHub → max-diver999</a></span></div>
      <div class="info-row"><span class="key">Domain</span><span class="val"><a href="https://portuguese-estate.com" target="_blank">portuguese-estate.com</a></span></div>
      <div class="info-row"><span class="key">DNS</span><span class="val">Vercel nameservers</span></div>
      <div class="info-row"><span class="key">Styles</span><span class="val">Tailwind CSS 4</span></div>
      <div class="info-row"><span class="key">Content format</span><span class="val">MDX (Markdown + components)</span></div>
    </div>
    <div class="info-card">
      <h3>Integrations</h3>
      <div class="info-row"><span class="key">Analytics</span><span class="val">Google Analytics 4 (GA4)</span></div>
      <div class="info-row"><span class="key">Search</span><span class="val">Google Search Console + Bing Webmaster (MCP)</span></div>
      <div class="info-row"><span class="key">Indexing</span><span class="val">GCP portuguese-estate-indexing · explicit URL submit only</span></div>
      <div class="info-row"><span class="key">Sitemap</span><span class="val">Auto-generated (sitemap-index.xml) · /projects/ excluded</span></div>
      <div class="info-row"><span class="key">Lead notifications</span><span class="val">Telegram Bot API · /api/lead/ prerender=false</span></div>
      <div class="info-row"><span class="key">SEO</span><span class="val">Canonical, OG, Article + BreadcrumbList + FAQPage Schema.org · llms.txt</span></div>
      <div class="info-row"><span class="key">Currency toggle</span><span class="val">USD / EUR / GBP</span></div>
    </div>
  </div>`;

const changelog = `  <div class="section-title">Change history</div>
  <div class="changelog">
    <div class="changelog-item">
      <div class="changelog-date">25 Jun 2026</div>
      <div class="changelog-content">
        <div class="changelog-title">Site report v2.0 — full moregroup layout + GSC/GA4 refresh</div>
        <div class="changelog-desc">Copied complete report structure from moregroup.estate v19.1: growth dashboard, SEO Pulse, Bing Pulse, content breakdown, full 91-slug inventory, changelog. Data through 24 Jun: GSC 1 click / 164 imp, GA4 73 sessions, Bing 0/0 launch baseline.</div>
        <div class="changelog-tags"><span class="tag green">Site-report v2</span><span class="tag blue">GSC MCP</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">19 Jun 2026</div>
      <div class="changelog-content">
        <div class="changelog-title">Site report v1.0 + indexing gap fix</div>
        <div class="changelog-desc">/projects/ noindex + sitemap exclude · developers hub Portugal copy · Farinvest agency title/H1 · hero rotation fix · Farinvest re-index Google OK.</div>
        <div class="changelog-tags"><span class="tag green">Index fix</span><span class="tag amber">Farinvest</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">16 Jun 2026</div>
      <div class="changelog-content">
        <div class="changelog-title">Wave 13 shipped — 91 MDX total · production launch</div>
        <div class="changelog-desc">7 tier-A articles (3 areas, compare, hub, segment, developer). qa:full 5/5 PASS. Explicit indexing for wave URLs. Domain live on Vercel.</div>
        <div class="changelog-tags"><span class="tag green">Launch</span><span class="tag blue">Wave 13</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">Waves 1–12</div>
      <div class="changelog-content">
        <div class="changelog-title">Corpus build — 84 articles across guides, areas, compare, segments, developers</div>
        <div class="changelog-desc">Tier-A standard: TldrBlock, FaqBlock, LeadForm, 5+ internal links, validate:content pass. Golden Visa, IMT, CPCV, Lisbon/Porto/Algarve area cluster, 9 market comparisons.</div>
        <div class="changelog-tags"><span class="tag green">Content</span><span class="tag gray">91 MDX</span></div>
      </div>
    </div>
    <div class="changelog-item">
      <div class="changelog-date">Pre-launch</div>
      <div class="changelog-content">
        <div class="changelog-title">Scaffold from MORE Group template + portuguese-estate-indexing GCP</div>
        <div class="changelog-desc">Astro site, qa:full pipeline, dedicated indexing SA, GSC domain property, Bing Webmaster MCP connected.</div>
        <div class="changelog-tags"><span class="tag blue">Infrastructure</span></div>
      </div>
    </div>
  </div>`;

const nextSteps = `      <div class="section-title">Next steps — 25 Jun 2026</div>
  <div class="next-steps">
    <div class="next-item" style="background:#fef2f2;border-color:#fecaca;">
      <div class="priority high">P0</div>
      <div>
        <div class="text" style="font-weight:700;">Indexing pause — no new MDX until GSC pillar &gt;100 impressions</div>
        <div class="subtext">Let Google consolidate 91 URLs. Weekly GSC refresh via MCP. Then CTR sprint on compare + step-by-step guides.</div>
      </div>
    </div>
    <div class="next-item" style="background:#fff7ed;border-color:#fed7aa;">
      <div class="priority medium">P1</div>
      <div>
        <div class="text" style="font-weight:700;">CTR sprint when data allows — Portugal vs France (10% CTR proof)</div>
        <div class="subtext">Scale title/meta pattern to Golden Visa + IMT + foreigners-buy pillars once impressions grow.</div>
      </div>
    </div>
    <div class="next-item">
      <div class="priority medium">P1</div>
      <div>
        <div class="text" style="font-weight:700;">Wave 14 — project reviews (when indexing stable)</div>
        <div class="subtext">Lotsof Portugal projects · /projects/ hub stays noindex until catalog populated.</div>
      </div>
    </div>
    <div class="next-item">
      <div class="priority medium">P2</div>
      <div>
        <div class="text" style="font-weight:700;">Wikidata entity + DR baseline</div>
        <div class="subtext">GEO sameAs · first backlinks · news 3/day after GSC traction.</div>
      </div>
    </div>
    <div class="next-item" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="priority low">DONE</div>
      <div>
        <div class="text" style="font-weight:700;">Site-report v2.0 full layout · qa:full PASS · sitemap 200</div>
        <div class="subtext">108 URLs · 377K words · lead API 200 · indexing isolation verified.</div>
      </div>
    </div>
  </div>`;

const quickLinks = `  <div class="section-title">Quick links</div>
  <div class="links-grid">
    <a class="link-card" href="https://portuguese-estate.com" target="_blank">
      <div class="link-label">Live site</div>
      <div class="link-url">portuguese-estate.com</div>
    </a>
    <a class="link-card" href="https://github.com/max-diver999/portuguese-estate-website" target="_blank">
      <div class="link-label">GitHub repository</div>
      <div class="link-url">github.com/max-diver999/portuguese-estate-website</div>
    </a>
    <a class="link-card" href="https://vercel.com/dashboard" target="_blank">
      <div class="link-label">Hosting & deploys</div>
      <div class="link-url">vercel.com/dashboard</div>
    </a>
    <a class="link-card" href="https://search.google.com/search-console" target="_blank">
      <div class="link-label">Google Search Console</div>
      <div class="link-url">search.google.com/search-console</div>
    </a>
    <a class="link-card" href="https://analytics.google.com" target="_blank">
      <div class="link-label">Google Analytics 4</div>
      <div class="link-url">analytics.google.com</div>
    </a>
    <a class="link-card" href="https://www.bing.com/webmasters" target="_blank">
      <div class="link-label">Bing Webmaster Tools</div>
      <div class="link-url">bing.com/webmasters</div>
    </a>
    <a class="link-card" href="https://portuguese-estate.com/sitemap-index.xml" target="_blank">
      <div class="link-label">Sitemap</div>
      <div class="link-url">portuguese-estate.com/sitemap-index.xml</div>
    </a>
  </div>`;

const footer = `  <div class="footer">
  <strong>Portuguese Estate</strong> · portuguese-estate.com · Report updated 25 Jun 2026 v2.0 · 108 sitemap URLs · ~378K words · GSC 1 click / 164 imp (1–24 Jun) · GA4 73 sessions · ${commits} git commits<br>
  To update: run <code>node scripts/build-portugal-site-report-v2.mjs</code> then deploy
</div>`;

const chartData = `<script type="application/json" id="chart-data">{"monthlyGsc":[{"label":"Mar","clicks":0,"impressions":0},{"label":"Apr","clicks":0,"impressions":0},{"label":"May","clicks":0,"impressions":0},{"label":"Jun","clicks":1,"impressions":164}],"monthlyGa4":[{"month":"Mar","sessions":0},{"month":"Apr","sessions":0},{"month":"May","sessions":0},{"month":"Jun","sessions":73}],"contentBreakdown":[{"type":"Guides","count":${counts.guides.n},"color":"#2d7a5e"},{"type":"Comparisons","count":${counts.compare.n},"color":"#d97706"},{"type":"Areas","count":${counts.areas.n},"color":"#8b5cf6"},{"type":"Developers","count":${counts.developers.n},"color":"#4e9e7e"},{"type":"Segments","count":${counts.segments.n},"color":"#60a5fa"}],"dailyRaw":[{"d":"06-17","c":0,"i":1},{"d":"06-18","c":0,"i":20},{"d":"06-19","c":0,"i":11},{"d":"06-20","c":0,"i":38},{"d":"06-21","c":0,"i":25},{"d":"06-22","c":1,"i":31},{"d":"06-23","c":0,"i":38}]}</script>`;

const statsGrid = `  <div class="section-title">At a glance</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="num teal">108</div>
      <div class="label">URLs in sitemap</div>
      <div class="sublabel">${counts.guides.n} guides · ${counts.areas.n} areas · ${counts.compare.n} compare · ${counts.segments.n} segments · ${counts.developers.n} developers</div>
    </div>
    <div class="stat-card">
      <div class="num amber">—</div>
      <div class="label">Ahrefs DR</div>
      <div class="sublabel">Baseline · new domain · target DR 10+ Q3 2026</div>
    </div>
    <div class="stat-card">
      <div class="num">~378K</div>
      <div class="label">SEO words</div>
      <div class="sublabel">${totalFiles} MDX files · ~${Math.round(totalWords / totalFiles).toLocaleString('en-US')} avg · ${commits} git commits</div>
    </div>
    <div class="stat-card">
      <div class="num teal">15+</div>
      <div class="label">GSC impression URLs</div>
      <div class="sublabel">1–24 Jun window · compare + purchase guides leading</div>
    </div>
    <div class="stat-card">
      <div class="num">6</div>
      <div class="label">Sections + hubs</div>
      <div class="sublabel">guides · compare · areas · segments · developers · hubs</div>
    </div>
    <div class="stat-card">
      <div class="num amber">1</div>
      <div class="label">GSC clicks</div>
      <div class="sublabel">164 imp · CTR 0.61% · avg pos 23.6</div>
    </div>
    <div class="stat-card">
      <div class="num teal">73</div>
      <div class="label">GA4 sessions</div>
      <div class="sublabel">1 organic · 70 direct · lead API 200 OK</div>
    </div>
  </div>`;

let src = readFileSync(REPORT, 'utf8');

// Frontmatter
src = src.replace(/^---[\s\S]*?---/, frontmatter);

// Head
src = src.replace(
  /<title>moregroup\.estate — Site Report<\/title>/,
  `<title>portuguese-estate.com — Site Report</title>\n  <meta name="robots" content="noindex, nofollow" />`
);

// Header
src = src.replace(/<div class="header-logo">M<\/div>/, '<div class="header-logo">PT</div>');
src = src.replace(/<h1>moregroup\.estate<\/h1>/, '<h1>portuguese-estate.com</h1>');
src = src.replace(
  /<div style="margin-top:10px;font-size:12px;"><a href="\/portfolio-report\/"[^<]*<\/a><\/div>/,
  ''
);

// Stats grid
src = src.replace(
  /<div class="section-title">At a glance<\/div>[\s\S]*?<\/div>\n\n\n  <!-- ═══ GROWTH DASHBOARD/,
  `${statsGrid}\n\n\n  <!-- ═══ GROWTH DASHBOARD`
);

// KPI strip GA4 hardcoded
src = src.replace(/<div class="kpi-value">4\.9k<\/div>/, '<div class="kpi-value">73</div>');
src = src.replace(/<span class="kpi-delta up">↑ May spike<\/span>/, '<span class="kpi-delta up">↑ Launch month</span>');
src = src.replace(/<div class="kpi-sub">Mar–Jun cumulative<\/div>/, '<div class="kpi-sub">Jun 2026 only (pre-launch Mar–May)</div>');
src = src.replace(/<span class="kpi-delta up">↑ \{clicksDelta\}% Jun vs May<\/span>/, '<span class="kpi-delta up">↑ Launch</span>');
src = src.replace(
  /<div class="kpi-sub">\{totalImp\.toLocaleString\('en-US'\)\} total · May peak 23\.6k<\/div>/,
  `<div class="kpi-sub">{totalImp.toLocaleString('en-US')} total · peak day 20 Jun (38 imp)</div>`
);

// Growth insights
src = src.replace(
  /<strong>May traffic spike:<\/strong>[\s\S]*?<\/div>\n      <\/div>\n    <\/div>/,
  `<strong>Launch phase:</strong> Site live 16 Jun. First GSC impressions 17 Jun, first click 22 Jun on Portugal vs France comparison. GA4 73 sessions mostly direct (QA + pre-launch). Organic search begins — monitor weekly.</div>\n      </div>\n    </div>`
);
src = src.replace(
  /<strong>Position widened as index scaled:<\/strong>[\s\S]*?<\/div>\n    <\/div>\n  <\/section>/,
  `<strong>Early tail vs winners:</strong> Guides hub averages pos 80.9 (broad index) while compare and step-by-step purchase guides sit pos 4–6. Golden Visa head terms still page 7–9 — normal at 9 days. CTR sprint when pillar impressions exceed 100.</div>\n    </div>\n  </section>`
);

// SEO Pulse through end of block
src = src.replace(
  /  <!-- SEO PULSE — Google Search Console, GA4 and available analytics data -->[\s\S]*?  <!-- BING PULSE — Bing Webmaster Tools -->/,
  `${seoPulse}\n\n`
);

// Bing Pulse
src = src.replace(
  /  <!-- BING PULSE — Bing Webmaster Tools -->[\s\S]*?  <div class="section-title">Technical setup<\/div>/,
  `${bingPulse}\n\n${technicalSetup}`
);

// Content breakdown tbody
src = src.replace(
  /(<div class="section-title">Content breakdown<\/div>[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,
  `$1${contentBreakdownRows}$2`
);

// Insert inventory before changelog
src = src.replace(
  /  <div class="section-title">Change history<\/div>/,
  `${inventorySection}\n\n  <div class="section-title">Change history</div>`
);

// Changelog
src = src.replace(
  /  <div class="section-title">Change history<\/div>[\s\S]*?  <div class="section-title">Next steps/,
  `${changelog}\n\n      <div class="section-title">Next steps`
);

// Next steps
src = src.replace(
  /      <div class="section-title">Next steps[\s\S]*?  <div class="section-title">Quick links<\/div>/,
  `${nextSteps}\n\n${quickLinks}`
);

// Footer + chart-data (single block)
src = src.replace(
  /  <div class="footer">[\s\S]*?<script is:inline>/,
  `${footer}\n\n\n${chartData}\n<script is:inline>`
);

// Global domain replace leftovers
src = src.replace(/moregroup\.estate/g, 'portuguese-estate.com');
src = src.replace(/more-group-website/g, 'portuguese-estate-website');
src = src.replace(/USD \/ THB \/ EUR \/ GBP/g, 'USD / EUR / GBP');

writeFileSync(REPORT, src);
console.log(`✅ Site report v2 written: ${totalFiles} MDX, ${totalWords.toLocaleString()} words, ${commits} commits`);
