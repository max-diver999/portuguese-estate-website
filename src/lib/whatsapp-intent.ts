export const WHATSAPP_PLACEMENTS = [
  'float',
  'header',
  'header_mobile',
  'footer_social',
  'footer_contact',
  'inline_cta',
  'guide_commercial',
  'project_cta',
] as const;

export type WhatsAppPlacement = (typeof WHATSAPP_PLACEMENTS)[number];

export type WhatsAppIntentPayload = {
  intentId: string;
  sessionId: string;
  placement: WhatsAppPlacement;
  refCode: string;
  page: string;
  currentPage: string;
  landingPage: string;
  referrer: string;
  firstReferrer: string;
  externalAiSource: string;
  ctaId: string;
  ctaText: string;
  message: string;
  destination: string;
  utm: Record<string, string>;
  userAgent: string;
};

const PLACEMENT_SUFFIX: Record<WhatsAppPlacement, string> = {
  float: 'FLOAT',
  header: 'HEADER',
  header_mobile: 'HEADERM',
  footer_social: 'FOOTERS',
  footer_contact: 'FOOTERC',
  inline_cta: 'INLINE',
  guide_commercial: 'GUIDE',
  project_cta: 'PROJECT',
};

const PAGE_STOP_WORDS = new Set([
  'portugal',
  'portuguese',
  'estate',
  'invest',
  'property',
  'properties',
  'lisbon',
  'algarve',
  'guide',
  'investment',
  'complete',
  'review',
  'porto',
]);

export function isWhatsAppHref(href: string): boolean {
  try {
    const hostname = new URL(href, 'https://portuguese-estate.com').hostname.toLowerCase();
    return hostname === 'wa.me' || hostname.endsWith('.whatsapp.com');
  } catch {
    return false;
  }
}

export function normalizePageToken(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const raw = segments.at(-1) || 'home';
  const words = raw
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .filter((word) => !PAGE_STOP_WORDS.has(word.toLowerCase()))
    .filter((word) => !/^20\d{2}$/.test(word));
  const token = (words.join('') || raw)
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 24);
  return token || 'HOME';
}

export function buildWhatsAppRefCode(
  pathname: string,
  placement: WhatsAppPlacement,
): string {
  return `${normalizePageToken(pathname)}-${PLACEMENT_SUFFIX[placement]}`;
}

export function addRefCodeToWhatsAppHref(href: string, refCode: string): string {
  const url = new URL(href, 'https://wa.me');
  const existing =
    url.searchParams.get('text')?.trim() ||
    'Hi, I need help with a Portugal property enquiry from Portuguese Estate.';
  const marker = `[Ref: ${refCode}]`;
  const message = existing.includes(marker) ? existing : `${existing}\n\n${marker}`;
  url.searchParams.set('text', message);
  return url.href;
}

export function getWhatsAppMessage(href: string): string {
  try {
    return new URL(href).searchParams.get('text') || '';
  } catch {
    return '';
  }
}

export function isWhatsAppPlacement(value: string): value is WhatsAppPlacement {
  return WHATSAPP_PLACEMENTS.includes(value as WhatsAppPlacement);
}
