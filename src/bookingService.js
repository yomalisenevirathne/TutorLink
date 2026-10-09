// src/bookingService.js
import { supabase } from './utils/supabase';

// Local cache of configured tutor sessions for fallback
let tutorSessionsCache = [];

// 1. Supabase eken Bookings labaganima
export const fetchAllBookings = async () => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error.message || error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching bookings:', error?.message || error);
    return [];
  }
};

// 2. Fetch live capacity for a specific date and time slot from Supabase
export const fetchCapacityForSlot = async (year, month, date, slot) => {
  const result = {
    privateBooked: false,
    smallBookedCount: 0,
    largeBookedCount: 0,
  };

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .neq('status', 'Cancelled');

    if (error) {
      console.error('Error fetching capacity bookings:', error.message || error);
      return result;
    }

    const allBookings = data || [];
    const targetYear = Number(year);
    const targetMonth0 = Number(month);
    const targetMonth1 = Number(month) + 1;
    const targetDate = Number(date);

    const matching = allBookings.filter((b) => {
      const bYear = Number(b.year);
      const bMonth = Number(b.month);
      const bDate = Number(b.date);

      const yearMatches = !bYear || bYear === targetYear;
      const monthMatches = !bMonth || bMonth === targetMonth0 || bMonth === targetMonth1;
      const dateMatches = bDate === targetDate;

      const slotMatches =
        (b.slot && b.slot.trim().toLowerCase() === (slot || '').trim().toLowerCase()) ||
        (b.time && b.time.trim().toLowerCase() === (slot || '').trim().toLowerCase());

      return yearMatches && monthMatches && dateMatches && slotMatches;
    });

    matching.forEach((b) => {
      const groupSize = (b.group_size || b.groupSize || '').toLowerCase();
      if (groupSize === 'private') {
        result.privateBooked = true;
      } else if (groupSize === 'small') {
        result.smallBookedCount += 1;
      } else if (groupSize === 'large') {
        result.largeBookedCount += 1;
      }
    });

    return result;
  } catch (err) {
    console.error('Error calculating slot capacity:', err?.message || err);
    return result;
  }
};

// 3. New Booking ekak Supabase ekata dameema (After Pay)
export const createBookingInDb = async (payload) => {
  const totalFee = Number(payload.total_fee || payload.totalFee || payload.fee || payload.total || 750);
  const sessionFee = Number(payload.session_fee || payload.sessionFee || Math.max(0, totalFee - 50));
  const platformFee = Number(payload.platform_fee || payload.platformFee || 50);

  const insertData = {
    tutor_name: payload.tutor_name || payload.tutorName || 'Sarith Samarakoon',
    subject: payload.subject || 'Data Structures & Algorithms',
    year: Number(payload.year) || new Date().getFullYear(),
    month: Number(payload.month) || (new Date().getMonth() + 1),
    date: Number(payload.date || payload.day) || new Date().getDate(),
    slot: payload.slot || payload.time || '6:00 PM',
    mode: payload.mode || 'physical',
    group_size: payload.groupSize || payload.group_size || 'small',
    total_fee: totalFee,
    session_fee: sessionFee,
    platform_fee: platformFee,
    status: 'Confirmed',
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert([insertData])
    .select();

  if (error) {
    console.error('SUPABASE ERROR:', error);
    throw error;
  }
  return data ? data[0] : null;
};

// 4. Booking ekak Cancel kirima
export const cancelBookingInDb = async (bookingId) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error?.message || error);
    return { success: false, error };
  }
};

// 5. Booking record ekak Supabase ekෙන් delete kirima
export const deleteBookingFromDb = async (bookingId) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting booking:', error?.message || error);
    return { success: false, error };
  }
};

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
  fetchAllBookings,
  fetchCapacityForSlot,
  createBookingInDb,
  cancelBookingInDb,
  deleteBookingFromDb,
  checkSlotConflict,
  saveTutorSessionToDb,
  saveTutorSession,
  fetchActiveTutorSessionDates,
  supabase,
};