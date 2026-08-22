export const SITE = {
  name: 'Portuguese Estate',
  tagline: 'Independent guides to Portugal property investment',
  url: 'https://portuguese-estate.com',
  description:
    'Independent research on Lisbon, Algarve, Porto, Comporta, and Cascais property — IMT for non-residents, AL licensing, Golden Visa fund route, rental yields, and off-plan due diligence for US and UK buyers. Not a developer. Not a portal.',
  email: 'info@portuguese-estate.com',
  /**
   * WhatsApp business number — INTERIM.
   *
   * This is a Thailand (+66) number inherited from another MORE Group site. It is
   * kept live deliberately so every WhatsApp CTA on the site actually opens a
   * chat, but `whatsappDisplay` is empty so the number is never printed as text
   * anywhere a visitor can read it. A buyer researching Lisbon property never
   * sees a +66 country code; the button simply works.
   *
   * When a partner or own Portuguese number is available:
   *   1. set `whatsapp` to the new wa.me link
   *   2. set `whatsappDisplay` to the formatted number to show it publicly again
   *   3. set `whatsappInterim` to false to re-arm the strict +351 gate check
   * Nothing else needs to change.
   */
  whatsapp: 'https://wa.me/66651195327',
  /** Public-facing number. Empty = the number is used but never displayed. */
  whatsappDisplay: '',
  /** Interim number in use — relaxes the contact-country-code gate to a notice. */
  whatsappInterim: true,
  editorial: 'Portuguese Estate Editorial',
  /** Wikidata entity — https://www.wikidata.org/wiki/Q140698878 */
  wikidataId: 'Q140698878' as string | null,
  sameAs: [
    'https://portuguese-estate.com/about/',
    'https://moregroup.estate/about/',
  ],
};
