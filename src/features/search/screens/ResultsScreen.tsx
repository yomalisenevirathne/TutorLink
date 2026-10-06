import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from '@/constants/colors';
import { supabase } from '../../../../supabase';

import { FilterPill } from '../components/FilterPill';
import { NoResultsState } from '../components/NoResultsState';
import { TutorResultCard } from '../components/TutorResultCard';
import { MAX_COMPARE, useDiscovery } from '../context/DiscoveryContext';
import type { FilterSection, Filters, Tutor } from '../types';
import {
  DEFAULT_FILTERS,
  MODE_LABELS,
  PRICE_MAX,
  countActiveFilters,
  isPriceActive,
} from '../utils/filters';
import { FilterSheet } from './FilterSheet';

const SORT_SHORT = { recommended: undefined, priceAsc: 'Price ↑', ratingDesc: 'Rating ↓' } as const;

export function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const {
    query,
    submitSearch,
    filters,
    updateFilters,
    resetFilters,
    compareIds,
    toggleCompare,
    favoriteIds,
    toggleFavorite,
  } = useDiscovery();
  const [sheetSection, setSheetSection] = useState<FilterSection | null>(null);

  const [results, setResults] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFilteredTutors() {
      try {
        setLoading(true);

        let req = supabase.from('tutors').select('*');

        if (query.trim()) {
          const q = `%${query.trim()}%`;
          req = req.or(`name.ilike.${q},bio.ilike.${q},university.ilike.${q}`);
        }

        if (filters.priceMin > DEFAULT_FILTERS.priceMin) {
          req = req.gte('hourlyRate', filters.priceMin);
        }

        if (filters.priceMax < PRICE_MAX) {
          req = req.lte('hourlyRate', filters.priceMax);
        }

        if (filters.minRating !== null) {
          req = req.gte('avgRating', filters.minRating);
        }

        if (filters.mode !== 'any') {
          req = req.contains('session_modes', [filters.mode]);
        }

        if (filters.teachingStyle) {
          req = req.eq('teachingStyle', filters.teachingStyle);
        }

        if (filters.languages.length > 0) {
          req = req.contains('languages', filters.languages);
        }

        if (filters.sort === 'priceAsc') {
          req = req.order('hourlyRate', { ascending: true });
        } else if (filters.sort === 'ratingDesc') {
          req = req.order('avgRating', { ascending: false });
        } else {
          req = req.order('avgRating', { ascending: false });
        }

        const { data, error } = await req;

        if (error) throw error;

        const normalized = (data || []).map((t: any) => ({
          ...t,
          modesOffered: t.modesOffered || t.session_modes || [],
          teachingStyleTags: t.teachingStyleTags || (t.teachingStyle ? [t.teachingStyle] : []),
          languages: t.languages || [],
          groupSizeOptions: t.groupSizeOptions || [],
          subjects: t.subjects || [],
          availability: t.availability || [],
        }));

        setResults(normalized);
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFilteredTutors();
  }, [query, filters]);

  const activeCount = countActiveFilters(filters);
  const open = (section: FilterSection) => setSheetSection(section);

  const priceValue = isPriceActive(filters)
    ? `Rs.${filters.priceMin}-${filters.priceMax}${filters.priceMax === PRICE_MAX ? '+' : ''}`
    : undefined;

  const pills: { label: string; section: FilterSection; value?: string; clear: Partial<Filters> }[] = [
    { label: 'Sort', section: 'sort', value: SORT_SHORT[filters.sort], clear: { sort: 'recommended' } },
    {
      label: 'Price',
      section: 'price',
      value: priceValue,
      clear: { priceMin: DEFAULT_FILTERS.priceMin, priceMax: DEFAULT_FILTERS.priceMax },
    },
    {
      label: 'Rating',
      section: 'rating',
      value: filters.minRating !== null ? `${filters.minRating}★+` : undefined,
      clear: { minRating: null },
    },
    {
      label: 'Language',
      section: 'language',
      value: filters.languages.length ? filters.languages.join(', ') : undefined,
      clear: { languages: [] },
    },
    {
      label: 'Teaching Style',
      section: 'style',
      value: filters.teachingStyle ?? undefined,
      clear: { teachingStyle: null },
    },
    {
      label: 'Location',
      section: 'mode',
      value: filters.mode !== 'any' ? MODE_LABELS[filters.mode] : undefined,
      clear: { mode: 'any' },
    },
  ];

  const orderedPills = [
    ...pills.filter((p) => p.value !== undefined),
    ...pills.filter((p) => p.value === undefined),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.queryRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Pressable style={styles.queryBox} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <Text style={[styles.queryText, !query && { color: colors.muted }]} numberOfLines={1}>
              {query || 'All tutors'}
            </Text>
            {query ? (
              <Pressable onPress={() => submitSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            ) : (
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          <Pressable
            style={[styles.filterButton, activeCount > 0 && styles.filterButtonActive]}
            onPress={() => open('sort')}
            accessibilityLabel={`All filters, ${activeCount} active`}>
            <Ionicons name="options-outline" size={18} color={activeCount > 0 ? '#fff' : colors.text} />
            {activeCount > 0 && <Text style={styles.filterCount}>{activeCount}</Text>}
          </Pressable>
          {orderedPills.map((p) => (
            <FilterPill
              key={p.label}
              label={p.label}
              value={p.value}
              onPress={() => open(p.section)}
              onClear={() => updateFilters(p.clear)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[styles.list, compareIds.length > 0 && { paddingBottom: 110 }]}
          ListHeaderComponent={
            <Text style={styles.count}>
              {results.length} tutor{results.length === 1 ? '' : 's'} found
            </Text>
          }
          ListEmptyComponent={
            query ? (
              <NoResultsState
                query={query}
                onBroadenFilters={() => {
                  updateFilters({
                    priceMin: DEFAULT_FILTERS.priceMin,
                    priceMax: DEFAULT_FILTERS.priceMax,
                    minRating: null,
                  });
                  setSheetSection('price');
                }}
                onBrowsePopular={() => {
                  submitSearch('');
                  router.push('/');
                }}
              />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="funnel-outline" size={40} color={colors.primaryBorder} />
                <Text style={styles.emptyTitle}>No tutors match these filters</Text>
                <Text style={styles.emptyText}>Try widening the price range or removing a filter.</Text>
                {activeCount > 0 && (
                  <Pressable style={styles.clearAll} onPress={resetFilters}>
                    <Text style={styles.clearAllText}>Clear all filters</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          renderItem={({ item }) => (
            <TutorResultCard
              tutor={item}
              onQuickBook={() => router.push({ pathname: '/bookings', params: { tutorId: item.id } })}
              onViewProfile={() => router.push({ pathname: '/tutor/[id]', params: { id: item.id } })}
              comparing={compareIds.includes(item.id)}
              onToggleCompare={() => toggleCompare(item.id)}
              compareDisabled={compareIds.length >= MAX_COMPARE}
              favorited={favoriteIds.includes(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
        />
      )}

      {compareIds.length > 0 && (
        <View style={[styles.compareBar, { paddingBottom: 12 + insets.bottom }]}>
          <Text style={styles.compareInfo}>
            {compareIds.length} selected
            {compareIds.length < 2 ? ' · pick 1 more to compare' : ''}
          </Text>
          <Pressable
            disabled={compareIds.length < 2}
            onPress={() => router.push('/compare')}
            style={[styles.compareButton, compareIds.length < 2 && { opacity: 0.5 }]}>
            <Ionicons name="git-compare-outline" size={16} color="#fff" />
            <Text style={styles.compareButtonText}>Compare</Text>
          </Pressable>
        </View>
      )}

      {sheetSection && (
        <FilterSheet initialSection={sheetSection} onClose={() => setSheetSection(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 1,
  },
  queryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  queryBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  queryText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  pills: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: {
    minWidth: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundColor: colors.accent,
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 12,
  },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 14 },
  count: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  clearAll: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  clearAllText: { color: colors.primary, fontWeight: '700' },
  compareBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow,
  },
  compareInfo: { fontSize: 13, color: colors.text, fontWeight: '600', flexShrink: 1 },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  compareButtonText: { color: '#fff', fontWeight: '700' },
});