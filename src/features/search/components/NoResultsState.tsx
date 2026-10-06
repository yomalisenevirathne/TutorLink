import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  query: string;
  onBroadenFilters: () => void;
  onBrowsePopular: () => void;
};

/** Screen — empty state shown when a search query matches zero tutors. */
export function NoResultsState({ query, onBroadenFilters, onBrowsePopular }: Props) {
  const [notify, setNotify] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="search-outline" size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>No tutors found for &ldquo;{query}&rdquo;</Text>
      <Text style={styles.subtitle}>Try a different subject, or widen your search filters.</Text>

      <Pressable
        style={({ pressed }) => [styles.primary, pressed && { backgroundColor: colors.primaryDark }]}
        onPress={onBroadenFilters}>
        <Text style={styles.primaryText}>Broaden Your Filters</Text>
      </Pressable>
      <Pressable style={styles.outline} onPress={onBrowsePopular}>
        <Text style={styles.outlineText}>Browse Popular Subjects</Text>
      </Pressable>

      <View style={styles.notifyRow}>
        <Text style={styles.notifyText}>Notify me when a tutor becomes available for this subject</Text>
        <Switch
          value={notify}
          onValueChange={setNotify}
          trackColor={{ false: colors.border, true: colors.primaryBorder }}
          thumbColor={notify ? colors.primary : '#fff'}
          accessibilityLabel="Notify me when a tutor becomes available for this subject"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 8, gap: 8 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outline: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  outlineText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignSelf: 'stretch',
  },
  notifyText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
});
