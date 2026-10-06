import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Filters } from '../types';
import { DEFAULT_FILTERS } from '../utils/filters';

export const MAX_COMPARE = 3;

type DiscoveryContextValue = {
  query: string;
  setQuery: (q: string) => void;
  /** Sets the query and remembers it in Recent Searches. */
  submitSearch: (q: string) => void;
  recentSearches: string[];

  filters: Filters;
  setFilters: (f: Filters) => void;
  updateFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  compareIds: string[];
  toggleCompare: (id: string) => void;
  setCompareIds: (ids: string[]) => void;

  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
};

const DiscoveryContext = createContext<DiscoveryContextValue | undefined>(undefined);

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, mode: 'online' });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const value: DiscoveryContextValue = {
    query,
    setQuery,
    submitSearch: (q) => {
      const trimmed = q.trim();
      setQuery(trimmed);
      if (trimmed) {
        setRecentSearches((prev) =>
          [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5),
        );
      }
    },
    recentSearches,

    filters,
    setFilters,
    updateFilters: (patch) => setFilters((prev) => ({ ...prev, ...patch })),
    resetFilters: () => setFilters(DEFAULT_FILTERS),

    compareIds,
    toggleCompare: (id) =>
      setCompareIds((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < MAX_COMPARE
            ? [...prev, id]
            : prev,
      ),
    setCompareIds,

    favoriteIds,
    toggleFavorite: (id) =>
      setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
  };

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error('useDiscovery must be used inside DiscoveryProvider');
  return ctx;
}
