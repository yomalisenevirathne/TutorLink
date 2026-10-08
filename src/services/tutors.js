import { supabase } from '../utils/supabase';

// Read every page so the database's response limit does not truncate the list.
export async function fetchAllTutors({ signal } = {}) {
  const tutors = [];
  const pageSize = 200;
  let offset = 0;

  while (true) {
    if (signal?.aborted) throw new Error('Tutor request cancelled.');
    let query = supabase.from('profiles')
      .select('id, full_name, email, avatar_url, about_you, tutor_profiles(subjects, experience_level)')
      .eq('role', 'Tutor')
      .order('full_name')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return tutors;

    tutors.push(...data.map((profile) => {
      const details = Array.isArray(profile.tutor_profiles)
        ? profile.tutor_profiles[0] : profile.tutor_profiles;
      return {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        aboutYou: profile.about_you,
        subjects: details?.subjects || [],
        experienceLevel: details?.experience_level || '',
      };
    }));
    offset += data.length;
  }
}
