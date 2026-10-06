import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { VerifiedStatus } from '../types';

const VARIANTS = {
  verified: { label: 'Verified', icon: 'checkmark-circle', fg: colors.success, bg: colors.successSoft },
  pending: { label: 'Pending', icon: 'time', fg: colors.warning, bg: colors.warningSoft },
} as const;

/** Renders nothing for unverified tutors. */
export function VerifiedBadge({ status, small }: { status: VerifiedStatus; small?: boolean }) {
  if (status === 'unverified') return null;
  const v = VARIANTS[status];

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, small && styles.small]}>
      <Ionicons name={v.icon} size={small ? 11 : 13} color={v.fg} />
      <Text style={[styles.text, { color: v.fg }, small && styles.smallText]}>{v.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 12, fontWeight: '600' },
  smallText: { fontSize: 10 },
});
