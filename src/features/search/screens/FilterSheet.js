import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { supabase } from '../../../utils/supabase';
import { Chip } from '../components/Chip';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { useDiscovery } from '../context/DiscoveryContext';
import { TEACHING_STYLES } from '../data/subjects';
import {
    DEFAULT_FILTERS,
    MODE_LABELS,
    PRICE_MAX,
    PRICE_MIN,
    PRICE_STEP,
    SORT_LABELS,
    applyFilters,
    formatRate,
} from '../utils/filters';

const RATINGS = [4.5, 4.0, 3.5, 3.0];
const LANGUAGES = ['English', 'Sinhala', 'Tamil'];
const MODES = ['online', 'physical', 'hybrid'];

export function FilterSheet({ initialSection, onClose }) {
    let insets = { top: 0, bottom: 0, left: 0, right: 0 };
    try {
        insets = useSafeAreaInsets();
    } catch {
        insets = { top: 0, bottom: 0, left: 0, right: 0 };
    }
    const { filters, setFilters, query } = useDiscovery();
    const [draft, setDraft] = useState(filters || DEFAULT_FILTERS);
    const [atBottom, setAtBottom] = useState(false);
    const [previewCount, setPreviewCount] = useState(0);
    const scrollRef = useRef(null);
    const sectionY = useRef({});
    const update = (patch) => setDraft((d) => ({ ...(d || DEFAULT_FILTERS), ...patch }));

    useEffect(() => {
        async function fetchCount() {
            try {
                const { data, error } = await supabase.from('tutors').select('*');
                if (!error && data) {
                    const normalized = data.map((t) => ({
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
                    }));
                    const filtered = applyFilters(normalized, query, draft);
                    setPreviewCount(filtered.length);
                }
            }
            catch (err) {
                console.error('Error fetching count:', err);
            }
        }
        fetchCount();
    }, [draft, query]);

    const scrollToInitial = () => {
        const y = initialSection ? sectionY.current[initialSection] : undefined;
        if (y !== undefined && y > 0)
            scrollRef.current?.scrollTo({ y: y - 8, animated: true });
    };

    const onScroll = (e) => {
        const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
        setAtBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 24);
    };

    const viewportH = useRef(0);
    const contentH = useRef(0);
    const checkFits = () => {
        if (viewportH.current > 0 && contentH.current <= viewportH.current + 24)
            setAtBottom(true);
    };

    const onSectionLayout = (id, y) => {
        sectionY.current[id] = y;
        if (id === initialSection)
            scrollToInitial();
    };

    return (<Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close filters"/>
        <View style={styles.sheet}>
          <View style={styles.handle}/>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text}/>
            </Pressable>
            <Text style={styles.title}>Filter & Sort</Text>
            <Pressable onPress={() => setDraft(DEFAULT_FILTERS)} hitSlop={10}>
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={32} onLayout={(e) => {
            viewportH.current = e.nativeEvent.layout.height;
            checkFits();
        }} onContentSizeChange={(_, h) => {
            contentH.current = h;
            checkFits();
        }}>
              <Section id="sort" onLayoutY={onSectionLayout} title="Sort By">
                {Object.keys(SORT_LABELS).map((opt) => (<Pressable key={opt} style={styles.radioRow} onPress={() => update({ sort: opt })} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === opt }}>
                    <Ionicons name={draft.sort === opt ? 'radio-button-on' : 'radio-button-off'} size={22} color={draft.sort === opt ? colors.primary : colors.muted}/>
                    <Text style={styles.radioLabel}>{SORT_LABELS[opt]}</Text>
                  </Pressable>))}
              </Section>

              <Section id="price" onLayoutY={onSectionLayout} title="Price Range (per hour)">
                <View style={styles.priceLabels}>
                  <Text style={styles.priceValue}>{formatRate(draft.priceMin)}</Text>
                  <Text style={styles.priceValue}>
                    {formatRate(draft.priceMax)}
                    {draft.priceMax === PRICE_MAX ? '+' : ''}
                  </Text>
                </View>
                <PriceRangeSlider min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} low={draft.priceMin} high={draft.priceMax} onChange={(priceMin, priceMax) => update({ priceMin, priceMax })}/>
              </Section>

              <Section id="rating" onLayoutY={onSectionLayout} title="Minimum Rating">
                <View style={styles.chips}>
                  {RATINGS.map((r) => (<Chip key={r} label={`${r.toFixed(1)}★+`} selected={draft.minRating === r} onPress={() => update({ minRating: draft.minRating === r ? null : r })}/>))}
                </View>
              </Section>

              <Section id="language" onLayoutY={onSectionLayout} title="Language of Instruction">
                <View style={styles.chips}>
                  {LANGUAGES.map((l) => {
            const selected = draft.languages && draft.languages.includes(l);
            return (<Chip key={l} label={l} selected={selected} onPress={() => update({
                    languages: selected
                        ? draft.languages.filter((x) => x !== l)
                        : [...(draft.languages || []), l],
                })}/>);
        })}
                </View>
              </Section>

              <Section id="style" onLayoutY={onSectionLayout} title="Teaching Style">
                <View style={styles.chips}>
                  {TEACHING_STYLES.map((s) => (<Chip key={s} label={s} selected={draft.teachingStyle === s} onPress={() => update({ teachingStyle: draft.teachingStyle === s ? null : s })}/>))}
                </View>
              </Section>

              <Section id="mode" onLayoutY={onSectionLayout} title="Tutoring Mode">
                <View style={styles.segment}>
                  {MODES.map((m) => {
            const selected = draft.mode === m;
            return (<Pressable key={m} onPress={() => update({ mode: selected ? 'any' : m })} style={[styles.segmentItem, selected && styles.segmentSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
                        <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                          {MODE_LABELS[m]}
                        </Text>
                      </Pressable>);
        })}
                </View>
                <Text style={styles.hint}>Hybrid = tutor offers both online and in-person sessions.</Text>
              </Section>
            </ScrollView>

            {!atBottom && (<View pointerEvents="none" style={styles.fade}>
                {[0.0, 0.35, 0.6, 0.8, 0.92].map((o, i) => (<View key={i} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${o})` }}/>))}
                <View style={styles.moreCue}>
                  <Text style={styles.moreText}>More filters below</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.primary}/>
                </View>
              </View>)}
          </View>

          <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
            <Pressable style={({ pressed }) => [styles.apply, pressed && { backgroundColor: colors.primaryDark }]} onPress={() => {
            setFilters(draft);
            onClose();
        }} accessibilityRole="button">
              <Text style={styles.applyText}>
                Apply Filters · {previewCount} tutor{previewCount === 1 ? '' : 's'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>);
}

function Section({ id, title, onLayoutY, children, }) {
    return (<View style={styles.section} onLayout={(e) => onLayoutY(id, e.nativeEvent.layout.y)}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>);
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 10, 40, 0.45)',
    },
    sheet: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '85%',
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.border,
        marginTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.text },
    reset: { fontSize: 14, fontWeight: '600', color: colors.primary },
    body: { flexShrink: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 48 },
    section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    radioLabel: { fontSize: 14, color: colors.text },
    priceLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    priceValue: { fontSize: 14, fontWeight: '700', color: colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    segment: {
        flexDirection: 'row',
        backgroundColor: colors.primarySoft,
        borderRadius: 12,
        padding: 4,
    },
    segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
    segmentSelected: { backgroundColor: colors.primary },
    segmentText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    segmentTextSelected: { color: '#fff' },
    hint: { fontSize: 12, color: colors.muted },
    fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
    moreCue: {
        position: 'absolute',
        bottom: 8,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: colors.primarySoft,
    },
    moreText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
    },
    apply: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    applyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
