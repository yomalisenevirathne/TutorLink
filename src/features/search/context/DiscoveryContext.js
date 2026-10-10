import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { DEFAULT_FILTERS } from '../utils/filters';
import { wishlistService } from '../../../services/wishlistService';
import { filterPresetService } from '../../../services/filterPresetService';

export const MAX_COMPARE = 3;
const DiscoveryContext = createContext(undefined);

export function DiscoveryProvider({ children }) {
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, mode: 'online' });
    const [compareIds, setCompareIds] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [filterPresets, setFilterPresets] = useState([]);
    useEffect(() => {
        let mounted = true;
        async function loadWishlist() {
            try {
                const items = await wishlistService.list();
                if (mounted) setFavoriteIds(items.map((item) => item.tutor_id));
            } catch (error) {
                console.error('Unable to load wishlist:', error);
            }
        }
        loadWishlist();
        filterPresetService.list().then(setFilterPresets).catch((error) => {
            console.error('Unable to load filter presets:', error);
        });
        return () => {
            mounted = false;
        };
    }, []);

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
        toggleFavorite: async (id) => {
            try {
                const isSaved = favoriteIds.includes(id);
                if (isSaved) {
                    await wishlistService.remove(id);
                    setFavoriteIds((prev) => prev.filter((x) => x !== id));
                } else {
                    await wishlistService.create(id);
                    setFavoriteIds((prev) => [...prev, id]);
                }
            } catch (error) {
                console.error('Unable to update wishlist:', error);
                Alert.alert('Wishlist update failed', error.message);
            }
        },
        filterPresets,
        saveFilterPreset: async (name, presetFilters = filters) => {
            if (!name?.trim()) throw new Error('Preset name is required.');
            const preset = await filterPresetService.create(name, presetFilters);
            setFilterPresets((prev) => [preset, ...prev]);
            return preset;
        },
        updateFilterPreset: async (id, changes) => {
            const updated = await filterPresetService.update(id, changes);
            if (updated) setFilterPresets((prev) => prev.map((item) => item.id === id ? updated : item));
            return updated;
        },
        deleteFilterPreset: async (id) => {
            await filterPresetService.remove(id);
            setFilterPresets((prev) => prev.filter((item) => item.id !== id));
        },
    };

    return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
    const ctx = useContext(DiscoveryContext);
    if (!ctx)
        throw new Error('useDiscovery must be used inside DiscoveryProvider');
    return ctx;
}
