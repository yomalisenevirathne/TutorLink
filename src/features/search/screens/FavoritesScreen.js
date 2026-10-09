import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { supabase } from '../../../utils/supabase';
import { TutorResultCard } from '../components/TutorResultCard';
import { MAX_COMPARE, useDiscovery } from '../context/DiscoveryContext';

export function FavoritesScreen({ navigation }) {
    const { favoriteIds, toggleFavorite, compareIds, toggleCompare } = useDiscovery();
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchSavedTutors() {
            if (!favoriteIds || favoriteIds.length === 0) {
                setTutors([]);
                return;
            }
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('tutors')
                    .select('*')
                    .in('id', favoriteIds);
                if (error)
                    throw error;

                const normalized = (data || []).map((t) => ({
                    ...t,
                    hourlyRate: t.hourlyRate ?? t.hourly_rate ?? 0,
                    avgRating: t.avgRating ?? t.rating ?? t.avg_rating ?? 0,
                    reviewCount: t.reviewCount ?? t.total_reviews ?? t.review_count ?? 0,
                    verifiedStatus: t.verifiedStatus ?? (t.is_verified_tutor || t.is_verified ? 'verified' : 'unverified'),
                    modesOffered: Array.isArray(t.modesOffered) && t.modesOffered.length > 0
                        ? t.modesOffered
                        : (Array.isArray(t.session_modes) && t.session_modes.length > 0 ? t.session_modes : []),
                    teachingStyleTags: Array.isArray(t.teachingStyleTags) && t.teachingStyleTags.length > 0
                        ? t.teachingStyleTags
                        : (t.teachingStyle ? [t.teachingStyle] : []),
                    languages: Array.isArray(t.languages) ? t.languages : [],
                    groupSizeOptions: Array.isArray(t.groupSizeOptions) ? t.groupSizeOptions : [],
                    subjects: Array.isArray(t.subjects) ? t.subjects : (t.subject ? [t.subject] : []),
                    availability: Array.isArray(t.availability) ? t.availability : [],
                }));

                setTutors(normalized);
            }
            catch (err) {
                console.error('Error fetching saved tutors:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchSavedTutors();
    }, [favoriteIds]);

    return (<SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text}/>
        </Pressable>
        <Text style={styles.title}>Saved Tutors</Text>
        <View style={{ width: 24 }}/>
      </View>

      {loading ? (<View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary}/>
        </View>) : (<FlatList
          data={tutors}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}>
              <Ionicons name="heart-outline" size={40} color={colors.primaryBorder}/>
              <Text style={styles.emptyText}>Tap ♡ on any tutor card to save them here</Text>
            </View>}
          renderItem={({ item }) => (
            <TutorResultCard
              tutor={item}
              variant="favorites"
              favorited
              onToggleFavorite={() => toggleFavorite(item.id)}
              onRemove={() => toggleFavorite(item.id)}
              onQuickBook={() => navigation?.navigate('ScheduleScreen', {
                tutorId: item.id,
                tutorName: item.name,
                subject: (item.subjects?.[0]?.subjectName || item.subjects?.[0] || 'General Tutoring'),
              })}
              onViewProfile={() => navigation?.navigate('SearchTutorProfileScreen', {
                tutorId: item.id,
                tutorName: item.name,
                subject: (item.subjects?.[0]?.subjectName || item.subjects?.[0] || 'General Tutoring'),
              })}
              comparing={compareIds.includes(item.id)}
              onToggleCompare={() => toggleCompare(item.id)}
              compareDisabled={compareIds.length >= MAX_COMPARE}
            />
          )}
        />)}
    </SafeAreaView>);
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.text },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, gap: 14, flexGrow: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 64 },
    emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
