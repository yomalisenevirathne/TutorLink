// src/components/BookingSuccessModal.js
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BookingSuccessModal({
  visible,
  bookingDetails,
  onGoToBookings,
  onBackToHome,
}) {
  const { date = 15, slot = '6:00 PM', tutorName = 'Sarith Samarakoon' } = bookingDetails || {};

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Green Check Icon Circle */}
          <View style={styles.checkCircleWrapper}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={30} color="#10B981" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Booking Confirmed!</Text>

          {/* Subtitle / Description */}
          <Text style={styles.description}>
            Your session with <Text style={styles.boldText}>{tutorName}</Text> has been successfully booked for{' '}
            <Text style={styles.highlightText}>
              Date {date} at {slot}
            </Text>
            .
          </Text>

          {/* Primary Action Button (Gold) */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onGoToBookings}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
          </TouchableOpacity>

          {/* Secondary Action Button (Back to Home) */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onBackToHome}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  checkCircleWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6A1B9A',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  highlightText: {
    fontWeight: '700',
    color: '#6A1B9A',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D48B06',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});