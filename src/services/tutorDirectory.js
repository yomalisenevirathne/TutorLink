import { supabase } from '../utils/supabase';

const PROFILE_COLUMNS = 'id, full_name, email, role, avatar_url, about_you';
const PAGE_SIZE = 200;
const emailKey = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';
const isUuid = (id) => typeof id === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function checkCancelled(signal) {
  if (signal?.aborted) throw new Error('Tutor request cancelled.');
}

async function readPages(table, { columns = '*', filter, order = 'id', signal } = {}) {
  const rows = [];
  for (let offset = 0; ; ) {
    checkCancelled(signal);
    let query = supabase.from(table).select(columns);
    if (filter) query = filter(query);
    query = query.order(order).range(offset, offset + PAGE_SIZE - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    checkCancelled(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid tutor response.');
    if (!data.length) return rows;
    rows.push(...data);
    offset += data.length;
  }
}

export const normalizeDirectoryTutor = (row) => ({
  ...row,
  listingId: row.listingId === undefined ? row.id : row.listingId,
  photoUrl: row.photo_url ?? row.photoUrl ?? null,
  hourlyRate: row.hourly_rate ?? row.hourlyRate ?? 0,
  avgRating: row.avg_rating ?? row.avgRating ?? row.rating ?? 0,
  reviewCount: row.review_count ?? row.reviewCount ?? row.total_reviews ?? 0,
  verifiedStatus: row.verified_status ?? row.verifiedStatus
    ?? (row.is_verified_tutor || row.is_verified ? 'verified' : 'unverified'),
  modesOffered: row.session_modes ?? row.modesOffered ?? [],
  teachingStyleTags: row.teaching_style_tags ?? row.teachingStyleTags ?? [],
  yearOfStudy: row.year_of_study ?? row.yearOfStudy ?? null,
  subjects: Array.isArray(row.subjects) ? row.subjects : [],
});

function profileTutor(profile, details = {}) {
  return normalizeDirectoryTutor({
    id: profile.id,
    user_id: profile.id,
    listingId: null,
    name: profile.full_name || 'Tutor',
    email: profile.email,
    photoUrl: profile.avatar_url || null,
    bio: profile.about_you || '',
    subjects: details.subjects || [],
    experienceLevel: details.experience_level || '',
    hourlyRate: details.hourly_rate ?? 0,
    verifiedStatus: details.is_verified_tutor === true ? 'verified' : 'unverified',
    avgRating: 0,
    reviewCount: 0,
    modesOffered: [],
    languages: [],
    availability: [],
    groupSizeOptions: [],
  });
}

function combineTutor(listing, profile, details) {
  const tutor = normalizeDirectoryTutor(listing);
  if (!profile) return tutor;
  const account = profileTutor(profile, details);
  return {
    ...account, ...tutor,
    user_id: profile.id,
    name: tutor.name || account.name,
    photoUrl: tutor.photoUrl || account.photoUrl,
    bio: tutor.bio || account.bio,
    subjects: tutor.subjects.length ? tutor.subjects : account.subjects,
    experienceLevel: tutor.experienceLevel || tutor.experience_level || account.experienceLevel,
  };
}

// Account IDs and email link records; matching names alone never establish identity.
export function mergeTutorDirectory(listings, profiles, details = []) {
  const tutorProfiles = profiles.filter((profile) => profile.role === 'Tutor');
  const byId = new Map(tutorProfiles.map((profile) => [profile.id, profile]));
  const byEmail = new Map(tutorProfiles.filter((profile) => emailKey(profile.email))
    .map((profile) => [emailKey(profile.email), profile]));
  const detailsById = new Map(details.map((row) => [row.user_id, row]));
  const seen = new Set();
  const includedProfiles = new Set();
  const tutors = [];

  for (const listing of listings) {
    const profile = listing.user_id ? byId.get(listing.user_id)
      : byId.get(listing.id) || byEmail.get(emailKey(listing.email));
    const accountId = profile?.id || listing.user_id;
    const key = accountId ? `user:${accountId}`
      : emailKey(listing.email) ? `email:${emailKey(listing.email)}` : `listing:${listing.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (profile) includedProfiles.add(profile.id);
    tutors.push(combineTutor(listing, profile, detailsById.get(profile?.id)));
  }
  for (const profile of tutorProfiles) {
    if (!includedProfiles.has(profile.id)) tutors.push(profileTutor(profile, detailsById.get(profile.id)));
  }
  return tutors.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

async function readProfileDetails(userIds, signal) {
  const details = [];
  try {
    // Batch IDs to keep URLs bounded. Missing details never hide a Tutor account.
    for (let offset = 0; offset < userIds.length; offset += 100) {
      details.push(...await readPages('tutor_profiles', {
        filter: (query) => query.in('user_id', userIds.slice(offset, offset + 100)),
        order: 'user_id', signal,
      }));
    }
  } catch (error) {
    checkCancelled(signal);
    console.warn('[Tutor Directory] Additional profile details unavailable:', error.message);
  }
  return details;
}

export async function listDirectoryTutors({ signal } = {}) {
  checkCancelled(signal);
  const [listings, profiles] = await Promise.all([
    readPages('tutors', { signal }),
    readPages('profiles', { columns: PROFILE_COLUMNS, filter: (query) => query.eq('role', 'Tutor'), signal }),
  ]);
  const details = await readProfileDetails(profiles.filter((profile) => profile.role === 'Tutor').map((profile) => profile.id), signal);
  return mergeTutorDirectory(listings, profiles, details);
}

async function readOne(table, columns, column, value, signal, tutorOnly = false, ignoreCase = false) {
  checkCancelled(signal);
  let query = supabase.from(table).select(columns);
  query = ignoreCase ? query.ilike(column, value.replace(/[\\%_]/g, '\\$&')) : query.eq(column, value);
  if (tutorOnly) query = query.eq('role', 'Tutor');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  checkCancelled(signal);
  if (error) throw error;
  return data;
}

export async function getDirectoryTutor(id, { signal } = {}) {
  if (typeof id !== 'string' || !id.trim() || id !== id.trim()) throw new Error('A tutor id is required.');
  const listing = await readOne('tutors', '*', 'id', id, signal);
  const accountId = listing?.user_id || id;
  let profile = isUuid(accountId)
    ? await readOne('profiles', PROFILE_COLUMNS, 'id', accountId, signal, true) : null;
  if (!profile && listing && !listing.user_id && emailKey(listing.email)) {
    profile = await readOne('profiles', PROFILE_COLUMNS, 'email', listing.email.trim(), signal, true, true);
    if (profile && emailKey(profile.email) !== emailKey(listing.email)) profile = null;
  }
  if (!profile || profile.role !== 'Tutor') return listing ? normalizeDirectoryTutor(listing) : null;
  const details = await readProfileDetails([profile.id], signal);
  return listing ? combineTutor(listing, profile, details[0]) : profileTutor(profile, details[0]);
}
