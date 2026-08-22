export const SITE = {
  name: 'Portuguese Estate',
  tagline: 'Independent guides to Portugal property investment',
  url: 'https://portuguese-estate.com',
  description:
    'Independent research on Lisbon, Algarve, Porto, Comporta, and Cascais property — IMT for non-residents, AL licensing, Golden Visa fund route, rental yields, and off-plan due diligence for US and UK buyers. Not a developer. Not a portal.',
  email: 'info@portuguese-estate.com',
  /**
   * WhatsApp business number. Empty until a real Portuguese (+351) number is
   * available — the previous value was a Thailand (+66) number inherited from
   * another MORE Group site and it shipped on 145 of 146 pages.
   *
   * While this is empty every WhatsApp CTA stays in place but routes to the lead
   * form instead of wa.me, so no enquiry is sent to the wrong number. Set both
   * fields to restore WhatsApp everywhere — no other file needs to change.
   */
  whatsapp: '',
  whatsappDisplay: '',
  editorial: 'Portuguese Estate Editorial',
  /** Wikidata entity — https://www.wikidata.org/wiki/Q140698878 */
  wikidataId: 'Q140698878' as string | null,
  sameAs: [
    'https://portuguese-estate.com/about/',
    'https://moregroup.estate/about/',
  ],
};
