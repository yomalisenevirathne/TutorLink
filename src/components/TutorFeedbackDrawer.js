import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTutorFeedback from '../hooks/useTutorFeedback';
import { FeedbackAvatar, FeedbackComposer, FeedbackRatingCard, feedbackStyles } from './FeedbackViews';

export default function TutorFeedbackDrawer({ tutor, user, onClose, onViewComments }) {
  const feedback = useTutorFeedback(tutor.id, user);
  const [ratingMode, setRatingMode] = useState(false);
  const [summaryContentHeight, setSummaryContentHeight] = useState(0);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);
  const sheetHeight = Math.min(640, height * 0.82,
    ratingMode ? 560 : summaryContentHeight ? summaryContentHeight + 52 + bottomPadding : 540);
  const [slide] = useState(() => new Animated.Value(sheetHeight));
  const [closing, setClosing] = useState(false);
  const latestComment = feedback.comments.filter((comment) => !comment.parentId).slice(-1)[0];
  const canComment = feedback.ownRating > 0;

  const finishEntry = () => {
    Keyboard.dismiss();
    setRatingMode(false);
  };
  const sendComment = async (text) => {
    if (!canComment || feedback.busy) return false;
    const saved = await feedback.comment(text);
    if (saved) finishEntry();
    return saved;
  };

  useEffect(() => {
    const animation = Animated.timing(slide, { toValue: 0, duration: 260,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [slide]);

  const close = useCallback((afterClose) => {
    if (closing) return;
    setClosing(true);
    Keyboard.dismiss();
    Animated.timing(slide, { toValue: sheetHeight, duration: 180, useNativeDriver: Platform.OS !== 'web' })
      .start(({ finished }) => { if (finished) { onClose(); if (typeof afterClose === 'function') afterClose(); } });
  }, [slide, sheetHeight, onClose, closing]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => slide.stopAnimation(),
    onPanResponderMove: (_, gesture) => slide.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 80 || gesture.vy > 0.8) close();
      else Animated.spring(slide, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    onPanResponderTerminate: () => Animated.spring(slide, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
  }), [close, slide]);

  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => close()}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={() => close()}
        accessibilityRole="button" accessibilityLabel="Dismiss tutor feedback" />
      <Animated.View style={[styles.sheet, { height: sheetHeight, paddingBottom: bottomPadding, transform: [{ translateY: slide }] }]}
        accessibilityViewIsModal accessibilityLabel={`Feedback for ${tutor.fullName}`}>
        <View style={styles.sheetTop} {...pan.panHandlers}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={() => close()}
            accessibilityRole="button" accessibilityLabel="Close feedback drawer">
            <Feather name="x" size={20} color="#8B8491" />
          </TouchableOpacity>
        </View>
        {feedback.loading ? <View style={[feedbackStyles.state, { flex: 1 }]}>
          <ActivityIndicator color="#6500FF" /><Text style={feedbackStyles.stateText}>Loading feedback...</Text>
        </View> : feedback.loadError ? <View style={[feedbackStyles.state, { flex: 1 }]}>
          <Text style={feedbackStyles.stateText} accessibilityRole="alert">{feedback.loadError}</Text>
          <TouchableOpacity style={feedbackStyles.retry} onPress={feedback.refresh} accessibilityRole="button">
            <Text style={feedbackStyles.linkText}>Retry</Text>
          </TouchableOpacity>
        </View> : ratingMode ? <>
          <View style={styles.entryHeading}>
            <TouchableOpacity style={styles.entryBack} onPress={finishEntry} disabled={feedback.busy}
              accessibilityRole="button" accessibilityLabel="Back to feedback summary">
              <Feather name="arrow-left" size={20} color="#6500FF" />
            </TouchableOpacity>
            <Text style={styles.entryTitle}>Your feedback</Text>
          </View>
          <ScrollView style={styles.ratingScroll} contentContainerStyle={styles.ratingContent} keyboardShouldPersistTaps="handled">
            <FeedbackRatingCard tutor={tutor} summary={feedback.summary} ownRating={feedback.ownRating}
              onRate={feedback.rate} busy={feedback.busy} />
            {!canComment && <Text style={styles.entryHint}>Choose a star rating first. Then you can add a comment if you want.</Text>}
            {!!feedback.saveError && <Text style={feedbackStyles.error} accessibilityRole="alert">{feedback.saveError}</Text>}
          </ScrollView>
          {canComment && <View style={styles.commentPanel}>
            <Text style={styles.optionalTitle}>Comment (optional)</Text>
            <FeedbackComposer key={tutor.id} user={user} onSend={sendComment} busy={feedback.busy} compact />
            <TouchableOpacity style={styles.doneButton} onPress={finishEntry} disabled={feedback.busy}
              accessibilityRole="button" accessibilityLabel="Finish feedback without adding a comment"
              accessibilityState={{ disabled: feedback.busy }}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>}
        </> : <ScrollView style={styles.ratingScroll} contentContainerStyle={styles.summaryContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, contentHeight) => setSummaryContentHeight(Math.ceil(contentHeight))}>
            <FeedbackRatingCard tutor={tutor} summary={feedback.summary} ownRating={feedback.ownRating}
              onRate={feedback.rate} busy={feedback.busy} summaryMode />
            {!!feedback.saveError && <Text style={feedbackStyles.error} accessibilityRole="alert">{feedback.saveError}</Text>}
          <View style={[styles.commentPanel, styles.summaryCommentPanel]}>
            <View style={styles.commentHeading}>
              <View style={styles.commentTitle}>
                <Text style={feedbackStyles.sectionTitle}>Comments</Text>
                <Text style={styles.commentCount}>{feedback.comments.length}</Text>
              </View>
              <TouchableOpacity style={styles.viewAll} onPress={() => close(() => onViewComments(tutor.id))} accessibilityRole="button">
                <Text style={feedbackStyles.linkText}>View all</Text><Feather name="chevron-right" size={15} color="#6500FF" />
              </TouchableOpacity>
            </View>
            {latestComment ? <View style={styles.latestComment}>
              <View style={styles.commentAuthor}>
                <FeedbackAvatar name={latestComment.authorName} uri={latestComment.avatarUrl} small />
                <Text style={styles.authorName}>{latestComment.authorName}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={2}>{latestComment.text}</Text>
            </View> : <Text style={styles.emptyPreview}>Be the first to leave a comment.</Text>}
            <Pressable style={({ pressed }) => [styles.commentTrigger, pressed && styles.commentTriggerPressed]} onPress={() => setRatingMode(true)}
              accessibilityRole="button" accessibilityLabel="Add a comment: open rating and feedback drawer">
              <FeedbackAvatar name={user?.fullName || 'You'} uri={user?.avatarUrl} small />
              <View style={styles.commentTriggerInput}><Text style={styles.commentPlaceholder}>Add a comment...</Text></View>
              <View style={styles.commentTriggerIcon}><Feather name="send" size={18} color="#FFFFFF" /></View>
            </Pressable>
          </View>
        </ScrollView>}
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 16, 40, 0.48)' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: '#F8F7FC', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', boxShadow: '0px -8px 32px rgba(31, 18, 58, 0.14)' },
  sheetTop: { height: 52, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 42, height: 4, backgroundColor: '#D8D2E2', borderRadius: 2 },
  closeButton: { position: 'absolute', right: 12, top: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEEAF4', alignItems: 'center', justifyContent: 'center' },
  ratingScroll: { flex: 1 },
  ratingContent: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 16 },
  summaryContent: { flexGrow: 0, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 4, gap: 16 },
  commentPanel: { marginHorizontal: 18, marginTop: 2, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderWidth: 1, borderColor: '#EEEAF5', borderRadius: 18, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(39, 20, 71, 0.04)' },
  summaryCommentPanel: { marginHorizontal: 0, marginTop: 0 },
  commentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  commentTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentCount: { fontSize: 11, fontWeight: '700', color: '#7C3AED', backgroundColor: '#F1EAFF', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  viewAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3 },
  latestComment: { backgroundColor: '#F8F7FB', borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 6 },
  commentAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#302837' },
  preview: { fontSize: 13, color: '#6F667C', lineHeight: 20, marginTop: 6, paddingLeft: 36 },
  emptyPreview: { fontSize: 13, color: '#817889', lineHeight: 20, paddingVertical: 10 },
  commentTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, minHeight: 58 },
  commentTriggerPressed: { opacity: 0.75 },
  commentTriggerInput: { flex: 1, minHeight: 46, justifyContent: 'center', borderWidth: 1, borderColor: '#E4DCEF', backgroundColor: '#FBFAFD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  commentPlaceholder: { fontSize: 13, color: '#91879F' },
  commentTriggerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  entryHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  entryBack: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  entryTitle: { fontSize: 19, fontWeight: '700', color: '#261B38' },
  entryHint: { fontSize: 13, color: '#817889', lineHeight: 21, textAlign: 'center', paddingTop: 16 },
  optionalTitle: { fontSize: 14, fontWeight: '600', color: '#17121C', paddingTop: 12, paddingBottom: 4 },
  doneButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F3EDFC', marginTop: 4 },
  doneText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
});
