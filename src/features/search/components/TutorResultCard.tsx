import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow } from '@/constants/colors';

import type { Tutor } from '../types';
import { formatRate } from '../utils/filters';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';
import { VerifiedBadge } from './VerifiedBadge';

type Props = {
  tutor: Tutor;
  onQuickBook: () => void;
  comparing: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  /** Search Results (default): shows "View Profile". Favorites: shows "Remove" instead. */
  variant?: 'results' | 'favorites';
  onViewProfile?: () => void;
  onRemove?: () => void;
  /** Renders a heart badge over the avatar that toggles favorite state. */
  favorited?: boolean;
  onToggleFavorite?: () => void;
};

export function TutorResultCard({
  tutor,
  onQuickBook,
  onViewProfile,
  onRemove,
  comparing,
  onToggleCompare,
  compareDisabled,
  variant = 'results',
  favorited,
  onToggleFavorite,
}: Props) {
  const modes = tutor.modesOffered || (tutor as any).session_modes || ['online'];
  const subjects = tutor.subjects || [];
  const completedSessions = tutor.sessionsCompleted ?? (tutor as any).sessions_completed ?? 0;
  const isVerified = tutor.verifiedStatus === 'verified' && completedSessions >= 10;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Avatar source={tutor.photoUrl} name={tutor.name} size={64} radius={16} />
          {onToggleFavorite && (
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={8}
              style={styles.heart}
              accessibilityRole="button"
              accessibilityLabel={favorited ? `Unsave ${tutor.name}` : `Save ${tutor.name}`}>
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={16}
                color={favorited ? colors.error : colors.muted}
              />
            </Pressable>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {tutor.name}
            </Text>
            {isVerified && <VerifiedBadge status="verified" small />}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {tutor.university} · Year {tutor.yearOfStudy}
          </Text>
          {completedSessions >= 10 && (
            <View style={styles.sessionBadge}>
              <Ionicons name="checkmark-circle-outline" size={12} color={colors.primary} />
              <Text style={styles.sessionBadgeText}>10+ sessions conducted</Text>
            </View>
          )}
          <RatingStars rating={tutor.avgRating} reviewCount={tutor.reviewCount} size={13} />
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.rate}>
          {formatRate(tutor.hourlyRate)}
          <Text style={styles.per}> /hr</Text>
        </Text>
        <View style={styles.modes}>
          {modes.map((m: string) => (
            <View key={m} style={styles.mode}>
              <Ionicons
                name={m === 'online' ? 'videocam-outline' : 'location-outline'}
                size={12}
                color={colors.primary}
              />
              <Text style={styles.modeText}>{m === 'online' ? 'Online' : 'In-person'}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.subjects} numberOfLines={1}>
        {subjects.map((s: any) => `${s.subjectId || s.id || ''} ${s.subjectName || s.name || ''}`.trim()).join(' · ')}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleCompare}
          disabled={compareDisabled && !comparing}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: comparing, disabled: compareDisabled && !comparing }}
          accessibilityLabel={`Compare ${tutor.name}`}
          style={[styles.compare, compareDisabled && !comparing && { opacity: 0.4 }]}>
          <Ionicons
            name={comparing ? 'checkbox' : 'square-outline'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.compareText}>Compare</Text>
        </Pressable>
        {variant === 'favorites' ? (
          <Pressable onPress={onRemove} style={[styles.button, styles.muted]}>
            <Text style={styles.mutedText}>Remove</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onViewProfile} style={[styles.button, styles.secondary]}>
            <Text style={styles.secondaryText}>View Profile</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onQuickBook}
          style={({ pressed }) => [styles.button, styles.cta, pressed && styles.ctaPressed]}>
          {variant === 'results' && <Ionicons name="flash" size={14} color={colors.onAccent} />}
          <Text style={styles.ctaText}>{variant === 'favorites' ? 'Book' : 'Quick Book'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 10, ...shadow },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heart: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  info: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  meta: { fontSize: 12, color: colors.muted },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginVertical: 2,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rate: { fontSize: 16, fontWeight: '700', color: colors.primary },
  per: { fontSize: 12, fontWeight: '500', color: colors.muted },
  modes: { flexDirection: 'row', gap: 6 },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  modeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  subjects: { fontSize: 12, color: colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 'auto' },
  compareText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cta: { backgroundColor: colors.accent },
  ctaPressed: { backgroundColor: colors.accentDark },
  ctaText: { color: colors.onAccent, fontWeight: '700', fontSize: 13 },
  secondary: { borderWidth: 1, borderColor: colors.primary },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  muted: { backgroundColor: colors.background },
  mutedText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
});