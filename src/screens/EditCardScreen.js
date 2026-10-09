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
  const [focusedField, setFocusedField] = useState(null);
  const expiryInput = useRef(null);
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
      <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={busy} accessibilityRole="button" accessibilityLabel="Back to saved cards">
        <Feather name="arrow-left" size={23} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">Edit Card</Text>
    </View>
    <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        {loading ? <View style={styles.loadingState}>
          <ActivityIndicator color="#7100FF" accessibilityLabel="Loading card details" />
          <Text style={styles.loadingText}>Loading card details…</Text>
        </View> : card ? <>
          <View style={styles.card} accessibilityLabel={`${card.brand} card ending in ${card.last4}`}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardBrand}>{card.brand}</Text>
              <View style={styles.cardIcon}><Feather name="credit-card" size={23} color="#FFFFFF" /></View>
            </View>
            <Text style={styles.cardNumber}>•••• {card.last4}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardCaption}>Saved payment method</Text>
              <Text style={styles.cardExpiry}>Expires {card.expiry}</Text>
            </View>
          </View>
          <View style={styles.formPanel}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Card details</Text>
            <Text style={styles.description}>Update your cardholder name and expiry date.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Cardholder name</Text>
              <View style={[styles.inputContainer, focusedField === 'name' && styles.focusedInput]}>
                <Feather name="user" size={18} color={focusedField === 'name' ? '#7100FF' : '#9B8BA8'} />
                <TextInput style={styles.input} accessibilityLabel="Cardholder name" value={form.name} maxLength={80}
                  placeholder="Name on your card" placeholderTextColor="#A697B1" returnKeyType="next"
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => expiryInput.current?.focus()}
                  autoCapitalize="words" autoCorrect={false} autoComplete="off" editable={!busy} onChangeText={(value) => update('name', value)} />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Expiry date</Text>
              <View style={[styles.inputContainer, focusedField === 'expiry' && styles.focusedInput]}>
                <Feather name="calendar" size={18} color={focusedField === 'expiry' ? '#7100FF' : '#9B8BA8'} />
                <TextInput ref={expiryInput} style={styles.input} accessibilityLabel="Expiry date" value={form.expiry}
                  placeholder="MM / YY" placeholderTextColor="#A697B1" keyboardType="number-pad" maxLength={7} autoComplete="off" editable={!busy}
                  onFocus={() => setFocusedField('expiry')} onBlur={() => setFocusedField(null)}
                  onChangeText={(value) => update('expiry', formatCardExpiry(value))} />
              </View>
            </View>
          </View>
          <View style={styles.notePanel}>
            <Feather name="info" size={17} color="#946CC4" />
            <Text style={styles.note}>To use a different card number, add a new card.</Text>
          </View>
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
          onPress={save} accessibilityRole="button" accessibilityLabel={busy ? 'Saving changes' : 'Save Changes'} accessibilityState={{ disabled: !card || busy, busy }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <>
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveText}>Save Changes</Text>
          </>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8FD' },
  header: { minHeight: 76, backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0px 6px 16px rgba(89, 27, 166, 0.14)' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  body: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, paddingTop: 28, gap: 20 },
  loadingState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#8B7B99', fontSize: 13 },
  card: { padding: 22, borderRadius: 24, backgroundColor: '#7941CA', gap: 20, boxShadow: '0px 8px 20px rgba(104, 55, 176, 0.18)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardBrand: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cardIcon: { width: 40, height: 36, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
  cardNumber: { color: '#FFFFFF', fontSize: 24, fontWeight: '600', letterSpacing: 3, fontVariant: ['tabular-nums'] },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cardCaption: { color: '#E1D0F8', fontSize: 11, lineHeight: 16 },
  cardExpiry: { color: '#EEE3FC', fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  formPanel: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 22, borderWidth: 1, borderColor: '#EDE5F6', boxShadow: '0px 4px 12px rgba(50, 26, 78, 0.035)' },
  sectionTitle: { color: '#2D203D', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  description: { color: '#8B7B99', fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 24 },
  field: { gap: 9, marginBottom: 16 },
  label: { color: '#5D4B6C', fontSize: 12, fontWeight: '600' },
  inputContainer: { minHeight: 52, borderWidth: 1, borderColor: '#E6DDED', borderRadius: 14, backgroundColor: '#FDFBFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  focusedInput: { borderColor: '#AD7DEF', backgroundColor: '#FAF6FF' },
  input: { flex: 1, minWidth: 0, minHeight: 50, paddingVertical: 12, fontSize: 14, color: '#35263F' },
  notePanel: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#F1EAF9', borderRadius: 15 },
  note: { flex: 1, color: '#886E9E', fontSize: 12, lineHeight: 19 },
  error: { color: '#AD354A', backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#F7DDE3', borderRadius: 16, padding: 14, fontSize: 13, lineHeight: 20 },
  failure: { gap: 12 },
  retry: { color: '#7100FF', fontWeight: '700', padding: 12, textAlign: 'center' },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, paddingTop: 16, backgroundColor: '#FAF8FD' },
  saveButton: { minHeight: 54, backgroundColor: '#7100FF', borderRadius: 17, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 5px 12px rgba(113, 0, 255, 0.17)' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
});
