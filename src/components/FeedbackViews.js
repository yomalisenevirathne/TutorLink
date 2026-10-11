import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';

export function FeedbackAvatar({ name = 'Tutor', uri, small = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  return <View style={[styles.avatar, small && styles.smallAvatar]}>
    {uri && failedUrl !== uri ? <Image source={{ uri }} style={styles.avatarImage}
      accessibilityLabel={`${name} photo`} onError={() => setFailedUrl(uri)} />
      : <Text style={[styles.initials, small && styles.smallInitials]}>{initials}</Text>}
  </View>;
}

export function TutorIdentity({ tutor }) {
  return <View style={styles.identity}>
    <FeedbackAvatar name={tutor.fullName || 'Tutor'} uri={tutor.avatarUrl} />
    <View style={styles.identityDetails}>
      <Text style={styles.tutorName}>{tutor.fullName || 'Tutor'}</Text>
      <Text style={styles.tutorDetails}>{[tutor.subjects?.join(', '), tutor.experienceLevel].filter(Boolean).join(' · ') || 'Tutor'}</Text>
    </View>
  </View>;
}

export function FeedbackStars({ value = 0, onChange, disabled = false }) {
  return <View style={styles.stars} accessibilityLabel={onChange ? 'Choose a rating' : `${value.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => onChange ? (
      <TouchableOpacity key={star} style={styles.starButton} onPress={() => onChange(star)} disabled={disabled}
        accessibilityRole="button" accessibilityLabel={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
        accessibilityState={{ selected: value === star, disabled }}>
        <Ionicons name={star <= value ? 'star' : 'star-outline'} size={32} color="#F5B819" />
      </TouchableOpacity>
    ) : <View key={star} style={styles.starButton}>
      <Ionicons name={star <= value ? 'star' : star - value < 1 ? 'star-half' : 'star-outline'} size={32} color="#F5B819" />
    </View>)}
  </View>;
}

export function FeedbackRatingCard({ tutor, summary, ownRating, onRate, busy, summaryMode = false }) {
  return <View style={styles.panel}>
    <TutorIdentity tutor={tutor} />
    {summaryMode ? <>
      <FeedbackStars value={summary.average} />
      <View style={styles.ratingSummary}>
        <View style={styles.score}>
          <Text style={styles.average}>{summary.total ? summary.average.toFixed(1) : '—'}</Text>
          <Text style={styles.scoreLabel}>out of 5</Text>
        </View>
        <View style={styles.bars}>
          {[5, 4, 3, 2, 1].map((rating) => <View key={rating} style={styles.barRow}>
            <Text style={styles.barLabel}>{rating}</Text>
            <Ionicons name="star" size={10} color="#F5B819" />
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${summary.total ? summary.distribution[rating] / summary.total * 100 : 0}%` }]} />
            </View>
          </View>)}
        </View>
        <View style={styles.reviewTotal}>
          <Text style={styles.reviewNumber}>{summary.total}</Text>
          <Text style={styles.reviewCount}>{summary.total === 1 ? 'review' : 'reviews'}</Text>
        </View>
      </View>
    </> : <>
      <Text style={styles.question}>How was your session with {tutor.fullName || 'this tutor'}?</Text>
      <FeedbackStars value={ownRating} onChange={onRate} disabled={busy} />
      <View style={styles.ratingStatus}>
        {busy ? <ActivityIndicator size="small" color="#6500FF" /> : <Text style={styles.hint}>
          {ownRating ? `Your rating: ${ownRating}/5 · Tap a star to update` : 'Tap a star to rate your session'}
        </Text>}
      </View>
    </>}
  </View>;
}

