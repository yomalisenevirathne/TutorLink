import { supabase } from '../utils/supabase';

export function normalizeFeedbackTutor(tutor) {
  const subjects = Array.isArray(tutor.subjects) ? tutor.subjects : (tutor.subject ? [tutor.subject] : []);
  return {
    id: tutor.id,
    fullName: tutor.name || 'Tutor',
    avatarUrl: tutor.photoUrl || null,
    university: tutor.university || '',
    verifiedStatus: tutor.verifiedStatus || 'unverified',
    subjects: subjects.map((subject) => typeof subject === 'string'
      ? subject : (subject?.subjectName || subject?.name || '')).filter(Boolean),
    experienceLevel: tutor.experienceLevel || tutor.experience_level || '',
    aboutYou: tutor.bio || tutor.about_you || '',
  };
}

export async function fetchTutorById(tutorId, signal) {
  let query = supabase.from('tutors').select('*').eq('id', tutorId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This tutor profile is unavailable.');
  return normalizeFeedbackTutor(data);
}

// Read every page so the database's response limit does not truncate the list.
export async function fetchAllTutors({ signal } = {}) {
  const tutors = [];
  const pageSize = 200;
  let offset = 0;

  while (true) {
    if (signal?.aborted) throw new Error('Tutor request cancelled.');
    let query = supabase.from('tutors')
      .select('*')
      .order('name')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid tutor response.');
    if (!data.length) return tutors;

    tutors.push(...data.map(normalizeFeedbackTutor));
    offset += data.length;
  }
}
