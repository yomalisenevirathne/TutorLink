import { supabase } from '../utils/supabase';
import { getPaymentIdentity } from './paymentIdentity';
import { fetchTutorById } from './tutors';

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const requireTutor = (id) => {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim()) {
    throw new Error('This tutor profile is unavailable.');
  }
};

export function feedbackErrorMessage(error) {
  if (['PGRST205', '42P01', '42703', 'PGRST204'].includes(error?.code)) {
    return 'Feedback is not available yet. Please try again later.';
  }
  if (['AUTH_REQUIRED', 'DEMO_AUTH_DISABLED', 'DEMO_AUTH_UNAVAILABLE'].includes(error?.code)
    || error?.name === 'AuthSessionMissingError' || error?.status === 401) {
    return 'Please sign in to submit feedback.';
  }
  return 'Feedback could not be saved or loaded. Please try again.';
}

async function readTutorRows(table, columns, tutorId, signal) {
  const records = [];
  for (let offset = 0; ; ) {
    if (signal?.aborted) throw new Error('Feedback request cancelled.');
    let query = supabase.from(table).select(columns).eq('tutor_id', tutorId)
      .order(table === 'tutor_ratings' ? 'user_id' : table === 'tutor_comment_reactions' ? 'comment_id' : 'created_at');
    if (table !== 'tutor_ratings') query = query.order(table === 'tutor_comments' ? 'id' : 'user_id');
    query = query.range(offset, offset + 199);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid feedback response.');
    if (data.some((record) => record.tutor_id !== tutorId)) throw new Error('Invalid tutor feedback.');
    if (!data.length) return records;
    records.push(...data);
    offset += data.length;
  }
}

async function writerIdentity(user) {
  const identity = await getPaymentIdentity(user?.id, { isDemo: !!user?.isDemo, create: true });
  if (!identity) {
    const error = new Error('Sign in to leave feedback.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
  return identity;
}

export async function fetchFeedbackTutor(tutorId, signal) {
  requireTutor(tutorId);
  return fetchTutorById(tutorId, signal);
}

export async function loadTutorFeedback(tutorId, user, signal) {
  requireTutor(tutorId);
  const [ratings, comments, reactions, identity] = await Promise.all([
    readTutorRows('tutor_ratings', 'tutor_id, user_id, rating', tutorId, signal),
    readTutorRows('tutor_comments', 'id, tutor_id, user_id, author_name, avatar_url, body, parent_id, created_at', tutorId, signal),
    readTutorRows('tutor_comment_reactions', 'tutor_id, comment_id, user_id, kind', tutorId, signal),
    // Public feedback stays readable even when the session has expired.
    getPaymentIdentity(user?.id, { isDemo: !!user?.isDemo, create: false }).catch(() => null),
  ]);
  const votes = new Map();
  for (const reaction of reactions) {
    if (!votes.has(reaction.comment_id)) votes.set(reaction.comment_id, {});
    votes.get(reaction.comment_id)[reaction.user_id] = reaction.kind;
  }
  return { ratings, viewerId: identity?.userId || null, comments: comments.map((comment) => ({
    id: comment.id, authorId: comment.user_id, authorName: comment.author_name,
    avatarUrl: comment.avatar_url, text: comment.body, parentId: comment.parent_id,
    createdAt: comment.created_at, reactions: votes.get(comment.id) || {},
  })) };
}

export async function saveTutorRating(tutorId, user, rating) {
  requireTutor(tutorId);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');
  const { client, userId } = await writerIdentity(user);
  const { data, error } = await client.from('tutor_ratings')
    .upsert({ tutor_id: tutorId, user_id: userId, rating }, { onConflict: 'tutor_id,user_id' })
    .select('tutor_id, user_id, rating').single();
  if (error) throw error;
  if (data?.tutor_id !== tutorId || data.user_id !== userId || data.rating !== rating) throw new Error('Rating could not be confirmed.');
  return data;
}

export async function sendTutorComment(tutorId, user, text, parentId = null) {
  requireTutor(tutorId);
  const body = String(text || '').trim();
  if (!body || body.length > 1000) throw new Error('Write a comment of 1 to 1,000 characters.');
  if (parentId && !uuid.test(parentId)) throw new Error('This comment is unavailable.');
  const { client, userId } = await writerIdentity(user);
  const { data, error } = await client.from('tutor_comments').insert({
    tutor_id: tutorId, user_id: userId, body, parent_id: parentId,
    author_name: String(user?.fullName || 'Learner').trim().slice(0, 100) || 'Learner',
    avatar_url: user?.avatarUrl || null,
  }).select('id, tutor_id, user_id, body, parent_id').single();
  if (error) throw error;
  if (data?.tutor_id !== tutorId || data.user_id !== userId || data.body !== body || data.parent_id !== parentId) throw new Error('Comment could not be confirmed.');
  return data;
}

export async function editTutorComment(tutorId, user, commentId, text) {
  requireTutor(tutorId);
  const body = String(text || '').trim();
  if (!uuid.test(commentId || '') || !body || body.length > 1000) throw new Error('Enter a valid comment of 1 to 1,000 characters.');
  const { client, userId } = await writerIdentity(user);
  const { data, error } = await client.from('tutor_comments').update({ body })
    .eq('id', commentId).eq('tutor_id', tutorId).eq('user_id', userId)
    .select('id, tutor_id, user_id, body').single();
  if (error) throw error;
  if (data?.id !== commentId || data.tutor_id !== tutorId || data.user_id !== userId || data.body !== body) {
    throw new Error('The comment update could not be confirmed.');
  }
  return data;
}

export async function deleteTutorComment(tutorId, user, commentId) {
  requireTutor(tutorId);
  if (!uuid.test(commentId || '')) throw new Error('This comment is unavailable.');
  const { client, userId } = await writerIdentity(user);
  const { data, error } = await client.from('tutor_comments').delete()
    .eq('id', commentId).eq('tutor_id', tutorId).eq('user_id', userId)
    .select('id, tutor_id, user_id').maybeSingle();
  if (error) throw error;
  if (data?.id !== commentId || data.tutor_id !== tutorId || data.user_id !== userId) {
    throw new Error('The comment deletion could not be confirmed.');
  }
  return data;
}

export async function reactToTutorComment(tutorId, user, commentId, kind, previousKind) {
  requireTutor(tutorId);
  if (!uuid.test(commentId || '') || !['like', 'dislike'].includes(kind)) throw new Error('This reaction is unavailable.');
  const { client, userId } = await writerIdentity(user);
  if (kind === previousKind) {
    const { error } = await client.from('tutor_comment_reactions').delete()
      .eq('tutor_id', tutorId).eq('comment_id', commentId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { data, error } = await client.from('tutor_comment_reactions')
      .upsert({ tutor_id: tutorId, comment_id: commentId, user_id: userId, kind }, { onConflict: 'comment_id,user_id' })
      .select('tutor_id, comment_id, user_id, kind').single();
    if (error) throw error;
    if (data?.tutor_id !== tutorId || data.user_id !== userId || data.comment_id !== commentId || data.kind !== kind) throw new Error('Reaction could not be confirmed.');
  }
}
