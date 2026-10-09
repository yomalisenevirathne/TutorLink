import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow } from '../../../constants/colors';
import { supabase } from '../../../utils/supabase';
import { Chip } from '../components/Chip';
import { TutorCard } from '../components/TutorCard';
import { useDiscovery } from '../context/DiscoveryContext';

const QUICK_FILTERS = [
    {
        label: 'Rs.500-1000',
        patch: { priceMin: 500, priceMax: 1000 },
        isActive: (f) => f.priceMin === 500 && f.priceMax === 1000,
    },
    { label: '4.5★ Up', patch: { minRating: 4.5 }, isActive: (f) => f.minRating === 4.5 },
    {
        label: 'English Medium',
        patch: { languages: ['English'] },
        isActive: (f) => f.languages && f.languages.length === 1 && f.languages[0] === 'English',
    },
];

const DEFAULT_POPULAR_SUBJECTS = [
    { subjectId: 'CS101', subjectName: 'Programming', icon: 'code-slash' },
    { subjectId: 'MA101', subjectName: 'Mathematics', icon: 'calculator' },
    { subjectId: 'PH101', subjectName: 'Physics', icon: 'planet' },
    { subjectId: 'EN101', subjectName: 'English', icon: 'book' },
];

export function HomeScreen({ navigation }) {
    const { filters, updateFilters, submitSearch, favoriteIds } = useDiscovery();
    const sessionMode = filters?.mode === 'physical' ? 'physical' : 'online';
    const [recommendedTutors, setRecommendedTutors] = useState([]);
    const [popularSubjects, setPopularSubjects] = useState(DEFAULT_POPULAR_SUBJECTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSubjects() {
            try {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('*')
                    .limit(4);
                if (!error && data && data.length > 0) {
                    const formatted = data.map((item) => ({
                        subjectId: item.subject_id || item.id || '',
                        subjectName: item.subject_name || item.name || 'Subject',
                        icon: (item.icon || 'book-outline'),
                    }));
                    setPopularSubjects(formatted);
                }
            } catch (err) {
                console.log('Error fetching subjects:', err);
            }
        }
        fetchSubjects();
    }, []);

    useEffect(() => {
        async function fetchRecommendedTutors() {
            try {
                setLoading(true);
                let q = supabase.from('tutors').select('*');
                if (sessionMode === 'physical') {
                    q = q.contains('session_modes', ['physical']);
                } else if (sessionMode === 'online') {
                    q = q.contains('session_modes', ['online']);
                }
                const { data, error } = await q.limit(6);
                let rawList = (!error && data && data.length > 0) ? data : [];
                if (rawList.length === 0) {
                    const fallback = await supabase.from('tutors').select('*').limit(6);
                    rawList = fallback.data || [];
                }
                const normalized = rawList.map((t) => ({
                    ...t,
                    hourlyRate: t.hourlyRate ?? t.hourly_rate ?? 0,
                    avgRating: t.avgRating ?? t.rating ?? t.avg_rating ?? 0,
                    reviewCount: t.reviewCount ?? t.total_reviews ?? t.review_count ?? 0,
                    verifiedStatus: t.verifiedStatus ?? (t.is_verified_tutor || t.is_verified ? 'verified' : 'unverified'),
                    modesOffered: Array.isArray(t.modesOffered) && t.modesOffered.length > 0
                        ? t.modesOffered
                        : (Array.isArray(t.session_modes) && t.session_modes.length > 0 ? t.session_modes : []),
                    subjects: Array.isArray(t.subjects) ? t.subjects : (t.subject ? [t.subject] : []),
                }));
                setRecommendedTutors(normalized);
            }
            catch (err) {
                console.error('Error fetching recommended tutors:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchRecommendedTutors();
    }, [sessionMode]);

    const openResults = () => navigation?.navigate('ResultsScreen');

    return (<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Ionicons name="school" size={18} color="#fff"/>
          </View>
          <Text style={styles.logoText}>
            Tutor<Text style={{ color: colors.primary }}>Link</Text>
          </Text>
        </View>
        <View style={styles.appBarIcons}>
          <Pressable hitSlop={10} accessibilityLabel="Saved tutors" onPress={() => navigation?.navigate('FavoritesScreen')} style={styles.savedButton}>
            <Ionicons name="heart-outline" size={22} color={colors.text}/>
            {favoriteIds && favoriteIds.length > 0 && (<View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{favoriteIds.length}</Text>
              </View>)}
          </Pressable>
          <Pressable hitSlop={10} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={24} color={colors.text}/>
          </Pressable>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.searchBar} onPress={() => navigation?.navigate('SearchScreen')} accessibilityRole="search" accessibilityLabel="Search tutors and subjects">
          <Ionicons name="search" size={20} color={colors.muted}/>
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search Tutors, Subjects (e.g. Programming)
          </Text>
        </Pressable>

        <View style={styles.segment}>
          {[
            ['online', 'Online Sessions', 'videocam-outline'],
            ['physical', 'In-Person', 'people-outline'],
        ].map(([mode, label, icon]) => {
            const selected = sessionMode === mode;
            return (<Pressable key={mode} onPress={() => updateFilters({ mode })} style={[styles.segmentItem, selected && styles.segmentSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
                <Ionicons name={icon} size={16} color={selected ? '#fff' : colors.primary}/>
                <Text style={[styles.segmentText, selected && { color: '#fff' }]}>{label}</Text>
              </Pressable>);
        })}
        </View>

        <Text style={styles.sectionTitle}>Quick Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.bleed}>
          {QUICK_FILTERS.map((q) => (<Chip key={q.label} label={q.label} selected={q.isActive(filters)} onPress={() => {
                updateFilters(q.patch);
                openResults();
            }}/>))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Explore Popular Subjects</Text>
        <View style={styles.grid}>
          {popularSubjects.map(({ subjectId, subjectName, icon }) => (<Pressable key={subjectId} style={({ pressed }) => [styles.subject, pressed && { opacity: 0.8 }]} onPress={() => {
                submitSearch(subjectName);
                openResults();
            }}>
              <View style={styles.subjectIcon}>
                <Ionicons name={icon} size={22} color={colors.primary}/>
              </View>
              <Text style={styles.subjectName} numberOfLines={2}>
                {subjectName}
              </Text>
              <Text style={styles.subjectCode}>{subjectId}</Text>
            </Pressable>))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Tutors</Text>
          <Pressable onPress={() => {
            submitSearch('');
            openResults();
        }} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }}/>
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
                onPress={() => navigation?.navigate('SearchTutorProfileScreen', {
                  tutorId: item.id,
                  tutorName: item.name,
                  subject: (item.subjects?.[0]?.subjectName || item.subjects?.[0] || 'General Tutoring'),
                })}
              />
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>);
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
    content: { paddingHorizontal: PAD, paddingBottom: 24, gap: 14 },
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
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    navItem: {
        alignItems: 'center',
        gap: 4,
    },
    navText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.muted,
    },
});
export default HomeScreen;
