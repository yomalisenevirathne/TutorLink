import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { formatCardExpiry, formatCardNumber, getCardMetadata } from '../data/cardForm';
import { savePaymentMethod } from '../services/paymentMethods';

const emptyForm = { number: '', expiry: '', cvv: '', name: '', saveForFuture: false };

export default function AddCardScreen({ userId, isDemo, onBack, onSaved, backLabel = 'Back to payment' }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const update = (field, value) => { setForm((previous) => ({ ...previous, [field]: value })); setError(''); };

  async function save() {
    if (submitting.current) return;
    setError('');
    try {
      const metadata = getCardMetadata(form);
      submitting.current = true;
      setBusy(true);
      const saved = await savePaymentMethod(userId, metadata, { isDemo });
      setForm(emptyForm);
      onSaved(saved);
    } catch (failure) {
      setError(failure.message || "We couldn't save your card. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (!busy) onBack(); }} disabled={busy}
          accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={12}>
          <Feather name="arrow-left" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Add Card</Text>
      </View>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Card number</Text>
          <TextInput style={styles.input} accessibilityLabel="Card number" placeholder="••••  ••••  ••••  ••••"
            placeholderTextColor="#A4A4A4" keyboardType="number-pad" maxLength={23}
            autoComplete="off" value={form.number} editable={!busy}
            onChangeText={(value) => update('number', formatCardNumber(value))} />
          <View style={styles.brands} accessibilityLabel="Visa, Mastercard and American Express accepted">
            <View style={styles.visa}><Text style={styles.visaText}>VISA</Text></View>
            <View style={styles.mastercard}><View style={styles.mastercardSymbols}><View style={styles.redCircle} /><View style={styles.orangeCircle} /></View><Text style={styles.mastercardText}>mastercard.</Text></View>
            <View style={styles.amex}><Text style={styles.amexText}>AMERICAN{ '\n' }EXPRESS</Text></View>
          </View>
          <View style={styles.fieldsRow}>
            <View style={styles.expiryField}><Text style={styles.label}>Expiry date</Text>
              <TextInput style={styles.input} accessibilityLabel="Expiry date" placeholder="MM  /  YY"
                placeholderTextColor="#A4A4A4" keyboardType="number-pad" maxLength={7}
                autoComplete="off" value={form.expiry} editable={!busy}
                onChangeText={(value) => update('expiry', formatCardExpiry(value))} />
            </View>
            <View style={styles.cvvField}><Text style={styles.label}>Security code</Text>
              <TextInput style={styles.input} accessibilityLabel="Security code" placeholder="CVV"
                placeholderTextColor="#A4A4A4" keyboardType="number-pad" maxLength={4}
                autoComplete="off" secureTextEntry value={form.cvv} editable={!busy}
                onChangeText={(value) => update('cvv', value.replace(/\D/g, '').slice(0, 4))} />
            </View>
          </View>
          <Text style={[styles.label, styles.nameLabel]}>Cardholder name</Text>
          <TextInput style={styles.input} accessibilityLabel="Cardholder name" placeholder="Name"
            placeholderTextColor="#A4A4A4" maxLength={80} autoCapitalize="words" autoComplete="off"
            value={form.name} editable={!busy} onChangeText={(value) => update('name', value)} />
          <TouchableOpacity style={styles.consent} disabled={busy} accessibilityRole="checkbox"
            accessibilityLabel="Save this card for future payments" accessibilityState={{ checked: form.saveForFuture }}
            onPress={() => update('saveForFuture', !form.saveForFuture)}>
            <View style={[styles.checkbox, form.saveForFuture && styles.checked]}>{form.saveForFuture && <Feather name="check" size={13} color="#FFFFFF" />}</View>
            <Text style={styles.consentText}>Save this card for future payments</Text>
          </TouchableOpacity>
          <Text style={styles.note}>Only masked card details are saved. Online payments are not enabled yet.</Text>
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, busy && styles.disabled]} disabled={busy}
            accessibilityRole="button" accessibilityLabel="Save Card" onPress={save}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Card</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 16 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  body: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 25 },
  label: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#4C4C4C', borderRadius: 3, height: 44, paddingHorizontal: 20, fontSize: 15, color: '#111111', backgroundColor: '#FFFFFF' },
  brands: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 9, marginBottom: 18 },
  visa: { backgroundColor: '#1465CA', borderRadius: 3, padding: 5 },
  visaText: { color: '#FFFFFF', fontSize: 17, fontStyle: 'italic', fontWeight: '800' },
  mastercard: { alignItems: 'center' },
  mastercardSymbols: { flexDirection: 'row', height: 26, alignItems: 'center' },
  redCircle: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#EC001B' },
  orangeCircle: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#FFA000', marginLeft: -10, opacity: 0.9 },
  mastercardText: { fontSize: 6, color: '#111111' },
  amex: { backgroundColor: '#0875C9', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 5 },
  amexText: { color: '#FFFFFF', fontSize: 8, lineHeight: 9, textAlign: 'center', fontWeight: '700' },
  fieldsRow: { flexDirection: 'row', gap: 30 },
  expiryField: { width: 120 },
  cvvField: { width: 92 },
  nameLabel: { marginTop: 15 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16, paddingVertical: 5 },
  checkbox: { width: 17, height: 17, borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#7100FF', borderColor: '#7100FF' },
  consentText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#969696' },
  note: { color: '#89818D', fontSize: 11, lineHeight: 17, marginTop: 14 },
  error: { color: '#A33333', backgroundColor: '#FFF1F1', borderRadius: 5, padding: 12, fontSize: 13, lineHeight: 20, marginTop: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 22, paddingTop: 12 },
  saveButton: { backgroundColor: '#530099', borderRadius: 3, paddingVertical: 12, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
