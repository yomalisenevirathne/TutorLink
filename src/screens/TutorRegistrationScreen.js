import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { apiService } from '../services/api';
import { pickImageWithPermissions, pickQualificationDocument } from '../utils/mediaPicker';

export default function TutorRegistrationScreen({ onNavigateToVerifyOtp, onRegistrationSuccess, onBack }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [subjects, setSubjects] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Senior Tutor (4+ years)');
  const [aboutYou, setAboutYou] = useState('');
  const [password, setPassword] = useState('password123');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [certificateDocument, setCertificateDocument] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = async () => {
    const uri = await pickImageWithPermissions();
    if (uri) {
      setAvatarUrl(uri);
    }
  };

  const handleVerifyEmailClick = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }
    const res = await apiService.sendOtp(email);
    if (res && res.success) {
      if (onNavigateToVerifyOtp) {
        onNavigateToVerifyOtp(email, res.otp);
      }
    }
  };

  const handleUploadCertificate = async () => {
    const doc = await pickQualificationDocument();
    if (doc) {
      setCertificateDocument(doc);
      Alert.alert('Certificate Attached 📄', `Document "${doc.name}" attached successfully!`);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email) {
      Alert.alert('Missing Fields', 'Please provide at least your Full Name and Email Address.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: 'Tutor',
        fullName,
        email,
        phoneNumber,
        subjects: subjects ? subjects.split(',').map(s => s.trim()) : ['Mathematics', 'Physics'],
        experienceLevel,
        aboutYou,
        password,
        avatarUrl,
        certificates: certificateDocument ? [{
          id: 'cert_' + Date.now(),
          title: certificateDocument.name,
          certificateUrl: certificateDocument.uri,
          issuingInstitute: 'Verified Document',
          status: 'Verified',
          uploadedAt: new Date().toISOString().split('T')[0]
        }] : []
      };

      const res = await apiService.register(payload);
      setLoading(false);

      if (res && res.success) {
        Alert.alert('Welcome!', 'Tutor account created successfully.');
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
        <Text style={styles.headerTitle}>Become a Tutor</Text>
        <Text style={styles.headerSubtitle}>Join our community of expert educators</Text>
      </View>

      {/* Profile Picture Upload Box */}
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

      {/* Personal Details Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Personal Details</Text>

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
          <View style={styles.emailWrapper}>
            <TextInput
              style={styles.emailInput}
              placeholder="john@example.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.verifyEmailBtn} onPress={handleVerifyEmailClick}>
              <Text style={styles.verifyEmailBtnText}>verify email</Text>
            </TouchableOpacity>
          </View>
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
      </View>

      {/* Teaching Expertise */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Teaching Expertise</Text>

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Experience Level</Text>
          <TextInput
            style={styles.input}
            placeholder="Select level..."
            placeholderTextColor="#94A3B8"
            value={experienceLevel}
            onChangeText={setExperienceLevel}
          />
        </View>
      </View>

      {/* About You */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>About You</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell us about your teaching philosophy and experience..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          value={aboutYou}
          onChangeText={setAboutYou}
        />
      </View>

      {/* Qualification / Certificates Upload */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Qualifications & Certificates</Text>
        <Text style={styles.certDescription}>Upload degree or teaching certificates for profile verification.</Text>
        <TouchableOpacity 
          style={[styles.certUploadBtn, certificateDocument && styles.certUploadBtnDone]} 
          onPress={handleUploadCertificate}
        >
          <Text style={styles.certUploadBtnIcon}>{certificateDocument ? '✅' : '📄'}</Text>
          <Text style={styles.certUploadBtnText}>
            {certificateDocument ? `Attached: ${certificateDocument.name}` : 'Upload Certificate / Qualification Document'}
          </Text>
        </TouchableOpacity>
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
    height: 120,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cameraIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cameraIcon: {
    fontSize: 18,
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
  emailWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  verifyEmailBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  verifyEmailBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  certDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  certUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  certUploadBtnDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  certUploadBtnIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  certUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
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
