#!/usr/bin/env node
/**
 * Verify SA ownership for portuguese-estate.com via Site Verification API.
 *
 * Usage:
 *   node scripts/verify-sa-ownership.mjs --get-token   # get verification file, save to public/
 *   node scripts/verify-sa-ownership.mjs --verify       # complete verification after deploy
 *   node scripts/verify-sa-ownership.mjs --check        # check current verification status
 */

import { GoogleAuth } from 'google-auth-library';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH = join(__dirname, 'google-indexing-key.json');
const SITE_URL = 'https://portuguese-estate.com/';
const PUBLIC_DIR = join(__dirname, '..', 'public');

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
console.log(`Using SA: ${key.client_email}`);
console.log(`Project: ${key.project_id}`);
console.log(`Site: ${SITE_URL}\n`);

const auth = new GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/siteverification'],
});

const action = process.argv[2];

async function getToken() {
  const client = await auth.getClient();
  const res = await client.request({
    url: 'https://www.googleapis.com/siteVerification/v1/token',
    method: 'POST',
    data: {
      site: { type: 'SITE', identifier: SITE_URL },
      verificationMethod: 'FILE',
    },
  });

  const token = res.data.token;
  console.log('Verification token:', token);

  const filePath = join(PUBLIC_DIR, token);
  writeFileSync(filePath, `google-site-verification: ${token}`);
  console.log(`Saved to: public/${token}`);
  console.log('\nNext steps:');
  console.log('  1. Deploy the site (git commit + push or vercel --prod)');
  console.log(`  2. Verify file is live: curl https://portuguese-estate.com/${token}`);
  console.log('  3. Run: node scripts/verify-sa-ownership.mjs --verify');
}

async function verify() {
  const client = await auth.getClient();
  try {
    const res = await client.request({
      url: 'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE',
      method: 'POST',
      data: {
        site: { type: 'SITE', identifier: SITE_URL },
      },
    });
    console.log('Verification SUCCESS!');
    console.log('Owner:', JSON.stringify(res.data.owners));
    console.log('Site:', res.data.site);
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.error('Verification FAILED:', e.response?.status, msg);
    if (msg.includes('token')) {
      console.log('\nMake sure the verification file is deployed and accessible.');
    }
  }
}

async function check() {
  const client = await auth.getClient();
  try {
    const res = await client.request({
      url: 'https://www.googleapis.com/siteVerification/v1/webResource',
      method: 'GET',
    });
    console.log('Verified resources:');
    for (const r of res.data.items || []) {
      console.log(`  ${r.site?.identifier} — owners: ${r.owners?.join(', ')}`);
    }
    if (!res.data.items?.length) console.log('  (none)');
  } catch (e) {
    console.error('Check failed:', e.response?.status, e.response?.data?.error?.message || e.message);
  }
}

if (action === '--get-token') await getToken();
else if (action === '--verify') await verify();
else if (action === '--check') await check();
else {
  console.log('Usage:');
  console.log('  --get-token   Get verification file and save to public/');
  console.log('  --verify      Complete verification after deploy');
  console.log('  --check       Check current verification status');
}
