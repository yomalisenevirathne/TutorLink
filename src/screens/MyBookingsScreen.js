// src/screens/MyBookingsScreen.js
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
import { fetchAllBookings, cancelBookingInDb } from '../utils/supabase';

export default function MyBookingsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' හෝ 'past'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supabase Database එකෙන් Bookings load කරගැනීම
  const loadBookingsFromDb = async () => {
    setLoading(true);
    try {
      const data = await fetchAllBookings();
      // 'Cancelled' නොවන, Confirmed bookings පමණක් Upcoming tab එකට ලබාගැනීම
      const activeBookings = data.filter((item) => item.status !== 'Cancelled');
      setBookings(activeBookings);
    } catch (err) {
      console.log('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingsFromDb();
  }, []);

  // Real Database Cancel Logic
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
            const res = await cancelBookingInDb(id);
            if (res.success) {
              setBookings((prev) => prev.filter((item) => item.id !== id));
              Alert.alert('Session Cancelled', 'Your booking has been cancelled in Database.');
            } else {
              Alert.alert('Error', 'Could not cancel booking. Try again.');
            }
          },
        },
      ]
    );
  };

  const handleReschedule = (item) => {
    navigation?.navigate('ScheduleScreen', {
      date: item.date,
      slot: item.slot,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={{ marginRight: 14 }}>
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation?.navigate('ManageSessionScreen')}>
            <Ionicons name="person-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen 5 & 6 Tabs (Upcoming vs Past) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6A1B9A" />
        </View>
      ) : activeTab === 'upcoming' ? (
        /* SCREEN 5: Upcoming Bookings Content */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No upcoming bookings found.</Text>
            </View>
          ) : (
            bookings.map((item) => (
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
                    <Text style={styles.confirmedBadgeText}>{item.status || 'Confirmed'}</Text>
                  </View>
                </View>

                {/* Details (Date & Venue) */}
                <View style={styles.cardInfo}>
                  <View style={styles.infoLine}>
                    <Ionicons name="calendar-outline" size={15} color="#4B5563" />
                    <Text style={styles.infoText}>
                      Mon, Sep {item.date || 15}, {item.year || 2026} • {item.slot || '6:00 PM'}
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

                {/* Action Buttons: Cancel & Reschedule */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(item.id, item.tutor_name || 'Sarith')}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rescheduleBtn}
                    onPress={() => handleReschedule(item)}
                  >
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* SCREEN 6: Past Sessions Empty State */
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
            >
              <Text style={styles.backHomeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
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
          onPress={() => navigation?.navigate('ManageSessionScreen')}
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
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: '#D48B06',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rescheduleBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

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
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 10 },

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