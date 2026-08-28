/** Editorial picks for homepage featured grids (order preserved). */
export const FEATURED_PROJECT_SLUGS = [
  'tomas-ribeiro-79',
  'terracos-do-monte',
  'six-senses-comporta',
  'carvalhido',
  'castilho-203',
  'infinity',
  'mar-adentro',
] as const;

/** Hero spotlight — links to full project review from homepage banner. */
export const HOMEPAGE_HERO_PROJECT_SLUG = 'tomas-ribeiro-79' as const;

export const FEATURED_GUIDE_SLUGS = [
  'how-to-buy-property-portugal-step-by-step',
  'complete-before-september-2026-imt-guide',
  'portugal-property-under-500000-euros',
  'portugal-property-under-300000-euros',
  'buy-property-portugal-foreigner',
  'imt-tax-non-resident-portugal-2026',
] as const;

export const FEATURED_AREA_SLUGS = [
  'sintra-property-investment',
  'madeira-property-investment-guide',
  'cascais-property-investment',
  'faro-property-investment',
] as const;

/**
 * Homepage hero. Its own photograph, not a project's — the featured project is
 * named in the card overlay, and reusing that project's hero here would put the
 * same picture on two pages.
 */
/**
 * Homepage hero: the Pombaline roofscape of the Baixa, shot from above — the
 * frame the design direction is named for.
 *
 * Bundled into the build rather than hotlinked. The upstream Wikimedia thumb
 * URLs 400 for most widths and are rate-limited, so an external hero could go
 * blank without any change on our side.
 *
 * CC BY-SA 3.0 (Mam2710). Attribution is on /image-credits/, linked from the
 * footer, so no caption sits on the homepage.
 */
export const HOMEPAGE_HERO_IMAGE = '/images/lisbon-baixa-rooftops.jpg';
export const HOMEPAGE_HERO_WIDTH = 1200;
export const HOMEPAGE_HERO_HEIGHT = 800;
export const HOMEPAGE_HERO_ALT =
  "The Pombaline roofscape of Lisbon's Baixa seen from above";
