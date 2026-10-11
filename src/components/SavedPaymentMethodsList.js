import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export default function SavedPaymentMethodsList({ cards, loading, error, onRetry, onEdit, onDelete, deletingId, variant = 'default' }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const isSettings = variant === 'settings' || variant === 'manage';
  if (loading) return <View style={[styles.state, isSettings && styles.settingsState]} accessibilityRole="progressbar" accessibilityLabel="Loading saved cards">
    <ActivityIndicator color="#7100FF" /><Text style={styles.hint}>Loading saved cards…</Text>
  </View>;
  if (error) return <View style={[styles.state, isSettings && styles.settingsState]}>
    <Text style={styles.hint} accessibilityRole="alert">{error}</Text>
    <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading saved cards">
      <Text style={styles.retry}>Try again</Text>
    </TouchableOpacity>
  </View>;
  if (cards.length === 0) return <View style={[styles.state, isSettings && styles.settingsState]}>
    <View style={isSettings && styles.emptyIcon}><Feather name="credit-card" size={28} color={isSettings ? '#875CC4' : '#9D91AD'} /></View>
    <Text style={styles.emptyTitle}>No saved cards</Text>
    <Text style={styles.hint}>Add a new card to get started.</Text>
  </View>;
  return <View style={styles.list}>
    {cards.map((card) => <View key={card.id} style={[styles.card, isSettings && styles.settingsCard]}
      accessibilityLabel={`${card.brand} card ending in ${card.last4}, expires ${card.expiry}`}>
      <View style={styles.cardSummary}>
        <View style={[styles.icon, isSettings && styles.settingsIcon]}>
          <Feather name="credit-card" size={25} color={isSettings ? '#FFFFFF' : '#7100FF'} />
        </View>
        <View style={styles.details}>
          {isSettings ? <>
            <Text style={styles.settingsBrand}>{card.brand}</Text>
            <Text style={styles.settingsNumber}>•••• {card.last4}</Text>
            <View style={styles.expiryRow}>
              <Feather name="clock" size={11} color="#94849F" />
              <Text style={styles.settingsExpiry}>Expires {card.expiry}</Text>
            </View>
          </> : <>
            <Text style={styles.cardNumber}>{card.brand} •••• {card.last4}</Text>
            <Text style={styles.expiry}>Expires {card.expiry}</Text>
          </>}
        </View>
      </View>
      {onEdit && onDelete && (confirmDeleteId === card.id ? <View style={styles.confirmation}>
        <View style={styles.confirmHeading}>
          <View style={styles.confirmIcon}><Feather name="trash-2" size={16} color="#C83C55" /></View>
          <Text style={styles.confirmText}>Remove this saved card?</Text>
        </View>
        <Text style={styles.confirmHint}>This removes it from your saved cards.</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity style={[styles.action, styles.cancelAction, !!deletingId && styles.disabledAction]} disabled={!!deletingId} onPress={() => setConfirmDeleteId(null)}
            accessibilityRole="button" accessibilityLabel={`Cancel deleting ${card.brand} ${card.last4}`}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.action, styles.confirmDeleteAction, !!deletingId && styles.disabledAction]} disabled={!!deletingId} onPress={() => onDelete(card)}
            accessibilityRole="button" accessibilityLabel={`Confirm delete ${card.brand} ${card.last4}`}>
            {deletingId === card.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmDeleteText}>Delete Card</Text>}
          </TouchableOpacity>
        </View>
      </View> : <View style={styles.buttons}>
        <TouchableOpacity style={[styles.action, styles.editAction, !!deletingId && styles.disabledAction]} disabled={!!deletingId} onPress={() => onEdit(card)}
          accessibilityRole="button" accessibilityLabel={`Edit ${card.brand} ${card.last4}`}>
          <Feather name="edit-2" size={15} color="#7100FF" /><Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, styles.deleteAction, !!deletingId && styles.disabledAction]} disabled={!!deletingId} onPress={() => setConfirmDeleteId(card.id)}
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
  settingsCard: { padding: 16, borderColor: '#EDE5F6', borderRadius: 20, boxShadow: '0px 4px 12px rgba(50, 26, 78, 0.045)' },
  cardSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderColor: '#F1EAF8', paddingTop: 14 },
  action: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  editAction: { backgroundColor: '#F4EEFD' },
  deleteAction: { backgroundColor: '#FFF0F3' },
  disabledAction: { opacity: 0.5 },
  editText: { color: '#7100FF', fontSize: 13, fontWeight: '700' },
  deleteText: { color: '#C83C43', fontSize: 13, fontWeight: '700' },
  confirmation: { marginTop: 16, backgroundColor: '#FFF6F8', borderRadius: 15, borderWidth: 1, borderColor: '#F8E1E7', padding: 12 },
  confirmHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FCE6EC', alignItems: 'center', justifyContent: 'center' },
  confirmText: { flex: 1, color: '#783447', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  confirmHint: { color: '#A37481', fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 14 },
  confirmButtons: { flexDirection: 'row', gap: 8 },
  cancelAction: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDCE1' },
  cancelText: { color: '#74606B', fontSize: 12, fontWeight: '700' },
  confirmDeleteAction: { backgroundColor: '#C83C55' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  icon: { width: 43, height: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFFF' },
  settingsIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#8750D4', boxShadow: '0px 4px 10px rgba(135, 80, 212, 0.17)' },
  details: { flex: 1, minWidth: 0 },
  settingsBrand: { color: '#35263F', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  settingsNumber: { color: '#5C476D', fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 1.5, fontVariant: ['tabular-nums'], marginTop: 1 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  settingsExpiry: { flexShrink: 1, color: '#94849F', fontSize: 11, lineHeight: 16 },
  cardNumber: { color: '#211329', fontSize: 14, fontWeight: '700' },
  expiry: { color: '#89818D', fontSize: 12, marginTop: 5 },
  state: { paddingVertical: 28, paddingHorizontal: 12, alignItems: 'center', gap: 12, borderRadius: 10, backgroundColor: '#FAF7FD' },
  settingsState: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE5F6', borderRadius: 20, paddingVertical: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E8FF', marginBottom: 4 },
  emptyTitle: { color: '#35263F', fontSize: 15, fontWeight: '700' },
  hint: { color: '#89818D', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  retry: { color: '#7100FF', fontSize: 14, fontWeight: '700', padding: 10 },
});
