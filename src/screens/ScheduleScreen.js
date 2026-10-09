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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchActiveTutorSessionDates } from '../bookingService';

export default function ScheduleScreen({
  navigation,
  currentBooking,
  getCapacityForSlot,
  currentUser,
}) {
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
  const [selectedSlot, setSelectedSlot] = useState(
    currentBooking?.slot || '6:00 PM'
  );

  // Active tutor sessions from Database
  const [activeSessionDates, setActiveSessionDates] = useState([]);

  // 💡 SECRET DOUBLE-TAP LOGIC: Header title එක 2 පාරක් tap කරද්දී ManageSessionScreen එකට යයි
  const [lastTap, setLastTap] = useState(0);
  const handleHeaderDoubleTap = () => {
    const currentTime = Date.now();
    if (currentTime - lastTap < 400) {
      navigation?.navigate('ManageSessionScreen');
    } else {
      setLastTap(currentTime);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadSessionDates = async () => {
      try {
        if (fetchActiveTutorSessionDates) {
          const dates = await fetchActiveTutorSessionDates(currentYear, currentMonth + 1);
          if (isMounted) {
            setActiveSessionDates(dates || []);
          }
        }
      } catch (e) {
        console.log('Error loading tutor session dates:', e);
        if (isMounted) {
          setActiveSessionDates([]);
        }
      }
    };
    loadSessionDates();
    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth]);

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
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);

    const today = new Date();
    if (nextYear === today.getFullYear() && nextMonth === today.getMonth()) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(null);
    }
  };

  const morningTimes = ['8:00 AM', '9:00 AM', '10:00 AM'];
  const afternoonTimes = ['1:00 PM', '2:00 PM', '3:00 PM'];
  const eveningTimes = ['5:00 PM', '6:00 PM', '7:00 PM'];

  const checkSlotStatus = (time) => {
    if (!selectedDay || !getCapacityForSlot) return { isBooked: false };
    const cap = getCapacityForSlot(currentYear, currentMonth, selectedDay, time);
    const isBooked = cap.privateBooked || (cap.smallBookedCount >= 5 && cap.largeBookedCount >= 10);
    return { isBooked };
  };

  const handleSlotSelect = (time, isBooked) => {
    if (!isBooked) {
      setSelectedSlot(time);
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
    if (!selectedSlot) {
      Alert.alert('Slot Required', 'Please select a time slot.');
      return;
    }

    navigation?.navigate('SessionPreferencesScreen', {
      year: currentYear,
      month: currentMonth,
      monthName: monthNames[currentMonth],
      date: selectedDay,
      slot: selectedSlot,
    });
  };

  const renderSlotButton = (time) => {
    const { isBooked } = checkSlotStatus(time);
    const isSelected = selectedSlot === time;

    return (
      <TouchableOpacity
        key={time}
        disabled={isBooked}
        style={[
          styles.slotButton,
          isBooked && styles.bookedSlotButton,
          isSelected && !isBooked && styles.selectedSlotButton,
        ]}
        onPress={() => handleSlotSelect(time, isBooked)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.slotText,
            isBooked && styles.bookedSlotText,
            isSelected && !isBooked && styles.selectedSlotText,
          ]}
        >
          {isBooked ? `${time} (Booked)` : time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack ? navigation.goBack() : navigation?.navigate('studentProfile')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 💡 SECRET DOUBLE-TAP TITLE (Double-tap to open ManageSessionScreen) */}
        <TouchableOpacity onPress={handleHeaderDoubleTap} activeOpacity={0.85}>
          <Text style={styles.headerTitle}>Schedule Selection</Text>
        </TouchableOpacity>

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
        <Text style={styles.sectionHeading}>Select Date</Text>

        {/* Legend: Available Classes (Only if database has sessions) */}
        {activeSessionDates.length > 0 && (
          <View style={styles.legendIndicatorRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Available Classes</Text>
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
                    onPress={() => setSelectedDay(day)}
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

        {/* Available Time Slots Section */}
        <Text style={[styles.sectionHeading, { marginTop: 22 }]}>Available Time Slots</Text>

        <Text style={styles.slotGroupTitle}>Morning</Text>
        <View style={styles.slotRow}>{morningTimes.map(renderSlotButton)}</View>

        <Text style={styles.slotGroupTitle}>Afternoon</Text>
        <View style={styles.slotRow}>{afternoonTimes.map(renderSlotButton)}</View>

        <Text style={styles.slotGroupTitle}>Evening</Text>
        <View style={styles.slotRow}>{eveningTimes.map(renderSlotButton)}</View>

        {/* Primary Continue Button */}
        <TouchableOpacity
          style={styles.continueBtn}
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

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('studentProfile')}
        >
          <Ionicons name="home-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('ScheduleScreen')}
        >
          <Ionicons name="calendar" size={22} color="#D48B06" />
          <Text style={[styles.navLabel, { color: '#D48B06' }]}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="chatbubble-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="wallet-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('studentProfile')}
        >
          <Ionicons name="person-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
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
  slotGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 10,
    marginBottom: 6,
  },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotButton: {
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 95,
  },
  bookedSlotButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSlotButton: { backgroundColor: '#6A1B9A' },
  slotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  bookedSlotText: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  selectedSlotText: { color: '#FFFFFF' },
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