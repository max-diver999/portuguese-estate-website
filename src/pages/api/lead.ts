import type { APIRoute } from 'astro';
import { SITE } from '../../data/site';

export const prerender = false;

const TG_TOKEN = import.meta.env.TG_TOKEN;
const TG_CHAT_ID = import.meta.env.TG_CHAT_ID;
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const LEAD_FROM_EMAIL = import.meta.env.LEAD_FROM_EMAIL || `Portuguese Estate <${SITE.email}>`;

function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegram(text: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) throw new Error('Telegram not configured');
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}

async function sendAutoReply(to: string, name: string, context: string) {
  if (!RESEND_API_KEY || !to.includes('@')) return;
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
  const topic = context ? escapeHtml(context) : 'your Portugal property enquiry';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: LEAD_FROM_EMAIL,
      reply_to: SITE.email,
      to: [to],
      subject: 'We received your request — Portuguese Estate',
      html: `<p>${greeting}</p>
<p>Thank you for contacting Portuguese Estate. We received your request regarding <strong>${topic}</strong>.</p>
<p>A licensed partner will review your enquiry and reply by email or WhatsApp, usually within one business day.</p>
<p>— <strong>Portuguese Estate Editorial</strong><br><a href="${SITE.url}">${SITE.url.replace('https://', '')}</a></p>
<p style="font-size:12px;color:#666;">Independent research — not financial or legal advice.</p>`,
    }),
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      name, phone, email, contact, budget, goal, message, context, source, page, market,
    } = body;

    const phoneText = String(phone || contact || '').trim();
    const emailText = String(email || '').trim();
    const isHealthcheck =
      String(source || '').toLowerCase().includes('healthcheck') ||
      phoneText === 'healthcheck@bot';

    if (!isHealthcheck && phoneText.replace(/\D/g, '').length < 8) {
      return new Response(JSON.stringify({ error: 'Valid phone required' }), { status: 400 });
    }

    const lines = [
      isHealthcheck ? '🧪 <b>TEST portuguese-estate.com</b>' : '🇵🇹 <b>New lead — Portuguese Estate</b>',
      '',
      name ? `👤 <b>Name:</b> ${name}` : null,
      phoneText ? `📱 <b>Phone:</b> ${phoneText}` : null,
      emailText ? `✉️ <b>Email:</b> ${emailText}` : null,
      market ? `🌍 <b>Market:</b> ${market}` : null,
      budget ? `💰 <b>Budget:</b> ${budget}` : null,
      goal ? `🎯 <b>Goal:</b> ${goal}` : null,
      message ? `💬 <b>Message:</b> ${message}` : null,
      context ? `📄 <b>Context:</b> ${context}` : null,
      source ? `🔗 <b>Source:</b> ${source}` : null,
      page ? `🌐 <b>Page:</b> ${page}` : null,
    ].filter(Boolean).join('\n');

    await sendTelegram(lines);

    if (!isHealthcheck && emailText) {
      try {
        await sendAutoReply(emailText, String(name || ''), String(context || ''));
      } catch (err) {
        console.error('Auto-reply failed:', err);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Lead API error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
