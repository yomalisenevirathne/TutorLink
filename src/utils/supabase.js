// src/utils/supabase.js
// කිසිදු අමතර package එකක් අවශ්‍ය නොවන Standard Native Fetch ක්‍රමය

const SUPABASE_URL = 'https://zycqidwaepstggspofvc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// 1. Supabase එකෙන් Bookings ලබාගැනීම
export const fetchAllBookings = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );
    if (!res.ok) throw new Error('Failed to fetch bookings');
    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching bookings:', error?.message);
    return [];
  }
};

// 2. අලුත් Booking එකක් Supabase එකට Insert කිරීම
export const createBookingInDb = async (bookingData) => {
  try {
    const body = JSON.stringify({
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
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error creating booking:', error?.message);
    return { success: false, error };
  }
};

// 3. Booking එකක් Cancel කිරීම
export const cancelBookingInDb = async (bookingId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Cancelled' }),
      }
    );

    if (!res.ok) throw new Error('Failed to cancel');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error?.message);
    return { success: false, error };
  }
};