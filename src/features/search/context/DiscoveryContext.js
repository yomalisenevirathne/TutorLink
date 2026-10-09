import { createContext, useContext, useState } from 'react';
import { DEFAULT_FILTERS } from '../utils/filters';

export const MAX_COMPARE = 3;
const DiscoveryContext = createContext(undefined);

export function DiscoveryProvider({ children }) {
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, mode: 'online' });
    const [compareIds, setCompareIds] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState([]);

    const value = {
        query,
        setQuery,
        submitSearch: (q) => {
            const trimmed = (q || '').trim();
            setQuery(trimmed);
            if (trimmed) {
                setRecentSearches((prev) => [
                    trimmed,
                    ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
                ].slice(0, 5));
            }
        },
        recentSearches,
        filters,
        setFilters,
        updateFilters: (patch) => setFilters((prev) => ({ ...prev, ...patch })),
        resetFilters: () => setFilters(DEFAULT_FILTERS),
        compareIds,
        toggleCompare: (id) => setCompareIds((prev) => prev.includes(id)
            ? prev.filter((x) => x !== id)
            : prev.length < MAX_COMPARE
                ? [...prev, id]
                : prev),
        setCompareIds,
        favoriteIds,
        toggleFavorite: (id) => setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    };

    return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
    const ctx = useContext(DiscoveryContext);
    if (!ctx)
        throw new Error('useDiscovery must be used inside DiscoveryProvider');
    return ctx;
}
