#!/usr/bin/env node
/** Google Indexing API — explicit URLs only (portuguese-estate.com). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';
import { recordSubmitted } from '../../scripts/lib/record-submitted.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const KEY_PATH = join(__dirname, 'google-indexing-key.json');
const ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SITE_FOLDER = 'portuguese-estate-website';

const siteConfig = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const SITE_HOST = siteConfig.siteHost || 'portuguese-estate.com';

const urls = process.argv.slice(2).filter((u) => /^https?:\/\//.test(u));

if (!urls.length) {
  console.error(`Usage: node scripts/submit-google-explicit.mjs https://${SITE_HOST}/...`);
  process.exit(1);
}

const bad = urls.filter((u) => !u.includes(SITE_HOST));
if (bad.length) {
  console.error(`Refusing cross-site URLs (expected host ${SITE_HOST}):`);
  bad.forEach((u) => console.error(`  ${u}`));
  process.exit(1);
}

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
if (key.project_id !== 'italian-estate-indexing') {
  console.error(`Wrong GCP project in key: ${key.project_id} (expected italian-estate-indexing)`);
  process.exit(1);
}
console.log(`Preflight OK: ${key.project_id} | ${key.client_email}`);

const auth = new GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});
const client = await auth.getClient();
let ok = 0;
let fail = 0;
const okUrls = [];

for (const url of urls) {
  try {
    const res = await client.request({
      url: ENDPOINT,
      method: 'POST',
      data: { url, type: 'URL_UPDATED' },
    });
    if (res.status === 200) {
      ok++;
      okUrls.push(url);
      console.log(`OK ${url}`);
    } else {
      fail++;
      console.log(`ERR ${res.status}: ${url}`);
    }
  } catch (e) {
    fail++;
    const msg = e.response?.data?.error?.message || e.message;
    console.log(`FAIL ${url} — ${msg}`);
    if (e.response?.status === 429) break;
  }
}

if (okUrls.length) {
  const r = recordSubmitted({ siteFolder: SITE_FOLDER, urls: okUrls, channel: 'google' });
  console.log(`Log: +${r.added} → ${SITE_FOLDER}/scripts/submitted-urls.json (${r.total} total)`);
}

console.log(`Google: ${ok}/${urls.length} OK, ${fail} errors`);
