import { supabase } from './utils/supabase';
import { getPaymentIdentity } from './services/paymentIdentity';

// UI months are zero-based; database months are 1–12.
export const normalizeBooking = (row) => ({
  ...row, month: Number(row.month) - 1,
  group_size: String(row.group_size ?? row.groupSize ?? 'small').toLowerCase(),
  total_fee: Number(row.total_fee ?? row.totalFee ?? 0),
});

export const capacityFromBookings = (bookings, year, month, date, slot, excludeId = null, tutorName = null) => {
  const result = { privateBooked: false, smallBookedCount: 0, largeBookedCount: 0 };
  for (const booking of bookings) {
    if (booking.id === excludeId || booking.status !== 'Confirmed') continue;
    if (tutorName && String(booking.tutor_name ?? booking.tutorName ?? '').trim().toLowerCase() !== tutorName.trim().toLowerCase()) continue;
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

export const fetchAllBookings = async (user) => {
  if (!user?.id) return [];
  const identity = await getPaymentIdentity(user.id, { isDemo: !!user.isDemo });
  if (!identity) return [];
  const column = String(user.role).trim().toLowerCase() === 'tutor' ? 'tutor_id' : 'student_id';
  const { data, error } = await identity.client.from('bookings').select('*')
    .eq(column, identity.userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeBooking);
};
export const fetchCapacityForSlot = async (year, month, date, slot, excludeId = null, tutorName = null, user = null) => {
  if (!tutorName) throw new Error('Choose a tutor before checking availability.');
  const identity = user ? await getPaymentIdentity(user.id, { isDemo: !!user.isDemo }) : null;
  const client = identity?.client || supabase;
  // Use the existing bookings schema and its existing access policies.
  // Do not require a new RPC or alter the other feature's database setup.
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from('bookings')
      .select('id, tutor_name, year, month, date, slot, group_size, status, student_id')
      .eq('tutor_name', tutorName.trim()).eq('year', Number(year))
      .eq('month', Number(month) + 1).eq('date', Number(date))
      .eq('slot', slot).eq('status', 'Confirmed')
      .order('id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('The availability response could not be verified.');
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  const ownedReschedule = identity && rows.some((row) => row.id === excludeId && row.student_id === identity.userId)
    ? excludeId : null;
  return capacityFromBookings(rows.map(normalizeBooking), year, month, date, slot, ownedReschedule, tutorName);
};

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
const changeBooking = async (id, changes, user) => {
  try {
    const identity = user ? await getPaymentIdentity(user.id, { isDemo: !!user.isDemo }) : { client: supabase };
    if (!identity) throw new Error('Please sign in again to update your bookings.');
    let query = changes ? identity.client.from('bookings').update(changes) : identity.client.from('bookings').delete();
    query = query.eq('id', id);
    if (user) query = query.eq(String(user.role).trim().toLowerCase() === 'tutor' ? 'tutor_id' : 'student_id', identity.userId);
    return mutateBooking(query);
  } catch (error) { return { success: false, error }; }
};
export const cancelBookingInDb = (id, user) => changeBooking(id, { status: 'Cancelled' }, user);
export const completeBookingInDb = (id, user) => changeBooking(id, { status: 'Completed' }, user);
export const deleteBookingFromDb = (id, user) => changeBooking(id, null, user);

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
    const targetMonth1 = Number(month) + 1;
    const targetDate = Number(date);
    const targetSlotClean = (slot || '').split(' - ')[0].trim().toLowerCase();

    // A. Check Supabase bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .neq('status', 'Cancelled');
    if (bookingsError) throw bookingsError;

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
        const monthMatches = bMonth === targetMonth1;
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
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('tutor_sessions')
      .select('*')
      .eq('year', targetYear)
      .eq('date', targetDate)
      .eq('is_accepting_bookings', true);
    if (sessionsError) throw sessionsError;

    if (sessionsData && sessionsData.length > 0) {
      const conflictSession = sessionsData.find((s) => {
        const sMonth = Number(s.month);
        const monthMatches = sMonth === targetMonth1;
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
    return { hasConflict: true, message: 'Unable to check slot conflicts. Please try again.' };
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
    max_capacity: Number(sessionData.maxCapacity ?? sessionData.max_capacity ?? 5),
    fee: Number(sessionData.fee ?? sessionData.sessionFee ?? 700),
    is_accepting_bookings: sessionData.isAcceptingBookings !== undefined ? sessionData.isAcceptingBookings : true,
  };

  if (!Number.isInteger(payload.month) || payload.month < 1 || payload.month > 12 ||
      new Date(payload.year, payload.month - 1, payload.date).getDate() !== payload.date ||
      !Number.isInteger(payload.max_capacity) || payload.max_capacity < 1 ||
      !Number.isFinite(payload.fee) || payload.fee <= 0) {
    throw new Error('Check the session date, capacity and fee before saving.');
  }
  const existing = await supabase.from('tutor_sessions').select('id')
    .eq('tutor_name', payload.tutor_name).eq('year', payload.year)
    .eq('month', payload.month).eq('date', payload.date);
  if (existing.error) throw existing.error;
  const query = existing.data?.[0]
    ? supabase.from('tutor_sessions').update(payload).eq('tutor_name', payload.tutor_name)
      .eq('year', payload.year).eq('month', payload.month).eq('date', payload.date)
    : supabase.from('tutor_sessions').insert([payload]);
  const { data, error } = await query.select();
  if (error) {
    console.error('TUTOR SESSION SAVE ERROR:', error);
    throw error;
  }
  if (!data?.[0]) throw new Error('The session could not be saved. Please try again.');
  return data[0];
};

// Backward compatibility alias
export const saveTutorSession = saveTutorSessionToDb;

// 8. Fetch Active Tutor Session Dates for Calendar Highlighting
export const fetchActiveTutorSessionDates = async (year = new Date().getFullYear(), month = (new Date().getMonth() + 1)) => {
  try {
    const targetYear = Number(year) || new Date().getFullYear();
    const rawMonth = Number(month);

    if (!Number.isInteger(rawMonth) || rawMonth < 1 || rawMonth > 12) throw new Error('Database months must be between 1 and 12.');

    const { data, error } = await supabase
      .from('tutor_sessions')
      .select('date')
      .eq('year', targetYear)
      .eq('month', rawMonth)
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
