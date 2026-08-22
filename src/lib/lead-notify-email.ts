/**
 * Duplicate every lead to the owner inbox so Telegram is never the single point of failure.
 * Env (Vercel, never committed): RESEND_API_KEY, LEAD_NOTIFY_EMAIL, LEAD_NOTIFY_FROM.
 */
const RESEND_API_KEY = (
  import.meta.env.RESEND_API_KEY ||
  process.env.RESEND_API_KEY ||
  ''
).trim();

const LEAD_NOTIFY_EMAIL = (
  import.meta.env.LEAD_NOTIFY_EMAIL ||
  process.env.LEAD_NOTIFY_EMAIL ||
  'moregroup.realestate@gmail.com'
).trim();

const DEFAULT_FROM = (
  import.meta.env.LEAD_NOTIFY_FROM ||
  process.env.LEAD_NOTIFY_FROM ||
  'Portuguese Estate Leads <hello@moregroup.estate>'
).trim();

export type LeadNotifyResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: string };

export async function sendLeadNotifyEmail(params: {
  subject: string;
  htmlBody: string;
  from?: string;
  replyTo?: string;
}): Promise<LeadNotifyResult> {
  if (!RESEND_API_KEY) return { ok: false, reason: 'RESEND_API_KEY missing' };
  if (!LEAD_NOTIFY_EMAIL) return { ok: false, reason: 'LEAD_NOTIFY_EMAIL missing' };

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#111">${params.htmlBody.replace(/\n/g, '<br>')}</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from || DEFAULT_FROM,
      to: [LEAD_NOTIFY_EMAIL],
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      subject: params.subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Lead notify email failed:', res.status, detail);
    return { ok: false, reason: `Resend ${res.status}` };
  }

  return { ok: true };
}
