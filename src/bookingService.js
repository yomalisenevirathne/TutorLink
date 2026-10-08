// src/bookingService.js
import { supabase } from './utils/supabase';

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

export { supabase };
export default {
  fetchAllBookings,
  fetchCapacityForSlot,
  createBookingInDb,
  cancelBookingInDb,
  deleteBookingFromDb,
  supabase,
};