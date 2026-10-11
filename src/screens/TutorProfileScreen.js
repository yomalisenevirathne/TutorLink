import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { pickQualificationDocument } from '../utils/mediaPicker';
import { tutorService } from '../services/tutorService';

export default function TutorProfileScreen({ user, onEditProfile, onCreateSession, onNavigateToBookings, onLogout, onDeleteProfile, navigation }) {
  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);
  const [privacy, setPrivacy] = useState(user?.preferences?.privacy ?? false);
  const [activeTab, setActiveTab] = useState('Account');

  const tutorName = user?.fullName || 'Tutor Profile';
  const email = user?.email || 'N/A';
  const phone = user?.phoneNumber || 'N/A';
  const address = user?.address || 'Address not specified';
  const bio = user?.aboutYou || 'No bio provided.';
  const avatarUrl = user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80';
  const [certificatesList, setCertificatesList] = useState(user?.certificates || []);

  const handleUploadNewCert = async () => {
    const doc = await pickQualificationDocument();
    if (doc) {
      const newCert = {
        id: 'cert_' + Date.now(),
        title: doc.name,
        certificateUrl: doc.uri,
        issuingInstitute: 'Uploaded Document',
        status: 'Verified'
      };
      setCertificatesList(prev => [...prev, newCert]);
      Alert.alert('Certificate Attached 📄', `Document "${doc.name}" uploaded successfully.`);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => onLogout && onLogout() }
      ]
    );
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete tutor profile',
      'This permanently removes your tutor listing from search. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const tutor = user?.tutorId
                ? await tutorService.getById(user.tutorId)
                : await tutorService.getByEmail(user?.email);
              if (!tutor?.id) throw new Error('Tutor listing was not found.');
              await tutorService.remove(tutor.id);
              onDeleteProfile && onDeleteProfile();
            } catch (error) {
              Alert.alert('Delete failed', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Purple Banner Header */}
        <View style={styles.headerBanner}>
          <View style={styles.bannerNavRow}>
            <Text style={styles.menuIcon}>☰</Text>
            <View style={styles.bannerRightIcons}>
              <Text style={styles.headerIcon}>🔔</Text>
              <Text style={styles.headerIcon}>👤</Text>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity style={styles.editBtn} onPress={onEditProfile}>
            <Text style={styles.editBtnIcon}>✏️</Text>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Avatar Card */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedCheck}>✓</Text>
          </View>
        </View>

        {/* Tutor Name */}
        <Text style={styles.tutorName}>{tutorName}</Text>

        {/* Contact Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>[{email}]</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>[{phone}]</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        </View>

        {/* Bio Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bio</Text>
          <Text style={styles.bioText}>{bio}</Text>
        </View>

        {/* Verified Qualifications / Certificates */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Verified Qualifications</Text>
            <TouchableOpacity style={styles.linkMethodBtn} onPress={handleUploadNewCert}>
              <Text style={styles.linkMethodText}>+ Upload Document</Text>
            </TouchableOpacity>
          </View>
          {certificatesList.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No certificates uploaded yet.</Text>
          ) : (
            certificatesList.map((cert) => (
              <View key={cert.id || cert.title} style={styles.certCardRow}>
                <Text style={styles.certIcon}>🎓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.certTitleText}>{cert.title}</Text>
                  <Text style={styles.certSubText}>{cert.issuingInstitute || 'Verified Document'}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Verified ✅</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            <TouchableOpacity style={styles.linkMethodBtn} onPress={() => Alert.alert('Payment Method', 'Link payment method modal opened.')}>
              <Text style={styles.linkMethodText}>Link New Method</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentCardBox}>
            <Text style={styles.paymentCardIcon}>💳</Text>
            <Text style={styles.paymentCardText}>Visa ending in 4321</Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.smallPillBtn} onPress={() => Alert.alert('Feedback', 'Feedback section')}>
              <Text style={styles.smallPillBtnText}>Feedback</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallPillBtn} onPress={() => Alert.alert('Payments', 'Payments history section')}>
              <Text style={styles.smallPillBtnText}>Payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#CBD5E1', true: '#7C3AED' }}
              thumbColor={notifications ? '#FFFFFF' : '#F1F5F9'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Privacy</Text>
            <Switch
              value={privacy}
              onValueChange={setPrivacy}
              trackColor={{ false: '#CBD5E1', true: '#7C3AED' }}
              thumbColor={privacy ? '#FFFFFF' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Create a Session Button */}
        <TouchableOpacity 
          style={styles.createSessionBtn} 
          onPress={() => onCreateSession ? onCreateSession() : navigation?.navigate('ManageSessionScreen')}
        >
          <Text style={styles.createSessionBtnText}>Create a Session</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
        
        {/* Delete Profile Button */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteProfile}>
          <Text style={styles.deleteBtnText}>Delete Tutor Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingBottom: 24,
  },
  headerBanner: {
    height: 140,
    backgroundColor: '#6D28D9',
    paddingTop: 36,
    paddingHorizontal: 20,
    position: 'relative',
  },
  bannerNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  bannerRightIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  editBtn: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  editBtnIcon: {
    fontSize: 12,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginTop: -45,
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tutorName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#E11D48',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    width: 60,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  infoSection: {
    marginTop: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  bioText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  certCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  certIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  certTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  certSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  linkMethodBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  linkMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  paymentCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentCardIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  paymentCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  smallPillBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  smallPillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  createSessionBtn: {
    marginHorizontal: 16,
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createSessionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    height: 48,
    backgroundColor: '#FFF1F2',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
});