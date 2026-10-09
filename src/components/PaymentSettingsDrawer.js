import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import SavedPaymentMethodsList from './SavedPaymentMethodsList';
import useSavedPaymentMethods from '../hooks/useSavedPaymentMethods';

export default function PaymentSettingsDrawer({ userId, isDemo, cardsVersion, onClose, onManagePayments, onAddCard }) {
  const { cards, loading, error, refresh } = useSavedPaymentMethods(userId, isDemo, cardsVersion);
  const { height } = useWindowDimensions();
  const visibleCardCount = loading || error ? 2 : Math.max(cards.length, 1);
  const sheetHeight = Math.min(680, height * 0.85, 332 + visibleCardCount * 108);
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
            <View style={styles.headerIcon}>
              <Feather name="settings" size={23} color="#7100FF" />
            </View>
            <View style={styles.heading}>
              <Text style={styles.title} accessibilityRole="header">Payment Settings</Text>
              <Text style={styles.subtitle}>Your payment preferences</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}
              accessibilityRole="button" accessibilityLabel="Close payment settings">
              <Feather name="x" size={20} color="#756583" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Saved Cards</Text>
              {!loading && !error && (
                <View style={styles.countBadge} accessibilityLabel={`${cards.length} saved ${cards.length === 1 ? 'card' : 'cards'}`}>
                  <Text style={styles.countText}>{cards.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>Your saved payment methods</Text>
            <SavedPaymentMethodsList cards={cards} loading={loading} error={error} onRetry={refresh} variant="settings" />
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.manageButton} onPress={onManagePayments} accessibilityRole="button" accessibilityLabel="Manage Payments">
              <View style={styles.manageIcon}><Feather name="credit-card" size={19} color="#7100FF" /></View>
              <Text style={styles.manageText}>Manage Payments</Text>
              <Feather name="chevron-right" size={19} color="#7100FF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={onAddCard} accessibilityRole="button" accessibilityLabel="Add New Card">
              <View style={styles.addIcon}><Feather name="plus" size={18} color="#FFFFFF" /></View>
              <Text style={styles.addText}>Add New Card</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24, 12, 40, 0.46)', justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  panel: { width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', boxShadow: '0px -8px 32px rgba(24, 12, 40, 0.16)' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD2EA', alignSelf: 'center', marginTop: 12 },
  safeArea: { flex: 1 },
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  headerIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E8FF', borderWidth: 1, borderColor: '#E8D9FC' },
  heading: { flex: 1, minWidth: 0, gap: 5 },
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5, color: '#2D203D' },
  subtitle: { fontSize: 11, lineHeight: 16, color: '#8B7B99' },
  closeButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F2FA' },
  scrollArea: { flex: 1, backgroundColor: '#FAF8FD', borderTopWidth: 1, borderColor: '#F1EBF7' },
  content: { padding: 20, paddingBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 },
  sectionTitle: { color: '#35263F', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  countBadge: { minWidth: 24, minHeight: 24, paddingHorizontal: 7, borderRadius: 8, backgroundColor: '#EEE5FA', alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#7B49BE', fontSize: 11, fontWeight: '700' },
  description: { color: '#8B7B99', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  actions: { flexShrink: 0, padding: 20, paddingTop: 18, gap: 12, borderTopWidth: 1, borderColor: '#F0EAF6', backgroundColor: '#FFFFFF' },
  manageButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E7DAF7', backgroundColor: '#FAF7FF', borderRadius: 17, paddingHorizontal: 14, paddingVertical: 8 },
  manageIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EEE4FF', alignItems: 'center', justifyContent: 'center' },
  manageText: { flex: 1, color: '#6930B5', fontSize: 14, fontWeight: '700' },
  addButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7100FF', borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10, boxShadow: '0px 5px 12px rgba(113, 0, 255, 0.17)' },
  addIcon: { width: 26, height: 26, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.17)', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
