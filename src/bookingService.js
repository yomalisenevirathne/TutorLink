import { supabase } from './utils/supabase';

// Session-management cache retained from the incoming booking flow.
const tutorSessionsCache = [];

// UI months are zero-based; database months are 1–12.
export const normalizeBooking = (row) => ({
  ...row, month: Number(row.month) - 1,
  group_size: String(row.group_size ?? row.groupSize ?? 'small').toLowerCase(),
  total_fee: Number(row.total_fee ?? row.totalFee ?? 0),
});

export const capacityFromBookings = (bookings, year, month, date, slot, excludeId = null) => {
  const result = { privateBooked: false, smallBookedCount: 0, largeBookedCount: 0 };
  for (const booking of bookings) {
    if (booking.id === excludeId || booking.status !== 'Confirmed') continue;
    if (Number(booking.year) !== Number(year) || Number(booking.month) !== Number(month) ||
        Number(booking.date) !== Number(date) ||
        String(booking.slot ?? booking.time ?? '').trim().toLowerCase() !== String(slot).trim().toLowerCase()) continue;
    const group = String(booking.group_size ?? booking.groupSize ?? '').toLowerCase();
    if (group === 'private') result.privateBooked = true;
    if (group === 'small') result.smallBookedCount += 1;
    if (group === 'large') result.largeBookedCount += 1;
  }
  return result;
};

export const fetchAllBookings = async () => {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeBooking);
};
export const fetchCapacityForSlot = async (year, month, date, slot, excludeId = null) =>
  capacityFromBookings(await fetchAllBookings(), year, month, date, slot, excludeId);

export const createBookingInDb = async (payload) => {
  const totalFee = Number(payload.total_fee ?? payload.totalFee ?? 750);
  const row = {
    tutor_name: payload.tutor_name ?? payload.tutorName ?? 'Sarith Samarakoon',
    subject: payload.subject ?? 'Data Structures & Algorithms',
    year: Number(payload.year), month: Number(payload.month) + 1, date: Number(payload.date),
    slot: payload.slot, mode: payload.mode ?? 'physical',
    group_size: payload.group_size ?? payload.groupSize ?? 'small',
    total_fee: totalFee,
    session_fee: Number(payload.session_fee ?? payload.sessionFee ?? Math.max(0, totalFee - 50)),
    platform_fee: Number(payload.platform_fee ?? payload.platformFee ?? 50), status: 'Confirmed',
  };
  const query = payload.rescheduleId
    ? supabase.from('bookings').update(row).eq('id', payload.rescheduleId)
    : supabase.from('bookings').insert([row]);
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data?.[0]) throw new Error('The booking could not be saved. Please try again.');
  return normalizeBooking(data[0]);
};

