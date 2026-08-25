/** Validate that every Cloudinary delivery URL is bandwidth-safe. */
const ANY = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>)\]]+/gi;
const DELIVERY = /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/([^/]*)\/(.+)$/i;

export function runCloudinaryDeliveryChecks({ prefix, text, errors, legacyExempt = false }) {
  if (!text || !errors) return;
  for (const raw of new Set(text.match(ANY) || [])) {
    const url = raw.replace(/[.,;:]+$/, '');
    const match = url.match(DELIVERY);
    if (!match) {
      errors.push(`${prefix} malformed or bare Cloudinary delivery URL: ${url.slice(0, 100)}`);
      continue;
    }
    if (legacyExempt) continue;
    const [, cloud, transforms, publicId] = match;
    if (cloud !== 'dlrrtf6bq') {
      errors.push(`${prefix} wrong Cloudinary account (${cloud}); expected dlrrtf6bq`);
    }
    if (!publicId.startsWith('more-group/portugal/')) {
      errors.push(`${prefix} wrong Cloudinary market path: ${publicId.slice(0, 90)}`);
    }
    const missing = [];
    if (!/\bf_auto\b/.test(transforms)) missing.push('f_auto');
    if (!/\bq_auto(?::[a-z]+)?\b/.test(transforms)) missing.push('q_auto');
    if (!/\bw_\d+\b/.test(transforms)) missing.push('w_<width>');
    if (missing.length) {
      errors.push(`${prefix} Cloudinary URL missing ${missing.join(', ')}: ${url.slice(0, 100)}`);
    }
  }
}

export default { runCloudinaryDeliveryChecks };
