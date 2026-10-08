import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export default function SavedPaymentMethodsList({ cards, loading, error, onRetry, onEdit, onDelete, deletingId }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  if (loading) return <View style={styles.state} accessibilityRole="progressbar" accessibilityLabel="Loading saved cards">
    <ActivityIndicator color="#7100FF" /><Text style={styles.hint}>Loading saved cards…</Text>
  </View>;
  if (error) return <View style={styles.state}>
    <Text style={styles.hint} accessibilityRole="alert">{error}</Text>
    <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading saved cards">
      <Text style={styles.retry}>Try again</Text>
    </TouchableOpacity>
  </View>;
  if (cards.length === 0) return <View style={styles.state}>
    <Feather name="credit-card" size={28} color="#9D91AD" />
    <Text style={styles.emptyTitle}>No saved cards</Text>
    <Text style={styles.hint}>Add a new card to get started.</Text>
  </View>;
  return <View style={styles.list}>
    {cards.map((card) => <View key={card.id} style={styles.card}
      accessibilityLabel={`${card.brand} card ending in ${card.last4}, expires ${card.expiry}`}>
      <View style={styles.cardSummary}>
        <View style={styles.icon}><Feather name="credit-card" size={25} color="#7100FF" /></View>
        <View style={styles.details}>
          <Text style={styles.cardNumber}>{card.brand} •••• {card.last4}</Text>
          <Text style={styles.expiry}>Expires {card.expiry}</Text>
        </View>
      </View>
      {onEdit && onDelete && (confirmDeleteId === card.id ? <View style={styles.confirmation}>
        <Text style={styles.confirmText}>Remove this saved card?</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.action} disabled={!!deletingId} onPress={() => setConfirmDeleteId(null)}
            accessibilityRole="button" accessibilityLabel={`Cancel deleting ${card.brand} ${card.last4}`}>
            <Text style={styles.editText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} disabled={!!deletingId} onPress={() => onDelete(card)}
            accessibilityRole="button" accessibilityLabel={`Confirm delete ${card.brand} ${card.last4}`}>
            {deletingId === card.id ? <ActivityIndicator size="small" color="#C83C43" /> : <Text style={styles.deleteText}>Delete Card</Text>}
          </TouchableOpacity>
        </View>
      </View> : <View style={styles.buttons}>
        <TouchableOpacity style={styles.action} disabled={!!deletingId} onPress={() => onEdit(card)}
          accessibilityRole="button" accessibilityLabel={`Edit ${card.brand} ${card.last4}`}>
          <Feather name="edit-2" size={15} color="#7100FF" /><Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} disabled={!!deletingId} onPress={() => setConfirmDeleteId(card.id)}
          accessibilityRole="button" accessibilityLabel={`Delete ${card.brand} ${card.last4}`}>
          <Feather name="trash-2" size={15} color="#C83C43" /><Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { padding: 14, borderWidth: 1, borderColor: '#ECE3F5', borderRadius: 10, backgroundColor: '#FFFFFF' },
  cardSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 12, borderTopWidth: 1, borderColor: '#F1EAF8', paddingTop: 8 },
  action: { flex: 1, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  editText: { color: '#7100FF', fontSize: 13, fontWeight: '700' },
  deleteText: { color: '#C83C43', fontSize: 13, fontWeight: '700' },
  confirmation: { marginTop: 12 },
  confirmText: { color: '#35263F', fontSize: 13 },
  icon: { width: 43, height: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFFF' },
  details: { flex: 1 },
  cardNumber: { color: '#211329', fontSize: 14, fontWeight: '700' },
  expiry: { color: '#89818D', fontSize: 12, marginTop: 5 },
  state: { paddingVertical: 28, paddingHorizontal: 12, alignItems: 'center', gap: 12, borderRadius: 10, backgroundColor: '#FAF7FD' },
  emptyTitle: { color: '#35263F', fontSize: 15, fontWeight: '700' },
  hint: { color: '#89818D', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  retry: { color: '#7100FF', fontSize: 14, fontWeight: '700', padding: 10 },
});
