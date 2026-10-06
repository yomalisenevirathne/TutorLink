import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, shadow } from '@/constants/colors';
import { supabase } from '../../../../supabase';

import { Chip } from '../components/Chip';
import { TutorCard } from '../components/TutorCard';
import { useDiscovery } from '../context/DiscoveryContext';
import type { Filters, Tutor } from '../types';

type QuickFilter = {
  label: string;
  patch: Partial<Filters>;
  isActive: (f: Filters) => boolean;
};

type SubjectItem = {
  subjectId: string;
  subjectName: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    label: 'Rs.500-1000',
    patch: { priceMin: 500, priceMax: 1000 },
    isActive: (f) => f.priceMin === 500 && f.priceMax === 1000,
  },
  { label: '4.5★ Up', patch: { minRating: 4.5 }, isActive: (f) => f.minRating === 4.5 },
  {
    label: 'English Medium',
    patch: { languages: ['English'] },
    isActive: (f) => f.languages.length === 1 && f.languages[0] === 'English',
  },
];

export function HomeScreen() {
  const { filters, updateFilters, submitSearch, favoriteIds } = useDiscovery();
  const sessionMode = filters.mode === 'physical' ? 'physical' : 'online';

  const [recommendedTutors, setRecommendedTutors] = useState<Tutor[]>([]);
  const [popularSubjects, setPopularSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .limit(4);

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          subjectId: item.subject_id || item.id,
          subjectName: item.subject_name || item.name,
          icon: (item.icon || 'book-outline') as keyof typeof Ionicons.glyphMap,
        }));
        setPopularSubjects(formatted);
      }
    }

    fetchSubjects();
  }, []);

  useEffect(() => {
    async function fetchRecommendedTutors() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('tutors')
          .select('*')
          .limit(6);

        if (error) throw error;
        if (data) setRecommendedTutors(data);
      } catch (err) {
        console.error('Error fetching recommended tutors:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendedTutors();
  }, [sessionMode]);

  const openResults = () => router.push('/results');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.appBar}>
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Ionicons name="school" size={18} color="#fff" />
          </View>
          <Text style={styles.logoText}>
            Tutor<Text style={{ color: colors.primary }}>Link</Text>
          </Text>
        </View>
        <View style={styles.appBarIcons}>
          <Pressable
            hitSlop={10}
            accessibilityLabel="Saved tutors"
            onPress={() => router.push('/favorites')}
            style={styles.savedButton}>
            <Ionicons name="heart-outline" size={22} color={colors.text} />
            {favoriteIds.length > 0 && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{favoriteIds.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable hitSlop={10} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel="Search tutors and subjects">
          <Ionicons name="search" size={20} color={colors.muted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search Tutors, Subjects (e.g. Programming)
          </Text>
        </Pressable>

        <View style={styles.segment}>
          {(
            [
              ['online', 'Online Sessions', 'videocam-outline'],
              ['physical', 'In-Person', 'people-outline'],
            ] as const
          ).map(([mode, label, icon]) => {
            const selected = sessionMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => updateFilters({ mode })}
                style={[styles.segmentItem, selected && styles.segmentSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Ionicons name={icon} size={16} color={selected ? '#fff' : colors.primary} />
                <Text style={[styles.segmentText, selected && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Quick Filters</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.bleed}>
          {QUICK_FILTERS.map((q) => (
            <Chip
              key={q.label}
              label={q.label}
              selected={q.isActive(filters)}
              onPress={() => {
                updateFilters(q.patch);
                openResults();
              }}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Explore Popular Subjects</Text>
        <View style={styles.grid}>
          {popularSubjects.map(({ subjectId, subjectName, icon }) => (
            <Pressable
              key={subjectId}
              style={({ pressed }) => [styles.subject, pressed && { opacity: 0.8 }]}
              onPress={() => {
                submitSearch(subjectName);
                openResults();
              }}>
              <View style={styles.subjectIcon}>
                <Ionicons name={icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.subjectName} numberOfLines={2}>
                {subjectName}
              </Text>
              <Text style={styles.subjectCode}>{subjectId}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Tutors</Text>
          <Pressable
            onPress={() => {
              submitSearch('');
              openResults();
            }}
            hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            horizontal
            data={recommendedTutors}
            keyExtractor={(t) => t.id}
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => (
              <TutorCard
                tutor={item}
                onPress={() =>
                  router.push({ pathname: '/tutor/[id]', params: { id: item.id } })
                }
              />
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const PAD = 20;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 12,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.text },
  appBarIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  savedButton: { position: 'relative' },
  savedBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBadgeText: { fontSize: 10, fontWeight: '800', color: colors.onAccent },
  content: { paddingHorizontal: PAD, paddingBottom: 32, gap: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    ...shadow,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: colors.muted },
  segment: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: 12, padding: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 6 },
  seeAll: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 6 },
  bleed: { marginHorizontal: -PAD },
  chipRow: { paddingHorizontal: PAD, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subject: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    gap: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    ...shadow,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 14, fontWeight: '700', color: colors.text },
  subjectCode: { fontSize: 12, color: colors.muted },
  carousel: { paddingHorizontal: PAD, paddingVertical: 8, gap: 12 },
});