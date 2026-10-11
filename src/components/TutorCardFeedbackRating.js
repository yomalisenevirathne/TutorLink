import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RatingStars } from '../features/search/components/RatingStars';

export default function TutorCardFeedbackRating({ tutorId, feedback, compact = false, size = 13 }) {
  if (!feedback) return <Text style={styles.status}>Reviews unavailable</Text>;
  if (feedback.loading) return <View style={styles.row}>
    <ActivityIndicator size="small" accessibilityLabel="Loading tutor feedback" />
    <Text style={styles.status}>Loading reviews...</Text>
  </View>;

  const summary = feedback.summaries.get(tutorId);
  if (feedback.unavailable || !summary) return (
    <Text style={styles.status} accessibilityRole="alert">Reviews unavailable</Text>
  );

  return <RatingStars rating={summary.average} reviewCount={summary.total} compact={compact} size={size} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 11, color: '#64748B' },
});
