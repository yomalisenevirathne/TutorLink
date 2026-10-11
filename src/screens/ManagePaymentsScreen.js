import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import SavedCardsManager from '../components/SavedCardsManager';

export default function ManagePaymentsScreen({ userId, isDemo, cardsVersion, onBack, onAddCard, onEditCard, onCardsChanged }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  return <SafeAreaView edges={['bottom']} style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to payment history">
        <Feather name="arrow-left" size={23} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Manage Payments</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={() => setRefreshVersion((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Refresh saved cards">
        <Feather name="refresh-cw" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}><Feather name="credit-card" size={20} color="#7100FF" /></View>
        <Text style={styles.sectionTitle} accessibilityRole="header">Saved Cards</Text>
      </View>
      <Text style={styles.description}>Edit your card details, remove a card, or add a new payment method.</Text>
      <SavedCardsManager userId={userId} isDemo={isDemo} cardsVersion={cardsVersion} refreshVersion={refreshVersion}
        onEdit={onEditCard} onChanged={onCardsChanged} />
    </ScrollView>
    <View style={styles.footer}>
      <TouchableOpacity style={styles.addButton} onPress={onAddCard} accessibilityRole="button" accessibilityLabel="Add New Card">
        <View style={styles.addIcon}><Feather name="plus" size={18} color="#FFFFFF" /></View>
        <Text style={styles.addText}>Add New Card</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8FD' },
  header: { minHeight: 76, backgroundColor: '#7100FF', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0px 6px 16px rgba(89, 27, 166, 0.14)' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.13)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, paddingTop: 28 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EEE5FA', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#2D203D', fontSize: 19, fontWeight: '700', letterSpacing: -0.4 },
  description: { color: '#8B7B99', fontSize: 13, lineHeight: 21, marginBottom: 24 },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, paddingTop: 16, backgroundColor: '#FAF8FD' },
  addButton: { minHeight: 54, borderRadius: 17, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7100FF', paddingVertical: 12, paddingHorizontal: 16, boxShadow: '0px 5px 12px rgba(113, 0, 255, 0.17)' },
  addIcon: { width: 26, height: 26, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.17)', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
