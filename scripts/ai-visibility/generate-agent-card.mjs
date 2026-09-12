#!/usr/bin/env node
/**
 * /.well-known/agent.json, the agent card.
 *
 * Deliberately not an A2A service card: this site runs no JSON-RPC agent
 * endpoint, and claiming one would be a promise the site cannot keep. The card
 * describes what actually exists, the machine-readable content surface, and says
 * so in `protocol` and `note`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadConfig } from './lib.mjs';

const cfg = loadConfig();
const OUT_DIR = path.join(ROOT, 'public/.well-known');

function buildCard() {
  const p = cfg.contentPolicy || {};
  const abs = (u) => `${cfg.siteUrl}${u}`;
  return {
    protocol: 'content-surface',
    protocolVersion: '1.0',
    note:
      'This card describes a content surface, not a callable agent. The site exposes no JSON-RPC or A2A endpoint; ' +
      'everything listed under resources is a plain HTTP GET.',
    name: cfg.title,
    description: cfg.summary,
    entity: cfg.entity,
    url: `${cfg.siteUrl}/`,
    language: cfg.language,
    provider: {
      organization: cfg.brand,
      url: `${cfg.siteUrl}/`,
      ...(cfg.contact?.email ? { email: cfg.contact.email } : {}),
      ...(cfg.contact?.telegram ? { telegram: cfg.contact.telegram } : {}),
      ...(cfg.contact?.page ? { contactPage: abs(cfg.contact.page) } : {}),
    },
    resources: {
      homepageMarkdown: abs('/index.md'),
      agentIndex: abs('/llms.txt'),
      fullCorpus: abs('/llms-full.txt'),
      sitemap: abs('/sitemap-index.xml'),
      robots: abs('/robots.txt'),
      markdownNegotiation: {
        howTo: 'Append .md to any content URL, or send `Accept: text/markdown`.',
        example: cfg.collections?.[0]
          ? `${cfg.siteUrl}${cfg.collections[0].urlPrefix}/<slug>.md`
          : abs('/index.md'),
      },
    },
    keyPages: (cfg.keyPages || []).map((k) => ({ url: abs(k.url), label: k.label })),
    contentPolicy: {
      signal: `search=${p.search ?? 'yes'}, ai-input=${p.aiInput ?? 'yes'}, ai-train=${p.aiTrain ?? 'no'}`,
      search: p.search ?? 'yes',
      aiInput: p.aiInput ?? 'yes',
      aiTrain: p.aiTrain ?? 'no',
      attribution: `Cite as "${cfg.brand}" with a link to the page URL.`,
      source: 'https://contentsignals.org',
    },
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const card = buildCard();
  const out = path.join(OUT_DIR, 'agent.json');
  await fs.writeFile(out, `${JSON.stringify(card, null, 2)}\n`, 'utf8');
  console.log(`[agent-card] wrote ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error('[agent-card] ERROR:', err);
  process.exit(1);
});
