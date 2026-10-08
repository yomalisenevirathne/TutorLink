import { supabase } from './utils/supabase';

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

export { supabase };
export default { fetchAllBookings, fetchCapacityForSlot, createBookingInDb, cancelBookingInDb, completeBookingInDb, deleteBookingFromDb, supabase };
