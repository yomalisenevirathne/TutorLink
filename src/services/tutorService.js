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

const isUuid = (value) => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const toRow = (tutor) => ({
  user_id: isUuid(tutor.userId ?? tutor.user_id) ? (tutor.userId ?? tutor.user_id) : null,
  name: tutor.name,
  email: tutor.email ?? null,
  phone: tutor.phone ?? null,
  university: tutor.university ?? null,
  year_of_study: tutor.yearOfStudy ?? tutor.year_of_study ?? null,
  photo_url: tutor.photoUrl ?? tutor.photo_url ?? null,
  bio: tutor.bio ?? null,
  subjects: Array.isArray(tutor.subjects) ? tutor.subjects : [],
  hourly_rate: Number(tutor.hourlyRate ?? tutor.hourly_rate ?? 0),
  session_modes: Array.isArray(tutor.modesOffered)
    ? tutor.modesOffered
    : (Array.isArray(tutor.session_modes) ? tutor.session_modes : []),
  experience_level: tutor.experienceLevel ?? tutor.experience_level ?? null,
  verified_status: tutor.verifiedStatus ?? tutor.verified_status ?? 'unverified',
});

const assertNoError = (error, operation) => {
  if (error) {
    throw new Error(`Unable to ${operation} tutor: ${error.message}`);
  }
};

export const tutorService = {
  async list() {
    const { data, error } = await supabase.from('tutors').select('*').order('created_at', { ascending: false });
    assertNoError(error, 'load');
    return (data || []).map(toTutor);
  },

  async getById(id) {
    if (!id) throw new Error('A tutor id is required.');
    const { data, error } = await supabase.from('tutors').select('*').eq('id', id).single();
    assertNoError(error, 'load');
    return toTutor(data);
  },

  async getByEmail(email) {
    if (!email) throw new Error('A tutor email is required.');
    const { data, error } = await supabase.from('tutors').select('*').eq('email', email).maybeSingle();
    assertNoError(error, 'load');
    return data ? toTutor(data) : null;
  },

  async create(tutor) {
    if (!tutor?.name?.trim()) throw new Error('Tutor name is required.');
    const { data, error } = await supabase.from('tutors').insert(toRow(tutor)).select('*').single();
    assertNoError(error, 'create');
    return toTutor(data);
  },

  async update(id, changes) {
    if (!id) throw new Error('A tutor id is required.');
    const { data, error } = await supabase.from('tutors').update(toRow(changes)).eq('id', id).select('*').single();
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
