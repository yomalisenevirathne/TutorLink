import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  label: string;
  /** When set, the pill is highlighted and shows "Label: value ✕". */
  value?: string;
  onPress: () => void;
  onClear?: () => void;
};

export function FilterPill({ label, value, onPress, onClear }: Props) {
  const active = value !== undefined;

  return (
    <View style={[styles.pill, active && styles.active]}>
      <Pressable
        onPress={onPress}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={active ? `${label} filter: ${value}. Tap to change` : `${label} filter`}>
        <Text style={[styles.text, active && styles.activeText]} numberOfLines={1}>
          {active ? `${label}: ${value}` : label}
        </Text>
        {!active && <Ionicons name="chevron-down" size={14} color={colors.text} />}
      </Pressable>
      {active && onClear && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label} filter`}>
          <Ionicons name="close" size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
  },
  text: { fontSize: 13, fontWeight: '600', color: colors.text },
  activeText: { color: '#fff' },
  clear: {
    marginRight: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
