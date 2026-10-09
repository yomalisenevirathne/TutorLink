import { supabase } from '../utils/supabase';
import { feedbackSummary } from '../data/feedback';

// Read-only summaries for feedback statistics. They never update the
// discovery team's tutors.avgRating, tutors.reviewCount, or reviews table.
export async function fetchTutorRatingSummary(tutorId, signal) {
  if (typeof tutorId !== 'string' || !tutorId.trim() || tutorId !== tutorId.trim()) {
    throw new Error('This tutor profile is unavailable.');
  }

  const ratings = [];
  for (let offset = 0; ; ) {
    if (signal?.aborted) throw new Error('Rating request cancelled.');
    let query = supabase.from('tutor_ratings').select('tutor_id, user_id, rating')
      .eq('tutor_id', tutorId).order('user_id').range(offset, offset + 199);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data) || data.some((row) => row.tutor_id !== tutorId)) {
      throw new Error('Invalid tutor rating response.');
    }
    if (!data.length) return feedbackSummary(ratings);
    ratings.push(...data);
    offset += data.length;
  }
}

// Load a list's ratings together rather than issuing a request for every card.
export async function fetchTutorRatingSummaries(tutorIds, signal) {
  const ids = [...new Set(tutorIds)];
  if (ids.some(id => typeof id !== 'string' || !id.trim() || id !== id.trim())) {
    throw new Error('This tutor profile is unavailable.');
  }
  const rowsByTutor = new Map(ids.map(id => [id, []]));
  for (let start = 0; start < ids.length; start += 50) {
    const batchIds = ids.slice(start, start + 50);
    const allowed = new Set(batchIds);
    for (let offset = 0; ; ) {
      if (signal?.aborted) throw new Error('Rating request cancelled.');
      let query = supabase.from('tutor_ratings').select('tutor_id, user_id, rating')
        .in('tutor_id', batchIds).order('tutor_id').order('user_id').range(offset, offset + 199);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      if (!Array.isArray(data) || data.some(row => !allowed.has(row.tutor_id))) {
        throw new Error('Invalid tutor rating response.');
      }
      if (!data.length) break;
      for (const row of data) rowsByTutor.get(row.tutor_id).push(row);
      offset += data.length;
    }
  }
  return new Map(ids.map(id => [id, feedbackSummary(rowsByTutor.get(id))]));
}
