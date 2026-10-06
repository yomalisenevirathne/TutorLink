import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';

export default function EmailVerificationScreen({ email = 'user@univ.ac.lk', demoOtp = '123456', onVerificationSuccess, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleChangeText = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance to next box if digit entered
    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.verifyOtp(email, fullCode);
      setLoading(false);

      if (res && res.success) {
        Alert.alert('Success 🎉', 'Your university email has been verified successfully!');
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        Alert.alert('Verification Failed', res?.message || 'Invalid code');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.message);
    }
  };

  const handleResendOtp = async () => {
    const res = await apiService.sendOtp(email);
    Alert.alert('OTP Resent', `A new OTP has been sent to ${email}. (Demo Code: ${res.otp || '123456'})`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Enter the OTP sent to your email.</Text>
        <Text style={styles.subtitle}>Sent to {email}</Text>

        {/* 6 Digit Input Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputs.current[idx] = ref)}
              style={styles.otpBox}
              value={digit}
              onChangeText={(text) => handleChangeText(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyBtn, loading && styles.disabledBtn]} 
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.verifyBtnText}>{loading ? 'Verifying...' : 'Verify E-Mail'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp}>
          <Text style={styles.resendBtnText}>Didn't receive code? Resend OTP</Text>
        </TouchableOpacity>

        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 28,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  otpBox: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  verifyBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: '#A78BFA',
  },
  verifyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendBtn: {
    paddingVertical: 8,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D28D9',
  },
  backBtn: {
    marginTop: 16,
  },
  backBtnText: {
    fontSize: 13,
    color: '#64748B',
  }
});
