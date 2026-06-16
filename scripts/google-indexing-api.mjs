// Google Indexing API — portuguese-estate.com
// Usage:
//   node scripts/google-indexing-api.mjs [--batch N] [--offset N]
//   node scripts/google-indexing-api.mjs --explicit URL URL ...
//
// Daily quota: 200 URL/day. Use --offset for multi-day batches.
// NEVER run without explicit approval — prefer submit-google-explicit.mjs for new URLs.

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';
import { recordSubmitted } from '../../scripts/lib/record-submitted.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const KEY_PATH = join(__dirname, 'google-indexing-key.json');
const SITE_FOLDER = 'portuguese-estate-website';
const siteConfig = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const HOST = (siteConfig.siteUrl || `https://${siteConfig.siteHost}`).replace(/\/$/, '');
const ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

const args = process.argv.slice(2);
const explicitIdx = args.indexOf('--explicit');
const explicitUrls =
  explicitIdx !== -1 ? args.slice(explicitIdx + 1).filter((a) => /^https?:\/\//.test(a)) : [];
const batchSize = parseInt(args[args.indexOf('--batch') + 1]) || 200;
const offset = parseInt(args[args.indexOf('--offset') + 1]) || 0;

function collectUrls() {
  const urls = [
    `${HOST}/`,
    `${HOST}/guides/`,
    `${HOST}/areas/`,
    `${HOST}/compare/`,
    `${HOST}/projects/`,
    `${HOST}/developers/`,
    `${HOST}/about/`,
    `${HOST}/methodology/`,
    `${HOST}/contact/`,
    `${HOST}/get-shortlist/`,
    `${HOST}/privacy-policy/`,
    `${HOST}/terms/`,
  ];

  const contentDirs = {
    guides: join(ROOT, 'src', 'content', 'guides'),
    areas: join(ROOT, 'src', 'content', 'areas'),
    compare: join(ROOT, 'src', 'content', 'compare'),
    projects: join(ROOT, 'src', 'content', 'projects'),
    developers: join(ROOT, 'src', 'content', 'developers'),
    news: join(ROOT, 'src', 'content', 'news'),
  };

  for (const [section, dir] of Object.entries(contentDirs)) {
    try {
      for (const file of readdirSync(dir)) {
        if (file.endsWith('.mdx')) {
          const slug = file.replace('.mdx', '');
          urls.push(`${HOST}/${section}/${slug}/`);
        }
      }
    } catch (e) {
      console.warn(`  Skipping ${section}: ${e.message}`);
    }
  }

  return urls;
}

async function main() {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  if (key.project_id !== 'italian-estate-indexing') {
    console.error(`Wrong GCP project: ${key.project_id}`);
    process.exit(1);
  }
  console.log(`Preflight OK: ${key.project_id} | ${HOST}`);

  let allUrls;
  if (explicitUrls.length > 0) {
    allUrls = explicitUrls;
    console.log(`Explicit mode: ${allUrls.length} URL(s) (batch/offset ignored)`);
  } else {
    allUrls = collectUrls();
    console.log(`Total URLs found: ${allUrls.length}`);
  }

  const batch = explicitUrls.length > 0 ? allUrls : allUrls.slice(offset, offset + batchSize);
  console.log(
    explicitUrls.length > 0
      ? `Submitting all explicit URLs: ${batch.length}`
      : `Submitting batch: offset=${offset}, size=${batch.length} (of ${allUrls.length} total)`,
  );

  if (batch.length === 0) {
    console.log('No URLs to submit. All done!');
    return;
  }

  const auth = new GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const client = await auth.getClient();

  let success = 0;
  let errors = 0;
  const okUrls = [];

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    try {
      const res = await client.request({
        url: ENDPOINT,
        method: 'POST',
        data: { url, type: 'URL_UPDATED' },
      });

      if (res.status === 200) {
        success++;
        okUrls.push(url);
        if (success % 20 === 0 || i === batch.length - 1) {
          console.log(`  [${i + 1}/${batch.length}] ${success} OK, ${errors} errors`);
        }
      } else {
        errors++;
        console.log(`  [${i + 1}] ${url} — ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      errors++;
      const msg = e.response?.data?.error?.message || e.message;
      console.log(`  [${i + 1}] FAIL ${url} — ${msg}`);

      if (e.response?.status === 429) {
        console.log('\n⚠ Daily quota exceeded. Run again tomorrow with:');
        console.log(`  node scripts/google-indexing-api.mjs --offset ${offset + i}`);
        break;
      }
    }

    if (i % 50 === 49) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (okUrls.length) {
    const r = recordSubmitted({ siteFolder: SITE_FOLDER, urls: okUrls, channel: 'google' });
    console.log(`Log: +${r.added} → ${SITE_FOLDER}/scripts/submitted-urls.json (${r.total} total)`);
  }

  console.log(`\nDone! Success: ${success}, Errors: ${errors}`);
  if (explicitUrls.length > 0) return;
  if (offset + batchSize < allUrls.length) {
    console.log(`\nRemaining URLs: ${allUrls.length - offset - batchSize}`);
    console.log(`Run tomorrow: node scripts/google-indexing-api.mjs --offset ${offset + batchSize}`);
  } else {
    console.log('\nAll URLs have been submitted!');
  }
}

main().catch(console.error);
