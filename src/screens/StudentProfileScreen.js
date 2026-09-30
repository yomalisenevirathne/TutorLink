import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch, ScrollView } from 'react-native';

export default function StudentProfileScreen({ user, onEditProfile, onNavigateTab }) {
  const [privacyEnabled, setPrivacyEnabled] = useState(user?.privacyEnabled || false);
  const [activeTab, setActiveTab] = useState('Account');

  const studentName = user?.fullName || 'Dinithi de Silva';
  const avatarUrl = user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
  const keywords = user?.keywords || ['Math', 'Physics', 'Data Structures', 'Python'];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Purple Banner */}
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
        </View>

        {/* Student Name */}
        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.studentTag}>Student Account • Verified</Text>

        {/* Settings & Keywords */}
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Privacy Mode</Text>
            <Switch
              value={privacyEnabled}
              onValueChange={setPrivacyEnabled}
              trackColor={{ false: '#CBD5E1', true: '#7C3AED' }}
              thumbColor={privacyEnabled ? '#FFFFFF' : '#F1F5F9'}
            />
          </View>

          <View style={styles.keywordsSection}>
            <Text style={styles.keywordsTitle}>Keywords & Subject Interests</Text>
            <View style={styles.tagsContainer}>
              {keywords.map((kw, idx) => (
                <View key={idx} style={styles.tagPill}>
                  <Text style={styles.tagText}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Home')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Bookings')}>
          <Text style={styles.tabIcon}>📅</Text>
          <Text style={[styles.tabLabel, activeTab === 'Bookings' && styles.tabLabelActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Messages')}>
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'Messages' && styles.tabLabelActive]}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Payments')}>
          <Text style={styles.tabIcon}>💳</Text>
          <Text style={[styles.tabLabel, activeTab === 'Payments' && styles.tabLabelActive]}>Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Account')}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'Account' && styles.tabLabelActive]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    paddingBottom: 90,
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
    borderWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E11D48',
    textAlign: 'center',
    marginTop: 10,
  },
  studentTag: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  keywordsSection: {
    marginTop: 16,
  },
  keywordsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#F3E8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7E22CE',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});
