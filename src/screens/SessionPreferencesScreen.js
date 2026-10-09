import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchCapacityForSlot } from '../bookingService';

export default function SessionPreferencesScreen({
  navigation,
  currentBooking,
  getCapacityForSlot,
}) {
  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth(),
    monthName = 'September',
    date = new Date().getDate(),
    slot = '6:00 PM',
  } = currentBooking || {};

  // Live Supabase capacity state
  const [dbCapacity, setDbCapacity] = useState({
    privateBooked: false,
    smallBookedCount: 0,
    largeBookedCount: 0,
  });
  const [loadingCapacity, setLoadingCapacity] = useState(true);

  // Fetch live Supabase queries for chosen date and slot
  useEffect(() => {
    let isMounted = true;
    const loadLiveCapacity = async () => {
      setLoadingCapacity(true);
      try {
        const liveCap = await fetchCapacityForSlot(year, month, date, slot);
        if (isMounted && liveCap) {
          setDbCapacity(liveCap);
        }
      } catch (err) {
        console.error('Error fetching slot capacity:', err);
      } finally {
        if (isMounted) {
          setLoadingCapacity(false);
        }
      }
    };

    loadLiveCapacity();
    return () => {
      isMounted = false;
    };
  }, [year, month, date, slot]);

  // Combine with in-memory local state
  const localCap = getCapacityForSlot
    ? getCapacityForSlot(year, month, date, slot)
    : { privateBooked: false, smallBookedCount: 0, largeBookedCount: 0 };

  const isPrivateDisabled = dbCapacity.privateBooked || localCap.privateBooked;
  const smallCount = Math.max(dbCapacity.smallBookedCount, localCap.smallBookedCount);
  const largeCount = Math.max(dbCapacity.largeBookedCount, localCap.largeBookedCount);

  const smallSeatsLeft = Math.max(0, 5 - smallCount);
  const isSmallFull = smallSeatsLeft === 0;

  const largeSeatsLeft = Math.max(0, 10 - largeCount);
  const isLargeFull = largeSeatsLeft === 0;

  const [selectedMode, setSelectedMode] = useState(currentBooking?.mode || 'physical');
  const [selectedGroupSize, setSelectedGroupSize] = useState(() => {
    if (!isSmallFull) return 'small';
    if (!isPrivateDisabled) return 'private';
    if (!isLargeFull) return 'large';
    return null;
  });

  // Adjust selection if currently selected group size is locked
  useEffect(() => {
    if (selectedGroupSize === 'private' && isPrivateDisabled) {
      if (!isSmallFull) setSelectedGroupSize('small');
      else if (!isLargeFull) setSelectedGroupSize('large');
      else setSelectedGroupSize(null);
    } else if (selectedGroupSize === 'small' && isSmallFull) {
      if (!isPrivateDisabled) setSelectedGroupSize('private');
      else if (!isLargeFull) setSelectedGroupSize('large');
      else setSelectedGroupSize(null);
    } else if (selectedGroupSize === 'large' && isLargeFull) {
      if (!isSmallFull) setSelectedGroupSize('small');
      else if (!isPrivateDisabled) setSelectedGroupSize('private');
      else setSelectedGroupSize(null);
    }
  }, [isPrivateDisabled, isSmallFull, isLargeFull]);

  const handleContinue = () => {
    if (!selectedGroupSize) {
      Alert.alert('Selection Required', 'Please select an available group size.');
      return;
    }

    if (selectedGroupSize === 'private' && isPrivateDisabled) {
      Alert.alert('Unavailable', '1-on-1 Private is already booked for this slot.');
      return;
    }

    if (selectedGroupSize === 'small' && isSmallFull) {
      Alert.alert('Fully Booked', 'Small Group is fully booked for this slot.');
      return;
    }

    if (selectedGroupSize === 'large' && isLargeFull) {
      Alert.alert('Fully Booked', 'Large Group is fully booked for this slot.');
      return;
    }

    navigation?.navigate('BookingSummaryScreen', {
      mode: selectedMode,
      groupSize: selectedGroupSize,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Preferences</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('studentProfile')}>
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
          {loadingCapacity && (
            <ActivityIndicator size="small" color="#6A1B9A" style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Section 1: Mode */}
        <Text style={styles.sectionHeading}>Select Mode</Text>

        <TouchableOpacity
          style={[styles.card, selectedMode === 'online' && styles.cardSelected]}
          onPress={() => setSelectedMode('online')}
          activeOpacity={0.8}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="laptop-outline" size={24} color="#2563EB" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Online Session</Text>
              <Text style={styles.cardSubtitle}>Join via Zoom/Google Meet links</Text>
            </View>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedMode === 'online' && styles.radioCircleSelected,
            ]}
          >
            {selectedMode === 'online' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, selectedMode === 'physical' && styles.cardSelected]}
          onPress={() => setSelectedMode('physical')}
          activeOpacity={0.8}
        >
          <View style={styles.cardLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="business-outline" size={24} color="#6A1B9A" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text
                style={[
                  styles.cardTitle,
                  selectedMode === 'physical' && styles.cardTitlePurple,
                ]}
              >
                Physical Session
              </Text>
              <Text style={styles.cardSubtitle}>At SLIIT Campus, Lab Room 401</Text>
            </View>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedMode === 'physical' && styles.radioCircleSelected,
            ]}
          >
            {selectedMode === 'physical' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* Section 2: Group Size with Live Supabase Capacity & Locking */}
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
          activeOpacity={0.8}
        >
          <View style={styles.cardTextContainer}>
            <View style={styles.badgeRow}>
              <Text
                style={[
                  styles.cardTitle,
                  selectedGroupSize === 'private' && styles.cardTitlePurple,
                  isPrivateDisabled && { color: '#9CA3AF' },
                ]}
              >
                1-on-1 Private
              </Text>
              {isPrivateDisabled && (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Booked / Unavailable</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.cardSubtitle,
                isPrivateDisabled && { color: '#9CA3AF' },
              ]}
            >
              {isPrivateDisabled
                ? 'Already booked by another student'
                : 'Personalized focused coaching • Rs. 1,200/hr'}
            </Text>
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedGroupSize === 'private' && styles.radioCircleSelected,
              isPrivateDisabled && { borderColor: '#D1D5DB' },
              { marginLeft: 10 },
            ]}
          >
            {selectedGroupSize === 'private' && !isPrivateDisabled && (
              <View style={styles.radioDot} />
            )}
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
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text
                style={[
                  styles.cardTitle,
                  selectedGroupSize === 'small' && styles.cardTitlePurple,
                  isSmallFull && { color: '#9CA3AF' },
                ]}
              >
                Small Group (2-5)
              </Text>
              {isSmallFull ? (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Fully Booked (0/5)</Text>
                </View>
              ) : (
                <View style={styles.seatsLeftBadge}>
                  <Text style={styles.seatsLeftText}>
                    Seats Left: {smallSeatsLeft}/5
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.cardSubtitle,
                isSmallFull && { color: '#9CA3AF' },
              ]}
            >
              Learn collaboratively with peers • Rs. 700/hr
            </Text>
            {!isSmallFull && (
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(smallCount / 5) * 100}%` },
                  ]}
                />
              </View>
            )}
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedGroupSize === 'small' && styles.radioCircleSelected,
              isSmallFull && { borderColor: '#D1D5DB' },
              { marginLeft: 10 },
            ]}
          >
            {selectedGroupSize === 'small' && !isSmallFull && (
              <View style={styles.radioDot} />
            )}
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
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text
                style={[
                  styles.cardTitle,
                  selectedGroupSize === 'large' && styles.cardTitlePurple,
                  isLargeFull && { color: '#9CA3AF' },
                ]}
              >
                Large Group (6-10)
              </Text>
              {isLargeFull ? (
                <View style={styles.fullyBookedBadge}>
                  <Text style={styles.fullyBookedText}>Fully Booked (0/10)</Text>
                </View>
              ) : (
                <View style={styles.seatsLeftBadge}>
                  <Text style={styles.seatsLeftText}>
                    Seats Left: {largeSeatsLeft}/10
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.cardSubtitle,
                isLargeFull && { color: '#9CA3AF' },
              ]}
            >
              Standard interactive seminar • Rs. 400/hr
            </Text>
            {!isLargeFull && (
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(largeCount / 10) * 100}%` },
                  ]}
                />
              </View>
            )}
          </View>
          <View
            style={[
              styles.radioCircle,
              selectedGroupSize === 'large' && styles.radioCircleSelected,
              isLargeFull && { borderColor: '#D1D5DB' },
              { marginLeft: 10 },
            ]}
          >
            {selectedGroupSize === 'large' && !isLargeFull && (
              <View style={styles.radioDot} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#6A1B9A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: { borderColor: '#6A1B9A', backgroundColor: '#FAF5FF' },
  disabledCard: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', opacity: 0.6 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardTitlePurple: { color: '#6A1B9A' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: '#6A1B9A' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6A1B9A' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seatsLeftBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  seatsLeftText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  fullyBookedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullyBookedText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 10,
    width: '90%',
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#D97706', borderRadius: 3 },
  continueBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: '#1F2937', marginTop: 3 },
});