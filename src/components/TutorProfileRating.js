import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { RatingStars } from '../features/search/components/RatingStars';
import { fetchTutorRatingSummary } from '../services/tutorRatingSummary';

export default function TutorProfileRating({ tutorId, labelStyle }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const request = useRef(null);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setUnavailable(false);
    fetchTutorRatingSummary(tutorId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setSummary(result);
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setUnavailable(true);
        console.warn('[Profile Rating]', error.code || error.name, error.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  }, [tutorId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => request.current?.abort();
  }, [load]));

  if (loading) return <>
    <ActivityIndicator size="small" accessibilityLabel="Loading tutor rating" />
    <Text style={labelStyle}>Loading reviews...</Text>
  </>;

  if (unavailable) return <Pressable style={styles.retry} onPress={load}
    accessibilityRole="button" accessibilityLabel="Reviews unavailable. Retry loading tutor rating">
    <Text style={labelStyle}>Reviews unavailable</Text>
    <Text style={labelStyle}>Tap to retry</Text>
  </Pressable>;

  return <>
    <RatingStars rating={summary?.average || 0} compact size={15} />
    <Text style={labelStyle}>{summary?.total || 0} {summary?.total === 1 ? 'review' : 'reviews'}</Text>
  </>;
}

const styles = StyleSheet.create({
  retry: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
