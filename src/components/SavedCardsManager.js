import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useSavedPaymentMethods from '../hooks/useSavedPaymentMethods';
import { deletePaymentMethod } from '../services/paymentMethods';
import SavedPaymentMethodsList from './SavedPaymentMethodsList';

export default function SavedCardsManager({ userId, isDemo, cardsVersion, onEdit, onChanged, refreshVersion = 0 }) {
  const { cards, loading, error, refresh } = useSavedPaymentMethods(userId, isDemo, `${cardsVersion}:${refreshVersion}`);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const deleting = useRef(false);

  async function remove(card) {
    if (deleting.current) return;
    deleting.current = true;
    setDeletingId(card.id);
    setActionError('');
    try {
      await deletePaymentMethod(userId, card.id, { isDemo });
      refresh();
      onChanged();
    } catch (failure) {
      setActionError(failure.message || 'Your card could not be removed. Please try again.');
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  }

  return <View>
    {!!actionError && <Text style={styles.error} accessibilityRole="alert">{actionError}</Text>}
    <SavedPaymentMethodsList cards={cards} loading={loading} error={error} onRetry={refresh}
      onEdit={onEdit} onDelete={remove} deletingId={deletingId} variant="manage" />
  </View>;
}

const styles = StyleSheet.create({
  error: { color: '#AD354A', backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#F7DDE3', borderRadius: 16, padding: 14, fontSize: 13, lineHeight: 20, marginBottom: 14 },
});
