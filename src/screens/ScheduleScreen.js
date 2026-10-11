import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

export default function ScheduleScreen({
  navigation,
  currentBooking,
  currentUser,
}) {
  const accountScreen = String(currentUser?.role || '').trim().toLowerCase() === 'tutor'
    ? 'tutorProfile' : 'studentProfile';
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(
    currentBooking?.year || now.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    currentBooking?.month !== undefined ? currentBooking?.month : now.getMonth()
  );
  const [selectedDay, setSelectedDay] = useState(
    currentBooking?.date || now.getDate()
  );
  const [selectedSlot, setSelectedSlot] = useState(null);

  const currentTutorName = currentBooking?.tutorName || currentBooking?.tutor_name || currentBooking?.tutor?.name || '';
  const [sessionsResult, setSessionsResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const requestKey = `${currentTutorName}:${currentYear}:${currentMonth}:${retry}`;
  const loadingSlots = sessionsResult?.key !== requestKey;
  const loadError = loadingSlots ? '' : sessionsResult.error;
  const sessions = loadingSlots ? [] : sessionsResult.sessions;
  const activeSessionDates = [...new Set(sessions.filter((session) => session.slots?.length)
    .map((session) => Number(session.date)))];
  const daySessions = sessions.filter((session) => Number(session.date) === selectedDay);
  const availableSlots = [...new Set(daySessions.flatMap((session) => Array.isArray(session.slots) ? session.slots : []))];
  const validSlot = availableSlots.includes(selectedSlot) ? selectedSlot : null;
  const selectedSession = daySessions.find((session) => session.slots?.includes(validSlot));

  useFocusEffect(useCallback(() => {
    let active = true;
    setSessionsResult(null);
    setSelectedSlot(null);
    const load = async () => {
      try {
        if (!currentTutorName) throw new Error('Choose a tutor from Home before selecting a session.');
        const { data, error } = await supabase.from('tutor_sessions').select('*')
          .eq('year', Number(currentYear)).eq('month', Number(currentMonth) + 1)
          .eq('is_accepting_bookings', true);
        if (error) throw error;
        const matches = (data || []).filter((session) =>
          String(session.tutor_name || '').trim().toLowerCase() === currentTutorName.trim().toLowerCase());
        if (active) setSessionsResult({ key: requestKey, sessions: matches, error: '' });
      } catch (error) {
        if (active) setSessionsResult({ key: requestKey, sessions: [], error: error.message || 'Unable to load sessions. Please try again.' });
      }
    };
    load();
    return () => { active = false; };
  }, [currentTutorName, currentYear, currentMonth, requestKey]));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const isPastDate = (year, month, day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(year, month, day);
    return cellDate < today;
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDayIndex + 6) % 7;

  const handlePrevMonth = () => {
    let nextMonth = currentMonth - 1;
    let nextYear = currentYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear = currentYear - 1;
    }
    setSelectedSlot(null);
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);

    const today = new Date();
    if (nextYear === today.getFullYear() && nextMonth === today.getMonth()) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(null);
    }
  };

  const handleNextMonth = () => {
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = currentYear + 1;
    }
    setSelectedSlot(null);
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);

    const today = new Date();
    if (nextYear === today.getFullYear() && nextMonth === today.getMonth()) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(null);
    }
  };

  const handleContinue = () => {
    if (!selectedDay) {
      Alert.alert('Date Required', 'Please select a date from the calendar.');
      return;
    }
    if (isPastDate(currentYear, currentMonth, selectedDay)) {
      Alert.alert('Invalid Date', 'You cannot select a past date.');
      return;
    }
    if (loadingSlots || loadError || !validSlot || !selectedSession) {
      Alert.alert('Slot Required', 'Please select an available time slot.');
      return;
    }

    navigation?.navigate('SessionPreferencesScreen', {
      year: currentYear,
      month: currentMonth,
      monthName: monthNames[currentMonth],
      date: selectedDay,
      slot: validSlot,
      sessionId: selectedSession.id,
      sessionFee: Number(selectedSession.fee),
      venue: selectedSession.venue,
      mode: selectedSession.mode,
      maxCapacity: Number(selectedSession.max_capacity),
      subject: selectedSession.course_title,
      tutorName: currentTutorName,
      tutor: currentBooking?.tutor,
    });
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack ? navigation.goBack() : navigation?.navigate(accountScreen)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Selection</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate(accountScreen)}>
            <Ionicons name="person-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Tutor Banner */}
        <View style={styles.tutorBanner}>
          <Ionicons name="school" size={16} color="#6A1B9A" style={{ marginRight: 6 }} />
          <Text style={styles.tutorBannerText}>Booking with: <Text style={{ fontWeight: '800' }}>{currentTutorName}</Text></Text>
        </View>

        <Text style={styles.sectionHeading}>Select Date</Text>

        {activeSessionDates.length > 0 && (
          <View style={styles.legendIndicatorRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Available Classes for {currentTutorName}</Text>
          </View>
        )}

        {/* Real Interactive Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={20} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={{ marginLeft: 20 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysRow}>
            {daysOfWeek.map((day, idx) => (
              <View key={idx} style={styles.dayCol}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.datesGrid}>
            {Array.from({ length: startOffset }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.dateCol} />
            ))}
            {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map((day) => {
              const isSelected = selectedDay === day;
              const isPast = isPastDate(currentYear, currentMonth, day);
              const hasSession = activeSessionDates.includes(day);

              return (
                <View key={day} style={styles.dateCol}>
                  <TouchableOpacity
                    disabled={isPast}
                    style={[
                      styles.dateCell,
                      isSelected && !isPast && styles.selectedDateCell,
                      isPast && styles.disabledDateCell,
                      hasSession && !isSelected && !isPast && styles.sessionAccentCell,
                    ]}
                    onPress={() => { setSelectedSlot(null); setSelectedDay(day); }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        isSelected && !isPast && styles.selectedDateText,
                        isPast && styles.disabledDateText,
                        hasSession && !isSelected && !isPast && styles.sessionDateText,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasSession && !isPast && (
                      <View
                        style={[
                          styles.sessionDot,
                          isSelected && styles.sessionDotSelected,
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Available Time Slots Section (Dynamic from Database) */}
        <Text style={[styles.sectionHeading, { marginTop: 22 }]}>Available Time Slots</Text>

        {loadingSlots ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6A1B9A" />
            <Text style={styles.loadingText}>Loading available slots...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptySlotCard}>
            <Text style={styles.emptySlotText} accessibilityRole="alert">{loadError}</Text>
            <TouchableOpacity onPress={() => setRetry((value) => value + 1)} accessibilityRole="button">
              <Text style={styles.monthTitle}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : availableSlots.length > 0 ? (
          <View style={styles.slotRow}>
            {availableSlots.map((time) => {
              const isSelected = validSlot === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.slotButton,
                    isSelected && styles.selectedSlotButton,
                  ]}
                  onPress={() => setSelectedSlot(time)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.slotText,
                      isSelected && styles.selectedSlotText,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySlotCard}>
            <Ionicons name="calendar-outline" size={24} color="#9CA3AF" style={{ marginBottom: 4 }} />
            <Text style={styles.emptySlotText}>No time slots configured by {currentTutorName} for this date.</Text>
          </View>
        )}

        {/* Primary Continue Button */}
        <TouchableOpacity
          style={[styles.continueBtn, (loadingSlots || !!loadError || !validSlot) && { opacity: 0.5 }]}
          disabled={loadingSlots || !!loadError || !validSlot}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>

        {/* Secondary Go to My Bookings Button */}
        <TouchableOpacity
          style={styles.myBookingsBtn}
          onPress={() => navigation?.navigate('MyBookingsScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.myBookingsBtnText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  tutorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tutorBannerText: {
    fontSize: 13,
    color: '#6A1B9A',
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 10,
  },
  legendIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6A1B9A',
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#6A1B9A' },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  daysRow: { flexDirection: 'row', marginBottom: 10 },
  dayCol: { width: '14.28%', alignItems: 'center' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCol: { width: '14.28%', alignItems: 'center', marginVertical: 4 },
  dateCell: {
    width: 36,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedDateCell: { backgroundColor: '#6A1B9A' },
  sessionAccentCell: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  disabledDateCell: { opacity: 0.4, backgroundColor: '#F8FAFC' },
  dateText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  sessionDateText: { color: '#6A1B9A', fontWeight: '700' },
  selectedDateText: { color: '#FFFFFF', fontWeight: '700' },
  disabledDateText: { color: '#CBD5E1' },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6A1B9A',
    marginTop: 2,
  },
  sessionDotSelected: { backgroundColor: '#FFFFFF' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotButton: {
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  selectedSlotButton: { backgroundColor: '#6A1B9A' },
  slotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  selectedSlotText: { color: '#FFFFFF' },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptySlotCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  myBookingsBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  myBookingsBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
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
