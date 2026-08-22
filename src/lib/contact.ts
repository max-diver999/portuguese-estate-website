import { SITE } from '../data/site';

/**
 * WhatsApp CTA routing.
 *
 * Two independent switches:
 *   `SITE.whatsapp`        — the wa.me link. Empty routes every CTA to lead
 *                            capture instead, so no enquiry reaches a wrong number.
 *   `SITE.whatsappDisplay` — the number as printed text. Empty keeps the buttons
 *                            fully working while the number itself is never shown
 *                            to a visitor. That is the current setup: the number
 *                            is an interim one, so it is dialled but not displayed.
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
