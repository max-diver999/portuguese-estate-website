/**
 * Objective attractiveness metrics for hero photographs.
 *
 * Sourcing images that were merely accurate and licensed produced documentary
 * architecture: grey concrete blocks and institutional façades on a site selling
 * villas and sea views. Accuracy is necessary and not sufficient. These metrics
 * make "attractive" a measured property that the pipeline can enforce.
 *
 * colourfulness — Hasler & Süsstrunk (2003) metric. Beaches, sunsets and tiled
 *   façades score high; wet concrete scores low.
 * greyMass — fraction of desaturated pixels. A brutalist block runs above 0.6.
 * brightness — mean value channel. Rejects murky, underexposed frames.
 */
import sharp from 'sharp';

/** A hero must clear all three. Tuned against the first (rejected) image set. */
export const AESTHETIC_BAR = {
  minColourfulness: 38,
  maxGreyMass: 0.55,
  minBrightness: 0.42,
  maxBrightness: 0.95,
};

export async function imageAesthetics(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(120, 120, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = info.width * info.height;
  let rgSum = 0, rgSq = 0, ybSum = 0, ybSq = 0, satSum = 0, briSum = 0, grey = 0;

  for (let i = 0; i < n; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    rgSum += rg; rgSq += rg * rg;
    ybSum += yb; ybSq += yb * yb;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    satSum += sat;
    briSum += mx / 255;
    if (sat < 0.18) grey += 1;
  }

  const meanRg = rgSum / n;
  const meanYb = ybSum / n;
  const sdRg = Math.sqrt(Math.max(0, rgSq / n - meanRg * meanRg));
  const sdYb = Math.sqrt(Math.max(0, ybSq / n - meanYb * meanYb));

  return {
    colourfulness: +(Math.sqrt(sdRg ** 2 + sdYb ** 2) + 0.3 * Math.sqrt(meanRg ** 2 + meanYb ** 2)).toFixed(1),
    saturation: +(satSum / n).toFixed(3),
    brightness: +(briSum / n).toFixed(3),
    greyMass: +(grey / n).toFixed(3),
  };
}

export function passesAestheticBar(m) {
  if (!m) return false;
  return (
    m.colourfulness >= AESTHETIC_BAR.minColourfulness &&
    m.greyMass <= AESTHETIC_BAR.maxGreyMass &&
    m.brightness >= AESTHETIC_BAR.minBrightness &&
    m.brightness <= AESTHETIC_BAR.maxBrightness
  );
}

/**
 * Subjects that read as wrong on a premium property site regardless of how well
 * they photograph: institutional buildings, transport plant, social housing.
 */
export const UNATTRACTIVE_SUBJECT =
  /\b(tribunal|court|justi[cç]a|hospital|escola|school|university building|c[aâ]mara municipal|town hall|city hall|correios|minist[ée]rio|prison|barracks|quartel|bloco|conjunto habitacional|social housing|bairro social|office block|sede da|headquarters|escrit[oó]rio|metro station|esta[cç][aã]o|railway|linha de|viaduct|motorway|car ?park|parking|industrial|warehouse|armaz[eé]m|factory|f[aá]brica|refinery|cranes|construction site|scaffold|andaime|derelict|abandoned|ru[ií]na|demolition|cemet|black and white|preto e branco|monochrome|night|nocturn|noite)\b/i;

/** Subjects that sell: what a buyer imagines owning or waking up to. */
export const ASPIRATIONAL_SUBJECT =
  /\b(beach|praia|coast|costa|litoral|cliff|falésia|arriba|ocean|sea|mar\b|bay|ba[ií]a|cove|enseada|dune|marina|yacht|harbour|sunset|sunrise|p[oô]r do sol|golden hour|villa|moradia|quinta|mansion|pal[aá]cio|pool|piscina|terrace|terra[cç]o|varanda|balcony|rooftop|telhado|garden|jardim|park|parque|vineyard|vinha|douro valley|aerial|a[eé]rea|panorama|skyline|viewpoint|miradouro|vista|old town|centro hist[oó]rico|azulejo|colourful|colorful|resort|golf|riverside|waterfront|ribeira|island|ilha)\b/i;

/**
 * 64-bit difference hash. Uniqueness by filename is not uniqueness by picture:
 * a "Coasts of Portugal" category yields many near-identical frames from one
 * photographer's walk, and three of them reached three different pages.
 */
export async function perceptualHash(buffer) {
  const px = await sharp(buffer).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += px[y * 9 + x] < px[y * 9 + x + 1] ? '1' : '0';
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

/** Hamming distance between two hex hashes. */
export function hashDistance(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/** Two heroes closer than this read as the same photograph to a visitor. */
export const NEAR_DUPLICATE_BITS = 12;
