import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow } from '../../../constants/colors';
import { supabase } from '../../../utils/supabase';
import { Avatar } from '../components/Avatar';
import { RatingStars } from '../components/RatingStars';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { MAX_COMPARE, useDiscovery } from '../context/DiscoveryContext';
import { formatRate } from '../utils/filters';

const DETAIL_ROWS = [
    {
        label: 'Availability',
        render: (t) => (Array.isArray(t?.availability) && t.availability.length > 0)
            ? t.availability.map((a) => `${a.day || ''} ${a.startTime || ''}–${a.endTime || ''}`.trim()).join('\n')
            : 'Not provided',
    },
    {
        label: 'Teaching Style',
        render: (t) => {
            const styles = Array.isArray(t?.teachingStyleTags) && t.teachingStyleTags.length > 0
                ? t.teachingStyleTags
                : (t?.teachingStyle ? [t.teachingStyle] : []);
            return styles.length > 0 ? styles.join('\n') : 'Not provided';
        },
    },
    {
        label: 'Group Size',
        render: (t) => (Array.isArray(t?.groupSizeOptions) && t.groupSizeOptions.length > 0)
            ? t.groupSizeOptions.join('\n')
            : 'Not provided',
    },
    {
        label: 'Languages',
        render: (t) => (Array.isArray(t?.languages) && t.languages.length > 0)
            ? t.languages.join('\n')
            : 'Not provided',
    },
    {
        label: 'Mode',
        render: (t) => {
            const modes = Array.isArray(t?.session_modes) && t.session_modes.length > 0
                ? t.session_modes
                : (Array.isArray(t?.modesOffered) ? t.modesOffered : []);
            return modes.length > 0
                ? modes.map((m) => (m === 'online' ? 'Online' : 'In-person')).join('\n')
                : 'Not provided';
        },
    },
];

