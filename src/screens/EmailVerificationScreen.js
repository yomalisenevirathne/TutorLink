import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { apiService } from '../services/api';

export default function EmailVerificationScreen({ email = '', demoOtp, onVerificationSuccess, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const requestInProgress = useRef(false);
  const inputs = useRef([]);

  const handleChangeText = (text, index) => {
    const digits = text.replace(/\D/g, '').slice(0, 6 - index);
    const newOtp = [...otp];
    if (!digits) newOtp[index] = '';
    else [...digits].forEach((digit, offset) => { newOtp[index + offset] = digit; });
    setOtp(newOtp);

    // Auto-advance to next box if digit entered
    if (digits) inputs.current[Math.min(index + digits.length, 5)]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (requestInProgress.current) return;
    const fullCode = otp.join('');
    if (!/^\d{6}$/.test(fullCode)) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of the OTP code.');
      return;
    }

    requestInProgress.current = true;
    setLoading(true);
    try {
      const res = await apiService.verifyOtp(email, fullCode);

      if (res && res.success) {
        Alert.alert('Success 🎉', 'Your university email has been verified successfully!');
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        Alert.alert('Verification Failed', res?.message || 'Invalid code');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setResending(true);
    try {
      const res = await apiService.sendOtp(email);
      if (!res?.success) throw new Error(res?.message || 'Unable to resend the code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('OTP Resent', `A new OTP has been sent to ${email}.${res.otp ? ` (Demo Code: ${res.otp})` : ''}`);
    } catch (error) {
      Alert.alert('Resend Failed', error.message || 'Please try again.');
    } finally {
      requestInProgress.current = false;
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Enter the OTP sent to your email.</Text>
        <Text style={styles.subtitle}>Sent to {email}</Text>
        {!!demoOtp && <Text style={styles.subtitle}>Demo code: {demoOtp}</Text>}

        {/* 6 Digit Input Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { inputs.current[idx] = ref; }}
              style={styles.otpBox}
              value={digit}
              onChangeText={(text) => handleChangeText(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading && !resending}
              accessibilityLabel={`OTP digit ${idx + 1}`}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyBtn, loading && styles.disabledBtn]} 
          onPress={handleVerify}
          disabled={loading || resending || !email}
        >
          <Text style={styles.verifyBtnText}>{loading ? 'Verifying...' : 'Verify E-Mail'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={loading || resending || !email}>
          <Text style={styles.resendBtnText}>{resending ? 'Resending...' : "Didn't receive code? Resend OTP"}</Text>
        </TouchableOpacity>

        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 32,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
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
