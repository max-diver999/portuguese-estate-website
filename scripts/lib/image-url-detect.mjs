/** Detect image-like URLs for audit-all-images.mjs (all MORE niche sites). */
export function isImageUrl(url) {
  if (!url?.startsWith('http')) return false;
  return (
    url.includes('cloudinary.com') ||
    // upload.wikimedia.org serves files; commons.wikimedia.org/wiki/File:... is the
    // human-readable licence page we link to for attribution, not an image.
    url.includes('upload.wikimedia.org') ||
    url.includes('unsplash') ||
    url.includes('images.unsplash') ||
    /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(url)
  );
}
