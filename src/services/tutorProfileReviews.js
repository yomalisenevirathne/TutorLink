import { supabase } from '../utils/supabase';

// Public, read-only preview of this tutor's latest top-level feedback comments.
export async function fetchTutorProfileReviews(tutorId, signal) {
  if (typeof tutorId !== 'string' || !tutorId.trim() || tutorId !== tutorId.trim()) {
    throw new Error('This tutor profile is unavailable.');
  }
  if (signal?.aborted) throw new Error('Review request cancelled.');
  let commentsQuery = supabase.from('tutor_comments')
    .select('id, tutor_id, user_id, author_name, body, parent_id, created_at')
    .eq('tutor_id', tutorId).is('parent_id', null)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(5);
  if (signal) commentsQuery = commentsQuery.abortSignal(signal);
  const { data: comments, error: commentsError } = await commentsQuery;
  if (commentsError) throw commentsError;
  if (!Array.isArray(comments) || comments.some(comment => comment.tutor_id !== tutorId || comment.parent_id !== null)) {
    throw new Error('Invalid tutor review response.');
  }
  if (!comments.length) return [];

  if (signal?.aborted) throw new Error('Review request cancelled.');
  const authors = [...new Set(comments.map(comment => comment.user_id))];
  let ratingsQuery = supabase.from('tutor_ratings').select('tutor_id, user_id, rating')
    .eq('tutor_id', tutorId).in('user_id', authors);
  if (signal) ratingsQuery = ratingsQuery.abortSignal(signal);
  const { data: ratings, error: ratingsError } = await ratingsQuery;
  if (ratingsError) throw ratingsError;
  if (!Array.isArray(ratings) || ratings.some(rating => rating.tutor_id !== tutorId || !authors.includes(rating.user_id))) {
    throw new Error('Invalid tutor review rating response.');
  }
  const ratingsByAuthor = new Map(ratings.map(row => [row.user_id, row.rating]));
  return comments.map(comment => {
    const rating = ratingsByAuthor.get(comment.user_id);
    return {
      id: comment.id,
      text: comment.body,
      authorName: comment.author_name || 'Learner',
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    };
  });
}