export function FeedbackComposer({ user, onSend, busy, replyTo, onCancelReply, editingComment, onCancelEdit, compact = false }) {
  const [text, setText] = useState(editingComment?.text || '');
  const input = useRef(null);
  useEffect(() => {
    if (replyTo || editingComment) input.current?.focus();
  }, [replyTo, editingComment]);
  const sendDisabled = busy || !text.trim() || (!!editingComment && text.trim() === editingComment.text);
  const send = async () => {
    if (sendDisabled) return;
    if (await onSend(text.trim())) setText('');
  };
  return <View style={[styles.composer, compact && styles.compactComposer]}>
    {(replyTo || editingComment) && <View style={styles.replyBanner}>
      <Feather name={editingComment ? 'edit-3' : 'corner-up-left'} size={14} color="#7C3AED" />
      <Text style={styles.replyText} numberOfLines={1}>{editingComment ? 'Editing your comment' : `Replying to ${replyTo.authorName}`}</Text>
      <TouchableOpacity onPress={editingComment ? onCancelEdit : onCancelReply} disabled={busy}
        style={styles.cancelReply} accessibilityRole="button" accessibilityLabel={editingComment ? 'Cancel edit' : 'Cancel reply'}>
        <Feather name="x" size={16} color="#6500FF" />
      </TouchableOpacity>
    </View>}
    <View style={styles.composerRow}>
      <FeedbackAvatar name={user?.fullName || 'You'} uri={user?.avatarUrl} small />
      <TextInput ref={input} style={styles.commentInput} value={text} onChangeText={setText}
        placeholder={editingComment ? 'Update your comment...' : replyTo ? 'Write a reply...' : 'Share your experience...'} placeholderTextColor="#8B8491"
        accessibilityLabel={editingComment ? 'Edit your comment' : replyTo ? 'Write a reply' : 'Add a comment'}
        maxLength={1000} multiline scrollEnabled editable={!busy} />
      <TouchableOpacity style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]} onPress={send} disabled={sendDisabled}
        accessibilityRole="button" accessibilityLabel={editingComment ? 'Save comment changes' : replyTo ? 'Send reply' : 'Send comment'}
        accessibilityState={{ disabled: sendDisabled }}>
        {busy ? <ActivityIndicator size="small" color="#7C3AED" />
          : <Feather name={editingComment ? 'check' : 'send'} size={19} color={sendDisabled ? '#A496B8' : '#FFFFFF'} />}
      </TouchableOpacity>
    </View>
  </View>;
}

export function FeedbackComment({ comment, viewerId, onReact, onReply, onEdit, onDelete, busy, isReply = false }) {
  const [actionsVisible, setActionsVisible] = useState(false);
  const isOwner = !!viewerId && comment.authorId === viewerId;
  const date = new Date(comment.createdAt);
  const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const reactions = Object.values(comment.reactions || {});
  const ownReaction = comment.reactions?.[viewerId];
  return <View style={[styles.comment, isReply && styles.replyComment]}>
    <View style={styles.commentIdentity}>
      <FeedbackAvatar name={comment.authorName} uri={comment.avatarUrl} small />
      <View style={styles.commentAuthorDetails}>
        <View style={styles.authorLine}>
          <Text style={styles.commentAuthor} numberOfLines={1}>{comment.authorName}</Text>
          {isOwner && <Text style={styles.youBadge}>You</Text>}
        </View>
        {!!dateLabel && <Text style={styles.commentDate}>{dateLabel}</Text>}
      </View>
      {isOwner && onEdit && onDelete && <TouchableOpacity style={styles.moreButton}
        onPress={() => setActionsVisible((visible) => !visible)} disabled={busy}
        accessibilityRole="button" accessibilityLabel="Manage your comment" accessibilityState={{ expanded: actionsVisible, disabled: busy }}>
        <Feather name="more-horizontal" size={20} color="#817889" />
      </TouchableOpacity>}
    </View>
    {isOwner && actionsVisible && <View style={styles.ownerActions}>
      <TouchableOpacity style={styles.ownerAction} onPress={() => { setActionsVisible(false); onEdit(comment); }} disabled={busy}
        accessibilityRole="button" accessibilityLabel="Edit your comment">
        <Feather name="edit-3" size={15} color="#7C3AED" /><Text style={styles.editLabel}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ownerAction} onPress={() => { setActionsVisible(false); onDelete(comment); }} disabled={busy}
        accessibilityRole="button" accessibilityLabel="Delete your comment">
        <Feather name="trash-2" size={15} color="#C24152" /><Text style={styles.deleteLabel}>Delete</Text>
      </TouchableOpacity>
    </View>}
    <Text style={styles.commentBody}>{comment.text}</Text>
    <View style={styles.commentActions}>
      {['like', 'dislike'].map((kind) => <TouchableOpacity key={kind} style={[styles.reaction, ownReaction === kind && styles.activeReaction]}
        onPress={() => onReact(comment.id, kind)} disabled={busy} accessibilityRole="button"
        accessibilityLabel={`${kind === 'like' ? 'Like' : 'Dislike'} comment by ${comment.authorName}`}
        accessibilityState={{ selected: ownReaction === kind, disabled: busy }}>
        <Feather name={kind === 'like' ? 'thumbs-up' : 'thumbs-down'} size={17} color={ownReaction === kind ? '#6500FF' : '#514A58'} />
        <Text style={[styles.reactionCount, ownReaction === kind && styles.selectedReaction]}>{reactions.filter((vote) => vote === kind).length || ''}</Text>
      </TouchableOpacity>)}
      {!isReply && <TouchableOpacity style={styles.reaction} onPress={() => onReply(comment)}
        accessibilityRole="button" accessibilityLabel={`Reply to ${comment.authorName}`}>
        <Feather name="message-square" size={17} color="#514A58" />
        <Text style={styles.reactionCount}>Reply</Text>
      </TouchableOpacity>}
    </View>
  </View>;
}

