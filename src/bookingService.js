// src/services/bookingService.js
import { supabase } from './supabase';

// 1. Supabase eken Bookings labaganima
export const fetchAllBookings = async () => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    return [];
  }
};

// 2. new Booking ekak Supabase ekata dameema (After Pay)
export const createBookingInDb = async (bookingData) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          tutor_name: 'Sarith Samarakoon',
          subject: 'Data Structures & Algorithms',
          year: bookingData.year || 2026,
          month: bookingData.month ?? 8,
          date: bookingData.date,
          slot: bookingData.slot,
          mode: bookingData.mode,
          group_size: bookingData.groupSize,
          total_fee: bookingData.totalFee || 750,
          status: 'Confirmed',
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating booking:', error.message);
    return { success: false, error };
  }
};

// 3. Booking ekak Cancel kirima
export const cancelBookingInDb = async (bookingId) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error.message);
    return { success: false, error };
  }
};