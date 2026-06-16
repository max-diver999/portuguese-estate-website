/**
 * Card thumbnail URLs — Cloudinary crop when available; external CDN as-is.
 */
export function getCardImageUrl(src: string | undefined, size: 'card' | 'hero' = 'card'): string {
  if (!src?.trim()) return '';

  const trimmed = src.trim();

  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const dims = size === 'hero' ? 'w_1400,h_560,c_fill,q_auto,f_auto' : 'w_640,h_360,c_fill,q_auto,f_auto';
    return trimmed.replace(/\/upload\/(?:v\d+\/)?/, `/upload/${dims}/`);
  }

  return trimmed;
}

export function formatAreaLabel(area?: string): string {
  if (!area) return '';
  return area
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatUsd(price?: number): string {
  if (!price || price <= 0) return '';
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(price / 1000)}K`;
}
