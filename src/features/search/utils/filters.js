export const PRICE_MIN = 0;
export const PRICE_MAX = 3000;
export const PRICE_STEP = 50;
export const DEFAULT_FILTERS = {
    sort: 'recommended',
    priceMin: PRICE_MIN,
    priceMax: PRICE_MAX,
    minRating: null,
    languages: [],
    teachingStyle: null,
    mode: 'any',
};
export const SORT_LABELS = {
    recommended: 'Recommended',
    priceAsc: 'Price: Low to High',
    ratingDesc: 'Rating: High to Low',
};
export const MODE_LABELS = {
    any: 'Any',
    online: 'Online',
    physical: 'Physical',
    hybrid: 'Hybrid',
};
export const formatRate = (lkr) => {
    const num = Number(lkr);
    if (isNaN(num)) return 'Rs.0';
    return `Rs.${num.toLocaleString('en-US')}`;
};
const normalize = (s) => (typeof s === 'string' ? s.toLowerCase().trim() : '');
/** Matches tutor name, bio, university, subject name, or module code. */
export function matchesQuery(tutor, query) {
    const q = normalize(query);
    if (!q)
        return true;
    const nameMatch = normalize(tutor?.name).includes(q);
    const bioMatch = normalize(tutor?.bio).includes(q);
    const uniMatch = normalize(tutor?.university).includes(q);
    const subjects = Array.isArray(tutor?.subjects) ? tutor.subjects : [];
    const subjectsMatch = subjects.some((s) => {
        if (typeof s === 'string') return normalize(s).includes(q);
        return normalize(s?.subjectName || s?.name).includes(q) ||
               normalize(s?.subjectId || s?.id).includes(q);
    });
    const singleSubjectMatch = normalize(tutor?.subject).includes(q);
    return nameMatch || bioMatch || uniMatch || singleSubjectMatch || subjectsMatch;
}
function matchesMode(tutor, mode) {
    const modes = Array.isArray(tutor?.modesOffered) && tutor.modesOffered.length > 0
        ? tutor.modesOffered
        : (Array.isArray(tutor?.session_modes) ? tutor.session_modes : []);
    switch (mode) {
        case 'any':
            return true;
        case 'hybrid':
            return modes.includes('online') && modes.includes('physical');
        default:
            return modes.includes(mode);
    }
}
const recommendedScore = (t) => {
    const rating = Number(t?.avgRating) || 0;
    const reviews = Number(t?.reviewCount) || 0;
    return rating * Math.log10(reviews + 10) + (t?.verifiedStatus === 'verified' ? 1 : 0);
};
export function applyFilters(tutors, query, f) {
    if (!Array.isArray(tutors)) return [];
    const minP = f?.priceMin ?? PRICE_MIN;
    const maxP = f?.priceMax ?? PRICE_MAX;
    const minR = f?.minRating ?? null;
    const langs = Array.isArray(f?.languages) ? f.languages : [];
    const result = tutors.filter((t) => {
        const rate = Number(t?.hourlyRate) || 0;
        const rating = Number(t?.avgRating) || 0;
        const tutorLangs = Array.isArray(t?.languages) ? t.languages : [];
        const tutorStyles = Array.isArray(t?.teachingStyleTags) && t.teachingStyleTags.length > 0
            ? t.teachingStyleTags
            : (t?.teachingStyle ? [t.teachingStyle] : []);
        return (
            matchesQuery(t, query) &&
            rate >= minP &&
            rate <= maxP &&
            (minR === null || rating >= minR) &&
            (langs.length === 0 || langs.some((l) => tutorLangs.includes(l))) &&
            (!f?.teachingStyle || tutorStyles.includes(f.teachingStyle)) &&
            matchesMode(t, f?.mode || 'any')
        );
    });
    switch (f?.sort) {
        case 'priceAsc':
            return result.sort((a, b) => (Number(a?.hourlyRate) || 0) - (Number(b?.hourlyRate) || 0));
        case 'ratingDesc':
            return result.sort((a, b) => ((Number(b?.avgRating) || 0) - (Number(a?.avgRating) || 0)) || ((Number(b?.reviewCount) || 0) - (Number(a?.reviewCount) || 0)));
        default:
            return result.sort((a, b) => recommendedScore(b) - recommendedScore(a));
    }
}
export const isPriceActive = (f) => Boolean(f && ((Number(f.priceMin) || 0) > PRICE_MIN || (Number(f.priceMax) || 0) < PRICE_MAX));
export function countActiveFilters(f) {
    if (!f) return 0;
    const langs = Array.isArray(f.languages) ? f.languages : [];
    return [
        f.sort && f.sort !== 'recommended',
        isPriceActive(f),
        f.minRating !== null && f.minRating !== undefined,
        langs.length > 0,
        f.teachingStyle !== null && f.teachingStyle !== undefined,
        f.mode && f.mode !== 'any',
    ].filter(Boolean).length;
}
