import React, { useCallback, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { formatPaymentAmount } from '../data/paymentHistory';
import { saveDemoPayment } from '../services/demoPayments';

export default function PaymentProcessingScreen({ receipt, isDemo = false, onComplete, onBack }) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    if (error) return;
    let active = true;
    rotation.setValue(0);
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web',
    }));
    animation.start();
    const timer = setTimeout(async () => {
      try {
        const saved = await saveDemoPayment(receipt, { isDemo });
        if (active) onComplete(saved);
      } catch (failure) {
        if (active) setError(failure.message || 'Your payment history could not be saved. Please try again.');
      }
    }, 2800);
    return () => { active = false; clearTimeout(timer); animation.stop(); };
  }, [rotation, onComplete, receipt, isDemo, error]));

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.center}>
        {!error && <View accessibilityRole="progressbar" accessibilityLabel="Confirming demo payment" accessibilityState={{ busy: true }}>
          <Animated.View testID="payment-confirmation-spinner" style={[styles.ring, {
            transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          }]} />
        </View>}
        <Text style={styles.amount}>{formatPaymentAmount(receipt)}</Text>
        <Text style={styles.title} accessibilityRole="header">{error ? 'Payment history not saved' : 'Confirming your payment'}</Text>
        <View style={styles.tutorBadge}>
          <View style={styles.avatar}><Feather name="user" size={22} color="#530099" /></View>
          <Text style={styles.tutor}>Paying {receipt.tutorName}</Text>
        </View>
        {error ? <>
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
          <TouchableOpacity style={styles.retry} accessibilityRole="button" accessibilityLabel="Retry saving payment"
            onPress={() => setError('')}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to payment" onPress={onBack}>
            <Text style={styles.backText}>Back to payment</Text>
          </TouchableOpacity>
        </> : <Text style={styles.hint}>This usually takes just a{'\n'}few seconds</Text>}
      </View>
      <View style={styles.footer}>
        <Feather name="lock" size={13} color="#AAA4AD" />
        <Text style={styles.demo}>Demo payment · No money will be charged</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 75 },
  ring: { width: 86, height: 86, borderRadius: 43, borderWidth: 8, borderColor: '#C8C8C8', borderLeftColor: '#1BC864', borderBottomColor: '#1BC864', marginBottom: 14 },
  amount: { fontSize: 23, fontWeight: '700', color: '#111111', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#111111', textAlign: 'center', marginBottom: 12 },
  tutorBadge: { backgroundColor: '#530099', borderRadius: 4, padding: 5, paddingRight: 13, flexDirection: 'row', alignItems: 'center', gap: 11, maxWidth: '100%' },
  avatar: { width: 30, height: 30, borderRadius: 3, backgroundColor: '#EDE2FF', alignItems: 'center', justifyContent: 'center' },
  tutor: { flexShrink: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  hint: { color: '#A4A4A4', fontSize: 14, fontWeight: '600', lineHeight: 19, textAlign: 'center', marginTop: 13 },
  footer: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingBottom: 23 },
  demo: { flexShrink: 1, color: '#AAA4AD', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  error: { backgroundColor: '#FFF1F1', color: '#A33333', borderRadius: 5, padding: 12, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 18 },
  retry: { backgroundColor: '#530099', borderRadius: 3, paddingVertical: 12, paddingHorizontal: 30, marginTop: 16 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  backText: { color: '#530099', fontSize: 13, padding: 14 },
});
