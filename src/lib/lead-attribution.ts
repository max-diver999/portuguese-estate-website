import {
  detectExternalAiSource as detectSharedExternalAiSource,
  type ExternalAiSource as SharedExternalAiSource,
} from './external-ai-sources';

export type ExternalAiSource = SharedExternalAiSource | '';

export type LeadAttribution = {
  page: string;
  currentPage: string;
  landingPage: string;
  referrer: string;
  firstReferrer: string;
  externalAiSource: ExternalAiSource;
  sessionId: string;
  lastCta: Record<string, unknown>;
  utm: Record<string, string>;
};

const STORAGE_KEYS = {
  landingPage: 'pe_landing_page',
  firstReferrer: 'pe_first_referrer',
  sessionId: 'pe_session_id',
  lastCta: 'pe_last_cta',
} as const;

export function detectExternalAiSource(referrer: string): ExternalAiSource {
  return detectSharedExternalAiSource(referrer) ?? '';
}

export function createLeadId(prefix: 'form' | 'wa' | 'ai' | 'session' = 'form'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getStoredValue(key: string, fallback: string): string {
  try {
    const stored = sessionStorage.getItem(key);
    return stored === null ? fallback : stored;
  } catch {
    return fallback;
  }
}

function ensureStoredValue(key: string, value: string): string {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing !== null) return existing;
    sessionStorage.setItem(key, value);
  } catch {
    return value;
  }
  return value;
}

export function initializeLeadAttribution(): void {
  if (typeof window === 'undefined') return;
  ensureStoredValue(STORAGE_KEYS.landingPage, window.location.href);
  ensureStoredValue(STORAGE_KEYS.firstReferrer, document.referrer || '');
  ensureStoredValue(STORAGE_KEYS.sessionId, createLeadId('session'));
}

export function rememberLastCta(cta: HTMLElement): void {
  if (typeof window === 'undefined') return;
  const payload = {
    id: cta.dataset.cta || '',
    href: cta instanceof HTMLAnchorElement ? cta.href : '',
    text: (cta.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    page: window.location.pathname,
    ts: Date.now(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEYS.lastCta, JSON.stringify(payload));
  } catch {
    // Attribution must never block navigation.
  }
}

export function getLeadAttribution(): LeadAttribution {
  initializeLeadAttribution();

  const landingPage = getStoredValue(STORAGE_KEYS.landingPage, window.location.href);
  const firstReferrer = getStoredValue(
    STORAGE_KEYS.firstReferrer,
    document.referrer || '',
  );
  const sessionId = getStoredValue(STORAGE_KEYS.sessionId, createLeadId('session'));
  const utm: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
    if (/^utm_/i.test(key) || ['gclid', 'fbclid', 'msclkid', 'ttclid'].includes(key)) {
      utm[key] = value;
    }
  }

  let lastCta: Record<string, unknown> = {};
  try {
    lastCta = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.lastCta) || '{}');
  } catch {
    lastCta = {};
  }

  return {
    page: window.location.pathname,
    currentPage: window.location.href,
    landingPage,
    referrer: document.referrer || '',
    firstReferrer,
    externalAiSource: detectExternalAiSource(firstReferrer),
    sessionId,
    lastCta,
    utm,
  };
}
