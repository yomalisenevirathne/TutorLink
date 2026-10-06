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

export default function ScheduleScreen({ navigation, currentBooking, getCapacityForSlot }) {
  const [currentYear, setCurrentYear] = useState(currentBooking?.year || 2026);
  const [currentMonth, setCurrentMonth] = useState(currentBooking?.month ?? 8);
  const [selectedDay, setSelectedDay] = useState(currentBooking?.date || 15);
  const [selectedSlot, setSelectedSlot] = useState(currentBooking?.slot || '6:00 PM');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Calendar Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDayIndex + 6) % 7;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  // Standard Available Slots (No hardcoded dummy booked slots!)
  const morningTimes = ['8:00 AM', '9:00 AM', '10:00 AM'];
  const afternoonTimes = ['1:00 PM', '2:00 PM', '3:00 PM'];
  const eveningTimes = ['5:00 PM', '6:00 PM', '7:00 PM'];

  // Real Logic: Slot එකක් Booked ද කියා බලන්නේ ඒ දවස සහ වෙලාවේ capacity පිරිලා ඇත්නම් පමණි
  const checkSlotStatus = (time) => {
    if (!selectedDay || !getCapacityForSlot) return { isBooked: false };
    const cap = getCapacityForSlot(currentYear, currentMonth, selectedDay, time);
    // 1-on-1 private book කර ඇත්නම් හෝ groups දෙකම full නම් slot එක lock වේ
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
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Schedule Selection</Text>
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
        <Text style={styles.sectionHeading}>Select Date</Text>

        {/* Real Interactive Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={handlePrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={20} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={{ marginLeft: 20 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
              return (
                <View key={day} style={styles.dateCol}>
                  <TouchableOpacity
                    style={[styles.dateCell, isSelected && styles.selectedDateCell]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[styles.dateText, isSelected && styles.selectedDateText]}>
                      {day}
                    </Text>
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
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerRightIcons: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 12 },
  calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#6A1B9A' },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  daysRow: { flexDirection: 'row', marginBottom: 10 },
  dayCol: { width: '14.28%', alignItems: 'center' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dateCol: { width: '14.28%', alignItems: 'center', marginVertical: 4 },
  dateCell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  selectedDateCell: { backgroundColor: '#6A1B9A' },
  dateText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  selectedDateText: { color: '#FFFFFF', fontWeight: '700' },
  slotGroupTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginTop: 10, marginBottom: 6 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotButton: { backgroundColor: '#D48B06', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', minWidth: 95 },
  bookedSlotButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  selectedSlotButton: { backgroundColor: '#6A1B9A' },
  slotText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  bookedSlotText: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  selectedSlotText: { color: '#FFFFFF' },
  continueBtn: { backgroundColor: '#D48B06', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: '#1F2937', marginTop: 3 },
});