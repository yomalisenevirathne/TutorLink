import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { supabase } from '../../../../supabase';

import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useDiscovery } from '../context/DiscoveryContext';
import { useDebounce } from '../hooks/useDebounce';
import type { Tutor } from '../types';

type SubjectItem = {
  subjectId: string;
  subjectName: string;
};

export function SearchScreen() {
  const { query, submitSearch, recentSearches } = useDiscovery();
  const [text, setText] = useState(query);
  const debounced = useDebounce(text, 300);

  const [trendingTutors, setTrendingTutors] = useState<Tutor[]>([]);
  const [popularSubjects, setPopularSubjects] = useState<SubjectItem[]>([]);
  const [suggestions, setSuggestions] = useState<{
    subjects: SubjectItem[];
    tutors: Tutor[];
  } | null>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { data: trendingData } = await supabase
          .from('tutors')
          .select('*')
          .order('reviewCount', { ascending: false })
          .limit(6);

        if (trendingData) setTrendingTutors(trendingData);

        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .limit(6);

        if (subjectData) {
          setPopularSubjects(
            subjectData.map((item: any) => ({
              subjectId: item.subject_id || item.id,
              subjectName: item.subject_name || item.name,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching initial search data:', err);
      }
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      return;
    }

    async function fetchSuggestions() {
      try {
        const [subjectsRes, tutorsRes] = await Promise.all([
          supabase
            .from('subjects')
            .select('*')
            .ilike('subject_name', `%${q}%`)
            .limit(4),
          supabase
            .from('tutors')
            .select('*')
            .ilike('name', `%${q}%`)
            .limit(6),
        ]);

        const matchedSubjects = (subjectsRes.data || []).map((item: any) => ({
          subjectId: item.subject_id || item.id,
          subjectName: item.subject_name || item.name,
        }));

        setSuggestions({
          subjects: matchedSubjects,
          tutors: tutorsRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }

    fetchSuggestions();
  }, [debounced]);

  const visibleSuggestions = debounced.trim() ? suggestions : null;

  const search = (q: string) => {
    submitSearch(q);
    router.push('/results');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Search Tutors, Subjects (e.g. Programming)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => search(text)}
            accessibilityLabel="Search"
          />
          {text.length > 0 && (
            <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {visibleSuggestions ? (
          visibleSuggestions.subjects.length + visibleSuggestions.tutors.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.primaryBorder} />
              <Text style={styles.emptyTitle}>No matches for “{debounced.trim()}”</Text>
              <Text style={styles.emptyText}>
                Try a tutor name, a subject like “Databases”, or a module code like “IT2030”.
              </Text>
            </View>
          ) : (
            <>
              {visibleSuggestions.subjects.map((s) => (
                <Pressable key={s.subjectId} style={styles.row} onPress={() => search(s.subjectName)}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="book-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{s.subjectName}</Text>
                    <Text style={styles.rowSub}>Subject · {s.subjectId}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
              {visibleSuggestions.tutors.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: t.id } })}>
                  <Avatar source={t.photoUrl} name={t.name} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Text style={styles.rowTitle}>{t.name}</Text>
                      <VerifiedBadge status={t.verifiedStatus} small />
                    </View>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      Tutor · {t.subjects?.map((s: any) => s.subjectName).join(', ') || ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable style={styles.seeAll} onPress={() => search(text)}>
                <Text style={styles.seeAllText}>See all results for “{text.trim()}”</Text>
              </Pressable>
            </>
          )
        ) : (
          <>
            {recentSearches.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                {recentSearches.map((r) => (
                  <Pressable key={r} style={styles.recent} onPress={() => search(r)}>
                    <Ionicons name="time-outline" size={18} color={colors.muted} />
                    <Text style={styles.recentText}>{r}</Text>
                    <Ionicons name="arrow-up-outline" size={16} color={colors.muted} style={styles.fill} />
                  </Pressable>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Popular Subjects</Text>
            <View style={styles.chips}>
              {popularSubjects.map((s) => (
                <Chip key={s.subjectId} label={s.subjectName} onPress={() => search(s.subjectName)} />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Trending Tutors</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trending}>
              {trendingTutors.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.trendingItem}
                  onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: t.id } })}>
                  <View style={styles.trendingRing}>
                    <Avatar source={t.photoUrl} name={t.name} size={56} />
                  </View>
                  <Text style={styles.trendingName} numberOfLines={1}>
                    {t.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  input: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text },
  content: { padding: 20, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  recentText: { fontSize: 15, color: colors.text },
  fill: { marginLeft: 'auto', transform: [{ rotate: '-45deg' }] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trending: { gap: 14, paddingVertical: 4 },
  trendingItem: { alignItems: 'center', width: 68, gap: 6 },
  trendingRing: { padding: 2, borderRadius: 32, borderWidth: 2, borderColor: colors.primary },
  trendingName: { fontSize: 12, fontWeight: '600', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted },
  seeAll: { paddingVertical: 14, alignItems: 'center' },
  seeAllText: { color: colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});