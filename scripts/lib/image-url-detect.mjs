/** Detect image-like URLs for audit-all-images.mjs (all MORE niche sites). */
export function isImageUrl(url) {
  if (!url?.startsWith('http')) return false;
  if (url.includes('${') || url.includes('{{')) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (
    parsed.hostname === 'commons.wikimedia.org' &&
    parsed.pathname.startsWith('/wiki/File:')
  ) {
    return false;
  }
  const hasAssetPath = parsed.pathname !== '/' && parsed.pathname !== '';
  return (
    (parsed.hostname.endsWith('cloudinary.com') && hasAssetPath) ||
    (parsed.hostname === 'upload.wikimedia.org' && hasAssetPath) ||
    (parsed.hostname === 'images.unsplash.com' && hasAssetPath) ||
    /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(url)
  );
}
