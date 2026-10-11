import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedbackErrorMessage, fetchFeedbackTutor } from '../services/feedback';
import useTutorFeedback from '../hooks/useTutorFeedback';
import { FeedbackComment, FeedbackComposer, FeedbackRatingCard, feedbackStyles } from '../components/FeedbackViews';
import CommentDeleteDialog from '../components/CommentDeleteDialog';

function TutorComments({ tutor, user }) {
  const feedback = useTutorFeedback(tutor.id, user);
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const list = useRef(null);
  const insets = useSafeAreaInsets();
  const threads = useMemo(() => {
    const replies = new Map();
    for (const comment of feedback.comments) {
      if (comment.parentId) {
        if (!replies.has(comment.parentId)) replies.set(comment.parentId, []);
        replies.get(comment.parentId).push(comment);
      }
    }
    return feedback.comments.filter((comment) => !comment.parentId)
      .map((comment) => ({ ...comment, replies: replies.get(comment.id) || [] }));
  }, [feedback.comments]);

  const send = async (text) => {
    if (editingComment) {
      const saved = await feedback.editComment(editingComment.id, text);
      if (saved) { setEditingComment(null); Keyboard.dismiss(); }
      return saved;
    }
    const saved = await feedback.comment(text, replyTo?.id || null);
    if (saved) { setReplyTo(null); list.current?.scrollToEnd({ animated: true }); }
    return saved;
  };

  const startReply = (comment) => { setEditingComment(null); setReplyTo(comment); };
  const startEdit = (comment) => { setReplyTo(null); setEditingComment(comment); };
  const requestDelete = (comment) => {
    Keyboard.dismiss();
    setDeleteError('');
    setPendingDelete(comment);
  };
  const confirmDelete = async () => {
    const removed = await feedback.deleteComment(pendingDelete.id);
    if (removed) {
      if (editingComment?.id === pendingDelete.id || editingComment?.parentId === pendingDelete.id) setEditingComment(null);
      if (replyTo?.id === pendingDelete.id) setReplyTo(null);
      setPendingDelete(null);
    } else setDeleteError('The comment could not be deleted. Please try again.');
  };

  if (feedback.loading) return <View style={[feedbackStyles.state, { flex: 1 }]}>
    <ActivityIndicator color="#6500FF" /><Text style={feedbackStyles.stateText}>Loading feedback...</Text>
  </View>;
  if (feedback.loadError) return <View style={[feedbackStyles.state, { flex: 1 }]}>
    <Text style={feedbackStyles.stateText} accessibilityRole="alert">{feedback.loadError}</Text>
    <TouchableOpacity style={feedbackStyles.retry} onPress={feedback.refresh} accessibilityRole="button">
      <Text style={feedbackStyles.linkText}>Retry</Text>
    </TouchableOpacity>
  </View>;

  return <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}>
    <FlatList ref={list} data={threads} keyExtractor={(comment) => comment.id} keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
      ListHeaderComponent={<>
        <FeedbackRatingCard tutor={tutor} summary={feedback.summary} ownRating={feedback.ownRating} onRate={feedback.rate} busy={feedback.busy} />
        <View style={styles.commentsHeading}>
          <View style={styles.commentsTitle}>
            <Text style={feedbackStyles.sectionTitle}>Comments</Text>
            <Text style={styles.commentCount}>{feedback.comments.length}</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={feedback.refresh} disabled={feedback.busy}
            accessibilityRole="button" accessibilityLabel="Refresh tutor feedback">
            <Feather name="refresh-cw" size={16} color="#6500FF" />
          </TouchableOpacity>
        </View>
      </>}
      renderItem={({ item }) => <View style={styles.thread}>
        <FeedbackComment comment={item} viewerId={feedback.viewerId} onReact={feedback.react} onReply={startReply}
          onEdit={startEdit} onDelete={requestDelete} busy={feedback.busy} />
        {item.replies.map((reply) => <FeedbackComment key={reply.id} comment={reply} viewerId={feedback.viewerId}
          onReact={feedback.react} onEdit={startEdit} onDelete={requestDelete} busy={feedback.busy} isReply />)}
      </View>}
      ListEmptyComponent={<View style={styles.empty}>
        <Feather name="message-circle" size={28} color="#B49ADA" />
        <Text style={feedbackStyles.stateText}>No comments yet. Share your experience.</Text>
      </View>}
    />
    {!!feedback.saveError && <Text style={feedbackStyles.error} accessibilityRole="alert">{feedback.saveError}</Text>}
    <FeedbackComposer key={editingComment ? `edit-${editingComment.id}` : 'new-comment'} user={user} onSend={send} busy={feedback.busy}
      editingComment={editingComment} onCancelEdit={() => setEditingComment(null)}
      replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    {pendingDelete && <CommentDeleteDialog busy={feedback.busy} error={deleteError}
      hasReplies={feedback.comments.some((comment) => comment.parentId === pendingDelete.id)}
      onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
  </KeyboardAvoidingView>;
}

export default function FeedbackCommentsScreen({ tutorId, user, onBack }) {
  const [tutor, setTutor] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchFeedbackTutor(tutorId, controller.signal).then((record) => {
      if (!controller.signal.aborted) setTutor(record);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(feedbackErrorMessage(failure));
    });
    return () => controller.abort();
  }, [tutorId, attempt]);

  return <View style={feedbackStyles.screen}>
    <View style={feedbackStyles.header}>
      <TouchableOpacity style={[feedbackStyles.headerButton, styles.headerBack]} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to tutors">
        <Feather name="arrow-left" size={23} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={feedbackStyles.headerTitle} accessibilityRole="header">Feedback &amp; Comments</Text>
    </View>
    {tutor ? <TutorComments key={tutor.id} tutor={tutor} user={user} /> : <View style={[feedbackStyles.state, { flex: 1 }]}>
      {error ? <>
        <Text style={feedbackStyles.stateText} accessibilityRole="alert">{error}</Text>
        <TouchableOpacity style={feedbackStyles.retry} onPress={() => { setError(''); setAttempt((previous) => previous + 1); }} accessibilityRole="button">
          <Text style={feedbackStyles.linkText}>Retry</Text>
        </TouchableOpacity>
      </> : <><ActivityIndicator color="#6500FF" /><Text style={feedbackStyles.stateText}>Loading tutor...</Text></>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  headerBack: { borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.12)', marginRight: 4 },
  listContent: { padding: 18, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  commentsHeading: { marginTop: 22, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  commentsTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  commentCount: { fontSize: 11, fontWeight: '700', color: '#7C3AED', backgroundColor: '#EDE4FA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEE7F9', alignItems: 'center', justifyContent: 'center' },
  thread: { borderWidth: 1, borderColor: '#EEEAF5', borderRadius: 18, padding: 16, marginBottom: 14, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(39, 20, 71, 0.04)' },
  empty: { padding: 28, gap: 12, alignItems: 'center', borderWidth: 1, borderRadius: 18, borderColor: '#EEEAF5', backgroundColor: '#FFFFFF' },
});
