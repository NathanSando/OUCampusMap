import type { Building } from '@ou-campus-map/shared-types';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Building search on name, abbreviation and aliases (design doc §9.2, DoD #3).
 * Ranked: exact abbreviation/alias > name prefix > word prefix > substring.
 */
export function searchBuildings(buildings: Building[], rawQuery: string, limit = 6): Building[] {
  const q = normalize(rawQuery);
  if (!q) return [];

  const scored: { b: Building; score: number }[] = [];
  for (const b of buildings) {
    const name = normalize(b.name);
    const terms = [b.abbreviation ?? '', ...(b.aliases ?? [])].map(normalize).filter(Boolean);
    let score = 0;
    if (terms.includes(q)) score = 100;
    else if (name === q) score = 95;
    else if (name.startsWith(q)) score = 80;
    else if (terms.some((t) => t.startsWith(q))) score = 70;
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 60;
    else if (name.includes(q)) score = 40;
    else if (terms.some((t) => t.includes(q))) score = 30;
    if (score) scored.push({ b, score });
  }
  return scored
    .sort((a, z) => z.score - a.score || a.b.name.localeCompare(z.b.name))
    .slice(0, limit)
    .map((s) => s.b);
}
