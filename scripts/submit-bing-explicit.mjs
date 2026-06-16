#!/usr/bin/env node
/** Bing IndexNow — explicit URLs only (portuguese-estate.com). Never api.indexnow.org. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteConfig = JSON.parse(readFileSync(join(__dirname, '..', 'site.config.json'), 'utf8'));
const KEY = siteConfig.indexNow?.key || '326cf10d167118cd94780f774c0457e4';
const HOST = siteConfig.siteHost || 'portuguese-estate.com';
const BASE = (siteConfig.siteUrl || `https://${HOST}`).replace(/\/$/, '');

const arg = process.argv[2];
let urls = process.argv.slice(2).filter((u) => /^https?:\/\//.test(u));

if (urls.length === 0 && arg && arg.endsWith('.txt')) {
  urls = readFileSync(arg, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((u) => /^https?:\/\//.test(u));
}

if (!urls.length) {
  console.error(`Usage: node scripts/submit-bing-explicit.mjs https://${HOST}/...`);
  process.exit(1);
}

const bad = urls.filter((u) => !u.includes(HOST));
if (bad.length) {
  console.error(`Refusing cross-site URLs (expected host ${HOST}):`);
  bad.forEach((u) => console.error(`  ${u}`));
  process.exit(1);
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

console.log(`Bing IndexNow (${HOST}): ${res.status} ${res.statusText} (${urls.length} URLs)`);
if (![200, 202].includes(res.status)) {
  console.log(await res.text());
  process.exit(1);
}
