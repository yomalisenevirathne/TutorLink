import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  rating: number;
  reviewCount?: number;
  size?: number;
  /** Show one star + number instead of five stars. */
  compact?: boolean;
};

export function RatingStars({ rating, reviewCount, size = 14, compact }: Props) {
  const label = `Rated ${rating.toFixed(1)} out of 5${
    reviewCount !== undefined ? ` from ${reviewCount} reviews` : ''
  }`;

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      {compact ? (
        <Ionicons name="star" size={size} color={colors.accent} />
      ) : (
        [1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'}
            size={size}
            color={colors.accent}
          />
        ))
      )}
      <Text style={[styles.value, { fontSize: size - 1 }]}>{rating.toFixed(1)}</Text>
      {reviewCount !== undefined && (
        <Text style={[styles.count, { fontSize: size - 2 }]}>({reviewCount})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { marginLeft: 4, fontWeight: '700', color: colors.text },
  count: { marginLeft: 2, color: colors.muted },
});
