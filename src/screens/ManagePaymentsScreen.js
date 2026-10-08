import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import SavedCardsManager from '../components/SavedCardsManager';

export default function ManagePaymentsScreen({ userId, isDemo, cardsVersion, onBack, onAddCard, onEditCard, onCardsChanged }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  return <SafeAreaView edges={['bottom']} style={styles.screen}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to payment history" hitSlop={10}>
        <Feather name="arrow-left" size={23} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">Manage Payments</Text>
      <TouchableOpacity onPress={() => setRefreshVersion((value) => value + 1)} accessibilityRole="button" accessibilityLabel="Refresh saved cards" hitSlop={10}>
        <Feather name="refresh-cw" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Saved Cards</Text>
      <Text style={styles.description}>Edit your card details, remove a card, or add a new payment method.</Text>
      <SavedCardsManager userId={userId} isDemo={isDemo} cardsVersion={cardsVersion} refreshVersion={refreshVersion}
        onEdit={onEditCard} onChanged={onCardsChanged} />
    </ScrollView>
    <View style={styles.footer}>
      <TouchableOpacity style={styles.addButton} onPress={onAddCard} accessibilityRole="button" accessibilityLabel="Add New Card">
        <Feather name="plus" size={20} color="#FFFFFF" /><Text style={styles.addText}>Add New Card</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#7100FF', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 24, gap: 12 },
  sectionTitle: { color: '#211329', fontSize: 19, fontWeight: '700' },
  description: { color: '#89818D', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  footer: { padding: 24 },
  addButton: { minHeight: 48, borderRadius: 7, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#530099' },
  addText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
