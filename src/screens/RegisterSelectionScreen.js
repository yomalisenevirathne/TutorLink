import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RegisterSelectionScreen({ onSelectRole, onBackToLogin }) {
  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>🎓</Text>
        </View>
        <View style={styles.logoTitleRow}>
          <Text style={styles.logoTextBlue}>Tutor</Text>
          <Text style={styles.logoTextOrange}>Link</Text>
        </View>
      </View>

      {/* Main Selection Prompt */}
      <Text style={styles.questionText}>Are you a?</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => onSelectRole && onSelectRole('Tutor')}
        >
          <Text style={styles.roleButtonText}>Tutor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => onSelectRole && onSelectRole('Student')}
        >
          <Text style={styles.roleButtonText}>Student</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => onBackToLogin && onBackToLogin()}>
        <Text style={styles.backButtonText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoBadgeIcon: {
    fontSize: 32,
  },
  logoTitleRow: {
    flexDirection: 'row',
  },
  logoTextBlue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0056C6',
  },
  logoTextOrange: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF7A00',
  },
  questionText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 36,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  roleButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backButton: {
    marginTop: 48,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
