import { SITE } from '../data/site';

/**
 * WhatsApp CTA routing.
 *
 * The site shipped a Thailand (+66) number on 145 of 146 pages for months. Until
 * a real Portuguese number is configured in `SITE.whatsapp`, every WhatsApp CTA
 * stays where it is but routes to lead capture instead of wa.me, so no enquiry
 * reaches the wrong number and no button claims to open WhatsApp when it cannot.
 *
 * Setting `SITE.whatsapp` restores WhatsApp everywhere with no other change.
 */
export const hasWhatsApp = Boolean(SITE.whatsapp);

/** Default destination when WhatsApp is unavailable. */
export const LEAD_FALLBACK_HREF = '/get-shortlist/';

/** wa.me deep link with a prefilled message, or the lead-capture fallback. */
export function waHref(message: string, fallback: string = LEAD_FALLBACK_HREF): string {
  return hasWhatsApp ? `${SITE.whatsapp}?text=${encodeURIComponent(message)}` : fallback;
}

/** Button text — never promises WhatsApp when there is no number behind it. */
export function waLabel(whenAvailable = 'WhatsApp', whenNot = 'Get shortlist'): string {
  return hasWhatsApp ? whenAvailable : whenNot;
}

/** Link target/rel — only external when it actually leaves the site. */
export const waLinkAttrs = hasWhatsApp
  ? { target: '_blank', rel: 'noopener noreferrer' }
  : {};
