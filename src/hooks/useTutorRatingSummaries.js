import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchTutorRatingSummaries } from '../services/tutorRatingSummary';

export default function useTutorRatingSummaries(tutorIds) {
  // A stable key avoids refetches when a list rerenders with the same tutors.
  const key = JSON.stringify([...new Set(tutorIds)].sort());
  const [state, setState] = useState({ key: '', loading: true, unavailable: false, summaries: new Map() });
  const request = useRef(null);

  const refresh = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ key, loading: true, unavailable: false, summaries: new Map() });
    fetchTutorRatingSummaries(JSON.parse(key), controller.signal).then(summaries => {
      if (!controller.signal.aborted) setState({ key, loading: false, unavailable: false, summaries });
    }).catch(error => {
      if (!controller.signal.aborted) {
        setState({ key, loading: false, unavailable: true, summaries: new Map() });
        console.warn('[Tutor Card Ratings]', error.code || error.name, error.message);
      }
    });
  }, [key]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => request.current?.abort();
  }, [refresh]));

  // Never display a summary belonging to a previously rendered list.
  return {
    loading: state.key !== key || state.loading,
    unavailable: state.key === key && state.unavailable,
    summaries: state.key === key ? state.summaries : new Map(),
    refresh,
  };
}
