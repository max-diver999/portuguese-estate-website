// IndexNow — submit portuguese-estate.com URLs to Bing ONLY (never api.indexnow.org / Yandex)
// Run: node scripts/indexnow-submit.mjs
//   or: node scripts/indexnow-submit.mjs --explicit URL URL ...

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logIndexNowSuccess } from '../../scripts/lib/indexnow-log.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const INDEXNOW_SCRIPT = fileURLToPath(import.meta.url);
const siteConfig = JSON.parse(readFileSync(join(__dir, '..', 'site.config.json'), 'utf8'));
const KEY = siteConfig.indexNow?.key || '326cf10d167118cd94780f774c0457e4';
const HOST = siteConfig.siteHost || 'portuguese-estate.com';
const BASE = siteConfig.siteUrl?.replace(/\/$/, '') || `https://${HOST}`;

const args = process.argv.slice(2);
const explicitIdx = args.indexOf('--explicit');
const explicitUrls =
  explicitIdx !== -1 ? args.slice(explicitIdx + 1).filter((a) => /^https?:\/\//.test(a)) : [];

function buildAllUrls() {
  const urls = [
    `${BASE}/`,
    `${BASE}/guides/`,
    `${BASE}/areas/`,
    `${BASE}/compare/`,
    `${BASE}/projects/`,
    `${BASE}/developers/`,
    `${BASE}/news/`,
    `${BASE}/about/`,
    `${BASE}/methodology/`,
    `${BASE}/contact/`,
    `${BASE}/get-shortlist/`,
    `${BASE}/privacy-policy/`,
    `${BASE}/terms/`,
  ];

  for (const [section, subPath] of [
    ['guides', './src/content/guides'],
    ['areas', './src/content/areas'],
    ['compare', './src/content/compare'],
    ['projects', './src/content/projects'],
    ['developers', './src/content/developers'],
    ['news', './src/content/news'],
  ]) {
    try {
      for (const file of readdirSync(join(__dir, '..', subPath))) {
        if (file.endsWith('.mdx')) {
          const slug = file.replace('.mdx', '');
          urls.push(`${BASE}/${section}/${slug}/`);
        }
      }
    } catch {
      // collection missing — skip
    }
  }

  return urls;
}

const urls = explicitUrls.length > 0 ? explicitUrls : buildAllUrls();

if (explicitUrls.length > 0) {
  console.log(`IndexNow explicit mode: ${urls.length} URL(s)`);
} else {
  console.log(`Submitting ${urls.length} URLs to Bing IndexNow (${HOST}, key ${KEY.slice(0, 8)}…)...`);
}

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `${BASE}/${KEY}.txt`,
  urlList: urls,
});

const res = await fetch('https://www.bing.com/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body,
});

console.log(`Response: ${res.status} ${res.statusText}`);

if (res.status === 200) {
  console.log(`✅ Success! ${urls.length} URLs submitted to Bing IndexNow`);
  logIndexNowSuccess(INDEXNOW_SCRIPT, urls, 'bing');
} else if (res.status === 202) {
  console.log('✅ Accepted! URLs queued for processing.');
  logIndexNowSuccess(INDEXNOW_SCRIPT, urls, 'bing');
} else {
  const text = await res.text();
  console.log(`Response body: ${text}`);
}

console.log('\nSubmitted URLs:');
urls.forEach((u) => console.log(' ', u));