const mutateBooking = async (query) => {
  try {
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('The booking could not be updated. Please refresh and try again.');
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};
export const cancelBookingInDb = (id) =>
  mutateBooking(supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', id));
export const completeBookingInDb = (id) =>
  mutateBooking(supabase.from('bookings').update({ status: 'Completed' }).eq('id', id));
export const deleteBookingFromDb = (id) =>
  mutateBooking(supabase.from('bookings').delete().eq('id', id));

// =========================================================================
// TUTOR SESSION MANAGEMENT & DATABASE SYNC (tutor_sessions TABLE)
// =========================================================================

// 6. Check Tutor Slot Conflict against Database & Active Sessions
export const checkSlotConflict = async ({
  year,
  month,
  date,
  slot,
  currentTutorName = 'Sarith Samarakoon',
}) => {
  try {
    const targetYear = Number(year);
    const targetMonth0 = Number(month);
    const targetMonth1 = Number(month) + 1;
    const targetDate = Number(date);
    const targetSlotClean = (slot || '').split(' - ')[0].trim().toLowerCase();

    // A. Check Supabase bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .neq('status', 'Cancelled');

    if (bookingsData && bookingsData.length > 0) {
      const conflictBooking = bookingsData.find((b) => {
        const bYear = Number(b.year);
        const bMonth = Number(b.month);
        const bDate = Number(b.date);
        const bSlotClean = (b.slot || b.time || '').split(' - ')[0].trim().toLowerCase();
        const differentTutor =
          b.tutor_name &&
          b.tutor_name.trim().toLowerCase() !== currentTutorName.trim().toLowerCase();

        const yearMatches = !bYear || bYear === targetYear;
        const monthMatches = !bMonth || bMonth === targetMonth0 || bMonth === targetMonth1;
        const dateMatches = bDate === targetDate;
        const slotMatches = bSlotClean && bSlotClean === targetSlotClean;

        return yearMatches && monthMatches && dateMatches && slotMatches && differentTutor;
      });

      if (conflictBooking) {
        return {
          hasConflict: true,
          conflictTutor: conflictBooking.tutor_name,
          message: `Slot Conflict: Another tutor (${conflictBooking.tutor_name}) has already scheduled or booked this time slot. Please choose a different time.`,
        };
      }
    }

    // B. Check Supabase tutor_sessions table
    const { data: sessionsData } = await supabase
      .from('tutor_sessions')
      .select('*')
      .eq('year', targetYear)
      .eq('date', targetDate)
      .eq('is_accepting_bookings', true);

    if (sessionsData && sessionsData.length > 0) {
      const conflictSession = sessionsData.find((s) => {
        const sMonth = Number(s.month);
        const monthMatches = !sMonth || sMonth === targetMonth0 || sMonth === targetMonth1;
        const differentTutor =
          s.tutor_name &&
          s.tutor_name.trim().toLowerCase() !== currentTutorName.trim().toLowerCase();
        const slotMatches = (s.slots || []).some((st) =>
          st.split(' - ')[0].trim().toLowerCase() === targetSlotClean
        );
        return monthMatches && differentTutor && slotMatches;
      });

      if (conflictSession) {
        return {
          hasConflict: true,
          conflictTutor: conflictSession.tutor_name,
          message: `Slot Conflict: Another tutor (${conflictSession.tutor_name}) has already scheduled a session for this time slot. Please choose a different time.`,
        };
      }
    }

    return { hasConflict: false };
  } catch (err) {
    console.error('Error in checkSlotConflict:', err);
    return { hasConflict: false };
  }
};

// 7. Save / Insert Tutor Session into Supabase `tutor_sessions` table
export const saveTutorSessionToDb = async (sessionData) => {
  const payload = {
    tutor_name: sessionData.tutorName || sessionData.tutor_name || 'Sarith Samarakoon',
    course_title: sessionData.courseTitle || sessionData.course_title || 'Data Structures & Algorithms',
    course_code: sessionData.courseCode || sessionData.course_code || 'CS204',
    course_subtitle: sessionData.courseSubtitle || sessionData.course_subtitle || 'CS204 • Year 2 Semester 1',
    year: Number(sessionData.year) || new Date().getFullYear(),
    month: Number(sessionData.month !== undefined ? sessionData.month : (new Date().getMonth() + 1)),
    date: Number(sessionData.date || sessionData.selectedDay) || new Date().getDate(),
    slots: sessionData.slots || ['8:00 AM - 9:00 AM'],
    mode: sessionData.mode || 'physical',
    venue: sessionData.venue || 'SLIIT Malabe Campus, Block E - Lab 401',
    max_capacity: Number(sessionData.maxCapacity || sessionData.max_capacity || 5),
    fee: Number(sessionData.fee || sessionData.sessionFee || 700),
    is_accepting_bookings: sessionData.isAcceptingBookings !== undefined ? sessionData.isAcceptingBookings : true,
  };

  const { data, error } = await supabase.from('tutor_sessions').insert([payload]).select();
  if (error) {
    console.error('TUTOR SESSION SAVE ERROR:', error);
    throw error;
  }
  console.log('TUTOR SESSION SAVED SUCCESSFULLY:', data);

  // Update local cache
  if (data && data[0]) {
    tutorSessionsCache.push(data[0]);
    return data[0];
  }
  return payload;
};

// Backward compatibility alias
export const saveTutorSession = saveTutorSessionToDb;

// 8. Fetch Active Tutor Session Dates for Calendar Highlighting
export const fetchActiveTutorSessionDates = async (year = new Date().getFullYear(), month = (new Date().getMonth() + 1)) => {
  try {
    const targetYear = Number(year) || new Date().getFullYear();
    const rawMonth = Number(month);

    // Support month querying for both 1-indexed (1-12) and 0-indexed (0-11)
    const monthCandidates = [rawMonth];
    if (rawMonth >= 0 && rawMonth <= 11) {
      monthCandidates.push(rawMonth + 1);
    }
    if (rawMonth >= 1 && rawMonth <= 12) {
      monthCandidates.push(rawMonth - 1);
    }

    const { data, error } = await supabase
      .from('tutor_sessions')
      .select('date')
      .eq('year', targetYear)
      .in('month', monthCandidates)
      .eq('is_accepting_bookings', true);

    if (error) {
      console.error('Error fetching active tutor session dates from Supabase:', error.message || error);
      return [];
    }

    if (!data || data.length === 0) return [];
    return [...new Set(data.map((item) => Number(item.date)).filter(Boolean))];
  } catch (err) {
    console.error('Error in fetchActiveTutorSessionDates:', err);
    return [];
  }
};

export { supabase };
export default {
  fetchAllBookings, fetchCapacityForSlot, createBookingInDb, cancelBookingInDb,
  completeBookingInDb, deleteBookingFromDb, checkSlotConflict, saveTutorSessionToDb,
  saveTutorSession, fetchActiveTutorSessionDates, supabase,
};
