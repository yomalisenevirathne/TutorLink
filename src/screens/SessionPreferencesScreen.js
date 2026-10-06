import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SessionPreferencesScreen({ navigation, currentBooking, getCapacityForSlot }) {
  const { year = 2026, month = 8, monthName = 'September', date = 15, slot = '6:00 PM' } = currentBooking || {};

  // REAL DYNAMIC CHECK: මේ දවසට සහ මේ වෙලාවට අදාළ capacity දත්ත ලබාගැනීම
  const cap = getCapacityForSlot ? getCapacityForSlot(year, month, date, slot) : {
    privateBooked: false,
    smallBookedCount: 0,
    largeBookedCount: 0,
  };

  const isPrivateDisabled = cap.privateBooked;
  const isSmallFull = cap.smallBookedCount >= 5;
  const isLargeFull = cap.largeBookedCount >= 10;

  const smallSeatsLeft = 5 - cap.smallBookedCount;
  const largeSeatsLeft = 10 - cap.largeBookedCount;

  // Default selection (කලින් එක full නම් Available එකක් තෝරාගනී)
  const [selectedMode, setSelectedMode] = useState('physical');
  const [selectedGroupSize, setSelectedGroupSize] = useState(() => {
    if (!isSmallFull) return 'small';
    if (!isPrivateDisabled) return 'private';
    if (!isLargeFull) return 'large';
    return null;
  });

  const handleContinue = () => {
    if (!selectedGroupSize) {
      Alert.alert('Selection Required', 'Please select an available group size.');
      return;
    }

    navigation?.navigate('BookingSummaryScreen', {
      selectedMode,
      selectedGroupSize,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Preferences</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="person-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date/Slot info pill */}
        <View style={styles.infoPill}>
          <Ionicons name="calendar-outline" size={16} color="#6A1B9A" />
          <Text style={styles.infoPillText}>
            Selected: {monthName} {date}, {year} at {slot}
          </Text>
        </View>

        {/* Section 1: Mode */}
        <Text style={styles.sectionHeading}>Select Mode</Text>

        <TouchableOpacity
          style={[styles.card, selectedMode === 'online' && styles.cardSelected]}
          onPress={() => setSelectedMode('online')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconBox}><Ionicons name="laptop-outline" size={24} color="#2563EB" /></View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Online Session</Text>
              <Text style={styles.cardSubtitle}>Join via Zoom/Google Meet links</Text>
            </View>
          </View>
          <View style={[styles.radioCircle, selectedMode === 'online' && styles.radioCircleSelected]}>
            {selectedMode === 'online' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, selectedMode === 'physical' && styles.cardSelected]}
          onPress={() => setSelectedMode('physical')}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconBox}><Ionicons name="business-outline" size={24} color="#6A1B9A" /></View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, selectedMode === 'physical' && styles.cardTitlePurple]}>
                Physical Session
              </Text>
              <Text style={styles.cardSubtitle}>At SLIIT Campus, Lab Room 401</Text>
            </View>
          </View>
          <View style={[styles.radioCircle, selectedMode === 'physical' && styles.radioCircleSelected]}>
            {selectedMode === 'physical' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Section 2: Group Size with Real Date/Slot Dynamic Logic */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Group Size</Text>

        {/* 1. 1-on-1 Private */}
        <TouchableOpacity
          disabled={isPrivateDisabled}
          style={[
            styles.card,
            selectedGroupSize === 'private' && styles.cardSelected,
            isPrivateDisabled && styles.disabledCard,
          ]}
          onPress={() => setSelectedGroupSize('private')}
        >
          <View style={styles.cardTextContainer}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, selectedGroupSize === 'private' && styles.cardTitlePurple, isPrivateDisabled && { color: '#9CA3AF' }]}>
                1-on-1 Private
              </Text>
              {isPrivateDisabled && (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Booked</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardSubtitle, isPrivateDisabled && { color: '#9CA3AF' }]}>
              {isPrivateDisabled ? 'Already booked by another student' : 'Personalized focused coaching • Rs. 1,200/hr'}
            </Text>
          </View>
          <View style={[styles.radioCircle, selectedGroupSize === 'private' && styles.radioCircleSelected, isPrivateDisabled && { borderColor: '#D1D5DB' }]}>
            {selectedGroupSize === 'private' && !isPrivateDisabled && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* 2. Small Group (2-5) */}
        <TouchableOpacity
          disabled={isSmallFull}
          style={[
            styles.card,
            selectedGroupSize === 'small' && styles.cardSelected,
            isSmallFull && styles.disabledCard,
          ]}
          onPress={() => setSelectedGroupSize('small')}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, selectedGroupSize === 'small' && styles.cardTitlePurple, isSmallFull && { color: '#9CA3AF' }]}>
                Small Group (2-5)
              </Text>
              {isSmallFull ? (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Fully Booked (5/5)</Text>
                </View>
              ) : (
                <View style={styles.seatsLeftBadge}>
                  <Text style={styles.seatsLeftText}>Seats Left: {smallSeatsLeft}/5</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardSubtitle, isSmallFull && { color: '#9CA3AF' }]}>
              Learn collaboratively with peers • Rs. 700/hr
            </Text>
            {!isSmallFull && (
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${(cap.smallBookedCount / 5) * 100}%` }]} />
              </View>
            )}
          </View>
          <View style={[styles.radioCircle, selectedGroupSize === 'small' && styles.radioCircleSelected, isSmallFull && { borderColor: '#D1D5DB' }, { marginLeft: 10 }]}>
            {selectedGroupSize === 'small' && !isSmallFull && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* 3. Large Group (6-10) */}
        <TouchableOpacity
          disabled={isLargeFull}
          style={[
            styles.card,
            selectedGroupSize === 'large' && styles.cardSelected,
            isLargeFull && styles.disabledCard,
          ]}
          onPress={() => setSelectedGroupSize('large')}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text style={[styles.cardTitle, selectedGroupSize === 'large' && styles.cardTitlePurple, isLargeFull && { color: '#9CA3AF' }]}>
                Large Group (6-10)
              </Text>
              {isLargeFull ? (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Fully Booked (10/10)</Text>
                </View>
              ) : (
                <View style={styles.seatsLeftBadge}>
                  <Text style={styles.seatsLeftText}>Seats Left: {largeSeatsLeft}/10</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardSubtitle, isLargeFull && { color: '#9CA3AF' }]}>
              Standard interactive seminar • Rs. 400/hr
            </Text>
            {!isLargeFull && (
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${(cap.largeBookedCount / 10) * 100}%` }]} />
              </View>
            )}
          </View>
          <View style={[styles.radioCircle, selectedGroupSize === 'large' && styles.radioCircleSelected, isLargeFull && { borderColor: '#D1D5DB' }, { marginLeft: 10 }]}>
            {selectedGroupSize === 'large' && !isLargeFull && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}><Ionicons name="home-outline" size={22} color="#1F2937" /><Text style={styles.navLabel}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="calendar" size={22} color="#D48B06" /><Text style={[styles.navLabel, { color: '#D48B06' }]}>Bookings</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="chatbubble-outline" size={22} color="#1F2937" /><Text style={styles.navLabel}>Messages</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="wallet-outline" size={22} color="#1F2937" /><Text style={styles.navLabel}>Payments</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Ionicons name="person-outline" size={22} color="#1F2937" /><Text style={styles.navLabel}>Account</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#6A1B9A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerIconBtn: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerRightIcons: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A1B9A',
    marginLeft: 6,
  },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardSelected: { borderColor: '#6A1B9A', backgroundColor: '#FAF5FF' },
  disabledCard: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', opacity: 0.6 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardTitlePurple: { color: '#6A1B9A' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: '#6A1B9A' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6A1B9A' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seatsLeftBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' },
  seatsLeftText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  fullyBookedBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fullyBookedText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  progressBarTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 10, width: '90%', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#D97706', borderRadius: 3 },
  continueBtn: { backgroundColor: '#D48B06', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: '#1F2937', marginTop: 3 },
});