import type { APIRoute } from 'astro';
import { detectExternalAiSource } from '../../lib/lead-attribution';
import { sendLeadNotifyEmail } from '../../lib/lead-notify-email';
import { SITE } from '../../data/site';
import {
  buildWhatsAppRefCode,
  isWhatsAppPlacement,
  type WhatsAppIntentPayload,
} from '../../lib/whatsapp-intent';

export const prerender = false;

const TG_TOKEN = import.meta.env.TG_TOKEN || process.env.TG_TOKEN || '';
const TG_CHAT_ID = import.meta.env.TG_CHAT_ID || process.env.TG_CHAT_ID || '';
const LEAD_FROM_EMAIL =
  import.meta.env.LEAD_FROM_EMAIL || `Portuguese Estate <${SITE.email}>`;

function cleanText(value: unknown, max = 500): string {
  return String(value || '').trim().slice(0, max);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeSiteUrl(value: unknown): string {
  const raw = cleanText(value, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw, SITE.url);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const host = url.hostname.toLowerCase();
    if (host !== 'portuguese-estate.com' && !host.endsWith('.vercel.app')) {
      return '';
    }
    return url.href;
  } catch {
    return '';
  }
}

function normalizePage(value: unknown, currentPage: string): string {
  const raw = cleanText(value, 500);
  if (raw.startsWith('/')) return raw;
  try {
    return new URL(currentPage || SITE.url).pathname || '/';
  } catch {
    return '/';
  }
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!TG_TOKEN || !TG_CHAT_ID) return false;
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram wa-intent failed: ${res.status} ${await res.text()}`);
  }
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Partial<WhatsAppIntentPayload>;
    const intentId = cleanText(body.intentId, 200);
    const sessionId = cleanText(body.sessionId, 200);
    const placementText = cleanText(body.placement, 50);
    const currentPage = normalizeSiteUrl(body.currentPage);
    const page = normalizePage(body.page, currentPage);

    if (!/^wa_[a-z0-9_-]{8,196}$/i.test(intentId)) {
      return new Response(JSON.stringify({ error: 'Invalid WhatsApp intent ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!isWhatsAppPlacement(placementText)) {
      return new Response(JSON.stringify({ error: 'Invalid WhatsApp placement' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const refCode = buildWhatsAppRefCode(page, placementText);
    const landingPage = normalizeSiteUrl(body.landingPage) || currentPage;
    const firstReferrer = cleanText(body.firstReferrer, 1000);
    const externalAiSource =
      cleanText(body.externalAiSource, 80) || detectExternalAiSource(firstReferrer);
    const ctaId = cleanText(body.ctaId, 160);
    const ctaText = cleanText(body.ctaText, 240);
    const referrer = cleanText(body.referrer, 1000);
    const destination = cleanText(body.destination, 1500);
    const message = cleanText(body.message, 1000);
    const userAgent = cleanText(request.headers.get('user-agent') || body.userAgent, 500);
    const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
    const utmText = Object.entries(utm)
      .map(([key, value]) => `${cleanText(key, 80)}=${cleanText(value, 300)}`)
      .join(' | ');

    const lines = [
      '💬 <b>WhatsApp click | portuguese-estate.com</b>',
      `🧭 <b>Ref:</b> ${escapeHtml(refCode)}`,
      `📍 <b>Placement:</b> ${escapeHtml(placementText)}`,
      `🌐 <b>Page:</b> ${escapeHtml(currentPage || page)}`,
      landingPage ? `🛬 <b>Landing:</b> ${escapeHtml(landingPage)}` : null,
      ctaText ? `🖱 <b>CTA:</b> ${escapeHtml(ctaText)}` : null,
      ctaId ? `🏷 <b>CTA ID:</b> ${escapeHtml(ctaId)}` : null,
      externalAiSource ? `🤖 <b>External AI:</b> ${escapeHtml(externalAiSource)}` : null,
      referrer ? `↩️ <b>Referrer:</b> ${escapeHtml(referrer)}` : null,
      utmText ? `📣 <b>UTM:</b> ${escapeHtml(utmText)}` : null,
      message ? `✉️ <b>Prefill:</b> ${escapeHtml(message)}` : null,
      `🆔 <b>Intent:</b> ${escapeHtml(intentId)}`,
      sessionId ? `🔗 <b>Session:</b> ${escapeHtml(sessionId)}` : null,
    ].filter(Boolean).join('\n');

    const plainLines = [
      'WhatsApp click | portuguese-estate.com',
      `Ref: ${refCode}`,
      `Placement: ${placementText}`,
      `Page: ${currentPage || page}`,
      landingPage ? `Landing: ${landingPage}` : null,
      ctaText ? `CTA: ${ctaText}` : null,
      ctaId ? `CTA ID: ${ctaId}` : null,
      externalAiSource ? `External AI: ${externalAiSource}` : null,
      referrer ? `Referrer: ${referrer}` : null,
      utmText ? `UTM: ${utmText}` : null,
      message ? `Prefill: ${message}` : null,
      `Intent: ${intentId}`,
      sessionId ? `Session: ${sessionId}` : null,
      userAgent ? `User agent: ${userAgent}` : null,
    ].filter(Boolean).join('\n');

    let telegram = false;
    try {
      telegram = await sendTelegram(lines);
    } catch (error) {
      console.error(error);
    }

    try {
      await sendLeadNotifyEmail({
        subject: `WhatsApp click — portuguese-estate.com (${refCode})`,
        htmlBody: plainLines,
        from: LEAD_FROM_EMAIL,
      });
    } catch (error) {
      console.error('wa-intent email notify failed:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        telegram,
        refCode,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('WhatsApp intent API failed:', error);
    return new Response(JSON.stringify({ error: 'WhatsApp intent failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
