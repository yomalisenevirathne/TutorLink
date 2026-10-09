import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../constants/colors';

export function RatingStars({ rating, reviewCount, size = 14, compact }) {
    const numRating = typeof rating === 'number' && !isNaN(rating) ? rating : (Number(rating) || 0);
    const label = `Rated ${numRating.toFixed(1)} out of 5${reviewCount !== undefined ? ` from ${reviewCount} reviews` : ''}`;

    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {compact ? (
          <Ionicons name="star" size={size} color={colors.accent}/>
        ) : (
          [1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={numRating >= i ? 'star' : numRating >= i - 0.5 ? 'star-half' : 'star-outline'}
              size={size}
              color={colors.accent}
            />
          ))
        )}
        <Text style={[styles.value, { fontSize: size - 1 }]}>{numRating.toFixed(1)}</Text>
        {reviewCount !== undefined && (<Text style={[styles.count, { fontSize: size - 2 }]}>({reviewCount})</Text>)}
      </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    value: { marginLeft: 4, fontWeight: '700', color: colors.text },
    count: { marginLeft: 2, color: colors.muted },
});
