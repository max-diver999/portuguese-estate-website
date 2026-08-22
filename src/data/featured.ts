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
export const HOMEPAGE_HERO_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/A_Cheesy_Panorama_from_Miradouro_Sophia_de_Mello_Breyner_Andresen_%2823901472335%29.jpg/1280px-A_Cheesy_Panorama_from_Miradouro_Sophia_de_Mello_Breyner_Andresen_%2823901472335%29.jpg';
export const HOMEPAGE_HERO_ALT = "Panorama of Lisbon from the Miradouro Sophia de Mello Breyner Andresen";
export const HOMEPAGE_HERO_CREDIT = "Andreas Manessinger / Wikimedia Commons";
export const HOMEPAGE_HERO_LICENCE = "CC BY-SA 2.0";
export const HOMEPAGE_HERO_SOURCE = "https://commons.wikimedia.org/wiki/File:A_Cheesy_Panorama_from_Miradouro_Sophia_de_Mello_Breyner_Andresen_(23901472335).jpg";
