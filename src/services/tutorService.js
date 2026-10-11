import { supabase } from '../utils/supabase';

const toTutor = (row) => ({
  ...row,
  photoUrl: row.photo_url ?? row.photoUrl ?? null,
  hourlyRate: row.hourly_rate ?? row.hourlyRate ?? 0,
  avgRating: row.avg_rating ?? row.avgRating ?? row.rating ?? 0,
  reviewCount: row.review_count ?? row.reviewCount ?? row.total_reviews ?? 0,
  verifiedStatus: row.verified_status ?? row.verifiedStatus ?? (row.is_verified ? 'verified' : 'unverified'),
  modesOffered: row.session_modes ?? row.modesOffered ?? [],
  teachingStyleTags: row.teaching_style_tags ?? row.teachingStyleTags ?? [],
  yearOfStudy: row.year_of_study ?? row.yearOfStudy ?? 1,
});

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Upeksha ගේ tutors table එකට ගැලපෙන safe row එක (user_id නැතුව)
const toTutorSearchRow = (tutor) => ({
  name: tutor.name || tutor.fullName || 'Tutor',
  email: tutor.email ?? null,
  phone: tutor.phone ?? tutor.phoneNumber ?? null,
  university: tutor.university ?? 'SLIIT',
  year_of_study: tutor.yearOfStudy ?? tutor.year_of_study ?? 4,
  photo_url: tutor.photoUrl ?? tutor.photo_url ?? null,
  photoUrl: tutor.photoUrl ?? tutor.photo_url ?? null,
  bio: tutor.bio ?? tutor.aboutYou ?? null,
  subjects: Array.isArray(tutor.subjects) ? tutor.subjects : [],
  hourly_rate: Number(tutor.hourlyRate ?? tutor.hourly_rate ?? 700),
  experience_level: tutor.experienceLevel ?? tutor.experience_level ?? 'Senior Tutor',
  verified_status: tutor.verifiedStatus ?? tutor.verified_status ?? 'unverified',
});

const assertNoError = (error, operation) => {
  if (error) {
    throw new Error(`Unable to ${operation} tutor: ${error.message}`);
  }
};

export const tutorService = {
  async list() {
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .order('name', { ascending: true });
    assertNoError(error, 'load');
    return (data || []).map(toTutor);
  },

  async getById(id) {
    if (!id) throw new Error('A tutor id is required.');
    const { data, error } = await supabase.from('tutors').select('*').eq('id', id).maybeSingle();
    if (data) return toTutor(data);

    // If not found in tutors table, check tutor_profiles
    if (isUuid(id)) {
      const { data: profData } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      if (profData) return toTutor(profData);
    }
    return null;
  },

  async getByEmail(email) {
    if (!email) throw new Error('A tutor email is required.');
    try {
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (data) return toTutor(data);
    } catch (e) {
      // ignore
    }
    return null;
  },

  // 💡 CREATE TUTOR: Saves to Rashmika's tutor_profiles AND Upeksha's tutors table
  async create(tutor) {
    const tutorName = tutor?.name || tutor?.fullName;
    if (!tutorName?.trim()) throw new Error('Tutor name is required.');

    const rawUserId = tutor.userId ?? tutor.user_id;
    const validUserId = isUuid(rawUserId) ? rawUserId : null;

    // 1. Rashmika ගේ tutor_profiles table එකට data save කිරීම
    if (validUserId) {
      try {
        await supabase.from('tutor_profiles').upsert({
          user_id: validUserId,
          subjects: Array.isArray(tutor.subjects) ? tutor.subjects : [],
          experience_level: tutor.experienceLevel ?? tutor.experience_level ?? 'Senior Tutor (4+ years)',
          hourly_rate: Number(tutor.hourlyRate ?? tutor.hourly_rate ?? 25.0),
          is_verified_tutor: false,
        });
        console.log('[TutorService] Saved to tutor_profiles successfully!');
      } catch (err) {
        console.log('[TutorService] Notice on tutor_profiles upsert:', err.message);
      }
    }

    // 2. Upeksha ගේ tutors table එකට data save කිරීම (user_id නැතුව safe payload එකක් යැවීම)
    const searchPayload = toTutorSearchRow(tutor);
    const { data, error } = await supabase
      .from('tutors')
      .insert([searchPayload])
      .select('*')
      .single();

    assertNoError(error, 'create');
    return toTutor(data);
  },

  async update(id, changes) {
    if (!id) throw new Error('A tutor id is required.');
    const searchPayload = toTutorSearchRow(changes);
    const { data, error } = await supabase
      .from('tutors')
      .update(searchPayload)
      .eq('id', id)
      .select('*')
      .single();
    assertNoError(error, 'update');
    return toTutor(data);
  },

  async remove(id) {
    if (!id) throw new Error('A tutor id is required.');
    const { error } = await supabase.from('tutors').delete().eq('id', id);
    assertNoError(error, 'delete');
  },
};

export default tutorService;