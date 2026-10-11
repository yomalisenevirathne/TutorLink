import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from 'expo-router';
import { formatPaymentAmount } from '../data/paymentHistory';
import { getSavedPaymentMethods, savedCardsErrorMessage } from '../services/paymentMethods';

const amountText = (amount) => formatPaymentAmount({ amount, currency: 'LKR' });

export default function PaymentScreen({ booking, userId, isDemo = false, cardsVersion = 0, onBack, onAddCard, onPay }) {
  const [notice, setNotice] = useState('');
  const [cardsState, setCardsState] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [reload, setReload] = useState(0);
  const openingPayment = useRef(false);
  useFocusEffect(useCallback(() => { openingPayment.current = false; }, []));
  const hasBooking = booking && Number.isFinite(booking.total) && booking.total > 0;
  const cardsLoading = !cardsState || cardsState.userId !== userId || cardsState.reload !== reload
    || cardsState.isDemo !== isDemo || cardsState.hasBooking !== hasBooking || cardsState.cardsVersion !== cardsVersion;
  const cards = cardsLoading ? [] : cardsState.cards;
  const cardsError = cardsLoading ? '' : cardsState.error;
  const selectedCard = cards.find((card) => card.id === selectedCardId);

  useEffect(() => {
    const controller = new AbortController();
    const request = !hasBooking ? Promise.resolve([])
      : getSavedPaymentMethods(userId, { signal: controller.signal, isDemo });
    request.then((saved) => {
      if (controller.signal.aborted) return;
      setCardsState({ userId, reload, isDemo, hasBooking, cardsVersion, cards: saved, error: '' });
      setSelectedCardId(saved[0]?.id ?? null);
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setCardsState({ userId, reload, isDemo, hasBooking, cardsVersion, cards: [], error: savedCardsErrorMessage(error) });
        setSelectedCardId(null);
      }
    });
    return () => controller.abort();
  }, [userId, isDemo, hasBooking, reload, cardsVersion]);
  const displayDate = hasBooking
    ? new Date(booking.year, booking.month, booking.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }) : '';

  const rows = hasBooking ? [
    ['Date', displayDate],
    ['Time', booking.slot],
    ['Tutor', booking.tutorName],
    ['Subject', booking.subject],
    ['Session Fee', amountText(booking.sessionFee)],
    ...(booking.platformFee > 0 ? [['Platform Fee', amountText(booking.platformFee)]] : []),
  ] : [];

  const handlePay = () => {
    if (!selectedCard || cardsLoading || cardsError || openingPayment.current) return;
    try {
      openingPayment.current = true;
      onPay(selectedCard);
    } catch (error) {
      openingPayment.current = false;
      setNotice(error.message || 'Could not open payment confirmation. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to booking summary">
          <Feather name="arrow-left" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Payment</Text>
      </View>

      {hasBooking ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Booking Details</Text>
            <View style={styles.detailsCard}>
              {rows.map(([label, value]) => (
                <View style={styles.detailRow} key={label}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>{amountText(booking.total)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, styles.methodTitle]} accessibilityRole="header">Payment Method</Text>
            {cardsLoading ? (
              <View style={styles.cardsState}><ActivityIndicator color="#7100FF" /><Text style={styles.cardsStateText}>Loading saved cards…</Text></View>
            ) : cardsError ? (
              <View style={styles.cardsState}>
                <Text style={styles.cardsStateText} accessibilityRole="alert">{cardsError}</Text>
                <TouchableOpacity onPress={() => setReload((value) => value + 1)} accessibilityRole="button"><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
              </View>
            ) : cards.length === 0 ? (
              <View style={styles.cardsState}>
                <Feather name="credit-card" size={24} color="#89818D" />
                <Text style={styles.noCardsTitle}>No saved cards</Text>
                <Text style={styles.cardsStateText}>Add a card to use for this payment.</Text>
              </View>
            ) : cards.map((card) => (
              <TouchableOpacity key={card.id} style={styles.cardMethod}
                onPress={() => { setSelectedCardId(card.id); setNotice(''); }}
                accessibilityRole="radio" accessibilityState={{ checked: selectedCardId === card.id }}
                accessibilityLabel={`${card.brand} card ending in ${card.last4}, expires ${card.expiry}`}>
                <View style={styles.visaBadge}><Text style={styles.visaText}>{card.brand.toUpperCase()}</Text></View>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardNumber}>{card.brand}  • • •  {card.last4}</Text>
                  <Text style={styles.cardExpiry}>Expires {card.expiry}</Text>
                </View>
                <View style={styles.radioOuter}>{selectedCardId === card.id && <View style={styles.radioInner} />}</View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addCard}
              accessibilityRole="button"
              accessibilityLabel="Add New Card"
              onPress={onAddCard}
            >
              <View style={styles.addIcon}><Feather name="plus" size={20} color="#111111" /></View>
              <Text style={styles.addText}>Add New Card</Text>
            </TouchableOpacity>
            {!!notice && <Text style={styles.notice} accessibilityRole="alert">{notice}</Text>}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.demoNote}>Demo payment · No money will be charged</Text>
            <TouchableOpacity
              style={[styles.payButton, (!selectedCard || cardsLoading || !!cardsError) && styles.disabledPayButton]}
              disabled={!selectedCard || cardsLoading || !!cardsError}
              accessibilityRole="button"
              accessibilityLabel={`Pay ${amountText(booking.total)}`}
              onPress={handlePay}
            >
              <Text style={styles.payText}>Pay {amountText(booking.total)}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Choose a booking first</Text>
          <Text style={styles.emptyText}>Open Payment from your booking summary to see your session details.</Text>
          <TouchableOpacity style={styles.payButton} onPress={onBack} accessibilityRole="button">
            <Text style={styles.payText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18, gap: 16,
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111111', marginBottom: 12 },
  detailsCard: {
    borderWidth: 1, borderColor: '#EEE7FA', borderRadius: 3, paddingHorizontal: 10,
    paddingVertical: 5, shadowColor: '#7100FF', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 2, elevation: 1,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, paddingVertical: 9 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#111111' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: '#111111' },
  totalRow: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#CACACA', marginTop: 4, marginBottom: 5 },
  methodTitle: { marginTop: 35, marginBottom: 8, fontSize: 15 },
  cardMethod: {
    flexDirection: 'row', alignItems: 'center', gap: 18, borderWidth: 1,
    borderColor: '#383838', borderRadius: 3, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 9,
  },
  visaBadge: { backgroundColor: '#1465CA', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 7 },
  visaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', fontStyle: 'italic' },
  cardDetails: { flex: 1 },
  cardNumber: { color: '#111111', fontSize: 14, fontWeight: '700' },
  cardExpiry: { color: '#A4A4A4', fontSize: 14, fontWeight: '600', marginTop: 6 },
  radioOuter: { width: 24, height: 24, borderWidth: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#111111' },
  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 25, borderWidth: 1,
    borderStyle: 'dashed', borderColor: '#BDBDBD', borderRadius: 3,
    marginTop: 9, paddingHorizontal: 18, paddingVertical: 13,
  },
  addIcon: { width: 42, height: 32, borderWidth: 1, borderStyle: 'dashed', borderColor: '#BDBDBD', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 14, fontWeight: '600', color: '#111111' },
  cardsState: { padding: 18, borderWidth: 1, borderColor: '#EEE7FA', borderRadius: 5, alignItems: 'center', gap: 9 },
  cardsStateText: { fontSize: 13, color: '#89818D', lineHeight: 20, textAlign: 'center' },
  noCardsTitle: { fontSize: 15, fontWeight: '600', color: '#4B4256' },
  retryText: { fontSize: 13, fontWeight: '600', color: '#7100FF', padding: 7 },
  notice: { fontSize: 13, color: '#572883', lineHeight: 20, backgroundColor: '#F6F0FF', padding: 12, marginTop: 16, borderRadius: 5 },
  footer: { paddingHorizontal: 27, paddingBottom: 22, paddingTop: 12 },
  demoNote: { color: '#89818D', fontSize: 11, textAlign: 'center', marginBottom: 9 },
  payButton: { backgroundColor: '#530099', borderRadius: 3, paddingVertical: 12, alignItems: 'center' },
  disabledPayButton: { backgroundColor: '#B9ADC4' },
  payText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', padding: 28, gap: 18 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111111' },
  emptyText: { fontSize: 14, lineHeight: 22, color: '#6B6470' },
});
