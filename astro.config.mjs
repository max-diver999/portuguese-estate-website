import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import { readdirSync } from 'node:fs';

// The news hub is noindex while the collection is empty (see
// src/pages/news/index.astro). A noindex page must not sit in the sitemap —
// Google reports that as "Submitted URL marked noindex". Mirror the same
// condition here so both flip together when the first article ships.
const newsIsEmpty = (() => {
  try {
    return !readdirSync('./src/content/news').some((f) => f.endsWith('.mdx'));
  } catch {
    return true;
  }
})();

export default defineConfig({
  site: 'https://portuguese-estate.com',
  output: 'static',
  trailingSlash: 'always',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter(page) {
        const excluded = [
          '/thanks/',
          '/site-report/',
          ...(newsIsEmpty ? ['/news/'] : []),
        ];
        return !excluded.some((path) => page.includes(path));
      },
      serialize(item) {
        if (item.url === 'https://portuguese-estate.com/') {
          return { ...item, priority: 1.0, changefreq: 'weekly' };
        }
        if (item.url.includes('/guides/')) {
          return { ...item, priority: 0.85, changefreq: 'weekly' };
        }
        if (item.url.includes('/areas/') || item.url.includes('/compare/')) {
          return { ...item, priority: 0.8, changefreq: 'weekly' };
        }
        if (item.url.includes('/projects/')) {
          return { ...item, priority: 0.75, changefreq: 'weekly' };
        }
        if (item.url.includes('/developers/')) {
          return { ...item, priority: 0.72, changefreq: 'monthly' };
        }
        if (item.url.includes('/news/')) {
          return { ...item, priority: 0.65, changefreq: 'weekly' };
        }
        if (
          item.url.includes('/invest-') ||
          item.url.includes('/tier-') ||
          item.url.includes('/portugal-property-consultation') ||
          item.url.includes('/get-shortlist')
        ) {
          return { ...item, priority: 0.88, changefreq: 'monthly' };
        }
        return { ...item, priority: 0.7, changefreq: 'monthly' };
      },
    }),
    mdx(),
  ],
});
