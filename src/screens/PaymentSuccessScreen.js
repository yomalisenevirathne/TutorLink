import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { formatPaymentAmount } from '../data/paymentHistory';
import { receiptRows } from '../data/paymentReceipt';
import { downloadPaymentReceipt, sharePaymentReceipt } from '../services/paymentReceiptActions';

export default function PaymentSuccessScreen({ receipt, onDone }) {
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const actionInProgress = useRef(false);

  async function receiptAction(action) {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(action);
    setNotice('');
    try {
      const result = await (action === 'share' ? sharePaymentReceipt(receipt) : downloadPaymentReceipt(receipt));
      if (result === 'copied') setNotice('Receipt copied. Paste it into a message to share.');
      if (result === 'print') setNotice('Choose “Save as PDF” in the print window to download your receipt.');
    } catch (error) {
      if (error.name !== 'AbortError') setNotice(error.message || 'Could not export the receipt. Please try again.');
    } finally {
      actionInProgress.current = false;
      setBusy('');
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onDone} accessibilityRole="button" accessibilityLabel="Back to payment history" hitSlop={12}>
          <Feather name="arrow-left" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Payment</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.confirmation}>
          <View style={styles.checkCircle}><Feather name="check" size={48} color="#1BC864" /></View>
          <Text style={styles.amount}>{formatPaymentAmount(receipt)}</Text>
          <Text style={styles.confirmed} accessibilityRole="header">Payment Confirmed</Text>
          <Text style={styles.session}>Your session with{'\n'}{receipt.tutorName}</Text>
          <Text style={styles.demo}>Demo confirmation · No money charged</Text>
        </View>
        <View style={styles.details}>
          {receiptRows(receipt).map(([label, value]) => (
            <View style={styles.row} key={label}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.halfButton, !!busy && styles.disabled]}
              disabled={!!busy} accessibilityRole="button" accessibilityLabel="Share receipt" onPress={() => receiptAction('share')}>
              {busy === 'share' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Share</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.halfButton, !!busy && styles.disabled]}
              disabled={!!busy} accessibilityRole="button" accessibilityLabel="Download PDF" onPress={() => receiptAction('pdf')}>
              {busy === 'pdf' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Download PDF</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} accessibilityRole="button" accessibilityLabel="Done" onPress={onDone}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
          {!!notice && <Text style={styles.notice} accessibilityRole="alert">{notice}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { flexGrow: 1, paddingBottom: 30 },
  confirmation: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 24, paddingBottom: 44 },
  checkCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#EEFDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  amount: { color: '#111111', fontSize: 23, fontWeight: '700', marginBottom: 4 },
  confirmed: { color: '#1BC864', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  session: { color: '#A4A4A4', fontSize: 14, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  demo: { color: '#89818D', backgroundColor: '#F7F3FF', borderRadius: 4, fontSize: 11, paddingHorizontal: 10, paddingVertical: 7, marginTop: 14, textAlign: 'center' },
  details: { borderTopWidth: 1, borderColor: '#E4E4E4', paddingHorizontal: 26, paddingTop: 5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, paddingVertical: 10, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#E4E4E4' },
  label: { color: '#111111', fontSize: 14, fontWeight: '600' },
  value: { flex: 1, textAlign: 'right', color: '#111111', fontSize: 14, fontWeight: '600' },
  actions: { paddingHorizontal: 28, paddingTop: 38, gap: 10 },
  buttonRow: { flexDirection: 'row', gap: 17 },
  button: { backgroundColor: '#530099', borderRadius: 3, paddingVertical: 11, alignItems: 'center', minHeight: 38 },
  halfButton: { flex: 1 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  notice: { color: '#572883', backgroundColor: '#F6F0FF', padding: 12, borderRadius: 5, fontSize: 12, lineHeight: 18 },
});
