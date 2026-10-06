import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { supabase } from '../../../../supabase';

import { TutorResultCard } from '../components/TutorResultCard';
import { MAX_COMPARE, useDiscovery } from '../context/DiscoveryContext';
import type { Tutor } from '../types';

export function FavoritesScreen() {
  const { favoriteIds, toggleFavorite, compareIds, toggleCompare } = useDiscovery();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSavedTutors() {
      if (favoriteIds.length === 0) {
        setTutors([]);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tutors')
          .select('*')
          .in('id', favoriteIds);

        if (error) throw error;
        setTutors(data || []);
      } catch (err) {
        console.error('Error fetching saved tutors:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedTutors();
  }, [favoriteIds]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Saved Tutors</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tutors}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={40} color={colors.primaryBorder} />
              <Text style={styles.emptyText}>Tap ♡ on any tutor card to save them here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TutorResultCard
              tutor={item}
              variant="favorites"
              favorited
              onToggleFavorite={() => toggleFavorite(item.id)}
              onRemove={() => toggleFavorite(item.id)}
              onQuickBook={() => router.push({ pathname: '/bookings', params: { tutorId: item.id } })}
              comparing={compareIds.includes(item.id)}
              onToggleCompare={() => toggleCompare(item.id)}
              compareDisabled={compareIds.length >= MAX_COMPARE}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
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
  list: { padding: 16, gap: 14, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 64 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});