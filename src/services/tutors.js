import { getDirectoryTutor, listDirectoryTutors } from './tutorDirectory';

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
  const data = await getDirectoryTutor(tutorId, { signal });
  if (!data) throw new Error('This tutor profile is unavailable.');
  return normalizeFeedbackTutor(data);
}

// Feedback and discovery resolve the same merged directory and stable tutor IDs.
export async function fetchAllTutors({ signal } = {}) {
  const tutors = await listDirectoryTutors({ signal });
  return tutors.map(normalizeFeedbackTutor);
}
