import dimensions from '../data/portugal-image-dimensions.json';

type Variant = 'hero' | 'homepage' | 'card';
type Dimension = { width: number; height: number };
type LocalCandidate = { url: string; width: number };

const R2_PATTERN = /^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i;
const WIDTHS = {
  hero: [360, 480, 768, 1024, 1280],
  homepage: [360, 480, 768, 1024],
  card: [360, 480, 640],
} as const;

const LOCAL_HOMEPAGE_HERO: LocalCandidate[] = [
  { url: '/images/lisbon-baixa-rooftops-360.webp', width: 360 },
  { url: '/images/lisbon-baixa-rooftops-480.webp', width: 480 },
  { url: '/images/lisbon-baixa-rooftops-768.webp', width: 768 },
  { url: '/images/lisbon-baixa-rooftops-1024.webp', width: 1024 },
  { url: '/images/lisbon-baixa-rooftops.jpg', width: 1200 },
];

function r2PublicId(src: string): string | null {
  const match = R2_PATTERN.exec(src.trim());
  if (!match) return null;
  return match[1].replace(/\.webp$/i, '');
}

function localHomepageHero(src: string, variant: Variant) {
  if (variant !== 'homepage' || src !== '/images/lisbon-baixa-rooftops.jpg') return null;
  return {
    src: LOCAL_HOMEPAGE_HERO.at(-1)!.url,
    srcset: LOCAL_HOMEPAGE_HERO.map(({ url, width }) => `${url} ${width}w`).join(', '),
    sizes: '(max-width: 1023px) calc(100vw - 3rem), 500px',
    width: 1200,
    height: 800,
  };
}

/** Smallest variant for LCP preload (mobile-first). */
export function lcpPreloadFromResponsive(src: string, variant: Variant = 'hero') {
  const img = responsiveImage(src, variant);
  let href = img.src;
  if (img.srcset) {
    const firstEntry = img.srcset.split(/,\s+/)[0]?.trim() ?? '';
    href = firstEntry.replace(/\s+\d+w$/, '') || href;
  }
  return {
    src: href,
    srcset: img.srcset,
    sizes: img.sizes,
  };
}

export function responsiveImage(src: string, variant: Variant = 'hero') {
  const localHero = localHomepageHero(src, variant);
  if (localHero) return localHero;

  const publicId = r2PublicId(src);
  if (!publicId?.startsWith('more-group/portugal/')) {
    return {
      src,
      srcset: undefined,
      sizes: undefined,
      width: variant === 'card' ? 640 : 1280,
      height: variant === 'card' ? 360 : 720,
    };
  }

  const native = (dimensions as Record<string, Dimension>)[publicId];
  if (!native) {
    return {
      src,
      srcset: undefined,
      sizes: undefined,
      width: variant === 'card' ? 640 : 1280,
      height: variant === 'card' ? 360 : 720,
    };
  }

  return {
    src,
    srcset: `${src} ${native.width}w`,
    sizes: variant === 'card'
      ? '(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) 50vw, 320px'
      : variant === 'homepage'
        ? '(max-width: 1023px) calc(100vw - 3rem), 500px'
        : '(max-width: 767px) calc(100vw - 3rem), (max-width: 1199px) calc(100vw - 7rem), 1088px',
    width: native.width,
    height: native.height,
  };
}
