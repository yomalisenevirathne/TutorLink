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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBookingInDb } from '../bookingService';
import BookingSuccessModal from '../components/BookingSuccessModal';

export default function BookingSummaryScreen({
  navigation,
  currentBooking,
  groupPlans,
  onConfirm,
}) {
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Tutor Data from Search / Discovery Selection
  const tutorName =
    currentBooking?.tutor?.name ||
    currentBooking?.tutorName ||
    currentBooking?.tutor_name ||
    'Sarith Samarakoon';

  const tutorRole =
    currentBooking?.tutor?.role ||
    currentBooking?.tutor?.university ||
    (currentBooking?.tutor?.yearOfStudy ? `Year ${currentBooking?.tutor?.yearOfStudy} Student` : 'University Tutor');

  const tutorRating =
    currentBooking?.tutor?.rating ||
    currentBooking?.tutor?.avgRating ||
    '4.9';

  const tutorReviews =
    currentBooking?.tutor?.reviewCount ||
    currentBooking?.tutor?.reviewsCount ||
    '28';

  const tutorPhotoUrl = currentBooking?.tutor?.photoUrl;

  const subject =
    currentBooking?.subject ||
    currentBooking?.tutor?.subject ||
    (Array.isArray(currentBooking?.tutor?.subjects)
      ? (currentBooking.tutor.subjects[0]?.subjectName || currentBooking.tutor.subjects[0])
      : null) ||
    'Data Structures & Algorithms';

  // Dynamic Booking Schedule & Preferences
  const now = new Date();
  const year = currentBooking?.year || now.getFullYear();
  const month = currentBooking?.month !== undefined ? currentBooking?.month : now.getMonth();
  const date = currentBooking?.date || now.getDate();
  const slot = currentBooking?.slot || '6:00 PM';
  const mode = currentBooking?.mode || 'physical';
  const groupSize = currentBooking?.groupSize || 'small';

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const displayMonth = monthNames[month] || 'Sep';

  const baseRate = Number(currentBooking?.tutor?.hourlyRate || currentBooking?.tutor?.fee || 700);

  const defaultPlans = {
    private: { title: '1-on-1 Private', fee: Math.round(baseRate * 1.7) },
    small: { title: 'Small Group (2-5)', fee: baseRate },
    large: { title: 'Large Group (6-10)', fee: Math.round(baseRate * 0.57) },
  };

  const plan = (groupPlans && groupPlans[groupSize]) || defaultPlans[groupSize] || defaultPlans.small;
  const sessionFee = plan.fee;
  const platformFee = 50;
  const total = sessionFee + platformFee;

  // Real Database Save & Trigger Modal
  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      const bookingPayload = {
        tutor_name: tutorName,
        subject: subject,
        year: Number(year),
        month: Number(month) + 1, // 1-indexed for Supabase
        date: Number(date),
        slot: slot,
        mode: mode,
        group_size: groupSize,
        groupSize: groupSize,
        total_fee: Number(total),
        session_fee: Number(sessionFee),
        platform_fee: Number(platformFee),
        status: 'Confirmed',
      };

      // 1. Insert into Supabase bookings table
      const savedBooking = await createBookingInDb(bookingPayload);
      const savedId = savedBooking?.id || `booking-${Date.now()}`;

      // 2. Update local state in App.js for instant UI/capacity sync
      if (onConfirm) {
        onConfirm({
          id: savedId,
          tutorName: tutorName,
          tutor_name: tutorName,
          subject: subject,
          year,
          month,
          date,
          slot,
          groupSize,
          group_size: groupSize,
          mode,
          total_fee: total,
          totalFee: total,
          session_fee: sessionFee,
          platform_fee: platformFee,
          status: 'Confirmed',
          tutor: currentBooking?.tutor,
        });
      }

      // 3. Show confirmation modal
      setIsSuccessModalVisible(true);
    } catch (error) {
      console.error('SUPABASE ERROR in handlePay:', error);
      Alert.alert('Database Error', error.message || 'Failed to save booking to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
        {/* Dynamic Tutor Profile Card */}
        <View style={styles.tutorCard}>
          <View style={styles.tutorAvatar}>
            {tutorPhotoUrl ? (
              <Image source={{ uri: tutorPhotoUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={28} color="#6A1B9A" />
            )}
          </View>
          <View style={styles.tutorInfo}>
            <Text style={styles.tutorName}>{tutorName}</Text>
            <Text style={styles.tutorRole}>{tutorRole}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={styles.ratingText}>
                {' '}{tutorRating} ({tutorReviews} Reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Session Details */}
        <Text style={styles.sectionHeading}>Session Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {displayMonth} {date}, {year}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{slot}</Text>
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
              {groupSize === 'small' ? 'Small Group (2-5)' : plan.title}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subject</Text>
            <Text style={[styles.detailValue, styles.subjectText]}>
              {subject}
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

      {/* Booking Confirmed Modal */}
      <BookingSuccessModal
        visible={isSuccessModalVisible}
        bookingDetails={{ date, slot, tutorName }}
        onGoToBookings={() => {
          setIsSuccessModalVisible(false);
          navigation?.navigate('MyBookingsScreen');
        }}
        onBackToHome={() => {
          setIsSuccessModalVisible(false);
          navigation?.navigate('ScheduleScreen');
        }}
      />
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  tutorInfo: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tutorRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
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
  reminderText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  payBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});