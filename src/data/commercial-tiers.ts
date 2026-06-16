export interface CommercialTier {
  href: string;
  label: string;
  key: string;
}

export const COMMERCIAL_TIERS: CommercialTier[] = [
  { href: '/tier-entry/', label: 'Under €200k', key: 'entry' },
  { href: '/tier-mid/', label: '€200k–€500k', key: 'mid' },
  { href: '/tier-luxury/', label: 'Luxury €500k+', key: 'luxury' },
];

export const COMMERCIAL_LADDER_TITLE = 'Browse by budget';
