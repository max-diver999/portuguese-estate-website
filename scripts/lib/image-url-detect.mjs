/** Detect image-like URLs for audit-all-images.mjs (all MORE niche sites). */
export function isImageUrl(url) {
  if (!url?.startsWith('http')) return false;
  return (
    url.includes('cloudinary.com') ||
    url.includes('wikimedia') ||
    url.includes('unsplash') ||
    url.includes('images.unsplash') ||
    /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(url)
  );
}
