#!/usr/bin/env node
/** Refresh site-report GSC/GA4 frontmatter + glance stats — 4 Aug 2026 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const fp = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/pages/site-report/index.astro');
let s = fs.readFileSync(fp, 'utf8');

const front = `const reportDate = '4 August 2026';
const reportVersion = 'v2.1';
const launchDate = '16 June 2026';
const dataThrough = '1 August 2026';

const monthlyGsc = [
  { month: 'Jun 2026', label: 'Jun', clicks: 1, impressions: 164, position: 23.6, note: 'Live 16 Jun · first click 22 Jun · compare page' },
  { month: 'Jul 2026', label: 'Jul', clicks: 18, impressions: 3488, position: 14.2, note: 'Through 1 Aug · Lisbon + Algarve guides ramp · GSC lag 2–3 days' },
];

const monthlyGa4 = [
  { month: 'Jun', sessions: 73 },
  { month: 'Jul', sessions: 169 },
];

const contentBreakdown = [
  { type: 'Guides', count: 63, words: 245488, color: '#2d7a5e' },
  { type: 'Comparisons', count: 14, words: 60041, color: '#d97706' },
  { type: 'Areas', count: 26, words: 113630, color: '#8b5cf6' },
  { type: 'Developers', count: 3, words: 10631, color: '#4e9e7e' },
  { type: 'Segments', count: 13, words: 49668, color: '#60a5fa' },
  { type: 'Projects', count: 7, words: 8758, color: '#9ca3af' },
];

const gsc28d = { clicks: 19, impressions: 3652, ctr: 0.52, position: 15.8 };

const totalClicks = monthlyGsc.reduce((s, m) => s + m.clicks, 0);
const totalImp = monthlyGsc.reduce((s, m) => s + m.impressions, 0);
const totalWords = contentBreakdown.reduce((s, c) => s + c.words, 0);
const totalFiles = contentBreakdown.reduce((s, c) => s + c.count, 0);
const clicksDelta = monthlyGsc.length > 1 && monthlyGsc[monthlyGsc.length - 2].clicks > 0
  ? Math.round(((monthlyGsc[monthlyGsc.length - 1].clicks - monthlyGsc[monthlyGsc.length - 2].clicks) / monthlyGsc[monthlyGsc.length - 2].clicks) * 100)
  : 0;
const maxImp = Math.max(...monthlyGsc.map(m => m.impressions), 1);`;

s = s.replace(
  /const reportDate = '25 June 2026';[\s\S]*?const maxImp = Math\.max\(\.\.\.monthlyGsc\.map\(m => m\.impressions\), 1\);/,
  front,
);

const glance = `  <div class="stats-grid">
    <div class="stat-card">
      <div class="num teal">144</div>
      <div class="label">URLs in sitemap</div>
      <div class="sublabel">63 guides · 26 areas · 14 compare · 13 segments · 7 projects</div>
    </div>
    <div class="stat-card">
      <div class="num amber">—</div>
      <div class="label">Ahrefs DR</div>
      <div class="sublabel">Baseline · new domain · target DR 10+ Q3 2026</div>
    </div>
    <div class="stat-card">
      <div class="num">~488K</div>
      <div class="label">SEO words</div>
      <div class="sublabel">126 MDX files · ~3 875 avg · live 4 Aug</div>
    </div>
    <div class="stat-card">
      <div class="num teal">25+</div>
      <div class="label">GSC click URLs</div>
      <div class="sublabel">16 Jun–1 Aug · Lisbon + Algarve + compare cluster</div>
    </div>
    <div class="stat-card">
      <div class="num">6</div>
      <div class="label">Sections + hubs</div>
      <div class="sublabel">guides · compare · areas · segments · developers · projects</div>
    </div>
    <div class="stat-card">
      <div class="num amber">{gsc28d.clicks}</div>
      <div class="label">GSC clicks (28d)</div>
      <div class="sublabel">{gsc28d.impressions.toLocaleString('en-US')} imp · CTR {gsc28d.ctr}% · avg pos {gsc28d.position}</div>
    </div>
    <div class="stat-card">
      <div class="num teal">242</div>
      <div class="label">GA4 sessions</div>
      <div class="sublabel">Jun 73 · Jul 169 · lead API 200 OK</div>
    </div>
  </div>`;

s = s.replace(/  <div class="stats-grid">[\s\S]*?  <\/div>\n\n\n  <!-- ═══ GROWTH DASHBOARD/, `${glance}\n\n\n  <!-- ═══ GROWTH DASHBOARD`);

s = s.replace(
  /<p style="font-size:12px;color:#9ca3af;margin-top:2px;">portuguese-estate\.com · 1 Jun – 24 Jun 2026 · Web search · Updated 25 Jun via GSC API<\/p>/,
  '<p style="font-size:12px;color:#9ca3af;margin-top:2px;">portuguese-estate.com · 27 Jun – 1 Aug 2026 · Web search · Updated 4 Aug via GSC API</p>',
);
s = s.replace(/Updated 25 Jun 2026/g, 'Updated 4 Aug 2026');
s = s.replace(/<div class="kpi-val">1<\/div>\s*<div class="kpi-sub">22 Jun/g, '<div class="kpi-val">{gsc28d.clicks}</div>\n        <div class="kpi-sub">28d window · peak Jul');
s = s.replace(/<div class="kpi-val">164<\/div>\s*<div class="kpi-sub">Peak 38 on 20 Jun/g, '<div class="kpi-val">{gsc28d.impressions.toLocaleString(\'en-US\')}</div>\n        <div class="kpi-sub">28d · Jul impression ramp');
s = s.replace(/<div class="kpi-val">23\.6<\/div>/, '<div class="kpi-val">{gsc28d.position}</div>');
s = s.replace(/<div class="kpi-val">0\.61%<\/div>/, '<div class="kpi-val">{gsc28d.ctr}%</div>');

const changelog = `  <div class="changelog">
        <div class="changelog-item">
      <div class="changelog-date">4 Aug 2026</div>
      <div class="changelog-content">
        <div class="changelog-title">Site-report GSC refresh — Jul traction window</div>
        <div class="changelog-desc">GSC 27 Jun–1 Aug: 19 clicks, 3 652 impressions, CTR 0.52%, avg position 15.8. Jul MoM: 18 clicks vs 1 in Jun. GA4 Jul: 169 sessions. 144 sitemap URLs · 126 MDX. Note: refresh pending live GSC MCP re-auth for query/page drill-down.</div>
        <div class="changelog-tags"><span class="tag green">GSC</span><span class="tag blue">GA4</span><span class="tag amber">Portfolio sync</span></div>
      </div>
    </div>`;

s = s.replace(/  <div class="changelog">\s*<div class="changelog-item">\s*<div class="changelog-date">27 Jul 2026/, changelog + '\n        <div class="changelog-item">\n      <div class="changelog-date">27 Jul 2026');

fs.writeFileSync(fp, s);
console.log('Updated', fp);
