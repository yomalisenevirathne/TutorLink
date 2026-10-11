import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { RatingStars } from '../features/search/components/RatingStars';
import { fetchTutorProfileReviews } from '../services/tutorProfileReviews';

export default function TutorProfileReviews({ tutorId, styles, onOpenFeedback }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const request = useRef(null);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setUnavailable(false);
    fetchTutorProfileReviews(tutorId, controller.signal).then(records => {
      if (!controller.signal.aborted) setReviews(records);
    }).catch(error => {
      if (!controller.signal.aborted) {
        setUnavailable(true);
        console.warn('[Profile Reviews]', error.code || error.name, error.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
  }, [tutorId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => request.current?.abort();
  }, [load]));

  return <Pressable style={styles.card} onPress={onOpenFeedback} disabled={!onOpenFeedback}
    accessibilityRole="button" accessibilityLabel="Open tutor reviews and leave feedback">
    <Text style={styles.cardTitle}>Reviews</Text>
    {loading ? <View style={localStyles.loading}>
      <ActivityIndicator size="small" accessibilityLabel="Loading tutor reviews" />
      <Text style={styles.meta}>Loading reviews...</Text>
    </View> : unavailable ? <>
      <Text style={styles.meta} accessibilityRole="alert">Reviews could not be loaded.</Text>
      <Pressable style={localStyles.button} onPress={(event) => { event.stopPropagation(); load(); }} accessibilityRole="button"
        accessibilityLabel="Retry loading tutor reviews">
        <Text style={styles.link}>Retry</Text>
      </Pressable>
    </> : reviews.length === 0 ? <Text style={styles.meta}>No reviews yet</Text> : <>
      {reviews.map((review, index) => <View key={review.id} style={[styles.review, index > 0 && styles.reviewDivider]}>
        {review.rating !== null ? <RatingStars rating={review.rating} compact size={13} />
          : <Text style={styles.meta}>Not rated</Text>}
        <Text style={styles.reviewQuote}>&ldquo;{review.text}&rdquo;</Text>
        <Text style={styles.reviewerName}>{review.authorName}</Text>
      </View>)}
      <Pressable style={localStyles.button} onPress={(event) => {
        event.stopPropagation();
        router.push({ pathname: '/[page]', params: { page: 'feedbackComments', tutorId } });
      }} accessibilityRole="button" accessibilityLabel="View all feedback and comments for this tutor">
        <Text style={styles.seeAll}>View all</Text>
      </Pressable>
    </>}
  </Pressable>;
}

const localStyles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  button: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16 },
});