export const feedbackStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7FC' },
  header: { minHeight: 64, backgroundColor: '#6500FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  content: { padding: 20, gap: 14 },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEAF5', borderRadius: 18, padding: 18, boxShadow: '0px 2px 8px rgba(39, 20, 71, 0.04)' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#261B38' },
  hint: { fontSize: 12, color: '#817889', textAlign: 'center', lineHeight: 18 },
  state: { padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 },
  stateText: { fontSize: 14, color: '#817889', textAlign: 'center', lineHeight: 21 },
  error: { fontSize: 12, color: '#B42318', lineHeight: 18, paddingHorizontal: 20, paddingVertical: 10 },
  retry: { padding: 12, minHeight: 44 },
  linkText: { color: '#7C3AED', fontSize: 13, fontWeight: '600' },
});

const styles = StyleSheet.create({
  ...feedbackStyles,
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0E7FF', borderWidth: 2, borderColor: '#F2EDFA', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: 13, fontWeight: '700', color: '#6500FF' },
  smallInitials: { fontSize: 9 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityDetails: { flex: 1 },
  tutorName: { fontSize: 16, fontWeight: '700', color: '#261B38', lineHeight: 22 },
  tutorDetails: { fontSize: 12, color: '#817889', marginTop: 3, lineHeight: 18 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: 18 },
  starButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  question: { fontSize: 15, fontWeight: '600', color: '#261B38', marginTop: 20, lineHeight: 24 },
  ratingStatus: { minHeight: 26, marginTop: 8, alignItems: 'center' },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, backgroundColor: '#FAF8FD', borderRadius: 14, padding: 12 },
  score: { alignItems: 'center', minWidth: 58 },
  average: { fontSize: 36, fontWeight: '800', color: '#261B38', lineHeight: 42 },
  scoreLabel: { fontSize: 10, color: '#91879F', marginTop: 2 },
  bars: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  barLabel: { fontSize: 10, color: '#817889', width: 8 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#E8E3EF', marginLeft: 3, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#8B5CF6', borderRadius: 3 },
  reviewTotal: { alignItems: 'center', minWidth: 38 },
  reviewNumber: { fontSize: 16, fontWeight: '700', color: '#51445F' },
  reviewCount: { fontSize: 10, color: '#91879F', marginTop: 3 },
  composer: { borderTopWidth: 1, borderColor: '#EEEAF5', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 18 },
  compactComposer: { borderTopWidth: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 0, paddingVertical: 10 },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#E4DCEF', backgroundColor: '#FBFAFD', borderRadius: 12, minHeight: 46, maxHeight: 100, paddingHorizontal: 12, paddingVertical: 12, fontSize: 13, color: '#302837' },
  sendButton: { width: 42, minHeight: 44, borderRadius: 12, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#F1ECF8' },
  replyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F0FD', borderRadius: 10, paddingLeft: 10, marginBottom: 8 },
  replyText: { flex: 1, fontSize: 11, color: '#6500FF' },
  cancelReply: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  comment: { paddingTop: 6, paddingBottom: 4 },
  replyComment: { marginLeft: 18, marginTop: 12, borderLeftWidth: 2, borderColor: '#D9C8F5', borderRadius: 12, backgroundColor: '#FAF8FE', padding: 12 },
  commentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  commentAuthorDetails: { flex: 1 },
  authorLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  commentAuthor: { flex: 1, fontSize: 13, fontWeight: '600', color: '#302837' },
  commentDate: { fontSize: 10, color: '#9C91A8', marginTop: 3 },
  youBadge: { fontSize: 9, fontWeight: '600', color: '#7C3AED', backgroundColor: '#F0E8FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  moreButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  ownerActions: { flexDirection: 'row', alignSelf: 'flex-end', backgroundColor: '#F8F5FD', borderRadius: 12, paddingHorizontal: 5, marginTop: 4, gap: 6 },
  ownerAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10 },
  editLabel: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  deleteLabel: { fontSize: 12, fontWeight: '600', color: '#C24152' },
  commentBody: { fontSize: 14, color: '#62566F', lineHeight: 23, marginTop: 10, marginBottom: 8 },
  commentActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 44, minHeight: 40, paddingHorizontal: 9, borderRadius: 10, backgroundColor: '#F8F6FB' },
  activeReaction: { backgroundColor: '#F0E8FD' },
  reactionCount: { fontSize: 10, color: '#817889' },
  selectedReaction: { color: '#6500FF' },
});
