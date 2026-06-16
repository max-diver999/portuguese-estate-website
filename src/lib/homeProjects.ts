import type { CollectionEntry } from 'astro:content';
import { formatAreaLabel, formatUsd } from './cardImage';

type ProjectEntry = CollectionEntry<'projects'>;

const AREA_PRIORITY = [
  'tulum',
  'playa-del-carmen',
  'aldea-zama-tulum',
  'cabo-san-lucas',
  'san-jose-del-cabo',
  'cabo-corridor',
  'puerto-vallarta',
  'punta-de-mita',
  'puerto-morelos',
];

export function pickHomepageProjects(
  projects: ProjectEntry[],
  featuredSlugs: readonly string[],
  limit = 12,
): ProjectEntry[] {
  const bySlug = new Map(projects.map((p) => [p.id, p]));
  const picked: ProjectEntry[] = [];
  const used = new Set<string>();

  for (const slug of featuredSlugs) {
    const p = bySlug.get(slug);
    if (p && !used.has(p.id)) {
      picked.push(p);
      used.add(p.id);
    }
  }

  const pool = projects.filter((p) => !used.has(p.id));
  for (const area of AREA_PRIORITY) {
    if (picked.length >= limit) break;
    const next = pool.find((p) => p.data.area === area);
    if (next) {
      picked.push(next);
      used.add(next.id);
    }
  }

  for (const p of pool.sort((a, b) => (a.data.priceFromUsd ?? 0) - (b.data.priceFromUsd ?? 0))) {
    if (picked.length >= limit) break;
    if (!used.has(p.id)) {
      picked.push(p);
      used.add(p.id);
    }
  }

  return picked.slice(0, limit);
}

export function projectStatusLabel(status?: string): string {
  if (status === 'off-plan') return 'Off-plan';
  if (status === 'completed') return 'Completed';
  if (status === 'delivering') return 'Delivering';
  if (status === 'pre-construction') return 'Pre-construction';
  if (status === 'resale') return 'Resale';
  return status?.replace(/-/g, ' ') ?? 'Active sales';
}

export function projectHeroLine(project: ProjectEntry): string {
  const price = project.data.priceFromUsd ? `from ${formatUsd(project.data.priceFromUsd)}` : '';
  const status = projectStatusLabel(project.data.status);
  const area = formatAreaLabel(project.data.area);
  return [price, status, area].filter(Boolean).join(' · ');
}
