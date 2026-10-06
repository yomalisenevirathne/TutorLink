import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow } from '@/constants/colors';

import type { Tutor } from '../types';
import { formatRate } from '../utils/filters';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';
import { VerifiedBadge } from './VerifiedBadge';

/** Compact vertical card used in the "Recommended Tutors" carousel. */
export function TutorCard({ tutor, onPress }: { tutor: Tutor; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${tutor.name}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.top}>
        <Avatar source={tutor.photoUrl} name={tutor.name} size={56} />
        <VerifiedBadge status={tutor.verifiedStatus} small />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {tutor.name}
      </Text>
      <RatingStars rating={tutor.avgRating} reviewCount={tutor.reviewCount} compact size={13} />
      <Text style={styles.rate}>
        {formatRate(tutor.hourlyRate)}
        <Text style={styles.per}> /hr</Text>
      </Text>
      <Text style={styles.subjects} numberOfLines={2}>
        {tutor.subjects.map((s) => s.subjectName).join(' · ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    padding: 14,
    gap: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    ...shadow,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 4 },
  rate: { fontSize: 15, fontWeight: '700', color: colors.primary },
  per: { fontSize: 12, fontWeight: '500', color: colors.muted },
  subjects: { fontSize: 12, color: colors.muted, lineHeight: 16 },
});
