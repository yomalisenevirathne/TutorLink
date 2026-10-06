import type { Filters, ModeFilter, SortOption, Tutor } from '../types';

export const PRICE_MIN = 0;
export const PRICE_MAX = 3000;
export const PRICE_STEP = 50;

export const DEFAULT_FILTERS: Filters = {
  sort: 'recommended',
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  minRating: null,
  languages: [],
  teachingStyle: null,
  mode: 'any',
};

export const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  priceAsc: 'Price: Low to High',
  ratingDesc: 'Rating: High to Low',
};

export const MODE_LABELS: Record<ModeFilter, string> = {
  any: 'Any',
  online: 'Online',
  physical: 'Physical',
  hybrid: 'Hybrid',
};

export const formatRate = (lkr: number) => `Rs.${lkr.toLocaleString('en-US')}`;

const normalize = (s: string) => s.toLowerCase().trim();

/** Matches tutor name, subject name, or module code. */
export function matchesQuery(tutor: Tutor, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return (
    normalize(tutor.name).includes(q) ||
    tutor.subjects.some(
      (s) => normalize(s.subjectName).includes(q) || normalize(s.subjectId).includes(q),
    )
  );
}

function matchesMode(tutor: Tutor, mode: ModeFilter): boolean {
  switch (mode) {
    case 'any':
      return true;
    case 'hybrid':
      return tutor.modesOffered.includes('online') && tutor.modesOffered.includes('physical');
    default:
      return tutor.modesOffered.includes(mode);
  }
}

const recommendedScore = (t: Tutor) =>
  t.avgRating * Math.log10(t.reviewCount + 10) + (t.verifiedStatus === 'verified' ? 1 : 0);

export function applyFilters(tutors: Tutor[], query: string, f: Filters): Tutor[] {
  const result = tutors.filter(
    (t) =>
      matchesQuery(t, query) &&
      t.hourlyRate >= f.priceMin &&
      t.hourlyRate <= f.priceMax &&
      (f.minRating === null || t.avgRating >= f.minRating) &&
      (f.languages.length === 0 || f.languages.some((l) => t.languages.includes(l))) &&
      (f.teachingStyle === null || t.teachingStyleTags.includes(f.teachingStyle)) &&
      matchesMode(t, f.mode),
  );

  switch (f.sort) {
    case 'priceAsc':
      return result.sort((a, b) => a.hourlyRate - b.hourlyRate);
    case 'ratingDesc':
      return result.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
    default:
      return result.sort((a, b) => recommendedScore(b) - recommendedScore(a));
  }
}

export const isPriceActive = (f: Filters) => f.priceMin > PRICE_MIN || f.priceMax < PRICE_MAX;

export function countActiveFilters(f: Filters): number {
  return [
    f.sort !== 'recommended',
    isPriceActive(f),
    f.minRating !== null,
    f.languages.length > 0,
    f.teachingStyle !== null,
    f.mode !== 'any',
  ].filter(Boolean).length;
}
