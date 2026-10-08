import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import SavedPaymentMethodsList from './SavedPaymentMethodsList';
import useSavedPaymentMethods from '../hooks/useSavedPaymentMethods';

export default function PaymentSettingsDrawer({ userId, isDemo, cardsVersion, onClose, onManagePayments, onAddCard }) {
  const { cards, loading, error, refresh } = useSavedPaymentMethods(userId, isDemo, cardsVersion);
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(680, height * 0.85);
  const [slide] = useState(() => new Animated.Value(sheetHeight));

  useEffect(() => {
    const animation = Animated.timing(slide, {
      toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [slide]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}
        accessibilityRole="button" accessibilityLabel="Dismiss payment settings" />
      <Animated.View style={[styles.panel, { height: sheetHeight, transform: [{ translateY: slide }] }]}
        accessibilityViewIsModal accessibilityLabel="Payment settings drawer">
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Feather name="settings" size={22} color="#530099" />
            <Text style={styles.title} accessibilityRole="header">Payment Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}
              accessibilityRole="button" accessibilityLabel="Close payment settings">
              <Feather name="x" size={22} color="#35263F" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Saved Cards</Text>
            <Text style={styles.description}>Your saved payment methods</Text>
            <SavedPaymentMethodsList cards={cards} loading={loading} error={error} onRetry={refresh} />
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.manageButton} onPress={onManagePayments} accessibilityRole="button" accessibilityLabel="Manage Payments">
              <Feather name="credit-card" size={19} color="#530099" />
              <Text style={styles.manageText}>Manage Payments</Text>
              <Feather name="chevron-right" size={18} color="#530099" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={onAddCard} accessibilityRole="button" accessibilityLabel="Add New Card">
              <Feather name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addText}>Add New Card</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20, 8, 35, 0.42)', justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  panel: { width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', boxShadow: '0px -5px 20px rgba(20, 8, 35, 0.12)' },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#D7CCDF', alignSelf: 'center', marginTop: 10 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderColor: '#EEE7F5' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#35263F' },
  closeButton: { padding: 4 },
  content: { padding: 20, gap: 10 },
  sectionTitle: { color: '#211329', fontSize: 17, fontWeight: '700' },
  description: { color: '#89818D', fontSize: 12, marginBottom: 12 },
  actions: { padding: 20, gap: 12, borderTopWidth: 1, borderColor: '#EEE7F5' },
  manageButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#D6BEEB', borderRadius: 7, paddingHorizontal: 14 },
  manageText: { flex: 1, color: '#530099', fontSize: 14, fontWeight: '700' },
  addButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#530099', borderRadius: 7, paddingHorizontal: 14 },
  addText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
