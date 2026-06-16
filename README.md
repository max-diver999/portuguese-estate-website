# portuguese-estate.com

Independent EN advisory site for Portugal property investment (Tuscany, Puglia, Milan, Lake Como, Sicily).

## Stack

Astro 6 · MDX · Tailwind 4 · Vercel · Cloudinary `dphvjbqb4/more-group/italy/`

## Commands

```bash
npm run dev
npm run build          # includes rendered postbuild audit
npm run validate:content
npm run healthcheck
```

## Project images pipeline

```bash
cd ../08_Идеи/italy-re-projects
node scrape-italy-projects.mjs --from-portfolio --download
node scripts/build-italy-image-manifest.mjs
python3 scripts/upload-italy-cloudinary.py
```

Manifest: `08_Идеи/italy-re-projects/scripts/italy-cloudinary-manifest.json`

## Status (2026-06-14)

- Astro scaffold: hubs, lead API, QA scripts, llms.txt
- Parser batch 1: 6 Tier A projects scraped + 18 Cloudinary images
- MDX content batches: not started (guides / projects / areas)
