/**
 * Duplicate lead alerts to owner inbox (backup when Telegram blocked).
 * Env: RESEND_API_KEY, LEAD_NOTIFY_EMAIL (default moregroup.realestate@gmail.com)
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

const DEFAULT_FROM =
  import.meta.env.LEAD_NOTIFY_FROM ||
  process.env.LEAD_NOTIFY_FROM ||
  'MORE Group Leads <info@moregroup.estate>';

export async function sendLeadNotifyEmail(params: {
  subject: string;
  htmlBody: string;
  from?: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !LEAD_NOTIFY_EMAIL) return;

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
      subject: params.subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error('Lead notify email failed:', res.status, await res.text());
  }
}
