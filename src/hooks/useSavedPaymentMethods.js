import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavedPaymentMethods, savedCardsErrorMessage } from '../services/paymentMethods';

export default function useSavedPaymentMethods(userId, isDemo = false, cardsVersion = 0) {
  const [result, setResult] = useState(null);
  const [reload, setReload] = useState(0);
  const loading = !result || result.userId !== userId || result.isDemo !== isDemo
    || result.cardsVersion !== cardsVersion || result.reload !== reload;

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const request = { userId, isDemo, cardsVersion, reload };
    getSavedPaymentMethods(userId, { isDemo, signal: controller.signal }).then((cards) => {
      if (!controller.signal.aborted) setResult({ ...request, cards, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ ...request, cards: [], error: savedCardsErrorMessage(error) });
    });
    return () => controller.abort();
  }, [userId, isDemo, cardsVersion, reload]));

  return {
    loading, cards: loading ? [] : result.cards, error: loading ? '' : result.error,
    refresh: () => setReload((value) => value + 1),
  };
}
