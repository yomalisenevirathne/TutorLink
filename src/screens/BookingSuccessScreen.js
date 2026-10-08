// src/screens/BookingSuccessScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BookingSuccessScreen({ navigation, route }) {
  const { date = 15, slot = '6:00 PM' } = route?.params || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6A1B9A" />
      <View style={styles.container}>
        <View style={styles.modalCard}>
          {/* Green Check Icon Circle */}
          <View style={styles.checkCircleWrapper}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={32} color="#10B981" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Booking Confirmed!</Text>

          {/* Subtitle */}
          <Text style={styles.description}>
            Your session with <Text style={styles.boldText}>Sarith S.</Text> has been successfully booked for{' '}
            <Text style={styles.highlightText}>
              Date {date} at {slot}
            </Text>
            .
          </Text>

          {/* Primary Action Button (Gold) */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation?.navigate('MyBookingsScreen')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
          </TouchableOpacity>

          {/* Secondary Action Button (Back to Home) */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation?.navigate('ScheduleScreen')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkCircleWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6A1B9A',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  boldText: { fontWeight: '700', color: '#111827' },
  highlightText: { fontWeight: '700', color: '#6A1B9A' },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
});
