import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { fetchAllTutors } from '../services/tutors';
import { AppContext } from '../context/AppContext';
import TutorFeedbackDrawer from '../components/TutorFeedbackDrawer';

function TutorCard({ tutor, onPress }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const name = tutor.fullName || 'Tutor';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`View feedback and comments for ${name}`}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {tutor.avatarUrl && tutor.avatarUrl !== failedImageUrl ? (
            <Image source={{ uri: tutor.avatarUrl }} style={styles.avatarImage}
              accessibilityLabel={`${name} profile photo`} onError={() => setFailedImageUrl(tutor.avatarUrl)} />
          ) : <Text style={styles.initials}>{initials}</Text>}
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{name}</Text>
          {!!tutor.university && <Text style={styles.university}>{tutor.university}</Text>}
          {tutor.verifiedStatus === 'verified' && <Text style={styles.verified}>Verified tutor</Text>}
        </View>
      </View>
      <Text style={styles.subjects}>
        {tutor.subjects.length ? tutor.subjects.join(' · ') : 'Subjects not specified'}
      </Text>
      {!!tutor.experienceLevel && <Text style={styles.experience}>{tutor.experienceLevel}</Text>}
      {!!tutor.aboutYou && <Text style={styles.bio}>{tutor.aboutYou}</Text>}
      <View style={styles.feedbackLink}>
        <Feather name="star" size={16} color="#6500FF" />
        <Text style={styles.feedbackLinkText}>Feedback &amp; comments</Text>
        <Feather name="chevron-right" size={17} color="#6500FF" />
      </View>
    </TouchableOpacity>
  );
}

export default function TestingFeedbackScreen({ onBack }) {
  const { currentUser } = useContext(AppContext);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const closeFeedback = useCallback(() => setSelectedTutor(null), []);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const request = useRef(null);

  const loadTutors = useCallback(async (refresh = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(!refresh);
    setRefreshing(refresh);
    setLoadError('');
    try {
      const records = await fetchAllTutors({ signal: controller.signal });
      if (!controller.signal.aborted) setTutors(records);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError('Tutors could not be loaded. Please try again.');
        console.warn('[Tutor List]', error.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadTutors();
    return () => request.current?.abort();
  }, [loadTutors]));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}
          accessibilityRole="button" accessibilityLabel="Back to payment history">
          <Feather name="arrow-left" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">testingfeedback</Text>
      </View>
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color="#7100FF" />
          <Text style={styles.stateText}>Loading tutors...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.state}>
          <Feather name="alert-circle" size={36} color="#7100FF" />
          <Text style={styles.stateText} accessibilityRole="alert">{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTutors()} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={tutors} keyExtractor={(tutor) => tutor.id}
          renderItem={({ item }) => <TutorCard tutor={item} onPress={() => setSelectedTutor(item)} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing} onRefresh={() => loadTutors(true)}
          ListHeaderComponent={<Text style={styles.listTitle}>All tutors ({tutors.length})</Text>}
          ListEmptyComponent={(
            <View style={styles.state}>
              <Feather name="users" size={36} color="#A78BFA" />
              <Text style={styles.stateText}>No tutors available yet.</Text>
            </View>
          )} />
      )}
      {selectedTutor && <TutorFeedbackDrawer key={selectedTutor.id} tutor={selectedTutor} user={currentUser}
        onClose={closeFeedback} onViewComments={(tutorId) => router.push({
          pathname: '/[page]', params: { page: 'feedbackComments', tutorId },
        })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { minHeight: 70, backgroundColor: '#7100FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 21, fontWeight: '700' },
  listContent: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 18 },
  card: { width: '100%', maxWidth: 800, alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: 20, fontWeight: '700', color: '#6D28D9' },
  details: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  university: { fontSize: 13, color: '#64748B', marginTop: 4 },
  verified: { fontSize: 12, fontWeight: '600', color: '#15803D', marginTop: 4 },
  subjects: { fontSize: 14, fontWeight: '600', color: '#6D28D9', marginTop: 14, lineHeight: 21 },
  experience: { fontSize: 13, color: '#475569', marginTop: 6 },
  bio: { fontSize: 13, color: '#64748B', lineHeight: 20, marginTop: 10 },
  feedbackLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, marginTop: 12, borderTopWidth: 1, borderColor: '#F0E8FC' },
  feedbackLinkText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#6500FF' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  retryButton: { minHeight: 44, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: '#7100FF' },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
