// src/screens/MyBookingsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cancelBookingInDb, completeBookingInDb, deleteBookingFromDb } from '../bookingService';

export default function MyBookingsScreen({
  navigation,
  myBookings: propBookings,
  onCancelBooking,
  onCompleteBooking,
  onDeleteBooking,
}) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const bookings = propBookings ?? [];

  // Dynamic Categorization
  const upcomingBookings = bookings.filter((item) => item.status === 'Confirmed');
  const pastBookings = bookings.filter((item) => item.status === 'Completed');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const formatDisplayDate = (item) => {
    if (item.year && item.date) {
      const mName = item.month !== undefined ? (monthNames[item.month] || 'Sep') : 'Sep';
      return `${mName} ${item.date}, ${item.year}`;
    }
    if (item.booking_date) {
      return item.booking_date;
    }
    return `Date: ${item.date || '15'}`;
  };

  // Cancel Booking Handler
  const handleCancel = (id, tutor) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel the session with ${tutor}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelBookingInDb(id);
            if (!result.success) {
              Alert.alert('Unable to cancel', result.error?.message || 'Please try again.');
              return;
            }
            if (onCancelBooking) {
              onCancelBooking(id);
            }
            Alert.alert('Session Cancelled', 'Your booking has been cancelled.');
          },
        },
      ]
    );
  };

  // Mark as Completed Handler (for lifecycle and moving to Past tab)
  const handleMarkCompleted = (id, tutor) => {
    Alert.alert(
      'Complete Session',
      `Mark session with ${tutor} as completed? It will move to the Past tab.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          onPress: async () => {
            const result = await completeBookingInDb(id);
            if (!result.success) {
              Alert.alert('Unable to complete', result.error?.message || 'Please try again.');
              return;
            }
            if (onCompleteBooking) {
              onCompleteBooking(id);
            }
          },
        },
      ]
    );
  };

  // Permanently Delete Past Session Record
  const handleDeletePastRecord = (id, tutor) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to permanently delete this past session record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteBookingFromDb(id);
            if (!result.success) {
              Alert.alert('Unable to delete', result.error?.message || 'Please try again.');
              return;
            }
            if (onDeleteBooking) {
              onDeleteBooking(id);
            }
            Alert.alert('Deleted', 'Past session record has been permanently removed.');
          },
        },
      ]
    );
  };

  const handleReschedule = (item) => {
    navigation?.navigate('ScheduleScreen', {
      rescheduleId: item.id,
      mode: item.mode,
      groupSize: item.group_size,
      year: item.year || new Date().getFullYear(),
      month: item.month !== undefined ? item.month : new Date().getMonth(),
      date: item.date || new Date().getDate(),
      slot: item.slot || item.booking_time || '6:00 PM',
    });
  };

  return (
    <View style={styles.safeArea}>
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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('studentProfile')}>
            <Ionicons name="person-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs: Upcoming vs Past */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {activeTab === 'upcoming' ? (
        /* SCREEN 5: Upcoming Bookings Content */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {upcomingBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No upcoming bookings found.</Text>
              <TouchableOpacity
                style={styles.scheduleNewBtn}
                onPress={() => navigation?.navigate('ScheduleScreen')}
              >
                <Text style={styles.scheduleNewBtnText}>Book a Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingBookings.map((item) => (
              <View key={item.id} style={styles.bookingCard}>
                {/* Tutor Profile Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#6A1B9A" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.tutorName}>{item.tutor_name || 'Sarith Samarakoon'}</Text>
                    <Text style={styles.tutorSubject}>{item.subject || 'Data Structures & Algorithms'}</Text>
                  </View>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedBadgeText}>Confirmed</Text>
                  </View>
                </View>

                {/* Details (Date & Venue) */}
                <View style={styles.cardInfo}>
                  <View style={styles.infoLine}>
                    <Ionicons name="calendar-outline" size={15} color="#4B5563" />
                    <Text style={styles.infoText}>
                      {formatDisplayDate(item)} • {item.slot || item.booking_time || '6:00 PM'}
                    </Text>
                  </View>
                  <View style={[styles.infoLine, { marginTop: 6 }]}>
                    <Ionicons name="location-outline" size={15} color="#4B5563" />
                    <Text style={styles.infoText}>
                      {item.mode === 'physical'
                        ? 'Physical • SLIIT Lab Room 401'
                        : 'Online • Zoom Classroom'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons: Cancel, Reschedule */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(item.id, item.tutor_name || 'Sarith')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => handleReschedule(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                </View>

                {/* Simulation button to mark completed for testing */}
                <TouchableOpacity
                  style={styles.completeActionBtn}
                  onPress={() => handleMarkCompleted(item.id, item.tutor_name || 'Tutor')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                  <Text style={styles.completeActionText}>Mark as Completed</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* SCREEN 6: Past Sessions (Dynamic List OR Figma Empty State) */
        pastBookings.length > 0 ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {pastBookings.map((item) => (
              <View key={item.id} style={styles.bookingCard}>
                {/* Tutor Profile Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#6A1B9A" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.tutorName}>{item.tutor_name || 'Sarith Samarakoon'}</Text>
                    <Text style={styles.tutorSubject}>{item.subject || 'Data Structures & Algorithms'}</Text>
                  </View>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                </View>

                {/* Details (Date & Venue) */}
                <View style={styles.cardInfo}>
                  <View style={styles.infoLine}>
                    <Ionicons name="calendar-outline" size={15} color="#4B5563" />
                    <Text style={styles.infoText}>
                      {formatDisplayDate(item)} • {item.slot || item.booking_time || '6:00 PM'}
                    </Text>
                  </View>
                  <View style={[styles.infoLine, { marginTop: 6 }]}>
                    <Ionicons name="location-outline" size={15} color="#4B5563" />
                    <Text style={styles.infoText}>
                      {item.mode === 'physical'
                        ? 'Physical • SLIIT Lab Room 401'
                        : 'Online • Zoom Classroom'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons: Rate Session, Book Again, and Delete Option */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rateBtn}
                    onPress={() =>
                      Alert.alert(
                        'Rate Session',
                        `Thank you for rating your session with ${item.tutor_name || 'Sarith'}! ⭐⭐⭐⭐⭐`
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="star" size={14} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={styles.rateBtnText}>Rate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bookAgainBtn}
                    onPress={() => handleReschedule(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookAgainBtnText}>Book Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteRecordBtn}
                    onPress={() => handleDeletePastRecord(item.id, item.tutor_name || 'Sarith')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.deleteRecordBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          /* Exact Figma Screen 6 Empty State */
          <View style={styles.pastEmptyCenterWrapper}>
            <View style={styles.pastEmptyCard}>
              <View style={styles.emptyDotsCircle}>
                <Ionicons name="ellipsis-horizontal" size={26} color="#059669" />
              </View>
              <Text style={styles.emptyCardTitle}>Nothing to see here!</Text>
              <Text style={styles.emptyCardSubtitle}>
                You don’t have any past sessions yet. Once you complete a session, it will appear here.
              </Text>

              <TouchableOpacity
                style={styles.backHomeBtn}
                onPress={() => navigation?.navigate('ScheduleScreen')}
                activeOpacity={0.8}
              >
                <Text style={styles.backHomeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate('ScheduleScreen')}
        >
          <Ionicons name="home-outline" size={22} color="#1F2937" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#D48B06',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#D48B06',
    fontWeight: '700',
  },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tutorSubject: { fontSize: 12, color: '#6A1B9A', fontWeight: '600', marginTop: 2 },
  confirmedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confirmedBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  completedBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedBadgeText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  cardInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  infoLine: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 12, color: '#4B5563', fontWeight: '500', marginLeft: 6 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  rescheduleBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rateBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  bookAgainBtn: {
    flex: 1.2,
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookAgainBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  deleteRecordBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRecordBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  completeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  completeActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  // Screen 6 Past Empty State
  pastEmptyCenterWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
  },
  pastEmptyCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    elevation: 3,
  },
  emptyDotsCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: '#6A1B9A', marginBottom: 8 },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  backHomeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 28,
  },
  backHomeBtnText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 10, marginBottom: 16 },
  scheduleNewBtn: {
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scheduleNewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

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
