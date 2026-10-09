import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow } from '../../../constants/colors';
import { supabase } from '../../../utils/supabase';
import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { RatingStars } from '../components/RatingStars';
import TutorProfileRating from '../../../components/TutorProfileRating';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useDiscovery } from '../context/DiscoveryContext';
import { formatRate } from '../utils/filters';

const nextAvailableSlot = (tutor) => {
    const next = tutor?.availability?.[0];
    return next && next.day ? `${next.day} ${next.startTime || ''}`.trim() : 'By request';
};

/** Screen — full Tutor Profile, reached from "View Profile" on a tutor card. */
export function TutorProfileScreen({ id, navigation }) {
    const [tutor, setTutor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { favoriteIds, toggleFavorite } = useDiscovery();

    useEffect(() => {
        if (!id) return;

        async function fetchTutorDetails() {
            try {
                setLoading(true);
                const { data: tutorData, error: tutorError } = await supabase
                    .from('tutors')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (tutorError)
                    throw tutorError;
                setTutor(tutorData);

                const { data: reviewsData, error: reviewsError } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('tutor_id', id)
                    .limit(5);
                if (!reviewsError && reviewsData) {
                    setReviews(reviewsData);
                }
            }
            catch (err) {
                console.error('Error fetching tutor details:', err);
            }
            finally {
                setLoading(false);
            }
        }

        fetchTutorDetails();
    }, [id]);

    if (id && loading) {
        return (<SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary}/>
        <Text style={styles.meta}>Loading profile...</Text>
      </SafeAreaView>);
    }

    if (!id || !tutor) {
        return (<SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.name}>Tutor not found</Text>
        <Pressable onPress={() => navigation?.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>);
    }

    const saved = favoriteIds && favoriteIds.includes(tutor.id);

    return (<SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text}/>
        </Pressable>
        <Text style={styles.headerTitle}>Tutor Profile</Text>
        <View style={{ width: 24 }}/>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar source={tutor.photoUrl} name={tutor.name} size={72}/>
          <Text style={styles.name}>{tutor.name}</Text>
          <VerifiedBadge status={tutor.verifiedStatus}/>
          <Text style={styles.meta}>
            {tutor.university || 'University'} · Year {tutor.yearOfStudy || 1}
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.statCol}>
            <TutorProfileRating key={tutor.id} tutorId={tutor.id} labelStyle={styles.statLabel}/>
          </View>
          <View style={styles.statDivider}/>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{formatRate(tutor.hourlyRate || 0)}</Text>
            <Text style={styles.statLabel}>per hour</Text>
          </View>
          <View style={styles.statDivider}/>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{nextAvailableSlot(tutor)}</Text>
            <Text style={styles.statLabel}>next available</Text>
          </View>
        </View>

        {tutor.bio ? (<View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bio}>{tutor.bio}</Text>
          </View>) : null}

        {tutor.subjects && tutor.subjects.length > 0 && (<View style={[styles.card, styles.chipsCard]}>
            <Text style={styles.cardTitle}>Subjects</Text>
            <View style={styles.chips}>
              {tutor.subjects.map((s, idx) => {
                const label = typeof s === 'string' ? s : (s?.subjectName || s?.name || '');
                const key = typeof s === 'string' ? `${s}-${idx}` : (s?.subjectId || s?.id || idx);
                return (<Chip key={key} label={label} onPress={() => { }}/>);
              })}
            </View>
          </View>)}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reviews</Text>
          {reviews.length === 0 ? (<Text style={styles.meta}>No reviews yet</Text>) : (reviews.map((r, i) => (<View key={i} style={[styles.review, i > 0 && styles.reviewDivider]}>
                <RatingStars rating={r.rating} compact size={13}/>
                <Text style={styles.reviewQuote}>&ldquo;{r.quote}&rdquo;</Text>
                <Text style={styles.reviewerName}>{r.reviewerName}</Text>
              </View>)))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.outline}
          onPress={() => toggleFavorite(tutor.id)}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Unsave ${tutor.name}` : `Save ${tutor.name}`}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.error : colors.primary}/>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={() => navigation?.navigate('ScheduleScreen', {
            tutorId: tutor.id,
            tutorName: tutor.name,
            subject: (tutor.subjects?.[0]?.subjectName || tutor.subjects?.[0] || 'General Tutoring'),
          })}
        >
          <Text style={styles.primaryText}>Book Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>);
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
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
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    hero: {
        alignItems: 'center',
        gap: 6,
        padding: 20,
        borderRadius: 20,
        backgroundColor: colors.card,
        ...shadow,
    },
    name: { fontSize: 20, fontWeight: '800', color: colors.text },
    meta: { fontSize: 13, color: colors.muted },
    link: { color: colors.primary, fontWeight: '700' },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 14,
        ...shadow,
    },
    statCol: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, height: 36, backgroundColor: colors.border },
    statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: 11, color: colors.muted },
    card: { padding: 16, borderRadius: 16, backgroundColor: colors.card, gap: 8, ...shadow },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    bio: { fontSize: 14, color: colors.text, lineHeight: 20 },
    chipsCard: { gap: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    review: { gap: 4, paddingVertical: 8 },
    reviewDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    reviewQuote: { fontSize: 14, color: colors.text, lineHeight: 20, fontStyle: 'italic' },
    reviewerName: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    seeAll: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
    footer: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    outline: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    outlineText: { color: colors.primary, fontWeight: '700' },
    primary: {
        flex: 1,
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryPressed: { backgroundColor: colors.accentDark },
    primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
});
