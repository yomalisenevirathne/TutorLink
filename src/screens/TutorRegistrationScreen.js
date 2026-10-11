import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal } from 'react-native';
import { apiService } from '../services/api';
import { tutorService } from '../services/tutorService';
import { pickImageWithPermissions, pickQualificationDocument } from '../utils/mediaPicker';
import EmailVerificationScreen from './EmailVerificationScreen';

export default function TutorRegistrationScreen({ user, onNavigateToVerifyOtp, onRegistrationSuccess, onBack }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [subjects, setSubjects] = useState(Array.isArray(user?.subjects) ? user.subjects.join(', ') : '');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'Senior Tutor (4+ years)');
  const [aboutYou, setAboutYou] = useState(user?.aboutYou || '');
  const password = 'password123';
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [certificateDocument, setCertificateDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifiedDemoEmail, setVerifiedDemoEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const saving = useRef(false);
  const requestingCode = useRef(false);
  const showFeedback = (title, message) => {
    setFeedback(message);
    Alert.alert(title, message);
  };

  const handlePickPhoto = async () => {
    const uri = await pickImageWithPermissions();
    if (uri) {
      setAvatarUrl(uri);
    }
  };

  const handleVerifyEmailClick = async () => {
    if (requestingCode.current || saving.current) return;
    requestingCode.current = true;
    try {
      const address = email.trim().toLowerCase();
      const res = await apiService.sendOtp(address, { demo: !user });
      if (!res?.success) throw new Error(res?.message || 'Unable to send the verification code.');
      if (!user) setVerification({ email: address, otp: res.otp });
      else onNavigateToVerifyOtp?.(address, res.otp);
    } catch (error) { showFeedback('Verification Failed', error.message); }
    finally { requestingCode.current = false; }
  };

  const handleUploadCertificate = async () => {
    const doc = await pickQualificationDocument();
    if (doc) {
      setCertificateDocument(doc);
      Alert.alert('Certificate Attached 📄', `Document "${doc.name}" attached successfully!`);
    }
  };

  const handleRegister = async () => {
    if (saving.current) return;
    if (!fullName.trim() || !email.trim()) {
      showFeedback('Missing Fields', 'Please provide at least your Full Name and Email Address.');
      return;
    }
    const address = email.trim().toLowerCase();
    if (!user && verifiedDemoEmail !== address) {
      showFeedback('Verify Demo Code', 'Tap verify email and enter demo OTP 123456 first. Any email address format is accepted; an existing mailbox is not required.');
      return;
    }

    saving.current = true;
    setLoading(true);
    try {
      const payload = {
        role: 'Tutor',
        fullName: fullName.trim(),
        email: address,
        ...(!user ? { demoOtp: true } : {}),
        phoneNumber,
        subjects: subjects ? subjects.split(',').map(s => s.trim()) : ['Mathematics', 'Physics'],
        experienceLevel,
        aboutYou,
        password,
        avatarUrl,
        certificates: user?.certificates || []
      };

      let res = user
        ? await apiService.updateProfile({ ...payload, password: undefined, email: user.email })
        : await apiService.register(payload);
      if (res && res.success) {
        let attachmentWarning = '';
        if (certificateDocument) {
          const uploaded = await apiService.uploadCertificate(certificateDocument);
          if (uploaded.success) {
            res = { ...res, user: uploaded.user };
            setCertificateDocument(null);
          } else attachmentWarning = uploaded.message || 'The qualification document could not be saved.';
        }
        // New accounts already have profiles + tutor_profiles. The shared
        // directory displays them without copying them into the legacy tutors table.
        if (!user) {
          onRegistrationSuccess?.({ ...res.user, tutorId: res.user.id });
          if (attachmentWarning) Alert.alert('Document Upload Failed', attachmentWarning);
          return;
        }
        const tutorPayload = {
          userId: res.user?.id || user?.id,
          name: fullName,
          email,
          phone: phoneNumber,
          photoUrl: avatarUrl,
          subjects: payload.subjects,
          experienceLevel,
          bio: aboutYou,
        };
        const existingTutor = await tutorService.getById(user.tutorId || res.user.id);
        const tutor = existingTutor?.listingId === null
          ? existingTutor
          : existingTutor
          ? await tutorService.update(existingTutor.id, tutorPayload)
          : await tutorService.create(tutorPayload);
        Alert.alert(user ? 'Profile Updated' : 'Welcome!', attachmentWarning
          ? `Your account was saved. Document upload failed: ${attachmentWarning} Upload it again from your profile.`
          : user ? 'Your profile has been saved.' : 'Tutor account created successfully.');
        if (onRegistrationSuccess) {
          onRegistrationSuccess({ ...(res.user || user), tutorId: tutor.id });
        }
      } else {
        showFeedback('Registration Failed', res?.message || 'Error creating account');
      }
    } catch (err) {
      showFeedback('Error', err.message);
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  return (
    <>
    <Modal visible={Boolean(verification)} animationType="slide" onRequestClose={() => setVerification(null)}>
      {verification && <EmailVerificationScreen
        email={verification.email}
        demoOtp={verification.otp}
        onBack={() => setVerification(null)}
        onVerificationSuccess={() => {
          setVerifiedDemoEmail(verification.email);
          setVerification(null);
          setFeedback('Demo code verified. You can now create your tutor account.');
        }}
      />}
    </Modal>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Brand Header */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>🎓</Text>
        </View>
        <Text style={styles.headerTitle}>{user ? 'Edit Profile' : 'Become a Tutor'}</Text>
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
            editable={!user}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.verifyEmailBtn} onPress={handleVerifyEmailClick}>
              <Text style={styles.verifyEmailBtnText}>verify email</Text>
            </TouchableOpacity>
          </View>
          {!user && <Text style={styles.certDescription}>Demo OTP: 123456. Any email address is allowed; no email is sent.</Text>}
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
      {!!feedback && <Text style={styles.certDescription} accessibilityLiveRegion="polite">{feedback}</Text>}
      <TouchableOpacity 
        style={[styles.createAccountBtn, loading && styles.disabledBtn]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.createAccountBtnText}>{loading ? 'Saving...' : user ? 'Save Profile' : 'Create Account'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </>
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
