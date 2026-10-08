import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { formatCardExpiry, getCardUpdateMetadata } from '../data/cardForm';
import { getPaymentMethodDetails, updatePaymentMethod } from '../services/paymentMethods';

export default function EditCardScreen({ userId, cardId, isDemo, onBack, onSaved }) {
  const [result, setResult] = useState(null);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ name: '', expiry: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const loading = !result || result.userId !== userId || result.cardId !== cardId || result.reload !== reload;
  const card = loading ? null : result.card;

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    getPaymentMethodDetails(userId, cardId, { isDemo, signal: controller.signal }).then((details) => {
      if (controller.signal.aborted) return;
      setForm({ name: details.cardholderName, expiry: details.expiry });
      setResult({ userId, cardId, reload, card: details });
    }).catch((failure) => {
      if (!controller.signal.aborted) setResult({ userId, cardId, reload, error: failure.message || 'Unable to load your saved card.' });
    });
    return () => controller.abort();
  }, [userId, cardId, isDemo, reload]));

  const update = (field, value) => { setForm((previous) => ({ ...previous, [field]: value })); setError(''); };
  async function save() {
    if (submitting.current || !card) return;
    setError('');
    try {
      const metadata = getCardUpdateMetadata(form);
      submitting.current = true;
      setBusy(true);
      const saved = await updatePaymentMethod(userId, cardId, metadata, { isDemo });
      onSaved(saved);
    } catch (failure) {
      setError(failure.message || 'Unable to save your changes. Please try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <SafeAreaView edges={['bottom']} style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} disabled={busy} accessibilityRole="button" accessibilityLabel="Back to saved cards" hitSlop={12}>
        <Feather name="arrow-left" size={23} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">Edit Card</Text>
    </View>
    <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color="#7100FF" accessibilityLabel="Loading card details" /> : card ? <>
          <View style={styles.card}>
            <Feather name="credit-card" size={28} color="#7100FF" />
            <Text style={styles.cardNumber}>{card.brand} •••• {card.last4}</Text>
          </View>
          <Text style={styles.label}>Cardholder name</Text>
          <TextInput style={styles.input} accessibilityLabel="Cardholder name" value={form.name} maxLength={80}
            autoCapitalize="words" autoComplete="off" editable={!busy} onChangeText={(value) => update('name', value)} />
          <Text style={styles.label}>Expiry date</Text>
          <TextInput style={[styles.input, styles.expiry]} accessibilityLabel="Expiry date" value={form.expiry}
            placeholder="MM / YY" keyboardType="number-pad" maxLength={7} autoComplete="off" editable={!busy}
            onChangeText={(value) => update('expiry', formatCardExpiry(value))} />
          <Text style={styles.note}>To use a different card number, add a new card.</Text>
        </> : <View style={styles.failure}>
          <Text style={styles.error} accessibilityRole="alert">{result.error}</Text>
          <TouchableOpacity onPress={() => setReload((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Retry loading card details">
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>}
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, (!card || busy) && styles.disabled]} disabled={!card || busy}
          onPress={save} accessibilityRole="button" accessibilityLabel="Save Changes">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 16 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  body: { flex: 1 },
  content: { padding: 24, gap: 10 },
  card: { padding: 20, borderRadius: 10, backgroundColor: '#F7F1FF', flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 15 },
  cardNumber: { color: '#35263F', fontSize: 16, fontWeight: '700' },
  label: { color: '#211329', fontSize: 14, fontWeight: '600', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#73667C', borderRadius: 5, height: 46, paddingHorizontal: 15, fontSize: 15, color: '#211329' },
  expiry: { width: 140 },
  note: { color: '#89818D', fontSize: 13, lineHeight: 20, marginVertical: 15 },
  error: { color: '#A33333', backgroundColor: '#FFF1F1', borderRadius: 6, padding: 12, fontSize: 13, lineHeight: 20 },
  failure: { gap: 12 },
  retry: { color: '#7100FF', fontWeight: '700', padding: 12, textAlign: 'center' },
  footer: { padding: 24 },
  saveButton: { minHeight: 48, backgroundColor: '#530099', borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
});