export function CompareScreen({ navigation }) {
    const { compareIds, setCompareIds, toggleCompare } = useDiscovery();
    const [tutors, setTutors] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [picking, setPicking] = useState(false);

    useEffect(() => {
        async function fetchComparisonData() {
            try {
                setLoading(true);
                const { data: allData, error: allError } = await supabase
                    .from('tutors')
                    .select('*');
                if (allError)
                    throw allError;

                const normalizedAll = (allData || []).map((t) => ({
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

                if (compareIds.length > 0) {
                    const sorted = compareIds
                        .map((id) => normalizedAll.find((t) => t.id === id))
                        .filter(Boolean);
                    setTutors(sorted);
                }
                else {
                    setTutors([]);
                }

                setCandidates(normalizedAll.filter((t) => !compareIds.includes(t.id)));
            }
            catch (err) {
                console.error('Error fetching compare data:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchComparisonData();
    }, [compareIds]);

    const three = tutors.length === 3;
    const book = (t) => navigation?.navigate('ScheduleScreen', {
        tutorId: t?.id,
        tutorName: t?.name,
        subject: (t?.subjects?.[0]?.subjectName || t?.subjects?.[0] || 'General Tutoring'),
    });

    return (<SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text}/>
        </Pressable>
        <Text style={styles.title}>Compare Tutors</Text>
        <View style={{ width: 24 }}/>
      </View>

      {loading ? (<View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary}/>
        </View>) : tutors.length < 2 ? (<View style={styles.empty}>
          <Ionicons name="git-compare-outline" size={44} color={colors.primaryBorder}/>
          <Text style={styles.emptyTitle}>Pick at least 2 tutors to compare</Text>
          <Text style={styles.emptyText}>
            Tick “Compare” on tutor cards in your search results.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation?.navigate('ResultsScreen')}>
            <Text style={styles.primaryText}>Browse tutors</Text>
          </Pressable>
        </View>) : (<ScrollView contentContainerStyle={styles.content}>
          <View style={styles.columns}>
            {tutors.map((t) => (<View key={t.id} style={styles.card}>
                <Pressable style={styles.remove} onPress={() => toggleCompare(t.id)} hitSlop={8} accessibilityLabel={`Remove ${t.name} from comparison`}>
                  <Ionicons name="close" size={14} color={colors.muted}/>
                </Pressable>
                <Avatar source={t.photoUrl} name={t.name} size={three ? 52 : 68}/>
                <Text style={[styles.name, three && styles.nameSmall]} numberOfLines={2}>
                  {t.name}
                </Text>
                <VerifiedBadge status={t.verifiedStatus} small/>
                <Text style={styles.meta} numberOfLines={2}>
                  {t.university || 'University'}
                  {'\n'}Year {t.yearOfStudy || 1}
                </Text>
                <RatingStars rating={t.avgRating} reviewCount={three ? undefined : t.reviewCount} compact size={13}/>
                <Text style={styles.rate}>
                  {formatRate(t.hourlyRate)}
                  <Text style={styles.per}>/hr</Text>
                </Text>
                <View style={styles.subjects}>
                  {t.subjects?.map((s, idx) => (
                    <Text key={typeof s === 'string' ? `${s}-${idx}` : (s?.subjectId || s?.id || idx)} style={styles.subject} numberOfLines={2}>
                      {typeof s === 'string' ? s : (s?.subjectName || s?.name || '')}
                    </Text>
                  ))}
                </View>
                <Pressable style={({ pressed }) => [
                    styles.primaryButton,
                    styles.bookButton,
                    pressed && styles.bookPressed,
                ]} onPress={() => book(t)}>
                  <Text style={[styles.primaryText, styles.bookText, three && { fontSize: 12 }]}>
                    Book Session
                  </Text>
                </Pressable>
              </View>))}
          </View>

          <Pressable style={styles.expandHeader} onPress={() => setExpanded((e) => !e)} accessibilityRole="button" accessibilityState={{ expanded }}>
            <Text style={styles.expandTitle}>Compare Additional Details</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary}/>
          </Pressable>

          {expanded && (<View style={styles.table}>
              {DETAIL_ROWS.map((row, i) => (<View key={row.label} style={[styles.tableRow, i % 2 === 1 && styles.zebra]}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <View style={styles.rowCells}>
                    {tutors.map((t) => (<Text key={t.id} style={styles.cell}>
                        {row.render(t)}
                      </Text>))}
                  </View>
                </View>))}
            </View>)}

          {tutors.length < MAX_COMPARE && (<>
              <Pressable style={styles.addButton} onPress={() => setPicking((p) => !p)}>
                <Ionicons name={picking ? 'close' : 'add-circle-outline'} size={20} color={colors.primary}/>
                <Text style={styles.addText}>{picking ? 'Cancel' : 'Add a Third Tutor to Compare'}</Text>
              </Pressable>
              {picking &&
                    candidates.map((t) => (<Pressable key={t.id} style={styles.pickRow} onPress={() => {
                            setCompareIds([...compareIds, t.id]);
                            setPicking(false);
                        }}>
                    <Avatar source={t.photoUrl} name={t.name} size={36}/>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickName}>{t.name}</Text>
                      <Text style={styles.pickMeta} numberOfLines={1}>
                        {formatRate(t.hourlyRate)}/hr · {(Number(t.avgRating) || 0).toFixed(1)}★ ·{' '}
                        {t.subjects?.map((s) => typeof s === 'string' ? s : (s?.subjectName || s?.name || '')).filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <Ionicons name="add" size={20} color={colors.primary}/>
                  </Pressable>))}
            </>)}
        </ScrollView>)}
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
    content: { padding: 12, gap: 12, paddingBottom: 32 },
    columns: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    card: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingTop: 16,
        paddingBottom: 10,
        borderRadius: 16,
        backgroundColor: colors.card,
        ...shadow,
    },
    remove: { position: 'absolute', top: 6, right: 6, padding: 2, zIndex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    nameSmall: { fontSize: 13 },
    meta: { fontSize: 11, color: colors.muted, textAlign: 'center' },
    rate: { fontSize: 15, fontWeight: '700', color: colors.primary },
    per: { fontSize: 11, color: colors.muted, fontWeight: '500' },
    subjects: { gap: 4, alignItems: 'center', flex: 1 },
    subject: {
        fontSize: 11,
        color: colors.primary,
        backgroundColor: colors.primarySoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        textAlign: 'center',
        overflow: 'hidden',
    },
    bookButton: {
        alignSelf: 'stretch',
        paddingVertical: 10,
        paddingHorizontal: 6,
        marginTop: 4,
        backgroundColor: colors.accent,
    },
    bookPressed: { backgroundColor: colors.accentDark },
    bookText: { color: colors.onAccent },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
    expandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
        backgroundColor: colors.card,
        ...shadow,
    },
    expandTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    table: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.card },
    tableRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    zebra: { backgroundColor: '#FAF9FF' },
    rowLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
    rowCells: { flexDirection: 'row', gap: 8 },
    cell: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primaryBorder,
    },
    addText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    pickRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: colors.card,
    },
    pickName: { fontSize: 14, fontWeight: '600', color: colors.text },
    pickMeta: { fontSize: 12, color: colors.muted },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
