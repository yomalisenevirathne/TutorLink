import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { apiService } from '../services/api';
import { pickImageWithPermissions } from '../utils/mediaPicker';

export default function StudentRegistrationScreen({ onRegistrationSuccess, onBack }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subjects, setSubjects] = useState('');
  const [aboutYou, setAboutYou] = useState('');
  const [password, setPassword] = useState('password123');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = async () => {
    const uri = await pickImageWithPermissions();
    if (uri) {
      setAvatarUrl(uri);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email) {
      Alert.alert('Missing Fields', 'Please enter your Full Name and Email Address.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: 'Student',
        fullName,
        email,
        phoneNumber,
        subjects: subjects ? subjects.split(',').map(s => s.trim()) : ['Mathematics', 'Physics'],
        aboutYou,
        password,
        avatarUrl
      };

      const res = await apiService.register(payload);
      setLoading(false);

      if (res && res.success) {
        Alert.alert('Welcome!', 'Student account created successfully.');
        if (onRegistrationSuccess) {
          onRegistrationSuccess(res.user);
        }
      } else {
        Alert.alert('Registration Failed', res?.message || 'Error creating account');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Brand Header */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>🎓</Text>
        </View>
        <Text style={styles.headerTitle}>Become a Student</Text>
        <Text style={styles.headerSubtitle}>Join our community of expert educators</Text>
      </View>

      {/* Profile Picture Box */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <TouchableOpacity style={styles.uploadPhotoBox} onPress={handlePickPhoto}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <>
              <View style={styles.cameraIconBg}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
              <Text style={styles.uploadPhotoText}>Upload Photo (Camera / Gallery)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Details Card */}
      <View style={styles.sectionCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John Doe"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor="#94A3B8"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subjects</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mathematics, Physics"
            placeholderTextColor="#94A3B8"
            value={subjects}
            onChangeText={setSubjects}
          />
        </View>
      </View>

      {/* About You */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About You</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us about your learning philosophy and experience..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          value={aboutYou}
          onChangeText={setAboutYou}
        />
      </View>

      {/* Create Account Button */}
      <TouchableOpacity 
        style={[styles.createAccountBtn, loading && styles.disabledBtn]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.createAccountBtnText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoBadgeIcon: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  uploadPhotoBox: {
    height: 110,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cameraIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cameraIcon: {
    fontSize: 16,
  },
  uploadPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  createAccountBtn: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  createAccountBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
