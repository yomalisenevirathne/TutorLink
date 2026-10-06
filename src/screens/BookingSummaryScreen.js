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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBookingInDb } from '../utils/supabase';
import BookingSuccessModal from '../components/BookingSuccessModal';

export default function BookingSummaryScreen({ navigation, currentBooking, groupPlans, onConfirm }) {
  // Screen 4 Confirmed Modal සහ Loading State
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Data (Fallback values සහිතව)
  const year = currentBooking?.year || 2026;
  const month = currentBooking?.month ?? 8;
  const date = currentBooking?.date || 15;
  const slot = currentBooking?.slot || '6:00 PM';
  const mode = currentBooking?.mode || 'physical';
  const groupSize = currentBooking?.groupSize || 'small';

  const defaultPlans = {
    private: { title: '1-on-1 Private', fee: 1200 },
    small: { title: 'Small Group (2-5)', fee: 700 },
    large: { title: 'Large Group (6-10)', fee: 400 },
  };

  const plan = (groupPlans && groupPlans[groupSize]) || defaultPlans[groupSize] || defaultPlans.small;
  const sessionFee = plan.fee;
  const platformFee = 50;
  const total = sessionFee + platformFee;

  // Real Database Save & Screen 4 Trigger Function
  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      // 1. Supabase 'bookings' table එකට Real Data Insert කිරීම
      const result = await createBookingInDb({
        year,
        month,
        date,
        slot,
        mode,
        groupSize,
        totalFee: total,
      });

      if (result.success) {
        // App.js එකේ Local State / Capacity එක update කිරීම
        const savedId = result.data?.[0]?.id || result.data?.id;
        if (onConfirm) {
          onConfirm({ id: savedId, year, month, date, slot, groupSize, mode, totalFee: total });
        }
        // Screen 4 (Booking Confirmed Modal) එක open කිරීම
        setIsSuccessModalVisible(true);
      } else {
        Alert.alert(
          'Booking Failed',
          'Could not save your booking to Supabase. Please check your internet connection and try again.'
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Summary</Text>
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
        {/* Tutor Profile Card */}
        <View style={styles.tutorCard}>
          <View style={styles.tutorAvatar}>
            <Ionicons name="person" size={28} color="#6A1B9A" />
          </View>
          <View style={styles.tutorInfo}>
            <Text style={styles.tutorName}>Sarith Samarakoon</Text>
            <Text style={styles.tutorRole}>4th Year IT Student</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={styles.ratingText}> 4.9 (28 Reviews)</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Session Details */}
        <Text style={styles.sectionHeading}>Session Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>Mon, Sep {date}, {year}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{slot} – 7:00 PM</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mode</Text>
            <Text style={styles.detailValue}>
              {mode === 'physical' ? 'Physical (SLIIT Campus)' : 'Online (Zoom / Meet)'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Group Size</Text>
            <Text style={styles.detailValue}>
              {groupSize === 'small' ? 'Small Group (3/5 filled)' : plan.title}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subject</Text>
            <Text style={[styles.detailValue, styles.subjectText]}>
              Data Structures & Algorithms
            </Text>
          </View>
        </View>

        {/* Section 2: Payment Information */}
        <Text style={styles.sectionHeading}>Payment Information</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Session Fee</Text>
            <Text style={styles.detailValue}>Rs. {sessionFee} / hr</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Platform Fee</Text>
            <Text style={styles.detailValue}>Rs. {platformFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, styles.totalLabel]}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total}</Text>
          </View>
        </View>

        {/* Reminder Banner */}
        <View style={styles.reminderBanner}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
          <Text style={styles.reminderText}>
            You will receive a notification reminder 15 minutes before your session starts.
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handlePay}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payBtnText}>Pay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Screen 4: Real Booking Confirmed Modal */}
      <BookingSuccessModal
        visible={isSuccessModalVisible}
        bookingDetails={{ date, slot }}
        onGoToBookings={() => {
          setIsSuccessModalVisible(false);
          navigation?.navigate('MyBookingsScreen');
        }}
        onBackToHome={() => {
          setIsSuccessModalVisible(false);
          navigation?.navigate('ScheduleScreen');
        }}
      />

      {/* Bottom Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('ScheduleScreen')}
        >
          <Ionicons name="home-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('MyBookingsScreen')}
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  tutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  tutorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tutorInfo: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tutorRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 10 },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  subjectText: { color: '#6A1B9A', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#6A1B9A' },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 18,
  },
  reminderText: { fontSize: 12, color: '#065F46', marginLeft: 8, flex: 1, fontWeight: '500', lineHeight: 18 },
  payBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
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